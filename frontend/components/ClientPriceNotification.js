import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

const ClientPriceNotification = ({ notification, onClose, onViewDetails }) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));
  const soundRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Vibration immédiate pour alerte rapide
    Vibration.vibrate([100, 50, 100, 50, 100], false);

    // Animation d'entrée
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Jouer la sonnerie d'alarme immédiatement
    playAlarmSound();

    return () => {
      // Nettoyer le son quand le composant se démonte
      stopSound();
    };
  }, []);

  const stopSound = async () => {
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
      console.log('Erreur lors du nettoyage du son:', error);
    }
  };

  const playAlarmSound = async () => {
    try {
      // Arrêter tout son précédent
      await stopSound();

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
      
      // Arrêter après 8 secondes maximum
      timeoutRef.current = setTimeout(async () => {
        await stopSound();
      }, 8000);
    } catch (error) {
      console.log('Erreur lors de la lecture du son:', error);
      // Pas de fallback - on continue sans son mais avec vibration
    }
  };

  const handleClose = async () => {
    // Arrêter le son IMMÉDIATEMENT et de manière synchrone
    await stopSound();
    
    // Arrêter la vibration
    Vibration.cancel();

    // Animation de sortie
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleViewDetails = async () => {
    console.log('🔍 ClientPriceNotification - handleViewDetails appelé');
    console.log('🔍 Notification:', notification);
    
    // Arrêter le son IMMÉDIATEMENT avant toute autre action
    await stopSound();
    
    // Arrêter la vibration
    Vibration.cancel();
    
    if (onViewDetails && typeof onViewDetails === 'function') {
      console.log('✅ Appel de onViewDetails avec notification');
      onViewDetails(notification);
    } else {
      console.log('❌ onViewDetails n\'est pas une fonction ou n\'existe pas');
    }
    
    // Fermer la notification
    handleClose();
  };

  if (!notification) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.notificationCard}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="cash" size={24} color="#28a745" />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Nouvelle Proposition de Prix</Text>
            <Text style={styles.subtitle}>
              {notification.demenageurName || 'Déménageur'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Prix proposé</Text>
            <Text style={styles.priceValue}>
              {notification.proposedPrice} TND
            </Text>
          </View>
          
          <Text style={styles.message}>
            Le déménageur a proposé un prix pour votre demande de service.
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.viewButton} onPress={handleViewDetails}>
            <Ionicons name="eye" size={16} color="#ffffff" />
            <Text style={styles.viewButtonText}>Voir les détails</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dismissButton} onPress={handleClose}>
            <Text style={styles.dismissButtonText}>Plus tard</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 15,
    right: 15,
    zIndex: 1000,
  },
  notificationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    marginBottom: 16,
  },
  priceContainer: {
    backgroundColor: '#f1f8e9',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28a745',
  },
  message: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  viewButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    justifyContent: 'center',
  },
  viewButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 6,
  },
  dismissButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'center',
  },
  dismissButtonText: {
    color: '#666',
    fontWeight: '500',
  },
});

export default ClientPriceNotification;

