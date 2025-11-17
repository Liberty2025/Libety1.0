require('dotenv').config();
const pool = require('../db');

async function verifyDemenageur() {
  try {
    const email = 'seddik.25@gmail.com';
    
    // Vérifier que le déménageur existe
    const user = await pool.query(
      'SELECT id, first_name, last_name, email, is_verified, status FROM users WHERE email = $1 AND role = $2',
      [email, 'demenageur']
    );
    
    if (user.rows.length === 0) {
      console.log(`❌ Aucun déménageur trouvé avec l'email: ${email}`);
      await pool.end();
      process.exit(1);
    }
    
    const demenageur = user.rows[0];
    console.log(`\n📋 Déménageur trouvé:`);
    console.log(`   - Nom: ${demenageur.first_name} ${demenageur.last_name}`);
    console.log(`   - Email: ${demenageur.email}`);
    console.log(`   - Vérifié actuellement: ${demenageur.is_verified ? 'Oui' : 'Non'}`);
    console.log(`   - Statut: ${demenageur.status || 'N/A'}\n`);
    
    // Mettre à jour is_verified à true
    const result = await pool.query(
      'UPDATE users SET is_verified = true WHERE email = $1 AND role = $2 RETURNING *',
      [email, 'demenageur']
    );
    
    const updated = result.rows[0];
    console.log(`✅ Compte mis à jour avec succès !`);
    console.log(`   - Vérifié maintenant: ${updated.is_verified ? 'Oui' : 'Non'}\n`);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

verifyDemenageur();

