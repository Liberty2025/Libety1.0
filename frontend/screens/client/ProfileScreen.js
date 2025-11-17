import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTutorialRefs } from '../../hooks/useTutorialRefs';
import { useNavigationTutorial } from '../../hooks/useNavigationTutorial';

const ProfileScreen = ({ userData, onLogout }) => {
  const [profile, setProfile] = useState(userData);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Refs pour le tutoriel
  const editButtonRef = useRef(null);
  const changePasswordButtonRef = useRef(null);
  const guideButtonRef = useRef(null);
  
  // Enregistrer les refs pour le tutoriel
  const tutorialRefs = {
    editButton: editButtonRef,
    changePasswordButton: changePasswordButtonRef,
    guideButton: guideButtonRef,
  };
  
  useNavigationTutorial('Profil', tutorialRefs);

  useEffect(() => {
    setProfile(userData);
  }, [userData]);

  const handleEdit = () => {
    setEditData({
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      phone: profile.phone || '',
      address: profile.address || ''
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      const API_BASE_URL = Platform.OS === 'android' 
        ? 'http://192.168.1.13:3000' 
        : 'http://192.168.1.13:3000';

      // Récupérer le token depuis le stockage local ou les props
      const token = userData.token; // À adapter selon votre gestion des tokens

      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editData),
      });

      const result = await response.json();

      if (result.success) {
        setProfile(result.user);
        setIsEditing(false);
        Alert.alert('Succès', 'Profil mis à jour avec succès');
      } else {
        Alert.alert('Erreur', result.message || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur de mise à jour:', error);
      Alert.alert('Erreur', 'Erreur de connexion au serveur');
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert('Erreur', 'Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      Alert.alert('Erreur', 'Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      const API_BASE_URL = Platform.OS === 'android' 
        ? 'http://192.168.1.13:3000' 
        : 'http://192.168.1.13:3000';

      const token = userData.token;

      const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        }),
      });

      const result = await response.json();

      if (result.success) {
        setShowChangePassword(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        Alert.alert('Succès', 'Mot de passe modifié avec succès');
      } else {
        Alert.alert('Erreur', result.message || 'Erreur lors du changement de mot de passe');
      }
    } catch (error) {
      console.error('Erreur de changement de mot de passe:', error);
      Alert.alert('Erreur', 'Erreur de connexion au serveur');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Non disponible';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available': return 'Disponible';
      case 'inactive': return 'Inactif';
      case 'suspended': return 'Suspendu';
      case 'banned': return 'Banni';
      default: return 'Inconnu';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#28a745';
      case 'inactive': return '#ffc107';
      case 'suspended': return '#dc3545';
      case 'banned': return '#dc3545';
      default: return '#8e8e93';
    }
  };

  const ProfileField = ({ label, value, icon, isEditable = false, editKey = null }) => (
    <View style={styles.fieldContainer}>
      <View style={styles.fieldHeader}>
        <View style={styles.fieldTitleContainer}>
          <Ionicons name={icon} size={20} color="#ff6b35" />
          <Text style={styles.fieldLabel}>{label}</Text>
        </View>
        {isEditable && isEditing && (
          <TouchableOpacity onPress={() => {}}>
            <Ionicons name="create-outline" size={18} color="#ff6b35" />
          </TouchableOpacity>
        )}
      </View>
      {isEditing && isEditable ? (
        <TextInput
          style={styles.editInput}
          value={editData[editKey] || ''}
          onChangeText={(text) => setEditData({ ...editData, [editKey]: text })}
          placeholder={`Entrez votre ${label.toLowerCase()}`}
          placeholderTextColor="#8e8e93"
        />
      ) : (
        <Text style={styles.fieldValue}>{value || 'Non renseigné'}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={40} color="#ffffff" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>
              {profile.firstName} {profile.lastName}
            </Text>
            <Text style={styles.headerEmail}>{profile.email}</Text>
            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(profile.status) }]} />
              <Text style={styles.statusText}>{getStatusText(profile.status)}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity 
          ref={editButtonRef}
          style={styles.editButton}
          onPress={isEditing ? handleSave : handleEdit}
        >
          <Ionicons 
            name={isEditing ? "checkmark" : "create-outline"} 
            size={20} 
            color="#ffffff" 
          />
          <Text style={styles.editButtonText}>
            {isEditing ? 'Sauvegarder' : 'Modifier'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenu du profil */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Informations personnelles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations personnelles</Text>
          
          <ProfileField
            label="Prénom"
            value={profile.firstName}
            icon="person-outline"
            isEditable={true}
            editKey="firstName"
          />
          
          <ProfileField
            label="Nom"
            value={profile.lastName}
            icon="person-outline"
            isEditable={true}
            editKey="lastName"
          />
          
          <ProfileField
            label="Email"
            value={profile.email}
            icon="mail-outline"
          />
          
          <ProfileField
            label="Téléphone"
            value={profile.phone}
            icon="call-outline"
            isEditable={true}
            editKey="phone"
          />
          
          <ProfileField
            label="Adresse"
            value={profile.address}
            icon="location-outline"
            isEditable={true}
            editKey="address"
          />
        </View>

        {/* Informations du compte */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations du compte</Text>
          
          <ProfileField
            label="Rôle"
            value={profile.role === 'client' ? 'Client' : profile.role}
            icon="shield-outline"
          />
          
          <ProfileField
            label="Statut"
            value={getStatusText(profile.status)}
            icon="checkmark-circle-outline"
          />
          
          <ProfileField
            label="Membre depuis"
            value={formatDate(profile.createdAt)}
            icon="calendar-outline"
          />
          
          <ProfileField
            label="Dernière mise à jour"
            value={formatDate(profile.updatedAt)}
            icon="time-outline"
          />
        </View>

        {/* Localisation */}
        {(profile.latitude && profile.longitude) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Localisation</Text>
            
            <ProfileField
              label="Latitude"
              value={profile.latitude.toString()}
              icon="navigate-outline"
            />
            
            <ProfileField
              label="Longitude"
              value={profile.longitude.toString()}
              icon="navigate-outline"
            />
          </View>
        )}

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity 
            ref={changePasswordButtonRef}
            style={styles.actionButton}
            onPress={() => setShowChangePassword(true)}
          >
            <Ionicons name="key-outline" size={20} color="#ff6b35" />
            <Text style={styles.actionButtonText}>Changer le mot de passe</Text>
            <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              Alert.alert(
                'Déconnexion',
                'Êtes-vous sûr de vouloir vous déconnecter ?',
                [
                  { text: 'Annuler', style: 'cancel' },
                  { text: 'Déconnexion', style: 'destructive', onPress: onLogout }
                ]
              );
            }}
          >
            <Ionicons name="log-out-outline" size={20} color="#dc3545" />
            <Text style={[styles.actionButtonText, { color: '#dc3545' }]}>Se déconnecter</Text>
            <Ionicons name="chevron-forward" size={20} color="#8e8e93" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de changement de mot de passe */}
      <Modal
        visible={showChangePassword}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowChangePassword(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Changer le mot de passe</Text>
              <TouchableOpacity onPress={() => setShowChangePassword(false)}>
                <Ionicons name="close" size={24} color="#8e8e93" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mot de passe actuel</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Votre mot de passe actuel"
                  placeholderTextColor="#8e8e93"
                  value={passwordData.currentPassword}
                  onChangeText={(text) => setPasswordData({ ...passwordData, currentPassword: text })}
                  secureTextEntry={true}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nouveau mot de passe</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Votre nouveau mot de passe"
                  placeholderTextColor="#8e8e93"
                  value={passwordData.newPassword}
                  onChangeText={(text) => setPasswordData({ ...passwordData, newPassword: text })}
                  secureTextEntry={true}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirmer le nouveau mot de passe</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Confirmez votre nouveau mot de passe"
                  placeholderTextColor="#8e8e93"
                  value={passwordData.confirmPassword}
                  onChangeText={(text) => setPasswordData({ ...passwordData, confirmPassword: text })}
                  secureTextEntry={true}
                />
              </View>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowChangePassword(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleChangePassword}
              >
                <Text style={styles.saveButtonText}>Changer</Text>
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
    backgroundColor: '#1a0d2e',
  },
  header: {
    backgroundColor: '#ff6b35',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  headerEmail: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 5,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
  },
  fieldContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff6b35',
    marginLeft: 8,
  },
  fieldValue: {
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 28,
  },
  editInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 28,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 12,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a0d2e',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 107, 53, 0.2)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: 16,
    color: '#ffffff',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 107, 53, 0.2)',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#ff6b35',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginLeft: 10,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;
