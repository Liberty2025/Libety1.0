@echo off
echo Installation des dependances React Navigation...
cd /d "C:\Users\houda\liberty mobile\frontend"
echo.
echo Installation de @react-navigation/native et @react-navigation/bottom-tabs...
npm install @react-navigation/native @react-navigation/bottom-tabs
echo.
echo Installation des dependances Expo...
npx expo install react-native-screens react-native-safe-area-context
echo.
echo Installation terminee!
echo Vous pouvez maintenant lancer l'application avec: npm start
pause

