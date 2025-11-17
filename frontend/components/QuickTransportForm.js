import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapSelectionScreen from './MapSelectionScreen';

const QuickTransportForm = ({ onClose, onSubmit, authToken }) => {
  const [formData, setFormData] = useState({
    article: '',
    adresseDepart: '',
    destination: ''
  });
  const [showMap, setShowMap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(true);
  const locationSubscriptionRef = React.useRef(null);

  const geocodeLocation = async (location) => {
    const GOOGLE_MAPS_API_KEY = 'AIzaSyBPVngcauCKYsBeA2wD3Cal3cXDKd7OEY4';
    const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.coords.latitude},${location.coords.longitude}&key=${GOOGLE_MAPS_API_KEY}&language=fr&result_type=street_address|premise|subpremise|route`;
    
    // Essayer d'abord avec Google Geocoding API (le plus précis)
    try {
      const geocodingResponse = await fetch(geocodingUrl);
      
      if (geocodingResponse.ok) {
        const geocodingData = await geocodingResponse.json();
        
        if (geocodingData.status === 'OK' && geocodingData.results && geocodingData.results.length > 0) {
          // Prendre le premier résultat (le plus précis)
          const result = geocodingData.results[0];
          const formattedAddress = result.formatted_address;
          
          if (formattedAddress) {
            console.log('✅ Adresse Google Maps (temps réel):', formattedAddress);
            setFormData(prev => ({
              ...prev,
              adresseDepart: formattedAddress
            }));
            return true;
          }
          
          // Si pas de formatted_address, construire depuis les composants
          if (result.address_components) {
            const addressParts = [];
            const components = result.address_components;
            
            // Numéro de rue
            const streetNumber = components.find(c => c.types.includes('street_number'));
            if (streetNumber) addressParts.push(streetNumber.long_name);
            
            // Nom de la rue
            const route = components.find(c => c.types.includes('route'));
            if (route) addressParts.push(route.long_name);
            
            // Quartier/Sous-localité
            const neighborhood = components.find(c => 
              c.types.includes('neighborhood') || 
              c.types.includes('sublocality') || 
              c.types.includes('sublocality_level_1')
            );
            if (neighborhood) addressParts.push(neighborhood.long_name);
            
            // Ville
            const city = components.find(c => 
              c.types.includes('locality') || 
              c.types.includes('administrative_area_level_2')
            );
            if (city) addressParts.push(city.long_name);
            
            // Code postal
            const postalCode = components.find(c => c.types.includes('postal_code'));
            if (postalCode) addressParts.push(postalCode.long_name);
            
            // Région
            const region = components.find(c => c.types.includes('administrative_area_level_1'));
            if (region) addressParts.push(region.long_name);
            
            // Pays
            const country = components.find(c => c.types.includes('country'));
            if (country) addressParts.push(country.long_name);
            
            const fullAddress = addressParts.filter(part => part && part.trim()).join(', ');
            
            if (fullAddress) {
              console.log('✅ Adresse construite depuis composants Google (temps réel):', fullAddress);
              setFormData(prev => ({
                ...prev,
                adresseDepart: fullAddress
              }));
              return true;
            }
          }
        }
      }
    } catch (geocodingError) {
      console.log('⚠️ Impossible de contacter Google Geocoding API:', geocodingError);
    }

    // Fallback: utiliser Expo Location reverse geocoding
    try {
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address.length > 0) {
        const addr = address[0];
        const addressParts = [];
        
        // Construire l'adresse de manière structurée
        if (addr.streetNumber) addressParts.push(addr.streetNumber);
        if (addr.street) addressParts.push(addr.street);
        if (addr.district) addressParts.push(addr.district);
        if (addr.subregion) addressParts.push(addr.subregion);
        if (addr.postalCode) addressParts.push(addr.postalCode);
        if (addr.city) addressParts.push(addr.city);
        if (addr.region) addressParts.push(addr.region);
        if (addr.country) addressParts.push(addr.country);
        
        const fullAddress = addressParts.filter(part => part && part.trim()).join(', ');
        
        if (fullAddress) {
          console.log('✅ Adresse Expo Location (temps réel, fallback):', fullAddress);
          setFormData(prev => ({
            ...prev,
            adresseDepart: fullAddress
          }));
          return true;
        }
      }
    } catch (expoError) {
      console.error('Erreur Expo Location:', expoError);
    }

    return false;
  };

  const detectCurrentLocation = async () => {
    try {
      setDetectingLocation(true);
      
      // Demander les permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Permission de localisation refusée');
        setDetectingLocation(false);
        return;
      }

      // Obtenir une première position rapidement
      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        maximumAge: 0, // Toujours obtenir une nouvelle position
        timeout: 10000,
      });
      
      console.log('📍 Position initiale obtenue:', initialLocation.coords.latitude, initialLocation.coords.longitude);
      console.log('📍 Précision:', initialLocation.coords.accuracy, 'mètres');

      // Géocoder la position initiale
      await geocodeLocation(initialLocation);
      
      // Maintenant, suivre la position en temps réel
      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation, // Meilleure précision disponible
          timeInterval: 2000, // Mettre à jour toutes les 2 secondes
          distanceInterval: 5, // Ou si l'utilisateur se déplace de plus de 5 mètres
        },
        async (location) => {
          console.log('📍 Position mise à jour (temps réel):', location.coords.latitude, location.coords.longitude);
          console.log('📍 Précision:', location.coords.accuracy, 'mètres');
          
          // Géocoder la nouvelle position
          await geocodeLocation(location);
        }
      );
      
      setDetectingLocation(false);
      
      
    } catch (error) {
      console.error('Erreur de localisation:', error);
      Alert.alert('Erreur', 'Impossible de détecter votre localisation. Veuillez saisir l\'adresse manuellement.');
      setDetectingLocation(false);
    }
  };

  // Détecter automatiquement la localisation au chargement et suivre en temps réel
  useEffect(() => {
    detectCurrentLocation();
    
    // Nettoyer l'abonnement au démontage
    return () => {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }
    };
  }, []);

  const openMapForDestination = () => {
    setShowMap(true);
  };

  const handleMapSelection = async (latitude, longitude) => {
    try {
      const address = await Location.reverseGeocodeAsync({
        latitude: latitude,
        longitude: longitude,
      });

      if (address.length > 0) {
        const addr = address[0];
        const fullAddress = `${addr.street || ''} ${addr.streetNumber || ''}, ${addr.city || ''}, ${addr.region || ''}`.trim();
        setFormData({
          ...formData,
          destination: fullAddress
        });
        setShowMap(false);
      }
    } catch (error) {
      console.error('Erreur de géocodage:', error);
      Alert.alert('Erreur', 'Impossible de convertir les coordonnées en adresse');
    }
  };

  const handleSubmit = async () => {
    if (!formData.article || !formData.adresseDepart || !formData.destination) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
      Alert.alert('Erreur', 'Erreur lors de l\'envoi de la demande');
    } finally {
      setLoading(false);
    }
  };

  if (showMap) {
    return (
      <MapSelectionScreen
        onLocationSelect={handleMapSelection}
        onClose={() => setShowMap(false)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Transport Rapide</Text>
          <Text style={styles.subtitle}>Envoyez votre demande à tous les déménageurs</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Article à transporter *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Décrivez l'article à transporter..."
              placeholderTextColor="#8e8e93"
              value={formData.article}
              onChangeText={(text) => setFormData({...formData, article: text})}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.sectionHeader}>
              <Text style={styles.inputLabel}>Adresse de départ *</Text>
              {detectingLocation ? (
                <View style={styles.locationButton}>
                  <ActivityIndicator size="small" color="#ff6b35" />
                  <Text style={styles.locationButtonText}>Détection...</Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.locationButton} onPress={detectCurrentLocation}>
                  <Ionicons name="location" size={16} color="#ff6b35" />
                  <Text style={styles.locationButtonText}>Actualiser</Text>
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={styles.textInput}
              placeholder={detectingLocation ? "Détection en cours..." : "Adresse complète de départ..."}
              placeholderTextColor="#8e8e93"
              value={formData.adresseDepart}
              onChangeText={(text) => setFormData({...formData, adresseDepart: text})}
              editable={!detectingLocation}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.sectionHeader}>
              <Text style={styles.inputLabel}>Destination *</Text>
              <TouchableOpacity style={styles.mapButton} onPress={openMapForDestination}>
                <Ionicons name="map" size={16} color="#ff6b35" />
                <Text style={styles.mapButtonText}>Choisir dans la carte</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="Adresse complète de destination..."
              placeholderTextColor="#8e8e93"
              value={formData.destination}
              onChangeText={(text) => setFormData({...formData, destination: text})}
            />
          </View>
        </View>

        <View style={styles.formActions}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={loading}>
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Envoi en cours...' : 'Envoyer à tous'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a0d2e',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 107, 53, 0.3)',
    marginBottom: 20,
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
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 0,
    padding: 10,
  },
  formSection: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  locationButtonText: {
    color: '#ff6b35',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  mapButtonText: {
    color: '#ff6b35',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingBottom: 40,
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#ff6b35',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default QuickTransportForm;

