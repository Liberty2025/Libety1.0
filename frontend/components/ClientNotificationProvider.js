import React, { createContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import useWebSocket from '../hooks/useWebSocket';
import ClientPriceNotification from './ClientPriceNotification';
import ClientNegotiationNotification from './ClientNegotiationNotification';
import ClientChatMessageNotification from './ClientChatMessageNotification';
import ClientMissionStatusNotification from './ClientMissionStatusNotification';
import { getAPIBaseURL } from '../config/api';

export const ClientNotificationContext = createContext({
  notifications: [],
  addNotification: () => {},
  removeNotification: () => {},
  clearNotifications: () => {},
  markPriceProposalHandled: () => {},
  refreshNotifications: () => {},
  markNotificationAsRead: () => {},
  markAllNotificationsAsRead: () => {},
});

const ClientNotificationProvider = ({ children, userData }) => {
  const [priceNotification, setPriceNotification] = useState(null);
  const [negotiationNotification, setNegotiationNotification] = useState(null);
  const [chatNotification, setChatNotification] = useState(null);
  const [statusNotification, setStatusNotification] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [pendingPriceOffers, setPendingPriceOffers] = useState({});
  const [isLoadingPersistedNotifications, setIsLoadingPersistedNotifications] = useState(false);
  const navigation = useNavigation();
  const reminderIntervalRef = useRef(null);
  const pendingOffersRef = useRef(pendingPriceOffers);
  const handledChatMessageIdsRef = useRef(new Set());
  const joinedChatIdsRef = useRef(new Set());
  const persistedNotificationsLoadedRef = useRef(false);

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
    const metadata = parseJsonField(record.metadata, {});
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
      metadata,
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

  const mergeNotifications = useCallback((incoming = []) => {
    setNotifications((prev) => {
      const map = new Map();

      const addToMap = (notification) => {
        if (!notification) return;
        const key = notification.dedupeKey || (notification.recordId ? `${notification.type || 'notification'}_${notification.recordId}` : notification.id);
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
    });
  }, [sortNotifications]);
  
  // WebSocket hook
  const { isConnected, socket, onEvent, offEvent, emitEvent } = useWebSocket(userData);

  useEffect(() => {
    pendingOffersRef.current = pendingPriceOffers;
  }, [pendingPriceOffers]);

  const loadPersistedNotifications = useCallback(async ({ force = false } = {}) => {
    if (!userData?.token) {
      return;
    }

    if (!force && persistedNotificationsLoadedRef.current) {
      return;
    }

    setIsLoadingPersistedNotifications(true);

    try {
      const API_BASE_URL = getAPIBaseURL();
      const response = await fetch(`${API_BASE_URL}/api/notifications?limit=100`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${userData.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.log('❌ Échec du chargement des notifications persistées:', response.status);
        return;
      }

      const result = await response.json();
      if (result?.success && Array.isArray(result.notifications)) {
        const formatted = result.notifications.map(mapRecordToNotification).filter(Boolean);
        mergeNotifications(formatted);
        persistedNotificationsLoadedRef.current = true;
      }
    } catch (error) {
      console.log('❌ Erreur lors du chargement des notifications persistées:', error);
    } finally {
      setIsLoadingPersistedNotifications(false);
    }
  }, [userData, mapRecordToNotification, mergeNotifications]);

  useEffect(() => {
    if (isConnected && userData?.token) {
      fetchAndJoinChatRooms();
    }
  }, [isConnected, userData, fetchAndJoinChatRooms]);

  useEffect(() => {
    if (userData?.token) {
      loadPersistedNotifications();
    }
  }, [userData, loadPersistedNotifications]);

  const addNotification = useCallback((notification) => {
    setNotifications((prev) => {
      if (!notification?.id) {
        return prev;
      }

      const recordId = notification.recordId
        || notification.payload?.notificationId
        || notification.notificationId
        || null;

      const normalizedNotification = {
        ...notification,
        recordId,
      };

      if (!normalizedNotification.dedupeKey && recordId) {
        normalizedNotification.dedupeKey = `${normalizedNotification.type || 'notification'}_${recordId}`;
      }

      if (!normalizedNotification.receivedAt && normalizedNotification.createdAt) {
        normalizedNotification.receivedAt = normalizedNotification.createdAt;
      }

      const dedupeKey = normalizedNotification.dedupeKey;

      if (dedupeKey) {
        let updated = false;
        const updatedNotifications = prev.map((item) => {
          if (item.dedupeKey === dedupeKey) {
            updated = true;
            return {
              ...item,
              ...normalizedNotification,
              id: normalizedNotification.id,
              receivedAt: normalizedNotification.receivedAt || item.receivedAt,
            };
          }
          return item;
        });

        if (updated) {
          return updatedNotifications.sort((a, b) => {
            const timeA = new Date(a.receivedAt || a.createdAt || Date.now()).getTime();
            const timeB = new Date(b.receivedAt || b.createdAt || Date.now()).getTime();
            return timeB - timeA;
          });
        }
      } else {
        const exists = prev.some((item) => item.id === notification.id);
        if (exists) {
          return prev;
        }
      }

      const nextNotifications = [normalizedNotification, ...prev];
      return nextNotifications.sort((a, b) => {
        const timeA = new Date(a.receivedAt || a.createdAt || Date.now()).getTime();
        const timeB = new Date(b.receivedAt || b.createdAt || Date.now()).getTime();
        return timeB - timeA;
      });
    });
  }, []);

  const removeNotification = useCallback((notificationId) => {
    if (!notificationId) {
      return;
    }

    setNotifications((prev) => prev.filter((notification) => notification.id !== notificationId));
  }, []);

  const markNotificationAsRead = useCallback(async (recordId) => {
    if (!recordId) {
      return;
    }

    if (userData?.token) {
      try {
        const API_BASE_URL = getAPIBaseURL();
        const response = await fetch(`${API_BASE_URL}/api/notifications/${recordId}/read`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${userData.token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.log('❌ Échec du marquage d\'une notification comme lue:', response.status);
        }
      } catch (error) {
        console.log('❌ Erreur lors du marquage d\'une notification comme lue:', error);
      }
    }

    setNotifications((prev) =>
      prev.map((notification) =>
        notification.recordId === recordId
          ? { ...notification, isRead: true, readAt: notification.readAt || new Date().toISOString() }
          : notification
      )
    );
  }, [userData]);

  const markAllNotificationsAsRead = useCallback(async () => {
    if (userData?.token) {
      try {
        const API_BASE_URL = getAPIBaseURL();
        const response = await fetch(`${API_BASE_URL}/api/notifications/mark-all/read`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${userData.token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.log('❌ Échec du marquage de toutes les notifications comme lues:', response.status);
        }
      } catch (error) {
        console.log('❌ Erreur lors du marquage de toutes les notifications comme lues:', error);
      }
    }

    setNotifications((prev) =>
      prev.map((notification) =>
        notification.isRead
          ? notification
          : { ...notification, isRead: true, readAt: notification.readAt || new Date().toISOString() }
      )
    );
  }, [userData]);

  const clearNotifications = useCallback(() => {
    markAllNotificationsAsRead();
    setNotifications([]);
  }, [markAllNotificationsAsRead]);

  const refreshNotifications = useCallback(() => {
    loadPersistedNotifications({ force: true });
  }, [loadPersistedNotifications]);

  const markPriceProposalHandled = useCallback((missionId) => {
    if (!missionId) {
      return;
    }

    setPendingPriceOffers((prev) => {
      if (!prev[missionId]) {
        return prev;
      }

      const updated = { ...prev };
      delete updated[missionId];
      return updated;
    });

    setPriceNotification((prev) => {
      if (prev?.missionId === missionId) {
        return null;
      }
      return prev;
    });
  }, []);

  const joinChatRoom = useCallback((chatId) => {
    if (!chatId || joinedChatIdsRef.current.has(chatId)) {
      return;
    }

    console.log('🔔 ClientNotificationProvider - jointure chat pour notifications:', chatId);
    emitEvent('join_chat', { chatId });
    joinedChatIdsRef.current.add(chatId);
  }, [emitEvent]);

  const fetchAndJoinChatRooms = useCallback(async () => {
    if (!userData?.token || !isConnected) {
      return;
    }

    try {
      const API_BASE_URL = getAPIBaseURL();
      const response = await fetch(`${API_BASE_URL}/api/chat/my-chats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userData.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.log('❌ Impossible de récupérer les chats pour notifications:', response.status);
        return;
      }

      const result = await response.json();
      if (!result.success || !Array.isArray(result.chats)) {
        console.log('❌ Réponse inattendue lors du chargement des chats pour notifications');
        return;
      }

      result.chats.forEach((chat) => {
        const chatId = chat?.id || chat?._id;
        if (chatId) {
          joinChatRoom(chatId);
        }
      });
    } catch (error) {
      console.log('❌ Erreur lors du chargement des chats pour notifications:', error?.message || error);
    }
  }, [userData, isConnected, joinChatRoom]);
  
    // Écouter les événements WebSocket pour les notifications client
  useEffect(() => {
    if (!isConnected || !userData || !socket) {
      console.log('🔍 ClientNotificationProvider - WebSocket non connecté:', { 
        isConnected, 
        hasUserData: !!userData,
        hasSocket: !!socket 
      });
      return;
    }

    console.log('✅ ClientNotificationProvider - Configuration des écouteurs notifications');
    console.log('🔌 Socket ID:', socket.id);
    console.log('👤 User ID:', userData?.userId || userData?.id);

    const buildNotification = (type, data, overrides = {}) => {
      const timestamp = new Date().toISOString();
      const baseId = data?.notificationId || data?.missionId || data?._id || data?.id || timestamp;

      return {
        id: `${type}_${baseId}_${Date.now()}`,
        type,
        title: overrides.title,
        message: overrides.message,
        receivedAt: timestamp,
        payload: data,
        dedupeKey: `${type}_${baseId}`,
        ...overrides,
      };
    };

    // Écouter les propositions de prix du déménageur
    const handlePriceProposed = (data) => {
      console.log('💰💰💰 Prix proposé reçu (global):', data);
      console.log('💰 Données complètes:', JSON.stringify(data, null, 2));
      
      const offerPayload = {
        missionId: data.missionId,
        proposedPrice: data.proposedPrice,
        demenageurName: data.demenageurName || 'Déménageur',
        receivedAt: new Date().toISOString(),
      };

      // Sauvegarder l'offre en attente pour rappels périodiques
      setPendingPriceOffers((prev) => ({
        ...prev,
        [data.missionId]: offerPayload,
      }));

      // Afficher la notification de proposition de prix immédiatement
      setPriceNotification({
        ...offerPayload,
        reminderId: Date.now(),
      });
      
      console.log('✅ Notification de prix définie:', {
        missionId: data.missionId,
        proposedPrice: data.proposedPrice,
        demenageurName: data.demenageurName
      });

      addNotification(
        buildNotification('price_proposed', data, {
          title: 'Nouvelle proposition de prix',
          message: `${data.demenageurName || 'Un déménageur'} propose ${data.proposedPrice} TND.`,
        })
      );
    };

    const handleNegotiationAccepted = (data) => {
      console.log('🤝 Négociation acceptée reçue (global):', data);

      markPriceProposalHandled(data?.missionId);

      const notificationPayload = {
        missionId: data?.missionId,
        acceptedPrice: data?.acceptedPrice,
        demenageurName: data?.demenageurName || 'Déménageur',
        receivedAt: new Date().toISOString(),
      };

      setNegotiationNotification({
        ...notificationPayload,
        reminderId: Date.now(),
      });

      addNotification(
        buildNotification('negotiation_accepted', data, {
          title: 'Négociation acceptée',
          message: data?.acceptedPrice
            ? `Le déménageur a accepté votre proposition de ${data.acceptedPrice} TND.`
            : 'Votre proposition a été acceptée par le déménageur.',
        })
      );
    };

    const handleStatusUpdated = (data) => {
      console.log('📋 Statut de mission mis à jour (global):', data);

      const newStatus = data?.newStatus || data?.status;
      const statusMessage = (() => {
        switch (newStatus) {
          case 'in_progress':
            return 'Camion en route vers vous. La mission est en cours.';
          case 'completed':
            return 'Votre mission est terminée. Merci d’avoir utilisé nos services.';
          case 'accepted':
            return 'La mission a été acceptée et va démarrer sous peu.';
          default:
            return `La mission est maintenant ${newStatus || 'mise à jour'}.`;
        }
      })();

      if (newStatus === 'in_progress') {
        setStatusNotification({
          missionId: data?.missionId,
          newStatus,
          receivedAt: new Date().toISOString(),
          reminderId: Date.now(),
          message: statusMessage,
        });
      }

      addNotification(
        buildNotification('status_updated', data, {
          title: 'Statut de mission',
          message: statusMessage,
        })
      );
    };

    const handleChatCreated = (data) => {
      console.log('💬 Chat créé reçu (notification):', data);
      const chatId = data?.chatId || data?.chat?.id || data?.chat?._id || data?.id;
      if (chatId) {
        joinChatRoom(chatId);
      }
    };

    const handleNewMessage = (data) => {
      if (!data?.message) {
        return;
      }

      const messageId = data.message.id || data.message._id;
      if (!messageId) {
        return;
      }

      if (handledChatMessageIdsRef.current.has(messageId)) {
        return;
      }

      handledChatMessageIdsRef.current.add(messageId);

      if (data.message.senderType !== 'demenageur') {
        return;
      }

      const timestamp = new Date().toISOString();
      const senderName = data.message.senderName || 'Déménageur';

      setChatNotification({
        chatId: data.chatId,
        messageId,
        messageContent: data.message.content,
        senderName,
        receivedAt: timestamp,
        reminderId: Date.now(),
      });

      const notificationData = {
        ...data,
        notificationId: messageId,
      };

      addNotification(
        buildNotification('chat_message', notificationData, {
          title: `Message de ${senderName}`,
          message: data.message.content,
          dedupeKey: `chat_message_${messageId}`,
        })
      );
    };

    // Gestionnaire pour l'événement générique 'notification' (envoi direct via WebSocket)
    const handleGenericNotification = (notificationData) => {
      console.log('🔔🔔🔔 Notification générique reçue en temps réel:', notificationData);
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
        console.log('✅✅✅ Ajout notification générique en temps réel:', notification);
        addNotification(notification);
        console.log('✅ Notification ajoutée à l\'état immédiatement');
        
        // Déclencher aussi les handlers spécifiques si nécessaire (mais pas de double ajout)
        switch (notificationData.type) {
          case 'price_proposed':
            // Ne pas appeler handlePriceProposed ici pour éviter la duplication
            // handlePriceProposed(notificationData.data || {});
            break;
          case 'negotiation_accepted':
            // Ne pas appeler handleNegotiationAccepted ici pour éviter la duplication
            // handleNegotiationAccepted(notificationData.data || {});
            break;
          case 'status_updated':
            // Ne pas appeler handleStatusUpdated ici pour éviter la duplication
            // handleStatusUpdated(notificationData.data || {});
            break;
          case 'chat_message':
            // Ne pas appeler handleNewMessage ici pour éviter la duplication
            // if (notificationData.data?.message) {
            //   handleNewMessage({ message: notificationData.data.message, chatId: notificationData.data.chatId });
            // }
            break;
        }
      }
    };

    // Enregistrer les événements
    console.log('📡 Enregistrement des événements notifications client');
    onEvent('notification', handleGenericNotification); // Écouter l'événement générique en premier
    onEvent('price_proposed', handlePriceProposed);
    onEvent('negotiation_accepted', handleNegotiationAccepted);
    onEvent('status_updated', handleStatusUpdated);
    onEvent('new_message', handleNewMessage);
    onEvent('chat_created', handleChatCreated);

    return () => {
      console.log('🧹 Nettoyage des écouteurs notifications client');
      offEvent('notification', handleGenericNotification);
      offEvent('price_proposed', handlePriceProposed);
      offEvent('negotiation_accepted', handleNegotiationAccepted);
      offEvent('status_updated', handleStatusUpdated);
      offEvent('new_message', handleNewMessage);
      offEvent('chat_created', handleChatCreated);
    };
  }, [isConnected, socket, userData, onEvent, offEvent, addNotification, markPriceProposalHandled, joinChatRoom, mapRecordToNotification]);

  const handleViewPriceNotification = (notification) => {
    console.log('👁️ Voir les détails de la proposition de prix (global):', notification);
    
    // Fermer la notification
    setPriceNotification(null);
    
    // Naviguer vers l'écran Suivre
    try {
      if (navigation && navigation.navigate) {
        navigation.navigate('Suivre');
      }
    } catch (error) {
      console.log('Erreur de navigation:', error);
    }
  };

  const handleDismissPriceNotification = () => {
    setPriceNotification(null);
  };

  const handleViewNegotiationNotification = (notification) => {
    console.log('👁️ Voir les détails de la négociation acceptée:', notification);

    setNegotiationNotification(null);

    try {
      if (navigation && navigation.navigate) {
        navigation.navigate('Suivre');
      }
    } catch (error) {
      console.log('Erreur de navigation (négociation acceptée):', error);
    }
  };

  const handleDismissNegotiationNotification = () => {
    setNegotiationNotification(null);
  };

  const handleViewChatNotification = (notification) => {
    console.log('👁️ Voir les détails du message (global):', notification);
    setChatNotification(null);

    try {
      if (navigation && navigation.navigate) {
        navigation.navigate('Chat');
      }
    } catch (error) {
      console.log('Erreur de navigation (chat):', error);
    }
  };

  const handleDismissChatNotification = () => {
    setChatNotification(null);
  };

  const handleViewStatusNotification = (notification) => {
    console.log('👁️ Voir les détails du statut (global):', notification);
    setStatusNotification(null);

    try {
      if (navigation && navigation.navigate) {
        navigation.navigate('Suivre');
      }
    } catch (error) {
      console.log('Erreur de navigation (statut):', error);
    }
  };

  const handleDismissStatusNotification = () => {
    setStatusNotification(null);
  };

  // Relancer la notification tant que le client n'a pas répondu
  useEffect(() => {
    const hasPendingOffers = Object.keys(pendingOffersRef.current || {}).length > 0;

    if (!hasPendingOffers) {
      if (reminderIntervalRef.current) {
        clearInterval(reminderIntervalRef.current);
        reminderIntervalRef.current = null;
      }
      return undefined;
    }

    if (reminderIntervalRef.current) {
      return undefined;
    }

    reminderIntervalRef.current = setInterval(() => {
      const offers = Object.values(pendingOffersRef.current || {});

      if (offers.length === 0) {
        setPriceNotification(null);
        return;
      }

      const offerToRemind = offers[0];

      setPriceNotification({
        missionId: offerToRemind.missionId,
        proposedPrice: offerToRemind.proposedPrice,
        demenageurName: offerToRemind.demenageurName,
        reminderId: Date.now(),
      });
    }, 5000);

    return () => {
      if (reminderIntervalRef.current) {
        clearInterval(reminderIntervalRef.current);
        reminderIntervalRef.current = null;
      }
    };
  }, [pendingPriceOffers]);

  // Debug: afficher l'état de la notification
  useEffect(() => {
    if (priceNotification) {
      console.log('📱 Notification actuelle:', priceNotification);
    }
  }, [priceNotification]);

  const contextValue = useMemo(() => ({
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    markPriceProposalHandled,
    refreshNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    isLoadingNotifications: isLoadingPersistedNotifications,
  }), [
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    markPriceProposalHandled,
    refreshNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    isLoadingPersistedNotifications,
  ]);

  return (
    <ClientNotificationContext.Provider value={contextValue}>
      <View style={{ flex: 1 }}>
        {children}
        
        {/* Notification de proposition de prix globale */}
        {priceNotification && (
          <ClientPriceNotification
            notification={priceNotification}
            onClose={handleDismissPriceNotification}
            onViewDetails={handleViewPriceNotification}
          />
        )}

        {negotiationNotification && (
          <ClientNegotiationNotification
            notification={negotiationNotification}
            onClose={handleDismissNegotiationNotification}
            onViewDetails={handleViewNegotiationNotification}
          />
        )}

        {chatNotification && (
          <ClientChatMessageNotification
            notification={chatNotification}
            onClose={handleDismissChatNotification}
            onViewDetails={handleViewChatNotification}
          />
        )}

        {statusNotification && (
          <ClientMissionStatusNotification
            notification={statusNotification}
            onClose={handleDismissStatusNotification}
            onViewDetails={handleViewStatusNotification}
          />
        )}
      </View>
    </ClientNotificationContext.Provider>
  );
};

export default ClientNotificationProvider;

