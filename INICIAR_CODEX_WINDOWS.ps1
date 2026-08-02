$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "=== RechDocs - preparação local ==="

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "Git não encontrado. Instale Git for Windows antes de continuar."
}

if (-not (Test-Path ".git")) {
    git init
    git add .
    git commit -m "chore: import RechDocs consolidation baseline"
}

if (-not (Get-Command codex -ErrorAction SilentlyContinue)) {
    throw "Codex CLI não encontrado. Instale com: npm install -g @openai/codex"
}

Write-Host "Abrindo Codex em modo supervisionado..."
Write-Host "Cole o conteúdo de PROMPT_INICIAL.txt quando solicitado."
codex
