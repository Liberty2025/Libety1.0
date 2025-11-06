import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Platform,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

const NotificationAlert = ({ notification, onClose, onViewDetails }) => {
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

      // Son système natif pour réponse immédiate
      // Utiliser un son court et rapide pour éviter les délais de téléchargement
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
      // Pas de fallback - on continue sans son
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
    console.log('🔍 NotificationAlert - handleViewDetails appelé');
    console.log('🔍 Notification:', notification);
    console.log('🔍 onViewDetails function:', typeof onViewDetails);
    
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
            <Ionicons name="notifications" size={24} color="#ff6b35" />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Nouvelle Demande de Service</Text>
            <Text style={styles.subtitle}>
              {notification.clientName} - {notification.serviceType === 'demenagement' ? 'Déménagement' : 'Transport'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.message}>
            {notification.serviceType === 'demenagement' ? 'Déménagement' : 'Transport'} demandé
          </Text>
          <Text style={styles.address}>
            📍 {notification.departureAddress}
          </Text>
          <Text style={styles.time}>
            🕐 {new Date(notification.createdAt).toLocaleString('fr-FR')}
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.viewButton} onPress={handleViewDetails}>
            <Ionicons name="eye" size={16} color="#ffffff" />
            <Text style={styles.viewButtonText}>Voir les détails</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dismissButton} onPress={handleClose}>
            <Text style={styles.dismissButtonText}>Ignorer</Text>
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
    borderLeftColor: '#ff6b35',
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
    backgroundColor: '#fff5f2',
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
  message: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  address: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  viewButton: {
    backgroundColor: '#ff6b35',
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

export default NotificationAlert;
