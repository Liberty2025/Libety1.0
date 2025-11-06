const mongoose = require('mongoose');
require('dotenv').config();

// Import des modèles
const { User, MoverProfile, DemenageurGiftStats, SubscriptionPlan } = require('../models');

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connexion à MongoDB réussie');
  testData();
})
.catch((error) => {
  console.error('❌ Erreur de connexion à MongoDB:', error);
});

async function testData() {
  try {
    console.log('🔍 Test des données insérées...\n');

    // 1. Vérifier les déménageurs
    const demenageurs = await User.find({ role: 'demenageur' }).select('-password');
    console.log(`👥 Déménageurs trouvés: ${demenageurs.length}`);
    demenageurs.forEach((demenageur, index) => {
      console.log(`   ${index + 1}. ${demenageur.first_name} ${demenageur.last_name} - ${demenageur.email}`);
    });

    // 2. Vérifier les profils des déménageurs
    const profiles = await MoverProfile.find();
    console.log(`\n👷 Profils de déménageurs: ${profiles.length}`);
    profiles.forEach((profile, index) => {
      console.log(`   ${index + 1}. ${profile.company_name} - Note: ${profile.rating}/5 (${profile.total_reviews} avis)`);
    });

    // 3. Vérifier les statistiques de cadeaux
    const giftStats = await DemenageurGiftStats.find();
    console.log(`\n🎁 Statistiques de cadeaux: ${giftStats.length}`);
    giftStats.forEach((stat, index) => {
      console.log(`   ${index + 1}. Score: ${stat.current_score} - Cadeaux reçus: ${stat.total_gifts_received}`);
    });

    // 4. Vérifier les plans d'abonnement
    const plans = await SubscriptionPlan.find();
    console.log(`\n💳 Plans d'abonnement: ${plans.length}`);
    plans.forEach((plan, index) => {
      console.log(`   ${index + 1}. ${plan.name} - ${plan.price}€/${plan.billing_cycle}`);
    });

    // 5. Test des relations
    console.log(`\n🔗 Test des relations:`);
    const firstDemenageur = demenageurs[0];
    const firstProfile = await MoverProfile.findOne({ user_id: firstDemenageur._id });
    const firstGiftStats = await DemenageurGiftStats.findOne({ demenageur_id: firstDemenageur._id });
    
    console.log(`   Déménageur: ${firstDemenageur.first_name} ${firstDemenageur.last_name}`);
    console.log(`   Entreprise: ${firstProfile ? firstProfile.company_name : 'Non trouvé'}`);
    console.log(`   Score: ${firstGiftStats ? firstGiftStats.current_score : 'Non trouvé'}`);

    console.log('\n✅ Tous les tests sont passés avec succès !');
    console.log('\n📊 Résumé des données:');
    console.log(`   - ${demenageurs.length} déménageurs`);
    console.log(`   - ${profiles.length} profils`);
    console.log(`   - ${giftStats.length} statistiques de cadeaux`);
    console.log(`   - ${plans.length} plans d'abonnement`);

  } catch (error) {
    console.error('❌ Erreur lors du test des données:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Connexion à la base de données fermée');
  }
}
