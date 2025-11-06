import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Alert, Platform, ScrollView, TouchableOpacity, Animated, PanResponder, TextInput, I18nManager, Modal, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { useState, useEffect, useRef } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as SplashScreen from 'expo-splash-screen';
import { Video } from 'expo-av';

// Import des nouveaux composants
import RoleSelectionScreen from './components/RoleSelectionScreen';
import DemenageurNavigator from './screens/demenageur/DemenageurNavigator';
import AuthScreen from './screens/client/AuthScreen';
import ProfileScreen from './screens/client/ProfileScreen';
import DemenageurAuthScreen from './screens/demenageur/DemenageurAuthScreen';
import SuivreScreen from './screens/client/SuivreScreen';
import ClientChatScreen from './screens/client/ClientChatScreen';
import LanguageSelector from './components/LanguageSelector';
import ClientNotificationProvider from './components/ClientNotificationProvider';

// Import du contexte de localisation
import { LocaleProvider, useLocale } from './context/LocaleContext';

// Import de la configuration API pour Expo Go
import { getAPIBaseURL } from './config/api';

// Configuration de l'API - Utiliser la configuration Expo Go
const API_BASE_URL = getAPIBaseURL();

// Fonction pour calculer la distance entre deux points GPS
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Fonction pour trier les déménageurs par distance
const sortDemenageursByDistance = (demenageurs, userLat, userLng) => {
  return demenageurs.map(demenageur => ({
    ...demenageur,
    distance: calculateDistance(userLat, userLng, demenageur.latitude, demenageur.longitude)
  })).sort((a, b) => a.distance - b.distance);
};

const Tab = createBottomTabNavigator();

