import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const DemenageurAuthScreen = ({ onAuthSuccess, onBack }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    identityCardNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [documents, setDocuments] = useState({
    drivingLicense: { front: null, back: null },
    vehicleRegistration: { front: null, back: null },
    identityCard: { front: null, back: null },
  });

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const takePhoto = async (documentType, side) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Permission d\'accès à l\'appareil photo refusée');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || 1,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setDocuments(prev => ({
          ...prev,
          [documentType]: {
            ...(prev[documentType] || { front: null, back: null }),
            [side]: result.assets[0]
          }
        }));
      }
    } catch (error) {
      console.error('Erreur lors de la prise de photo:', error);
      Alert.alert('Erreur', 'Erreur lors de la prise de photo');
    }
  };

  const validateForm = () => {
    if (isLogin) {
      if (!formData.email || !formData.password) {
        Alert.alert('Erreur', 'Veuillez remplir tous les champs');
        return false;
      }
    } else {
      if (!formData.firstName || !formData.lastName || !formData.email || 
          !formData.phone || !formData.identityCardNumber || 
          !formData.password || !formData.confirmPassword) {
        Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
        return false;
      }
      
      if (formData.password !== formData.confirmPassword) {
        Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
        return false;
      }
      
      if (formData.password.length < 6) {
        Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
        return false;
      }

      if (!documents.drivingLicense?.front || !documents.drivingLicense?.back ||
          !documents.vehicleRegistration?.front || !documents.vehicleRegistration?.back ||
          !documents.identityCard?.front || !documents.identityCard?.back) {
        Alert.alert('Erreur', 'Veuillez prendre les photos des deux côtés de tous les documents requis');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      // Configuration de l'API
      const API_BASE_URL = Platform.OS === 'android' 
        ? 'http://192.168.1.13:3000' 
        : 'http://192.168.1.13:3000';

      const endpoint = isLogin ? '/api/auth/demenageur/login' : '/api/auth/demenageur/register';
      
      if (isLogin) {
        const requestData = { 
          email: formData.email, 
          password: formData.password 
        };

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        const result = await response.json();

        if (result.success) {
          Alert.alert(
            'Succès', 
            'Connexion réussie !',
            [{ text: 'OK', onPress: () => onAuthSuccess(result.user, result.token) }]
          );
        } else {
          Alert.alert('Erreur', result.message || 'Une erreur est survenue');
        }
      } else {
        // Pour l'inscription, créer FormData pour les fichiers
        const formDataToSend = new FormData();
        formDataToSend.append('firstName', formData.firstName);
        formDataToSend.append('lastName', formData.lastName);
        formDataToSend.append('email', formData.email);
        formDataToSend.append('phone', formData.phone);
        formDataToSend.append('identityCardNumber', formData.identityCardNumber);
        formDataToSend.append('password', formData.password);
        formDataToSend.append('role', 'demenageur');

        // Ajouter les images (face avant et arrière pour chaque document)
        if (documents.drivingLicense?.front) {
          formDataToSend.append('drivingLicenseFront', {
            uri: documents.drivingLicense.front.uri,
            type: 'image/jpeg',
            name: 'driving_license_front.jpg',
          });
        }
        if (documents.drivingLicense?.back) {
          formDataToSend.append('drivingLicenseBack', {
            uri: documents.drivingLicense.back.uri,
            type: 'image/jpeg',
            name: 'driving_license_back.jpg',
          });
        }
        if (documents.vehicleRegistration?.front) {
          formDataToSend.append('vehicleRegistrationFront', {
            uri: documents.vehicleRegistration.front.uri,
            type: 'image/jpeg',
            name: 'vehicle_registration_front.jpg',
          });
        }
        if (documents.vehicleRegistration?.back) {
          formDataToSend.append('vehicleRegistrationBack', {
            uri: documents.vehicleRegistration.back.uri,
            type: 'image/jpeg',
            name: 'vehicle_registration_back.jpg',
          });
        }
        if (documents.identityCard?.front) {
          formDataToSend.append('identityCardFront', {
            uri: documents.identityCard.front.uri,
            type: 'image/jpeg',
            name: 'identity_card_front.jpg',
          });
        }
        if (documents.identityCard?.back) {
          formDataToSend.append('identityCardBack', {
            uri: documents.identityCard.back.uri,
            type: 'image/jpeg',
            name: 'identity_card_back.jpg',
          });
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          body: formDataToSend,
        });

        const result = await response.json();

        if (result.success) {
          Alert.alert(
            'Succès', 
            'Compte déménageur créé avec succès ! Votre compte sera vérifié par notre équipe.',
            [{ text: 'OK', onPress: () => onAuthSuccess(result.user, result.token) }]
          );
        } else {
          Alert.alert('Erreur', result.message || 'Une erreur est survenue');
        }
      }
    } catch (error) {
      console.error('Erreur d\'authentification:', error);
      Alert.alert('Erreur', 'Erreur de connexion au serveur');
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      identityCardNumber: '',
      password: '',
      confirmPassword: '',
    });
    setDocuments({
      drivingLicense: { front: null, back: null },
      vehicleRegistration: { front: null, back: null },
      identityCard: { front: null, back: null },
    });
  };

  const DocumentUpload = ({ title, documentType, icon }) => (
    <View style={styles.documentContainer}>
      <Text style={styles.documentLabel}>{title} *</Text>
      <Text style={styles.documentSubLabel}>Prenez les photos des deux côtés</Text>
      
      <View style={styles.documentSides}>
        {/* Face avant */}
        <View style={styles.documentSide}>
          <Text style={styles.sideLabel}>Face avant</Text>
          <TouchableOpacity 
            style={styles.documentButton}
            onPress={() => takePhoto(documentType, 'front')}
          >
            {documents[documentType]?.front ? (
              <View style={styles.documentPreview}>
                <Image 
                  source={{ uri: documents[documentType].front.uri }} 
                  style={styles.documentImage}
                />
                <View style={styles.documentOverlay}>
                  <Ionicons name="checkmark-circle" size={20} color="#28a745" />
                  <Text style={styles.documentStatus}>Photo prise</Text>
                </View>
              </View>
            ) : (
              <View style={styles.documentPlaceholder}>
                <Ionicons name="camera" size={24} color="#ff6b35" />
                <Text style={styles.documentPlaceholderText}>Prendre photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Face arrière */}
        <View style={styles.documentSide}>
          <Text style={styles.sideLabel}>Face arrière</Text>
          <TouchableOpacity 
            style={styles.documentButton}
            onPress={() => takePhoto(documentType, 'back')}
          >
            {documents[documentType]?.back ? (
              <View style={styles.documentPreview}>
                <Image 
                  source={{ uri: documents[documentType].back.uri }} 
                  style={styles.documentImage}
                />
                <View style={styles.documentOverlay}>
                  <Ionicons name="checkmark-circle" size={20} color="#28a745" />
                  <Text style={styles.documentStatus}>Photo prise</Text>
                </View>
              </View>
            ) : (
              <View style={styles.documentPlaceholder}>
                <Ionicons name="camera" size={24} color="#ff6b35" />
                <Text style={styles.documentPlaceholderText}>Prendre photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* En-tête */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>
              {isLogin ? 'Connexion Déménageur' : 'Inscription Déménageur'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isLogin ? 'Connectez-vous à votre compte' : 'Rejoignez Liberty Mobile en tant que déménageur'}
            </Text>
          </View>
        </View>

        {/* Formulaire */}
        <View style={styles.formContainer}>
          {!isLogin && (
            <>
              {/* Prénom et Nom */}
              <View style={styles.inputRow}>
                <View style={styles.inputGroupHalf}>
                  <Text style={styles.inputLabel}>Prénom *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Votre prénom"
                    placeholderTextColor="#8e8e93"
                    value={formData.firstName}
                    onChangeText={(text) => handleInputChange('firstName', text)}
                  />
                </View>
                <View style={styles.inputGroupHalf}>
                  <Text style={styles.inputLabel}>Nom *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Votre nom"
                    placeholderTextColor="#8e8e93"
                    value={formData.lastName}
                    onChangeText={(text) => handleInputChange('lastName', text)}
                  />
                </View>
              </View>

              {/* Téléphone */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Téléphone *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="+216 XX XXX XXX"
                  placeholderTextColor="#8e8e93"
                  value={formData.phone}
                  onChangeText={(text) => handleInputChange('phone', text)}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Numéro de carte d'identité */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Numéro de carte d'identité *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="12345678"
                  placeholderTextColor="#8e8e93"
                  value={formData.identityCardNumber}
                  onChangeText={(text) => handleInputChange('identityCardNumber', text)}
                  keyboardType="numeric"
                />
              </View>

              {/* Documents */}
              <View style={styles.documentsSection}>
                <Text style={styles.sectionTitle}>Documents requis *</Text>
                <Text style={styles.sectionSubtitle}>
                  Téléchargez les photos de vos documents pour vérification
                </Text>
                
                <DocumentUpload 
                  title="Permis de conduire"
                  documentType="drivingLicense"
                  icon="card-outline"
                />
                
                <DocumentUpload 
                  title="Carte grise"
                  documentType="vehicleRegistration"
                  icon="car-outline"
                />
                
                <DocumentUpload 
                  title="Carte d'identité"
                  documentType="identityCard"
                  icon="id-card-outline"
                />
              </View>
            </>
          )}

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="votre@email.com"
              placeholderTextColor="#8e8e93"
              value={formData.email}
              onChangeText={(text) => handleInputChange('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Mot de passe */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mot de passe *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Votre mot de passe"
                placeholderTextColor="#8e8e93"
                value={formData.password}
                onChangeText={(text) => handleInputChange('password', text)}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity 
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color="#8e8e93" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirmation mot de passe (inscription seulement) */}
          {!isLogin && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirmer le mot de passe *</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirmez votre mot de passe"
                  placeholderTextColor="#8e8e93"
                  value={formData.confirmPassword}
                  onChangeText={(text) => handleInputChange('confirmPassword', text)}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity 
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons 
                    name={showConfirmPassword ? "eye-off" : "eye"} 
                    size={20} 
                    color="#8e8e93" 
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Bouton de soumission */}
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
            <Text style={styles.submitButtonText}>
              {isLogin ? 'Se connecter' : 'Créer mon compte déménageur'}
            </Text>
          </TouchableOpacity>

          {/* Lien de basculement */}
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>
              {isLogin ? "Vous n'avez pas de compte ?" : "Vous avez déjà un compte ?"}
            </Text>
            <TouchableOpacity onPress={toggleMode}>
              <Text style={styles.toggleLink}>
                {isLogin ? 'Créer un compte' : 'Se connecter'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Conditions d'utilisation */}
          {!isLogin && (
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                En créant un compte déménageur, vous acceptez nos{' '}
                <Text style={styles.termsLink}>Conditions d'utilisation</Text>
                {' '}et notre{' '}
                <Text style={styles.termsLink}>Politique de confidentialité</Text>
                {' '}. Votre compte sera vérifié par notre équipe avant activation.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a0d2e',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: '#ff6b35',
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 15,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    marginTop: 2,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputGroupHalf: {
    flex: 1,
    marginHorizontal: 5,
  },
  inputLabel: {
    fontSize: 16,
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: 16,
    color: '#ffffff',
  },
  eyeButton: {
    padding: 15,
  },
  documentsSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8e8e93',
    marginBottom: 20,
  },
  documentContainer: {
    marginBottom: 25,
  },
  documentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  documentSubLabel: {
    fontSize: 12,
    color: '#8e8e93',
    marginBottom: 15,
  },
  documentSides: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  documentSide: {
    flex: 1,
    marginHorizontal: 5,
  },
  sideLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ff6b35',
    marginBottom: 8,
    textAlign: 'center',
  },
  documentButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  documentPreview: {
    position: 'relative',
    width: '100%',
    height: 80,
  },
  documentImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  documentOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentStatus: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 4,
  },
  documentPlaceholder: {
    alignItems: 'center',
  },
  documentPlaceholderText: {
    color: '#ff6b35',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  documentPlaceholderSubtext: {
    color: '#8e8e93',
    fontSize: 10,
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: '#ff6b35',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  toggleText: {
    fontSize: 14,
    color: '#8e8e93',
  },
  toggleLink: {
    fontSize: 14,
    color: '#ff6b35',
    fontWeight: '600',
    marginLeft: 5,
  },
  termsContainer: {
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  termsText: {
    fontSize: 12,
    color: '#8e8e93',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#ff6b35',
    textDecorationLine: 'underline',
  },
});

export default DemenageurAuthScreen;
