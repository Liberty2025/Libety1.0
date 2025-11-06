const pool = require('../db');

// Helper pour exécuter une requête SQL
const query = async (text, params) => {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('Erreur SQL:', error);
    throw error;
  }
};

// Helper pour obtenir un seul résultat
const queryOne = async (text, params) => {
  const result = await query(text, params);
  return result.rows[0] || null;
};

// Helper pour obtenir plusieurs résultats
const queryMany = async (text, params) => {
  const result = await query(text, params);
  return result.rows;
};

module.exports = {
  query,
  queryOne,
  queryMany,
  pool
};