// Fonction pour générer le HTML de la carte avec les déménageurs
const generateMapHTML = (latitude, longitude, demenageurs = []) => {
  const demenageursMarkers = demenageurs.map(demenageur => {
    const companyName = demenageur.company_name || `${demenageur.first_name} ${demenageur.last_name}`;
    const verifiedHTML = demenageur.is_verified ? '<p style="margin: 5px 0; color: #28a745; font-size: 14px;"><strong>✅</strong> Vérifié</p>' : '';
    
    // Échapper les apostrophes pour JavaScript
    const escapedCompanyName = companyName.replace(/'/g, "\\'").replace(/"/g, '\\"');
    const escapedPhone = (demenageur.phone || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
    const escapedAddress = (demenageur.address || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
    const rating = demenageur.rating || 0;
    const totalReviews = demenageur.total_reviews || 0;
    const experienceYears = demenageur.experience_years || 0;
    
    return `
      // Marqueur déménageur - ${companyName}
      const truckIcon${demenageur.id} = {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 15,
        fillColor: '#ff6b35',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2
      };
      
      const marker${demenageur.id} = new google.maps.Marker({
        position: { lat: ${demenageur.latitude}, lng: ${demenageur.longitude} },
        map: map,
        icon: truckIcon${demenageur.id},
        title: '${escapedCompanyName}'
      });
      
      const popupContent${demenageur.id} = '<div style="min-width: 200px; padding: 5px;">' +
        '<h3 style="margin: 0 0 10px 0; color: #ff6b35; font-size: 16px;">${escapedCompanyName}</h3>' +
        '<p style="margin: 5px 0; font-size: 14px;"><strong>📞</strong> ${escapedPhone}</p>' +
        '<p style="margin: 5px 0; font-size: 14px;"><strong>⭐</strong> ${rating}/5 (${totalReviews} avis)</p>' +
        '<p style="margin: 5px 0; font-size: 14px;"><strong>📍</strong> ${escapedAddress}</p>' +
        '<p style="margin: 5px 0; font-size: 14px;"><strong>🚚</strong> ${experienceYears} ans d\\'expérience</p>' +
        '${verifiedHTML}' +
        '<div style="margin-top: 10px;">' +
          '<button onclick="selectDemenageur(\\'${demenageur.id}\\')" style="' +
            'background: #ff6b35;' +
            'color: white;' +
            'border: none;' +
            'padding: 8px 16px;' +
            'border-radius: 4px;' +
            'cursor: pointer;' +
            'font-size: 12px;' +
            'width: 100%;' +
          '">Choisir ce déménageur</button>' +
        '</div>' +
      '</div>';
      
      const infoWindow${demenageur.id} = new google.maps.InfoWindow({
        content: popupContent${demenageur.id}
      });
      
      marker${demenageur.id}.addListener('click', () => {
        // Fermer toutes les autres info windows
        infoWindows.forEach(window => window.close());
        infoWindow${demenageur.id}.open(map, marker${demenageur.id});
      });
      
      infoWindows.push(infoWindow${demenageur.id});
    `;
  }).join('\n');

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Carte Déménageurs</title>
        <style>
            body { margin: 0; padding: 0; }
            #map { height: 100vh; width: 100vw; }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBPVngcauCKYsBeA2wD3Cal3cXDKd7OEY4&libraries=places"></script>
        <script>
            console.log('🗺️ Initialisation Google Maps...');
            
            // Tableau pour stocker toutes les info windows
            const infoWindows = [];
            
            // Initialiser la carte Google Maps
            const map = new google.maps.Map(document.getElementById('map'), {
                center: { lat: ${latitude}, lng: ${longitude} },
                zoom: 12,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                styles: [
                    {
                        featureType: 'poi',
                        elementType: 'labels',
                        stylers: [{ visibility: 'off' }]
                    }
                ]
            });
            
            console.log('📍 Carte Google Maps initialisée');
            
            // Marqueur de votre position
            const userIcon = {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#007bff',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2
            };
            
            const userMarker = new google.maps.Marker({
                position: { lat: ${latitude}, lng: ${longitude} },
                map: map,
                icon: userIcon,
                title: 'Votre position'
            });
            
            const userInfoWindow = new google.maps.InfoWindow({
                content: '<div style="text-align: center; padding: 5px;"><b>Votre position</b><br>Vous êtes ici</div>'
            });
            
            userMarker.addListener('click', () => {
                userInfoWindow.open(map, userMarker);
            });
            
            console.log('🔵 Marqueur utilisateur ajouté');
            
            // Marqueurs des déménageurs
            ${demenageursMarkers}
            
            console.log('🚚 Marqueurs déménageurs ajoutés');
            
            // Fonction pour sélectionner un déménageur
            function selectDemenageur(demenageurId) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'SELECT_DEMENAGEUR',
                    demenageurId: demenageurId
                }));
            }
            
            console.log('✅ Carte complètement initialisée');
        </script>
    </body>
    </html>
  `;
};

// Écrans pour chaque onglet

// Composant de carte pour sélection de destination
function MapSelectionScreen({ onLocationSelect, onClose }) {
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

  const handleMapPress = (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
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
}

// Composant de formulaire de réservation
function ReservationForm({ demenageur, onClose, onSubmit, requestType, setRequestType }) {
  // Fonction pour obtenir la date du jour en format JJ/MM/AAAA
  const getTodayDate = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const [formData, setFormData] = useState({
    cuisine: {
      grande: '',
      moyen: '',
      petit: ''
    },
    chambres: [{ 
      nom: '', 
      articles: {
        grande: '',
        moyen: '',
        petit: ''
      }
    }],
    adresseDepart: '',
    destination: '',
    serviceType: 'camion_seul', // 'camion_seul' ou 'avec_travailleurs'
    propertyType: 'maison', // 'maison' ou 'appartement'
    floor: '',
    hasElevator: false,
    date: getTodayDate(), // Date du jour par défaut
    time: '',
    notes: ''
  });

  const [showMap, setShowMap] = useState(false);
  const [mapLocation, setMapLocation] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());

  const addChambre = () => {
    setFormData({
      ...formData,
      chambres: [...formData.chambres, { 
        nom: '', 
        articles: {
          grande: '',
          moyen: '',
          petit: ''
        }
      }]
    });
  };

  const removeChambre = (index) => {
    if (formData.chambres.length > 1) {
      const newChambres = formData.chambres.filter((_, i) => i !== index);
      setFormData({
        ...formData,
        chambres: newChambres
      });
    }
  };

  const updateChambre = (index, field, value) => {
    const newChambres = [...formData.chambres];
    if (field === 'nom') {
      newChambres[index][field] = value;
    } else {
      // field est 'grande', 'moyen', ou 'petit'
      newChambres[index].articles[field] = value;
    }
    setFormData({
      ...formData,
      chambres: newChambres
    });
  };

  const updateCuisine = (field, value) => {
    setFormData({
      ...formData,
      cuisine: {
        ...(formData?.cuisine || {}),
        [field]: value
      }
    });
  };

  // Gestion du changement de date
  const onDateChange = (event, date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (date) {
        setSelectedDate(date);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        setFormData({
          ...formData,
          date: `${day}/${month}/${year}`
        });
      }
    } else {
      // Sur iOS, onChange se déclenche en continu pendant le scroll
      // On met juste à jour selectedDate, la confirmation se fait via handleDateConfirm
      if (date) {
        setSelectedDate(date);
      }
    }
  };

  // Initialisation du DatePicker
  const openDatePicker = () => {
    // Si une date est déjà sélectionnée, l'utiliser
    if (formData.date) {
      const [day, month, year] = formData.date.split('/');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(dateObj.getTime())) {
        setSelectedDate(dateObj);
      } else {
        setSelectedDate(new Date());
      }
    } else {
      // Sinon, utiliser la date du jour
      setSelectedDate(new Date());
    }
    setShowDatePicker(true);
  };

  // Confirmation de la date sur iOS
  const handleDateConfirm = () => {
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const year = selectedDate.getFullYear();
    setFormData({
      ...formData,
      date: `${day}/${month}/${year}`
    });
    setShowDatePicker(false);
  };

  // Gestion du changement d'heure
  const onTimeChange = (event, time) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (time) {
        const hours = String(time.getHours()).padStart(2, '0');
        const minutes = String(time.getMinutes()).padStart(2, '0');
        setFormData({
          ...formData,
          time: `${hours}:${minutes}`
        });
      }
    } else {
      // Sur iOS, onChange se déclenche en continu pendant le scroll
      // On met juste à jour selectedTime, la confirmation se fait via handleTimeConfirm
      if (time) {
        setSelectedTime(time);
      }
    }
  };

  // Initialisation du TimePicker
  const openTimePicker = () => {
    // Si une heure est déjà sélectionnée, l'utiliser
    if (formData.time) {
      const [hours, minutes] = formData.time.split(':');
      const timeDate = new Date();
      timeDate.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
      setSelectedTime(timeDate);
    } else {
      // Sinon, utiliser l'heure actuelle
      setSelectedTime(new Date());
    }
    setShowTimePicker(true);
  };

  // Confirmation de l'heure sur iOS
  const handleTimeConfirm = () => {
    const hours = String(selectedTime.getHours()).padStart(2, '0');
    const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
    setFormData({
      ...formData,
      time: `${hours}:${minutes}`
    });
    setShowTimePicker(false);
  };

  // Détection automatique de la localisation avec Google Maps Geocoding API
  const detectCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Permission de localisation refusée');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      console.log('📍 Position obtenue:', location.coords.latitude, location.coords.longitude);

      // Utiliser Google Maps Geocoding API pour le géocodage inverse
      const GOOGLE_MAPS_API_KEY = 'AIzaSyBPVngcauCKYsBeA2wD3Cal3cXDKd7OEY4';
      const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.coords.latitude},${location.coords.longitude}&key=${GOOGLE_MAPS_API_KEY}&language=fr`;
      
      try {
        const geocodingResponse = await fetch(geocodingUrl);
        
        if (geocodingResponse.ok) {
          const geocodingData = await geocodingResponse.json();
          
          // Vérifier si l'API est autorisée
          if (geocodingData.status === 'REQUEST_DENIED') {
            console.log('⚠️ API Geocoding non autorisée, utilisation du fallback');
            // Continuer avec le fallback sans afficher d'erreur
          } else if (geocodingData.status === 'OK' && geocodingData.results && geocodingData.results.length > 0) {
            // Prendre le premier résultat (le plus précis)
            const result = geocodingData.results[0];
            const formattedAddress = result.formatted_address;
            
            if (formattedAddress) {
              console.log('✅ Adresse Google Maps:', formattedAddress);
              setFormData({
                ...formData,
                adresseDepart: formattedAddress
              });
              return;
            }
            
            // Si formatted_address n'est pas disponible, construire l'adresse depuis les composants
            if (result.address_components) {
              const addressParts = [];
              const components = result.address_components;
              
              // Trouver la rue
              const streetNumber = components.find(c => c.types.includes('street_number'));
              const route = components.find(c => c.types.includes('route'));
              if (streetNumber || route) {
                const street = `${streetNumber ? streetNumber.long_name : ''} ${route ? route.long_name : ''}`.trim();
                if (street) addressParts.push(street);
              }
              
              // Trouver le quartier/secteur
              const neighborhood = components.find(c => c.types.includes('neighborhood') || c.types.includes('sublocality'));
              if (neighborhood) {
                addressParts.push(neighborhood.long_name);
              }
              
              // Trouver la ville
              const city = components.find(c => c.types.includes('locality') || c.types.includes('administrative_area_level_2'));
              if (city) {
                addressParts.push(city.long_name);
              }
              
              // Trouver la région/état
              const region = components.find(c => c.types.includes('administrative_area_level_1'));
              if (region) {
                addressParts.push(region.long_name);
              }
              
              // Trouver le pays
              const country = components.find(c => c.types.includes('country'));
              if (country) {
                addressParts.push(country.long_name);
              }
              
              const fullAddress = addressParts.filter(part => part && part.trim()).join(', ');
              
              if (fullAddress) {
                console.log('✅ Adresse construite depuis composants:', fullAddress);
                setFormData({
                  ...formData,
                  adresseDepart: fullAddress
                });
                return;
              }
            }
          } else if (geocodingData.status === 'ZERO_RESULTS') {
            console.log('⚠️ Aucun résultat trouvé pour cette position');
          } else if (geocodingData.status !== 'REQUEST_DENIED') {
            // Ne logger l'erreur que si ce n'est pas REQUEST_DENIED (car le fallback fonctionne)
            console.log('⚠️ Erreur Google Geocoding:', geocodingData.status);
          }
        }
      } catch (geocodingError) {
        // Ne pas afficher d'erreur si c'est juste un problème de connexion, le fallback fonctionnera
        console.log('⚠️ Impossible de contacter Google Geocoding API, utilisation du fallback');
      }

      // Fallback: utiliser l'API Expo Location
      try {
        const address = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (address.length > 0) {
          const addr = address[0];
          const addressParts = [];
          
          // Construire l'adresse de manière intelligente
          if (addr.street) {
            addressParts.push(addr.street);
          }
          if (addr.streetNumber) {
            addressParts.push(addr.streetNumber);
          }
          if (addr.district) {
            addressParts.push(addr.district);
          }
          if (addr.subregion) {
            addressParts.push(addr.subregion);
          }
          if (addr.city) {
            addressParts.push(addr.city);
          }
          if (addr.region) {
            addressParts.push(addr.region);
          }
          if (addr.country) {
            addressParts.push(addr.country);
          }
          
          const fullAddress = addressParts.filter(part => part && part.trim()).join(', ');
          
          if (fullAddress) {
            console.log('✅ Adresse Expo Location (fallback):', fullAddress);
            setFormData({
              ...formData,
              adresseDepart: fullAddress
            });
            return;
          }
        }
      } catch (expoError) {
        console.error('Erreur Expo Location:', expoError);
      }

      // Dernier recours: utiliser les coordonnées
      const coordsAddress = `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;
      console.log('⚠️ Utilisation des coordonnées:', coordsAddress);
      setFormData({
        ...formData,
        adresseDepart: coordsAddress
      });
      
    } catch (error) {
      console.error('Erreur de localisation:', error);
      Alert.alert('Erreur', 'Impossible de détecter votre localisation');
    }
  };

  // Ouvrir la carte pour sélectionner la destination
  const openMapForDestination = () => {
    setShowMap(true);
  };

  // Gérer la sélection sur la carte
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
        Alert.alert('Destination sélectionnée', `Adresse: ${fullAddress}`);
      }
    } catch (error) {
      console.error('Erreur de géocodage:', error);
      Alert.alert('Erreur', 'Impossible de convertir les coordonnées en adresse');
    }
  };

  const handleSubmit = () => {
    // Validation des champs requis
    if (!formData.adresseDepart || !formData.destination || !formData.date || !formData.time) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Définir cuisine au début pour éviter les erreurs de scope
    const cuisine = formData?.cuisine || {};

    // Validation selon le type de service
    if (requestType === 'demenagement') {
      // Validation que au moins une dimension de la cuisine a des articles
      const hasCuisineArticles = cuisine.grande || cuisine.moyen || cuisine.petit;
      
      if (!hasCuisineArticles) {
        Alert.alert('Erreur', 'Veuillez spécifier au moins une dimension d\'articles pour la cuisine');
        return;
      }
      
      // Validation que les nombres d'articles de la cuisine sont des nombres valides
      if (cuisine?.grande) {
        const grandeCount = parseInt(cuisine.grande);
        if (isNaN(grandeCount) || grandeCount <= 0) {
          Alert.alert('Erreur', 'Le nombre d\'articles grandes de la cuisine doit être un nombre positif');
          return;
        }
      }
      
      if (cuisine?.moyen) {
        const moyenCount = parseInt(cuisine.moyen);
        if (isNaN(moyenCount) || moyenCount <= 0) {
          Alert.alert('Erreur', 'Le nombre d\'articles moyens de la cuisine doit être un nombre positif');
          return;
        }
      }
      
      if (cuisine?.petit) {
        const petitCount = parseInt(cuisine.petit);
        if (isNaN(petitCount) || petitCount <= 0) {
          Alert.alert('Erreur', 'Le nombre d\'articles petits de la cuisine doit être un nombre positif');
          return;
        }
      }
    } else if (requestType === 'transport') {
      // Validation que l'article à transporter est spécifié
      if (!formData.notes) {
        Alert.alert('Erreur', 'Veuillez décrire l\'article à transporter');
        return;
      }
      
      // Validation des détails de la propriété si avec travailleurs
      if (formData.serviceType === 'avec_travailleurs' && formData.propertyType === 'appartement' && !formData.floor) {
        Alert.alert('Erreur', 'Veuillez spécifier l\'étage pour un appartement');
        return;
      }
    }

    // Validation des chambres (seulement pour déménagement)
    if (requestType === 'demenagement') {
      for (let i = 0; i < formData.chambres.length; i++) {
      if (!formData.chambres[i].nom) {
        Alert.alert('Erreur', `Veuillez remplir le nom de la chambre ${i + 1}`);
        return;
      }
      
      // Validation que au moins une dimension a des articles
      const articles = formData.chambres[i].articles;
      const hasArticles = articles.grande || articles.moyen || articles.petit;
      
      if (!hasArticles) {
        Alert.alert('Erreur', `Veuillez spécifier au moins une dimension d'articles pour la chambre ${i + 1}`);
        return;
      }
      
      // Validation que les nombres d'articles sont des nombres valides
      if (articles.grande) {
        const grandeCount = parseInt(articles.grande);
        if (isNaN(grandeCount) || grandeCount <= 0) {
          Alert.alert('Erreur', `Le nombre d'articles grandes de la chambre ${i + 1} doit être un nombre positif`);
          return;
        }
      }
      
      if (articles.moyen) {
        const moyenCount = parseInt(articles.moyen);
        if (isNaN(moyenCount) || moyenCount <= 0) {
          Alert.alert('Erreur', `Le nombre d'articles moyens de la chambre ${i + 1} doit être un nombre positif`);
          return;
        }
      }
      
      if (articles.petit) {
        const petitCount = parseInt(articles.petit);
        if (isNaN(petitCount) || petitCount <= 0) {
          Alert.alert('Erreur', `Le nombre d'articles petits de la chambre ${i + 1} doit être un nombre positif`);
          return;
        }
      }
      }
    }

    if (requestType === 'demenagement' && formData.serviceType === 'avec_travailleurs' && formData.propertyType === 'appartement' && !formData.floor) {
      Alert.alert('Erreur', 'Veuillez spécifier l\'étage pour un appartement');
      return;
    }

    onSubmit({
      demenageur,
      ...formData
    });
  };

  // Afficher la carte de sélection si nécessaire
  if (showMap) {
    return (
      <MapSelectionScreen
        onLocationSelect={handleMapSelection}
        onClose={() => setShowMap(false)}
      />
    );
  }

  return (
    <View style={styles.reservationFormContainer}>
      <ScrollView style={styles.reservationFormContent} showsVerticalScrollIndicator={false}>
        {/* En-tête */}
        <View style={styles.reservationHeader}>
          <Text style={styles.reservationTitle}>Demande de Service</Text>
          <Text style={styles.reservationSubtitle}>
            {demenageur.company_name || `${demenageur.first_name} ${demenageur.last_name}`}
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Sélection du type de service */}
        <View style={styles.serviceTypeSelector}>
          <TouchableOpacity 
            style={[styles.serviceTypeButton, requestType === 'demenagement' && styles.serviceTypeButtonActive]}
            onPress={() => setRequestType('demenagement')}
          >
            <Ionicons 
              name="home" 
              size={20} 
              color={requestType === 'demenagement' ? '#ffffff' : '#ff6b35'} 
            />
            <Text style={[styles.serviceTypeButtonText, requestType === 'demenagement' && styles.serviceTypeButtonTextActive]}>
              Déménagement
            </Text>
          </TouchableOpacity>
          
                <TouchableOpacity 
                  style={[styles.serviceTypeButton, requestType === 'transport' && styles.serviceTypeButtonActive]}
                  onPress={() => setRequestType('transport')}
                >
                  <Ionicons 
                    name="archive" 
                    size={20} 
                    color={requestType === 'transport' ? '#ffffff' : '#ff6b35'} 
                  />
                  <Text style={[styles.serviceTypeButtonText, requestType === 'transport' && styles.serviceTypeButtonTextActive]}>
                    Transport
                  </Text>
                </TouchableOpacity>
        </View>

        {/* Formulaire */}
        <View style={styles.formSection}>
          {/* Formulaire Déménagement */}
          {requestType === 'demenagement' && (
            <>
              {/* Cuisine */}
              <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Cuisine *</Text>
            <View style={styles.articlesDimensions}>
              <Text style={styles.chambreInputLabel}>Dimensions des articles et nombres</Text>
              <View style={styles.dimensionsRow}>
                <View style={styles.dimensionInput}>
                  <Text style={styles.dimensionLabel}>Grande</Text>
                  <TextInput
                    style={styles.dimensionTextInput}
                    placeholder="Ex: 5"
                    placeholderTextColor="#8e8e93"
                    value={formData?.cuisine?.grande || ''}
                    onChangeText={(text) => updateCuisine('grande', text)}
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={styles.dimensionInput}>
                  <Text style={styles.dimensionLabel}>Moyen</Text>
                  <TextInput
                    style={styles.dimensionTextInput}
                    placeholder="Ex: 8"
                    placeholderTextColor="#8e8e93"
                    value={formData?.cuisine?.moyen || ''}
                    onChangeText={(text) => updateCuisine('moyen', text)}
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={styles.dimensionInput}>
                  <Text style={styles.dimensionLabel}>Petit</Text>
                  <TextInput
                    style={styles.dimensionTextInput}
                    placeholder="Ex: 10"
                    placeholderTextColor="#8e8e93"
                    value={formData?.cuisine?.petit || ''}
                    onChangeText={(text) => updateCuisine('petit', text)}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Chambres */}
          <View style={styles.inputGroup}>
            <View style={styles.sectionHeader}>
              <Text style={styles.inputLabel}>Chambres *</Text>
              <TouchableOpacity style={styles.addButton} onPress={addChambre}>
                <Ionicons name="add" size={20} color="#ff6b35" />
                <Text style={styles.addButtonText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
            
            {formData.chambres.map((chambre, index) => (
              <View key={index} style={styles.chambreContainer}>
                <View style={styles.chambreHeader}>
                  <Text style={styles.chambreTitle}>Chambre {index + 1}</Text>
                  {formData.chambres.length > 1 && (
                    <TouchableOpacity 
                      style={styles.removeButton} 
                      onPress={() => removeChambre(index)}
                    >
                      <Ionicons name="trash" size={16} color="#ff6b6b" />
                    </TouchableOpacity>
                  )}
                </View>
                
                <View style={styles.chambreInputs}>
                  <View style={styles.chambreInputFull}>
                    <Text style={styles.chambreInputLabel}>Nom de la chambre</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ex: Chambre parentale, Salon..."
                      placeholderTextColor="#8e8e93"
                      value={chambre.nom}
                      onChangeText={(text) => updateChambre(index, 'nom', text)}
                    />
                  </View>
                  
                  <View style={styles.articlesDimensions}>
                    <Text style={styles.chambreInputLabel}>Dimensions des articles et nombres</Text>
                    <View style={styles.dimensionsRow}>
                      <View style={styles.dimensionInput}>
                        <Text style={styles.dimensionLabel}>Grande</Text>
                        <TextInput
                          style={styles.dimensionTextInput}
                          placeholder="Ex: 5"
                          placeholderTextColor="#8e8e93"
                          value={chambre.articles.grande}
                          onChangeText={(text) => updateChambre(index, 'grande', text)}
                          keyboardType="numeric"
                        />
                      </View>
                      
                      <View style={styles.dimensionInput}>
                        <Text style={styles.dimensionLabel}>Moyen</Text>
                        <TextInput
                          style={styles.dimensionTextInput}
                          placeholder="Ex: 8"
                          placeholderTextColor="#8e8e93"
                          value={chambre.articles.moyen}
                          onChangeText={(text) => updateChambre(index, 'moyen', text)}
                          keyboardType="numeric"
                        />
                      </View>
                      
                      <View style={styles.dimensionInput}>
                        <Text style={styles.dimensionLabel}>Petit</Text>
                        <TextInput
                          style={styles.dimensionTextInput}
                          placeholder="Ex: 10"
                          placeholderTextColor="#8e8e93"
                          value={chambre.articles.petit}
                          onChangeText={(text) => updateChambre(index, 'petit', text)}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Adresse de départ */}
          <View style={styles.inputGroup}>
            <View style={styles.sectionHeader}>
              <Text style={styles.inputLabel}>Adresse de départ *</Text>
              <TouchableOpacity style={styles.locationButton} onPress={detectCurrentLocation}>
                <Ionicons name="location" size={16} color="#ff6b35" />
                <Text style={styles.locationButtonText}>Détecter</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="Adresse complète de départ..."
              placeholderTextColor="#8e8e93"
              value={formData.adresseDepart}
              onChangeText={(text) => setFormData({...formData, adresseDepart: text})}
            />
          </View>

          {/* Destination */}
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

          {/* Type de service */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Type de service *</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity 
                style={[styles.radioOption, formData.serviceType === 'camion_seul' && styles.radioOptionSelected]}
                onPress={() => setFormData({...formData, serviceType: 'camion_seul'})}
              >
                <View style={[styles.radioButton, formData.serviceType === 'camion_seul' && styles.radioButtonSelected]}>
                  {formData.serviceType === 'camion_seul' && <View style={styles.radioButtonInner} />}
                </View>
                <Text style={styles.radioText}>Camion avec chauffeur uniquement</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.radioOption, formData.serviceType === 'avec_travailleurs' && styles.radioOptionSelected]}
                onPress={() => setFormData({...formData, serviceType: 'avec_travailleurs'})}
              >
                <View style={[styles.radioButton, formData.serviceType === 'avec_travailleurs' && styles.radioButtonSelected]}>
                  {formData.serviceType === 'avec_travailleurs' && <View style={styles.radioButtonInner} />}
                </View>
                <Text style={styles.radioText}>Camion avec travailleurs</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Détails de la propriété (si avec travailleurs) */}
          {formData.serviceType === 'avec_travailleurs' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Type de propriété *</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity 
                  style={[styles.radioOption, formData.propertyType === 'maison' && styles.radioOptionSelected]}
                  onPress={() => setFormData({...formData, propertyType: 'maison'})}
                >
                  <View style={[styles.radioButton, formData.propertyType === 'maison' && styles.radioButtonSelected]}>
                    {formData.propertyType === 'maison' && <View style={styles.radioButtonInner} />}
                  </View>
                  <Text style={styles.radioText}>Maison</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.radioOption, formData.propertyType === 'appartement' && styles.radioOptionSelected]}
                  onPress={() => setFormData({...formData, propertyType: 'appartement'})}
                >
                  <View style={[styles.radioButton, formData.propertyType === 'appartement' && styles.radioButtonSelected]}>
                    {formData.propertyType === 'appartement' && <View style={styles.radioButtonInner} />}
                  </View>
                  <Text style={styles.radioText}>Appartement</Text>
                </TouchableOpacity>
              </View>

              {/* Détails appartement */}
              {formData.propertyType === 'appartement' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Étage *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ex: 3ème étage"
                      placeholderTextColor="#8e8e93"
                      value={formData.floor}
                      onChangeText={(text) => setFormData({...formData, floor: text})}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Ascenseur disponible ?</Text>
                    <View style={styles.radioGroup}>
                      <TouchableOpacity 
                        style={[styles.radioOption, formData.hasElevator === true && styles.radioOptionSelected]}
                        onPress={() => setFormData({...formData, hasElevator: true})}
                      >
                        <View style={[styles.radioButton, formData.hasElevator === true && styles.radioButtonSelected]}>
                          {formData.hasElevator === true && <View style={styles.radioButtonInner} />}
                        </View>
                        <Text style={styles.radioText}>Oui</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.radioOption, formData.hasElevator === false && styles.radioOptionSelected]}
                        onPress={() => setFormData({...formData, hasElevator: false})}
                      >
                        <View style={[styles.radioButton, formData.hasElevator === false && styles.radioButtonSelected]}>
                          {formData.hasElevator === false && <View style={styles.radioButtonInner} />}
                        </View>
                        <Text style={styles.radioText}>Non</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            </View>
          )}

          {/* Date et heure */}
          <View style={styles.inputRow}>
            <View style={styles.inputGroupHalf}>
              <Text style={styles.inputLabel}>Date *</Text>
              <TouchableOpacity onPress={openDatePicker}>
                <TextInput
                  style={styles.textInput}
                  placeholder="JJ/MM/AAAA"
                  placeholderTextColor="#8e8e93"
                  value={formData.date}
                  editable={false}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.inputGroupHalf}>
              <Text style={styles.inputLabel}>Heure *</Text>
              <TouchableOpacity onPress={openTimePicker}>
                <TextInput
                  style={styles.textInput}
                  placeholder="HH:MM"
                  placeholderTextColor="#8e8e93"
                  value={formData.time}
                  editable={false}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Notes supplémentaires */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Notes supplémentaires</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Informations complémentaires..."
              placeholderTextColor="#8e8e93"
              value={formData.notes}
              onChangeText={(text) => setFormData({...formData, notes: text})}
              multiline
              numberOfLines={2}
            />
          </View>
            </>
          )}

          {/* Formulaire Transport */}
          {requestType === 'transport' && (
            <>
              {/* Article à transporter */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Article à transporter *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Décrivez l'article à transporter..."
                  placeholderTextColor="#8e8e93"
                  value={formData.notes}
                  onChangeText={(text) => setFormData({...formData, notes: text})}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Adresse de départ */}
              <View style={styles.inputGroup}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.inputLabel}>Adresse de départ *</Text>
                  <TouchableOpacity style={styles.locationButton} onPress={detectCurrentLocation}>
                    <Ionicons name="location" size={16} color="#ff6b35" />
                    <Text style={styles.locationButtonText}>Détecter</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="Adresse complète de départ..."
                  placeholderTextColor="#8e8e93"
                  value={formData.adresseDepart}
                  onChangeText={(text) => setFormData({...formData, adresseDepart: text})}
                />
              </View>

              {/* Destination */}
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

              {/* Type de service */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Type de service *</Text>
                <View style={styles.radioGroup}>
                  <TouchableOpacity 
                    style={[styles.radioOption, formData.serviceType === 'camion_seul' && styles.radioOptionSelected]}
                    onPress={() => setFormData({...formData, serviceType: 'camion_seul'})}
                  >
                    <View style={[styles.radioButton, formData.serviceType === 'camion_seul' && styles.radioButtonSelected]}>
                      {formData.serviceType === 'camion_seul' && <View style={styles.radioButtonInner} />}
                    </View>
                    <Text style={styles.radioText}>Camion avec chauffeur uniquement</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.radioOption, formData.serviceType === 'avec_travailleurs' && styles.radioOptionSelected]}
                    onPress={() => setFormData({...formData, serviceType: 'avec_travailleurs'})}
                  >
                    <View style={[styles.radioButton, formData.serviceType === 'avec_travailleurs' && styles.radioButtonSelected]}>
                      {formData.serviceType === 'avec_travailleurs' && <View style={styles.radioButtonInner} />}
                    </View>
                    <Text style={styles.radioText}>Camion avec travailleurs</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Détails de la propriété (si avec travailleurs) */}
              {formData.serviceType === 'avec_travailleurs' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Type de propriété *</Text>
                  <View style={styles.radioGroup}>
                    <TouchableOpacity 
                      style={[styles.radioOption, formData.propertyType === 'maison' && styles.radioOptionSelected]}
                      onPress={() => setFormData({...formData, propertyType: 'maison'})}
                    >
                      <View style={[styles.radioButton, formData.propertyType === 'maison' && styles.radioButtonSelected]}>
                        {formData.propertyType === 'maison' && <View style={styles.radioButtonInner} />}
                      </View>
                      <Text style={styles.radioText}>Maison</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.radioOption, formData.propertyType === 'appartement' && styles.radioOptionSelected]}
                      onPress={() => setFormData({...formData, propertyType: 'appartement'})}
                    >
                      <View style={[styles.radioButton, formData.propertyType === 'appartement' && styles.radioButtonSelected]}>
                        {formData.propertyType === 'appartement' && <View style={styles.radioButtonInner} />}
                      </View>
                      <Text style={styles.radioText}>Appartement</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Détails appartement */}
                  {formData.propertyType === 'appartement' && (
                    <>
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Étage *</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="Ex: 3ème étage"
                          placeholderTextColor="#8e8e93"
                          value={formData.floor}
                          onChangeText={(text) => setFormData({...formData, floor: text})}
                        />
                      </View>

                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Ascenseur disponible ?</Text>
                        <View style={styles.radioGroup}>
                          <TouchableOpacity 
                            style={[styles.radioOption, formData.hasElevator === true && styles.radioOptionSelected]}
                            onPress={() => setFormData({...formData, hasElevator: true})}
                          >
                            <View style={[styles.radioButton, formData.hasElevator === true && styles.radioButtonSelected]}>
                              {formData.hasElevator === true && <View style={styles.radioButtonInner} />}
                            </View>
                            <Text style={styles.radioText}>Oui</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            style={[styles.radioOption, formData.hasElevator === false && styles.radioOptionSelected]}
                            onPress={() => setFormData({...formData, hasElevator: false})}
                          >
                            <View style={[styles.radioButton, formData.hasElevator === false && styles.radioButtonSelected]}>
                              {formData.hasElevator === false && <View style={styles.radioButtonInner} />}
                            </View>
                            <Text style={styles.radioText}>Non</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </>
                  )}
                </View>
              )}

              {/* Date et heure */}
              <View style={styles.inputRow}>
                <View style={styles.inputGroupHalf}>
                  <Text style={styles.inputLabel}>Date *</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="JJ/MM/AAAA"
                      placeholderTextColor="#8e8e93"
                      value={formData.date}
                      editable={false}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.inputGroupHalf}>
                  <Text style={styles.inputLabel}>Heure *</Text>
                  <TouchableOpacity onPress={() => setShowTimePicker(true)}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="HH:MM"
                      placeholderTextColor="#8e8e93"
                      value={formData.time}
                      editable={false}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Boutons d'action */}
        <View style={styles.formActions}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Envoyer la demande</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* DatePicker pour la date */}
      {showDatePicker && (
        Platform.OS === 'ios' ? (
          <Modal
            transparent={true}
            animationType="slide"
            visible={showDatePicker}
            onRequestClose={() => setShowDatePicker(false)}
            presentationStyle="overFullScreen"
          >
            <TouchableOpacity 
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowDatePicker(false)}
            >
              <View 
                style={styles.modalContent}
                onStartShouldSetResponder={() => true}
              >
                  <View style={styles.pickerHeader}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.pickerCancelButton}>Annuler</Text>
                    </TouchableOpacity>
                    <Text style={styles.pickerTitle}>Sélectionner une date</Text>
                    <TouchableOpacity onPress={handleDateConfirm}>
                      <Text style={styles.pickerDoneButton}>Terminé</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    key={`date-${selectedDate.getTime()}`}
                    value={selectedDate}
                    mode="date"
                    display="spinner"
                    onChange={onDateChange}
                    minimumDate={new Date()}
                  />
                </View>
            </TouchableOpacity>
          </Modal>
        ) : (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )
      )}

      {/* TimePicker pour l'heure */}
      {showTimePicker && (
        Platform.OS === 'ios' ? (
          <Modal
            transparent={true}
            animationType="slide"
            visible={showTimePicker}
            onRequestClose={() => setShowTimePicker(false)}
            presentationStyle="overFullScreen"
          >
            <TouchableOpacity 
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowTimePicker(false)}
            >
              <View 
                style={styles.modalContent}
                onStartShouldSetResponder={() => true}
              >
                  <View style={styles.pickerHeader}>
                    <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                      <Text style={styles.pickerCancelButton}>Annuler</Text>
                    </TouchableOpacity>
                    <Text style={styles.pickerTitle}>Sélectionner une heure</Text>
                    <TouchableOpacity onPress={handleTimeConfirm}>
                      <Text style={styles.pickerDoneButton}>Terminé</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    key={`time-${selectedTime.getTime()}`}
                    value={selectedTime}
                    mode="time"
                    display="spinner"
                    onChange={onTimeChange}
                  />
                </View>
            </TouchableOpacity>
          </Modal>
        ) : (
          <DateTimePicker
            value={selectedTime}
            mode="time"
            display="default"
            onChange={onTimeChange}
          />
        )
      )}
    </View>
  );
}

