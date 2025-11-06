require('dotenv').config();
const pool = require('../db');

async function addIdentityCardNumberColumn() {
  try {
    console.log('🔍 Vérification de l\'existence de la colonne identity_card_number...');
    
    // Vérifier si la colonne existe déjà
    const columnExists = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_schema = 'public' 
       AND table_name = 'users' 
       AND column_name = 'identity_card_number'`
    );

    if (columnExists.rows.length > 0) {
      console.log('✅ La colonne identity_card_number existe déjà');
      return;
    }

    console.log('📝 Ajout de la colonne identity_card_number à la table users...');
    
    // Ajouter la colonne identity_card_number
    await pool.query(
      `ALTER TABLE users 
       ADD COLUMN identity_card_number VARCHAR(20) UNIQUE`
    );

    console.log('✅ Colonne identity_card_number ajoutée avec succès');

    // Vérifier aussi si la colonne documents existe
    const documentsExists = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_schema = 'public' 
       AND table_name = 'users' 
       AND column_name = 'documents'`
    );

    if (documentsExists.rows.length === 0) {
      console.log('📝 Ajout de la colonne documents à la table users...');
      await pool.query(
        `ALTER TABLE users 
         ADD COLUMN documents JSONB DEFAULT '{}'::jsonb`
      );
      console.log('✅ Colonne documents ajoutée avec succès');
    } else {
      console.log('✅ La colonne documents existe déjà');
    }

  } catch (err) {
    console.error('❌ Erreur lors de l\'ajout de la colonne:', err.message);
    if (err.code === '23505') {
      console.log('⚠️  La contrainte UNIQUE existe déjà, la colonne a peut-être été créée partiellement');
    }
  } finally {
    await pool.end();
  }
}

addIdentityCardNumberColumn();

