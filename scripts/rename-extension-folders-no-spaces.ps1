# Rinomina le cartelle delle estensioni che contengono spazi.
# Node/Directus possono fallire con path tipo "Chiamate Outbound" o "Visualizzazione Interfaccia".
# Esegui dalla root del repo: .\scripts\rename-extension-folders-no-spaces.ps1

$repoRoot = (Get-Item $PSScriptRoot).Parent.FullName
$registry = Join-Path $repoRoot "extensions\.registry"
if (-not (Test-Path $registry)) {
    Write-Error "Cartella non trovata: $registry"
    exit 1
}

Set-Location $registry

$renames = @(
    @{ Old = "Chiamate Outbound"; New = "Chiamate-Outbound" },
    @{ Old = "Visualizzazione Interfaccia"; New = "Visualizzazione-Interfaccia" }
)

foreach ($r in $renames) {
    $oldPath = Join-Path $registry $r.Old
    $newPath = Join-Path $registry $r.New
    if (Test-Path $oldPath) {
        if (Test-Path $newPath) {
            Write-Warning "Esiste già: $($r.New) - skip $($r.Old)"
        } else {
            Rename-Item -LiteralPath $oldPath -NewName $r.New
            Write-Host "Rinominato: $($r.Old) -> $($r.New)"
        }
    } else {
        Write-Host "Non trovato (già rinominato?): $($r.Old)"
    }
}

Write-Host "Fatto. Ricostruisci l'immagine Docker e non montare un volume su /directus/extensions."
