# Script pour pousser le code vers GitHub avec le token
$token = "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"
$repo = "https://github.com/Liberty2025/Libety1.0.git"

# Supprimer les credentials en cache
cmdkey /delete:LegacyGeneric:target=git:https://github.com 2>$null
cmdkey /delete:LegacyGeneric:target=git:https://ferchichiseddik039-oss@github.com 2>$null

# Configurer le remote avec le token
git remote remove origin 2>$null
git remote add origin "https://$token@github.com/Liberty2025/Libety1.0.git"

# Pousser avec le token
Write-Host "Tentative de push vers GitHub..." -ForegroundColor Yellow
git push -u origin main

