import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import useWebSocket from '../../hooks/useWebSocket';
import { getAPIBaseURL } from '../../config/api';

const MissionDetailsScreen = ({ route, navigation }) => {
  const { mission, userData, onRouteData } = route.params;
  
  // Vérifier que navigation est défini
  if (!navigation) {
    console.error('❌ Navigation non définie dans MissionDetailsScreen');
    return null;
  }
  
  console.log('✅ Navigation définie dans MissionDetailsScreen:', !!navigation);
  const [loading, setLoading] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [proposedPrice, setProposedPrice] = useState('');
  const [currentMission, setCurrentMission] = useState(mission);

  const API_BASE_URL = getAPIBaseURL();
  
  // WebSocket hook
  const { isConnected, onEvent, offEvent } = useWebSocket(userData);

  // Écouter les événements WebSocket
  useEffect(() => {
    if (!isConnected) return;

    // Écouter les changements de statut
    const handleStatusUpdated = (data) => {
      const missionId = currentMission.id || currentMission._id;
      if (data.missionId === missionId) {
        console.log('📋 Statut mis à jour reçu:', data);
        setCurrentMission(prev => ({
          ...prev,
          status: data.newStatus
        }));
      }
    };

    // Écouter les négociations de prix du client
    const handlePriceNegotiated = (data) => {
      const missionId = currentMission.id || currentMission._id;
      if (data.missionId === missionId) {
        console.log('💰 Prix négocié reçu:', data);
        setCurrentMission(prev => ({
          ...prev,
          priceNegotiation: {
            ...prev.priceNegotiation,
            clientPrice: data.clientPrice,
            status: 'negotiating'
          }
        }));
      }
    };

    // Écouter l'acceptation de prix par le client
    const handlePriceAccepted = (data) => {
      const missionId = currentMission.id || currentMission._id;
      if (data.missionId === missionId) {
        console.log('✅ Prix accepté reçu:', data);
        setCurrentMission(prev => ({
          ...prev,
          actualPrice: data.acceptedPrice,
          status: 'accepted',
          priceNegotiation: {
            ...prev.priceNegotiation,
            status: 'accepted'
          }
        }));
      }
    };

    onEvent('status_updated', handleStatusUpdated);
    onEvent('price_negotiated', handlePriceNegotiated);
    onEvent('price_accepted', handlePriceAccepted);

    return () => {
      offEvent('status_updated', handleStatusUpdated);
      offEvent('price_negotiated', handlePriceNegotiated);
      offEvent('price_accepted', handlePriceAccepted);
    };
  }, [isConnected, onEvent, offEvent, currentMission.id, currentMission._id]);

  const updateMissionStatus = async (newStatus) => {
    try {
      setLoading(true);
      
      const missionId = currentMission.id || currentMission._id;
      const response = await fetch(`${API_BASE_URL}/api/service-requests/${missionId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${userData.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (result.success) {
        // Mettre à jour l'état local immédiatement
        setCurrentMission(prev => ({
          ...prev,
          status: newStatus
        }));
        
        // Pour les missions démarrées, ne pas afficher d'alerte car on navigue directement vers l'accueil
        if (newStatus !== 'in_progress') {
          Alert.alert(
            'Succès',
            `Mission ${newStatus === 'accepted' ? 'acceptée' : 
                      newStatus === 'completed' ? 'terminée' : 'refusée'} avec succès`,
            [
              {
                text: 'OK',
                onPress: () => navigation && navigation.goBack()
              }
            ]
          );
        }
      } else {
        Alert.alert('Erreur', result.message || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      Alert.alert('Erreur', 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    Alert.alert(
      'Accepter la mission',
      'Êtes-vous sûr de vouloir accepter cette mission ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Accepter', onPress: () => updateMissionStatus('accepted') }
      ]
    );
  };

  const handleRefuse = () => {
    Alert.alert(
      'Refuser la mission',
      'Êtes-vous sûr de vouloir refuser cette mission ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Refuser', style: 'destructive', onPress: () => updateMissionStatus('cancelled') }
      ]
    );
  };

  const handleStart = async () => {
    Alert.alert(
      'Démarrer la mission',
      'Êtes-vous prêt à démarrer cette mission ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Démarrer', 
          onPress: async () => {
            try {
              // Récupérer la position actuelle du déménageur
              const { status } = await Location.requestForegroundPermissionsAsync();
              let demenageurLocation = null;
              
              if (status === 'granted') {
                try {
                  const currentLocation = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                  });
                  demenageurLocation = {
                    latitude: currentLocation.coords.latitude,
                    longitude: currentLocation.coords.longitude
                  };
                  console.log('📍 Position déménageur récupérée:', demenageurLocation);
                } catch (locationError) {
                  console.error('Erreur lors de la récupération de la position:', locationError);
                }
              }
              
              // Mettre à jour le statut de la mission
              updateMissionStatus('in_progress');
              
              // Naviguer vers la carte avec l'itinéraire
              console.log('🚀 Navigation vers Accueil avec itinéraire:', {
                departureAddress: currentMission.departureAddress,
                destinationAddress: currentMission.destinationAddress,
                clientName: currentMission.clientId?.firstName || currentMission.clientId?.first_name || 'Client',
                demenageurLocation: demenageurLocation
              });
              
              // Préparer les données de route
              const routeDataToPass = {
                departureAddress: currentMission.departureAddress,
                destinationAddress: currentMission.destinationAddress,
                missionId: currentMission.id || currentMission._id,
                clientName: currentMission.clientId?.firstName || currentMission.clientId?.first_name || 'Client',
                serviceType: currentMission.serviceType,
                demenageurLocation: demenageurLocation // Position du déménageur
              };
              
              console.log('🚀 MissionDetailsScreen - Données de route préparées:', routeDataToPass);
              
              // Utiliser la fonction de callback pour passer les données de route
              if (onRouteData) {
                console.log('✅ MissionDetailsScreen - onRouteData disponible, passage des données');
                onRouteData({
                  showRoute: true,
                  routeData: routeDataToPass
                });
                
                // Ne pas naviguer ici, laisser handleRouteData dans DemenageurNavigator le faire
                console.log('✅ MissionDetailsScreen - Données passées à onRouteData');
              } else {
                console.log('⚠️ MissionDetailsScreen - onRouteData non disponible, navigation directe');
                // Fallback: navigation directe
                navigation.navigate('Accueil', {
                  showRoute: true,
                  routeData: routeDataToPass
                });
              }
            } catch (error) {
              console.error('Erreur lors du démarrage:', error);
              Alert.alert('Erreur', 'Impossible de démarrer la mission');
            }
          }
        }
      ]
    );
  };

  const handleComplete = () => {
    Alert.alert(
      'Terminer la mission',
      'Confirmez-vous que cette mission est terminée ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Terminer', onPress: () => updateMissionStatus('completed') }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ff9500';
      case 'accepted': return '#34c759';
      case 'in_progress': return '#007aff';
      case 'completed': return '#8e8e93';
      case 'cancelled': return '#ff3b30';
      default: return '#8e8e93';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'accepted': return 'Acceptée';
      case 'in_progress': return 'En cours';
      case 'completed': return 'Terminée';
      case 'cancelled': return 'Annulée';
      default: return 'Inconnu';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Non défini';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Date invalide';
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Date invalide';
    }
  };

  const handleProposePrice = () => {
    setProposedPrice('');
    setShowPriceModal(true);
  };

  const handleSubmitPrice = () => {
    if (proposedPrice && !isNaN(parseFloat(proposedPrice)) && parseFloat(proposedPrice) > 0) {
      setShowPriceModal(false);
      proposePrice(parseFloat(proposedPrice));
    } else {
      Alert.alert('Erreur', 'Veuillez entrer un prix valide');
    }
  };

  const proposePrice = async (price) => {
    try {
      setLoading(true);
      
      const missionId = currentMission.id || currentMission._id;
      const response = await fetch(`${API_BASE_URL}/api/service-requests/${missionId}/propose-price`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userData.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ proposedPrice: price }),
      });

      const result = await response.json();

      if (result.success) {
        // Mettre à jour l'état local immédiatement
        setCurrentMission(prev => ({
          ...prev,
          proposedPrice: price
        }));
        
        Alert.alert(
          'Prix proposé',
          `Votre prix de ${price} TND a été envoyé au client`,
          [
            {
              text: 'OK',
              onPress: () => navigation && navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert('Erreur', result.message || 'Erreur lors de l\'envoi du prix');
      }
    } catch (error) {
      console.error('Erreur lors de la proposition de prix:', error);
      Alert.alert('Erreur', 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const renderActionButtons = () => {
    switch (currentMission.status) {
      case 'pending':
        return (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.proposeButton]} 
              onPress={handleProposePrice}
              disabled={loading}
            >
              <Ionicons name="cash" size={20} color="#ffffff" />
              <Text style={styles.actionButtonText}>Proposer un prix</Text>
            </TouchableOpacity>
          </View>
        );
      case 'accepted':
        return (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.startButton]} 
              onPress={handleStart}
              disabled={loading}
            >
              <Ionicons name="play" size={20} color="#ffffff" />
              <Text style={styles.actionButtonText}>Démarrer</Text>
            </TouchableOpacity>
          </View>
        );
      case 'in_progress':
        return (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.completeButton]} 
              onPress={handleComplete}
              disabled={loading}
            >
              <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
              <Text style={styles.actionButtonText}>Terminer</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header avec statut */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation && navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Détails de la mission</Text>
            <View style={styles.headerRight}>
              <Text style={styles.syncIndicator}>
                <Ionicons 
                  name={isConnected ? "wifi" : "wifi-outline"} 
                  size={12} 
                  color={isConnected ? "#4CAF50" : "#f44336"} 
                /> 
                {isConnected ? 'Temps réel' : 'Hors ligne'}
              </Text>
            </View>
          </View>
          
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentMission.status) }]}>
              <Text style={styles.statusText}>{getStatusText(currentMission.status)}</Text>
            </View>
          </View>
        </View>

        {/* Informations générales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations générales</Text>
          
          {/* Prénom du client - toujours affiché */}
          <View style={styles.infoRow}>
            <Ionicons name="person" size={20} color="#ff6b35" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Client</Text>
              <Text style={styles.infoValue}>
                {currentMission.clientId?.firstName || currentMission.clientId?.first_name || 'Non disponible'}
              </Text>
            </View>
          </View>

          {/* Message d'information si la demande n'est pas encore acceptée ou est annulée */}
          {(currentMission.status === 'pending' || currentMission.status === 'cancelled') && (
            <View style={styles.infoRow}>
              <Ionicons name="information-circle" size={20} color="#ff9500" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Information</Text>
                <Text style={styles.infoValue}>Les informations client seront disponibles après acceptation de la demande</Text>
              </View>
            </View>
          )}

          {/* Téléphone et email - affichés seulement si la demande est acceptée, en cours ou terminée */}
          {currentMission.status !== 'pending' && currentMission.status !== 'cancelled' && (
            <>
              <View style={styles.infoRow}>
                <Ionicons name="call" size={20} color="#ff6b35" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Téléphone</Text>
                  <Text style={styles.infoValue}>{currentMission.clientId?.phone || 'Non renseigné'}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="mail" size={20} color="#ff6b35" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{currentMission.clientId?.email}</Text>
                </View>
              </View>
            </>
          )}

          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={20} color="#ff6b35" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Date de création</Text>
              <Text style={styles.infoValue}>{formatDate(currentMission.createdAt)}</Text>
            </View>
          </View>

          {currentMission.scheduledDate && (
            <View style={styles.infoRow}>
              <Ionicons name="time" size={20} color="#ff6b35" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Date programmée</Text>
                <Text style={styles.infoValue}>{formatDate(currentMission.scheduledDate)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Type de service */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Type de service</Text>
          
          <View style={styles.serviceTypeContainer}>
            <Ionicons 
              name={currentMission.serviceType === 'demenagement' ? 'home' : 'car'} 
              size={24} 
              color="#ff6b35" 
            />
            <Text style={styles.serviceTypeText}>
              {currentMission.serviceType === 'demenagement' ? 'Déménagement' : 'Transport'}
            </Text>
          </View>
        </View>

        {/* Adresses */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adresses</Text>
          
          <View style={styles.addressContainer}>
            <View style={styles.addressRow}>
              <Ionicons name="location" size={20} color="#ff6b35" />
              <View style={styles.addressContent}>
                <Text style={styles.addressLabel}>Départ</Text>
                <Text style={styles.addressValue}>{currentMission.departureAddress}</Text>
              </View>
            </View>
            
            <View style={styles.addressRow}>
              <Ionicons name="flag" size={20} color="#ff6b35" />
              <View style={styles.addressContent}>
                <Text style={styles.addressLabel}>Destination</Text>
                <Text style={styles.addressValue}>{currentMission.destinationAddress}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Détails du service */}
        {currentMission.serviceType === 'demenagement' && currentMission.serviceDetails && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Détails du déménagement</Text>
            
            {currentMission.serviceDetails.cuisine && (
              <View style={styles.detailContainer}>
                <Text style={styles.detailTitle}>Cuisine</Text>
                <View style={styles.dimensionRow}>
                  {currentMission.serviceDetails.cuisine.grande && (
                    <Text style={styles.dimensionText}>
                      Grande: {currentMission.serviceDetails.cuisine.grande}
                    </Text>
                  )}
                  {currentMission.serviceDetails.cuisine.moyen && (
                    <Text style={styles.dimensionText}>
                      Moyen: {currentMission.serviceDetails.cuisine.moyen}
                    </Text>
                  )}
                  {currentMission.serviceDetails.cuisine.petit && (
                    <Text style={styles.dimensionText}>
                      Petit: {currentMission.serviceDetails.cuisine.petit}
                    </Text>
                  )}
                </View>
              </View>
            )}

            {currentMission.serviceDetails.chambres && currentMission.serviceDetails.chambres.length > 0 && (
              <View style={styles.detailContainer}>
                <Text style={styles.detailTitle}>Chambres</Text>
                {currentMission.serviceDetails.chambres.map((chambre, index) => (
                  <View key={index} style={styles.chambreContainer}>
                    <Text style={styles.chambreName}>{chambre.nom}</Text>
                    <View style={styles.dimensionRow}>
                      {chambre.articles.grande && (
                        <Text style={styles.dimensionText}>
                          Grande: {chambre.articles.grande}
                        </Text>
                      )}
                      {chambre.articles.moyen && (
                        <Text style={styles.dimensionText}>
                          Moyen: {chambre.articles.moyen}
                        </Text>
                      )}
                      {chambre.articles.petit && (
                        <Text style={styles.dimensionText}>
                          Petit: {chambre.articles.petit}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {currentMission.serviceDetails.serviceType && (
              <View style={styles.detailContainer}>
                <Text style={styles.detailTitle}>Type de service</Text>
                <Text style={styles.detailValue}>
                  {currentMission.serviceDetails.serviceType === 'avec_travailleurs' ? 'Camion avec travailleurs' : 'Camion avec chauffeur uniquement'}
                </Text>
              </View>
            )}

            {currentMission.serviceDetails.propertyType && (
              <View style={styles.detailContainer}>
                <Text style={styles.detailTitle}>Type de propriété</Text>
                <Text style={styles.detailValue}>
                  {currentMission.serviceDetails.propertyType === 'maison' ? 'Maison' : 'Appartement'}
                </Text>
              </View>
            )}

            {currentMission.serviceDetails.floor && (
              <View style={styles.detailContainer}>
                <Text style={styles.detailTitle}>Étage</Text>
                <Text style={styles.detailValue}>{currentMission.serviceDetails.floor}</Text>
              </View>
            )}

            {currentMission.serviceDetails.hasElevator !== undefined && (
              <View style={styles.detailContainer}>
                <Text style={styles.detailTitle}>Ascenseur</Text>
                <Text style={styles.detailValue}>
                  {currentMission.serviceDetails.hasElevator ? 'Oui' : 'Non'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Détails du transport */}
        {currentMission.serviceType === 'transport' && currentMission.serviceDetails && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Détails du transport</Text>
            
            {currentMission.serviceDetails.article && (
              <View style={styles.detailContainer}>
                <Text style={styles.detailTitle}>Article à transporter</Text>
                <Text style={styles.detailValue}>{currentMission.serviceDetails.article}</Text>
              </View>
            )}

            {currentMission.serviceDetails.serviceType && (
              <View style={styles.detailContainer}>
                <Text style={styles.detailTitle}>Type de service</Text>
                <Text style={styles.detailValue}>
                  {currentMission.serviceDetails.serviceType === 'avec_travailleurs' ? 'Camion avec travailleurs' : 'Camion avec chauffeur uniquement'}
                </Text>
              </View>
            )}

            {currentMission.serviceDetails.propertyType && (
              <View style={styles.detailContainer}>
                <Text style={styles.detailTitle}>Type de propriété</Text>
                <Text style={styles.detailValue}>
                  {currentMission.serviceDetails.propertyType === 'maison' ? 'Maison' : 'Appartement'}
                </Text>
              </View>
            )}

            {currentMission.serviceDetails.floor && (
              <View style={styles.detailContainer}>
                <Text style={styles.detailTitle}>Étage</Text>
                <Text style={styles.detailValue}>{currentMission.serviceDetails.floor}</Text>
              </View>
            )}

            {currentMission.serviceDetails.hasElevator !== undefined && (
              <View style={styles.detailContainer}>
                <Text style={styles.detailTitle}>Ascenseur</Text>
                <Text style={styles.detailValue}>
                  {currentMission.serviceDetails.hasElevator ? 'Oui' : 'Non'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Notes */}
        {currentMission.serviceDetails?.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{currentMission.serviceDetails.notes}</Text>
          </View>
        )}

      </ScrollView>

      {/* Boutons d'action */}
      {renderActionButtons()}

      {/* Modal pour proposer un prix */}
      <Modal
        visible={showPriceModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPriceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Proposer un prix</Text>
            <Text style={styles.modalSubtitle}>Entrez votre prix proposé (en TND)</Text>
            
            <TextInput
              style={styles.priceInput}
              placeholder="Ex: 200"
              value={proposedPrice}
              onChangeText={setProposedPrice}
              keyboardType="numeric"
              autoFocus={true}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowPriceModal(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSubmitPrice}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>Proposer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#2d1b69',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  placeholder: {
    width: 34,
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d1b69',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoContent: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#8e8e93',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  serviceTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    padding: 15,
    borderRadius: 8,
  },
  serviceTypeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ff6b35',
    marginLeft: 10,
  },
  addressContainer: {
    gap: 15,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressContent: {
    marginLeft: 15,
    flex: 1,
  },
  addressLabel: {
    fontSize: 12,
    color: '#8e8e93',
    marginBottom: 2,
  },
  addressValue: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
  },
  detailContainer: {
    marginBottom: 15,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2d1b69',
    marginBottom: 5,
  },
  detailValue: {
    fontSize: 14,
    color: '#000000',
  },
  dimensionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dimensionText: {
    fontSize: 12,
    color: '#8e8e93',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  chambreContainer: {
    marginBottom: 10,
  },
  chambreName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ff6b35',
    marginBottom: 5,
  },
  notesText: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  priceText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff6b35',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#34c759',
  },
  refuseButton: {
    backgroundColor: '#ff3b30',
  },
  startButton: {
    backgroundColor: '#007aff',
  },
  completeButton: {
    backgroundColor: '#ff6b35',
  },
  proposeButton: {
    backgroundColor: '#34c759',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Styles pour le modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 25,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d1b69',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  submitButton: {
    backgroundColor: '#34c759',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  syncIndicator: {
    color: '#ffffff',
    fontSize: 10,
    opacity: 0.8,
    textAlign: 'right',
  },
});

export default MissionDetailsScreen;