function AccueilScreen({ authToken }) {
  const { t } = useLocale();
  const [location, setLocation] = useState(null);
  const [demenageurs, setDemenageurs] = useState([]);
  const [sortedDemenageurs, setSortedDemenageurs] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showList, setShowList] = useState(true);
  const [isMapTouched, setIsMapTouched] = useState(false);
  const [selectedDemenageur, setSelectedDemenageur] = useState(null);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [serviceType, setServiceType] = useState('demenagement'); // 'demenagement' ou 'transport'
  
  // Animation pour le glissement
  const translateY = useRef(new Animated.Value(0)).current;
  const listHeight = useRef(300).current; // Hauteur de la liste
  
  // PanResponder pour gérer les gestes
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Activer le pan responder si on glisse verticalement
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: () => {
        translateY.setOffset(translateY._value);
        translateY.setValue(0);
      },
      onPanResponderMove: (evt, gestureState) => {
        // Limiter le mouvement vers le haut
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        translateY.flattenOffset();
        
        // Si on glisse vers le bas avec une vitesse suffisante, masquer la liste
        if (gestureState.vy > 0.5 || gestureState.dy > listHeight / 2) {
          hideList();
        } else {
          // Sinon, revenir à la position initiale
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    (async () => {
      try {
        // Demander la permission de localisation
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg(t('location_permission_denied'));
        Alert.alert(
          t('error_permission_required'),
          t('error_location_required'),
          [{ text: 'OK' }]
        );
        return;
      }

        // Obtenir la position de l'utilisateur
        let userLocation = await Location.getCurrentPositionAsync({});
        setLocation(userLocation);

        // Charger les déménageurs (API ou démonstration)
        await loadDemenageurs();
        
      } catch (error) {
        console.error('Erreur:', error);
        setErrorMsg(t('error_loading_data'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Trier les déménageurs par distance quand la localisation ou les déménageurs changent
  useEffect(() => {
    if (location && location.coords && demenageurs.length > 0) {
      const sorted = sortDemenageursByDistance(
        demenageurs, 
        location.coords.latitude, 
        location.coords.longitude
      );
      setSortedDemenageurs(sorted);
    }
  }, [location, demenageurs]);

  // Fonctions pour gérer le glissement
  const hideList = () => {
    Animated.timing(translateY, {
      toValue: listHeight,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowList(false);
    });
  };

  const showListAnimated = () => {
    setShowList(true);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Fonctions pour gérer le toucher de la carte
  const handleMapTouchStart = () => {
    setIsMapTouched(true);
    if (showList) {
      Animated.timing(translateY, {
        toValue: listHeight,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleMapTouchEnd = () => {
    setIsMapTouched(false);
    if (showList) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleReservationSubmit = async (reservationData, selectedServiceType) => {
    try {
      console.log('Demande de service:', reservationData);
      console.log('Date originale:', reservationData.date);
      console.log('Heure originale:', reservationData.time);
      
      // Utiliser le serviceType sélectionné dans le formulaire
      console.log('ServiceType sélectionné:', selectedServiceType);
      
      
      // Créer la date programmée
      let scheduledDate;
      try {
        // Convertir la date du format DD/MM/YYYY vers YYYY-MM-DD
        const [day, month, year] = reservationData.date.split('/');
        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        scheduledDate = new Date(`${formattedDate}T${reservationData.time}:00`);
        
        // Vérifier que la date est valide
        if (isNaN(scheduledDate.getTime())) {
          throw new Error('Date invalide');
        }
      } catch (error) {
        console.error('Erreur lors de la création de la date:', error);
        // Fallback: utiliser la date actuelle + 1 jour
        scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() + 1);
        scheduledDate.setHours(9, 0, 0, 0); // 9h00 par défaut
      }
      
      console.log('Date programmée créée:', scheduledDate);
      
      // Préparer les données pour l'API
      const serviceRequestData = {
        serviceType: selectedServiceType,
        serviceDetails: {
          // Détails spécifiques au type de service
          cuisine: reservationData.cuisine,
          chambres: reservationData.chambres,
          serviceType: reservationData.serviceType, // avec_travailleurs ou sans_travailleurs
          propertyType: reservationData.propertyType,
          floor: reservationData.floor,
          hasElevator: reservationData.hasElevator,
          notes: reservationData.notes,
          article: reservationData.article // pour transport
        },
        departureAddress: reservationData.adresseDepart,
        destinationAddress: reservationData.destination,
        demenageurId: reservationData.demenageur.id,
        scheduledDate: scheduledDate
      };

      console.log('🔍 Données envoyées au backend:', serviceRequestData);
      console.log('🔍 ServiceType principal:', selectedServiceType);
      console.log('🔍 ServiceType dans serviceDetails:', reservationData.serviceType);

      // Envoyer la demande au backend
      const response = await fetch(`${API_BASE_URL}/api/service-requests/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serviceRequestData),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert(
          'Demande envoyée !',
          'Votre demande de service a été envoyée au déménageur. Vous recevrez une réponse sous peu.',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowReservationForm(false);
                setSelectedDemenageur(null);
              }
            }
          ]
        );
      } else {
        Alert.alert('Erreur', result.message || 'Erreur lors de l\'envoi de la demande');
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la demande:', error);
      Alert.alert('Erreur', 'Erreur de connexion lors de l\'envoi de la demande');
    }
  };

  const loadDemenageurs = async () => {
    try {
      console.log(`Tentative de connexion à: ${API_BASE_URL}/api/demenageurs`);
      console.log(`Plateforme: ${Platform.OS}`);
      
      const response = await fetch(`${API_BASE_URL}/api/demenageurs`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`Réponse reçue: ${response.status} ${response.statusText}`);
      
      if (response && response.ok) {
        const data = await response.json();
        console.log(`Données reçues: success=${data.success}, count=${data.data?.length || 0}`);
        
        if (data.success && data.data && data.data.length > 0) {
          setDemenageurs(data.data);
          console.log(`${data.data.length} déménageurs chargés depuis l'API`);
          
          // Trier les déménageurs par distance si on a la localisation
          if (location && location.coords) {
            const sorted = sortDemenageursByDistance(
              data.data, 
              location.coords.latitude, 
              location.coords.longitude
            );
            setSortedDemenageurs(sorted);
            console.log('Déménageurs triés par distance');
          }
        } else {
          throw new Error('Réponse API invalide ou vide');
        }
      } else {
        throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Erreur de connexion API:', error.message);
      console.error('Type d\'erreur:', error.name);
      setErrorMsg(`Impossible de charger les déménageurs: ${error.message}`);
    }
  };

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SELECT_DEMENAGEUR') {
        const selectedDemenageur = demenageurs.find(d => d.id === data.demenageurId);
        if (selectedDemenageur) {
          Alert.alert(
            'Déménageur sélectionné',
            `Vous avez choisi ${selectedDemenageur.company_name || selectedDemenageur.first_name + ' ' + selectedDemenageur.last_name}`,
            [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Continuer', onPress: () => {
                // Ici vous pouvez naviguer vers une page de réservation
                console.log('Déménageur sélectionné:', selectedDemenageur);
              }}
            ]
          );
        }
      }
    } catch (error) {
      console.error('Erreur lors du traitement du message WebView:', error);
    }
  };

  if (errorMsg) {
    return (
      <View style={styles.screen}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  if (loading || !location) {
    return (
      <View style={styles.screen}>
        <Text style={styles.screenTitle}>{t('loading_map')}</Text>
        <Text style={styles.loadingText}>{t('loading_demenageurs')}</Text>
      </View>
    );
  }

  const mapHTML = generateMapHTML(location.coords.latitude, location.coords.longitude, demenageurs);

  // Composant pour afficher un déménageur dans la liste
  const DemenageurItem = ({ demenageur, index }) => (
    <TouchableOpacity 
      style={styles.demenageurItem}
      onPress={() => {
        setSelectedDemenageur(demenageur);
        setShowReservationForm(true);
      }}
    >
      <View style={styles.demenageurInfo}>
        <View style={styles.demenageurHeader}>
          <Text style={styles.demenageurName}>
            {demenageur.company_name || `${demenageur.first_name} ${demenageur.last_name}`}
          </Text>
            <Text style={styles.distanceText}>
            {demenageur.distance ? `${demenageur.distance.toFixed(1)} ${t('km')}` : ''}
          </Text>
        </View>
        <View style={styles.demenageurDetails}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingText}>{t('rating', { rating: demenageur.rating })}</Text>
            <Text style={styles.reviewsText}>({t('reviews', { count: demenageur.total_reviews })})</Text>
          </View>
          <Text style={styles.experienceText}>
            {t('years_experience', { years: demenageur.experience_years })}
          </Text>
        </View>
        {demenageur.is_verified && (
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#28a745" />
            <Text style={styles.verifiedText}>{t('verified')}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  // Afficher le formulaire de réservation si un déménageur est sélectionné
  if (showReservationForm && selectedDemenageur) {
    return (
      <ReservationForm
        demenageur={selectedDemenageur}
        onClose={() => {
          setShowReservationForm(false);
          setSelectedDemenageur(null);
        }}
        onSubmit={(data) => handleReservationSubmit(data, serviceType)}
        requestType={serviceType}
        setRequestType={setServiceType}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View 
        style={styles.mapContainer}
        onTouchStart={handleMapTouchStart}
        onTouchEnd={handleMapTouchEnd}
      >
        <WebView
          style={styles.map}
          source={{ html: mapHTML }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          onMessage={handleWebViewMessage}
        />
        
        {/* Indicateur de toucher de la carte */}
        {isMapTouched && (
          <View style={styles.mapTouchIndicator}>
            <Text style={styles.mapTouchText}>{t('map_fullscreen')}</Text>
          </View>
        )}
      </View>
      
      {/* Liste glissante des déménageurs */}
      {showList && sortedDemenageurs.length > 0 && (
        <Animated.View 
          style={[
            styles.demenageursList,
            {
              transform: [{ translateY: translateY }]
            }
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>
              {t('available_demenageurs')} ({sortedDemenageurs.length})
            </Text>
            <View style={styles.swipeIndicator}>
              <View style={styles.swipeBar} />
            </View>
          </View>
          
          <ScrollView 
            style={styles.scrollList}
            showsVerticalScrollIndicator={false}
            horizontal={false}
          >
            {sortedDemenageurs.map((demenageur, index) => (
              <DemenageurItem 
                key={demenageur.id} 
                demenageur={demenageur} 
                index={index} 
              />
            ))}
          </ScrollView>
        </Animated.View>
      )}
      
      {/* Bouton pour afficher/masquer la liste */}
      {!showList && (
        <TouchableOpacity 
          style={styles.showListButton}
          onPress={showListAnimated}
        >
          <Ionicons name="list" size={24} color="#ffffff" />
          <Text style={styles.showListText}>
            {t('available_demenageurs_count', { count: sortedDemenageurs.length })}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}


function ChatScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.screenTitle}>Chat</Text>
    </View>
  );
}

function NotificationScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.screenTitle}>Notifications</Text>
    </View>
  );
}
// Composant Splash Screen personnalisé
function CustomSplashScreen({ onFinished }) {
  const videoRef = useRef(null);
  const hasFinished = useRef(false);

  useEffect(() => {
    // Timer de 4.5 secondes pour passer à l'application
    const timer = setTimeout(() => {
      if (!hasFinished.current) {
        hasFinished.current = true;
        onFinished();
      }
    }, 4500);

    return () => {
      clearTimeout(timer);
    };
  }, [onFinished]);

  const handleVideoFinish = () => {
    if (!hasFinished.current) {
      hasFinished.current = true;
      onFinished();
    }
  };

  return (
    <View style={styles.splashContainer}>
      <Video
        ref={videoRef}
        source={require('./assets/splash-video.mp4')}
        style={styles.splashVideo}
        resizeMode="contain"
        shouldPlay={true}
        isLooping={false}
        isMuted={false}
        useNativeControls={false}
        onPlaybackStatusUpdate={(status) => {
          if (status.didJustFinish && !hasFinished.current) {
            handleVideoFinish();
          }
        }}
      />
    </View>
  );
}

// Composant interne qui utilise le contexte de localisation
function AppContent() {
  const { t, isRTL } = useLocale();
  
  // État pour le splash screen personnalisé
  const [showSplash, setShowSplash] = useState(true);
  
  // État pour le rôle de l'utilisateur
  const [userRole, setUserRole] = useState(null);
  // État pour l'authentification du client
  const [isClientAuthenticated, setIsClientAuthenticated] = useState(false);
  const [clientData, setClientData] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  // État pour l'authentification du déménageur
  const [isDemenageurAuthenticated, setIsDemenageurAuthenticated] = useState(false);
  const [demenageurData, setDemenageurData] = useState(null);
  const [demenageurToken, setDemenageurToken] = useState(null);
  
  // Gérer le splash screen natif - masquer immédiatement pour laisser place au splash personnalisé
  useEffect(() => {
    const prepare = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn(e);
      }
    };

    prepare();
  }, []);

  // Forcer la direction RTL si nécessaire (pour Android)
  useEffect(() => {
    if (Platform.OS === 'android') {
      I18nManager.forceRTL(isRTL);
      I18nManager.allowRTL(isRTL);
    }
  }, [isRTL]);

  // Afficher le splash screen personnalisé pendant 5 secondes
  if (showSplash) {
    return <CustomSplashScreen onFinished={() => setShowSplash(false)} />;
  }

  // Afficher la page de sélection de rôle si aucun rôle n'est sélectionné
  if (!userRole) {
    return <RoleSelectionScreen onRoleSelected={setUserRole} />;
  }

  // Si le rôle est "client" mais pas authentifié, afficher l'écran d'authentification
  if (userRole === 'client' && !isClientAuthenticated) {
    return (
      <AuthScreen 
        onAuthSuccess={(data, token) => {
          setClientData(data);
          setAuthToken(token);
          setIsClientAuthenticated(true);
        }}
        onBack={() => setUserRole(null)}
      />
    );
  }

  // Si le rôle est "demenageur" mais pas authentifié, afficher l'écran d'authentification déménageur
  if (userRole === 'demenageur' && !isDemenageurAuthenticated) {
    return (
      <DemenageurAuthScreen 
        onAuthSuccess={(data, token) => {
          setDemenageurData(data);
          setDemenageurToken(token);
          setIsDemenageurAuthenticated(true);
        }}
        onBack={() => setUserRole(null)}
      />
    );
  }

  // Si le rôle est "client" et authentifié, afficher l'interface client
  if (userRole === 'client' && isClientAuthenticated) {
    return (
      <NavigationContainer>
        <StatusBar style="light" />
        <ClientNotificationProvider 
          userData={{...clientData, token: authToken}}
        >
          <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;

              if (route.name === 'Accueil') {
                iconName = focused ? 'home' : 'home-outline';
              } else if (route.name === 'Suivre') {
                iconName = focused ? 'location' : 'location-outline';
              } else if (route.name === 'Chat') {
                iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              } else if (route.name === 'Notification') {
                iconName = focused ? 'notifications' : 'notifications-outline';
              } else if (route.name === 'Profil') {
                iconName = focused ? 'person' : 'person-outline';
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#ff6b35',
            tabBarInactiveTintColor: '#8e8e93',
            tabBarStyle: {
              backgroundColor: '#1a0d2e',
              borderTopColor: '#ff6b35',
              borderTopWidth: 2,
              height: 60,
              paddingBottom: 5,
              paddingTop: 5,
            },
            headerStyle: {
              backgroundColor: '#1a0d2e',
              borderBottomColor: '#ff6b35',
              borderBottomWidth: 2,
            },
            headerTintColor: '#ffffff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          })}
        >
          <Tab.Screen 
            name="Accueil" 
            options={{
              title: t('home'),
              headerShown: false,
            }}
          >
            {() => <AccueilScreen authToken={authToken} />}
          </Tab.Screen>
          <Tab.Screen 
            name="Suivre" 
            options={{
              title: t('track'),
              headerTitle: t('track_requests'),
              headerRight: () => <View style={{ marginRight: 15 }}><LanguageSelector showLabel={false} /></View>,
            }}
          >
            {() => <SuivreScreen userData={{...clientData, token: authToken}} />}
          </Tab.Screen>
          <Tab.Screen 
            name="Chat" 
            options={{
              title: t('chat'),
              headerTitle: t('chat'),
              headerRight: () => <View style={{ marginRight: 15 }}><LanguageSelector showLabel={false} /></View>,
            }}
          >
            {() => <ClientChatScreen authToken={authToken} userData={clientData} />}
          </Tab.Screen>
          <Tab.Screen 
            name="Notification" 
            component={NotificationScreen}
            options={{
              title: t('notifications'),
              headerTitle: t('notifications'),
              headerRight: () => <View style={{ marginRight: 15 }}><LanguageSelector showLabel={false} /></View>,
            }}
          />
          <Tab.Screen 
            name="Profil" 
            options={{
              title: t('profile'),
              headerTitle: t('my_profile'),
              headerRight: () => <View style={{ marginRight: 15 }}><LanguageSelector showLabel={false} /></View>,
            }}
          >
            {() => (
              <ProfileScreen 
                userData={{ ...clientData, token: authToken }}
                onLogout={() => {
                  setClientData(null);
                  setAuthToken(null);
                  setIsClientAuthenticated(false);
                }}
              />
            )}
          </Tab.Screen>
        </Tab.Navigator>
        </ClientNotificationProvider>
      </NavigationContainer>
    );
  }

  // Si le rôle est "demenageur" et authentifié, afficher l'interface déménageur
  if (userRole === 'demenageur' && isDemenageurAuthenticated) {
    const userDataForNavigator = {...demenageurData, token: demenageurToken};
    console.log('🔍 App.js - Données passées à DemenageurNavigator:', {
      demenageurData: demenageurData ? 'PRÉSENT' : 'ABSENT',
      demenageurToken: demenageurToken ? 'PRÉSENT' : 'ABSENT',
      userDataForNavigator: userDataForNavigator ? 'PRÉSENT' : 'ABSENT',
      userId: userDataForNavigator?.userId,
      id: userDataForNavigator?.id,
      token: userDataForNavigator?.token ? 'PRÉSENT' : 'ABSENT',
      demenageurDataKeys: demenageurData ? Object.keys(demenageurData) : 'N/A'
    });
    
    return (
      <NavigationContainer>
        <StatusBar style="light" />
        <DemenageurNavigator 
          userData={userDataForNavigator} 
          onLogout={() => {
            setIsDemenageurAuthenticated(false);
            setDemenageurData(null);
            setDemenageurToken(null);
            setUserRole(null);
          }} 
        />
      </NavigationContainer>
    );
  }

  // Fallback - ne devrait jamais être atteint
  return (
    <View style={styles.screen}>
      <Text style={styles.screenTitle}>{t('error_loading_data')}</Text>
    </View>
  );
}

// Composant principal qui enveloppe l'app avec le LocaleProvider
export default function App() {
  return (
    <LocaleProvider>
      <AppContent />
    </LocaleProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a0d2e',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  screen: {
    flex: 1,
    backgroundColor: '#1a0d2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ff6b6b',
    textAlign: 'center',
    marginHorizontal: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'center',
    marginTop: 10,
    marginHorizontal: 20,
  },
  // Styles pour la liste glissante
  demenageursList: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(26, 13, 46, 0.75)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    minHeight: 200,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  toggleButton: {
    padding: 5,
  },
  swipeIndicator: {
    alignItems: 'center',
    paddingVertical: 5,
  },
  swipeBar: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  scrollList: {
    flex: 1,
    paddingHorizontal: 10,
  },
  demenageurItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    marginVertical: 5,
    marginHorizontal: 5,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  demenageurInfo: {
    flex: 1,
  },
  demenageurHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  demenageurName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  distanceText: {
    fontSize: 14,
    color: '#ff6b35',
    fontWeight: '600',
  },
  demenageurDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#ffffff',
    marginLeft: 4,
    fontWeight: '600',
  },
  reviewsText: {
    fontSize: 12,
    color: '#8e8e93',
    marginLeft: 4,
  },
  experienceText: {
    fontSize: 12,
    color: '#8e8e93',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  verifiedText: {
    fontSize: 12,
    color: '#28a745',
    marginLeft: 4,
    fontWeight: '600',
  },
  showListButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#ff6b35',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  showListText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // Styles pour l'indicateur de toucher de la carte
  mapTouchIndicator: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 1000,
  },
  mapTouchText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Styles pour la page "Bientôt disponible"
  comingSoonContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 20,
    marginBottom: 8,
  },
  comingSoonSubtitle: {
    fontSize: 18,
    color: '#ff6b35',
    fontWeight: '600',
    marginBottom: 20,
  },
  comingSoonDescription: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
    lineHeight: 24,
    marginHorizontal: 20,
  },
  backButton: {
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    borderRadius: 25,
    paddingHorizontal: 30,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.5)',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  // Styles pour le formulaire de réservation
  reservationFormContainer: {
    flex: 1,
    backgroundColor: '#1a0d2e',
  },
  reservationFormContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  reservationHeader: {
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 107, 53, 0.3)',
    marginBottom: 20,
    position: 'relative',
  },
  reservationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  reservationSubtitle: {
    fontSize: 16,
    color: '#ff6b35',
    textAlign: 'center',
    fontWeight: '600',
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
  inputGroupHalf: {
    flex: 1,
    marginRight: 10,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 20,
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
  radioGroup: {
    gap: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  radioOptionSelected: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#ff6b35',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff6b35',
  },
  radioText: {
    fontSize: 16,
    color: '#ffffff',
    flex: 1,
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
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Styles pour les chambres
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  addButtonText: {
    color: '#ff6b35',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  chambreContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  chambreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chambreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff6b35',
  },
  removeButton: {
    padding: 5,
  },
  chambreInputs: {
    flexDirection: 'column',
    gap: 10,
  },
  chambreInputHalf: {
    flex: 1,
  },
  chambreInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 6,
  },
  // Styles pour les dimensions d'articles
  chambreInputFull: {
    width: '100%',
    marginBottom: 15,
  },
  articlesDimensions: {
    width: '100%',
  },
  dimensionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  dimensionInput: {
    flex: 1,
  },
  dimensionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ff6b35',
    marginBottom: 6,
    textAlign: 'center',
  },
  dimensionTextInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 10,
    color: '#ffffff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    textAlign: 'center',
  },
  // Styles pour les boutons de localisation et carte
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
  // Styles pour la carte de sélection
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
  // Styles pour la sélection du type de service
  serviceTypeSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  serviceTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  serviceTypeButtonActive: {
    backgroundColor: '#ff6b35',
  },
  serviceTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff6b35',
    marginLeft: 8,
  },
  serviceTypeButtonTextActive: {
    color: '#ffffff',
  },
  // Styles pour les modaux de picker de date et heure
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  pickerCancelButton: {
    fontSize: 16,
    color: '#ff6b35',
    fontWeight: '600',
  },
  pickerDoneButton: {
    fontSize: 16,
    color: '#ff6b35',
    fontWeight: 'bold',
  },
  // Styles pour le splash screen personnalisé
  splashContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashVideo: {
    width: '100%',
    height: '100%',
  },
});