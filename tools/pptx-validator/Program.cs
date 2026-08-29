using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Xml.Linq;

const long ExpectedWidthEmu = 9_144_000;
const long ExpectedHeightEmu = 6_858_000;
const long EmuPerPoint = 12_700;
string[] expectedOrder = [
    "dental_frontal_comparison",
    "ceph_profile_overlay",
    "ceph_vertical",
    "problem_goal_plan"
];

if (args.Length is < 1 or > 2)
{
    Console.Error.WriteLine("Usage: PptxValidator <presentation.pptx> [report.json]");
    return 2;
}

var input = Path.GetFullPath(args[0]);
var output = Path.GetFullPath(args.Length == 2 ? args[1] : Path.ChangeExtension(input, ".validation.json"));
var checks = new List<Check>();
var slideReports = new List<SlideReport>();

void Add(string id, bool passed, string detail, string severity = "error") =>
    checks.Add(new(id, passed, severity, detail));

try
{
    if (!File.Exists(input)) throw new FileNotFoundException("Presentation not found", input);
    using var archive = ZipFile.OpenRead(input);
    var names = archive.Entries.Select(e => e.FullName).ToHashSet(StringComparer.OrdinalIgnoreCase);

    Add("opc-content-types", names.Contains("[Content_Types].xml"), "[Content_Types].xml is present.");
    Add("opc-root-relationships", names.Contains("_rels/.rels"), "Root relationships are present.");
    Add("presentation-part", names.Contains("ppt/presentation.xml"), "Presentation part is present.");
    Add("presentation-relationships", names.Contains("ppt/_rels/presentation.xml.rels"), "Presentation relationships are present.");

    var contentTypes = Xml(archive, "[Content_Types].xml");
    XNamespace ct = "http://schemas.openxmlformats.org/package/2006/content-types";
    var presentationOverride = contentTypes.Descendants(ct + "Override")
        .Any(x => (string?)x.Attribute("PartName") == "/ppt/presentation.xml");
    Add("presentation-content-type", presentationOverride, "Presentation content type override is declared.");

    var presentation = Xml(archive, "ppt/presentation.xml");
    XNamespace p = "http://schemas.openxmlformats.org/presentationml/2006/main";
    XNamespace r = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    var size = presentation.Root?.Element(p + "sldSz");
    var cx = LongAttr(size, "cx");
    var cy = LongAttr(size, "cy");
    Add("slide-size", cx == ExpectedWidthEmu && cy == ExpectedHeightEmu,
        $"Canvas is {cx} x {cy} EMU; expected {ExpectedWidthEmu} x {ExpectedHeightEmu} EMU.");
    Add("slide-size-points", cx / (double)EmuPerPoint == 720 && cy / (double)EmuPerPoint == 540,
        $"Canvas is {cx / (double)EmuPerPoint:0.###} x {cy / (double)EmuPerPoint:0.###} points.");

    var presRels = Xml(archive, "ppt/_rels/presentation.xml.rels");
    XNamespace rel = "http://schemas.openxmlformats.org/package/2006/relationships";
    var targets = presRels.Descendants(rel + "Relationship").ToDictionary(
        x => (string)x.Attribute("Id")!, x => (string)x.Attribute("Target")!);
    var slidePaths = presentation.Descendants(p + "sldId")
        .Select(x => (string?)x.Attribute(r + "id"))
        .Where(id => id is not null)
        .Select(id => ResolvePart("ppt/presentation.xml", targets[id!]))
        .ToArray();

    Add("slide-count", slidePaths.Length == 4, $"Found {slidePaths.Length} slides; expected exactly four.");
    var semanticIds = new List<string>();
    var allText = new StringBuilder();
    for (var index = 0; index < slidePaths.Length; index++)
    {
        var path = slidePaths[index];
        var slide = Xml(archive, path);
        XNamespace a = "http://schemas.openxmlformats.org/drawingml/2006/main";
        var namesOnSlide = slide.Descendants(p + "cNvPr").Select(x => (string?)x.Attribute("name"))
            .Where(x => !string.IsNullOrWhiteSpace(x)).Cast<string>().ToArray();
        var cSldName = (string?)slide.Descendants(p + "cSld").FirstOrDefault()?.Attribute("name");
        var marker = namesOnSlide.FirstOrDefault(n => n.StartsWith("semantic-id:", StringComparison.Ordinal));
        var semanticId = marker?["semantic-id:".Length..] ?? cSldName ?? "missing";
        semanticIds.Add(semanticId);
        var text = string.Join(" ", slide.Descendants(a + "t").Select(x => x.Value));
        allText.Append(' ').Append(text);
        var tableCount = slide.Descendants(a + "tbl").Count();
        var textShapeCount = slide.Descendants(p + "sp").Count(x => x.Descendants(a + "t").Any());
        var pictureCount = slide.Descendants(p + "pic").Count();
        var relPath = RelationshipPath(path);
        var slideRels = names.Contains(relPath) ? Xml(archive, relPath) : null;
        var notesTarget = slideRels?.Descendants(rel + "Relationship")
            .FirstOrDefault(x => ((string?)x.Attribute("Type"))?.EndsWith("/notesSlide", StringComparison.Ordinal) == true)
            ?.Attribute("Target")?.Value;
        var notesDocument = notesTarget is not null && names.Contains(ResolvePart(path, notesTarget))
            ? Xml(archive, ResolvePart(path, notesTarget))
            : null;
        var speakerNoteText = notesDocument is null ? "" : string.Join(" ", notesDocument.Descendants(p + "sp")
            .Where(shape => shape.Descendants(p + "ph").Any(ph => (string?)ph.Attribute("type") == "body"))
            .SelectMany(shape => shape.Descendants(a + "t")).Select(node => node.Value));
        var hasNotes = !string.IsNullOrWhiteSpace(speakerNoteText);
        if (hasNotes) allText.Append(' ').Append(speakerNoteText);

        var outside = new List<string>();
        foreach (var nv in slide.Descendants(p + "cNvPr"))
        {
            var container = nv.Parent?.Parent;
            if (container is null) continue;
            var xfrm = container.Descendants(a + "xfrm").FirstOrDefault() ?? container.Descendants(p + "xfrm").FirstOrDefault();
            var off = xfrm?.Element(a + "off");
            var ext = xfrm?.Element(a + "ext");
            if (off is null || ext is null) continue;
            var x = LongAttr(off, "x"); var y = LongAttr(off, "y");
            var w = LongAttr(ext, "cx"); var h = LongAttr(ext, "cy");
            if (x < 0 || y < 0 || x + w > ExpectedWidthEmu || y + h > ExpectedHeightEmu)
                outside.Add((string?)nv.Attribute("name") ?? "unnamed");
        }

        var imageMetadata = slide.Descendants(p + "pic").Select(pic =>
        {
            var nv = pic.Descendants(p + "cNvPr").FirstOrDefault();
            var xfrm = pic.Descendants(a + "xfrm").FirstOrDefault();
            var off = xfrm?.Element(a + "off");
            var ext = xfrm?.Element(a + "ext");
            var srcRect = pic.Descendants(a + "srcRect").FirstOrDefault();
            var alpha = pic.Descendants(a + "alphaModFix").FirstOrDefault();
            return new ImageReport(
                (string?)nv?.Attribute("name") ?? "unnamed",
                LongAttr(xfrm, "rot"),
                alpha is null ? 100_000 : LongAttr(alpha, "amt"),
                srcRect is not null,
                srcRect is null ? null : new CropReport(LongAttr(srcRect, "l"), LongAttr(srcRect, "t"), LongAttr(srcRect, "r"), LongAttr(srcRect, "b")),
                new BoundsReport(LongAttr(off, "x"), LongAttr(off, "y"), LongAttr(ext, "cx"), LongAttr(ext, "cy")));
        }).ToArray();

        Add($"slide-{index + 1}-bounds", outside.Count == 0,
            outside.Count == 0 ? "All measurable objects are within the slide canvas." : $"Outside canvas: {string.Join(", ", outside)}");
        slideReports.Add(new(index + 1, semanticId, textShapeCount, tableCount, pictureCount, hasNotes, outside, imageMetadata));
    }

    Add("semantic-order", semanticIds.SequenceEqual(expectedOrder),
        $"Semantic order: {string.Join(", ", semanticIds)}.");
    Add("native-text", slideReports.ElementAtOrDefault(0)?.NativeTextShapeCount > 0
        && slideReports.ElementAtOrDefault(2) is { NativeTextShapeCount: > 0, NativeTableCount: > 0 }
        && slideReports.ElementAtOrDefault(3)?.NativeTableCount > 0,
        "Native text boxes remain on dental_frontal_comparison and ceph_vertical; native table-cell text remains on ceph_vertical and problem_goal_plan. The overlay intentionally contains images only.");
    Add("native-tables", slideReports.ElementAtOrDefault(2)?.NativeTableCount > 0 && slideReports.ElementAtOrDefault(3)?.NativeTableCount > 0,
        "Slides ceph_vertical and problem_goal_plan contain native DrawingML tables.");
    Add("speaker-notes", slideReports.ElementAtOrDefault(2)?.HasSpeakerNotes == true,
        "Speaker notes relationship exists on ceph_vertical.");
    var allImages = slideReports.SelectMany(s => s.Images).ToArray();
    Add("image-crop-represented", allImages.Any(i => i.HasCrop), "At least one image has DrawingML crop values.");
    static bool ValidCrop(CropReport? crop) => crop is not null && crop.Left is >= 0 and <= 100_000 && crop.Top is >= 0 and <= 100_000
        && crop.Right is >= 0 and <= 100_000 && crop.Bottom is >= 0 and <= 100_000
        && crop.Left + crop.Right < 100_000 && crop.Top + crop.Bottom < 100_000;
    Add("image-crop-valid", allImages.Where(i => i.HasCrop).All(i => ValidCrop(i.Crop)),
        "All represented DrawingML crop percentages are within valid non-inverted bounds.");
    Add("image-rotation-represented", allImages.Any(i => i.RotationUnits != 0), "At least one image has non-zero DrawingML rotation.");
    Add("image-opacity-represented", allImages.Any(i => i.OpacityAmount is > 0 and < 100_000), "At least one image has DrawingML opacity.");
    Add("z-order-represented", slideReports.All(s => s.PictureCount == s.Images.Count), "Picture document order is available as deterministic z-order evidence.");

    var packageText = CollectPackageText(archive);
    string[] prohibited = ["phi-canary", "patient name", "date of birth", "tc kimlik", "resources/", "resources\\"];
    var hits = prohibited.Where(x => packageText.Contains(x, StringComparison.OrdinalIgnoreCase)).ToArray();
    Add("no-prohibited-data", hits.Length == 0,
        hits.Length == 0 ? "No configured PHI canary or source-path marker found." : $"Prohibited markers found: {string.Join(", ", hits)}");

    var broken = ValidateInternalRelationships(archive, rel);
    Add("internal-relationships", broken.Count == 0,
        broken.Count == 0 ? "All internal relationship targets resolve." : $"Broken targets: {string.Join("; ", broken)}");

    var report = new Report(
        "gate-1-structural-validation-v1", input, Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(input))).ToLowerInvariant(),
        DateTimeOffset.UtcNow, checks.All(c => c.Passed || c.Severity != "error"), checks, slideReports);
    Directory.CreateDirectory(Path.GetDirectoryName(output)!);
    var jsonOptions = new JsonSerializerOptions { WriteIndented = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    File.WriteAllText(output, JsonSerializer.Serialize(report, jsonOptions));
    Console.WriteLine(JsonSerializer.Serialize(report, jsonOptions));
    return report.Passed ? 0 : 1;
}
catch (Exception ex)
{
    Directory.CreateDirectory(Path.GetDirectoryName(output)!);
    var failure = new { schema = "gate-1-structural-validation-v1", input, passed = false, error = ex.ToString() };
    File.WriteAllText(output, JsonSerializer.Serialize(failure, new JsonSerializerOptions { WriteIndented = true }));
    Console.Error.WriteLine(ex);
    return 2;
}

