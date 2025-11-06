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
  return demenageurs.map(demenageur => ({
    ...demenageur,
    distance: calculateDistance(userLat, userLng, demenageur.latitude, demenageur.longitude)
  })).sort((a, b) => a.distance - b.distance);
};

// Fonction pour générer le HTML de la carte avec les déménageurs
export const generateMapHTML = (latitude, longitude, demenageurs = []) => {
  const demenageursMarkers = demenageurs.map(demenageur => {
    const companyName = demenageur.company_name || `${demenageur.first_name} ${demenageur.last_name}`;
    const verifiedHTML = demenageur.is_verified ? '<p style="margin: 5px 0; color: #28a745; font-size: 14px;"><strong>✅</strong> Vérifié</p>' : '';
    
    // Échapper les apostrophes pour JavaScript
    const escapedCompanyName = companyName.replace(/'/g, "\\'").replace(/"/g, '\\"');
    const escapedPhone = (demenageur.phone || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
    const escapedAddress = (demenageur.address || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
    const rating = demenageur.rating || 0;
    const totalReviews = demenageur.total_reviews || 0;
    const experienceYears = demenageur.experience_years || 0;
    
    return `
      // Marqueur déménageur - ${companyName}
      const truckIcon${demenageur.id} = {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 15,
        fillColor: '#ff6b35',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2
      };
      
      const marker${demenageur.id} = new google.maps.Marker({
        position: { lat: ${demenageur.latitude}, lng: ${demenageur.longitude} },
        map: map,
        icon: truckIcon${demenageur.id},
        title: '${escapedCompanyName}'
      });
      
      const popupContent${demenageur.id} = '<div style="min-width: 200px; padding: 5px;">' +
        '<h3 style="margin: 0 0 10px 0; color: #ff6b35; font-size: 16px;">${escapedCompanyName}</h3>' +
        '<p style="margin: 5px 0; font-size: 14px;"><strong>📞</strong> ${escapedPhone}</p>' +
        '<p style="margin: 5px 0; font-size: 14px;"><strong>⭐</strong> ${rating}/5 (${totalReviews} avis)</p>' +
        '<p style="margin: 5px 0; font-size: 14px;"><strong>📍</strong> ${escapedAddress}</p>' +
        '<p style="margin: 5px 0; font-size: 14px;"><strong>🚚</strong> ${experienceYears} ans d\\'expérience</p>' +
        '${verifiedHTML}' +
        '<div style="margin-top: 10px;">' +
          '<button onclick="selectDemenageur(\\'${demenageur.id}\\')" style="' +
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
      
      const infoWindow${demenageur.id} = new google.maps.InfoWindow({
        content: popupContent${demenageur.id}
      });
      
      marker${demenageur.id}.addListener('click', () => {
        // Fermer toutes les autres info windows
        infoWindows.forEach(window => window.close());
        infoWindow${demenageur.id}.open(map, marker${demenageur.id});
      });
      
      infoWindows.push(infoWindow${demenageur.id});
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
        <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBPVngcauCKYsBeA2wD3Cal3cXDKd7OEY4&libraries=places"></script>
        <script>
            console.log('🗺️ Initialisation Google Maps...');
            
            // Tableau pour stocker toutes les info windows
            const infoWindows = [];
            
            // Initialiser la carte Google Maps
            const map = new google.maps.Map(document.getElementById('map'), {
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
            
            console.log('🚚 Marqueurs déménageurs ajoutés');
            
            // Fonction pour sélectionner un déménageur
            function selectDemenageur(demenageurId) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'SELECT_DEMENAGEUR',
                    demenageurId: demenageurId
                }));
            }
            
            console.log('✅ Carte complètement initialisée');
        </script>
    </body>
    </html>
  `;
};

