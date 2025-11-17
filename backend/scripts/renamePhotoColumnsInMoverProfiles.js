require('dotenv').config();
const pool = require('../db');

async function renamePhotoColumnsInUsers() {
  try {
    console.log('🔄 Renommage des colonnes photo dans la table users...\n');
    
    // 1. Renommer profile_photo_public_id en carte_grise
    console.log('1️⃣ Vérification de profile_photo_public_id dans users...');
    const profilePhoto = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_schema = 'public' 
       AND table_name = 'users' 
       AND column_name = 'profile_photo_public_id'`
    );

    if (profilePhoto.rows.length > 0) {
      console.log('📝 Renommage de profile_photo_public_id en carte_grise...');
      await pool.query(
        `ALTER TABLE users 
         RENAME COLUMN profile_photo_public_id TO carte_grise`
      );
      console.log('✅ Colonne renommée: profile_photo_public_id → carte_grise');
      
      // Convertir en JSONB si ce n'est pas déjà le cas
      const colType = await pool.query(
        `SELECT data_type 
         FROM information_schema.columns 
         WHERE table_schema = 'public' 
         AND table_name = 'users' 
         AND column_name = 'carte_grise'`
      );
      
      if (colType.rows[0] && colType.rows[0].data_type !== 'jsonb') {
        console.log('📝 Conversion de carte_grise en JSONB...');
        await pool.query(
          `ALTER TABLE users 
           ALTER COLUMN carte_grise TYPE JSONB USING carte_grise::jsonb`
        );
        console.log('✅ carte_grise converti en JSONB');
      }
    } else {
      // Vérifier si carte_grise existe déjà
      const carteGriseExists = await pool.query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_schema = 'public' 
         AND table_name = 'users' 
         AND column_name = 'carte_grise'`
      );
      if (carteGriseExists.rows.length > 0) {
        console.log('✅ La colonne carte_grise existe déjà');
      } else {
        console.log('📝 Ajout de la colonne carte_grise...');
        await pool.query(
          `ALTER TABLE users 
           ADD COLUMN carte_grise JSONB`
        );
        console.log('✅ Colonne carte_grise ajoutée');
      }
    }

    // 2. Renommer cin_photo_public_id en carte_cin
    console.log('\n2️⃣ Vérification de cin_photo_public_id dans users...');
    const cinPhoto = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_schema = 'public' 
       AND table_name = 'users' 
       AND column_name = 'cin_photo_public_id'`
    );

    if (cinPhoto.rows.length > 0) {
      console.log('📝 Renommage de cin_photo_public_id en carte_cin...');
      await pool.query(
        `ALTER TABLE users 
         RENAME COLUMN cin_photo_public_id TO carte_cin`
      );
      console.log('✅ Colonne renommée: cin_photo_public_id → carte_cin');
      
      // Convertir en JSONB si ce n'est pas déjà le cas
      const colType = await pool.query(
        `SELECT data_type 
         FROM information_schema.columns 
         WHERE table_schema = 'public' 
         AND table_name = 'users' 
         AND column_name = 'carte_cin'`
      );
      
      if (colType.rows[0] && colType.rows[0].data_type !== 'jsonb') {
        console.log('📝 Conversion de carte_cin en JSONB...');
        await pool.query(
          `ALTER TABLE users 
           ALTER COLUMN carte_cin TYPE JSONB USING carte_cin::jsonb`
        );
        console.log('✅ carte_cin converti en JSONB');
      }
    } else {
      // Vérifier si carte_cin existe déjà
      const carteCinExists = await pool.query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_schema = 'public' 
         AND table_name = 'users' 
         AND column_name = 'carte_cin'`
      );
      if (carteCinExists.rows.length > 0) {
        console.log('✅ La colonne carte_cin existe déjà');
      } else {
        console.log('📝 Ajout de la colonne carte_cin...');
        await pool.query(
          `ALTER TABLE users 
           ADD COLUMN carte_cin JSONB`
        );
        console.log('✅ Colonne carte_cin ajoutée');
      }
    }

    // 3. Renommer insurance_photo_public_id en permis
    console.log('\n3️⃣ Vérification de insurance_photo_public_id dans users...');
    const insurancePhoto = await pool.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_schema = 'public' 
       AND table_name = 'users' 
       AND column_name = 'insurance_photo_public_id'`
    );

    if (insurancePhoto.rows.length > 0) {
      console.log('📝 Renommage de insurance_photo_public_id en permis...');
      await pool.query(
        `ALTER TABLE users 
         RENAME COLUMN insurance_photo_public_id TO permis`
      );
      console.log('✅ Colonne renommée: insurance_photo_public_id → permis');
      
      // Convertir en JSONB si ce n'est pas déjà le cas
      const colType = await pool.query(
        `SELECT data_type 
         FROM information_schema.columns 
         WHERE table_schema = 'public' 
         AND table_name = 'users' 
         AND column_name = 'permis'`
      );
      
      if (colType.rows[0] && colType.rows[0].data_type !== 'jsonb') {
        console.log('📝 Conversion de permis en JSONB...');
        await pool.query(
          `ALTER TABLE users 
           ALTER COLUMN permis TYPE JSONB USING permis::jsonb`
        );
        console.log('✅ permis converti en JSONB');
      }
    } else {
      // Vérifier si permis existe déjà
      const permisExists = await pool.query(
        `SELECT column_name 
         FROM information_schema.columns 
         WHERE table_schema = 'public' 
         AND table_name = 'users' 
         AND column_name = 'permis'`
      );
      if (permisExists.rows.length > 0) {
        console.log('✅ La colonne permis existe déjà');
      } else {
        console.log('📝 Ajout de la colonne permis...');
        await pool.query(
          `ALTER TABLE users 
           ADD COLUMN permis JSONB`
        );
        console.log('✅ Colonne permis ajoutée');
      }
    }

    console.log('\n✅ Toutes les colonnes sont prêtes dans users !');

  } catch (err) {
    console.error('❌ Erreur lors du renommage des colonnes:', err.message);
    if (err.code === '42701') {
      console.log('⚠️  Une colonne existe déjà');
    } else if (err.code === '42804') {
      console.log('⚠️  Erreur de type de données');
    }
    throw err;
  } finally {
    await pool.end();
  }
}

// Exécuter le script
renamePhotoColumnsInUsers()
  .then(() => {
    console.log('\n✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur lors de l\'exécution du script:', error);
    process.exit(1);
  });

