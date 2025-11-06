import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

const MapSelectionScreen = ({ onLocationSelect, onClose }) => {
  const [location, setLocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Permission de localisation refusée');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    } catch (error) {
      console.error('Erreur de localisation:', error);
      // Utiliser une localisation par défaut (Tunis)
      setLocation({
        coords: {
          latitude: 36.8065,
          longitude: 10.1815
        }
      });
    }
  };

  const confirmSelection = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation.latitude, selectedLocation.longitude);
    } else {
      Alert.alert('Erreur', 'Veuillez sélectionner un emplacement sur la carte');
    }
  };

  if (!location) {
    return (
      <View style={styles.mapContainer}>
        <View style={styles.mapLoading}>
          <Text style={styles.mapLoadingText}>Chargement de la carte...</Text>
        </View>
      </View>
    );
  }

  const mapHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Carte de sélection</title>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; }
        #map { height: 100vh; width: 100vw; }
        .selection-marker {
          background-color: #ff6b35;
          border: 2px solid #ffffff;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map').setView([${location.coords.latitude}, ${location.coords.longitude}], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        let selectedMarker = null;
        
        map.on('click', function(e) {
          if (selectedMarker) {
            map.removeLayer(selectedMarker);
          }
          
          selectedMarker = L.marker([e.latlng.lat, e.latlng.lng], {
            icon: L.divIcon({
              className: 'selection-marker',
              html: '',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })
          }).addTo(map);
          
          // Envoyer les coordonnées à React Native
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'location_selected',
            latitude: e.latlng.lat,
            longitude: e.latlng.lng
          }));
        });
        
        // Marqueur de position actuelle
        L.marker([${location.coords.latitude}, ${location.coords.longitude}], {
          icon: L.divIcon({
            className: 'current-location-marker',
            html: '📍',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          })
        }).addTo(map);
      </script>
    </body>
    </html>
  `;

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'location_selected') {
        setSelectedLocation({
          latitude: data.latitude,
          longitude: data.longitude
        });
      }
    } catch (error) {
      console.error('Erreur de parsing du message WebView:', error);
    }
  };

  return (
    <View style={styles.mapSelectionContainer}>
      <View style={styles.mapHeader}>
        <TouchableOpacity style={styles.mapCloseButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.mapTitle}>Sélectionner la destination</Text>
        <TouchableOpacity style={styles.mapConfirmButton} onPress={confirmSelection}>
          <Text style={styles.mapConfirmText}>Confirmer</Text>
        </TouchableOpacity>
      </View>
      
      <WebView
        style={styles.mapWebView}
        source={{ html: mapHTML }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={handleWebViewMessage}
      />
      
      <View style={styles.mapInstructions}>
        <Text style={styles.mapInstructionsText}>
          Appuyez sur la carte pour sélectionner votre destination
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
  },
  mapLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a0d2e',
  },
  mapLoadingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  mapSelectionContainer: {
    flex: 1,
    backgroundColor: '#1a0d2e',
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#1a0d2e',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 107, 53, 0.3)',
  },
  mapCloseButton: {
    padding: 10,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  mapConfirmButton: {
    backgroundColor: '#ff6b35',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  mapConfirmText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  mapWebView: {
    flex: 1,
  },
  mapInstructions: {
    padding: 15,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 107, 53, 0.3)',
  },
  mapInstructionsText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default MapSelectionScreen;

