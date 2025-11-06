// Fonction pour calculer la distance entre deux points GPS
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Fonction pour trier les déménageurs par distance
export const sortDemenageursByDistance = (demenageurs, userLat, userLng) => {
  return demenageurs.map(demenageur => {
    // Obtenir les coordonnées (peuvent être dans location.lat/lng ou directement latitude/longitude)
    const demenageurLat = demenageur.latitude || demenageur.location?.lat;
    const demenageurLng = demenageur.longitude || demenageur.location?.lng;
    
    return {
      ...demenageur,
      distance: (demenageurLat && demenageurLng) ? calculateDistance(userLat, userLng, parseFloat(demenageurLat), parseFloat(demenageurLng)) : Infinity
    };
  }).sort((a, b) => a.distance - b.distance);
};

// Fonction pour générer le HTML de la carte avec les déménageurs
export const generateMapHTML = (latitude, longitude, demenageurs = []) => {
  // Filtrer les déménageurs qui ont des coordonnées valides
  const demenageursWithCoords = demenageurs.filter(d => {
    const lat = d.latitude || d.location?.lat;
    const lng = d.longitude || d.location?.lng;
    return lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));
  });

  const demenageursMarkers = demenageursWithCoords.map(demenageur => {
    // Toujours utiliser le nom complet (first_name + last_name) comme nom principal
    const fullName = `${demenageur.first_name || ''} ${demenageur.last_name || ''}`.trim() || 'Déménageur';
    const companyName = demenageur.company_name;
    const verifiedHTML = demenageur.is_verified ? '<p style="margin: 5px 0; color: #28a745; font-size: 14px;"><strong>✅</strong> Vérifié</p>' : '';
    
    // Obtenir les coordonnées (peuvent être dans location.lat/lng ou directement latitude/longitude)
    const demenageurLat = demenageur.latitude || demenageur.location?.lat;
    const demenageurLng = demenageur.longitude || demenageur.location?.lng;
    
    // Échapper les apostrophes pour JavaScript
    const escapedFullName = fullName.replace(/'/g, "\\'").replace(/"/g, '\\"');
    const escapedCompanyName = companyName ? companyName.replace(/'/g, "\\'").replace(/"/g, '\\"') : '';
    const escapedPhone = (demenageur.phone || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
    const escapedAddress = (demenageur.address || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
    const rating = demenageur.rating || 0;
    const totalReviews = demenageur.total_reviews || 0;
    const experienceYears = demenageur.experience_years || 0;
    
    // Utiliser l'ID du déménageur (peut être id ou _id)
    const demenageurId = demenageur.id || demenageur._id || `demenageur_${Math.random().toString(36).substr(2, 9)}`;
    
    // Construire le contenu de la popup avec le nom de l'entreprise si disponible
    const companyNameHTML = escapedCompanyName 
      ? `'<p style="margin: 5px 0; font-size: 12px; color: #666; font-style: italic;">${escapedCompanyName}</p>' +`
      : `'' +`;
    
    return `
      // Marqueur déménageur - ${fullName}
      const truckIcon${demenageurId.replace(/[^a-zA-Z0-9]/g, '_')} = {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 15,
        fillColor: '#ff6b35',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2
      };
      
      const marker${demenageurId.replace(/[^a-zA-Z0-9]/g, '_')} = new google.maps.Marker({
        position: { lat: ${parseFloat(demenageurLat)}, lng: ${parseFloat(demenageurLng)} },
        map: map,
        icon: truckIcon${demenageurId.replace(/[^a-zA-Z0-9]/g, '_')},
        title: '${escapedFullName}'
      });
      
      const popupContent${demenageurId.replace(/[^a-zA-Z0-9]/g, '_')} = '<div style="min-width: 200px; padding: 5px;">' +
        '<h3 style="margin: 0 0 10px 0; color: #ff6b35; font-size: 16px;">${escapedFullName}</h3>' +
        ${companyNameHTML}
        '<p style="margin: 5px 0; font-size: 14px;"><strong>📞</strong> ${escapedPhone || 'N/A'}</p>' +
        '<p style="margin: 5px 0; font-size: 14px;"><strong>⭐</strong> ${rating}/5 (${totalReviews} avis)</p>' +
        '<p style="margin: 5px 0; font-size: 14px;"><strong>📍</strong> ${escapedAddress || 'Adresse non disponible'}</p>' +
        '<p style="margin: 5px 0; font-size: 14px;"><strong>🚚</strong> ${experienceYears} ans d\\'expérience</p>' +
        '${verifiedHTML}' +
        '<div style="margin-top: 10px;">' +
          '<button onclick="selectDemenageur(\\'${demenageurId}\\')" style="' +
            'background: #ff6b35;' +
            'color: white;' +
            'border: none;' +
            'padding: 8px 16px;' +
            'border-radius: 4px;' +
            'cursor: pointer;' +
            'font-size: 12px;' +
            'width: 100%;' +
          '">Choisir ce déménageur</button>' +
        '</div>' +
      '</div>';
      
      const infoWindow${demenageurId.replace(/[^a-zA-Z0-9]/g, '_')} = new google.maps.InfoWindow({
        content: popupContent${demenageurId.replace(/[^a-zA-Z0-9]/g, '_')}
      });
      
      marker${demenageurId.replace(/[^a-zA-Z0-9]/g, '_')}.addListener('click', () => {
        // Fermer toutes les autres info windows
        infoWindows.forEach(window => window.close());
        infoWindow${demenageurId.replace(/[^a-zA-Z0-9]/g, '_')}.open(map, marker${demenageurId.replace(/[^a-zA-Z0-9]/g, '_')});
      });
      
      infoWindows.push(infoWindow${demenageurId.replace(/[^a-zA-Z0-9]/g, '_')});
    `;
  }).join('\n');

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Carte Déménageurs</title>
        <style>
            body { margin: 0; padding: 0; }
            #map { height: 100vh; width: 100vw; }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            console.log('🗺️ Initialisation Google Maps...');
            
            // Tableau pour stocker toutes les info windows
            const infoWindows = [];
            let map;
            
            // Fonction d'initialisation de la carte
            function initMap() {
                console.log('📍 Initialisation de la carte...');
                
                // Vérifier que Google Maps est chargé
                if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
                    console.error('❌ Google Maps API non chargée');
                    document.getElementById('map').innerHTML = '<div style="padding: 20px; text-align: center; color: red;"><h3>Erreur: Google Maps non chargée</h3><p>Vérifiez votre connexion internet</p></div>';
                    return;
                }
                
                // Initialiser la carte Google Maps
                map = new google.maps.Map(document.getElementById('map'), {
                center: { lat: ${latitude}, lng: ${longitude} },
                zoom: 12,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                styles: [
                    {
                        featureType: 'poi',
                        elementType: 'labels',
                        stylers: [{ visibility: 'off' }]
                    }
                ]
            });
            
                    console.log('📍 Carte Google Maps initialisée');
                    
                    // Marqueur de votre position
                    const userIcon = {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: '#007bff',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2
                    };
                    
                    const userMarker = new google.maps.Marker({
                        position: { lat: ${latitude}, lng: ${longitude} },
                        map: map,
                        icon: userIcon,
                        title: 'Votre position'
                    });
                    
                    const userInfoWindow = new google.maps.InfoWindow({
                        content: '<div style="text-align: center; padding: 5px;"><b>Votre position</b><br>Vous êtes ici</div>'
                    });
                    
                    userMarker.addListener('click', () => {
                        userInfoWindow.open(map, userMarker);
                    });
                    
                    console.log('🔵 Marqueur utilisateur ajouté');
                    
                    // Marqueurs des déménageurs
                    ${demenageursMarkers}
                    
                    console.log('🚚 Marqueurs déménageurs ajoutés:', ${demenageursWithCoords.length});
                    
                    console.log('✅ Carte complètement initialisée');
                }
                
                // Fonction pour sélectionner un déménageur
                function selectDemenageur(demenageurId) {
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'SELECT_DEMENAGEUR',
                            demenageurId: demenageurId
                        }));
                    } else {
                        console.log('Déménageur sélectionné:', demenageurId);
                    }
                }
                
                // Charger Google Maps API avec callback
                function loadGoogleMaps() {
                    const script = document.createElement('script');
                    script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyBPVngcauCKYsBeA2wD3Cal3cXDKd7OEY4&libraries=places&callback=initMap';
                    script.async = true;
                    script.defer = true;
                    script.onerror = function() {
                        console.error('❌ Erreur lors du chargement de Google Maps API');
                        document.getElementById('map').innerHTML = '<div style="padding: 20px; text-align: center; color: red;"><h3>Erreur: Impossible de charger Google Maps</h3><p>Vérifiez votre connexion internet</p></div>';
                    };
                    document.head.appendChild(script);
                }
                
                // Démarrer le chargement
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', loadGoogleMaps);
                } else {
                    loadGoogleMaps();
                }
                
                // Fallback si le callback ne fonctionne pas
                window.addEventListener('load', function() {
                    setTimeout(function() {
                        if (typeof google !== 'undefined' && typeof google.maps !== 'undefined' && !map) {
                            console.log('🔄 Initialisation de secours...');
                            initMap();
                        }
                    }, 1000);
                });
        </script>
    </body>
    </html>
  `;
};

