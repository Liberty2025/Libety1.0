require('dotenv').config();
const pool = require('../db');

async function countDemenageurs() {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE role = $1',
      ['demenageur']
    );
    
    const count = parseInt(result.rows[0].count);
    console.log(`\n📊 Nombre de déménageurs dans la base de données: ${count}\n`);
    
    // Optionnel: Afficher aussi quelques détails
    if (count > 0) {
      const demenageurs = await pool.query(
        'SELECT id, first_name, last_name, email, is_verified, status FROM users WHERE role = $1 LIMIT 10',
        ['demenageur']
      );
      
      console.log('📋 Liste des déménageurs (10 premiers):');
      demenageurs.rows.forEach((d, index) => {
        console.log(`   ${index + 1}. ${d.first_name} ${d.last_name} (${d.email}) - Vérifié: ${d.is_verified ? 'Oui' : 'Non'}, Statut: ${d.status || 'N/A'}`);
      });
      if (count > 10) {
        console.log(`   ... et ${count - 10} autres déménageurs`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

countDemenageurs();

