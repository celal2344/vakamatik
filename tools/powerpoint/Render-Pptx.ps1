[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string] $InputPptx,
    [Parameter(Mandatory = $true)] [string] $OutputDirectory,
    [string] $EvidencePath = "",
    [int] $Width = 1440,
    [int] $Height = 1080
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$semanticIds = @(
    "dental_frontal_comparison",
    "ceph_profile_overlay",
    "ceph_vertical",
    "problem_goal_plan"
)
$inputPath = (Resolve-Path -LiteralPath $InputPptx).Path
$outputPath = [System.IO.Path]::GetFullPath($OutputDirectory)
if ([string]::IsNullOrWhiteSpace($EvidencePath)) {
    $EvidencePath = Join-Path $outputPath "render-evidence.json"
}
$evidenceFullPath = [System.IO.Path]::GetFullPath($EvidencePath)
[System.IO.Directory]::CreateDirectory($outputPath) | Out-Null
Get-ChildItem -LiteralPath $outputPath -Filter "*.png" -File -ErrorAction SilentlyContinue | Remove-Item -Force

$originalHash = (Get-FileHash -LiteralPath $inputPath -Algorithm SHA256).Hash.ToLowerInvariant()
$powerPoint = $null
$presentation = $null
try {
    $powerPoint = New-Object -ComObject PowerPoint.Application
    $powerPoint.Visible = -1
    $version = $powerPoint.Version
    $presentation = $powerPoint.Presentations.Open($inputPath, $true, $false, $false)
    if ($presentation.Slides.Count -ne 4) {
        throw "Expected exactly four slides, found $($presentation.Slides.Count)."
    }
    $presentation.Export($outputPath, "PNG", $Width, $Height)
    $presentation.Close()
    $presentation = $null

    $rendered = @(Get-ChildItem -LiteralPath $outputPath -Filter "*.png" -File | Sort-Object {
        if ($_.BaseName -match '(\d+)$') { [int]$Matches[1] } else { [int]::MaxValue }
    })
    if ($rendered.Count -ne 4) {
        throw "PowerPoint exported $($rendered.Count) PNG files; expected four."
    }

    $slides = @()
    for ($index = 0; $index -lt 4; $index++) {
        $destination = Join-Path $outputPath ("{0:D2}-{1}.png" -f ($index + 1), $semanticIds[$index])
        Move-Item -LiteralPath $rendered[$index].FullName -Destination $destination -Force
        $bitmap = [System.Drawing.Bitmap]::FromFile($destination)
        try {
            if ($bitmap.Width -ne $Width -or $bitmap.Height -ne $Height) {
                throw "Unexpected render dimensions for slide $($index + 1): $($bitmap.Width)x$($bitmap.Height)."
            }
        }
        finally { $bitmap.Dispose() }
        $slides += [ordered]@{
            index = $index + 1
            semanticId = $semanticIds[$index]
            path = $destination
            sha256 = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant()
            width = $Width
            height = $Height
        }
    }

    $evidence = [ordered]@{
        schema = "gate-1-powerpoint-render-v1"
        generatedAtUtc = [DateTimeOffset]::UtcNow.ToString("O")
        platform = "Windows PowerPoint"
        powerPointVersion = $version
        sourcePath = $inputPath
        sourceSha256 = $originalHash
        sourceUnchanged = ((Get-FileHash -LiteralPath $inputPath -Algorithm SHA256).Hash.ToLowerInvariant() -eq $originalHash)
        renderSize = [ordered]@{ width = $Width; height = $Height }
        slides = $slides
    }
    [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($evidenceFullPath)) | Out-Null
    [System.IO.File]::WriteAllText($evidenceFullPath, ($evidence | ConvertTo-Json -Depth 8), [System.Text.UTF8Encoding]::new($false))
    $evidence | ConvertTo-Json -Depth 8
}
finally {
    if ($null -ne $presentation) { try { $presentation.Close() } catch {} }
    if ($null -ne $powerPoint) { try { $powerPoint.Quit() } catch {} }
    if ($null -ne $presentation) { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($presentation) }
    if ($null -ne $powerPoint) { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($powerPoint) }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
