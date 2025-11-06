import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

const useNotificationPolling = (authToken, demenageurId) => {
  const [notifications, setNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const intervalRef = useRef(null);
  const lastCheckRef = useRef(null);

  useEffect(() => {
    if (!authToken || !demenageurId) {
      console.log('❌ Pas de token ou userId pour polling notifications:', { authToken: !!authToken, demenageurId });
      return;
    }

    console.log('🔄 Démarrage du polling pour notifications déménageur:', demenageurId);
    setConnectionStatus('connecting');
    setIsConnected(true);
    setConnectionStatus('connected');

    // Fonction pour vérifier les nouvelles demandes
    const checkForNewRequests = async () => {
      try {
        const API_BASE_URL = Platform.OS === 'android' ? 'http://192.168.1.13:3000' : 'http://localhost:3000';
        
        const response = await fetch(`${API_BASE_URL}/api/service-requests/demenageur`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const pendingRequests = data.serviceRequests.filter(req => req.status === 'pending');
          
          // Vérifier s'il y a de nouvelles demandes
          const newRequests = pendingRequests.filter(req => {
            if (!lastCheckRef.current) {
              lastCheckRef.current = new Date();
              return false; // Ne pas traiter les demandes existantes au premier check
            }
            return new Date(req.createdAt) > lastCheckRef.current;
          });

          if (newRequests.length > 0) {
            console.log('🔔 Nouvelles demandes trouvées:', newRequests.length);
            
            // Ajouter les nouvelles notifications
            newRequests.forEach(request => {
              const notification = {
                id: request._id,
                clientName: request.clientId?.first_name || 'Client',
                serviceType: request.serviceType,
                departureAddress: request.departureAddress,
                destinationAddress: request.destinationAddress,
                createdAt: request.createdAt,
                serviceDetails: request.serviceDetails,
                estimatedPrice: request.estimatedPrice,
                scheduledDate: request.scheduledDate,
                clientId: request.clientId,
                demenageurId: request.demenageurId
              };
              
              setNotifications(prev => [notification, ...prev]);
            });
          }
          
          lastCheckRef.current = new Date();
        } else {
          console.log('❌ Erreur lors de la vérification des demandes:', response.status);
          setConnectionStatus('error');
        }
      } catch (error) {
        console.log('❌ Erreur lors du polling:', error);
        setConnectionStatus('error');
      }
    };

    // Vérifier immédiatement
    checkForNewRequests();

    // Vérifier toutes les 5 secondes
    intervalRef.current = setInterval(checkForNewRequests, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setIsConnected(false);
      setConnectionStatus('disconnected');
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

export default useNotificationPolling;
