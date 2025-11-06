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
- `npm start` - Démarre l'application Expo
- `npm run android` - Lance sur Android
- `npm run ios` - Lance sur iOS
- `npm run web` - Lance sur navigateur web

### Backend
- `npm start` - Démarre le serveur en production
- `npm run dev` - Démarre le serveur en mode développement avec nodemon

## API Endpoints

- `GET /` - Page d'accueil de l'API
- `GET /api/health` - Vérification de l'état du serveur et de la base de données

