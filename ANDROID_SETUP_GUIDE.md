# Guide de configuration Android

## ✅ Configuration actuelle

Les variables d'environnement suivantes ont été configurées de manière permanente :

- **ANDROID_HOME** = `C:\Users\houda\AppData\Local\Android\Sdk`
- **ANDROID_SDK_ROOT** = `C:\Users\houda\AppData\Local\Android\Sdk`
- **PATH** = Contient `%ANDROID_HOME%\platform-tools` (sera actif après redémarrage du terminal)

## ⚠️ Action requise : Installer Android SDK Platform-Tools

Le dossier `platform-tools` (qui contient `adb.exe`) n'est pas encore installé. Pour l'installer :

### Méthode 1 : Via Android Studio (Recommandé)

1. Ouvrez **Android Studio**
2. Allez dans **Tools** > **SDK Manager** (ou **File** > **Settings** > **Appearance & Behavior** > **System Settings** > **Android SDK**)
3. Dans l'onglet **SDK Tools**, cochez **Android SDK Platform-Tools**
4. Cliquez sur **Apply** puis **OK**
5. Attendez la fin de l'installation

### Méthode 2 : Via la ligne de commande

```powershell
# Télécharger et installer platform-tools via sdkmanager
cd "C:\Users\houda\AppData\Local\Android\Sdk\cmdline-tools"
.\sdkmanager "platform-tools"
```

## 🔄 Après l'installation

1. **Redémarrez votre terminal** pour que les nouvelles variables d'environnement soient prises en compte
2. Vérifiez la configuration :
   ```powershell
   .\check-android-setup.ps1
   ```
3. Testez `adb` :
   ```powershell
   adb version
   ```

## 🚀 Utilisation avec Expo

### Option A : Utiliser Expo Go (Aucune configuration supplémentaire nécessaire)

1. Installez l'application **Expo Go** sur votre téléphone Android
2. Dans le dossier `frontend`, lancez :
   ```powershell
   npm start
   ```
3. Scannez le QR code avec Expo Go

### Option B : Utiliser un émulateur Android

1. Ouvrez **Android Studio**
2. Allez dans **Tools** > **Device Manager**
3. Créez un nouveau **AVD** (Android Virtual Device) si nécessaire
4. Lancez l'émulateur
5. Dans le dossier `frontend`, lancez :
   ```powershell
   npm start
   ```
   Expo détectera automatiquement l'émulateur

### Option C : Utiliser un appareil physique via USB

1. Activez le **mode développeur** sur votre téléphone Android
2. Activez le **débogage USB**
3. Connectez votre téléphone via USB
4. Vérifiez la connexion :
   ```powershell
   adb devices
   ```
5. Dans le dossier `frontend`, lancez :
   ```powershell
   npm run android
   ```

## 📝 Notes

- Les variables d'environnement sont maintenant configurées de manière permanente
- Vous devez redémarrer votre terminal pour que les changements du PATH soient pris en compte
- Pour cette session, les variables sont déjà configurées (vous pouvez tester maintenant)

