# Teste de restauracao do backup da Torre em um projeto DESCARTAVEL (ex.: veroenz).
# Antes, defina no terminal (nao grave em arquivo, nao cole em chat):
#   $env:BACKUP_PASSPHRASE = "<senha do backup>"
#   $env:VEROENZ_DB_URL    = "<URL do Session pooler do projeto de teste>"
# Uso: powershell -File scripts\restore-test.ps1 [-RunId 39152074892]
param([string]$RunId = "")

$ErrorActionPreference = "Stop"
$prodRef = "nvxwqrpztecrvrxoddxf"
$image = "public.ecr.aws/supabase/postgres:17.11.0.004"

if (-not $env:BACKUP_PASSPHRASE) { throw "Defina `$env:BACKUP_PASSPHRASE." }
if (-not $env:VEROENZ_DB_URL) { throw "Defina `$env:VEROENZ_DB_URL." }
if ($env:VEROENZ_DB_URL -match $prodRef) { throw "A URL aponta para a PRODUCAO ($prodRef). Abortado." }

$gpg = (Get-Command gpg -ErrorAction SilentlyContinue).Source
if (-not $gpg) { $gpg = "C:\Program Files\Git\usr\bin\gpg.exe" }
if (-not (Test-Path $gpg)) { throw "gpg nao encontrado (instale o Gpg4win ou o Git for Windows)." }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw "Docker nao encontrado." }

$work = Join-Path $env:TEMP ("torre-restore-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
New-Item -ItemType Directory -Path $work | Out-Null
Write-Host "Pasta de trabalho: $work"

if (-not $RunId) { $RunId = gh run list --workflow=backup.yml --status=success --limit 1 --json databaseId -q ".[0].databaseId" }
Write-Host "Baixando artefato da execucao $RunId..."
gh run download $RunId --repo samuelveronez/torre --dir $work
$enc = Get-ChildItem $work -Recurse -Filter "*.gpg"
if (-not $enc) { throw "Nenhum arquivo .gpg encontrado no artefato." }
$dir = $enc[0].DirectoryName

foreach ($f in $enc) {
    $out = $f.FullName -replace "\.gpg$", ""
    & $gpg --batch --yes --pinentry-mode loopback --passphrase $env:BACKUP_PASSPHRASE -o $out -d $f.FullName 2>$null
    if ($LASTEXITCODE -ne 0) { throw "Falha ao descriptografar $($f.Name) (senha errada?)." }
}
Write-Host "Descriptografado: " ((Get-ChildItem $dir -Filter *.sql | ForEach-Object { "$($_.Name) ($([int]($_.Length/1KB)) KB)" }) -join ", ")

$log = Join-Path $work "restore.log"
foreach ($file in @("schema.sql", "data.sql")) {
    Write-Host "Restaurando $file no projeto de teste..."
    docker run --rm -v "${dir}:/b" $image psql $env:VEROENZ_DB_URL -v ON_ERROR_STOP=0 -q -f "/b/$file" *>> $log
}
$errors = (Select-String -Path $log -Pattern "ERROR" -SimpleMatch).Count
Write-Host "Linhas com ERROR no log: $errors (veja $log)"

$sql = "select 'torre_tasks' t, count(*) from torre_tasks union all select 'torre_scheduled_blocks', count(*) from torre_scheduled_blocks union all select 'torre_preferences', count(*) from torre_preferences union all select 'torre_people', count(*) from torre_people union all select 'torre_conversations', count(*) from torre_conversations;"
Write-Host "Contagens no projeto de teste (compare com a producao):"
docker run --rm $image psql $env:VEROENZ_DB_URL -c $sql

Write-Host "Concluido. Apague a pasta $work quando terminar (contem dados descriptografados)."
