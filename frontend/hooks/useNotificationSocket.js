import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import io from 'socket.io-client';

const useNotificationSocket = (authToken, demenageurId) => {
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected, error
  const socketRef = useRef(null);

  useEffect(() => {
    console.log('🔍 useNotificationSocket useEffect déclenché:', { 
      authToken: authToken ? 'PRÉSENT' : 'ABSENT', 
      demenageurId,
      tokenLength: authToken?.length || 0,
      socketExists: !!socketRef.current
    });
    
    if (!authToken || !demenageurId) {
      console.log('❌ Pas de token ou userId pour WebSocket:', { authToken: !!authToken, demenageurId });
      setConnectionStatus('disconnected');
      return;
    }

    // Éviter les reconnexions inutiles si déjà connecté
    if (socketRef.current && socketRef.current.connected) {
      console.log('✅ WebSocket déjà connecté, pas de reconnexion nécessaire');
      return;
    }

    // Délai pour s'assurer que les données sont complètement chargées
    const connectWithDelay = setTimeout(() => {
      console.log('⏰ Connexion WebSocket avec délai de 1 seconde...');
      
      // Vérifier à nouveau si on a toujours besoin de se connecter
      if (!authToken || !demenageurId) {
        console.log('❌ Token ou userId manquant après délai');
        return;
      }

    // Déconnecter l'ancienne connexion si elle existe
    if (socketRef.current) {
      console.log('🔄 Déconnexion de l\'ancienne connexion WebSocket');
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const API_BASE_URL = Platform.OS === 'android' ? 'http://192.168.1.13:3000' : 'http://localhost:3000';
    
    console.log('🔌 Connexion WebSocket pour notifications déménageur:', demenageurId);
    console.log('🔑 Token utilisé:', authToken ? 'PRÉSENT' : 'ABSENT');
    console.log('🌐 URL WebSocket:', API_BASE_URL);
    
    setConnectionStatus('connecting');
    
    // Test de connectivité réseau d'abord
    const testConnectivity = async () => {
      try {
        console.log('🌐 Test de connectivité vers:', API_BASE_URL);
        const response = await fetch(`${API_BASE_URL}/api/health`, {
          method: 'GET',
          timeout: 5000
        });
        
        if (response.ok) {
          console.log('✅ Connectivité réseau OK');
          return true;
        } else {
          console.log('❌ Erreur HTTP:', response.status);
          return false;
        }
      } catch (error) {
        console.log('❌ Erreur de connectivité:', error.message);
        setConnectionStatus('error');
        return false;
      }
    };
    
    // Tester la connectivité avant de se connecter
    testConnectivity().then(canConnect => {
      if (!canConnect) {
        console.log('❌ Impossible de se connecter au serveur');
        return;
      }
      
      console.log('🔌 Tentative de connexion WebSocket...');
      
      // Initialiser la connexion WebSocket
      socketRef.current = io(API_BASE_URL, {
        auth: {
          token: authToken
        },
        transports: ['polling', 'websocket'], // Commencer par polling
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      const socket = socketRef.current;

    // Événements de connexion
    socket.on('connect', () => {
      console.log('✅ WebSocket connecté pour notifications');
      console.log('🔌 Socket ID:', socket.id);
      console.log('🔑 Auth data envoyée:', {
        token: authToken ? 'PRÉSENT' : 'ABSENT',
        userType: 'demenageur',
        userId: demenageurId
      });
      setIsConnected(true);
      setConnectionStatus('connected');
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket déconnecté:', reason);
      console.log('🔍 Raison de déconnexion:', reason);
      setIsConnected(false);
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.log('❌ Erreur de connexion WebSocket:', error);
      setConnectionStatus('error');
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 WebSocket reconnecté après', attemptNumber, 'tentatives');
      setConnectionStatus('connected');
    });

    socket.on('reconnect_error', (error) => {
      console.log('❌ Erreur de reconnexion WebSocket:', error);
      setConnectionStatus('error');
    });

    // Écouter les nouvelles demandes de service
    socket.on('new_service_request', (data) => {
      console.log('🔔 Nouvelle demande de service reçue:', data);
      console.log('🔔 Données complètes:', JSON.stringify(data, null, 2));
      
      const notification = {
        id: data._id,
        clientName: data.clientId?.first_name || 'Client',
        serviceType: data.serviceType,
        departureAddress: data.departureAddress,
        destinationAddress: data.destinationAddress,
        createdAt: data.createdAt,
        serviceDetails: data.serviceDetails,
        estimatedPrice: data.estimatedPrice,
        scheduledDate: data.scheduledDate,
        clientId: data.clientId,
        demenageurId: data.demenageurId
      };

      setNotifications(prev => [notification, ...prev]);
    });

    // Écouter les mises à jour de statut
    socket.on('service_request_updated', (data) => {
      console.log('🔄 Mise à jour de demande reçue:', data);
      // Mettre à jour la liste des notifications si nécessaire
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === data._id ? { ...notif, ...data } : notif
        )
      );
    });
    
    }); // Fermeture de testConnectivity().then()
    
    }, 1000); // Fermeture du setTimeout avec délai de 1 seconde
    
    // Nettoyage à la déconnexion
    return () => {
      console.log('🧹 Nettoyage du hook WebSocket - déconnexion...');
      clearTimeout(connectWithDelay);
      if (socketRef.current) {
        console.log('🔌 Déconnexion du socket existant');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [authToken, demenageurId]);

  const removeNotification = (notificationId) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  return {
    notifications,
    isConnected,
    connectionStatus,
    removeNotification,
    clearAllNotifications
  };
};

export default useNotificationSocket;
