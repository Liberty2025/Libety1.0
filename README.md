# Liberty Mobile

Application mobile React Native avec Expo et backend Node.js utilisant MongoDB Atlas.

## Structure du projet

```
liberty mobile/
├── frontend/          # Application React Native avec Expo
├── backend/           # Serveur Node.js avec Express et MongoDB
└── README.md
```

## Prérequis

- Node.js (version 16 ou plus récente)
- npm ou yarn
- Expo CLI
- Compte MongoDB Atlas

## Installation et démarrage

### Frontend (React Native + Expo)

```bash
cd frontend
npm install
npm start
```

L'application sera disponible sur:
- Web: http://localhost:8081
- Mobile: Utilisez l'app Expo Go pour scanner le QR code

### Backend (Node.js + Express + MongoDB)

```bash
cd backend
npm install
npm run dev
```

Le serveur sera disponible sur: http://localhost:3000

## Fonctionnalités

### Frontend
- Page d'accueil avec couleur violet nuit foncé
- Texte de bienvenue "Bonjour"
- Configuration Expo avec la dernière version

### Backend
- Serveur Express.js
- Connexion MongoDB Atlas
- API REST de base
- Endpoints de santé du serveur

## Configuration MongoDB Atlas

La connexion à MongoDB Atlas est configurée dans le fichier `.env` du backend avec l'URI fournie.

## Scripts disponibles

### Frontend
- `npm start` - Démarre l'application Expo (recommandé - permet de choisir la plateforme)
- `npm run android` - Lance sur Android (nécessite Android SDK configuré)
- `npm run ios` - Lance sur iOS
- `npm run web` - Lance sur navigateur web

## Dépannage

### Erreur "Le chemin d'accès spécifié est introuvable" sur Android

Cette erreur indique que le SDK Android n'est pas configuré. Solutions :

**Solution 1 (Recommandée) : Utiliser Expo Go**
1. Installez l'application "Expo Go" sur votre téléphone Android depuis le Play Store
2. Lancez `npm start` dans le dossier `frontend`
3. Scannez le QR code affiché avec Expo Go
4. Aucune configuration Android SDK nécessaire !

**Solution 2 : Configurer Android SDK**
1. Installez [Android Studio](https://developer.android.com/studio)
2. Ouvrez Android Studio > SDK Manager
3. Installez "Android SDK Platform-Tools"
4. Définissez les variables d'environnement système :
   - `ANDROID_HOME` = `C:\Users\VotreNom\AppData\Local\Android\Sdk`
   - Ajoutez au PATH : `%ANDROID_HOME%\platform-tools`
5. Redémarrez votre terminal et réessayez

**Solution 3 : Utiliser un émulateur Android**
1. Installez Android Studio
2. Créez un AVD (Android Virtual Device) via AVD Manager
3. Lancez l'émulateur
4. Utilisez `npm start` (Expo détectera automatiquement l'émulateur)

Pour diagnostiquer votre configuration, exécutez :
```powershell
.\check-android-setup.ps1
```

### Backend
- `npm start` - Démarre le serveur en production
- `npm run dev` - Démarre le serveur en mode développement avec nodemon

## API Endpoints

- `GET /` - Page d'accueil de l'API
- `GET /api/health` - Vérification de l'état du serveur et de la base de données

