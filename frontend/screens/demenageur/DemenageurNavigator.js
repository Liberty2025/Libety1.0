import React, { useState, useRef, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform, TouchableOpacity, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Import des écrans
import DemenageurAccueilScreen from './DemenageurAccueilScreen';
import MissionScreen from './MissionScreen';
import MissionDetailsScreen from './MissionDetailsScreen';
import ChatScreen from './ChatScreen';
import AbonnementScreen from './AbonnementScreen';
import ProfilScreen from './ProfilScreen';

// Import des composants de notification
import NotificationAlert from '../../components/NotificationAlert';
import PersistentNotification from '../../components/PersistentNotification';
import useNotificationSocket from '../../hooks/useNotificationSocket';
import usePersistentNotification from '../../hooks/usePersistentNotification';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Stack Navigator pour les missions
const MissionStack = ({ userData, onRouteData, onNavigationReady }) => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MissionList">
      {({ navigation }) => {
        // Capturer la navigation du stack
        React.useEffect(() => {
          if (onNavigationReady) {
            onNavigationReady(navigation);
          }
        }, [navigation]);
        return <MissionScreen userData={userData} navigation={navigation} />;
      }}
    </Stack.Screen>
    <Stack.Screen name="MissionDetails">
      {({ route, navigation }) => <MissionDetailsScreen 
        route={{ ...route, params: { ...route.params, userData, onRouteData } }} 
        navigation={navigation} 
      />}
    </Stack.Screen>
  </Stack.Navigator>
);

