<#
  Installs the requirements for Learning Web on Windows: Git and Python.
  Usage (PowerShell):  .\setup.ps1
  If scripts are blocked:  powershell -ExecutionPolicy Bypass -File .\setup.ps1
#>
$ErrorActionPreference = 'Stop'

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Error "winget not found. Install 'App Installer' from the Microsoft Store, or install Git and Python manually."
}

function Test-RealCommand($name) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    # Ignore the Microsoft Store python stub in WindowsApps
    return ($cmd -and $cmd.Source -notlike '*\WindowsApps\*')
}

function Install-Package($id, $label, $check) {
    if (Test-RealCommand $check) {
        Write-Host "[ok] $label already installed"
        return
    }
    Write-Host "[..] Installing $label"
    winget install --id $id -e --accept-package-agreements --accept-source-agreements
}

Install-Package 'Git.Git' 'Git' 'git'
Install-Package 'Python.Python.3.12' 'Python 3.12' 'python'

Write-Host ""
Write-Host "Done. Close and reopen your terminal so PATH updates, then run:"
Write-Host "  python server.py"
