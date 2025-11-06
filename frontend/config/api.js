import { Platform } from 'react-native';

// Configuration des URLs d'API selon l'environnement
const API_CONFIG = {
  // URLs de production (pour Expo Go en France)
  production: [
    'https://liberty-mobile-backend.herokuapp.com', // URL Heroku (à créer)
    'https://liberty-mobile.railway.app', // URL Railway (à créer)
    'http://192.168.1.13:8000', // IP locale (pour développement local - port 8000)
    'http://192.168.1.13:3000', // IP locale (pour développement local - port 3000 fallback)
  ],
  
  // URLs de développement local
  development: [
    'http://192.168.1.13:8000', // IP locale (port 8000)
    'http://192.168.1.13:3000', // IP locale (port 3000 - fallback)
    'http://localhost:8000', // Localhost pour émulateur (port 8000)
    'http://localhost:3000', // Localhost pour émulateur (port 3000 - fallback)
    'http://10.0.2.2:8000', // IP émulateur Android (port 8000)
    'http://10.0.2.2:3000', // IP émulateur Android (port 3000 - fallback)
  ]
};

// Fonction pour détecter si on est sur Expo Go
const isExpoGo = () => {
  // Dans Expo Go, __DEV__ est toujours true, donc on utilise d'autres méthodes
  try {
    // Vérifier si on est dans Expo Go
    return typeof expo !== 'undefined' && expo.Constants?.appOwnership === 'expo';
  } catch (error) {
    return false;
  }
};

// Fonction pour obtenir l'URL de l'API
export const getAPIBaseURL = () => {
  // Si on est sur Expo Go, utiliser les URLs de production
  if (isExpoGo()) {
    console.log('📱 Détecté Expo Go - Utilisation des URLs de production');
    return API_CONFIG.production[0]; // Utiliser la première URL de production
  }
  
  // Sinon, utiliser les URLs de développement (port 8000 en priorité)
  console.log('💻 Mode développement local');
  return API_CONFIG.development[0]; // Port 8000 en premier
};

// Fonction pour tester la connectivité
export const testAPIConnectivity = async () => {
  const urls = __DEV__ === false ? API_CONFIG.production : API_CONFIG.development;
  
  for (const url of urls) {
    try {
      const response = await fetch(`${url}/api/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        console.log(`✅ API accessible sur: ${url}`);
        return url;
      }
    } catch (error) {
      console.log(`❌ API non accessible sur: ${url}`);
    }
  }
  
  console.log('❌ Aucune API accessible');
  return null;
};

// Configuration WebSocket
export const getWebSocketURL = () => {
  const baseURL = getAPIBaseURL();
  return baseURL.replace('http://', 'ws://').replace('https://', 'wss://');
};

export default {
  getAPIBaseURL,
  testAPIConnectivity,
  getWebSocketURL
};
