require('dotenv').config();
const pool = require('../db');
const { queryOne, queryMany } = require('../utils/dbHelpers');

async function testDemenageursAPI() {
  try {
    console.log('🧪 Test de l\'API /api/demenageurs\n');
    
    // Simuler exactement ce que fait l'API
    console.log('1️⃣ Récupération des déménageurs...');
    const demenageurs = await queryMany(
      'SELECT id, first_name, last_name, email, phone, role, status, address, is_verified, created_at, updated_at FROM users WHERE role = $1 AND (status = $2 OR status = $3)',
      ['demenageur', 'available', 'inactive']
    );
    
    console.log(`   ✅ Déménageurs trouvés: ${demenageurs.length}`);
    demenageurs.forEach((d, i) => {
      console.log(`      ${i + 1}. ${d.first_name} ${d.last_name} - ${d.email} (status: ${d.status})`);
    });
    
    if (demenageurs.length === 0) {
      console.log('\n❌ Aucun déménageur trouvé dans la base de données !');
      await pool.end();
      process.exit(0);
    }
    
    console.log('\n2️⃣ Enrichissement avec profils et localisations...');
    const demenageursWithDetails = await Promise.all(
      demenageurs.map(async (demenageur) => {
        const profile = await queryOne(
          'SELECT * FROM mover_profiles WHERE user_id = $1',
          [demenageur.id]
        );
        const location = await queryOne(
          'SELECT * FROM user_locations WHERE user_id = $1',
          [demenageur.id]
        );
        
        console.log(`   📋 ${demenageur.first_name} ${demenageur.last_name}:`);
        console.log(`      - Profil: ${profile ? '✅' : '❌'}`);
        console.log(`      - Localisation: ${location ? `✅ (${location.lat}, ${location.lng})` : '❌'}`);
        
        return {
          id: demenageur.id,
          first_name: demenageur.first_name,
          last_name: demenageur.last_name,
          email: demenageur.email,
          phone: demenageur.phone,
          address: demenageur.address,
          status: demenageur.status,
          company_name: profile ? (profile.company_name || null) : null,
          rating: profile && profile.rating != null ? parseFloat(profile.rating) : 0,
          total_reviews: 0,
          experience_years: 0,
          services_offered: profile && profile.truck_types ? (Array.isArray(profile.truck_types) ? profile.truck_types : []) : [],
          is_verified: demenageur.is_verified || false,
          latitude: location ? parseFloat(location.lat) : null,
          longitude: location ? parseFloat(location.lng) : null,
          location: location ? {
            lat: parseFloat(location.lat),
            lng: parseFloat(location.lng),
            address: location.address || null,
            city: location.city || null,
            country: location.country || null
          } : null
        };
      })
    );
    
    console.log('\n3️⃣ Filtrage par statut...');
    const availableDemenageurs = demenageursWithDetails.filter(d => d.status === 'available');
    console.log(`   ✅ Déménageurs avec status='available': ${availableDemenageurs.length}`);
    console.log(`   📊 Total déménageurs traités: ${demenageursWithDetails.length}`);
    
    const finalData = availableDemenageurs.length > 0 ? availableDemenageurs : demenageursWithDetails;
    
    console.log('\n4️⃣ Résultat final de l\'API:');
    console.log(`   {
  success: true,
  data: [${finalData.length} déménageur(s)],
  count: ${finalData.length}
}`);
    
    console.log('\n5️⃣ Détails des déménageurs retournés:');
    finalData.forEach((d, i) => {
      console.log(`\n   ${i + 1}. ${d.first_name} ${d.last_name}`);
      console.log(`      - ID: ${d.id}`);
      console.log(`      - Email: ${d.email}`);
      console.log(`      - Status: ${d.status}`);
      console.log(`      - Latitude: ${d.latitude}`);
      console.log(`      - Longitude: ${d.longitude}`);
      console.log(`      - Location: ${d.location ? JSON.stringify(d.location) : 'null'}`);
      console.log(`      - Company: ${d.company_name || 'N/A'}`);
      console.log(`      - Verified: ${d.is_verified}`);
    });
    
    console.log('\n✅ Test terminé !');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('   Stack:', error.stack);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

testDemenageursAPI();