const DemenageurNavigator = ({ userData, onLogout }) => {
  const [currentNotification, setCurrentNotification] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [navigationRef, setNavigationRef] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [showRoute, setShowRoute] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [stackNavigation, setStackNavigation] = useState(null);
  const [tabNavigator, setTabNavigator] = useState(null);
  
  // Référence persistante pour la navigation
  const navigationRefPersistent = useRef(null);
  
  // Utiliser useNavigation pour obtenir la navigation principale
  const mainNavigation = useNavigation();
  
  // Utiliser le hook de notifications WebSocket
  console.log('🔍 DemenageurNavigator - userData:', {
    token: userData?.token ? 'PRÉSENT' : 'ABSENT',
    userId: userData?.userId,
    id: userData?.id,
    email: userData?.email,
    role: userData?.role,
    tokenLength: userData?.token?.length || 0
  });
  
  const { notifications, isConnected, connectionStatus, removeNotification } = useNotificationSocket(
    userData?.token, 
    userData?.userId
  );

  // Utiliser le hook de notification persistante
  const {
    notification: persistentNotification,
    isVisible: isNotificationVisible,
    handleViewRequest,
    handleDismiss
  } = usePersistentNotification(userData);

  // Fonction pour créer une notification avec navigation
  const createNotificationWithNavigation = (notificationData) => {
    return {
      ...notificationData,
      userData: userData,
      onRouteData: handleRouteData
    };
  };

  // Fonction pour capturer la navigation du stack
  const handleStackNavigationReady = (navigation) => {
    console.log('🔗 Stack Navigation capturée:', !!navigation);
    setStackNavigation(navigation);
  };

  // Afficher la première notification disponible
  React.useEffect(() => {
    if (notifications.length > 0 && !showNotification) {
      setCurrentNotification(notifications[0]);
      setShowNotification(true);
    }
  }, [notifications, showNotification]);

  // Exécuter la navigation programmée
  React.useEffect(() => {
    if (pendingNavigation && navigationRef) {
      console.log('🚀 Exécution de la navigation programmée:', pendingNavigation);
      try {
        navigationRef.navigate(pendingNavigation.screen, pendingNavigation.params);
        console.log('✅ Navigation programmée exécutée avec succès');
        setPendingNavigation(null);
      } catch (error) {
        console.error('❌ Erreur lors de la navigation programmée:', error);
        setPendingNavigation(null);
      }
    }
  }, [pendingNavigation, navigationRef]);

  // Debug: Vérifier la disponibilité de la navigation
  React.useEffect(() => {
    if (__DEV__) {
      console.log('🔍 État de navigation:', { 
        navigationRef: !!navigationRef,
        tabNavigator: !!tabNavigator,
        persistentRef: !!navigationRefPersistent.current,
        pendingNavigation: !!pendingNavigation 
      });
    }
  }, [navigationRef, tabNavigator, pendingNavigation]);

  // Vérifier périodiquement la disponibilité de la navigation
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (!navigationRefPersistent.current && !tabNavigator && !navigationRef) {
        // console.log('⏰ Vérification périodique - Navigation pas encore disponible');
      } else {
        console.log('✅ Navigation disponible détectée:', {
          persistentRef: !!navigationRefPersistent.current,
          tabNavigator: !!tabNavigator,
          navigationRef: !!navigationRef
        });
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleCloseNotification = () => {
    if (currentNotification) {
      removeNotification(currentNotification.id);
    }
    setShowNotification(false);
    setCurrentNotification(null);
  };

  // Gérer la vue de la demande persistante
  const handlePersistentNotificationView = (notificationData) => {
    if (__DEV__) {
      console.log('🔔 Navigation vers les détails de mission:', notificationData);
      console.log('🔍 Debug navigation states:', {
        stackNavigation: !!stackNavigation,
        tabNavigator: !!tabNavigator,
        navigationRef: !!navigationRef,
        persistentRef: !!navigationRefPersistent.current
      });
    }
    
    // Arrêter la sonnerie et fermer la notification via le hook
    const result = handleViewRequest(notificationData);
    if (__DEV__) {
      console.log('🔍 Résultat handleViewRequest:', result);
    }
    
    if (result && result.type === 'service_request') {
      // Préparer les données de mission complètes
      const missionData = {
        _id: notificationData._id,
        serviceType: notificationData.serviceType,
        clientId: notificationData.clientId,
        departureAddress: notificationData.departureAddress,
        destinationAddress: notificationData.destinationAddress,
        estimatedPrice: notificationData.estimatedPrice,
        status: notificationData.status || 'pending',
        createdAt: notificationData.createdAt,
        // Ajouter toutes les données complètes
        serviceDetails: notificationData.serviceDetails,
        scheduledDate: notificationData.scheduledDate,
        notes: notificationData.notes,
        actualPrice: notificationData.actualPrice,
        proposedPrice: notificationData.proposedPrice,
        priceNegotiation: notificationData.priceNegotiation,
        demenageurId: notificationData.demenageurId
      };
      
      if (__DEV__) {
        console.log('🔍 Mission data préparée:', missionData);
        console.log('🔍 ServiceDetails disponibles:', missionData.serviceDetails);
        console.log('🔍 ClientId complet:', missionData.clientId);
      }
      
      // Fonction de navigation avec retry
      const attemptNavigation = (attempt = 1, maxAttempts = 5) => {
        if (__DEV__) {
          console.log(`🔄 Tentative de navigation ${attempt}/${maxAttempts}`);
        }
        
        // Utiliser la référence persistante en priorité, puis mainNavigation
        const currentNavigation = navigationRefPersistent.current || tabNavigator || navigationRef || mainNavigation;
        
        if (__DEV__) {
          console.log('🔍 Références disponibles:', {
            persistentRef: !!navigationRefPersistent.current,
            tabNavigator: !!tabNavigator,
            navigationRef: !!navigationRef,
            mainNavigation: !!mainNavigation
          });
        }
        
        if (currentNavigation) {
          if (__DEV__) {
            console.log('🚀 Tentative navigation avec référence disponible');
          }
          try {
            // Si c'est mainNavigation, utiliser une approche différente
            if (currentNavigation === mainNavigation) {
              if (__DEV__) {
                console.log('🎯 Utilisation de mainNavigation');
              }
              try {
                // D'abord naviguer vers l'onglet Missions
                currentNavigation.navigate('Missions');
                
                // Attendre un peu puis naviguer vers MissionDetails
                setTimeout(() => {
                  try {
                    currentNavigation.navigate('Missions', {
                      screen: 'MissionDetails',
                      params: {
                        mission: missionData,
                        userData: userData,
                        onRouteData: handleRouteData
                      }
                    });
                    if (__DEV__) {
                      console.log('✅ Navigation mainNavigation réussie');
                    }
                  } catch (error) {
                    console.error('❌ Erreur navigation MissionDetails avec mainNavigation:', error);
                    // Essayer une navigation directe comme fallback
                    try {
                      currentNavigation.navigate('MissionDetails', {
                        mission: missionData,
                        userData: userData,
                        onRouteData: handleRouteData
                      });
                      if (__DEV__) {
                        console.log('✅ Navigation mainNavigation directe réussie');
                      }
                    } catch (directError) {
                      console.error('❌ Erreur navigation directe:', directError);
                    }
                  }
                }, 200);
                return;
              } catch (error) {
                console.error('❌ Erreur navigation Missions avec mainNavigation:', error);
              }
            }
            
            // D'abord naviguer vers l'onglet Missions
            currentNavigation.navigate('Missions');
            
            // Attendre un peu puis naviguer vers MissionDetails
            setTimeout(() => {
              try {
                currentNavigation.navigate('Missions', {
                  screen: 'MissionDetails',
                  params: {
                    mission: missionData,
                    userData: userData,
                    onRouteData: handleRouteData
                  }
                });
                if (__DEV__) {
                  console.log('✅ Navigation réussie');
                }
                return;
              } catch (error) {
                console.error('❌ Erreur navigation MissionDetails:', error);
                if (attempt < maxAttempts) {
                  setTimeout(() => attemptNavigation(attempt + 1, maxAttempts), 500);
                }
              }
            }, 100);
            return;
          } catch (error) {
            console.error('❌ Erreur navigation:', error);
            if (attempt < maxAttempts) {
              setTimeout(() => attemptNavigation(attempt + 1, maxAttempts), 500);
            }
          }
        }
        
        // Dernier recours avec stackNavigation
        if (stackNavigation) {
          if (__DEV__) {
            console.log('🚀 Tentative navigation avec stackNavigation');
          }
          try {
            stackNavigation.navigate('MissionDetails', {
              mission: missionData,
              userData: userData,
              onRouteData: handleRouteData
            });
            if (__DEV__) {
              console.log('✅ Navigation stackNavigation réussie');
            }
            return;
          } catch (error) {
            console.error('❌ Erreur stackNavigation:', error);
            if (attempt < maxAttempts) {
              setTimeout(() => attemptNavigation(attempt + 1, maxAttempts), 500);
            }
          }
        }
        
        // Si aucune référence n'est disponible, réessayer après un délai
        if (attempt < maxAttempts) {
          if (__DEV__) {
            console.log(`⏳ Aucune référence disponible, nouvelle tentative dans 500ms...`);
          }
          setTimeout(() => attemptNavigation(attempt + 1, maxAttempts), 500);
        } else {
          console.log('❌ Toutes les tentatives de navigation ont échoué');
        }
      };
      
      // Démarrer la première tentative
      attemptNavigation();
    } else {
      if (__DEV__) {
        console.log('❌ Résultat de handleViewRequest invalide:', result);
      }
    }
  };

  const handleViewDetails = (notification) => {
    console.log('🔍 Navigation vers les détails de la mission:', notification);
    console.log('🔍 Notification ID:', notification.id);
    console.log('🔍 Client:', notification.clientName);
    
    // Fermer la notification
    setShowNotification(false);
    setCurrentNotification(null);
    
    // Naviguer vers l'onglet Missions puis vers les détails
    if (navigationRef) {
      console.log('✅ Navigation ref disponible, navigation en cours...');
      
      try {
        // Naviguer directement vers l'onglet Missions avec les paramètres
        navigationRef.navigate('Missions', {
          screen: 'MissionDetails',
          params: {
            missionId: notification.id,
            mission: notification,
            userData: userData
          }
        });
        
        console.log('🚀 Navigation vers MissionDetails avec params:', {
          missionId: notification.id,
          mission: notification,
          userData: userData ? 'PRÉSENT' : 'ABSENT'
        });
      } catch (error) {
        console.log('❌ Erreur lors de la navigation:', error);
        
        // Fallback: naviguer vers l'onglet Missions d'abord
        navigationRef.navigate('Missions');
      }
    } else {
      console.log('❌ Navigation ref non disponible');
    }
  };

  // Fonction pour gérer les données de route
  const handleRouteData = (data) => {
    console.log('🗺️ DemenageurNavigator - handleRouteData appelé avec:', data);
    console.log('🗺️ DemenageurNavigator - data.routeData:', data?.routeData);
    console.log('🗺️ DemenageurNavigator - data.showRoute:', data?.showRoute);
    
    if (data && data.routeData) {
      console.log('✅ Données de route valides, mise à jour de l\'état');
      setRouteData(data.routeData);
      setShowRoute(data.showRoute || true);
      
      // Naviguer vers l'onglet Accueil immédiatement
      if (navigationRef) {
        console.log('🚀 Navigation vers l\'onglet Accueil');
        setTimeout(() => {
          navigationRef.navigate('Accueil');
        }, 100);
      } else {
        console.log('❌ Navigation ref non disponible, réessai dans 500ms...');
        setTimeout(() => {
          if (navigationRefPersistent.current) {
            console.log('✅ Navigation ref trouvée, navigation vers Accueil');
            navigationRefPersistent.current.navigate('Accueil');
          } else {
            console.log('❌ Navigation ref toujours non disponible');
          }
        }, 500);
      }
    } else {
      console.error('❌ Données de route invalides:', data);
    }
  };

  // Fonction de test pour simuler une notification
  const testNotification = async () => {
    try {
      console.log('🔔 Test de notification directe...');
      
      // Créer une notification de test directement
      const testNotification = {
        id: 'test-' + Date.now(),
        clientName: 'Seddik Ferchichi',
        serviceType: 'demenagement',
        departureAddress: 'La marsa cite khalil rue ramada 16 bis 2070',
        destinationAddress: 'Tunis, Tunisia',
        createdAt: new Date(),
        serviceDetails: { 
          cuisine: { grande: 2, moyen: 3, petit: 1 },
          chambre: { grande: 1, moyen: 2, petit: 0 }
        },
        estimatedPrice: 80,
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        clientId: { _id: 'test-client' },
        demenageurId: userData?.userId
      };
      
      console.log('🔔 Notification de test créée:', testNotification);
      setCurrentNotification(testNotification);
      setShowNotification(true);
      
    } catch (error) {
      console.log('❌ Erreur lors du test de notification:', error);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
      ref={(ref) => {
        console.log('🔗 Tab Navigator ref reçue:', !!ref);
        navigationRefPersistent.current = ref;
        setNavigationRef(ref);
        setTabNavigator(ref);
        console.log('🔗 États mis à jour:', {
          navigationRef: !!ref,
          tabNavigator: !!ref,
          persistentRef: !!navigationRefPersistent.current
        });
      }}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Accueil') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Missions') {
            iconName = focused ? 'briefcase' : 'briefcase-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Abonnement') {
            iconName = focused ? 'card' : 'card-outline';
          } else if (route.name === 'Profil') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#ff6b35',
        tabBarInactiveTintColor: '#8e8e93',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e1e1e1',
          paddingTop: 10,
          paddingBottom: 10,
          height: 80,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 5,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Accueil" 
        options={{
          title: 'Accueil',
        }}
      >
        {({ route }) => <DemenageurAccueilScreen 
          authToken={userData.token} 
          onTestNotification={testNotification} 
          connectionStatus={connectionStatus}
        />}
      </Tab.Screen>
      <Tab.Screen 
        name="Missions" 
        options={{
          title: 'Missions',
        }}
      >
        {() => <MissionStack userData={userData} onRouteData={handleRouteData} onNavigationReady={handleStackNavigationReady} />}
      </Tab.Screen>
      <Tab.Screen 
        name="Chat" 
        options={{
          title: 'Messages',
        }}
      >
        {() => <ChatScreen userData={userData} />}
      </Tab.Screen>
      <Tab.Screen 
        name="Abonnement" 
        component={AbonnementScreen}
        options={{
          title: 'Abonnement',
        }}
      />
      <Tab.Screen 
        name="Profil" 
        options={{
          title: 'Profil',
        }}
      >
        {() => <ProfilScreen userData={userData} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
    
    {/* Composant de notification avec sonnerie */}
    {showNotification && currentNotification && (
      <NotificationAlert
        notification={currentNotification}
        onClose={handleCloseNotification}
        onViewDetails={handleViewDetails}
      />
    )}

    {/* Notification persistante pour les demandes de service */}
    <PersistentNotification
      notification={persistentNotification ? createNotificationWithNavigation(persistentNotification) : null}
      visible={isNotificationVisible}
      onViewRequest={handlePersistentNotificationView}
      onDismiss={handleDismiss}
    />




    </View>
  );
};

export default DemenageurNavigator;
