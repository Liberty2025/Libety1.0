import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

const ClientChatMessageNotification = ({ notification, onClose, onViewDetails }) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-100));
  const soundRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    Vibration.vibrate([100, 50, 100, 50, 100], false);

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

    playAlarmSound();

    return () => {
      stopSound();
    };
  }, []);

  const stopSound = async () => {
    try {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        }
        soundRef.current = null;
      }
    } catch (error) {
      console.log('Erreur lors de l\'arrêt du son (chat):', error);
    }
  };

  const playAlarmSound = async () => {
    try {
      await stopSound();

      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav' },
        {
          shouldPlay: true,
          isLooping: true,
          volume: 0.7,
          isMuted: false,
        }
      );

      soundRef.current = sound;

      timeoutRef.current = setTimeout(async () => {
        await stopSound();
      }, 8000);
    } catch (error) {
      console.log('Erreur lors de la lecture du son (chat):', error);
    }
  };

  const handleClose = async () => {
    await stopSound();
    Vibration.cancel();

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
    await stopSound();
    Vibration.cancel();

    if (typeof onViewDetails === 'function') {
      onViewDetails(notification);
    }

    handleClose();
  };

  if (!notification) {
    return null;
  }

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
            <Ionicons name="chatbubbles-outline" size={24} color="#ff6b35" />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Nouveau message</Text>
            <Text style={styles.subtitle}>
              {notification.senderName || 'Déménageur'}
            </Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.message} numberOfLines={3}>
            {notification.messageContent}
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.viewButton} onPress={handleViewDetails}>
            <Ionicons name="eye" size={16} color="#ffffff" />
            <Text style={styles.viewButtonText}>Ouvrir le chat</Text>
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
    zIndex: 1100,
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
    backgroundColor: '#fff2ec',
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
    lineHeight: 20,
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
    borderColor: '#ff6b35',
    justifyContent: 'center',
  },
  dismissButtonText: {
    color: '#ff6b35',
    fontWeight: '500',
  },
});

export default ClientChatMessageNotification;

