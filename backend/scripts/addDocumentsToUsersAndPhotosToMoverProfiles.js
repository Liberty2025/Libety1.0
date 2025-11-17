require('dotenv').config();
const pool = require('../db');

async function addColumns() {
  try {
    console.log('🔍 Vérification des colonnes...\n');
    
    // 1. Vérifier et ajouter documents à users
    console.log('1️⃣ Vérification de la colonne documents dans users...');
    const documentsInUsers = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_schema = 'public' 
       AND table_name = 'users' 
       AND column_name = 'documents'`
    );

    if (documentsInUsers.rows.length === 0) {
      console.log('📝 Ajout de la colonne documents à users...');
      await pool.query(
        `ALTER TABLE users 
         ADD COLUMN documents JSONB DEFAULT '{}'::jsonb`
      );
      console.log('✅ Colonne documents ajoutée à users');
    } else {
      console.log('✅ La colonne documents existe déjà dans users');
    }

    // 2. Vérifier et ajouter carte_grise à mover_profiles
    console.log('\n2️⃣ Vérification de la colonne carte_grise dans mover_profiles...');
    const carteGrise = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_schema = 'public' 
       AND table_name = 'mover_profiles' 
       AND column_name = 'carte_grise'`
    );

    if (carteGrise.rows.length === 0) {
      console.log('📝 Ajout de la colonne carte_grise à mover_profiles...');
      await pool.query(
        `ALTER TABLE mover_profiles 
         ADD COLUMN carte_grise JSONB`
      );
      console.log('✅ Colonne carte_grise ajoutée à mover_profiles');
    } else {
      console.log('✅ La colonne carte_grise existe déjà dans mover_profiles');
    }

    // 3. Vérifier et ajouter carte_cin à mover_profiles
    console.log('\n3️⃣ Vérification de la colonne carte_cin dans mover_profiles...');
    const carteCin = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_schema = 'public' 
       AND table_name = 'mover_profiles' 
       AND column_name = 'carte_cin'`
    );

    if (carteCin.rows.length === 0) {
      console.log('📝 Ajout de la colonne carte_cin à mover_profiles...');
      await pool.query(
        `ALTER TABLE mover_profiles 
         ADD COLUMN carte_cin JSONB`
      );
      console.log('✅ Colonne carte_cin ajoutée à mover_profiles');
    } else {
      console.log('✅ La colonne carte_cin existe déjà dans mover_profiles');
    }

    // 4. Vérifier et ajouter permis à mover_profiles
    console.log('\n4️⃣ Vérification de la colonne permis dans mover_profiles...');
    const permis = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_schema = 'public' 
       AND table_name = 'mover_profiles' 
       AND column_name = 'permis'`
    );

    if (permis.rows.length === 0) {
      console.log('📝 Ajout de la colonne permis à mover_profiles...');
      await pool.query(
        `ALTER TABLE mover_profiles 
         ADD COLUMN permis JSONB`
      );
      console.log('✅ Colonne permis ajoutée à mover_profiles');
    } else {
      console.log('✅ La colonne permis existe déjà dans mover_profiles');
    }

    console.log('\n✅ Toutes les colonnes sont prêtes !');

  } catch (err) {
    console.error('❌ Erreur lors de l\'ajout des colonnes:', err.message);
    if (err.code === '42701') {
      console.log('⚠️  Une colonne existe déjà');
    }
    throw err;
  } finally {
    await pool.end();
  }
}

// Exécuter le script
addColumns()
  .then(() => {
    console.log('\n✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur lors de l\'exécution du script:', error);
    process.exit(1);
  });

