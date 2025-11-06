import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { getAPIBaseURL } from '../config/api';

const usePersistentNotification = (userData) => {
  const [notification, setNotification] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const intervalRef = useRef(null);

  const API_BASE_URL = getAPIBaseURL();

  // Vérifier les nouvelles demandes de service
  const checkForNewRequests = async () => {
    if (!userData?.token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/service-requests/pending-for-demenageur`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userData.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.requests && result.requests.length > 0) {
          // Prendre la première demande non vue
          const newRequest = result.requests.find(req => !req.viewedByDemenageur);
          
          // Utiliser id (PostgreSQL) au lieu de _id (MongoDB)
          const requestId = newRequest.id || newRequest._id;
          
          if (newRequest && (!notification || (notification.id || notification._id) !== requestId)) {
            console.log('🔔 Nouvelle demande de service détectée:', newRequest);
            
            const notificationData = {
              id: requestId,
              _id: requestId, // Pour compatibilité
              serviceType: newRequest.serviceType,
              clientName: `${newRequest.clientId?.firstName || newRequest.clientId?.first_name || 'Client'} ${newRequest.clientId?.lastName || newRequest.clientId?.last_name || ''}`,
              departureAddress: newRequest.departureAddress,
              destinationAddress: newRequest.destinationAddress,
              estimatedPrice: newRequest.estimatedPrice || 'Non spécifié',
              createdAt: newRequest.createdAt,
              clientId: newRequest.clientId,
              serviceRequestId: requestId,
              // Ajouter toutes les données complètes
              serviceDetails: newRequest.serviceDetails,
              scheduledDate: newRequest.scheduledDate,
              notes: newRequest.notes,
              actualPrice: newRequest.actualPrice,
              proposedPrice: newRequest.proposedPrice,
              priceNegotiation: newRequest.priceNegotiation,
              status: newRequest.status,
              demenageurId: newRequest.demenageurId
            };

            setNotification(notificationData);
            setIsVisible(true);
            
            // Marquer comme vue par le déménageur
            if (requestId) {
              markRequestAsViewed(requestId);
            } else {
              console.error('❌ ID de demande manquant:', newRequest);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors de la vérification des demandes:', error);
    }
  };

  // Marquer une demande comme vue
  const markRequestAsViewed = async (requestId) => {
    try {
      await fetch(`${API_BASE_URL}/api/service-requests/${requestId}/mark-viewed`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userData.token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('❌ Erreur lors du marquage de la demande:', error);
    }
  };

  // Démarrer la vérification périodique
  const startPolling = () => {
    if (intervalRef.current) return;
    
    // Vérification immédiate
    checkForNewRequests();
    
    // Vérification toutes les 10 secondes
    intervalRef.current = setInterval(checkForNewRequests, 10000);
  };

  // Arrêter la vérification
  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Gérer la vue de la demande
  const handleViewRequest = (notificationData) => {
    console.log('👁️ Visualisation de la demande:', notificationData);
    setIsVisible(false);
    setNotification(null);
    
    // Retourner les données pour navigation
    return {
      type: 'service_request',
      data: notificationData
    };
  };

  // Gérer la fermeture de la notification
  const handleDismiss = () => {
    console.log('❌ Notification fermée');
    setIsVisible(false);
    setNotification(null);
  };

  // Effet pour démarrer/arrêter le polling
  useEffect(() => {
    if (userData?.token) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [userData?.token]);

  // Nettoyage à la fermeture
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  return {
    notification,
    isVisible,
    handleViewRequest,
    handleDismiss,
    startPolling,
    stopPolling
  };
};

export default usePersistentNotification;
