require('dotenv').config();
const pool = require('../db');

async function addCinNumberColumn() {
  try {
    console.log('🔍 Vérification de l\'existence de la colonne cin_number dans la table users...');
    
    // Vérifier si la colonne existe déjà
    const columnExists = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_schema = 'public' 
       AND table_name = 'users' 
       AND column_name = 'cin_number'`
    );

    if (columnExists.rows.length > 0) {
      console.log('✅ La colonne cin_number existe déjà dans la table users');
      return;
    }

    // Vérifier si l'ancienne colonne identity_card_number existe
    const oldColumnExists = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_schema = 'public' 
       AND table_name = 'users' 
       AND column_name = 'identity_card_number'`
    );

    if (oldColumnExists.rows.length > 0) {
      console.log('📝 Renommage de la colonne identity_card_number en cin_number...');
      await pool.query(
        `ALTER TABLE users 
         RENAME COLUMN identity_card_number TO cin_number`
      );
      console.log('✅ Colonne renommée avec succès');
    } else {
      console.log('📝 Ajout de la colonne cin_number à la table users...');
      
      // Ajouter la colonne cin_number
      await pool.query(
        `ALTER TABLE users 
         ADD COLUMN cin_number VARCHAR(20) UNIQUE`
      );

      console.log('✅ Colonne cin_number ajoutée avec succès à la table users');
    }

  } catch (err) {
    console.error('❌ Erreur lors de l\'ajout/renommage de la colonne:', err.message);
    if (err.code === '23505') {
      console.log('⚠️  La contrainte UNIQUE existe déjà, la colonne a peut-être été créée partiellement');
    } else if (err.code === '42701') {
      console.log('⚠️  La colonne existe déjà sous un autre nom');
    }
    throw err;
  } finally {
    await pool.end();
  }
}

// Exécuter le script
addCinNumberColumn()
  .then(() => {
    console.log('✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur lors de l\'exécution du script:', error);
    process.exit(1);
  });

