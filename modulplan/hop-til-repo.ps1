# Skift til Git-repo-rod (mappen over modulplan, typisk MCFLEET).
#
# PowerShell bruger IKKE "cd til" — kun:  cd C:\sti\til\mappe
#
# Vigtigt: Brug punkt-kilde (.) så mappen skifter i DENNE terminal-session:
#   . .\hop-til-repo.ps1
# Hvis du kører  .\hop-til-repo.ps1  uden punkt foran, skifter mappen ikke permanent.

Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..'))
Write-Host "Nu i repo-rod: $(Get-Location)"
Write-Host "Næste skridt: git status"
