import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const AbonnementScreen = () => {
  const [currentPlan, setCurrentPlan] = useState(null);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [subscriptionHistory, setSubscriptionHistory] = useState([]);

  useEffect(() => {
    loadCurrentPlan();
    loadAvailablePlans();
    loadSubscriptionHistory();
  }, []);

  const loadCurrentPlan = () => {
    // Simulation du plan actuel - à remplacer par l'API
    setCurrentPlan({
      id: 1,
      name: 'Plan Premium',
      price: 29.99,
      billingCycle: 'monthly',
      features: [
        'Missions illimitées',
        'Support prioritaire',
        'Statistiques avancées',
        'Badge Premium'
      ],
      status: 'active',
      nextBilling: '2024-02-15',
      autoRenew: true
    });
  };

  const loadAvailablePlans = () => {
    // Simulation des plans disponibles - à remplacer par l'API
    setAvailablePlans([
      {
        id: 1,
        name: 'Plan Gratuit',
        price: 0,
        billingCycle: 'monthly',
        features: [
          '5 missions par mois',
          'Support standard',
          'Statistiques de base'
        ],
        popular: false,
        current: true
      },
      {
        id: 2,
        name: 'Plan Premium',
        price: 29.99,
        billingCycle: 'monthly',
        features: [
          'Missions illimitées',
          'Support prioritaire',
          'Statistiques avancées',
          'Badge Premium'
        ],
        popular: true,
        current: true
      },
      {
        id: 3,
        name: 'Plan Pro',
        price: 49.99,
        billingCycle: 'monthly',
        features: [
          'Missions illimitées',
          'Support prioritaire 24/7',
          'Statistiques avancées',
          'Badge Pro',
          'Formation exclusive'
        ],
        popular: false,
        current: false
      }
    ]);
  };

  const loadSubscriptionHistory = () => {
    // Simulation de l'historique - à remplacer par l'API
    setSubscriptionHistory([
      {
        id: 1,
        plan: 'Plan Premium',
        amount: 29.99,
        date: '2024-01-15',
        status: 'paid',
        method: 'Carte bancaire'
      },
      {
        id: 2,
        plan: 'Plan Premium',
        amount: 29.99,
        date: '2023-12-15',
        status: 'paid',
        method: 'Carte bancaire'
      },
      {
        id: 3,
        plan: 'Plan Gratuit',
        amount: 0,
        date: '2023-11-15',
        status: 'active',
        method: 'Gratuit'
      }
    ]);
  };

  const upgradePlan = (plan) => {
    Alert.alert(
      'Changer de plan',
      `Êtes-vous sûr de vouloir passer au ${plan.name} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Confirmer', 
          onPress: () => {
            setCurrentPlan(plan);
            Alert.alert('Succès', 'Votre plan a été mis à jour avec succès !');
          }
        }
      ]
    );
  };

  const cancelSubscription = () => {
    Alert.alert(
      'Annuler l\'abonnement',
      'Êtes-vous sûr de vouloir annuler votre abonnement ? Vous perdrez l\'accès aux fonctionnalités premium.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Confirmer', 
          onPress: () => {
            setCurrentPlan({
              ...currentPlan,
              status: 'cancelled',
              autoRenew: false
            });
            Alert.alert('Succès', 'Votre abonnement a été annulé.');
          }
        }
      ]
    );
  };

  const toggleAutoRenew = () => {
    setCurrentPlan({
      ...currentPlan,
      autoRenew: !currentPlan.autoRenew
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#28a745';
      case 'cancelled': return '#dc3545';
      case 'expired': return '#ffc107';
      default: return '#8e8e93';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Actif';
      case 'cancelled': return 'Annulé';
      case 'expired': return 'Expiré';
      default: return 'Inconnu';
    }
  };

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Abonnement</Text>
        <TouchableOpacity style={styles.helpButton}>
          <Ionicons name="help-circle" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Plan actuel */}
        {currentPlan && (
          <View style={styles.currentPlanContainer}>
            <Text style={styles.sectionTitle}>Plan Actuel</Text>
            
            <View style={[styles.planCard, styles.currentPlanCard]}>
              <View style={styles.planHeader}>
                <View>
                  <Text style={styles.planName}>{currentPlan.name}</Text>
                  <Text style={styles.planPrice}>
                    {currentPlan.price === 0 ? 'Gratuit' : `${currentPlan.price}€/mois`}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentPlan.status) }]}>
                  <Text style={styles.statusBadgeText}>{getStatusText(currentPlan.status)}</Text>
                </View>
              </View>
              
              <View style={styles.planFeatures}>
                {currentPlan.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
              
              {currentPlan.status === 'active' && (
                <View style={styles.planDetails}>
                  <Text style={styles.planDetailText}>
                    Prochain paiement : {currentPlan.nextBilling}
                  </Text>
                  
                  <View style={styles.autoRenewContainer}>
                    <TouchableOpacity 
                      style={styles.autoRenewToggle}
                      onPress={toggleAutoRenew}
                    >
                      <Ionicons 
                        name={currentPlan.autoRenew ? "checkbox" : "square-outline"} 
                        size={20} 
                        color={currentPlan.autoRenew ? "#28a745" : "#8e8e93"} 
                      />
                      <Text style={styles.autoRenewText}>Renouvellement automatique</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={cancelSubscription}
                  >
                    <Text style={styles.cancelButtonText}>Annuler l'abonnement</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Plans disponibles */}
        <View style={styles.availablePlansContainer}>
          <Text style={styles.sectionTitle}>Plans Disponibles</Text>
          
          {availablePlans.map((plan) => (
            <View key={plan.id} style={styles.planCard}>
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>Populaire</Text>
                </View>
              )}
              
              <View style={styles.planHeader}>
                <View>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planPrice}>
                    {plan.price === 0 ? 'Gratuit' : `${plan.price}€/mois`}
                  </Text>
                </View>
                {plan.current && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>Actuel</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.planFeatures}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#28a745" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
              
              {!plan.current && (
                <TouchableOpacity 
                  style={styles.upgradeButton}
                  onPress={() => upgradePlan(plan)}
                >
                  <Text style={styles.upgradeButtonText}>
                    {plan.price === 0 ? 'Passer au gratuit' : 'Upgrader'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Historique des paiements */}
        <View style={styles.historyContainer}>
          <Text style={styles.sectionTitle}>Historique des Paiements</Text>
          
          {subscriptionHistory.map((payment) => (
            <View key={payment.id} style={styles.paymentItem}>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentPlan}>{payment.plan}</Text>
                <Text style={styles.paymentDate}>{payment.date}</Text>
                <Text style={styles.paymentMethod}>{payment.method}</Text>
              </View>
              <View style={styles.paymentAmount}>
                <Text style={styles.paymentAmountText}>
                  {payment.amount === 0 ? 'Gratuit' : `${payment.amount}€`}
                </Text>
                <View style={[styles.paymentStatus, { backgroundColor: getStatusColor(payment.status) }]}>
                  <Text style={styles.paymentStatusText}>{getStatusText(payment.status)}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  helpButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 20,
    marginBottom: 15,
  },
  currentPlanContainer: {
    marginTop: 20,
  },
  planCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative',
  },
  currentPlanCard: {
    borderWidth: 2,
    borderColor: '#ff6b35',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#ff6b35',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
  },
  popularBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  planPrice: {
    fontSize: 16,
    color: '#ff6b35',
    fontWeight: 'bold',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  currentBadge: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  planFeatures: {
    marginBottom: 15,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#333333',
    marginLeft: 8,
  },
  planDetails: {
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
    paddingTop: 15,
  },
  planDetailText: {
    fontSize: 14,
    color: '#8e8e93',
    marginBottom: 10,
  },
  autoRenewContainer: {
    marginBottom: 15,
  },
  autoRenewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  autoRenewText: {
    fontSize: 14,
    color: '#333333',
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  upgradeButton: {
    backgroundColor: '#ff6b35',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  paymentItem: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentPlan: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  paymentDate: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 2,
  },
  paymentMethod: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 2,
  },
  paymentAmount: {
    alignItems: 'flex-end',
  },
  paymentAmountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  paymentStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  paymentStatusText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: 'bold',
  },
});

export default AbonnementScreen;
