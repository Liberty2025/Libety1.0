require('dotenv').config();
const pool = require('../db');

async function showNotificationColumns() {
  try {
    const { rows } = await pool.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'notifications'
       ORDER BY ordinal_position`
    );

    console.log('📋 Colonnes de la table notifications :');
    rows.forEach((row) => {
      console.log(` - ${row.column_name}: ${row.data_type}, nullable=${row.is_nullable}, default=${row.column_default}`);
    });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des colonnes notifications:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

showNotificationColumns();