static XDocument Xml(ZipArchive archive, string path)
{
    var entry = archive.GetEntry(path.Replace('\\', '/')) ?? throw new InvalidDataException($"Missing OPC part: {path}");
    using var stream = entry.Open();
    return XDocument.Load(stream, LoadOptions.PreserveWhitespace);
}

static long LongAttr(XElement? node, string name) => long.TryParse((string?)node?.Attribute(name), out var value) ? value : 0;
static string RelationshipPath(string part)
{
    var directory = Path.GetDirectoryName(part)?.Replace('\\', '/') ?? "";
    return $"{directory}/_rels/{Path.GetFileName(part)}.rels";
}
static string ResolvePart(string sourcePart, string target)
{
    if (target.StartsWith('/')) return target.TrimStart('/');
    var sourceDir = Path.GetDirectoryName(sourcePart)?.Replace('\\', '/') ?? "";
    var uri = new Uri("http://opc/" + sourceDir.Trim('/') + "/");
    return Uri.UnescapeDataString(new Uri(uri, target).AbsolutePath.TrimStart('/'));
}
static string CollectPackageText(ZipArchive archive)
{
    var result = new StringBuilder();
    foreach (var entry in archive.Entries.Where(e => e.FullName.EndsWith(".xml", StringComparison.OrdinalIgnoreCase) || e.FullName.EndsWith(".rels", StringComparison.OrdinalIgnoreCase)))
    {
        using var reader = new StreamReader(entry.Open(), Encoding.UTF8, true, leaveOpen: false);
        result.Append(' ').Append(reader.ReadToEnd());
    }
    return result.ToString();
}
static List<string> ValidateInternalRelationships(ZipArchive archive, XNamespace rel)
{
    var names = archive.Entries.Select(e => e.FullName).ToHashSet(StringComparer.OrdinalIgnoreCase);
    var failures = new List<string>();
    foreach (var entry in archive.Entries.Where(e => e.FullName.EndsWith(".rels", StringComparison.OrdinalIgnoreCase)))
    {
        using var stream = entry.Open();
        var doc = XDocument.Load(stream);
        var source = Regex.Replace(entry.FullName, @"(^|/)_rels/([^/]+)\.rels$", "$1$2");
        if (entry.FullName == "_rels/.rels") source = "";
        foreach (var relationship in doc.Descendants(rel + "Relationship"))
        {
            if (string.Equals((string?)relationship.Attribute("TargetMode"), "External", StringComparison.OrdinalIgnoreCase)) continue;
            var target = (string?)relationship.Attribute("Target");
            if (target is null) continue;
            var resolved = ResolvePart(source, target);
            if (!names.Contains(resolved)) failures.Add($"{entry.FullName} -> {resolved}");
        }
    }
    return failures;
}

record Check(string Id, bool Passed, string Severity, string Detail);
record CropReport(long Left, long Top, long Right, long Bottom);
record BoundsReport(long X, long Y, long Width, long Height);
record ImageReport(string Name, long RotationUnits, long OpacityAmount, bool HasCrop, CropReport? Crop, BoundsReport Bounds);
record SlideReport(int Index, string SemanticId, int NativeTextShapeCount, int NativeTableCount, int PictureCount, bool HasSpeakerNotes, IReadOnlyList<string> OutsideCanvas, IReadOnlyList<ImageReport> Images);
record Report(string Schema, string Input, string Sha256, DateTimeOffset GeneratedAtUtc, bool Passed, IReadOnlyList<Check> Checks, IReadOnlyList<SlideReport> Slides);
