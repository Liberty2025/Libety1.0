import { Platform } from 'react-native';

// Configuration des URLs d'API selon l'environnement
const API_CONFIG = {
  // URLs de production (pour Expo Go en France)
  production: [
    'https://liberty-mobile-backend.herokuapp.com', // URL Heroku (à créer)
    'https://liberty-mobile.railway.app', // URL Railway (à créer)
    'http://10.95.206.45:3000', // IP locale actuelle (pour développement local - port 3000)
    'http://192.168.1.13:3000', // IP locale alternative (pour développement local - port 3000)
    'http://10.95.206.45:8000', // IP locale actuelle (pour développement local - port 8000 fallback)
  ],
  
  // URLs de développement local
  development: [
    'http://192.168.1.13:3000', // IP locale principale (port 3000 - PRIORITAIRE)
    'http://localhost:3000', // Localhost pour émulateur (port 3000)
    'http://10.0.2.2:3000', // IP émulateur Android (port 3000)
    'http://127.0.0.1:3000', // 127.0.0.1 pour émulateur (port 3000)
    'http://10.95.206.45:3000', // IP locale alternative (port 3000)
    'http://192.168.1.13:8000', // IP locale principale (port 8000 - fallback)
    'http://localhost:8000', // Localhost pour émulateur (port 8000 - fallback)
    'http://10.0.2.2:8000', // IP émulateur Android (port 8000 - fallback)
    'http://10.95.206.45:8000', // IP locale alternative (port 8000 - fallback)
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

// Cache pour l'URL de l'API qui fonctionne
let cachedAPIURL = null;

// Fonction pour obtenir l'URL de l'API
export const getAPIBaseURL = () => {
  // Si on a déjà une URL en cache qui fonctionne, l'utiliser
  if (cachedAPIURL) {
    return cachedAPIURL;
  }
  
  // Si on est sur Expo Go, utiliser les URLs de production
  if (isExpoGo()) {
    console.log('📱 Détecté Expo Go - Utilisation des URLs de production');
    cachedAPIURL = API_CONFIG.production[0]; // Utiliser la première URL de production
    return cachedAPIURL;
  }
  
  // Sinon, utiliser les URLs de développement (port 3000 en priorité)
  console.log('💻 Mode développement local');
  cachedAPIURL = API_CONFIG.development[0]; // Port 3000 en premier (192.168.1.13:3000)
  return cachedAPIURL;
};

// Fonction pour tester la connectivité
export const testAPIConnectivity = async () => {
  const urls = __DEV__ === false ? API_CONFIG.production : API_CONFIG.development;
  
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${url}/api/health`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`✅ API accessible sur: ${url}`);
        cachedAPIURL = url; // Mettre en cache l'URL qui fonctionne
        return url;
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.log(`❌ API non accessible sur: ${url} - ${error.message}`);
      } else {
        console.log(`⏱️ Timeout pour: ${url}`);
      }
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
