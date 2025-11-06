import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useWebSocket from '../../hooks/useWebSocket';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'react-native-calendars';

const MissionScreen = ({ userData, navigation }) => {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNegotiateModal, setShowNegotiateModal] = useState(false);
  const [selectedMissionId, setSelectedMissionId] = useState(null);
  const [demenageurPrice, setDemenageurPrice] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, accepted, in_progress, completed
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // WebSocket hook
  const { isConnected, lastUpdate, onEvent, offEvent } = useWebSocket(userData);

  useEffect(() => {
    if (userData) {
      loadMissions();
    }
  }, [userData]);

  // Écouter les événements WebSocket
  useEffect(() => {
    if (!isConnected) return;

    // Écouter les négociations de prix du client
    const handlePriceNegotiated = (data) => {
      console.log('💰 Prix négocié reçu:', data);
      loadMissions(false); // Recharger sans loading
    };

    // Écouter l'acceptation de prix par le client
    const handlePriceAccepted = (data) => {
      console.log('✅ Prix accepté reçu:', data);
      loadMissions(false); // Recharger sans loading
    };

    // Écouter les changements de statut (pour les mises à jour du client)
    const handleStatusUpdated = (data) => {
      console.log('📋 Statut mis à jour reçu:', data);
      // Mettre à jour directement l'état local pour une synchronisation instantanée
      setMissions(prevMissions => 
        prevMissions.map(mission => 
          mission._id === data.missionId 
            ? { ...mission, status: data.newStatus }
            : mission
        )
      );
    };

    // Écouter les nouvelles demandes de service
    const handleNewServiceRequest = (data) => {
      console.log('🆕 Nouvelle demande reçue:', data);
      loadMissions(false); // Recharger sans loading
    };

    // Écouter les propositions de prix (pour mettre à jour sa propre liste)
    const handlePriceProposed = (data) => {
      console.log('💰 Prix proposé reçu:', data);
      // Mettre à jour directement l'état local pour afficher le prix proposé
      setMissions(prevMissions => 
        prevMissions.map(mission => 
          mission._id === data.missionId 
            ? { ...mission, proposedPrice: data.proposedPrice }
            : mission
        )
      );
    };

    onEvent('price_negotiated', handlePriceNegotiated);
    onEvent('price_accepted', handlePriceAccepted);
    onEvent('status_updated', handleStatusUpdated);
    onEvent('new_service_request', handleNewServiceRequest);
    onEvent('price_proposed', handlePriceProposed);

    return () => {
      offEvent('price_negotiated', handlePriceNegotiated);
      offEvent('price_accepted', handlePriceAccepted);
      offEvent('status_updated', handleStatusUpdated);
      offEvent('new_service_request', handleNewServiceRequest);
      offEvent('price_proposed', handlePriceProposed);
    };
  }, [isConnected, onEvent, offEvent]);

  const loadMissions = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const API_BASE_URL = 'http://192.168.1.13:3000';

      const token = userData?.token;
      if (!token) {
        Alert.alert('Erreur', 'Token d\'authentification manquant');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/service-requests/demenageur`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        setMissions(result.serviceRequests);
      } else {
        Alert.alert('Erreur', result.message || 'Erreur lors du chargement des missions');
      }
    } catch (error) {
      console.error('Erreur de chargement des missions:', error);
      Alert.alert('Erreur', 'Erreur de connexion au serveur');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMissions();
    setRefreshing(false);
  };

  const updateMissionStatus = async (missionId, newStatus) => {
    try {
      const API_BASE_URL = 'http://192.168.1.13:3000';
      const token = userData?.token;

      const response = await fetch(`${API_BASE_URL}/api/service-requests/${missionId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert('Succès', 'Statut mis à jour avec succès');
        loadMissions(); // Recharger les missions
      } else {
        Alert.alert('Erreur', result.message || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur de mise à jour:', error);
      Alert.alert('Erreur', 'Erreur de connexion au serveur');
    }
  };

  const handleAcceptNegotiation = async (missionId) => {
    try {
      const API_BASE_URL = 'http://192.168.1.13:3000';
      const token = userData?.token;

      const response = await fetch(`${API_BASE_URL}/api/service-requests/${missionId}/accept-negotiation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert(
          'Négociation acceptée',
          'Vous avez accepté le prix du client. La mission va démarrer.',
          [
            {
              text: 'OK',
              onPress: () => loadMissions() // Recharger les missions
            }
          ]
        );
      } else {
        Alert.alert('Erreur', result.message || 'Erreur lors de l\'acceptation de la négociation');
      }
    } catch (error) {
      console.error('Erreur lors de l\'acceptation de la négociation:', error);
      Alert.alert('Erreur', 'Erreur de connexion');
    }
  };

  const handleNegotiate = (missionId) => {
    setSelectedMissionId(missionId);
    setDemenageurPrice('');
    setShowNegotiateModal(true);
  };

  const submitNegotiation = async () => {
    if (!demenageurPrice || isNaN(parseFloat(demenageurPrice)) || parseFloat(demenageurPrice) <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un prix valide');
      return;
    }

    try {
      const API_BASE_URL = 'http://192.168.1.13:3000';
      const token = userData?.token;

      const response = await fetch(`${API_BASE_URL}/api/service-requests/${selectedMissionId}/propose-price`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ proposedPrice: parseFloat(demenageurPrice) }),
      });

      const result = await response.json();

      if (result.success) {
        setShowNegotiateModal(false);
        Alert.alert(
          'Prix proposé',
          `Votre nouveau prix de ${demenageurPrice} TND a été envoyé au client`,
          [
            {
              text: 'OK',
              onPress: () => loadMissions() // Recharger les missions
            }
          ]
        );
      } else {
        Alert.alert('Erreur', result.message || 'Erreur lors de l\'envoi du prix');
      }
    } catch (error) {
      console.error('Erreur lors de la négociation:', error);
      Alert.alert('Erreur', 'Erreur de connexion');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ffc107';
      case 'accepted': return '#28a745';
      case 'in_progress': return '#17a2b8';
      case 'completed': return '#6c757d';
      case 'cancelled': return '#dc3545';
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
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fonction pour obtenir les dates des missions acceptées au format react-native-calendars
  const getMarkedDates = () => {
    const marked = {};
    missions
      .filter(mission => mission.status === 'accepted' && mission.scheduledDate)
      .forEach(mission => {
        const date = new Date(mission.scheduledDate);
        // Créer une clé au format YYYY-MM-DD
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        // Ajouter un marqueur pour cette date (cercle violet)
        if (!marked[dateKey]) {
          marked[dateKey] = {
            customStyles: {
              container: {
                backgroundColor: '#8B5CF6', // Violet
                borderRadius: 50,
                width: 36,
                height: 36,
                justifyContent: 'center',
                alignItems: 'center',
              },
              text: {
                color: '#ffffff',
                fontWeight: 'bold',
              },
            },
          };
        }
      });
    
    // Ajouter la date sélectionnée (si ce n'est pas déjà une mission acceptée)
    const selectedKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    if (!marked[selectedKey]) {
      marked[selectedKey] = { 
        selected: true, 
        selectedColor: '#ff6b35',
        selectedTextColor: '#ffffff'
      };
    }
    
    return marked;
  };

  const markedDates = getMarkedDates();

  const filteredMissions = missions.filter(mission => {
    // Filtre par statut
    let statusMatch = true;
    if (filter !== 'all') {
      statusMatch = mission.status === filter;
    }
    
    // Filtre par date sélectionnée (uniquement pour les missions acceptées)
    let dateMatch = true;
    if (mission.status === 'accepted' && mission.scheduledDate) {
      const missionDate = new Date(mission.scheduledDate);
      const selected = new Date(selectedDate);
      
      // Comparer uniquement la date (sans l'heure)
      dateMatch = missionDate.getFullYear() === selected.getFullYear() &&
                  missionDate.getMonth() === selected.getMonth() &&
                  missionDate.getDate() === selected.getDate();
    }
    
    return statusMatch && dateMatch;
  });

  const renderMission = (mission) => (
    <TouchableOpacity 
      key={mission._id} 
      style={styles.missionCard}
      onPress={() => navigation.navigate('MissionDetails', { mission, userData })}
      activeOpacity={0.7}
    >
      <View style={styles.missionHeader}>
        <View style={styles.missionInfo}>
          <Text style={styles.serviceType}>
            {mission.serviceType === 'demenagement' ? 'Déménagement' : 'Transport'}
          </Text>
          <Text style={styles.clientName}>
            {mission.clientId?.first_name} {mission.clientId?.last_name}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(mission.status) }]}>
          <Text style={styles.statusText}>{getStatusText(mission.status)}</Text>
        </View>
      </View>

      <View style={styles.missionDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color="#ff6b35" />
          <Text style={styles.detailText}>{mission.departureAddress}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="flag-outline" size={16} color="#ff6b35" />
          <Text style={styles.detailText}>{mission.destinationAddress}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#ff6b35" />
          <Text style={styles.detailText}>{formatDate(mission.scheduledDate)}</Text>
        </View>
        
        {/* Affichage des prix proposés et négociés */}
        {mission.proposedPrice && (
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color="#ff6b35" />
            <Text style={styles.detailText}>
              Votre prix: {mission.proposedPrice} TND
            </Text>
          </View>
        )}
        
        {mission.priceNegotiation?.clientPrice && (
          <View style={styles.detailRow}>
            <Ionicons name="swap-horizontal-outline" size={16} color="#ff6b35" />
            <Text style={styles.detailText}>
              Prix client: {mission.priceNegotiation.clientPrice} TND
            </Text>
          </View>
        )}
        
      </View>

      {/* Boutons d'action pour les négociations */}
      {mission.priceNegotiation?.clientPrice && mission.status === 'pending' && (
        <View style={styles.negotiationActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAcceptNegotiation(mission._id)}
          >
            <Ionicons name="checkmark" size={16} color="#ffffff" />
            <Text style={styles.actionButtonText}>Accepter</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.negotiateButton]}
            onPress={() => handleNegotiate(mission._id)}
          >
            <Ionicons name="swap-horizontal" size={16} color="#ffffff" />
            <Text style={styles.actionButtonText}>Négocier</Text>
          </TouchableOpacity>
        </View>
      )}

    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mes Missions</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement des missions...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Mes Missions</Text>
          <Text style={styles.syncIndicator}>
            <Ionicons 
              name={isConnected ? "wifi" : "wifi-outline"} 
              size={12} 
              color={isConnected ? "#4CAF50" : "#f44336"} 
            /> 
            {isConnected ? 'Temps réel' : 'Hors ligne'} - {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <TouchableOpacity style={styles.calendarButton} onPress={() => setShowCalendar(true)}>
          <Ionicons name="calendar-outline" size={20} color="#ffffff" />
          <Text style={styles.calendarButtonText}>
            {selectedDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Calendrier en modal */}
      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModalContent}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>Sélectionner une date</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <Calendar
              onDayPress={(day) => {
                setSelectedDate(new Date(day.dateString));
                setShowCalendar(false);
              }}
              markedDates={markedDates}
              markingType={'custom'}
              theme={{
                backgroundColor: '#ffffff',
                calendarBackground: '#ffffff',
                textSectionTitleColor: '#333333',
                selectedDayBackgroundColor: '#ff6b35',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#ff6b35',
                dayTextColor: '#333333',
                textDisabledColor: '#d9d9d9',
                dotColor: '#ff6b35',
                selectedDotColor: '#ffffff',
                arrowColor: '#ff6b35',
                monthTextColor: '#333333',
                indicatorColor: '#ff6b35',
                textDayFontWeight: '400',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '600',
                textDayFontSize: 16,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 13,
              }}
              locale='fr'
              enableSwipeMonths={true}
            />
          </View>
        </View>
      </Modal>

      {/* Filtres */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'all', label: 'Toutes' },
            { key: 'pending', label: 'En attente' },
            { key: 'accepted', label: 'Acceptées' },
            { key: 'in_progress', label: 'En cours' },
            { key: 'completed', label: 'Terminées' }
          ].map((filterOption) => (
            <TouchableOpacity
              key={filterOption.key}
              style={[
                styles.filterButton,
                filter === filterOption.key && styles.filterButtonActive
              ]}
              onPress={() => setFilter(filterOption.key)}
            >
              <Text style={[
                styles.filterButtonText,
                filter === filterOption.key && styles.filterButtonTextActive
              ]}>
                {filterOption.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredMissions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="briefcase-outline" size={64} color="#8e8e93" />
            <Text style={styles.emptyTitle}>Aucune mission</Text>
            <Text style={styles.emptyText}>
              {filter === 'all' 
                ? 'Vous n\'avez pas encore de missions'
                : `Aucune mission ${getStatusText(filter).toLowerCase()}`
              }
            </Text>
          </View>
        ) : (
          filteredMissions.map(renderMission)
        )}
      </ScrollView>

      {/* Modal pour négocier le prix */}
      <Modal
        visible={showNegotiateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNegotiateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Négocier le prix</Text>
            <Text style={styles.modalSubtitle}>Entrez votre nouveau prix proposé (en TND)</Text>
            
            <TextInput
              style={styles.priceInput}
              placeholder="Ex: 180"
              value={demenageurPrice}
              onChangeText={setDemenageurPrice}
              keyboardType="numeric"
              autoFocus={true}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowNegotiateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={submitNegotiation}
              >
                <Text style={styles.submitButtonText}>Envoyer</Text>
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
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#ff6b35',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  syncIndicator: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.8,
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
  },
  filterContainer: {
    backgroundColor: '#ffffff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#f1f1f1',
  },
  filterButtonActive: {
    backgroundColor: '#ff6b35',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8e8e93',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8e8e93',
    marginTop: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  missionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  missionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  missionInfo: {
    flex: 1,
  },
  serviceType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 14,
    color: '#8e8e93',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  missionDetails: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#333333',
    marginLeft: 10,
    flex: 1,
  },
  missionActions: {
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f1f1f1',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    flex: 1,
    marginHorizontal: 5,
  },
  acceptButton: {
    backgroundColor: '#28a745',
  },
  acceptButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 5,
  },
  declineButton: {
    backgroundColor: '#dc3545',
  },
  declineButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 5,
  },
  startButton: {
    backgroundColor: '#17a2b8',
  },
  startButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 5,
  },
  completeButton: {
    backgroundColor: '#6c757d',
  },
  completeButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 5,
  },
  // Styles pour les actions de négociation
  negotiationActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f1f1f1',
  },
  negotiateButton: {
    backgroundColor: '#ffc107',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
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
    backgroundColor: '#2d1b69',
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
  // Styles pour le calendrier
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  calendarButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  calendarModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d1b69',
  },
});

export default MissionScreen;