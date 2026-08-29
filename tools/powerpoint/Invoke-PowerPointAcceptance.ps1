[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string] $InputPptx,
    [Parameter(Mandatory = $true)] [string] $WorkingDirectory,
    [string] $EvidencePath = ""
)

$ErrorActionPreference = "Stop"
$source = (Resolve-Path -LiteralPath $InputPptx).Path
$work = [System.IO.Path]::GetFullPath($WorkingDirectory)
[System.IO.Directory]::CreateDirectory($work) | Out-Null
$copy = Join-Path $work "gate-1-powerpoint-acceptance-copy.pptx"
Copy-Item -LiteralPath $source -Destination $copy -Force
if ([string]::IsNullOrWhiteSpace($EvidencePath)) { $EvidencePath = Join-Path $work "windows-powerpoint-acceptance.json" }
$sourceHashBefore = (Get-FileHash $source -Algorithm SHA256).Hash.ToLowerInvariant()
$powerPoint = $null
$presentation = $null
$checks = @()
try {
    $powerPoint = New-Object -ComObject PowerPoint.Application
    $powerPoint.Visible = -1
    $version = $powerPoint.Version
    $presentation = $powerPoint.Presentations.Open($copy, $false, $false, $false)
    $checks += [ordered]@{ id = "open"; passed = ($presentation.Slides.Count -eq 4); detail = "Opened with $($presentation.Slides.Count) slides." }

    $textShape = @($presentation.Slides.Item(1).Shapes | Where-Object { $_.HasTextFrame -eq -1 -and $_.TextFrame.HasText -eq -1 })[0]
    $textShape.TextFrame.TextRange.Text = $textShape.TextFrame.TextRange.Text + " [acceptance-edit]"
    $expectedText = $textShape.TextFrame.TextRange.Text

    $tableShape = @($presentation.Slides.Item(3).Shapes | Where-Object { $_.HasTable -eq -1 })[0]
    $tableCell = $tableShape.Table.Cell(2, 3).Shape.TextFrame.TextRange
    $tableCell.Text = $tableCell.Text + "*"
    $expectedCell = $tableCell.Text

    $picture = @($presentation.Slides.Item(2).Shapes | Where-Object { $_.Type -eq 13 })[0]
    $picture.Left = $picture.Left + 0.5
    $expectedLeft = [double]$picture.Left
    $expectedRotation = [double]$picture.Rotation
    $expectedTransparency = [double]$picture.Fill.Transparency
    $notesBefore = $presentation.Slides.Item(3).NotesPage.Shapes.Placeholders.Item(2).TextFrame.TextRange.Text
    $presentation.Save()
    $presentation.Close(); $presentation = $null

    $presentation = $powerPoint.Presentations.Open($copy, $true, $false, $false)
    $textAfter = @($presentation.Slides.Item(1).Shapes | Where-Object { $_.HasTextFrame -eq -1 -and $_.TextFrame.HasText -eq -1 })[0].TextFrame.TextRange.Text
    $tableAfter = @($presentation.Slides.Item(3).Shapes | Where-Object { $_.HasTable -eq -1 })[0].Table.Cell(2, 3).Shape.TextFrame.TextRange.Text
    $pictureAfter = @($presentation.Slides.Item(2).Shapes | Where-Object { $_.Type -eq 13 })[0]
    $notesAfter = $presentation.Slides.Item(3).NotesPage.Shapes.Placeholders.Item(2).TextFrame.TextRange.Text
    $checks += [ordered]@{ id = "text-edit-persists"; passed = ($textAfter -eq $expectedText); detail = "Native text edit persisted after reopen." }
    $checks += [ordered]@{ id = "table-edit-persists"; passed = ($tableAfter -eq $expectedCell); detail = "Native table-cell edit persisted after reopen." }
    $checks += [ordered]@{ id = "image-move-persists"; passed = ([Math]::Abs([double]$pictureAfter.Left - $expectedLeft) -lt 0.01); detail = "0.5-point image move persisted." }
    $checks += [ordered]@{ id = "rotation-persists"; passed = ([Math]::Abs([double]$pictureAfter.Rotation - $expectedRotation) -lt 0.01); detail = "Image rotation persisted." }
    $checks += [ordered]@{ id = "opacity-persists"; passed = ([Math]::Abs([double]$pictureAfter.Fill.Transparency - $expectedTransparency) -lt 0.01); detail = "Image opacity persisted." }
    $checks += [ordered]@{ id = "notes-persist"; passed = ($notesBefore -eq $notesAfter -and -not [string]::IsNullOrWhiteSpace($notesAfter)); detail = "Speaker notes persisted." }
    $presentation.Close(); $presentation = $null
    $checks += [ordered]@{ id = "source-unchanged"; passed = ((Get-FileHash $source -Algorithm SHA256).Hash.ToLowerInvariant() -eq $sourceHashBefore); detail = "Generated original was not modified." }
    $evidence = [ordered]@{
        schema = "gate-1-windows-powerpoint-automated-acceptance-v1"
        generatedAtUtc = [DateTimeOffset]::UtcNow.ToString("O")
        powerPointVersion = $version
        acceptanceCopy = $copy
        passed = @($checks | Where-Object { -not $_.passed }).Count -eq 0
        checks = $checks
        limitation = "Automation proves persistence and package behavior on this Windows installation; it does not replace visual human inspection or macOS PowerPoint acceptance."
    }
    [System.IO.File]::WriteAllText(([System.IO.Path]::GetFullPath($EvidencePath)), ($evidence | ConvertTo-Json -Depth 8), [System.Text.UTF8Encoding]::new($false))
    $evidence | ConvertTo-Json -Depth 8
    if (-not $evidence.passed) { exit 1 }
}
finally {
    if ($null -ne $presentation) { try { $presentation.Close() } catch {} }
    if ($null -ne $powerPoint) { try { $powerPoint.Quit() } catch {} }
    if ($null -ne $presentation) { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($presentation) }
    if ($null -ne $powerPoint) { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($powerPoint) }
    [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
