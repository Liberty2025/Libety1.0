module.exports = {
  // Configuration de la base de données PostgreSQL
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'liberty',
    password: process.env.DB_PASSWORD || 'motdepassefort',
    database: process.env.DB_NAME || 'liberty',
    ssl: process.env.DATABASE_SSL === 'true'
  },
  
  // Configuration JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'liberty_mobile_super_secret_key_2024',
    expiresIn: '7d'
  },
  
  // Configuration du serveur
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  
  // Configuration CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:19006'
  }
};
