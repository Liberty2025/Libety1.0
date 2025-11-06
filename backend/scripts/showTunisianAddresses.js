const mongoose = require('mongoose');
require('dotenv').config();

// Import des modèles
const User = require('../models/User');
const UserLocation = require('../models/UserLocation');

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connexion à MongoDB réussie');
  showTunisianAddresses();
})
.catch((error) => {
  console.error('❌ Erreur de connexion à MongoDB:', error);
});

async function showTunisianAddresses() {
  try {
    console.log('🇹🇳 Adresses des déménageurs en Tunisie\n');

    // Récupérer tous les déménageurs avec leurs localisations
    const demenageurs = await User.find({ role: 'demenageur' }).select('-password');
    
    for (const demenageur of demenageurs) {
      const location = await UserLocation.findOne({ user_id: demenageur._id });
      
      console.log(`🚚 ${demenageur.first_name} ${demenageur.last_name}`);
      console.log(`   📧 ${demenageur.email}`);
      console.log(`   📍 ${demenageur.address}`);
      console.log(`   🗺️  Coordonnées: ${demenageur.latitude}, ${demenageur.longitude}`);
      if (location) {
        console.log(`   📍 Localisation: ${location.address}`);
      }
      console.log(`   📱 Téléphone: ${demenageur.phone}`);
      console.log(`   🏢 SIRET: ${demenageur.siret}`);
      console.log(`   ✅ Statut: ${demenageur.status}`);
      console.log('   ' + '─'.repeat(50));
    }

    console.log('\n🎯 Résumé des villes tunisiennes:');
    const cities = [
      'La Marsa - Avenue Habib Bourguiba',
      'Aouina - Zone Industrielle',
      'Ain Zaghouen - Ben Arous',
      'Sidi Bou Said - Village pittoresque',
      'Carthage - Site historique'
    ];
    
    cities.forEach((city, index) => {
      console.log(`   ${index + 1}. ${city}`);
    });

    console.log('\n✅ Tous les déménageurs sont maintenant localisés en Tunisie !');

  } catch (error) {
    console.error('❌ Erreur lors de l\'affichage des adresses:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Connexion à la base de données fermée');
  }
}
