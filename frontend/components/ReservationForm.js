import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Platform, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import MapSelectionScreen from './MapSelectionScreen';

const ReservationForm = ({ demenageur, onClose, onSubmit, requestType, setRequestType, onBack }) => {
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
    serviceType: 'camion_seul',
    propertyType: 'maison',
    floor: '',
    hasElevator: false,
    date: getTodayDate(),
    time: '',
    notes: ''
  });

  const [showMap, setShowMap] = useState(false);
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
      if (date) {
        setSelectedDate(date);
      }
    }
  };

  const openDatePicker = () => {
    if (formData.date) {
      const [day, month, year] = formData.date.split('/');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(dateObj.getTime())) {
        setSelectedDate(dateObj);
      } else {
        setSelectedDate(new Date());
      }
    } else {
      setSelectedDate(new Date());
    }
    setShowDatePicker(true);
  };

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
      if (time) {
        setSelectedTime(time);
      }
    }
  };

  const openTimePicker = () => {
    if (formData.time) {
      const [hours, minutes] = formData.time.split(':');
      const timeDate = new Date();
      timeDate.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
      setSelectedTime(timeDate);
    } else {
      setSelectedTime(new Date());
    }
    setShowTimePicker(true);
  };

  const handleTimeConfirm = () => {
    const hours = String(selectedTime.getHours()).padStart(2, '0');
    const minutes = String(selectedTime.getMinutes()).padStart(2, '0');
    setFormData({
      ...formData,
      time: `${hours}:${minutes}`
    });
    setShowTimePicker(false);
  };

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

      const GOOGLE_MAPS_API_KEY = 'AIzaSyBPVngcauCKYsBeA2wD3Cal3cXDKd7OEY4';
      const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.coords.latitude},${location.coords.longitude}&key=${GOOGLE_MAPS_API_KEY}&language=fr`;
      
      try {
        const geocodingResponse = await fetch(geocodingUrl);
        
        if (geocodingResponse.ok) {
          const geocodingData = await geocodingResponse.json();
          
          if (geocodingData.status === 'REQUEST_DENIED') {
            console.log('⚠️ API Geocoding non autorisée, utilisation du fallback');
          } else if (geocodingData.status === 'OK' && geocodingData.results && geocodingData.results.length > 0) {
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
            
            if (result.address_components) {
              const addressParts = [];
              const components = result.address_components;
              
              const streetNumber = components.find(c => c.types.includes('street_number'));
              const route = components.find(c => c.types.includes('route'));
              if (streetNumber || route) {
                const street = `${streetNumber ? streetNumber.long_name : ''} ${route ? route.long_name : ''}`.trim();
                if (street) addressParts.push(street);
              }
              
              const neighborhood = components.find(c => c.types.includes('neighborhood') || c.types.includes('sublocality'));
              if (neighborhood) {
                addressParts.push(neighborhood.long_name);
              }
              
              const city = components.find(c => c.types.includes('locality') || c.types.includes('administrative_area_level_2'));
              if (city) {
                addressParts.push(city.long_name);
              }
              
              const region = components.find(c => c.types.includes('administrative_area_level_1'));
              if (region) {
                addressParts.push(region.long_name);
              }
              
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
            console.log('⚠️ Erreur Google Geocoding:', geocodingData.status);
          }
        }
      } catch (geocodingError) {
        console.log('⚠️ Impossible de contacter Google Geocoding API, utilisation du fallback');
      }

      try {
        const address = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (address.length > 0) {
          const addr = address[0];
          const addressParts = [];
          
          if (addr.street) addressParts.push(addr.street);
          if (addr.streetNumber) addressParts.push(addr.streetNumber);
          if (addr.district) addressParts.push(addr.district);
          if (addr.subregion) addressParts.push(addr.subregion);
          if (addr.city) addressParts.push(addr.city);
          if (addr.region) addressParts.push(addr.region);
          if (addr.country) addressParts.push(addr.country);
          
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
        Alert.alert('Destination sélectionnée', `Adresse: ${fullAddress}`);
      }
    } catch (error) {
      console.error('Erreur de géocodage:', error);
      Alert.alert('Erreur', 'Impossible de convertir les coordonnées en adresse');
    }
  };

  const handleSubmit = () => {
    if (!formData.adresseDepart || !formData.destination || !formData.date || !formData.time) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    const cuisine = formData?.cuisine || {};

    if (requestType === 'demenagement') {
      const hasCuisineArticles = cuisine.grande || cuisine.moyen || cuisine.petit;
      
      if (!hasCuisineArticles) {
        Alert.alert('Erreur', 'Veuillez spécifier au moins une dimension d\'articles pour la cuisine');
        return;
      }
      
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
      if (!formData.notes) {
        Alert.alert('Erreur', 'Veuillez décrire l\'article à transporter');
        return;
      }
      
      if (formData.serviceType === 'avec_travailleurs' && formData.propertyType === 'appartement' && !formData.floor) {
        Alert.alert('Erreur', 'Veuillez spécifier l\'étage pour un appartement');
        return;
      }
    }

    if (requestType === 'demenagement') {
      for (let i = 0; i < formData.chambres.length; i++) {
        if (!formData.chambres[i].nom) {
          Alert.alert('Erreur', `Veuillez remplir le nom de la chambre ${i + 1}`);
          return;
        }
        
        const articles = formData.chambres[i].articles;
        const hasArticles = articles.grande || articles.moyen || articles.petit;
        
        if (!hasArticles) {
          Alert.alert('Erreur', `Veuillez spécifier au moins une dimension d'articles pour la chambre ${i + 1}`);
          return;
        }
        
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
        <View style={styles.reservationHeader}>
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
          )}
          <Text style={styles.reservationTitle}>Demande de Service</Text>
          <Text style={styles.reservationSubtitle}>
            {demenageur.company_name || `${demenageur.first_name} ${demenageur.last_name}`}
          </Text>
          <View style={styles.serviceTypeBadge}>
            <Ionicons 
              name={requestType === 'demenagement' ? 'home' : 'car'} 
              size={16} 
              color="#ff6b35" 
            />
            <Text style={styles.serviceTypeBadgeText}>
              {requestType === 'demenagement' ? 'Déménagement' : 'Transport'}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={styles.formSection}>
          {requestType === 'demenagement' && (
            <>
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
            </>
          )}

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

          {requestType === 'transport' && (
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
          )}

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

          {requestType === 'demenagement' && (
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
          )}
        </View>

        <View style={styles.formActions}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>Envoyer la demande</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
};

const styles = StyleSheet.create({
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
  backButton: {
    position: 'absolute',
    top: 50,
    left: 0,
    padding: 10,
    zIndex: 1,
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
    marginBottom: 10,
  },
  serviceTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  serviceTypeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff6b35',
    marginLeft: 6,
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
  chambreInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 6,
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
});

export default ReservationForm;

