[CmdletBinding()]
param(
    [string]$ApiBase = 'http://127.0.0.1:50021',
    [int]$Speaker = 3,
    [string]$ScriptPath,
    [string]$OutputDirectory,
    [switch]$SkipSynthesis
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$workspaceRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..\..'))

if ([string]::IsNullOrWhiteSpace($ScriptPath)) {
    $ScriptPath = Join-Path $workspaceRoot 'dr-yamaneko-baikin-design\docs\03_voicevox_script_v0.9.md'
}
if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $OutputDirectory = Join-Path $projectRoot 'assets\voice'
}

$ScriptPath = [System.IO.Path]::GetFullPath($ScriptPath)
$OutputDirectory = [System.IO.Path]::GetFullPath($OutputDirectory)

if (-not (Test-Path -LiteralPath $ScriptPath -PathType Leaf)) {
    throw "Voice script was not found: $ScriptPath"
}

$linePattern = '^\|\s*(?<id>(?:CMN|ST[1-5]|END)_\d{3})\s*\|\s*`(?<file>[^`]+\.wav)`\s*\|\s*(?<scene>[^|]*)\|\s*(?<emotion>[^|]*)\|\s*(?<text>[^|]+?)\s*\|\s*$'
$entries = @(
    Get-Content -LiteralPath $ScriptPath -Encoding UTF8 |
        ForEach-Object {
            if ($_ -match $linePattern) {
                [PSCustomObject]@{
                    Id       = $Matches.id.Trim()
                    FileName = $Matches.file.Trim()
                    Scene    = $Matches.scene.Trim()
                    Emotion  = $Matches.emotion.Trim()
                    Text     = $Matches.text.Trim()
                }
            }
        }
)

if ($entries.Count -ne 60) {
    throw "Expected 60 voice entries, but parsed $($entries.Count): $ScriptPath"
}

$duplicateIds = @($entries | Group-Object -Property Id | Where-Object { $_.Count -gt 1 })
if ($duplicateIds.Count -gt 0) {
    throw "Duplicate IDs found: $(($duplicateIds.Name -join ', '))"
}

$duplicateNames = @($entries | Group-Object -Property FileName | Where-Object { $_.Count -gt 1 })
if ($duplicateNames.Count -gt 0) {
    throw "Duplicate filenames found: $(($duplicateNames.Name -join ', '))"
}

foreach ($entry in $entries) {
    if ([System.IO.Path]::GetFileName($entry.FileName) -ne $entry.FileName) {
        throw "Output filename must not contain a directory: $($entry.FileName)"
    }
}

if (-not $SkipSynthesis) {
    $null = Invoke-RestMethod -Uri "$ApiBase/version" -Method Get -TimeoutSec 10
    $speakers = @(Invoke-RestMethod -Uri "$ApiBase/speakers" -Method Get -TimeoutSec 10)
    $speakerExists = @(
        $speakers |
            ForEach-Object { $_.styles } |
            Where-Object { $_.id -eq $Speaker }
    ).Count -gt 0

    if (-not $speakerExists) {
        throw "VOICEVOX speaker/style ID $Speaker was not found."
    }
}

$null = New-Item -ItemType Directory -Path $OutputDirectory -Force
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

$generated = New-Object System.Collections.Generic.List[object]
$index = 0

