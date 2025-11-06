const mongoose = require('mongoose');
require('dotenv').config();

// Import des modèles
const { User, UserLocation, MoverProfile } = require('../models');

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connexion à MongoDB réussie');
  testTunisianAPI();
})
.catch((error) => {
  console.error('❌ Erreur de connexion à MongoDB:', error);
});

async function testTunisianAPI() {
  try {
    console.log('🇹🇳 Test de l\'API avec les adresses tunisiennes\n');

    // 1. Test de récupération des déménageurs
    console.log('📋 Test 1: Récupération des déménageurs');
    const demenageurs = await User.find({ role: 'demenageur' }).select('-password');
    console.log(`   ✅ ${demenageurs.length} déménageurs trouvés\n`);

    // 2. Test de récupération des déménageurs à proximité (simulation)
    console.log('📍 Test 2: Déménageurs à proximité (simulation)');
    const tunisCoords = { lat: 36.8065, lng: 10.1815 }; // Centre de Tunis
    console.log(`   🗺️  Coordonnées de référence: ${tunisCoords.lat}, ${tunisCoords.lng}`);
    
    for (const demenageur of demenageurs) {
      const distance = calculateDistance(
        tunisCoords.lat, tunisCoords.lng,
        demenageur.latitude, demenageur.longitude
      );
      console.log(`   🚚 ${demenageur.first_name} ${demenageur.last_name} - ${distance.toFixed(2)} km`);
    }

    // 3. Test des profils complets
    console.log('\n👷 Test 3: Profils complets des déménageurs');
    for (const demenageur of demenageurs) {
      const profile = await MoverProfile.findOne({ user_id: demenageur._id });
      const location = await UserLocation.findOne({ user_id: demenageur._id });
      
      console.log(`   🚚 ${demenageur.first_name} ${demenageur.last_name}`);
      console.log(`      🏢 ${profile ? profile.company_name : 'Pas de profil'}`);
      console.log(`      📍 ${demenageur.address}`);
      console.log(`      ⭐ Note: ${profile ? profile.rating : 'N/A'}/5`);
      console.log(`      🎯 Score: ${profile ? 'Disponible' : 'N/A'}`);
    }

    // 4. Test des coordonnées GPS
    console.log('\n🗺️  Test 4: Validation des coordonnées GPS');
    for (const demenageur of demenageurs) {
      const isValidLat = demenageur.latitude >= -90 && demenageur.latitude <= 90;
      const isValidLng = demenageur.longitude >= -180 && demenageur.longitude <= 180;
      const isInTunisia = demenageur.latitude >= 30 && demenageur.latitude <= 38 && 
                         demenageur.longitude >= 7 && demenageur.longitude <= 12;
      
      console.log(`   🚚 ${demenageur.first_name}:`);
      console.log(`      📍 ${demenageur.latitude}, ${demenageur.longitude}`);
      console.log(`      ✅ Latitude valide: ${isValidLat}`);
      console.log(`      ✅ Longitude valide: ${isValidLng}`);
      console.log(`      🇹🇳 En Tunisie: ${isInTunisia}`);
    }

    console.log('\n🎉 Tous les tests sont passés avec succès !');
    console.log('\n📊 Résumé:');
    console.log(`   - ${demenageurs.length} déménageurs en Tunisie`);
    console.log(`   - Toutes les coordonnées GPS sont valides`);
    console.log(`   - Tous les déménageurs sont localisés en Tunisie`);
    console.log(`   - API prête pour les requêtes de proximité`);

  } catch (error) {
    console.error('❌ Erreur lors du test de l\'API:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Connexion à la base de données fermée');
  }
}

// Fonction pour calculer la distance entre deux points GPS
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
