import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  Alert,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

const { width } = Dimensions.get('window');

const PersistentNotification = ({ 
  notification, 
  onViewRequest, 
  onDismiss,
  visible = false
}) => {
  const soundRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef(null);

  // Animation d'entrée et pulsation
  useEffect(() => {
    if (visible && notification) {
      // Vibration immédiate pour alerte rapide
      Vibration.vibrate([100, 50, 100, 50, 100], false);

      // Animation d'entrée
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();

      // Animation de pulsation continue
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      // Animation de secousse
      const shakeAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(shakeAnim, {
            toValue: 10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -10,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ])
      );
      shakeAnimation.start();

      // Jouer la sonnerie d'alarme immédiatement
      playAlarmSound();

      return () => {
        pulseAnimation.stop();
        shakeAnimation.stop();
        stopAlarmSound();
        Vibration.cancel();
      };
    } else {
      // Animation de sortie
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // Arrêter la sonnerie si la notification disparaît
      stopAlarmSound();
      Vibration.cancel();
    }
  }, [visible, notification]);

  // Nettoyage au démontage du composant
  useEffect(() => {
    return () => {
      stopAlarmSound();
      Vibration.cancel();
    };
  }, []);

  const stopAlarmSound = async () => {
    try {
      // Arrêter le timeout si présent
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Arrêter et décharger le son immédiatement
      if (soundRef.current) {
        try {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded) {
            await soundRef.current.stopAsync();
            await soundRef.current.unloadAsync();
          }
        } catch (error) {
          console.log('Erreur lors de l\'arrêt du son:', error);
        }
        soundRef.current = null;
      }
    } catch (error) {
      console.log('❌ Erreur lors de l\'arrêt de la sonnerie:', error);
      soundRef.current = null;
    }
  };

  const playAlarmSound = async () => {
    try {
      // Arrêter tout son précédent
      await stopAlarmSound();

      // Créer et jouer le son immédiatement
      const { sound: alarmSound } = await Audio.Sound.createAsync(
        { uri: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav' },
        { 
          shouldPlay: true,
          isLooping: true,
          volume: 0.8,
          isMuted: false,
        }
      );
      
      soundRef.current = alarmSound;
      
      // Le son continuera jusqu'à ce qu'on l'arrête explicitement
    } catch (error) {
      console.log('Erreur lors du chargement de la sonnerie:', error);
      // Pas de fallback - on continue sans son mais avec vibration
    }
  };

  const handleViewRequest = async () => {
    if (__DEV__) {
      console.log('🔔 Bouton "Voir la demande" cliqué');
      console.log('🔍 Notification:', notification);
    }
    
    // Arrêter la sonnerie ET la vibration IMMÉDIATEMENT avant toute autre action
    await stopAlarmSound();
    Vibration.cancel();
    
    if (__DEV__) {
      console.log('🔇 Sonnerie et vibration arrêtées');
    }
    
    // Appeler la fonction de callback pour gérer la navigation
    if (onViewRequest) {
      if (__DEV__) {
        console.log('📞 Appel de onViewRequest avec notification');
      }
      onViewRequest(notification);
    } else {
      if (__DEV__) {
        console.log('❌ onViewRequest non disponible');
      }
    }
  };

  const handleDismiss = async () => {
    // Arrêter la sonnerie ET la vibration IMMÉDIATEMENT
    await stopAlarmSound();
    Vibration.cancel();
    
    if (__DEV__) {
      console.log('🔇 Sonnerie et vibration arrêtées (dismiss)');
    }
    onDismiss();
  };

  if (!visible || !notification) {
    return null;
  }

  const getServiceIcon = (serviceType) => {
    return serviceType === 'demenagement' ? 'home' : 'car';
  };

  const getServiceColor = (serviceType) => {
    return serviceType === 'demenagement' ? '#ff6b35' : '#ff8c42';
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          transform: [
            { translateY: slideAnim },
            { scale: pulseAnim },
            { translateX: shakeAnim }
          ]
        }
      ]}
    >
      <View style={styles.notificationCard}>
        {/* Icône de service avec animation */}
        <Animated.View 
          style={[
            styles.serviceIconContainer,
            { backgroundColor: getServiceColor(notification.serviceType) + '20' }
          ]}
        >
          <Ionicons 
            name={getServiceIcon(notification.serviceType)} 
            size={24} 
            color={getServiceColor(notification.serviceType)} 
          />
        </Animated.View>

        {/* Contenu de la notification */}
        <View style={styles.content}>
          <Text style={styles.title}>
            🚨 Nouvelle demande de {notification.serviceType === 'demenagement' ? 'déménagement' : 'transport'}
          </Text>
          
          <Text style={styles.clientName}>
            Client: {notification.clientName}
          </Text>
          
          <Text style={styles.address} numberOfLines={2}>
            📍 {notification.departureAddress} → {notification.destinationAddress}
          </Text>
          
          <Text style={styles.price}>
            💰 Prix proposé: {notification.estimatedPrice} DT
          </Text>
        </View>

        {/* Boutons d'action */}
        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.viewButton]}
            onPress={handleViewRequest}
            activeOpacity={0.8}
          >
            <Ionicons name="eye" size={16} color="#ffffff" />
            <Text style={styles.viewButtonText}>Voir la demande</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.dismissButton]}
            onPress={handleDismiss}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={16} color="#ff6b35" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Barre de progression pour montrer l'urgence */}
      <View style={styles.progressBar}>
        <Animated.View 
          style={[
            styles.progressFill,
            { backgroundColor: getServiceColor(notification.serviceType) }
          ]} 
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 10,
  },
  notificationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b35',
  },
  serviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff6b35',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  address: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 4,
    lineHeight: 18,
  },
  price: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#28a745',
  },
  actions: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    minWidth: 80,
  },
  viewButton: {
    backgroundColor: '#ff6b35',
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  viewButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  dismissButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ff6b35',
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#e0e0e0',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  progressFill: {
    height: '100%',
    width: '100%',
    borderRadius: 2,
  },
});

export default PersistentNotification;
