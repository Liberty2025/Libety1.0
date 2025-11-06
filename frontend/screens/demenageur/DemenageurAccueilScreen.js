import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';

const DemenageurAccueilScreen = ({ authToken, onTestNotification, connectionStatus }) => {
  const [location, setLocation] = useState(null);
  const [userStatus, setUserStatus] = useState('available'); // available, busy, offline
  const [acceptedMissions, setAcceptedMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapKey, setMapKey] = useState(0);
  const [forceReload, setForceReload] = useState(false);
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const webViewRef = useRef(null);

  useEffect(() => {
    getCurrentLocation();
    loadAcceptedMissions();
  }, []);

  // Charger la météo quand la localisation est disponible
  useEffect(() => {
    if (location) {
      loadWeatherData();
    }
  }, [location]);

  // Recharger la carte quand les missions acceptées changent
  useEffect(() => {
    console.log('🔄 Missions acceptées mises à jour:', acceptedMissions);
    setMapKey(prev => prev + 1); // Force le rechargement de la WebView
    setForceReload(true);
    setTimeout(() => setForceReload(false), 100); // Force un re-render
  }, [acceptedMissions]);

  const loadAcceptedMissions = async () => {
    try {
      if (!authToken) {
        console.log('❌ Pas de token d\'authentification');
        return;
      }

      const API_BASE_URL = Platform.OS === 'android' ? 'http://192.168.1.13:3000' : 'http://localhost:3000';
      console.log('🔍 Chargement des missions depuis:', `${API_BASE_URL}/api/service-requests/demenageur`);
      console.log('🔑 Token utilisé:', authToken ? 'PRÉSENT' : 'ABSENT');
      
      const response = await fetch(`${API_BASE_URL}/api/service-requests/demenageur`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      console.log('📡 Réponse API:', response.status, response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Données reçues:', data);
        console.log('📋 Toutes les missions:', data.serviceRequests);
        console.log('📋 Nombre total de missions:', data.serviceRequests?.length || 0);
        
        // Filtrer seulement les missions acceptées
        const accepted = data.serviceRequests.filter(mission => mission.status === 'accepted');
        console.log('✅ Missions acceptées:', accepted);
        console.log('✅ Nombre de missions acceptées:', accepted.length);
        
        // Log détaillé de chaque mission acceptée
        accepted.forEach((mission, index) => {
          console.log(`📋 Mission ${index + 1}:`, {
            id: mission._id,
            client: mission.clientId?.first_name || 'Inconnu',
            status: mission.status,
            departureAddress: mission.departureAddress,
            serviceType: mission.serviceType
          });
        });
        
        // Convertir les adresses en coordonnées
        console.log('🗺️ Début du géocodage pour', accepted.length, 'missions acceptées');
        const missionsWithCoords = await Promise.all(
          accepted.map(async (mission, index) => {
            try {
              console.log(`🗺️ Géocodage ${index + 1}/${accepted.length} pour:`, mission.departureAddress);
              
              // Utiliser l'API Nominatim pour le géocodage
              const addressToSearch = mission.departureAddress.includes('Tunisia') 
                ? mission.departureAddress 
                : `${mission.departureAddress}, Tunisia`;
              
              console.log('🔍 Adresse recherchée:', addressToSearch);
              
              const geocodeResponse = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressToSearch)}&format=json&limit=1&countrycodes=tn`,
                {
                  headers: {
                    'User-Agent': 'LibertyMobile/1.0'
                  }
                }
              );
              
              console.log('📡 Réponse géocodage:', geocodeResponse.status, geocodeResponse.ok);
              
              if (geocodeResponse.ok) {
                const geocodeData = await geocodeResponse.json();
                console.log('📍 Données de géocodage pour', mission.departureAddress, ':', geocodeData);
                
                if (geocodeData && geocodeData.length > 0) {
                  const result = geocodeData[0];
                  const coordinates = {
                    latitude: parseFloat(result.lat),
                    longitude: parseFloat(result.lon)
                  };
                  console.log('✅ Coordonnées trouvées:', coordinates);
                  return {
                    ...mission,
                    coordinates: coordinates
                  };
                } else {
                  console.log('❌ Aucun résultat de géocodage pour:', mission.departureAddress);
                }
              } else {
                console.log('❌ Erreur de géocodage:', geocodeResponse.status);
              }
              
              // Fallback: essayer avec des adresses simplifiées
              console.log('🔄 Tentative de fallback pour:', mission.departureAddress);
              let fallbackAddress = mission.departureAddress;
              
              // Fallbacks pour les adresses arabes
              if (mission.departureAddress === 'تونس') {
                fallbackAddress = 'Tunis, Tunisia';
              } else if (mission.departureAddress === 'قمرت') {
                fallbackAddress = 'Gammarth, Tunisia';
              } else if (mission.departureAddress.includes('marsa') || mission.departureAddress.includes('Marsa')) {
                // Simplifier l'adresse de La Marsa
                fallbackAddress = 'La Marsa, Tunisia';
              } else if (mission.departureAddress.includes('sidi bou said') || mission.departureAddress.includes('Sidi Bou Said')) {
                fallbackAddress = 'Sidi Bou Said, Tunisia';
              } else if (mission.departureAddress.includes('gammarth') || mission.departureAddress.includes('Gammarth')) {
                fallbackAddress = 'Gammarth, Tunisia';
              }
              
              if (fallbackAddress !== mission.departureAddress) {
                console.log('🔄 Recherche avec adresse de fallback:', fallbackAddress);
                const fallbackResponse = await fetch(
                  `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fallbackAddress)}&format=json&limit=1&countrycodes=tn`,
                  {
                    headers: {
                      'User-Agent': 'LibertyMobile/1.0'
                    }
                  }
                );
                
                if (fallbackResponse.ok) {
                  const fallbackData = await fallbackResponse.json();
                  console.log('📍 Données de fallback:', fallbackData);
                  
                  if (fallbackData && fallbackData.length > 0) {
                    const result = fallbackData[0];
                    console.log('✅ Coordonnées trouvées avec fallback:', result.lat, result.lon);
                    return {
                      ...mission,
                      coordinates: {
                        latitude: parseFloat(result.lat),
                        longitude: parseFloat(result.lon)
                      }
                    };
                  }
                }
              }
              
              console.log('❌ Aucune coordonnée trouvée pour:', mission.departureAddress);
              return mission;
            } catch (error) {
              console.error('❌ Erreur de géocodage pour:', mission.departureAddress, error);
              return mission;
            }
          })
        );
        
        console.log('🎯 Missions avec coordonnées:', missionsWithCoords);
        console.log('🎯 Nombre de missions avec coordonnées:', missionsWithCoords.length);
        
        // Log détaillé des missions avec coordonnées
        missionsWithCoords.forEach((mission, index) => {
          if (mission.coordinates) {
            console.log(`📍 Mission ${index + 1} avec coordonnées:`, {
              client: mission.clientId?.first_name || 'Inconnu',
              address: mission.departureAddress,
              coordinates: mission.coordinates
            });
          } else {
            console.log(`❌ Mission ${index + 1} sans coordonnées:`, {
              client: mission.clientId?.first_name || 'Inconnu',
              address: mission.departureAddress
            });
          }
        });
        
        setAcceptedMissions(missionsWithCoords);
        
        // Attendre un peu pour s'assurer que les missions sont bien mises à jour
        setTimeout(() => {
          console.log('⏰ Délai écoulé, missions finales:', missionsWithCoords);
          console.log('⏰ État acceptedMissions après délai:', acceptedMissions);
        }, 1000);
      } else {
        console.error('❌ Erreur API:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des missions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWeatherData = async () => {
    if (!location) return;
    
    try {
      setWeatherLoading(true);
      console.log('🌤️ Chargement des données météo pour:', location);
      
      // Utiliser des données météo de démonstration pour éviter l'erreur API
      // Vous pouvez remplacer par une vraie API météo si vous avez une clé
      console.log('🌤️ Utilisation de données météo de démonstration');
      
      // Simuler un délai de chargement
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Données météo de démonstration pour Tunis
      setWeatherData({
        temperature: 24,
        description: 'Ensoleillé',
        humidity: 65,
        windSpeed: 12,
        windDirection: 180,
        pressure: 1013,
        visibility: 10,
        feelsLike: 26,
        icon: '01d'
      });
      
      console.log('🌤️ Données météo de démonstration chargées');
      
    } catch (error) {
      console.error('❌ Erreur lors du chargement de la météo:', error);
      // Données météo de démonstration en cas d'erreur
      setWeatherData({
        temperature: 22,
        description: 'Ensoleillé',
        humidity: 65,
        windSpeed: 12,
        windDirection: 180,
        pressure: 1013,
        visibility: 10,
        feelsLike: 24,
        icon: '01d'
      });
    } finally {
      setWeatherLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Permission de localisation refusée');
        // Coordonnées par défaut (Tunis)
        setLocation({ latitude: 36.8065, longitude: 10.1815 });
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude
      });
    } catch (error) {
      console.error('Erreur de localisation:', error);
      // Coordonnées par défaut (Tunis)
      setLocation({ latitude: 36.8065, longitude: 10.1815 });
    }
  };


  const toggleStatus = () => {
    const newStatus = userStatus === 'available' ? 'busy' : 'available';
    setUserStatus(newStatus);
    
    Alert.alert(
      'Statut mis à jour',
      `Vous êtes maintenant ${newStatus === 'available' ? 'disponible' : 'occupé'}`,
      [{ text: 'OK' }]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#28a745';
      case 'busy': return '#ffc107';
      case 'offline': return '#dc3545';
      default: return '#8e8e93';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available': return 'Disponible';
      case 'busy': return 'Occupé';
      case 'offline': return 'Hors ligne';
      default: return 'Inconnu';
    }
  };

  const getWeatherIcon = (iconCode) => {
    switch (iconCode) {
      case '01d': return 'sunny';
      case '01n': return 'moon';
      case '02d': case '02n': return 'partly-sunny';
      case '03d': case '03n': case '04d': case '04n': return 'cloudy';
      case '09d': case '09n': case '10d': case '10n': return 'rainy';
      case '11d': case '11n': return 'thunderstorm';
      case '13d': case '13n': return 'snow';
      case '50d': case '50n': return 'cloudy';
      default: return 'partly-sunny';
    }
  };

  const getWindDirection = (degrees) => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  const getWeatherBackground = (iconCode) => {
    switch (iconCode) {
      case '01d': return 'linear-gradient(135deg, #87CEEB 0%, #98D8E8 50%, #B0E0E6 100%)'; // Ciel bleu ensoleillé
      case '01n': return 'linear-gradient(135deg, #191970 0%, #483D8B 50%, #6A5ACD 100%)'; // Nuit étoilée
      case '02d': case '02n': return 'linear-gradient(135deg, #B0C4DE 0%, #C0C0C0 50%, #D3D3D3 100%)'; // Partiellement nuageux
      case '03d': case '03n': case '04d': case '04n': return 'linear-gradient(135deg, #708090 0%, #A9A9A9 50%, #C0C0C0 100%)'; // Nuageux
      case '09d': case '09n': case '10d': case '10n': return 'linear-gradient(135deg, #4682B4 0%, #5F9EA0 50%, #87CEEB 100%)'; // Pluvieux
      case '11d': case '11n': return 'linear-gradient(135deg, #2F4F4F 0%, #4682B4 50%, #708090 100%)'; // Orage
      case '13d': case '13n': return 'linear-gradient(135deg, #F0F8FF 0%, #E6E6FA 50%, #D3D3D3 100%)'; // Neige
      case '50d': case '50n': return 'linear-gradient(135deg, #D3D3D3 0%, #C0C0C0 50%, #A9A9A9 100%)'; // Brouillard
      default: return 'linear-gradient(135deg, #87CEEB 0%, #98D8E8 50%, #B0E0E6 100%)';
    }
  };

  const getWeatherEmoji = (iconCode) => {
    switch (iconCode) {
      case '01d': return '☀️';
      case '01n': return '🌙';
      case '02d': case '02n': return '⛅';
      case '03d': case '03n': case '04d': case '04n': return '☁️';
      case '09d': case '09n': case '10d': case '10n': return '🌧️';
      case '11d': case '11n': return '⛈️';
      case '13d': case '13n': return '❄️';
      case '50d': case '50n': return '🌫️';
      default: return '☀️';
    }
  };

  const getWeatherBackgroundColor = (iconCode) => {
    switch (iconCode) {
      case '01d': return '#87CEEB'; // Ciel bleu ensoleillé
      case '01n': return '#191970'; // Nuit étoilée
      case '02d': case '02n': return '#B0C4DE'; // Partiellement nuageux
      case '03d': case '03n': case '04d': case '04n': return '#708090'; // Nuageux
      case '09d': case '09n': case '10d': case '10n': return '#4682B4'; // Pluvieux
      case '11d': case '11n': return '#2F4F4F'; // Orage
      case '13d': case '13n': return '#F0F8FF'; // Neige
      case '50d': case '50n': return '#D3D3D3'; // Brouillard
      default: return '#87CEEB';
    }
  };

  const generateMapHTML = (missions = []) => {
    if (!location) {
      console.log('❌ Pas de localisation pour générer la carte');
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Carte Déménageur</title>
          <style>
            body { margin: 0; padding: 0; background: #f0f0f0; }
            #map { height: 100vh; width: 100%; display: flex; align-items: center; justify-content: center; }
          </style>
        </head>
        <body>
          <div id="map">
            <div style="text-align: center; color: #666;">
              <h3>Chargement de la localisation...</h3>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    console.log('🗺️ Génération de la carte Google Maps HTML');
    console.log('📊 Missions acceptées pour la carte:', missions);
    console.log('📊 Nombre total de missions:', missions.length);
    console.log('📍 Localisation déménageur:', location);
    console.log('📍 Latitude:', location.latitude);
    console.log('📍 Longitude:', location.longitude);
    console.log('🌤️ Données météo:', weatherData);
    
    // Vérifier que les coordonnées sont valides
    if (isNaN(location.latitude) || isNaN(location.longitude)) {
      console.error('❌ Coordonnées invalides:', location);
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Carte Déménageur</title>
          <style>
            body { margin: 0; padding: 0; background: #f0f0f0; }
            #map { height: 100vh; width: 100%; display: flex; align-items: center; justify-content: center; }
          </style>
        </head>
        <body>
          <div id="map">
            <div style="text-align: center; color: red; padding: 20px;">
              <h3>Erreur: Coordonnées invalides</h3>
              <p>Latitude: ${location.latitude}</p>
              <p>Longitude: ${location.longitude}</p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    // Générer les marqueurs des clients
    const missionsWithCoords = missions.filter(mission => mission.coordinates);
    console.log('📍 Missions avec coordonnées:', missionsWithCoords);
    console.log('📍 Nombre de missions avec coordonnées:', missionsWithCoords.length);
    
    // Log détaillé de chaque mission avec coordonnées
    missionsWithCoords.forEach((mission, index) => {
      console.log(`🎯 Mission ${index + 1} pour la carte:`, {
        client: mission.clientId?.first_name || 'Inconnu',
        coordinates: mission.coordinates,
        address: mission.departureAddress
      });
    });

    const clientMarkers = missionsWithCoords
      .map(mission => {
        const clientName = mission.clientId?.first_name || 'Client';
        const serviceType = mission.serviceType === 'demenagement' ? 'Déménagement' : 'Transport';
        const departureAddress = mission.departureAddress || 'Adresse non disponible';
        
        console.log(`🎯 Génération marqueur Google Maps pour ${clientName} à ${mission.coordinates.latitude}, ${mission.coordinates.longitude}`);
        
        return `
          // Marqueur client Google Maps - ${clientName}
          const clientIcon${mission._id} = {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: '#007bff',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          };
          
          const clientMarker${mission._id} = new google.maps.Marker({
            position: { lat: ${mission.coordinates.latitude}, lng: ${mission.coordinates.longitude} },
            map: map,
            icon: clientIcon${mission._id},
            title: '${clientName}'
          });
          
          const clientInfoWindow${mission._id} = new google.maps.InfoWindow({
            content: '<div style="text-align: center; padding: 5px; min-width: 200px;">' +
              '<h3 style="margin: 0; color: #007bff; font-size: 16px;">${clientName}</h3>' +
              '<p style="margin: 5px 0; color: #333; font-size: 14px;"><strong>Service:</strong> ${serviceType}</p>' +
              '<p style="margin: 5px 0; color: #333; font-size: 14px;"><strong>Départ:</strong> ${departureAddress}</p>' +
              '<p style="margin: 0; color: #666; font-size: 12px;">Mission acceptée</p>' +
            '</div>'
          });
          
          clientMarker${mission._id}.addListener('click', () => {
            clientInfoWindow${mission._id}.open(map, clientMarker${mission._id});
          });
        `;
      }).join('\n');

    console.log('🔧 Marqueurs clients Google Maps générés:', clientMarkers.length > 0 ? 'OUI' : 'NON');

    // Générer le widget météo HTML compact
    const now = new Date();
    const currentDate = now.toLocaleDateString('fr-FR', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
    const currentTime = now.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    const weatherWidgetHTML = weatherData ? `
      <div id="weather-widget" style="
        position: absolute;
        top: 15px;
        left: 15px;
        background: rgba(135, 206, 235, 0.4);
        border-radius: 12px;
        padding: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 1000;
        min-width: 150px;
        backdrop-filter: blur(25px);
        border: 1px solid rgba(255,255,255,0.2);
        -webkit-backdrop-filter: blur(25px);
      ">
        <!-- Date et heure -->
        <div style="
          text-align: center;
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 1px solid rgba(255,255,255,0.4);
        ">
          <div style="
            font-size: 15px;
            color: #ffffff;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            margin-bottom: 3px;
            font-weight: 600;
            letter-spacing: 0.5px;
          ">${currentDate}</div>
          <div style="
            font-size: 18px;
            font-weight: 800;
            color: #ffffff;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            letter-spacing: 1px;
          ">${currentTime}</div>
        </div>

        <!-- Météo principale -->
        <div style="
          display: flex;
          align-items: center;
          margin-bottom: 8px;
        ">
          <span style="font-size: 32px; margin-right: 8px; filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.6));">${getWeatherEmoji(weatherData.icon)}</span>
          <div style="flex: 1;">
            <div style="
              font-size: 17px;
              font-weight: 700;
              color: #ffffff;
              text-transform: capitalize;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
              margin-bottom: 2px;
              letter-spacing: 0.5px;
            ">${weatherData.description}</div>
            <div style="
              font-size: 26px;
              font-weight: 900;
              color: #ffffff;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
              letter-spacing: 1px;
            ">${weatherData.temperature}°C</div>
          </div>
        </div>
        
        <!-- Infos compactes -->
        <div style="
          display: flex;
          justify-content: space-between;
          background: rgba(255,255,255,0.15);
          border-radius: 8px;
          padding: 6px 8px;
          border: 1px solid rgba(255,255,255,0.2);
        ">
          <div style="display: flex; align-items: center; flex: 1; justify-content: center;">
            <span style="font-size: 14px; margin-right: 3px; filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.6));">💧</span>
            <span style="font-size: 13px; color: #ffffff; font-weight: 700; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">${weatherData.humidity}%</span>
          </div>
          <div style="display: flex; align-items: center; flex: 1; justify-content: center;">
            <span style="font-size: 14px; margin-right: 3px; filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.6));">🌬</span>
            <span style="font-size: 13px; color: #ffffff; font-weight: 700; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">${weatherData.windSpeed}</span>
          </div>
          <div style="display: flex; align-items: center; flex: 1; justify-content: center;">
            <span style="font-size: 14px; margin-right: 3px; filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.6));">👁</span>
            <span style="font-size: 13px; color: #ffffff; font-weight: 700; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">${weatherData.visibility}</span>
          </div>
        </div>
      </div>
    ` : '';

    // HTML simplifié et optimisé pour éviter les problèmes de chargement
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Carte Déménageur</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{height:100vh;width:100vw;overflow:hidden}
#map{height:100vh;width:100vw}
</style>
</head>
<body>
<div id="map"></div>
${weatherWidgetHTML}
<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBPVngcauCKYsBeA2wD3Cal3cXDKd7OEY4&libraries=places,directions&callback=initMap"></script>
<script>
window.initMap=function(){
try{
if(typeof google==='undefined'||typeof google.maps==='undefined'){
document.getElementById('map').innerHTML='<div style="padding:20px;text-align:center;color:red"><h3>Erreur: Google Maps non chargée</h3></div>';
return;
}
const mapDiv=document.getElementById('map');
const map=new google.maps.Map(mapDiv,{
center:{lat:${location.latitude},lng:${location.longitude}},
zoom:13,
zoomControl:true,
mapTypeControl:false,
streetViewControl:false,
fullscreenControl:false
});
const demenageurIcon={path:google.maps.SymbolPath.CIRCLE,scale:15,fillColor:'#ff6b35',fillOpacity:1,strokeColor:'#ffffff',strokeWeight:3};
const demenageurMarker=new google.maps.Marker({
position:{lat:${location.latitude},lng:${location.longitude}},
map:map,
icon:demenageurIcon,
title:'Votre Position'
});
const demenageurInfoWindow=new google.maps.InfoWindow({
content:'<div style="text-align:center;padding:5px"><h3 style="margin:0;color:#ff6b35;font-size:16px">Votre Position</h3><p style="margin:5px 0;color:#333;font-size:14px">Statut: ${userStatus === 'available' ? 'Disponible' : userStatus === 'busy' ? 'Occupé' : 'Hors ligne'}</p></div>'
});
demenageurMarker.addListener('click',()=>{demenageurInfoWindow.open(map,demenageurMarker);});
${clientMarkers}
if(window.ReactNativeWebView&&window.ReactNativeWebView.postMessage){
window.ReactNativeWebView.postMessage(JSON.stringify({type:'console',level:'log',message:'✅ Carte Google Maps initialisée avec succès'}));
}
}catch(e){
console.error('Erreur:',e);
if(window.ReactNativeWebView&&window.ReactNativeWebView.postMessage){
window.ReactNativeWebView.postMessage(JSON.stringify({type:'console',level:'error',message:'❌ Erreur: '+e.message}));
}
}
};
if(document.readyState==='complete'||document.readyState==='interactive'){
if(typeof google!=='undefined'&&typeof google.maps!=='undefined'){window.initMap();}
}else{
window.addEventListener('load',function(){setTimeout(function(){if(typeof google!=='undefined'&&typeof google.maps!=='undefined'){window.initMap();}},500);});
}
</script>
</body>
</html>`;

    return htmlContent;
  };


  // Générer le HTML
  const mapHTML = useMemo(() => {
    if (!location) {
      console.log('❌ Pas de localisation, HTML vide');
      return null;
    }
    
    try {
      const html = generateMapHTML(acceptedMissions);
      
      // Vérifier que le HTML est valide
      if (!html || typeof html !== 'string' || html.trim().length === 0) {
        console.error('❌ HTML généré est vide ou invalide!');
        return null;
      }
      
      // Vérifier que le HTML commence bien par <!DOCTYPE
      if (!html.trim().startsWith('<!DOCTYPE')) {
        console.error('❌ HTML ne commence pas par <!DOCTYPE, début:', html.substring(0, 50));
        return null;
      }
      
      console.log('✅ HTML généré avec succès, longueur:', html.length);
      console.log('✅ HTML contient "initMap":', html.includes('initMap'));
      console.log('✅ HTML contient "Google Maps":', html.includes('Google Maps'));
      
      return html;
    } catch (error) {
      console.error('❌ Erreur lors de la génération du HTML:', error);
      return null;
    }
  }, [location, acceptedMissions, weatherData, userStatus]);

  // Log pour vérifier que mapHTML est disponible avant le rendu
  useEffect(() => {
    if (location) {
      console.log('📍 Localisation disponible pour la carte');
      console.log('📄 mapHTML disponible:', !!mapHTML);
      console.log('📄 mapHTML type:', typeof mapHTML);
      if (mapHTML) {
        console.log('📄 mapHTML longueur:', mapHTML.length);
        console.log('📄 mapHTML commence par:', mapHTML.substring(0, 50));
      }
    }
  }, [location, mapHTML]);

  return (
    <View style={styles.container}>
      {/* Carte */}
      {location && mapHTML ? (
        <>
          <WebView
            ref={webViewRef}
            key={`map-${mapKey}`}
            source={{ 
              html: mapHTML,
              baseUrl: ''
            }}
            style={styles.map}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            mixedContentMode="always"
            originWhitelist={['*']}
            setSupportMultipleWindows={false}
            injectedJavaScript={`
              (function() {
                try {
                  console.log('🔧 [Injected] Script injecté s\'exécute');
                  console.log('🔧 [Injected] document.readyState:', document.readyState);
                  console.log('🔧 [Injected] document.body:', document.body ? 'existe' : 'n\'existe pas');
                  console.log('🔧 [Injected] document.getElementById("map"):', document.getElementById('map') ? 'existe' : 'n\'existe pas');
                  
                  if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'console',
                      level: 'log',
                      message: '🔧 [Injected] Script injecté fonctionne - document.body existe: ' + (document.body ? 'OUI' : 'NON')
                    }));
                  }
                } catch (e) {
                  console.error('❌ [Injected] Erreur:', e);
                }
              })();
              true;
            `}
            onShouldStartLoadWithRequest={(request) => {
              console.log('🔍 WebView demande de charger:', request.url);
              return true;
            }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('❌ Erreur WebView:', nativeEvent);
            console.error('❌ Code:', nativeEvent.code);
            console.error('❌ Description:', nativeEvent.description);
            console.error('❌ URL:', nativeEvent.url);
            console.error('❌ Domain:', nativeEvent.domain);
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('❌ Erreur HTTP WebView:', nativeEvent);
          }}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'console') {
                // Afficher les logs de la WebView
                if (data.level === 'error') {
                  console.error('🌐 [WebView]', data.message);
                } else if (data.level === 'warn') {
                  console.warn('🌐 [WebView]', data.message);
                } else {
                  console.log('🌐 [WebView]', data.message);
                }
              } else {
                console.log('📨 Message WebView:', data);
              }
            } catch (error) {
              console.log('📨 Message WebView (texte):', event.nativeEvent.data);
            }
          }}
          onLoadEnd={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.log('✅ WebView chargée');
            console.log('📄 URL chargée:', nativeEvent.url);
            console.log('📄 Navigation Type:', nativeEvent.navigationType);
            
            // Si l'URL est about:blank, injecter le HTML manuellement
            if (nativeEvent.url === 'about:blank' || !nativeEvent.url) {
              console.log('⚠️ WebView charge about:blank, injection manuelle du HTML...');
              
              if (webViewRef.current && mapHTML) {
                // Utiliser une approche simple avec document.write
                // Échapper les backticks et les ${ pour éviter les problèmes de template literals
                const safeHTML = mapHTML
                  .replace(/\\/g, '\\\\')
                  .replace(/`/g, '\\`')
                  .replace(/\${/g, '\\${');
                
                const injectScript = `
                  (function() {
                    try {
                      document.open();
                      document.write(\`${safeHTML}\`);
                      document.close();
                      if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                          type: 'console',
                          level: 'log',
                          message: '✅ HTML injecté manuellement'
                        }));
                      }
                    } catch (e) {
                      console.error('Erreur:', e);
                      if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                          type: 'console',
                          level: 'error',
                          message: '❌ Erreur injection: ' + e.message
                        }));
                      }
                    }
                  })();
                  true;
                `;
                
                setTimeout(() => {
                  console.log('🔄 Injection du HTML (longueur:', mapHTML.length, ')...');
                  webViewRef.current?.injectJavaScript(injectScript);
                }, 500);
              }
            }
          }}
          onLoadStart={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.log('🔄 WebView en cours de chargement...');
            console.log('📄 URL:', nativeEvent.url);
          }}
          onLoadProgress={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            const progress = Math.round(nativeEvent.progress * 100);
            console.log(`📊 Progression WebView: ${progress}%`);
          }}
          renderError={(errorName) => {
            console.error('❌ Erreur de rendu WebView:', errorName);
            return (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={48} color="#ff3b30" />
                <Text style={styles.errorText}>Erreur de chargement de la carte</Text>
                <Text style={styles.errorSubtext}>{errorName}</Text>
              </View>
            );
          }}
          />
        </>
      ) : (
        <View style={styles.loadingContainer}>
          <Ionicons name="location" size={48} color="#ff6b35" />
          <Text style={styles.loadingText}>Chargement de votre position...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: 'transparent',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerContent: {
    flex: 1,
    marginRight: 15,
  },
  headerInfo: {
    marginBottom: 10,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  refreshButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#1a0d2e',
    opacity: 0.9,
    marginTop: 2,
  },
  connectionStatus: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  hideRouteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    marginRight: 10,
  },
  hideRouteButtonText: {
    color: '#1a0d2e',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#8e8e93',
    marginTop: 15,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff3b30',
    marginTop: 15,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#8e8e93',
    marginTop: 10,
    textAlign: 'center',
  },
});

export default DemenageurAccueilScreen;
