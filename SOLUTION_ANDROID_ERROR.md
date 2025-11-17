# Solution : Erreur "Le chemin d'accès spécifié est introuvable"

## 🔍 Cause du problème

L'erreur se produit car **Android SDK Platform-Tools** (qui contient `adb.exe`) n'est pas installé. Quand vous utilisez `npm run android`, Expo a besoin d'`adb` pour détecter les appareils/émulateurs Android.

## ✅ Solution immédiate (Recommandée)

**Utilisez `npm start` au lieu de `npm run android`** :

```powershell
cd frontend
npm start
```

Cela vous donnera plusieurs options :
- **Scanner le QR code** avec l'app **Expo Go** sur votre téléphone (recommandé)
- Appuyer sur **`w`** pour ouvrir dans le navigateur web
- Appuyer sur **`a`** pour Android (si vous installez platform-tools plus tard)

### Avantages de cette méthode :
- ✅ Fonctionne immédiatement, sans configuration supplémentaire
- ✅ Pas besoin d'émulateur ou d'appareil connecté
- ✅ Test rapide sur votre téléphone avec Expo Go
- ✅ Aucune installation requise

## 🔧 Solution complète (Pour utiliser `npm run android`)

Si vous voulez vraiment utiliser `npm run android`, vous devez installer **Android SDK Platform-Tools** :

### Étape 1 : Installer Platform-Tools via Android Studio

1. Ouvrez **Android Studio**
2. Allez dans **Tools** > **SDK Manager**
   - Ou **File** > **Settings** > **Appearance & Behavior** > **System Settings** > **Android SDK**
3. Dans l'onglet **SDK Tools**, cochez :
   - ✅ **Android SDK Platform-Tools**
   - ✅ **Android SDK Build-Tools** (recommandé)
4. Cliquez sur **Apply** puis **OK**
5. Attendez la fin de l'installation

### Étape 2 : Vérifier l'installation

Redémarrez votre terminal et vérifiez :

```powershell
# Vérifier que adb est disponible
adb version

# Vérifier la configuration complète
cd ..
.\check-android-setup.ps1
```

### Étape 3 : Utiliser `npm run android`

Une fois `adb` installé, vous pourrez utiliser :

```powershell
cd frontend
npm run android
```

## 📱 Alternative : Utiliser Expo Go (Le plus simple)

1. **Installez Expo Go** sur votre téléphone Android depuis le Play Store
2. **Lancez** `npm start` dans le dossier `frontend`
3. **Scannez le QR code** affiché avec Expo Go
4. Votre app s'ouvrira sur votre téléphone !

## 📝 Résumé

| Méthode | Commande | Configuration requise |
|---------|----------|---------------------|
| **Expo Go** (Recommandé) | `npm start` + QR code | Aucune |
| **Web** | `npm start` puis `w` | Aucune |
| **Android direct** | `npm run android` | Android SDK Platform-Tools |

## 🆘 Besoin d'aide ?

- Vérifiez votre configuration : `.\check-android-setup.ps1`
- Consultez le guide complet : `ANDROID_SETUP_GUIDE.md`