foreach ($entry in $entries) {
    $index++
    $outputPath = Join-Path $OutputDirectory $entry.FileName

    if (-not $SkipSynthesis) {
        $escapedText = [System.Uri]::EscapeDataString($entry.Text)
        $audioQueryUri = "$ApiBase/audio_query?text=$escapedText&speaker=$Speaker"
        $query = Invoke-RestMethod -Uri $audioQueryUri -Method Post -TimeoutSec 30

        $query.speedScale = 0.94
        $query.pitchScale = -0.02
        $query.intonationScale = 0.98
        $query.prePhonemeLength = 0.12
        $query.postPhonemeLength = 0.20
        $query.outputSamplingRate = 48000
        $query.outputStereo = $false

        $json = $query | ConvertTo-Json -Depth 100 -Compress
        $jsonBytes = $utf8NoBom.GetBytes($json)
        $synthesisUri = "$ApiBase/synthesis?speaker=$Speaker"

        Write-Progress `
            -Activity 'Generating VOICEVOX audio' `
            -Status "$index / $($entries.Count): $($entry.Id)" `
            -PercentComplete (($index / $entries.Count) * 100)

        Invoke-WebRequest `
            -Uri $synthesisUri `
            -Method Post `
            -ContentType 'application/json; charset=utf-8' `
            -Body $jsonBytes `
            -OutFile $outputPath `
            -UseBasicParsing `
            -TimeoutSec 60
    }

    $generated.Add([PSCustomObject]@{
        Id   = $entry.Id
        File = $outputPath
        Text = $entry.Text
    })
}

if (-not $SkipSynthesis) {
    Write-Progress -Activity 'Generating VOICEVOX audio' -Completed
}

$validationErrors = New-Object System.Collections.Generic.List[string]
foreach ($item in $generated) {
    if (-not (Test-Path -LiteralPath $item.File -PathType Leaf)) {
        $validationErrors.Add("Missing file: $($item.File)")
        continue
    }

    $fileInfo = Get-Item -LiteralPath $item.File
    if ($fileInfo.Length -eq 0) {
        $validationErrors.Add("Zero-byte file: $($item.File)")
        continue
    }

    $bytes = [System.IO.File]::ReadAllBytes($item.File)
    if ($bytes.Length -lt 12) {
        $validationErrors.Add("File is too short to be WAV: $($item.File)")
        continue
    }

    $riff = [System.Text.Encoding]::ASCII.GetString($bytes, 0, 4)
    $wave = [System.Text.Encoding]::ASCII.GetString($bytes, 8, 4)
    if ($riff -ne 'RIFF' -or $wave -ne 'WAVE') {
        $validationErrors.Add("Invalid RIFF/WAVE header: $($item.File)")
    }
}

$hashes = @(
    $generated |
        ForEach-Object {
            $hash = (Get-FileHash -LiteralPath $_.File -Algorithm SHA256).Hash
            [PSCustomObject]@{
                File = $_.File
                Hash = $hash
            }
        }
)
$duplicateHashes = @($hashes | Group-Object -Property Hash | Where-Object { $_.Count -gt 1 })
foreach ($group in $duplicateHashes) {
    $duplicateFiles = @($group.Group | ForEach-Object { [System.IO.Path]::GetFileName($_.File) })
    $validationErrors.Add("Duplicate WAV content: $($duplicateFiles -join ', ')")
}

if ($validationErrors.Count -gt 0) {
    throw "VOICEVOX validation failed:`n$($validationErrors -join "`n")"
}

$manifest = @(
    $entries |
        ForEach-Object {
            [ordered]@{
                id   = $_.Id
                file = "res://assets/voice/$($_.FileName)"
                text = $_.Text
            }
        }
)
$manifestPath = Join-Path $OutputDirectory 'voice_manifest.json'
$manifestJson = $manifest | ConvertTo-Json -Depth 4
[System.IO.File]::WriteAllText($manifestPath, "$manifestJson`n", $utf8NoBom)

$totalBytes = ($generated | ForEach-Object { (Get-Item -LiteralPath $_.File).Length } | Measure-Object -Sum).Sum
if (-not $SkipSynthesis) {
    Write-Output "Generated=$($generated.Count)"
} else {
    Write-Output 'SynthesisSkipped=True'
}
Write-Output "Validated=$($generated.Count)"
Write-Output "OutputDirectory=$OutputDirectory"
Write-Output "Manifest=$manifestPath"
Write-Output "ManifestEntries=$($manifest.Count)"
Write-Output "TotalBytes=$totalBytes"
Write-Output 'DuplicateIds=0'
Write-Output 'DuplicateFileNames=0'
Write-Output 'DuplicateAudioHashes=0'
Write-Output 'ZeroByteFiles=0'
Write-Output 'InvalidRiffHeaders=0'
