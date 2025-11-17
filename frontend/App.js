import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Platform, I18nManager } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';

// Import des composants
import RoleSelectionScreen from './components/RoleSelectionScreen';
import DemenageurNavigator from './screens/demenageur/DemenageurNavigator';
import AuthScreen from './screens/client/AuthScreen';
import ProfileScreen from './screens/client/ProfileScreen';
import DemenageurAuthScreen from './screens/demenageur/DemenageurAuthScreen';
import SuivreScreen from './screens/client/SuivreScreen';
import ClientChatScreen from './screens/client/ClientChatScreen';
import AccueilScreen from './screens/client/AccueilScreen';
import NotificationScreen from './screens/client/NotificationScreen';
import LanguageSelector from './components/LanguageSelector';
import ClientNotificationProvider from './components/ClientNotificationProvider';
import CustomSplashScreen from './components/CustomSplashScreen';

// Import du contexte de localisation
import { LocaleProvider, useLocale } from './context/LocaleContext';
// Import du contexte de tutoriel
import { TutorialProvider } from './context/TutorialContext';
import GlobalTutorial from './components/GlobalTutorial';

const Tab = createBottomTabNavigator();

// Composant interne qui utilise le contexte de localisation
function AppContent() {
  const { t, isRTL } = useLocale();
  
  // État pour le splash screen personnalisé
  const [showSplash, setShowSplash] = useState(true);
  
  // État pour le rôle de l'utilisateur
  const [userRole, setUserRole] = useState(null);
  // État pour l'authentification du client
  const [isClientAuthenticated, setIsClientAuthenticated] = useState(false);
  const [clientData, setClientData] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  // État pour l'authentification du déménageur
  const [isDemenageurAuthenticated, setIsDemenageurAuthenticated] = useState(false);
  const [demenageurData, setDemenageurData] = useState(null);
  const [demenageurToken, setDemenageurToken] = useState(null);
  
  // Gérer le splash screen natif - masquer immédiatement pour laisser place au splash personnalisé
  useEffect(() => {
    const prepare = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn(e);
      }
    };

    prepare();
  }, []);

  // Forcer la direction RTL si nécessaire (pour Android)
  useEffect(() => {
    if (Platform.OS === 'android') {
      I18nManager.forceRTL(isRTL);
      I18nManager.allowRTL(isRTL);
    }
  }, [isRTL]);

  // Afficher le splash screen personnalisé pendant 5 secondes
  if (showSplash) {
    return <CustomSplashScreen onFinished={() => setShowSplash(false)} />;
  }

  // Afficher la page de sélection de rôle si aucun rôle n'est sélectionné
  if (!userRole) {
    return <RoleSelectionScreen onRoleSelected={setUserRole} />;
  }

  // Si le rôle est "client" mais pas authentifié, afficher l'écran d'authentification
  if (userRole === 'client' && !isClientAuthenticated) {
    return (
      <AuthScreen 
        onAuthSuccess={(data, token) => {
          setClientData(data);
          setAuthToken(token);
          setIsClientAuthenticated(true);
        }}
        onBack={() => setUserRole(null)}
      />
    );
  }

  // Si le rôle est "demenageur" mais pas authentifié, afficher l'écran d'authentification déménageur
  if (userRole === 'demenageur' && !isDemenageurAuthenticated) {
    return (
      <DemenageurAuthScreen 
        onAuthSuccess={(data, token) => {
          setDemenageurData(data);
          setDemenageurToken(token);
          setIsDemenageurAuthenticated(true);
        }}
        onBack={() => setUserRole(null)}
      />
    );
  }

  // Si le rôle est "client" et authentifié, afficher l'interface client
  if (userRole === 'client' && isClientAuthenticated) {
    return (
      <NavigationContainer>
        <StatusBar style="light" />
        <ClientNotificationProvider 
          userData={{...clientData, token: authToken}}
        >
          <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;

              if (route.name === 'Accueil') {
                iconName = focused ? 'home' : 'home-outline';
              } else if (route.name === 'Suivre') {
                iconName = focused ? 'location' : 'location-outline';
              } else if (route.name === 'Chat') {
                iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              } else if (route.name === 'Notification') {
                iconName = focused ? 'notifications' : 'notifications-outline';
              } else if (route.name === 'Profil') {
                iconName = focused ? 'person' : 'person-outline';
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#ff6b35',
            tabBarInactiveTintColor: '#8e8e93',
            tabBarStyle: {
              backgroundColor: '#1a0d2e',
              borderTopColor: '#ff6b35',
              borderTopWidth: 2,
              height: 60,
              paddingBottom: 5,
              paddingTop: 5,
            },
            headerStyle: {
              backgroundColor: '#1a0d2e',
              borderBottomColor: '#ff6b35',
              borderBottomWidth: 2,
            },
            headerTintColor: '#ffffff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          })}
        >
          <Tab.Screen 
            name="Accueil" 
            options={{
              title: t('home'),
              headerShown: false,
            }}
          >
            {() => <AccueilScreen authToken={authToken} />}
          </Tab.Screen>
          <Tab.Screen 
            name="Suivre" 
            options={{
              title: t('track'),
              headerTitle: t('track_requests'),
              headerRight: () => <View style={{ marginRight: 15 }}><LanguageSelector showLabel={false} /></View>,
            }}
          >
            {() => <SuivreScreen userData={{...clientData, token: authToken}} />}
          </Tab.Screen>
          <Tab.Screen 
            name="Chat" 
            options={{
              title: t('chat'),
              headerTitle: t('chat'),
              headerRight: () => <View style={{ marginRight: 15 }}><LanguageSelector showLabel={false} /></View>,
            }}
          >
            {() => <ClientChatScreen authToken={authToken} userData={clientData} />}
          </Tab.Screen>
          <Tab.Screen 
            name="Notification" 
            component={NotificationScreen}
            options={{
              title: t('notifications'),
              headerTitle: t('notifications'),
              headerRight: () => <View style={{ marginRight: 15 }}><LanguageSelector showLabel={false} /></View>,
            }}
          />
          <Tab.Screen 
            name="Profil" 
            options={{
              title: t('profile'),
              headerTitle: t('my_profile'),
              headerRight: () => <View style={{ marginRight: 15 }}><LanguageSelector showLabel={false} /></View>,
            }}
          >
            {() => (
              <ProfileScreen 
                userData={{ ...clientData, token: authToken }}
                onLogout={() => {
                  setClientData(null);
                  setAuthToken(null);
                  setIsClientAuthenticated(false);
                }}
              />
            )}
          </Tab.Screen>
        </Tab.Navigator>
        </ClientNotificationProvider>
      </NavigationContainer>
    );
  }

  // Si le rôle est "demenageur" et authentifié, afficher l'interface déménageur
  if (userRole === 'demenageur' && isDemenageurAuthenticated) {
    const userDataForNavigator = {...demenageurData, token: demenageurToken};
    console.log('🔍 App.js - Données passées à DemenageurNavigator:', {
      demenageurData: demenageurData ? 'PRÉSENT' : 'ABSENT',
      demenageurToken: demenageurToken ? 'PRÉSENT' : 'ABSENT',
      userDataForNavigator: userDataForNavigator ? 'PRÉSENT' : 'ABSENT',
      userId: userDataForNavigator?.userId,
      id: userDataForNavigator?.id,
      token: userDataForNavigator?.token ? 'PRÉSENT' : 'ABSENT',
      demenageurDataKeys: demenageurData ? Object.keys(demenageurData) : 'N/A'
    });
    
    return (
      <NavigationContainer>
        <StatusBar style="light" />
        <DemenageurNavigator 
          userData={userDataForNavigator} 
          onLogout={() => {
            setIsDemenageurAuthenticated(false);
            setDemenageurData(null);
            setDemenageurToken(null);
            setUserRole(null);
          }} 
        />
      </NavigationContainer>
    );
  }

  // Fallback - ne devrait jamais être atteint
  return (
    <View style={styles.screen}>
      <Text style={styles.screenTitle}>{t('error_loading_data')}</Text>
    </View>
  );
}

// Composant principal qui enveloppe l'app avec les providers
export default function App() {
  return (
    <LocaleProvider>
      <TutorialProvider>
        <AppContent />
        <GlobalTutorial />
      </TutorialProvider>
    </LocaleProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1a0d2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
});
