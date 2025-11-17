require('dotenv').config();
const pool = require('../db');

async function renamePhotoColumns() {
  try {
    console.log('🔄 Renommage des colonnes photo dans la table users...\n');
    
    // 1. Renommer profile_photo_public_id en carte_grise
    console.log('1️⃣ Vérification de profile_photo_public_id...');
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
    console.log('\n2️⃣ Vérification de cin_photo_public_id...');
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
    console.log('\n3️⃣ Vérification de insurance_photo_public_id...');
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

    // 4. Vérifier le type des colonnes et les convertir en JSONB si nécessaire
    console.log('\n4️⃣ Vérification des types de colonnes...');
    const columns = await pool.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_schema = 'public' 
       AND table_name = 'users' 
       AND column_name IN ('carte_grise', 'carte_cin', 'permis')`
    );

    for (const col of columns.rows) {
      if (col.data_type !== 'jsonb') {
        console.log(`📝 Conversion de ${col.column_name} en JSONB...`);
        await pool.query(
          `ALTER TABLE users 
           ALTER COLUMN ${col.column_name} TYPE JSONB USING ${col.column_name}::jsonb`
        );
        console.log(`✅ ${col.column_name} converti en JSONB`);
      } else {
        console.log(`✅ ${col.column_name} est déjà de type JSONB`);
      }
    }

    console.log('\n✅ Toutes les colonnes sont prêtes !');

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
renamePhotoColumns()
  .then(() => {
    console.log('\n✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur lors de l\'exécution du script:', error);
    process.exit(1);
  });

