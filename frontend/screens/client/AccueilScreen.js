import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Alert, ScrollView, TouchableOpacity, Animated, PanResponder, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocale } from '../../context/LocaleContext';
import { generateMapHTML, sortDemenageursByDistance } from '../../utils/mapUtils';
import ReservationForm from '../../components/ReservationForm';
import { getAPIBaseURL } from '../../config/api';

const API_BASE_URL = getAPIBaseURL();

const AccueilScreen = ({ authToken }) => {
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
  const [serviceType, setServiceType] = useState('demenagement');
  
  const translateY = useRef(new Animated.Value(0)).current;
  const listHeight = useRef(300).current;
  
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

  useEffect(() => {
    (async () => {
      try {
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

        let userLocation = await Location.getCurrentPositionAsync({});
        setLocation(userLocation);
        await loadDemenageurs();
        
      } catch (error) {
        console.error('Erreur:', error);
        setErrorMsg(t('error_loading_data'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
      
      const response = await fetch(`${API_BASE_URL}/api/demenageurs`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (response && response.ok) {
        const data = await response.json();
        
        if (data.success && data.data && data.data.length > 0) {
          setDemenageurs(data.data);
          
          if (location && location.coords) {
            const sorted = sortDemenageursByDistance(
              data.data, 
              location.coords.latitude, 
              location.coords.longitude
            );
            setSortedDemenageurs(sorted);
          }
        } else {
          throw new Error('Réponse API invalide ou vide');
        }
      } else {
        throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Erreur de connexion API:', error.message);
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

  const DemenageurItem = ({ demenageur }) => (
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

  if (showReservationForm && selectedDemenageur) {
    return (
      <ReservationForm
        demenageur={selectedDemenageur}
        onClose={() => {
          setShowReservationForm(false);
          setSelectedDemenageur(null);
        }}
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
            {sortedDemenageurs.map((demenageur) => (
              <DemenageurItem 
                key={demenageur.id} 
                demenageur={demenageur} 
              />
            ))}
          </ScrollView>
        </Animated.View>
      )}
      
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
});

export default AccueilScreen;

