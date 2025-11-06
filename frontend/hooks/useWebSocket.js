import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { getAPIBaseURL } from '../config/api';

const useWebSocket = (userData) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const socketRef = useRef(null);

  useEffect(() => {
    if (!userData || !userData.token) return;

    // Socket.IO utilise l'URL HTTP directement, pas ws://
    const API_BASE_URL = getAPIBaseURL();
    
    // Créer la connexion WebSocket avec authentification automatique
    const newSocket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      auth: {
        token: userData.token
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Événements de connexion
    newSocket.on('connect', () => {
      console.log('🔌 WebSocket connecté');
      setIsConnected(true);
      console.log('🔑 Token envoyé:', userData.token ? 'PRÉSENT' : 'ABSENT');
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 WebSocket déconnecté');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Erreur de connexion WebSocket:', error);
      console.error('❌ Détails de l\'erreur:', {
        message: error.message,
        type: error.type,
        description: error.description,
        context: error.context,
        url: API_BASE_URL
      });
      setIsConnected(false);
    });

    // Nettoyage à la déconnexion
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [userData]);

  const emitEvent = (event, data) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    }
  };

  const onEvent = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, (data) => {
        setLastUpdate(new Date());
        callback(data);
      });
    }
  };

  const offEvent = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  };

  const joinMission = (missionId) => {
    emitEvent('join_mission', missionId);
  };

  const leaveMission = (missionId) => {
    emitEvent('leave_mission', missionId);
  };

  return {
    socket: socketRef.current,
    isConnected,
    lastUpdate,
    emitEvent,
    onEvent,
    offEvent,
    joinMission,
    leaveMission
  };
};

export default useWebSocket;
