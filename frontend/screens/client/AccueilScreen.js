import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Alert, ScrollView, TouchableOpacity, Animated, PanResponder, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocale } from '../../context/LocaleContext';
import { generateMapHTML, sortDemenageursByDistance } from '../../utils/mapUtils';
import ReservationForm from '../../components/ReservationForm';
import ServiceTypeSelectionScreen from '../../components/ServiceTypeSelectionScreen';
import QuickTransportForm from '../../components/QuickTransportForm';
import { getAPIBaseURL } from '../../config/api';
import { useTutorialRefs } from '../../hooks/useTutorialRefs';
import { useTutorial } from '../../context/TutorialContext';
import { useNavigationTutorial } from '../../hooks/useNavigationTutorial';

// Composant pour afficher un déménageur dans la liste
const DemenageurItem = ({ demenageur, onSelect, t, styles }) => {
  // Toujours afficher le nom complet (first_name + last_name)
  const fullName = `${demenageur.first_name || ''} ${demenageur.last_name || ''}`.trim() || 'Déménageur';
  const companyName = demenageur.company_name;
  
  return (
    <TouchableOpacity 
      style={styles.demenageurItem}
      onPress={() => onSelect(demenageur)}
    >
      <View style={styles.demenageurInfo}>
        <View style={styles.demenageurHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.demenageurName}>
              {fullName}
            </Text>
            {companyName && companyName.trim() && (
              <Text style={styles.companyName}>
                {companyName}
              </Text>
            )}
          </View>
          <Text style={styles.distanceText}>
            {demenageur.distance ? `${demenageur.distance.toFixed(1)} ${t('km')}` : ''}
          </Text>
        </View>
        <View style={styles.demenageurDetails}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingText}>
              {t('rating', { rating: demenageur.rating || 0 })}
            </Text>
            <Text style={styles.reviewsText}>
              ({t('reviews', { count: demenageur.total_reviews || 0 })})
            </Text>
          </View>
          <Text style={styles.experienceText}>
            {t('years_experience', { years: demenageur.experience_years || 0 })}
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
};

