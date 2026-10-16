$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
$sp06Html = Get-Content -LiteralPath 'playwright-report/index.html' -Raw
$sp06Match = [regex]::Match($sp06Html, 'data:application/zip;base64,([A-Za-z0-9+/=]+)')
if (-not $sp06Match.Success) { throw 'REPORT_ARCHIVE_NOT_FOUND' }
$sp06Memory = [System.IO.MemoryStream]::new([Convert]::FromBase64String($sp06Match.Groups[1].Value))
$sp06Zip = [System.IO.Compression.ZipArchive]::new($sp06Memory, [System.IO.Compression.ZipArchiveMode]::Read)
$script:sp06Stats = @{ json_entries=0; step_arrays=0; detailed_step_arrays=0 }

function Measure-Sp06Steps($sp06Node) {
  if ($null -eq $sp06Node) { return }
  if ($sp06Node -is [System.Management.Automation.PSCustomObject]) {
    foreach ($sp06Property in $sp06Node.PSObject.Properties) {
      if ($sp06Property.Name -eq 'steps' -and $sp06Property.Value -is [Array]) {
        $script:sp06Stats.step_arrays++
        if ($sp06Property.Value.Count -gt 0) { $script:sp06Stats.detailed_step_arrays++ }
      }
      Measure-Sp06Steps $sp06Property.Value
    }
  } elseif ($sp06Node -is [Array]) {
    foreach ($sp06Child in $sp06Node) { Measure-Sp06Steps $sp06Child }
  }
}

try {
  foreach ($sp06Entry in $sp06Zip.Entries) {
    if (-not $sp06Entry.FullName.EndsWith('.json')) { continue }
    if ($sp06Entry.Length -gt 16777216) { throw 'REPORT_ENTRY_TOO_LARGE' }
    $sp06Reader = [System.IO.StreamReader]::new($sp06Entry.Open())
    try { $sp06Json = $sp06Reader.ReadToEnd() } finally { $sp06Reader.Dispose() }
    try { $sp06Object = $sp06Json | ConvertFrom-Json -ErrorAction Stop } catch { throw 'REPORT_JSON_INVALID' }
    $script:sp06Stats.json_entries++
    Measure-Sp06Steps $sp06Object
  }
  $script:sp06Stats | ConvertTo-Json -Compress
  if ($script:sp06Stats.step_arrays -eq 0) { throw 'REPORT_RESULT_STEPS_NOT_FOUND' }
  if ($script:sp06Stats.detailed_step_arrays -ne 0) { throw 'INPUT_BEARING_REPORT_STEPS_REFUSED' }
} finally { $sp06Zip.Dispose(); $sp06Memory.Dispose() }
