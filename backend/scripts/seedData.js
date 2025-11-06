const mongoose = require('mongoose');
require('dotenv').config();

// Import des modèles
const User = require('../models/User');
const UserLocation = require('../models/UserLocation');
const MoverProfile = require('../models/MoverProfile');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const DemenageurSubscription = require('../models/DemenageurSubscription');
const DemenageurGiftStats = require('../models/DemenageurGiftStats');
const DemenageurPaymentPreferences = require('../models/DemenageurPaymentPreferences');
const ScoringConfig = require('../models/ScoringConfig');
const DemenageurGift = require('../models/DemenageurGift');

// Connexion à MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connexion à MongoDB réussie');
  seedData();
})
.catch((error) => {
  console.error('❌ Erreur de connexion à MongoDB:', error);
});

async function seedData() {
  try {
    console.log('🌱 Début de l\'insertion des données...');

    // 1. Créer les plans d'abonnement
    const plans = await SubscriptionPlan.insertMany([
      {
        plan_id: 'basic',
        name: 'Plan Basique',
        description: 'Plan basique pour déménageurs débutants',
        price: 29.99,
        currency: 'EUR',
        billing_cycle: 'monthly',
        features: {
          max_reservations: 10,
          priority_support: false,
          analytics: false
        }
      },
      {
        plan_id: 'premium',
        name: 'Plan Premium',
        description: 'Plan premium avec fonctionnalités avancées',
        price: 59.99,
        currency: 'EUR',
        billing_cycle: 'monthly',
        features: {
          max_reservations: 50,
          priority_support: true,
          analytics: true
        }
      },
      {
        plan_id: 'pro',
        name: 'Plan Pro',
        description: 'Plan professionnel illimité',
        price: 99.99,
        currency: 'EUR',
        billing_cycle: 'monthly',
        features: {
          max_reservations: -1, // Illimité
          priority_support: true,
          analytics: true,
          custom_branding: true
        }
      }
    ]);
    console.log('✅ Plans d\'abonnement créés');

    // 2. Créer les 5 déménageurs
    const demenageurs = await User.insertMany([
      {
        first_name: 'Ali',
        last_name: 'Ben Ali',
        email: 'ali.benali@example.com',
        phone: '+33123456789',
        password: 'password123', // En production, utiliser bcrypt
        role: 'demenageur',
        siret: '12345678901234',
        insurance_attestations: 'Attestation d\'assurance valide jusqu\'en 2025',
        permits: 'Permis de transport de marchandises',
        address: '123 Rue de la Paix, 75001 Paris, France',
        latitude: 48.8566,
        longitude: 2.3522,
        status: 'available'
      },
      {
        first_name: 'Mohamed',
        last_name: 'Trabelsi',
        email: 'mohamed.trabelsi@example.com',
        phone: '+33123456790',
        password: 'password123',
        role: 'demenageur',
        siret: '12345678901235',
        insurance_attestations: 'Attestation d\'assurance valide jusqu\'en 2025',
        permits: 'Permis de transport de marchandises',
        address: '456 Avenue des Champs-Élysées, 75008 Paris, France',
        latitude: 48.8566,
        longitude: 2.3522,
        status: 'available'
      },
      {
        first_name: 'Lassad',
        last_name: 'Hammami',
        email: 'lassad.hammami@example.com',
        phone: '+33123456791',
        password: 'password123',
        role: 'demenageur',
        siret: '12345678901236',
        insurance_attestations: 'Attestation d\'assurance valide jusqu\'en 2025',
        permits: 'Permis de transport de marchandises',
        address: '789 Boulevard Saint-Germain, 75006 Paris, France',
        latitude: 48.8566,
        longitude: 2.3522,
        status: 'available'
      },
      {
        first_name: 'Sofien',
        last_name: 'Khelil',
        email: 'sofien.khelil@example.com',
        phone: '+33123456792',
        password: 'password123',
        role: 'demenageur',
        siret: '12345678901237',
        insurance_attestations: 'Attestation d\'assurance valide jusqu\'en 2025',
        permits: 'Permis de transport de marchandises',
        address: '321 Rue de Rivoli, 75001 Paris, France',
        latitude: 48.8566,
        longitude: 2.3522,
        status: 'available'
      },
      {
        first_name: 'Seddik',
        last_name: 'Bouaziz',
        email: 'seddik.bouaziz@example.com',
        phone: '+33123456793',
        password: 'password123',
        role: 'demenageur',
        siret: '12345678901238',
        insurance_attestations: 'Attestation d\'assurance valide jusqu\'en 2025',
        permits: 'Permis de transport de marchandises',
        address: '654 Place de la Bastille, 75011 Paris, France',
        latitude: 48.8566,
        longitude: 2.3522,
        status: 'available'
      }
    ]);
    console.log('✅ 5 déménageurs créés');

    // 3. Créer les profils des déménageurs
    const moverProfiles = await MoverProfile.insertMany([
      {
        user_id: demenageurs[0]._id,
        company_name: 'Déménagements Ali Express',
        description: 'Service de déménagement rapide et fiable dans toute la région parisienne',
        experience_years: 5,
        services_offered: ['Déménagement résidentiel', 'Déménagement commercial', 'Emballage', 'Montage/Démontage'],
        equipment_available: ['Camion 20m³', 'Camion 30m³', 'Matériel d\'emballage', 'Diable', 'Sangles'],
        insurance_coverage: true,
        license_number: 'LIC-ALI-2024-001',
        rating: 4.8,
        total_reviews: 127,
        is_verified: true
      },
      {
        user_id: demenageurs[1]._id,
        company_name: 'Mohamed Moving Services',
        description: 'Déménagements professionnels avec une équipe expérimentée',
        experience_years: 8,
        services_offered: ['Déménagement résidentiel', 'Déménagement commercial', 'Stockage', 'Nettoyage'],
        equipment_available: ['Camion 25m³', 'Camion 35m³', 'Matériel d\'emballage', 'Protection sols', 'Échelle'],
        insurance_coverage: true,
        license_number: 'LIC-MOH-2024-002',
        rating: 4.9,
        total_reviews: 203,
        is_verified: true
      },
      {
        user_id: demenageurs[2]._id,
        company_name: 'Lassad Transport',
        description: 'Transport et déménagement avec garantie de satisfaction',
        experience_years: 3,
        services_offered: ['Déménagement résidentiel', 'Transport d\'objets fragiles'],
        equipment_available: ['Camion 15m³', 'Matériel d\'emballage', 'Coussinets de protection'],
        insurance_coverage: true,
        license_number: 'LIC-LAS-2024-003',
        rating: 4.6,
        total_reviews: 89,
        is_verified: true
      },
      {
        user_id: demenageurs[3]._id,
        company_name: 'Sofien Déménagements',
        description: 'Service de déménagement écologique et responsable',
        experience_years: 6,
        services_offered: ['Déménagement résidentiel', 'Déménagement commercial', 'Recyclage emballages'],
        equipment_available: ['Camion 20m³', 'Camion électrique 15m³', 'Emballages recyclables'],
        insurance_coverage: true,
        license_number: 'LIC-SOF-2024-004',
        rating: 4.7,
        total_reviews: 156,
        is_verified: true
      },
      {
        user_id: demenageurs[4]._id,
        company_name: 'Seddik Express Moving',
        description: 'Déménagements express 24h/7j avec service premium',
        experience_years: 10,
        services_offered: ['Déménagement résidentiel', 'Déménagement commercial', 'Service express', 'Montage meubles'],
        equipment_available: ['Camion 30m³', 'Camion 40m³', 'Matériel professionnel', 'Outils montage'],
        insurance_coverage: true,
        license_number: 'LIC-SED-2024-005',
        rating: 4.9,
        total_reviews: 312,
        is_verified: true
      }
    ]);
    console.log('✅ Profils des déménageurs créés');

    // 4. Créer les localisations des déménageurs
    const locations = await UserLocation.insertMany([
      {
        user_id: demenageurs[0]._id,
        lat: 48.8566,
        lng: 2.3522,
        address: '123 Rue de la Paix, 75001 Paris, France'
      },
      {
        user_id: demenageurs[1]._id,
        lat: 48.8566,
        lng: 2.3522,
        address: '456 Avenue des Champs-Élysées, 75008 Paris, France'
      },
      {
        user_id: demenageurs[2]._id,
        lat: 48.8566,
        lng: 2.3522,
        address: '789 Boulevard Saint-Germain, 75006 Paris, France'
      },
      {
        user_id: demenageurs[3]._id,
        lat: 48.8566,
        lng: 2.3522,
        address: '321 Rue de Rivoli, 75001 Paris, France'
      },
      {
        user_id: demenageurs[4]._id,
        lat: 48.8566,
        lng: 2.3522,
        address: '654 Place de la Bastille, 75011 Paris, France'
      }
    ]);
    console.log('✅ Localisations des déménageurs créées');

    // 5. Créer les abonnements des déménageurs
    const subscriptions = await DemenageurSubscription.insertMany([
      {
        demenageur_id: demenageurs[0]._id,
        subscription_type: 'premium',
        status: 'active',
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours
        payment_method: 'credit_card'
      },
      {
        demenageur_id: demenageurs[1]._id,
        subscription_type: 'pro',
        status: 'active',
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        payment_method: 'credit_card'
      },
      {
        demenageur_id: demenageurs[2]._id,
        subscription_type: 'basic',
        status: 'active',
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        payment_method: 'paypal'
      },
      {
        demenageur_id: demenageurs[3]._id,
        subscription_type: 'premium',
        status: 'active',
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        payment_method: 'credit_card'
      },
      {
        demenageur_id: demenageurs[4]._id,
        subscription_type: 'pro',
        status: 'active',
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        payment_method: 'bank_transfer'
      }
    ]);
    console.log('✅ Abonnements des déménageurs créés');

    // 6. Créer les statistiques de cadeaux
    const giftStats = await DemenageurGiftStats.insertMany([
      {
        demenageur_id: demenageurs[0]._id,
        current_score: 150,
        total_gifts_received: 2
      },
      {
        demenageur_id: demenageurs[1]._id,
        current_score: 280,
        total_gifts_received: 4
      },
      {
        demenageur_id: demenageurs[2]._id,
        current_score: 75,
        total_gifts_received: 1
      },
      {
        demenageur_id: demenageurs[3]._id,
        current_score: 200,
        total_gifts_received: 3
      },
      {
        demenageur_id: demenageurs[4]._id,
        current_score: 350,
        total_gifts_received: 6
      }
    ]);
    console.log('✅ Statistiques de cadeaux créées');

    // 7. Créer les préférences de paiement
    const paymentPreferences = await DemenageurPaymentPreferences.insertMany([
      {
        demenageur_id: demenageurs[0]._id,
        preferred_method: 'bank_transfer',
        bank_account: 'FR76 1234 5678 9012 3456 7890 123'
      },
      {
        demenageur_id: demenageurs[1]._id,
        preferred_method: 'paypal',
        paypal_email: 'mohamed.trabelsi@paypal.com'
      },
      {
        demenageur_id: demenageurs[2]._id,
        preferred_method: 'bank_transfer',
        bank_account: 'FR76 1234 5678 9012 3456 7890 124'
      },
      {
        demenageur_id: demenageurs[3]._id,
        preferred_method: 'paypal',
        paypal_email: 'sofien.khelil@paypal.com'
      },
      {
        demenageur_id: demenageurs[4]._id,
        preferred_method: 'bank_transfer',
        bank_account: 'FR76 1234 5678 9012 3456 7890 125'
      }
    ]);
    console.log('✅ Préférences de paiement créées');

    // 8. Créer la configuration du scoring
    const scoringConfigs = await ScoringConfig.insertMany([
      {
        config_key: 'points_per_reservation',
        config_value: '10',
        description: 'Points gagnés par réservation complétée'
      },
      {
        config_key: 'points_per_5_star_rating',
        config_value: '5',
        description: 'Points bonus pour une évaluation 5 étoiles'
      },
      {
        config_key: 'points_per_referral',
        config_value: '25',
        description: 'Points pour chaque nouveau déménageur référé'
      },
      {
        config_key: 'gift_threshold_basic',
        config_value: '100',
        description: 'Seuil minimum pour recevoir un cadeau basique'
      },
      {
        config_key: 'gift_threshold_premium',
        config_value: '250',
        description: 'Seuil minimum pour recevoir un cadeau premium'
      }
    ]);
    console.log('✅ Configuration du scoring créée');

    // 9. Créer des cadeaux pour déménageurs
    const gifts = await DemenageurGift.insertMany([
      {
        name: 'Café Premium',
        description: 'Un mois de café premium livré à domicile',
        required_score: 100,
        gift_type: 'consumable',
        value: 25.00
      },
      {
        name: 'Équipement Professionnel',
        description: 'Kit d\'équipement professionnel pour déménageurs',
        required_score: 250,
        gift_type: 'equipment',
        value: 150.00
      },
      {
        name: 'Formation Avancée',
        description: 'Formation en ligne sur les techniques de déménagement',
        required_score: 200,
        gift_type: 'education',
        value: 75.00
      },
      {
        name: 'Assurance Complémentaire',
        description: 'Un mois d\'assurance complémentaire gratuite',
        required_score: 300,
        gift_type: 'service',
        value: 50.00
      },
      {
        name: 'Voucher Repas',
        description: 'Voucher de 100€ pour restaurants partenaires',
        required_score: 400,
        gift_type: 'voucher',
        value: 100.00
      }
    ]);
    console.log('✅ Cadeaux pour déménageurs créés');

    console.log('🎉 Toutes les données ont été insérées avec succès !');
    console.log(`📊 Résumé:`);
    console.log(`   - ${plans.length} plans d'abonnement`);
    console.log(`   - ${demenageurs.length} déménageurs`);
    console.log(`   - ${moverProfiles.length} profils de déménageurs`);
    console.log(`   - ${locations.length} localisations`);
    console.log(`   - ${subscriptions.length} abonnements`);
    console.log(`   - ${giftStats.length} statistiques de cadeaux`);
    console.log(`   - ${paymentPreferences.length} préférences de paiement`);
    console.log(`   - ${scoringConfigs.length} configurations de scoring`);
    console.log(`   - ${gifts.length} cadeaux`);

  } catch (error) {
    console.error('❌ Erreur lors de l\'insertion des données:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Connexion à la base de données fermée');
  }
}
