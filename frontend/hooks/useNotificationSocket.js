import { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { getAPIBaseURL } from '../config/api';

const useNotificationSocket = (authToken, demenageurId) => {
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected, error
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const persistedLoadedRef = useRef(false);
  const socketRef = useRef(null);

  const parseJsonField = useCallback((value, fallback = {}) => {
    if (!value) {
      return fallback;
    }

    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        return fallback;
      }
    }

    return value;
  }, []);

  const mapRecordToNotification = useCallback((record) => {
    if (!record) {
      return null;
    }

    const data = parseJsonField(record.data, {});
    const receivedAt = record.created_at || record.createdAt || new Date().toISOString();
    const recordId = record.id;

    return {
      id: `notification_${recordId}`,
      recordId,
      type: record.type,
      title: record.title,
      message: record.message,
      receivedAt,
      payload: {
        ...(typeof data === 'object' && data ? data : {}),
        notificationId: recordId,
      },
      metadata: parseJsonField(record.metadata, {}),
      dedupeKey: `${record.type || 'notification'}_${recordId}`,
      isRead: record.is_read,
      readAt: record.read_at,
      priority: record.priority,
      status: record.status,
    };
  }, [parseJsonField]);

  const sortNotifications = useCallback((list) => {
    return [...list].sort((a, b) => {
      const dateA = new Date(a?.receivedAt || a?.createdAt || 0).getTime();
      const dateB = new Date(b?.receivedAt || b?.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, []);

  const mergeNotifications = useCallback((prev, incoming = []) => {
    const map = new Map();

    const addToMap = (notification) => {
      if (!notification) return;
      const key = notification.dedupeKey
        || (notification.recordId ? `${notification.type || 'notification'}_${notification.recordId}` : notification.id);
      const existing = map.get(key);
      if (existing) {
        map.set(key, { ...existing, ...notification });
      } else {
        map.set(key, notification);
      }
    };

    prev.forEach(addToMap);
    incoming.forEach(addToMap);

    return sortNotifications(Array.from(map.values()));
  }, [sortNotifications]);

  const addNotifications = useCallback((incoming = []) => {
    console.log('📥 addNotifications appelé avec:', incoming.length, 'notifications');
    setNotifications((prev) => {
      const merged = mergeNotifications(prev, incoming);
      console.log('📊 État des notifications après fusion:', {
        avant: prev.length,
        nouvelles: incoming.length,
        après: merged.length
      });
      return merged;
    });
  }, [mergeNotifications]);

  const loadPersistedNotifications = useCallback(async ({ force = false } = {}) => {
    if (!authToken || !demenageurId) {
      return;
    }

    if (!force && persistedLoadedRef.current) {
      return;
    }

    setIsLoadingNotifications(true);

    try {
      const API_BASE_URL = getAPIBaseURL();
      const response = await fetch(`${API_BASE_URL}/api/notifications?limit=100`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.log('❌ Échec du chargement des notifications persistées (déménageur):', response.status);
        return;
      }

      const result = await response.json();
      if (result?.success && Array.isArray(result.notifications)) {
        // Charger TOUTES les notifications (lues et non lues)
        const formatted = result.notifications
          .map(mapRecordToNotification)
          .filter(Boolean);
        console.log(`📋 Notifications chargées depuis la base: ${formatted.length} (toutes, lues et non lues)`);
        setNotifications((prev) => mergeNotifications(prev, formatted));
        persistedLoadedRef.current = true;
      }
    } catch (error) {
      console.log('❌ Erreur lors du chargement des notifications persistées (déménageur):', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [authToken, demenageurId, mapRecordToNotification, mergeNotifications]);

  const markNotificationAsRead = useCallback(async (recordId) => {
    if (!recordId || !authToken) {
      return;
    }

    try {
      const API_BASE_URL = getAPIBaseURL();
      await fetch(`${API_BASE_URL}/api/notifications/${recordId}/read`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.log('❌ Erreur lors du marquage de la notification (déménageur):', error);
    }

    setNotifications((prev) =>
      prev.map((notification) =>
        notification.recordId === recordId
          ? { ...notification, isRead: true, readAt: notification.readAt || new Date().toISOString() }
          : notification
      )
    );
  }, [authToken]);

  const clearAllNotifications = useCallback(async () => {
    if (authToken) {
      try {
        const API_BASE_URL = getAPIBaseURL();
        await fetch(`${API_BASE_URL}/api/notifications/mark-all/read`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.log('❌ Erreur lors du marquage de toutes les notifications (déménageur):', error);
      }
    }
 
    // Marquer toutes les notifications comme lues mais NE PAS les supprimer
    setNotifications((prev) => 
      prev.map((notification) => ({
        ...notification,
        isRead: true,
        readAt: notification.readAt || new Date().toISOString()
      }))
    );
  }, [authToken]);

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

    // Utiliser la configuration API centralisée
    const API_BASE_URL = getAPIBaseURL();
    
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
      console.log('🔔 Nouvelle demande de service reçue via WebSocket:', data);
      console.log('🔔 Données complètes:', JSON.stringify(data, null, 2));
      
      const notificationId = data._id || data.id || `temp_${Date.now()}`;
      const notification = {
        id: `service_${notificationId}_${Date.now()}`, // Ajouter timestamp pour garantir l'unicité
        type: 'new_service_request',
        title: data.clientId?.first_name ? `${data.clientId.first_name} ${data.clientId.last_name || ''}` : 'Nouvelle demande',
        message:
          data.serviceType === 'demenagement'
            ? `Demande de déménagement : ${data.departureAddress || ''} → ${data.destinationAddress || ''}`
            : `Demande de transport : ${data.departureAddress || ''} → ${data.destinationAddress || ''}`,
        receivedAt: data.createdAt || new Date().toISOString(),
        payload: {
          ...data,
          clientName: data.clientId?.first_name ? `${data.clientId.first_name} ${data.clientId.last_name || ''}`.trim() : '',
          departureAddress: data.departureAddress,
          destinationAddress: data.destinationAddress,
          serviceType: data.serviceType,
          estimatedPrice: data.estimatedPrice,
        },
        dedupeKey: `new_service_request_${notificationId}_${Date.now()}`, // Ajouter timestamp pour éviter la déduplication
        recordId: data.notificationId,
        isRead: false, // Toujours non lue quand elle arrive en temps réel
      };

      console.log('📤 Ajout de la notification en temps réel:', notification);
      addNotifications([notification]);
    });

    // Écouter les mises à jour de statut
    socket.on('service_request_updated', (data) => {
      console.log('🔄 Mise à jour de demande reçue via WebSocket:', data);
      const notification = {
        id: `status_${data._id}_${Date.now()}`,
        type: 'service_request_updated',
        title: 'Mise à jour de mission',
        message: `Le statut est maintenant ${data?.status || 'mis à jour'}.`,
        receivedAt: new Date().toISOString(),
        payload: {
          ...data,
          status: data?.status,
        },
        dedupeKey: `service_request_updated_${data._id}_${Date.now()}`,
        recordId: data.notificationId,
        isRead: false,
      };

      console.log('📤 Ajout de la notification service_request_updated en temps réel:', notification);
      addNotifications([notification]);
    });

    socket.on('price_negotiated', (data) => {
      console.log('📬 price_negotiated reçu via WebSocket:', data);
      const notification = {
        id: `client_price_${data.missionId}_${Date.now()}`,
        type: 'client_price_proposed',
        title: 'Proposition du client',
        message: `Le client propose ${data.clientPrice} TND.`,
        receivedAt: new Date().toISOString(),
        payload: {
          ...data,
          clientPrice: data.clientPrice,
        },
        dedupeKey: `client_price_proposed_${data.missionId}_${Date.now()}`,
        recordId: data.notificationId,
        isRead: false,
      };

      console.log('📤 Ajout de la notification price_negotiated en temps réel:', notification);
      addNotifications([notification]);
    });

    socket.on('price_accepted', (data) => {
      console.log('📬 price_accepted reçu via WebSocket:', data);
      const notification = {
        id: `price_accepted_${data.missionId}_${Date.now()}`,
        type: 'price_accepted',
        title: 'Prix accepté',
        message: `${data.clientName || 'Le client'} a accepté votre proposition.`,
        receivedAt: new Date().toISOString(),
        payload: {
          ...data,
          clientName: data.clientName,
        },
        dedupeKey: `price_accepted_${data.missionId}_${Date.now()}`,
        recordId: data.notificationId,
        isRead: false,
      };

      console.log('📤 Ajout de la notification price_accepted en temps réel:', notification);
      addNotifications([notification]);
    });

    socket.on('new_message', (data) => {
      console.log('💬 new_message notification côté déménageur via WebSocket:', data);
      if (data?.message?.senderType !== 'client') {
        console.log('⏭️ Message ignoré (pas du client)');
        return;
      }

      const message = data.message;
      const notification = {
        id: `chat_message_${message.id}_${Date.now()}`,
        type: 'chat_message',
        title: message.senderName || 'Message du client',
        message: message.content,
        receivedAt: new Date().toISOString(),
        payload: {
          ...data,
          message: message,
        },
        dedupeKey: `chat_message_${message.id}_${Date.now()}`,
        recordId: data.notificationId,
        isRead: false,
      };

      console.log('📤 Ajout de la notification new_message en temps réel:', notification);
      addNotifications([notification]);
    });

    // Écouter l'événement générique 'notification' (envoi direct via WebSocket)
    socket.on('notification', (notificationData) => {
      console.log('🔔🔔🔔 Notification générique reçue en temps réel (déménageur):', notificationData);
      console.log('🔔 Données complètes:', JSON.stringify(notificationData, null, 2));
      
      if (!notificationData || !notificationData.id) {
        console.warn('⚠️ Notification générique invalide:', notificationData);
        return;
      }

      const notification = mapRecordToNotification({
        id: notificationData.id,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data || {},
        metadata: notificationData.metadata || {},
        priority: notificationData.priority || 'medium',
        created_at: notificationData.createdAt || notificationData.receivedAt,
        is_read: false,
        read_at: null,
      });

      if (notification) {
        console.log('✅✅✅ Ajout notification générique en temps réel (déménageur):', notification);
        addNotifications([notification]);
        console.log('✅ Notification ajoutée à l\'état immédiatement (déménageur)');
      }
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
  }, [authToken, demenageurId, addNotifications]);

  useEffect(() => {
    if (authToken && demenageurId) {
      loadPersistedNotifications();
    }
  }, [authToken, demenageurId, loadPersistedNotifications]);

  const removeNotification = useCallback((notification) => {
    if (!notification) {
      return;
    }

    // Marquer comme lue mais NE PAS supprimer de la liste
    if (notification.recordId) {
      markNotificationAsRead(notification.recordId);
    }

    // Mettre à jour la notification pour la marquer comme lue dans l'état local
    setNotifications((prev) => 
      prev.map((item) => 
        item.id === notification.id
          ? { ...item, isRead: true, readAt: item.readAt || new Date().toISOString() }
          : item
      )
    );
  }, [markNotificationAsRead]);

  return {
    notifications,
    isConnected,
    connectionStatus,
    removeNotification,
    clearAllNotifications,
    refreshNotifications: () => loadPersistedNotifications({ force: true }),
    isLoadingNotifications,
    markNotificationAsRead,
  };
};

export default useNotificationSocket;
