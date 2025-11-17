require('dotenv').config();
const pool = require('../db');

async function addCinNumberToMoverProfiles() {
  try {
    console.log('🔍 Vérification de l\'existence de la colonne cin_number dans la table mover_profiles...');
    
    // Vérifier si la colonne existe déjà
    const columnExists = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_schema = 'public' 
       AND table_name = 'mover_profiles' 
       AND column_name = 'cin_number'`
    );

    if (columnExists.rows.length > 0) {
      console.log('✅ La colonne cin_number existe déjà dans la table mover_profiles');
      return;
    }

    console.log('📝 Ajout de la colonne cin_number à la table mover_profiles...');
    
    // Ajouter la colonne cin_number
    await pool.query(
      `ALTER TABLE mover_profiles 
       ADD COLUMN cin_number VARCHAR(20) UNIQUE`
    );

    console.log('✅ Colonne cin_number ajoutée avec succès à la table mover_profiles');

  } catch (err) {
    console.error('❌ Erreur lors de l\'ajout de la colonne:', err.message);
    if (err.code === '23505') {
      console.log('⚠️  La contrainte UNIQUE existe déjà, la colonne a peut-être été créée partiellement');
    } else if (err.code === '42701') {
      console.log('⚠️  La colonne existe déjà');
    }
    throw err;
  } finally {
    await pool.end();
  }
}

// Exécuter le script
addCinNumberToMoverProfiles()
  .then(() => {
    console.log('✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur lors de l\'exécution du script:', error);
    process.exit(1);
  });

