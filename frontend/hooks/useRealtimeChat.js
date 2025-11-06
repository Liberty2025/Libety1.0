import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import io from 'socket.io-client';

const useRealtimeChat = (authToken, userId) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [newMessages, setNewMessages] = useState([]);
  const socketRef = useRef(null);

  const API_BASE_URL = Platform.OS === 'android' ? 'http://192.168.1.13:3000' : 'http://192.168.1.13:3000';

  useEffect(() => {
    if (!authToken || !userId) {
      console.log('❌ Pas de token ou userId pour le chat en temps réel');
      return;
    }

    console.log('🔌 Initialisation du WebSocket pour le chat:', { userId, hasToken: !!authToken });

    // Créer la connexion WebSocket
    const newSocket = io(API_BASE_URL, {
      auth: {
        token: authToken
      },
      transports: ['websocket'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Événements de connexion
    newSocket.on('connect', () => {
      console.log('✅ WebSocket chat connecté');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ WebSocket chat déconnecté');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Erreur de connexion WebSocket chat:', error);
      setIsConnected(false);
    });

    // Écouter les nouveaux messages
    newSocket.on('new_message', (data) => {
      console.log('📨 Nouveau message reçu:', data);
      console.log('📨 Détails du message:', {
        chatId: data.chatId,
        content: data.message?.content,
        senderType: data.message?.senderType,
        senderName: data.message?.senderName,
        messageId: data.message?._id
      });
      setNewMessages(prev => {
        const updated = [...prev, data];
        console.log('📨 Messages dans la liste:', updated.length);
        return updated;
      });
    });

    // Écouter les confirmations d'envoi
    newSocket.on('message_sent', (data) => {
      console.log('✅ Message envoyé confirmé:', data);
      setNewMessages(prev => [...prev, data]);
    });

    // Écouter les notifications de chat créé
    newSocket.on('chat_created', (data) => {
      console.log('💬 Nouveau chat créé:', data);
      // Ajouter le nouveau chat à la liste
      setNewMessages(prev => [...prev, { type: 'chat_created', data }]);
    });

    // Nettoyage à la déconnexion
    return () => {
      if (socketRef.current) {
        console.log('🧹 Nettoyage WebSocket chat');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [authToken, userId]);

  // Fonction pour envoyer un message
  const sendMessage = (chatId, content, messageType = 'text') => {
    if (socketRef.current && isConnected) {
      console.log('📤 Envoi de message:', { chatId, content, messageType });
      socketRef.current.emit('send_message', {
        chatId,
        content,
        messageType
      });
    } else {
      console.log('❌ WebSocket non connecté, impossible d\'envoyer le message');
    }
  };

  // Fonction pour marquer les messages comme lus
  const markMessagesAsRead = (chatId) => {
    if (socketRef.current && isConnected) {
      console.log('👁️ Marquage des messages comme lus:', chatId);
      socketRef.current.emit('mark_messages_read', { chatId });
    }
  };

  // Fonction pour rejoindre un chat
  const joinChat = (chatId) => {
    if (socketRef.current && isConnected) {
      console.log('🚪 Rejoindre le chat:', chatId);
      socketRef.current.emit('join_chat', { chatId });
    }
  };

  // Fonction pour quitter un chat
  const leaveChat = (chatId) => {
    if (socketRef.current && isConnected) {
      console.log('🚪 Quitter le chat:', chatId);
      socketRef.current.emit('leave_chat', { chatId });
    }
  };

  // Fonction pour récupérer les nouveaux messages et les effacer
  const getNewMessages = () => {
    const messages = [...newMessages];
    console.log('📨 getNewMessages appelé, retour de:', messages.length, 'messages');
    console.log('📨 Détails des messages:', messages.map(msg => ({
      type: msg.type,
      chatId: msg.chatId,
      content: msg.message?.content,
      senderType: msg.message?.senderType
    })));
    setNewMessages([]);
    return messages;
  };

  return {
    socket: socketRef.current,
    isConnected,
    sendMessage,
    markMessagesAsRead,
    joinChat,
    leaveChat,
    getNewMessages,
    newMessagesCount: newMessages.length
  };
};

export default useRealtimeChat;
