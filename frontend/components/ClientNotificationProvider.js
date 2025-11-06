import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import useWebSocket from '../hooks/useWebSocket';
import ClientPriceNotification from './ClientPriceNotification';

const ClientNotificationProvider = ({ children, userData }) => {
  const [priceNotification, setPriceNotification] = useState(null);
  const navigation = useNavigation();
  
  // WebSocket hook
  const { isConnected, socket, onEvent, offEvent } = useWebSocket(userData);

  // Écouter les événements WebSocket pour les propositions de prix
  useEffect(() => {
    if (!isConnected || !userData) {
      console.log('🔍 ClientNotificationProvider - WebSocket non connecté:', { 
        isConnected, 
        hasUserData: !!userData,
        hasSocket: !!socket 
      });
      return;
    }

    if (!socket) {
      console.log('⚠️ Socket non disponible encore, attente...');
      return;
    }

    console.log('✅ ClientNotificationProvider - Configuration de l\'écoute price_proposed');
    console.log('🔌 Socket ID:', socket.id);
    console.log('👤 User ID:', userData?.userId || userData?.id);

    // Écouter les propositions de prix du déménageur
    const handlePriceProposed = (data) => {
      console.log('💰💰💰 Prix proposé reçu (global):', data);
      console.log('💰 Données complètes:', JSON.stringify(data, null, 2));
      
      // Afficher la notification de proposition de prix
      setPriceNotification({
        missionId: data.missionId,
        proposedPrice: data.proposedPrice,
        demenageurName: data.demenageurName || 'Déménageur',
      });
      
      console.log('✅ Notification définie:', {
        missionId: data.missionId,
        proposedPrice: data.proposedPrice,
        demenageurName: data.demenageurName
      });
    };

    // Enregistrer l'événement
    console.log('📡 Enregistrement de l\'événement price_proposed');
    onEvent('price_proposed', handlePriceProposed);

    return () => {
      console.log('🧹 Nettoyage de l\'écoute price_proposed');
      offEvent('price_proposed', handlePriceProposed);
    };
  }, [isConnected, socket, userData, onEvent, offEvent]);

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

  // Debug: afficher l'état de la notification
  useEffect(() => {
    if (priceNotification) {
      console.log('📱 Notification actuelle:', priceNotification);
    }
  }, [priceNotification]);

  return (
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
    </View>
  );
};

export default ClientNotificationProvider;