const AccueilScreen = ({ authToken }) => {
  const { t } = useLocale();
  const { registerRef, unregisterRef } = useTutorialRefs();
  const { startTutorial, currentPage, showTutorial } = useTutorial();
  const [location, setLocation] = useState(null);
  const [demenageurs, setDemenageurs] = useState([]);
  const [sortedDemenageurs, setSortedDemenageurs] = useState([]);
  
  // Logger l'URL de l'API au montage du composant
  useEffect(() => {
    console.log('🏠 AccueilScreen monté - API_BASE_URL:', getAPIBaseURL());
  }, []);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showList, setShowList] = useState(true);
  const [isMapTouched, setIsMapTouched] = useState(false);
  const [selectedDemenageur, setSelectedDemenageur] = useState(null);
  const [showServiceTypeSelection, setShowServiceTypeSelection] = useState(false);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [showQuickTransportForm, setShowQuickTransportForm] = useState(false);
  const [serviceType, setServiceType] = useState('demenagement');
  const [mapHTML, setMapHTML] = useState(''); // Mémoriser le HTML de la carte
  const loadDemenageursRef = useRef(null); // Ref pour la fonction de chargement
  
  const translateY = useRef(new Animated.Value(0)).current;
  const listHeight = useRef(300).current;
  
  // Refs pour les éléments à expliquer
  const quickTransportButtonRef = useRef(null);
  const showListButtonRef = useRef(null);
  const demenageurListRef = useRef(null);
  const tabBarRef = useRef(null);

  // Enregistrer les refs pour le tutoriel
  const tutorialRefs = {
    quickTransportButton: quickTransportButtonRef,
    demenageurList: demenageurListRef,
    showListButton: showListButtonRef,
  };

  useNavigationTutorial('Accueil', tutorialRefs);
  
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: () => {
        translateY.setOffset(translateY._value);
        translateY.setValue(0);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        translateY.flattenOffset();
        
        if (gestureState.vy > 0.5 || gestureState.dy > listHeight / 2) {
          hideList();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Définir loadDemenageurs avant de l'utiliser dans useEffect
  const loadDemenageurs = React.useCallback(async (silent = false) => {
    try {
      // Obtenir l'URL de l'API dynamiquement
      const API_BASE_URL = getAPIBaseURL();
      const apiUrl = `${API_BASE_URL}/api/demenageurs`;
      // TOUJOURS logger l'URL et l'état, même en mode silencieux pour le débogage
      console.log(`🔄 [${silent ? 'SILENT' : 'NORMAL'}] Chargement des déménageurs depuis:`, apiUrl);
      console.log('🌐 API_BASE_URL:', API_BASE_URL);
      
      // Ajouter un timeout pour éviter que la requête reste bloquée
      console.log('📡 Envoi de la requête fetch...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn('⏱️ Timeout de la requête après 15 secondes');
        controller.abort();
      }, 15000); // Timeout de 15 secondes
      
      let response;
      try {
        response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Timeout: La requête a pris trop de temps');
        }
        throw fetchError;
      }
      
      console.log('📡 Réponse reçue - Status:', response?.status, 'OK:', response?.ok, 'Type:', response?.type);
      
      if (response && response.ok) {
        const data = await response.json();
        console.log('✅ Réponse API reçue (RAW):', JSON.stringify(data, null, 2));
        console.log('✅ Réponse API reçue:', {
          success: data.success,
          count: data.count,
          dataLength: data.data?.length || 0,
          hasData: !!data.data,
          dataType: Array.isArray(data.data) ? 'array' : typeof data.data,
          firstItem: data.data?.[0] ? {
            id: data.data[0].id,
            name: `${data.data[0].first_name} ${data.data[0].last_name}`,
            hasLat: !!data.data[0].latitude,
            hasLng: !!data.data[0].longitude,
            hasLocation: !!data.data[0].location
          } : null
        });
        
        if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
          // Normaliser les données pour s'assurer que latitude/longitude sont disponibles
          const normalizedDemenageurs = data.data.map(d => {
            // Extraire les coordonnées de différentes sources possibles
            const lat = d.latitude || d.location?.lat || (d.location && parseFloat(d.location.lat));
            const lng = d.longitude || d.location?.lng || (d.location && parseFloat(d.location.lng));
            
            return {
              ...d,
              latitude: lat ? parseFloat(lat) : null,
              longitude: lng ? parseFloat(lng) : null,
              location: d.location || (lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null)
            };
          });
          
          console.log('📍 Déménageurs normalisés:', normalizedDemenageurs.length);
          console.log('📍 Déménageurs avec coordonnées:', normalizedDemenageurs.filter(d => d.latitude && d.longitude).length);
          console.log('📍 Détails des déménageurs normalisés:', normalizedDemenageurs.map(d => ({
            id: d.id,
            name: `${d.first_name} ${d.last_name}`,
            lat: d.latitude,
            lng: d.longitude
          })));
          
          // Afficher TOUS les déménageurs, même sans coordonnées
          // (ceux sans coordonnées ne seront pas sur la carte mais seront dans la liste)
          setDemenageurs(normalizedDemenageurs);
          // Le tri par distance sera fait dans un useEffect séparé quand location sera disponible
          setSortedDemenageurs(normalizedDemenageurs);
          setErrorMsg(null); // Effacer les erreurs précédentes
          
          console.log('✅ Liste des déménageurs mise à jour:', normalizedDemenageurs.length, 'déménageurs');
          console.log('✅ sortedDemenageurs sera mis à jour avec:', normalizedDemenageurs.length, 'éléments');
        } else {
          console.warn('⚠️ Aucun déménageur disponible dans la réponse:', {
            success: data.success,
            hasData: !!data.data,
            isArray: Array.isArray(data.data),
            length: data.data?.length || 0,
            fullData: JSON.stringify(data, null, 2)
          });
          setDemenageurs([]);
          setSortedDemenageurs([]);
        }
      } else {
        const errorText = await response.text().catch(() => 'Erreur inconnue');
        console.error('❌ Erreur HTTP:', response?.status, response?.statusText, errorText);
        throw new Error(`Erreur HTTP: ${response?.status} - ${errorText}`);
      }
    } catch (error) {
      // TOUJOURS logger les erreurs, même en mode silencieux
      console.error('❌ Erreur de connexion API:', error);
      console.error('❌ Détails de l\'erreur:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        apiUrl: `${getAPIBaseURL()}/api/demenageurs`
      });
      
      // Ne pas afficher d'erreur si on a déjà des déménageurs chargés
      // La liste sera mise à jour au prochain polling
      setDemenageurs(currentDemenageurs => {
        if (currentDemenageurs.length === 0 && !silent) {
          setErrorMsg(`Connexion en cours... Réessai automatique...`);
        } else {
          // Conserver la liste existante, elle sera mise à jour au prochain polling
          console.log('⚠️ Erreur mais liste déjà chargée, conservation des données');
        }
        return currentDemenageurs; // Conserver la liste existante
      });
    }
  }, []); // Pas de dépendances pour éviter les re-renders
  
  // Mettre à jour la ref quand la fonction change
  useEffect(() => {
    loadDemenageursRef.current = loadDemenageurs;
  }, [loadDemenageurs]);

  // Système de polling en temps réel - mise à jour automatique toutes les 10 secondes
  useEffect(() => {
    console.log('🚀 Initialisation du système de polling des déménageurs');
    // Chargement initial
    console.log('📥 Chargement initial des déménageurs...');
    loadDemenageurs(false);
    
    // Mise à jour automatique toutes les 10 secondes
    const intervalId = setInterval(() => {
      console.log('🔄 Mise à jour automatique de la liste des déménageurs...');
      loadDemenageurs(true); // Chargement silencieux pour les mises à jour
    }, 10000); // Toutes les 10 secondes
    
    return () => {
      console.log('🛑 Arrêt du système de polling');
      clearInterval(intervalId);
    };
  }, [loadDemenageurs]);

  useEffect(() => {
    (async () => {
      try {
        // Charger la position GPS
        const [locationPermission] = await Promise.all([
          Location.requestForegroundPermissionsAsync(),
        ]);

        if (locationPermission.status !== 'granted') {
          setErrorMsg(t('location_permission_denied'));
          Alert.alert(
            t('error_permission_required'),
            t('error_location_required'),
            [{ text: 'OK' }]
          );
          // Continuer même sans permission de localisation
          setLoading(false);
          return;
        }

        // Obtenir la position avec un timeout pour éviter d'attendre trop longtemps
        const locationPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced, // Utiliser Balanced au lieu de Best pour être plus rapide
          timeout: 10000, // Timeout de 10 secondes
        });

        const userLocation = await locationPromise;
        setLocation(userLocation);
        
      } catch (error) {
        console.error('Erreur:', error);
        setErrorMsg(t('error_loading_data'));
        // Continuer même en cas d'erreur de localisation
      } finally {
        setLoading(false);
      }
    })();
  }, [loadDemenageurs]);

  useEffect(() => {
    console.log('🔄 useEffect tri déménageurs - location:', !!location, 'demenageurs.length:', demenageurs.length);
    
    if (location && location.coords && demenageurs.length > 0) {
      // Trier seulement les déménageurs qui ont des coordonnées
      const demenageursWithCoords = demenageurs.filter(d => 
        d.latitude && d.longitude && 
        !isNaN(parseFloat(d.latitude)) && 
        !isNaN(parseFloat(d.longitude))
      );
      
      const demenageursWithoutCoords = demenageurs.filter(d => 
        !d.latitude || !d.longitude || 
        isNaN(parseFloat(d.latitude)) || 
        isNaN(parseFloat(d.longitude))
      );
      
      console.log('📍 Déménageurs avec coordonnées:', demenageursWithCoords.length);
      console.log('📍 Déménageurs sans coordonnées:', demenageursWithoutCoords.length);
      
      // Trier ceux avec coordonnées par distance
      const sorted = sortDemenageursByDistance(
        demenageursWithCoords, 
        location.coords.latitude, 
        location.coords.longitude
      );
      
      // Ajouter ceux sans coordonnées à la fin
      const finalSorted = [...sorted, ...demenageursWithoutCoords];
      console.log('✅ sortedDemenageurs mis à jour avec', finalSorted.length, 'éléments');
      setSortedDemenageurs(finalSorted);
    } else if (demenageurs.length > 0) {
      // Si pas de localisation, afficher tous les déménageurs dans l'ordre reçu
      console.log('✅ Pas de localisation, affichage de tous les déménageurs:', demenageurs.length);
      setSortedDemenageurs(demenageurs);
    } else {
      console.log('⚠️ Aucun déménageur à trier');
    }
  }, [location, demenageurs]);

  // Calculer les coordonnées de la carte (position par défaut si pas de localisation)
  const defaultLat = 36.8065;
  const defaultLng = 10.1815;
  const mapLat = location?.coords?.latitude || defaultLat;
  const mapLng = location?.coords?.longitude || defaultLng;

  // Générer le HTML de la carte seulement quand les données changent
  useEffect(() => {
    if (mapLat && mapLng) {
      const html = generateMapHTML(mapLat, mapLng, demenageurs);
      setMapHTML(html);
    }
  }, [mapLat, mapLng, demenageurs.length]);

  // Démarrer le tutoriel quand l'écran Accueil est monté (client authentifié)
  const tutorialStartedRef = useRef(false);
  useEffect(() => {
    // Démarrer le tutoriel seulement une fois par session
    if (!tutorialStartedRef.current) {
      tutorialStartedRef.current = true;
      // Attendre un peu pour que l'écran soit complètement chargé
      const timer = setTimeout(() => {
        console.log('🎓 Démarrage du tutoriel depuis AccueilScreen');
        // Forcer l'affichage de la liste pendant le tutoriel
        setShowList(true);
        startTutorial('Accueil');
      }, 2000); // Attendre 2 secondes pour que tout soit chargé
      
      return () => clearTimeout(timer);
    }
  }, []); // Seulement au montage de l'écran
  
  // Forcer l'affichage de la liste quand le tutoriel est actif sur cette page
  useEffect(() => {
    if (showTutorial && currentPage === 'Accueil') {
      setShowList(true);
    }
  }, [showTutorial, currentPage]);

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

  const handleReservationSubmit = async (reservationData) => {
    try {
      console.log('Demande de service:', reservationData);
      
      let scheduledDate;
      try {
        const [day, month, year] = reservationData.date.split('/');
        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        scheduledDate = new Date(`${formattedDate}T${reservationData.time}:00`);
        
        if (isNaN(scheduledDate.getTime())) {
          throw new Error('Date invalide');
        }
      } catch (error) {
        console.error('Erreur lors de la création de la date:', error);
        scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() + 1);
        scheduledDate.setHours(9, 0, 0, 0);
      }
      
      const serviceRequestData = {
        serviceType: serviceType,
        serviceDetails: {
          cuisine: reservationData.cuisine,
          chambres: reservationData.chambres,
          serviceType: reservationData.serviceType,
          propertyType: reservationData.propertyType,
          floor: reservationData.floor,
          hasElevator: reservationData.hasElevator,
          notes: reservationData.notes,
          article: reservationData.article
        },
        departureAddress: reservationData.adresseDepart,
        destinationAddress: reservationData.destination,
        demenageurId: reservationData.demenageur.id,
        scheduledDate: scheduledDate
      };

      const response = await fetch(`${getAPIBaseURL()}/api/service-requests/create`, {
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

  const handleQuickTransportSubmit = async (formData) => {
    try {
      // Récupérer tous les déménageurs disponibles
      const response = await fetch(`${getAPIBaseURL()}/api/demenageurs`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des déménageurs');
      }

      const data = await response.json();
      const allDemenageurs = data.success && data.data ? data.data : [];

      if (allDemenageurs.length === 0) {
        Alert.alert('Aucun déménageur', 'Aucun déménageur disponible pour le moment');
        return;
      }

      // Date par défaut (demain à 9h)
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 1);
      scheduledDate.setHours(9, 0, 0, 0);

      // Envoyer la demande à tous les déménageurs
      const requests = allDemenageurs.map(demenageur => {
        const serviceRequestData = {
          serviceType: 'transport',
          serviceDetails: {
            article: formData.article,
            serviceType: 'camion_seul',
            isQuickService: true // Marquer comme service rapide
          },
          departureAddress: formData.adresseDepart,
          destinationAddress: formData.destination,
          demenageurId: demenageur.id,
          scheduledDate: scheduledDate
        };

        return fetch(`${API_BASE_URL}/api/service-requests/create`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(serviceRequestData),
        });
      });

      const results = await Promise.allSettled(requests);
      
      // Vérifier les réponses pour voir si elles sont réussies
      const responseChecks = await Promise.all(
        results.map(async (result) => {
          if (result.status === 'fulfilled') {
            try {
              const response = result.value;
              const data = await response.json();
              return data.success === true;
            } catch (e) {
              return false;
            }
          }
          return false;
        })
      );

      const successful = responseChecks.filter(success => success === true).length;
      const failed = allDemenageurs.length - successful;

      if (successful > 0) {
        Alert.alert(
          'Demande envoyée !',
          `Votre demande de transport rapide a été envoyée à ${successful} déménageur${successful > 1 ? 's' : ''}.${failed > 0 ? ` ${failed} envoi${failed > 1 ? 's' : ''} ont échoué.` : ''}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setShowQuickTransportForm(false);
              }
            }
          ]
        );
      } else {
        Alert.alert('Erreur', 'Aucune demande n\'a pu être envoyée. Veuillez réessayer.');
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la demande rapide:', error);
      Alert.alert('Erreur', 'Erreur de connexion lors de l\'envoi de la demande');
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
            `Vous avez choisi ${selectedDemenageur.first_name || ''} ${selectedDemenageur.last_name || ''}`.trim() || 'Déménageur',
            [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Continuer', onPress: () => {
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

  // Vérifications et rendu conditionnel
  // Ne pas bloquer l'affichage si on a des déménageurs même avec une erreur
  if (errorMsg && demenageurs.length === 0 && sortedDemenageurs.length === 0) {
    return (
      <View style={styles.screen}>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setErrorMsg(null);
            loadDemenageurs();
          }}
        >
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <Text style={styles.screenTitle}>{t('loading_map')}</Text>
        <Text style={styles.loadingText}>{t('loading_demenageurs')}</Text>
      </View>
    );
  }

  const handleServiceTypeSelect = (type) => {
    setServiceType(type);
    setShowServiceTypeSelection(false);
    setShowReservationForm(true);
  };

  const handleCloseServiceTypeSelection = () => {
    setShowServiceTypeSelection(false);
    setSelectedDemenageur(null);
  };

  if (showServiceTypeSelection && selectedDemenageur) {
    return (
      <ServiceTypeSelectionScreen
        demenageur={selectedDemenageur}
        onSelectServiceType={handleServiceTypeSelect}
        onClose={handleCloseServiceTypeSelection}
      />
    );
  }

  const handleBackToServiceSelection = () => {
    setShowReservationForm(false);
    setShowServiceTypeSelection(true);
  };

  if (showQuickTransportForm) {
    return (
      <QuickTransportForm
        onClose={() => setShowQuickTransportForm(false)}
        onSubmit={handleQuickTransportSubmit}
        authToken={authToken}
      />
    );
  }

  if (showReservationForm && selectedDemenageur) {
    return (
      <ReservationForm
        demenageur={selectedDemenageur}
        onClose={() => {
          setShowReservationForm(false);
          setSelectedDemenageur(null);
          setServiceType('demenagement');
        }}
        onBack={handleBackToServiceSelection}
        onSubmit={handleReservationSubmit}
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
        
        {isMapTouched && (
          <View style={styles.mapTouchIndicator}>
            <Text style={styles.mapTouchText}>{t('map_fullscreen')}</Text>
          </View>
        )}
      </View>
      
      {/* Afficher la liste si showList est true OU si le tutoriel est actif (pour que le tutoriel puisse pointer vers elle) */}
      {(showList || (showTutorial && currentPage === 'Accueil')) && (
        <Animated.View 
          ref={demenageurListRef}
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
            {sortedDemenageurs.length > 0 ? (
              sortedDemenageurs.map((demenageur) => (
                <DemenageurItem 
                  key={demenageur.id} 
                  demenageur={demenageur}
                  onSelect={(d) => {
                    setSelectedDemenageur(d);
                    setShowServiceTypeSelection(true);
                  }}
                  t={t}
                  styles={styles}
                />
              ))
            ) : (
              <View style={styles.emptyListContainer}>
                <Text style={styles.emptyListText}>
                  {loading ? 'Chargement des déménageurs...' : 'Aucun déménageur disponible pour le moment'}
                </Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      )}
      
      {!showList && (
        <TouchableOpacity 
          ref={showListButtonRef}
          style={styles.showListButton}
          onPress={showListAnimated}
        >
          <Ionicons name="list" size={24} color="#ffffff" />
          <Text style={styles.showListText}>
            {t('available_demenageurs_count', { count: sortedDemenageurs.length })}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity 
        ref={quickTransportButtonRef}
        style={styles.quickTransportButton}
        onPress={() => {
          setShowQuickTransportForm(true);
        }}
      >
        <Ionicons name="flash" size={20} color="#ffffff" />
        <Text style={styles.quickTransportText}>Transport Rapide</Text>
      </TouchableOpacity>

    </View>
  );
};

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
  companyName: {
    fontSize: 12,
    color: '#8e8e93',
    fontStyle: 'italic',
    marginTop: 2,
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
  quickTransportButton: {
    position: 'absolute',
    top: 50,
    left: 20,
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
    zIndex: 1001,
  },
  quickTransportText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyListContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  emptyListText: {
    color: '#8e8e93',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#ff6b35',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AccueilScreen;

