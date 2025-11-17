import React, { useState, useEffect, useRef, useContext } from 'react';
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
import { ClientNotificationContext } from '../../components/ClientNotificationProvider';
import { useTutorialRefs } from '../../hooks/useTutorialRefs';
import { useNavigationTutorial } from '../../hooks/useNavigationTutorial';

const SuivreScreen = ({ userData, navigation }) => {
  const [serviceRequests, setServiceRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNegotiateModal, setShowNegotiateModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [clientPrice, setClientPrice] = useState('');
  const [showDetailsScreen, setShowDetailsScreen] = useState(false);
  const [selectedRequestDetails, setSelectedRequestDetails] = useState(null);
  
  // WebSocket hook
  const { isConnected, lastUpdate, onEvent, offEvent } = useWebSocket(userData);
  const notificationContext = useContext(ClientNotificationContext);
  const markPriceProposalHandled = notificationContext?.markPriceProposalHandled;

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
          _id: req.id || req._id,
          serviceType: req.serviceType || req.service_type,
          departureAddress: req.departureAddress || req.departure_address,
          destinationAddress: req.destinationAddress || req.destination_address,
          scheduledDate: req.scheduledDate || req.scheduled_date,
          proposedPrice: req.proposedPrice || req.proposed_price || null,
          status: req.status,
          createdAt: req.createdAt || req.created_at,
          demenageurId: req.demenageurId || (req.mover_id ? {
            _id: req.mover_id,
            id: req.mover_id,
            first_name: req.demenageur_first_name || req.firstName,
            last_name: req.demenageur_last_name || req.lastName,
            firstName: req.firstName || req.demenageur_first_name,
            lastName: req.lastName || req.demenageur_last_name,
            email: req.demenageur_email || req.email,
            phone: req.demenageur_phone || req.phone
          } : null),
          priceNegotiation: req.priceNegotiation || (req.price_negotiation ? (typeof req.price_negotiation === 'string' ? JSON.parse(req.price_negotiation) : req.price_negotiation) : null),
          serviceDetails: req.serviceDetails || (req.service_details ? (typeof req.service_details === 'string' ? JSON.parse(req.service_details) : req.service_details) : null)
        }));
        
        console.log('✅ Demandes chargées:', transformedRequests.length);
        // Debug: Vérifier les prix proposés
        transformedRequests.forEach((req, index) => {
          console.log(`Demande ${index + 1}:`, {
            id: req._id,
            proposedPrice: req.proposedPrice,
            status: req.status,
            hasDemenageur: !!req.demenageurId
          });
        });
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

        if (markPriceProposalHandled) {
          markPriceProposalHandled(requestId);
        }
      } else {
        Alert.alert('Erreur', result.message || 'Erreur lors de l\'acceptation du prix');
      }
    } catch (error) {
      console.error('Erreur lors de l\'acceptation du prix:', error);
      Alert.alert('Erreur', 'Erreur de connexion');
    }
  };

  const scrollViewRef = useRef(null);
  
  // Refs pour le tutoriel
  const requestsListRef = useRef(null);
  const negotiateButtonRef = useRef(null);
  const detailsButtonRef = useRef(null);
  
  // Enregistrer les refs pour le tutoriel
  const tutorialRefs = {
    requestsList: requestsListRef,
    negotiateButton: negotiateButtonRef,
    detailsButton: detailsButtonRef,
  };
  
  useNavigationTutorial('Suivre', tutorialRefs);

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

        if (markPriceProposalHandled) {
          markPriceProposalHandled(selectedRequestId);
        }
      } else {
        Alert.alert('Erreur', result.message || 'Erreur lors de l\'envoi de la négociation');
      }
    } catch (error) {
      console.error('Erreur lors de la négociation:', error);
      Alert.alert('Erreur', 'Erreur de connexion');
    }
  };

  const handleOpenDetails = (request) => {
    setSelectedRequestDetails(request);
    setShowDetailsScreen(true);
  };

  const handleCloseDetails = () => {
    setShowDetailsScreen(false);
    setSelectedRequestDetails(null);
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

  const humanizeLabel = (label) => {
    if (!label) return '';

    const map = {
      notes: 'Notes',
      hasElevator: 'Ascenseur',
      serviceType: 'Type de service',
      propertyType: 'Type de propriété',
      floor: 'Étage',
      volume: 'Volume',
      distance: 'Distance',
      buildingAccess: 'Accessibilité du bâtiment',
      packing: 'Embouteillage',
      fragileItems: 'Articles fragiles',
      chambres: 'Chambres',
    };

    if (map[label]) {
      return map[label];
    }

    return label
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/^./, (char) => char.toUpperCase());
  };

  const formatDetailValue = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return `${value}`;
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non';

    if (Array.isArray(value)) {
      const nested = value
        .map((item) => formatDetailValue(item))
        .filter((item) => item && item.length > 0);
      return nested.length > 0
        ? nested.map((entry) => `• ${entry.replace(/\n/g, '\n  ')}`).join('\n')
        : '';
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value)
        .map(([key, val]) => {
          const formatted = formatDetailValue(val);
          if (!formatted) return null;
          return `${humanizeLabel(key)} : ${formatted}`;
        })
        .filter(Boolean);
      return entries.length > 0 ? entries.join('\n') : '';
    }

    return `${value}`;
  };

  const renderServiceDetails = (details) => {
    if (!details) return null;

    const normalizedDetails =
      typeof details === 'string'
        ? (() => {
            try {
              return JSON.parse(details);
            } catch (error) {
              return details;
            }
          })()
        : details;

    if (typeof normalizedDetails === 'string') {
      return (
        <Text style={styles.detailsValue}>{normalizedDetails}</Text>
      );
    }

    if (typeof normalizedDetails !== 'object' || normalizedDetails === null) {
      return null;
    }

    return Object.entries(normalizedDetails)
      .map(([key, value]) => {
        const formattedValue = formatDetailValue(value);
        if (!formattedValue) {
          return null;
        }

        return (
          <View key={key} style={styles.detailsListItem}>
            <Text style={styles.detailsListLabel}>{humanizeLabel(key)}</Text>
            <Text style={styles.detailsListValue}>{formattedValue}</Text>
          </View>
        );
      })
      .filter(Boolean);
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
      <TouchableOpacity
        ref={request === serviceRequests[0] ? detailsButtonRef : null}
        activeOpacity={0.85}
        onPress={() => handleOpenDetails(request)}
        style={styles.cardTouchableArea}
      >
        <View style={styles.requestHeader}>
          <View style={styles.requestInfo}>
            <Text style={styles.serviceType}>
              {request.serviceType === 'demenagement' ? 'Déménagement' : 'Transport'}
            </Text>
            <Text style={styles.demenageurName}>
              {request.demenageurId?.first_name || request.demenageurId?.firstName 
                ? `${request.demenageurId?.first_name || request.demenageurId?.firstName} ${request.demenageurId?.last_name || request.demenageurId?.lastName || ''}`.trim()
                : 'Non défini'}
            </Text>
          </View>
        </View>

        <View style={styles.requestDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color="#ff6b35" />
            <Text style={styles.detailText}>
              {request.departureAddress || request.from_address || 'Non défini'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="flag-outline" size={16} color="#ff6b35" />
            <Text style={styles.detailText}>
              {request.destinationAddress || request.to_address || 'Non défini'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#ff6b35" />
            <Text style={styles.detailText}>
              {request.scheduledDate || request.move_date ? formatDate(request.scheduledDate || request.move_date) : 'Non défini'}
            </Text>
          </View>
          
          {/* Affichage du prix proposé ou en négociation */}
          {(request.proposedPrice || request.proposedPrice === 0) && (
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
      </TouchableOpacity>

      {/* Boutons d'action pour les propositions de prix */}
      {(request.proposedPrice || request.proposedPrice === 0) && request.status === 'pending' && (
        <View style={styles.priceActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAcceptPrice(request._id)}
          >
            <Ionicons name="checkmark" size={16} color="#ffffff" />
            <Text style={styles.actionButtonText}>Accepter</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            ref={request === serviceRequests[0] ? negotiateButtonRef : null}
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
            Demande du {request.demenageurId?.first_name || request.demenageurId?.firstName 
              ? `${request.demenageurId?.first_name || request.demenageurId?.firstName} ${request.demenageurId?.last_name || request.demenageurId?.lastName || ''}`.trim()
              : 'Non défini'}
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

  if (showDetailsScreen && selectedRequestDetails) {
    return (
      <View style={styles.detailsScreenContainer}>
        <View style={styles.detailsScreenHeader}>
          <TouchableOpacity style={styles.detailsScreenBackButton} onPress={handleCloseDetails}>
            <Ionicons name="arrow-back" size={22} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.detailsScreenTitle}>Détails de la demande</Text>
        </View>

        <ScrollView contentContainerStyle={styles.detailsScreenContent} showsVerticalScrollIndicator={false}>
          <View style={styles.detailsCard}>
            <Text style={styles.detailsLabel}>Type de service</Text>
            <Text style={styles.detailsValue}>
              {selectedRequestDetails.serviceType === 'demenagement' ? 'Déménagement' : 'Transport'}
            </Text>

            <Text style={styles.detailsLabel}>Déménageur</Text>
            <Text style={styles.detailsValue}>
              {selectedRequestDetails.demenageurId?.first_name} {selectedRequestDetails.demenageurId?.last_name}
            </Text>
          </View>

          <View style={styles.detailsCard}>
            <Text style={styles.detailsLabel}>Adresse de départ</Text>
            <Text style={styles.detailsValue}>{selectedRequestDetails.departureAddress}</Text>

            <Text style={styles.detailsLabel}>Adresse d'arrivée</Text>
            <Text style={styles.detailsValue}>{selectedRequestDetails.destinationAddress}</Text>

            <Text style={styles.detailsLabel}>Date planifiée</Text>
            <Text style={styles.detailsValue}>{formatDate(selectedRequestDetails.scheduledDate)}</Text>
          </View>

          <View style={styles.detailsCard}>
            <Text style={styles.detailsLabel}>Statut</Text>
            <Text style={styles.detailsValue}>{getStatusText(selectedRequestDetails.status)}</Text>

            {selectedRequestDetails.proposedPrice && (
              <>
                <Text style={styles.detailsLabel}>Prix proposé</Text>
                <Text style={styles.detailsValue}>{selectedRequestDetails.proposedPrice} TND</Text>
              </>
            )}

            {selectedRequestDetails.priceNegotiation?.clientPrice && (
              <>
                <Text style={styles.detailsLabel}>Votre proposition</Text>
                <Text style={styles.detailsValue}>{selectedRequestDetails.priceNegotiation.clientPrice} TND</Text>
              </>
            )}
          </View>

          {selectedRequestDetails.serviceDetails && (
            <View style={styles.detailsCard}>
              <Text style={styles.detailsLabel}>Détails supplémentaires</Text>
              <View style={styles.detailsList}>
                {renderServiceDetails(selectedRequestDetails.serviceDetails) || (
                  <Text style={styles.detailsValue}>Aucune information supplémentaire</Text>
                )}
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.closeDetailsButton} onPress={handleCloseDetails}>
            <Text style={styles.closeDetailsText}>Retour</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        ref={(ref) => {
          scrollViewRef.current = ref;
          requestsListRef.current = ref;
        }}
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
  cardTouchableArea: {
    marginBottom: 12,
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
  // Styles pour le modal de détails
  detailsModalContent: {
    backgroundColor: '#1a0d2e',
    borderRadius: 24,
    padding: 0,
    width: '92%',
    maxWidth: 460,
    overflow: 'hidden',
  },
  detailsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  detailsSection: {
    gap: 12,
    marginBottom: 24,
  },
  detailsHeader: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 107, 53, 0.9)',
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  detailsHeaderSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    textAlign: 'center',
  },
  detailsBody: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 18,
  },
  detailsCard: {
    backgroundColor: '#241536',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.2)',
  },
  detailsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailsValue: {
    fontSize: 16,
    color: '#ffffff',
    lineHeight: 22,
  },
  detailsList: {
    marginTop: 14,
    gap: 14,
  },
  detailsListItem: {
    backgroundColor: '#2e1f45',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  detailsListLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ff9a70',
    marginBottom: 6,
  },
  detailsListValue: {
    fontSize: 14,
    color: '#f0e6ff',
    lineHeight: 20,
  },
  closeDetailsButton: {
    backgroundColor: 'rgba(255, 107, 53, 0.95)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 20,
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  closeDetailsText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  // New styles for details screen
  detailsScreenContainer: {
    flex: 1,
    backgroundColor: '#120824',
  },
  detailsScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#1e0f33',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 107, 53, 0.3)',
  },
  detailsScreenBackButton: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    borderRadius: 30,
    padding: 10,
    marginRight: 16,
  },
  detailsScreenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  detailsScreenContent: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    gap: 20,
    paddingBottom: 60,
  },
});

export default SuivreScreen;
