import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocale } from '../context/LocaleContext';

const ServiceTypeSelectionScreen = ({ demenageur, onSelectServiceType, onClose }) => {
  const { t } = useLocale();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choisir le type de service</Text>
        <Text style={styles.subtitle}>
          {demenageur.company_name || `${demenageur.first_name} ${demenageur.last_name}`}
        </Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <TouchableOpacity 
          style={styles.serviceButton}
          onPress={() => onSelectServiceType('demenagement')}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="home" size={48} color="#ff6b35" />
          </View>
          <Text style={styles.serviceTitle}>Déménagement</Text>
          <Text style={styles.serviceDescription}>
            Service complet de déménagement avec emballage et transport
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.serviceButton}
          onPress={() => onSelectServiceType('transport')}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="car" size={48} color="#ff6b35" />
          </View>
          <Text style={styles.serviceTitle}>Transport</Text>
          <Text style={styles.serviceDescription}>
            Transport d'articles et objets spécifiques
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a0d2e',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 107, 53, 0.3)',
    position: 'relative',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ff6b35',
    textAlign: 'center',
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 10,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    gap: 20,
  },
  serviceButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  serviceTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  serviceDescription: {
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ServiceTypeSelectionScreen;

