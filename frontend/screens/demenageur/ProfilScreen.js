import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useWebSocket from '../../hooks/useWebSocket';
import { getAPIBaseURL } from '../../config/api';

const ProfilScreen = ({ userData, onLogout }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);

  // WebSocket hook pour les mises à jour en temps réel
  const { isConnected, onEvent, offEvent } = useWebSocket(userData);

  useEffect(() => {
    console.log('ProfilScreen useEffect - userData:', userData);
    if (userData) {
      loadUserProfile();
      loadStatistics();
    } else {
      console.log('ProfilScreen: userData is null or undefined');
    }
  }, [userData]);

  // Écouter les événements WebSocket pour mettre à jour les statistiques
  useEffect(() => {
    if (!isConnected) return;

    // Écouter les changements de statut pour mettre à jour les statistiques
    const handleStatusUpdated = (data) => {
      console.log('📊 Statut mis à jour - rechargement des statistiques:', data);
      loadStatistics(false); // Recharger les statistiques sans loading
    };

    // Écouter les nouvelles demandes pour mettre à jour les statistiques
    const handleNewServiceRequest = (data) => {
      console.log('📊 Nouvelle demande - rechargement des statistiques:', data);
      loadStatistics(false); // Recharger les statistiques sans loading
    };

    onEvent('status_updated', handleStatusUpdated);
    onEvent('new_service_request', handleNewServiceRequest);

    return () => {
      offEvent('status_updated', handleStatusUpdated);
      offEvent('new_service_request', handleNewServiceRequest);
    };
  }, [isConnected, onEvent, offEvent]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      console.log('loadUserProfile called with userData:', userData);
      
      const API_BASE_URL = getAPIBaseURL();

      const token = userData?.token;
      console.log('Token:', token);
      
      if (!token) {
        console.log('No token found');
        Alert.alert('Erreur', 'Token d\'authentification manquant');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/demenageur/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      console.log('API Response:', result);

      if (result.success) {
        const user = result.user;
        setUserProfile({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          avatar: user.firstName?.charAt(0) || 'D',
          companyName: 'Déménageur Liberty Mobile',
          address: user.address || 'Non renseigné',
          identityCardNumber: user.identityCardNumber || 'Non renseigné',
          rating: 0,
          totalReviews: 0,
          joinDate: user.createdAt,
          isVerified: user.isVerified,
          status: user.status
        });
      } else {
        Alert.alert('Erreur', result.message || 'Erreur lors du chargement du profil');
      }
    } catch (error) {
      console.error('Erreur de chargement du profil:', error);
      Alert.alert('Erreur', 'Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const API_BASE_URL = getAPIBaseURL();
      const token = userData?.token;

      if (!token) {
        console.log('No token found for statistics');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/statistics/demenageur`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Vérifier que la réponse est bien JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('❌ Réponse non-JSON reçue:', {
          status: response.status,
          contentType: contentType,
          url: response.url
        });
        throw new Error(`Réponse non-JSON reçue (${response.status}): ${contentType}`);
      }

      const result = await response.json();

      if (result.success) {
        setStatistics(result.statistics);
        console.log('📊 Statistiques chargées:', result.statistics);
      } else {
        console.error('Erreur lors du chargement des statistiques:', result.message);
        // En cas d'erreur, utiliser des valeurs par défaut
        setStatistics({
          totalMissions: 0,
          completedMissions: 0,
          cancelledMissions: 0,
          totalEarnings: 0,
          completionRate: 0,
          averageResponseTime: 'N/A',
          monthlyStats: [],
          recentMissions: []
        });
      }
    } catch (error) {
      console.error('Erreur de chargement des statistiques:', error);
      // En cas d'erreur, utiliser des valeurs par défaut
      setStatistics({
        totalMissions: 0,
        completedMissions: 0,
        cancelledMissions: 0,
        totalEarnings: 0,
        completionRate: 0,
        averageResponseTime: 'N/A',
        monthlyStats: [],
        recentMissions: []
      });
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const editProfile = () => {
    Alert.alert('Modifier le profil', 'Fonctionnalité à venir');
  };

  const changePassword = () => {
    Alert.alert('Changer le mot de passe', 'Fonctionnalité à venir');
  };

  const manageDocuments = () => {
    Alert.alert('Gérer les documents', 'Fonctionnalité à venir');
  };

  const contactSupport = () => {
    Alert.alert('Contacter le support', 'Fonctionnalité à venir');
  };

  const logout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Déconnexion', 
          style: 'destructive',
          onPress: onLogout
        }
      ]
    );
  };

  const getAvatarColor = (avatar) => {
    const colors = ['#ff6b35', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];
    return colors[avatar.charCodeAt(0) % colors.length];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#28a745';
      case 'inactive': return '#ffc107';
      case 'suspended': return '#dc3545';
      case 'banned': return '#dc3545';
      case 'pending_verification': return '#ffc107';
      default: return '#8e8e93';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available': return 'Disponible';
      case 'inactive': return 'Inactif';
      case 'suspended': return 'Suspendu';
      case 'banned': return 'Banni';
      case 'pending_verification': return 'En attente de vérification';
      default: return 'Inconnu';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profil</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement du profil...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Profil</Text>
          <Text style={styles.syncIndicator}>
            <Ionicons 
              name={isConnected ? "wifi" : "wifi-outline"} 
              size={12} 
              color={isConnected ? "#4CAF50" : "#f44336"} 
            /> 
            {isConnected ? 'Temps réel' : 'Hors ligne'}
          </Text>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={editProfile}>
          <Ionicons name="create" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Informations personnelles */}
        {userProfile && (
          <View style={styles.profileSection}>
            <View style={styles.profileCard}>
              <View style={styles.profileHeader}>
                <View style={[styles.avatar, { backgroundColor: getAvatarColor(userProfile.avatar) }]}>
                  <Text style={styles.avatarText}>{userProfile.avatar}</Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>
                    {userProfile.firstName} {userProfile.lastName}
                  </Text>
                  <Text style={styles.companyName}>{userProfile.companyName}</Text>
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={16} color="#ffc107" />
                    <Text style={styles.ratingText}>{userProfile.rating}</Text>
                    <Text style={styles.reviewsText}>({userProfile.totalReviews} avis)</Text>
                  </View>
                  <View style={styles.statusContainer}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(userProfile.status) }]} />
                    <Text style={styles.statusText}>{getStatusText(userProfile.status)}</Text>
                    {userProfile.isVerified && (
                      <Ionicons name="checkmark-circle" size={16} color="#28a745" style={styles.verifiedIcon} />
                    )}
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Statistiques */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Statistiques</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle" size={24} color="#28a745" />
              <Text style={styles.statNumber}>{statistics.completedMissions}</Text>
              <Text style={styles.statLabel}>Missions terminées</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="cash" size={24} color="#28a745" />
              <Text style={styles.statNumber}>{statistics.totalEarnings} TND</Text>
              <Text style={styles.statLabel}>Gains totaux</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="star" size={24} color="#ffc107" />
              <Text style={styles.statNumber}>{statistics.averageRating}</Text>
              <Text style={styles.statLabel}>Note moyenne</Text>
            </View>
            
            <View style={styles.statCard}>
              <Ionicons name="time" size={24} color="#17a2b8" />
              <Text style={styles.statNumber}>{statistics.responseTime}</Text>
              <Text style={styles.statLabel}>Temps de réponse</Text>
            </View>
          </View>
        </View>

        {/* Informations de contact */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Informations de Contact</Text>
          
          <View style={styles.contactCard}>
            <View style={styles.contactItem}>
              <Ionicons name="mail" size={20} color="#ff6b35" />
              <Text style={styles.contactText}>{userProfile?.email}</Text>
            </View>
            
            <View style={styles.contactItem}>
              <Ionicons name="call" size={20} color="#ff6b35" />
              <Text style={styles.contactText}>{userProfile?.phone}</Text>
            </View>
            
            <View style={styles.contactItem}>
              <Ionicons name="location" size={20} color="#ff6b35" />
              <Text style={styles.contactText}>{userProfile?.address}</Text>
            </View>
          </View>
        </View>

        {/* Documents professionnels */}
        <View style={styles.documentsSection}>
          <Text style={styles.sectionTitle}>Documents Professionnels</Text>
          
          <View style={styles.documentsCard}>
            <View style={styles.documentItem}>
              <Ionicons name="card" size={20} color="#ff6b35" />
              <View style={styles.documentInfo}>
                <Text style={styles.documentLabel}>Numéro de carte d'identité</Text>
                <Text style={styles.documentValue}>{userProfile?.identityCardNumber || 'Non renseigné'}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color="#28a745" />
            </View>
            
            <View style={styles.documentItem}>
              <Ionicons name="person-circle" size={20} color="#ff6b35" />
              <View style={styles.documentInfo}>
                <Text style={styles.documentLabel}>ID Déménageur</Text>
                <Text style={styles.documentValue}>DEM-{userProfile?.id?.substring(0, 8).toUpperCase() || 'N/A'}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color="#28a745" />
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <View style={styles.actionsCard}>
            <TouchableOpacity style={styles.actionItem} onPress={editProfile}>
              <Ionicons name="create" size={20} color="#ff6b35" />
              <Text style={styles.actionText}>Modifier le profil</Text>
              <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionItem} onPress={changePassword}>
              <Ionicons name="lock-closed" size={20} color="#ff6b35" />
              <Text style={styles.actionText}>Changer le mot de passe</Text>
              <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionItem} onPress={manageDocuments}>
              <Ionicons name="folder" size={20} color="#ff6b35" />
              <Text style={styles.actionText}>Gérer les documents</Text>
              <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionItem} onPress={contactSupport}>
              <Ionicons name="help-circle" size={20} color="#ff6b35" />
              <Text style={styles.actionText}>Contacter le support</Text>
              <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Déconnexion */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out" size={20} color="#dc3545" />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
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
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  syncIndicator: {
    color: '#ffffff',
    fontSize: 10,
    opacity: 0.8,
    marginTop: 2,
  },
  editButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileSection: {
    marginTop: 20,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
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
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  companyName: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  ratingText: {
    fontSize: 14,
    color: '#333333',
    marginLeft: 4,
    fontWeight: '600',
  },
  reviewsText: {
    fontSize: 12,
    color: '#8e8e93',
    marginLeft: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  statusText: {
    fontSize: 12,
    color: '#8e8e93',
  },
  verifiedIcon: {
    marginLeft: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 20,
    marginBottom: 15,
  },
  statsSection: {
    marginTop: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    width: '48%',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#8e8e93',
    textAlign: 'center',
    marginTop: 4,
  },
  contactSection: {
    marginTop: 20,
  },
  contactCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
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
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  contactText: {
    fontSize: 14,
    color: '#333333',
    marginLeft: 15,
  },
  documentsSection: {
    marginTop: 20,
  },
  documentsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
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
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  documentInfo: {
    flex: 1,
    marginLeft: 15,
  },
  documentLabel: {
    fontSize: 12,
    color: '#8e8e93',
  },
  documentValue: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '600',
    marginTop: 2,
  },
  actionsSection: {
    marginTop: 20,
  },
  actionsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f1f1',
  },
  actionText: {
    fontSize: 16,
    color: '#333333',
    marginLeft: 15,
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logoutText: {
    fontSize: 16,
    color: '#dc3545',
    fontWeight: 'bold',
    marginLeft: 10,
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
});

export default ProfilScreen;
