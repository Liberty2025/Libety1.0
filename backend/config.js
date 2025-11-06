module.exports = {
  // Configuration de la base de données
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb+srv://username:password@cluster.mongodb.net/liberty_mobile?retryWrites=true&w=majority'
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
