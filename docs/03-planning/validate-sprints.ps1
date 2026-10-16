param(
    [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path,
    [switch]$RepositoryOnly
)

$ErrorActionPreference = 'Stop'
$issues = [System.Collections.Generic.List[string]]::new()
$planningRoot = Join-Path $ProjectRoot 'docs/03-planning'
$sprintRoot = Join-Path $planningRoot 'sprints'
$requiredSkills = @('antislop', 'design-system-ops', 'design-taste-frontend')
$approvedSkillPaths = @($requiredSkills | ForEach-Object {
    [IO.Path]::GetFullPath("C:/Users/khali/.codex/skills/$_/SKILL.md")
})
$credentialNote = Join-Path $planningRoot 'local-database-credentials.md'
if (-not $RepositoryOnly -and -not (Test-Path -LiteralPath $credentialNote -PathType Leaf)) {
    $issues.Add('Private local database credential note is missing; obtain it through private configuration, not a commit.')
}
$ignorePath = Join-Path $ProjectRoot '.gitignore'
if (-not (Test-Path -LiteralPath $ignorePath -PathType Leaf)) {
    $issues.Add('Root .gitignore is missing.')
} else {
    $ignoreLines = @(Get-Content -LiteralPath $ignorePath -Encoding UTF8)
    if ('/docs/03-planning/local-database-credentials.md' -notin $ignoreLines) {
        $issues.Add('Root .gitignore must exclude the private local credential note explicitly.')
    }
}
# Check presence/exclusion only: do not read or report private credential values.
$sprints = @(Get-ChildItem -LiteralPath $sprintRoot -Filter '*.md' |
    Where-Object { $_.Name -match '^\d{2}-.+\.md$' } | Sort-Object Name)
if ($sprints.Count -ne 22) { $issues.Add("Expected 22 sprint specifications; found $($sprints.Count).") }

$requiredSections = @(
    'Goal and traceability', 'Documentation to follow', 'Frontend tasks',
    'Backend tasks', 'Database tasks', 'Testing tasks', 'Acceptance criteria',
    'Technical exit criteria', 'Verification evidence', 'Defects, limits, and handoff'
)
$ruleText = Get-Content -LiteralPath (Join-Path $ProjectRoot 'docs/02-requirements/business-rules.md') -Raw -Encoding UTF8
$testText = Get-Content -LiteralPath (Join-Path $ProjectRoot 'docs/05-quality/acceptance-tests.md') -Raw -Encoding UTF8
$knownRules = @([regex]::Matches($ruleText, '(?m)^\| (BR-\d{2}) \|') | ForEach-Object { $_.Groups[1].Value })
$knownTests = @([regex]::Matches($testText, '(?m)^\| (AT-\d{2}) \|') | ForEach-Object { $_.Groups[1].Value })

foreach ($file in $sprints) {
    $body = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
    $number = [int]$file.Name.Substring(0, 2)
    $sprintId = 'SP-{0:d2}' -f $number
    if ($number -lt 1 -or $number -gt 22 -or -not $body.StartsWith("# $sprintId ")) {
        $issues.Add("$($file.Name): header does not match its sprint number.")
    }
    foreach ($section in $requiredSections) {
        if ($body -notmatch "(?m)^## $([regex]::Escape($section))\r?$") {
            $issues.Add("$($file.Name): missing section '$section'.")
        }
    }
    if ($body -notmatch '(?m)^Owner: implementing agent[ \t]*\r?$' -or
        $body -notmatch '(?m)^Product acceptance authority: Khalid[ \t]*\r?$') {
        $issues.Add("$($file.Name): owner/acceptance authority is missing.")
    }
    if ($body -notmatch "(?m)^Priority: $($file.Name.Substring(0, 2)) of 22 ") {
        $issues.Add("$($file.Name): priority does not match its number.")
    }
    if ($number -gt 1) {
        $previousId = 'SP-{0:d2}' -f ($number - 1)
        if ($body -notmatch "(?m)^Dependency: \[$previousId\]") {
            $issues.Add("$($file.Name): preceding-sprint dependency is missing.")
        }
    }
    foreach ($match in [regex]::Matches($body, '\b(?:BR|AT)-\d{2}\b')) {
        $identifier = $match.Value
        if (($identifier.StartsWith('BR-') -and $identifier -notin $knownRules) -or
            ($identifier.StartsWith('AT-') -and $identifier -notin $knownTests)) {
            $issues.Add("$($file.Name): unknown source identifier $identifier.")
        }
    }
    foreach ($skill in $requiredSkills) {
        if (-not $body.Contains("C:/Users/khali/.codex/skills/$skill/SKILL.md")) {
            $issues.Add("$($file.Name): missing required UI skill link: $skill.")
        }
    }
    if (-not $body.Contains('../ui-skill-rules.md') -or
        -not $body.Contains('| UI skills and AFTER audit |')) {
        $issues.Add("$($file.Name): mandatory UI workflow/evidence is missing.")
    }
    if ($number -gt 1 -and (-not $body.Contains('Development database: `kayrealestate`.') -or
        -not $body.Contains('../local-database-credentials.md'))) {
        $issues.Add("$($file.Name): confirmed database identity/private configuration reference is missing.")
    }
}

$documents = @($sprints.FullName) + @(
    (Join-Path $sprintRoot 'README.md'),
    (Join-Path $planningRoot 'local-roadmap.md'),
    (Join-Path $planningRoot 'backlog.md'),
    (Join-Path $planningRoot 'README.md'),
    (Join-Path $planningRoot 'SPRINT_TEMPLATE.md'),
    (Join-Path $planningRoot 'ui-skill-rules.md'),
    (Join-Path $ProjectRoot 'AGENTS.md'),
    (Join-Path $ProjectRoot 'DESIGN.md'),
    (Join-Path $ProjectRoot 'decisions.md'),
    (Join-Path $ProjectRoot 'docs/HARNESS.md'),
    (Join-Path $ProjectRoot 'docs/01-working-agreements/coding-standards.md'),
    (Join-Path $ProjectRoot 'docs/QA_COMMANDS.md')
)
$linkCount = 0
$skillLinkCount = 0
$projectPrefix = [IO.Path]::GetFullPath($ProjectRoot).TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar
foreach ($path in $documents) {
    $body = Get-Content -LiteralPath $path -Raw -Encoding UTF8
    $parent = Split-Path $path -Parent
    foreach ($match in [regex]::Matches($body, '\[[^\]\r\n]+\]\((?<target><[^>]+>|[^)\r\n]+)\)')) {
        $target = $match.Groups['target'].Value.Trim().Trim('<', '>')
        if ($target -match '^https?://') { continue }
        if ($RepositoryOnly -and
            $target -in @($requiredSkills | ForEach-Object { "C:/Users/khali/.codex/skills/$_/SKILL.md" })) {
            continue
        }
        $parts = $target -split '#', 2
        $relativePath = [Uri]::UnescapeDataString($parts[0])
        $resolved = if (-not $relativePath) { $path }
            elseif ([IO.Path]::IsPathRooted($relativePath)) { [IO.Path]::GetFullPath($relativePath) }
            else { [IO.Path]::GetFullPath((Join-Path $parent $relativePath)) }
        if ($RepositoryOnly -and $resolved -eq [IO.Path]::GetFullPath($credentialNote)) { continue }
        $linkCount++
        if (-not $resolved.StartsWith($projectPrefix, [StringComparison]::OrdinalIgnoreCase)) {
            if ($resolved -notin $approvedSkillPaths) {
                $issues.Add("$path : unapproved link leaves project root: $target")
                continue
            }
            $skillLinkCount++
        }
        if (-not (Test-Path -LiteralPath $resolved)) {
            $issues.Add("$path : missing local link: $target")
            continue
        }
        if ($parts.Count -eq 2 -and $parts[1] -and $resolved.EndsWith('.md')) {
            $linkedText = Get-Content -LiteralPath $resolved -Raw -Encoding UTF8
            $anchors = @([regex]::Matches($linkedText, '(?m)^#{1,6}\s+(.+?)\r?$') |
                ForEach-Object {
                    $heading = $_.Groups[1].Value.Trim().ToLowerInvariant()
                    ($heading -replace '[^\p{L}\p{N}_\-\s]', '') -replace '\s', '-'
                })
            if ($parts[1] -notin $anchors) { $issues.Add("$path : missing heading anchor: $target") }
        }
    }
}
$index = Get-Content -LiteralPath (Join-Path $sprintRoot 'README.md') -Raw -Encoding UTF8
$coverage = @([regex]::Matches($index, '(?m)^\| (AT-\d{2}) \|') | ForEach-Object { $_.Groups[1].Value })
if ($coverage.Count -ne 41 -or @($coverage | Sort-Object -Unique).Count -ne 41) {
    $issues.Add('Sprint index must map 41 unique acceptance IDs.')
}
foreach ($identifier in $knownTests) {
    if ($identifier -notin $coverage) { $issues.Add("Acceptance coverage missing: $identifier") }
}

$mermaidCount = 0
$diagramDocs = @(
    'docs/04-design/data-model.md', 'docs/04-design/architecture.md',
    'docs/02-requirements/business-rules.md', 'docs/06-delivery-and-operations/release-and-recovery.md'
)
foreach ($relativeDoc in $diagramDocs) {
    $path = Join-Path $ProjectRoot $relativeDoc
    $body = Get-Content -LiteralPath $path -Raw -Encoding UTF8
    $pattern = '\[Mermaid source\]\((?<path>[^)]+\.mmd)\)\.[\s\S]*?\x60{3}mermaid\r?\n(?<body>[\s\S]*?)\r?\n\x60{3}'
    foreach ($match in [regex]::Matches($body, $pattern)) {
        $sourcePath = Join-Path (Split-Path $path -Parent) $match.Groups['path'].Value
        if (-not (Test-Path -LiteralPath $sourcePath)) {
            $issues.Add("$relativeDoc : missing Mermaid source.")
            continue
        }
        $source = (Get-Content -LiteralPath $sourcePath -Raw -Encoding UTF8).Replace([string][char]13, '').Trim()
        $embedded = $match.Groups['body'].Value.Replace([string][char]13, '').Trim()
        $mermaidCount++
        if ($source -ne $embedded) { $issues.Add("$relativeDoc : Mermaid mismatch: $sourcePath") }
    }
}

$api = Get-Content -LiteralPath (Join-Path $ProjectRoot 'docs/04-design/api-contracts.md') -Raw -Encoding UTF8
$jsonCount = 0
foreach ($match in [regex]::Matches($api, '\x60{3}json\r?\n(?<body>[\s\S]*?)\r?\n\x60{3}')) {
    try { $null = $match.Groups['body'].Value | ConvertFrom-Json; $jsonCount++ }
    catch { $issues.Add("Invalid API JSON example: $($_.Exception.Message)") }
}

if ($issues.Count) {
    $issues | ForEach-Object { Write-Output "FAIL: $_" }
    exit 1
}
Write-Output "PASS: 22 sprint specifications; required sections/owners/priorities/dependencies and source IDs valid."
Write-Output 'PASS: required UI skill rules/evidence in all 22 sprints; database references in SP-02 through SP-22; private-note exclusion configured.'
if ($RepositoryOnly) { Write-Output 'Repository-only mode: private credential note and approved external installed skills are not required in a clean checkout.' }
Write-Output "PASS: $linkCount local file links/anchors (including $skillLinkCount approved installed-skill links); 41 unique acceptance mappings."
Write-Output "PASS: $mermaidCount embedded Mermaid sources synchronized; $jsonCount API JSON examples valid."
Write-Output 'Documentation-only validation: application results are recorded separately in docs/QA_COMMANDS.md and sprint evidence.'

