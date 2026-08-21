[CmdletBinding()]
param(
    [string]$ApiBase = 'http://127.0.0.1:50021'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$scriptPath = Join-Path $projectRoot 'voice-lines.json'
$outputDirectory = Join-Path $projectRoot 'voice'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

if (-not (Test-Path -LiteralPath $scriptPath -PathType Leaf)) {
    throw "Voice script was not found: $scriptPath"
}

$null = Invoke-RestMethod -Uri "$ApiBase/version" -Method Get -TimeoutSec 10
$speakers = @(Invoke-RestMethod -Uri "$ApiBase/speakers" -Method Get -TimeoutSec 10)
$availableIds = @($speakers | ForEach-Object { $_.styles } | ForEach-Object { [int]$_.id })
$parsedEntries = Get-Content -Raw -Encoding UTF8 -LiteralPath $scriptPath | ConvertFrom-Json
$entries = @()
foreach ($parsedEntry in $parsedEntries) { $entries += $parsedEntry }

if ($entries.Count -lt 1) { throw 'At least one voice entry is required.' }
if (@($entries | Group-Object id | Where-Object Count -gt 1).Count) { throw 'Voice ids must be unique.' }
if (@($entries | Group-Object file | Where-Object Count -gt 1).Count) { throw 'Voice filenames must be unique.' }

$null = New-Item -ItemType Directory -Path $outputDirectory -Force
$manifest = New-Object System.Collections.Generic.List[object]
$hashes = @{}

foreach ($entry in $entries) {
    $speaker = [int]$entry.speaker
    if ($availableIds -notcontains $speaker) { throw "VOICEVOX speaker/style ID $speaker was not found." }
    if ([string]::IsNullOrWhiteSpace([string]$entry.id) -or [string]::IsNullOrWhiteSpace([string]$entry.file) -or [string]::IsNullOrWhiteSpace([string]$entry.text)) {
        throw 'Voice id, filename, and text must not be empty.'
    }

    $escapedText = [System.Uri]::EscapeDataString([string]$entry.text)
    $query = Invoke-RestMethod -Uri "$ApiBase/audio_query?text=$escapedText&speaker=$speaker" -Method Post -TimeoutSec 30
    $query.speedScale = 0.94
    $query.pitchScale = -0.02
    $query.intonationScale = 0.98
    $query.volumeScale = 1.0
    $query.prePhonemeLength = 0.12
    $query.postPhonemeLength = 0.20
    $query.outputSamplingRate = 48000
    $query.outputStereo = $false

    $json = $query | ConvertTo-Json -Depth 100 -Compress
    $jsonBytes = $utf8NoBom.GetBytes($json)
    $outputPath = Join-Path $outputDirectory ([string]$entry.file)

    Invoke-WebRequest `
        -Uri "$ApiBase/synthesis?speaker=$speaker" `
        -Method Post `
        -ContentType 'application/json; charset=utf-8' `
        -Body $jsonBytes `
        -OutFile $outputPath `
        -UseBasicParsing `
        -TimeoutSec 60

    $bytes = [System.IO.File]::ReadAllBytes($outputPath)
    if ($bytes.Length -lt 44) { throw "Generated WAV is too small: $outputPath" }
    if ([System.Text.Encoding]::ASCII.GetString($bytes, 0, 4) -ne 'RIFF' -or [System.Text.Encoding]::ASCII.GetString($bytes, 8, 4) -ne 'WAVE') {
        throw "Invalid RIFF/WAVE generated: $outputPath"
    }
    $hash = (Get-FileHash -LiteralPath $outputPath -Algorithm SHA256).Hash
    if ($hashes.ContainsKey($hash)) { throw "Duplicate synthesized audio: $($entry.file) and $($hashes[$hash])" }
    $hashes[$hash] = [string]$entry.file

    $manifest.Add([ordered]@{
        id        = [string]$entry.id
        file      = "voice/$($entry.file)"
        speaker   = $speaker
        character = [string]$entry.character
        credit    = [string]$entry.credit
        text      = [string]$entry.text
        bytes     = $bytes.Length
        sha256    = $hash.ToLowerInvariant()
    })
}

$manifestPath = Join-Path $outputDirectory 'voice_manifest.json'
$manifestJson = $manifest | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText($manifestPath, "$manifestJson`n", $utf8NoBom)

$totalBytes = ($manifest | ForEach-Object { [int64]$_.bytes } | Measure-Object -Sum).Sum
Write-Output "Generated=$($manifest.Count)"
Write-Output "Manifest=$manifestPath"
Write-Output "TotalBytes=$totalBytes"
