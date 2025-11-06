require('dotenv').config();
const { Pool } = require('pg');

const buildPoolConfig = () => {
  // Use DATABASE_URL if provided
  if (process.env.DATABASE_URL) {
    const useSsl = String(process.env.DATABASE_SSL || '').toLowerCase() === 'true';
    // Vérifier et corriger le port dans DATABASE_URL si nécessaire
    let dbUrl = process.env.DATABASE_URL;
    // Si le port est 543 (incomplet), le remplacer par 5432
    dbUrl = dbUrl.replace(/:543([^0-9]|$)/, ':5432$1');
    
    console.log('🔍 Configuration PostgreSQL (DATABASE_URL):', {
      host: dbUrl.match(/@([^:]+)/)?.[1] || 'N/A',
      port: dbUrl.match(/:(\d+)/)?.[1] || 'N/A',
      database: dbUrl.match(/\/([^?]+)/)?.[1] || 'N/A',
      ssl: useSsl
    });
    
    return {
      connectionString: dbUrl,
      ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    };
  }

  // fallback to individual DB_* vars
  const port = Number(process.env.DB_PORT || 5432);
  // S'assurer que le port est valide (au moins 1024)
  const validPort = (port && port >= 1024) ? port : 5432;
  
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: validPort,
    user: process.env.DB_USER || 'liberty',
    password: process.env.DB_PASSWORD ? '***' : 'motdepassefort',
    database: process.env.DB_NAME || 'liberty',
    ssl: false,
  };
  
  console.log('🔍 Configuration PostgreSQL (variables individuelles):', {
    host: config.host,
    port: config.port,
    user: config.user,
    database: config.database,
    ssl: config.ssl
  });
  
  return {
    ...config,
    password: process.env.DB_PASSWORD || 'motdepassefort', // Remettre le vrai mot de passe
  };
};

const pool = new Pool(buildPoolConfig());

// Test connection immediately
(async () => {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Connexion PostgreSQL réussie !', res.rows[0]);
  } catch (err) {
    console.error('❌ Erreur de connexion PostgreSQL :', err.message);
    console.error('   Code:', err.code);
    console.error('   Détails:', {
      address: err.address,
      port: err.port,
      syscall: err.syscall
    });
    console.error('\n💡 Vérifiez votre fichier .env :');
    console.error('   - DB_HOST ou DATABASE_URL');
    console.error('   - DB_PORT (doit être 5432, pas 543)');
    console.error('   - DB_USER, DB_PASSWORD, DB_NAME');
  }
})();

pool.on('error', (err) => {
  console.error('❌ Erreur de pool PostgreSQL :', err);
});

module.exports = pool;

