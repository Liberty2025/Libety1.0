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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAPIBaseURL, testAPIConnectivity } from '../../config/api';

const AuthScreen = ({ onAuthSuccess, onBack }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const validateForm = () => {
    if (isLogin) {
      if (!formData.email || !formData.password) {
        Alert.alert('Erreur', 'Veuillez remplir tous les champs');
        return false;
      }
    } else {
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.password || !formData.confirmPassword) {
        Alert.alert('Erreur', 'Veuillez remplir tous les champs');
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
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      // Utiliser la configuration API centralisée
      let API_BASE_URL = getAPIBaseURL();
      
      // Tester la connectivité si on est en développement (optionnel, pour éviter les erreurs réseau)
      // On peut désactiver ce test pour accélérer, car getAPIBaseURL() retourne déjà la bonne URL
      // const workingURL = await testAPIConnectivity();
      // if (workingURL) {
      //   API_BASE_URL = workingURL;
      // }
      
      console.log('🌐 URL API utilisée:', API_BASE_URL);

      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const requestData = isLogin 
        ? { email: formData.email, password: formData.password }
        : {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            password: formData.password
          };

      console.log('📤 Envoi de la requête vers:', `${API_BASE_URL}${endpoint}`);
      console.log('📤 Données:', { ...requestData, password: '***' });

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('📥 Réponse reçue:', response.status, response.statusText);

      // Lire le résultat JSON même si le statut n'est pas 200
      let result;
      try {
        result = await response.json();
        console.log('📋 Résultat:', result);
      } catch (jsonError) {
        console.error('❌ Erreur de parsing JSON:', jsonError);
        throw new Error('Réponse invalide du serveur');
      }

      // Vérifier si la réponse est réussie (200-299) ou si c'est une erreur métier (400+)
      if (response.ok && result.success) {
        Alert.alert(
          'Succès', 
          isLogin ? 'Connexion réussie !' : 'Compte créé avec succès !',
          [{ text: 'OK', onPress: () => onAuthSuccess(result.user, result.token) }]
        );
      } else {
        // Afficher le message d'erreur du serveur (même pour les codes 400, 409, etc.)
        const errorMessage = result.message || result.error || `Erreur ${response.status}: ${response.statusText}`;
        Alert.alert('Erreur', errorMessage);
      }
    } catch (error) {
      console.error('❌ Erreur d\'authentification:', error);
      console.error('❌ Type d\'erreur:', error.name);
      console.error('❌ Message:', error.message);
      
      // Gérer les erreurs réseau différemment
      if (error.message === 'Network request failed' || error.name === 'TypeError') {
        Alert.alert(
          'Erreur de connexion', 
          'Impossible de se connecter au serveur.\n\nVérifiez que :\n• Le serveur est démarré\n• Vous êtes sur le même réseau\n• Le pare-feu autorise la connexion'
        );
      } else {
        Alert.alert(
          'Erreur', 
          `Une erreur est survenue : ${error.message}`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    });
  };

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
              {isLogin ? 'Connexion' : 'Créer un compte'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {isLogin ? 'Connectez-vous à votre compte' : 'Rejoignez Liberty Mobile'}
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
          <TouchableOpacity 
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isLogin ? 'Se connecter' : 'Créer mon compte'}
              </Text>
            )}
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
                En créant un compte, vous acceptez nos{' '}
                <Text style={styles.termsLink}>Conditions d'utilisation</Text>
                {' '}et notre{' '}
                <Text style={styles.termsLink}>Politique de confidentialité</Text>
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
  submitButtonDisabled: {
    opacity: 0.6,
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

export default AuthScreen;
