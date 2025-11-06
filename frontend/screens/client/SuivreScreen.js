import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useWebSocket from '../../hooks/useWebSocket';
import { getAPIBaseURL } from '../../config/api';

const SuivreScreen = ({ userData, navigation }) => {
  const [serviceRequests, setServiceRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNegotiateModal, setShowNegotiateModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [clientPrice, setClientPrice] = useState('');
  
  // WebSocket hook
  const { isConnected, lastUpdate, onEvent, offEvent } = useWebSocket(userData);

  useEffect(() => {
    if (userData) {
      loadServiceRequests();
    }
  }, [userData]);

  // Écouter les événements WebSocket
  useEffect(() => {
    if (!isConnected) return;

    // Écouter les propositions de prix du déménageur
    const handlePriceProposed = (data) => {
      console.log('💰 Prix proposé reçu:', data);
      // Mettre à jour directement l'état local pour une synchronisation instantanée
      setServiceRequests(prevRequests => 
        prevRequests.map(request => 
          request._id === data.missionId 
            ? { ...request, proposedPrice: data.proposedPrice }
            : request
        )
      );
      // Note: La notification est maintenant gérée globalement par ClientNotificationProvider
    };

    // Écouter l'acceptation de négociation par le déménageur
    const handleNegotiationAccepted = (data) => {
      console.log('✅ Négociation acceptée reçue:', data);
      loadServiceRequests(false); // Recharger sans loading
    };

    // Écouter les changements de statut
    const handleStatusUpdated = (data) => {
      console.log('📋 Statut mis à jour reçu:', data);
      // Mettre à jour directement l'état local pour une synchronisation instantanée
      setServiceRequests(prevRequests => 
        prevRequests.map(request => 
          request._id === data.missionId 
            ? { ...request, status: data.newStatus }
            : request
        )
      );
    };

    onEvent('price_proposed', handlePriceProposed);
    onEvent('negotiation_accepted', handleNegotiationAccepted);
    onEvent('status_updated', handleStatusUpdated);

    return () => {
      offEvent('price_proposed', handlePriceProposed);
      offEvent('negotiation_accepted', handleNegotiationAccepted);
      offEvent('status_updated', handleStatusUpdated);
    };
  }, [isConnected, onEvent, offEvent]);

  const loadServiceRequests = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      // Utiliser la configuration API centralisée
      const API_BASE_URL = getAPIBaseURL();
      console.log('🌐 Chargement des demandes depuis:', `${API_BASE_URL}/api/service-requests/client`);

      const token = userData?.token;
      if (!token) {
        console.error('❌ Token d\'authentification manquant');
        Alert.alert('Erreur', 'Token d\'authentification manquant');
        if (showLoading) {
          setLoading(false);
        }
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/service-requests/client`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 Réponse reçue:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur HTTP:', response.status, errorText);
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const result = await response.json();
      console.log('📋 Résultat:', result);

      if (result.success) {
        // Transformer les données pour correspondre au format attendu par le frontend
        const transformedRequests = result.serviceRequests.map(req => ({
          _id: req.id,
          serviceType: req.service_type,
          departureAddress: req.departure_address,
          destinationAddress: req.destination_address,
          scheduledDate: req.scheduled_date,
          proposedPrice: req.proposed_price,
          status: req.status,
          createdAt: req.created_at,
          demenageurId: {
            _id: req.demenageur_id,
            first_name: req.demenageur_first_name,
            last_name: req.demenageur_last_name,
            email: req.demenageur_email,
            phone: req.demenageur_phone
          },
          priceNegotiation: req.price_negotiation ? (typeof req.price_negotiation === 'string' ? JSON.parse(req.price_negotiation) : req.price_negotiation) : null,
          serviceDetails: req.service_details ? (typeof req.service_details === 'string' ? JSON.parse(req.service_details) : req.service_details) : null
        }));
        
        console.log('✅ Demandes chargées:', transformedRequests.length);
        setServiceRequests(transformedRequests);
      } else {
        console.error('❌ Erreur dans la réponse:', result.message);
        Alert.alert('Erreur', result.message || 'Erreur lors du chargement des demandes');
      }
    } catch (error) {
      console.error('❌ Erreur de chargement des demandes:', error);
      console.error('❌ Détails:', error.message);
      Alert.alert('Erreur', `Erreur de connexion au serveur: ${error.message}`);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadServiceRequests();
    setRefreshing(false);
  };

  const handleAcceptPrice = async (requestId) => {
    try {
      const API_BASE_URL = getAPIBaseURL();
      const token = userData?.token;

      const response = await fetch(`${API_BASE_URL}/api/service-requests/${requestId}/accept-price`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert(
          'Prix accepté',
          'Le prix a été accepté. La mission va démarrer.',
          [
            {
              text: 'OK',
              onPress: () => loadServiceRequests() // Recharger les données
            }
          ]
        );
      } else {
        Alert.alert('Erreur', result.message || 'Erreur lors de l\'acceptation du prix');
      }
    } catch (error) {
      console.error('Erreur lors de l\'acceptation du prix:', error);
      Alert.alert('Erreur', 'Erreur de connexion');
    }
  };

  const scrollViewRef = useRef(null);

  const handleNegotiatePrice = (requestId) => {
    setSelectedRequestId(requestId);
    setClientPrice('');
    setShowNegotiateModal(true);
  };

  const submitNegotiation = async () => {
    if (!clientPrice || isNaN(parseFloat(clientPrice)) || parseFloat(clientPrice) <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un prix valide');
      return;
    }

    try {
      const API_BASE_URL = getAPIBaseURL();
      const token = userData?.token;

      const response = await fetch(`${API_BASE_URL}/api/service-requests/${selectedRequestId}/negotiate-price`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clientPrice: parseFloat(clientPrice) }),
      });

      const result = await response.json();

      if (result.success) {
        setShowNegotiateModal(false);
        Alert.alert(
          'Prix négocié',
          `Votre prix de ${clientPrice} TND a été envoyé au déménageur`,
          [
            {
              text: 'OK',
              onPress: () => loadServiceRequests() // Recharger les données
            }
          ]
        );
      } else {
        Alert.alert('Erreur', result.message || 'Erreur lors de l\'envoi de la négociation');
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

  // Composant animé pour le badge "En cours"
  const AnimatedStatusBadge = ({ status, backgroundColor, children }) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      if (status === 'in_progress') {
        // Animation de pulsation infinie
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    }, [status, pulseAnim]);

    return (
      <Animated.View
        style={[
          styles.statusBadge,
          { backgroundColor },
          status === 'in_progress' && { transform: [{ scale: pulseAnim }] },
        ]}
      >
        {children}
      </Animated.View>
    );
  };

  const renderServiceRequest = (request) => (
    <View key={request._id} style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.requestInfo}>
          <Text style={styles.serviceType}>
            {request.serviceType === 'demenagement' ? 'Déménagement' : 'Transport'}
          </Text>
          <Text style={styles.demenageurName}>
            {request.demenageurId?.first_name} {request.demenageurId?.last_name}
          </Text>
        </View>
      </View>

      <View style={styles.requestDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color="#ff6b35" />
          <Text style={styles.detailText}>{request.departureAddress}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="flag-outline" size={16} color="#ff6b35" />
          <Text style={styles.detailText}>{request.destinationAddress}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#ff6b35" />
          <Text style={styles.detailText}>{formatDate(request.scheduledDate)}</Text>
        </View>
        
        {/* Affichage du prix proposé ou en négociation */}
        {request.proposedPrice && (
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color="#ff6b35" />
            <Text style={styles.detailText}>
              Prix proposé: {request.proposedPrice} TND
            </Text>
          </View>
        )}
        
        {request.priceNegotiation?.clientPrice && (
          <View style={styles.detailRow}>
            <Ionicons name="swap-horizontal-outline" size={16} color="#ff6b35" />
            <Text style={styles.detailText}>
              Votre prix: {request.priceNegotiation.clientPrice} TND
            </Text>
          </View>
        )}
      </View>

      {/* Boutons d'action pour les propositions de prix */}
      {request.proposedPrice && request.status === 'pending' && (
        <View style={styles.priceActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAcceptPrice(request._id)}
          >
            <Ionicons name="checkmark" size={16} color="#ffffff" />
            <Text style={styles.actionButtonText}>Accepter</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.negotiateButton]}
            onPress={() => handleNegotiatePrice(request._id)}
          >
            <Ionicons name="swap-horizontal" size={16} color="#ffffff" />
            <Text style={styles.actionButtonText}>Négocier</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.requestFooter}>
        <View style={styles.footerLeft}>
          <Text style={styles.requestDate}>
            Demande du {formatDate(request.createdAt)}
          </Text>
          <AnimatedStatusBadge 
            status={request.status} 
            backgroundColor={getStatusColor(request.status)}
          >
            <Text style={[styles.statusText, request.status === 'in_progress' && styles.statusTextBold]}>
              {getStatusText(request.status)}
            </Text>
          </AnimatedStatusBadge>
        </View>
        <TouchableOpacity style={styles.contactButton}>
          <Ionicons name="call-outline" size={16} color="#ff6b35" />
          <Text style={styles.contactButtonText}>Contacter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement des demandes...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        ref={scrollViewRef}
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {serviceRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={64} color="#8e8e93" />
            <Text style={styles.emptyTitle}>Aucune demande</Text>
            <Text style={styles.emptyText}>
              Vous n'avez pas encore fait de demande de service
            </Text>
          </View>
        ) : (
          serviceRequests.map(renderServiceRequest)
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
            <Text style={styles.modalSubtitle}>Entrez votre prix proposé (en TND)</Text>
            
            <TextInput
              style={styles.priceInput}
              placeholder="Ex: 150"
              value={clientPrice}
              onChangeText={setClientPrice}
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
    backgroundColor: '#2d1b4e', // Violet foncé
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
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
  requestCard: {
    backgroundColor: '#3a2a4a', // Violet plus clair pour les cartes
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
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  requestInfo: {
    flex: 1,
  },
  serviceType: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff', // Blanc pour être visible sur fond violet
    marginBottom: 4,
  },
  demenageurName: {
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
  statusTextBold: {
    fontWeight: 'bold',
  },
  requestDetails: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#E0E0E0', // Gris clair pour être visible sur fond violet
    marginLeft: 10,
    flex: 1,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#4a3a5a', // Bordure plus claire pour le fond violet
  },
  footerLeft: {
    flex: 1,
    marginRight: 15,
  },
  requestDate: {
    fontSize: 12,
    color: '#B0B0B0', // Gris plus clair pour la date
    marginBottom: 8,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  contactButtonText: {
    fontSize: 12,
    color: '#ff6b35',
    marginLeft: 4,
    fontWeight: '600',
  },
  // Styles pour les actions de prix
  priceActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#4a3a5a', // Bordure plus claire pour le fond violet
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#28a745',
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
    color: '#ff6b35',
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
    backgroundColor: '#ff6b35',
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
});

export default SuivreScreen;
