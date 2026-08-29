[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string] $CurrentDirectory,
    [Parameter(Mandatory = $true)] [string] $GoldenDirectory,
    [string] $EvidencePath = "",
    [double] $MaxChangedPixelRatio = 0.001,
    [double] $MaxMeanChannelDifference = 0.15,
    [switch] $UpdateGoldens
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$current = [System.IO.Path]::GetFullPath($CurrentDirectory)
$golden = [System.IO.Path]::GetFullPath($GoldenDirectory)
if ([string]::IsNullOrWhiteSpace($EvidencePath)) {
    $EvidencePath = Join-Path $current "visual-regression-evidence.json"
}
[System.IO.Directory]::CreateDirectory($golden) | Out-Null
$files = @(Get-ChildItem -LiteralPath $current -Filter "*.png" -File | Sort-Object Name)
if ($files.Count -ne 4) { throw "Expected four current render files, found $($files.Count)." }
if ($UpdateGoldens) {
    foreach ($file in $files) { Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $golden $file.Name) -Force }
}

$results = @()
foreach ($file in $files) {
    $goldenFile = Join-Path $golden $file.Name
    if (-not (Test-Path -LiteralPath $goldenFile)) { throw "Missing golden: $goldenFile. Run with -UpdateGoldens after inspecting the current renders." }
    $currentHash = (Get-FileHash $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    $goldenHash = (Get-FileHash $goldenFile -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($currentHash -eq $goldenHash) {
        $results += [ordered]@{
            file = $file.Name
            passed = $true
            changedPixels = 0
            changedPixelRatio = 0
            meanChannelDifference = 0
            currentSha256 = $currentHash
            goldenSha256 = $goldenHash
        }
        continue
    }
    $actualBitmap = [System.Drawing.Bitmap]::FromFile($file.FullName)
    $goldenBitmap = [System.Drawing.Bitmap]::FromFile($goldenFile)
    try {
        if ($actualBitmap.Width -ne $goldenBitmap.Width -or $actualBitmap.Height -ne $goldenBitmap.Height) {
            throw "Dimensions differ for $($file.Name)."
        }
        [long]$changed = 0
        [double]$sumDifference = 0
        [long]$channelCount = [long]$actualBitmap.Width * $actualBitmap.Height * 3
        for ($y = 0; $y -lt $actualBitmap.Height; $y++) {
            for ($x = 0; $x -lt $actualBitmap.Width; $x++) {
                $a = $actualBitmap.GetPixel($x, $y)
                $g = $goldenBitmap.GetPixel($x, $y)
                $difference = [Math]::Abs([int]$a.R - [int]$g.R) + [Math]::Abs([int]$a.G - [int]$g.G) + [Math]::Abs([int]$a.B - [int]$g.B)
                if ($difference -gt 0) { $changed++ }
                $sumDifference += $difference
            }
        }
        $total = [long]$actualBitmap.Width * $actualBitmap.Height
        $changedRatio = $changed / [double]$total
        $meanDifference = $sumDifference / [double]$channelCount
        $passed = $changedRatio -le $MaxChangedPixelRatio -and $meanDifference -le $MaxMeanChannelDifference
        $results += [ordered]@{
            file = $file.Name
            passed = $passed
            changedPixels = $changed
            changedPixelRatio = $changedRatio
            meanChannelDifference = $meanDifference
            currentSha256 = $currentHash
            goldenSha256 = $goldenHash
        }
    }
    finally { $actualBitmap.Dispose(); $goldenBitmap.Dispose() }
}
$evidence = [ordered]@{
    schema = "gate-1-same-environment-visual-regression-v1"
    generatedAtUtc = [DateTimeOffset]::UtcNow.ToString("O")
    scope = "same Windows PowerPoint version, fonts, OS, and render size only"
    thresholds = [ordered]@{ maxChangedPixelRatio = $MaxChangedPixelRatio; maxMeanChannelDifference = $MaxMeanChannelDifference }
    passed = @($results | Where-Object { -not $_.passed }).Count -eq 0
    results = $results
}
[System.IO.File]::WriteAllText(([System.IO.Path]::GetFullPath($EvidencePath)), ($evidence | ConvertTo-Json -Depth 8), [System.Text.UTF8Encoding]::new($false))
$evidence | ConvertTo-Json -Depth 8
if (-not $evidence.passed) { exit 1 }
