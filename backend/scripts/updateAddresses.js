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
  updateAddresses();
})
.catch((error) => {
  console.error('❌ Erreur de connexion à MongoDB:', error);
});

async function updateAddresses() {
  try {
    console.log('🇹🇳 Mise à jour des adresses pour la Tunisie...\n');

    // Coordonnées GPS de différentes villes tunisiennes
    const tunisianLocations = [
      {
        name: 'La Marsa',
        address: 'Avenue Habib Bourguiba, La Marsa, Tunis, Tunisie',
        lat: 36.8667,
        lng: 10.3167
      },
      {
        name: 'Aouina',
        address: 'Zone Industrielle Aouina, Tunis, Tunisie',
        lat: 36.8500,
        lng: 10.2000
      },
      {
        name: 'Ain Zaghouen',
        address: 'Ain Zaghouen, Ben Arous, Tunisie',
        lat: 36.7833,
        lng: 10.2167
      },
      {
        name: 'Sidi Bou Said',
        address: 'Sidi Bou Said, Tunis, Tunisie',
        lat: 36.8667,
        lng: 10.3500
      },
      {
        name: 'Carthage',
        address: 'Carthage, Tunis, Tunisie',
        lat: 36.8500,
        lng: 10.3167
      }
    ];

    // Récupérer tous les déménageurs
    const demenageurs = await User.find({ role: 'demenageur' });
    console.log(`👥 ${demenageurs.length} déménageurs trouvés`);

    // Mettre à jour chaque déménageur avec une adresse tunisienne
    for (let i = 0; i < demenageurs.length; i++) {
      const demenageur = demenageurs[i];
      const location = tunisianLocations[i % tunisianLocations.length];
      
      // Mettre à jour l'utilisateur
      demenageur.address = location.address;
      demenageur.latitude = location.lat;
      demenageur.longitude = location.lng;
      await demenageur.save();

      // Mettre à jour la localisation
      const userLocation = await UserLocation.findOne({ user_id: demenageur._id });
      if (userLocation) {
        userLocation.lat = location.lat;
        userLocation.lng = location.lng;
        userLocation.address = location.address;
        await userLocation.save();
      } else {
        // Créer une nouvelle localisation si elle n'existe pas
        const newLocation = new UserLocation({
          user_id: demenageur._id,
          lat: location.lat,
          lng: location.lng,
          address: location.address
        });
        await newLocation.save();
      }

      console.log(`✅ ${demenageur.first_name} ${demenageur.last_name} - ${location.name}`);
    }

    console.log('\n🎉 Toutes les adresses ont été mises à jour avec succès !');
    console.log('\n📍 Nouvelles adresses:');
    
    // Afficher les nouvelles adresses
    const updatedDemenageurs = await User.find({ role: 'demenageur' }).select('first_name last_name address latitude longitude');
    updatedDemenageurs.forEach((demenageur, index) => {
      console.log(`   ${index + 1}. ${demenageur.first_name} ${demenageur.last_name}`);
      console.log(`      📍 ${demenageur.address}`);
      console.log(`      🗺️  ${demenageur.latitude}, ${demenageur.longitude}\n`);
    });

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour des adresses:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Connexion à la base de données fermée');
  }
}
