# Script PowerShell pour installer les dépendances React Navigation
Write-Host "Installation des dépendances React Navigation..." -ForegroundColor Green

# Changer vers le répertoire frontend
Set-Location "C:\Users\houda\liberty mobile\frontend"

# Installer React Navigation
Write-Host "Installation de @react-navigation/native et @react-navigation/bottom-tabs..." -ForegroundColor Yellow
npm install @react-navigation/native @react-navigation/bottom-tabs

# Installer les dépendances Expo
Write-Host "Installation des dépendances Expo..." -ForegroundColor Yellow
npx expo install react-native-screens react-native-safe-area-context

Write-Host "Installation terminée!" -ForegroundColor Green
Write-Host "Vous pouvez maintenant lancer l'application avec: npm start" -ForegroundColor Cyan

Read-Host "Appuyez sur Entrée pour continuer"

