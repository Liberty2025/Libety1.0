const express = require('express');
const pool = require('./db');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Endpoint de santé pour tester la connectivité
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Serveur Liberty Mobile fonctionne',
    timestamp: new Date().toISOString(),
    websocket: 'disponible'
  });
});

// Test de connexion PostgreSQL
(async () => {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Connexion à PostgreSQL réussie !', result.rows[0]);
  } catch (error) {
    console.error('❌ Erreur de connexion à PostgreSQL:', error);
  }
})();

// Import des routes
const authRoutes = require('./routes/auth');
const demenageurAuthRoutes = require('./routes/demenageurAuth');
const userRoutes = require('./routes/users');
const reservationRoutes = require('./routes/reservations');
const demenageurRoutes = require('./routes/demenageurs');
const serviceRequestRoutes = require('./routes/serviceRequests');
const chatRoutes = require('./routes/chat');
const statisticsRoutes = require('./routes/statistics');

// Routes de base
app.get('/', (req, res) => {
  res.json({ 
    message: 'Liberty Mobile Backend API',
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      demenageurAuth: '/api/auth/demenageur',
      users: '/api/users',
      reservations: '/api/reservations',
      demenageurs: '/api/demenageurs',
      serviceRequests: '/api/service-requests',
      statistics: '/api/statistics',
      chat: '/api/chat',
      health: '/api/health'
    }
  });
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'OK',
      database: 'Connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({ 
      status: 'OK',
      database: 'Disconnected',
      timestamp: new Date().toISOString()
    });
  }
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/auth/demenageur', demenageurAuthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/demenageurs', demenageurRoutes);
app.use('/api/service-requests', serviceRequestRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/statistics', statisticsRoutes);

// Gestion des connexions WebSocket
io.on('connection', (socket) => {
  console.log('🔌 Client connecté:', socket.id);
  console.log('🔍 Handshake auth:', socket.handshake.auth);
  console.log('🌐 Origine de la connexion:', socket.handshake.headers.origin || 'N/A');
  console.log('📡 Transport utilisé:', socket.conn.transport.name);

  // Authentification automatique avec le token
  const token = socket.handshake.auth.token;

  console.log('🔑 Données d\'authentification reçues:', {
    token: token ? 'PRÉSENT' : 'ABSENT',
    tokenLength: token ? token.length : 0,
    tokenStart: token ? token.substring(0, 20) + '...' : 'N/A',
    authObject: socket.handshake.auth
  });

  if (token) {
    // Vérifier le token JWT
    const jwt = require('jsonwebtoken');
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'liberty_mobile_secret_key');
      socket.userId = decoded.userId || decoded.id; // Support pour userId ou id
      socket.userRole = decoded.role;
      const roomName = `user_${socket.userId}`;
      socket.join(roomName);
      console.log(`👤 Utilisateur authentifié: ${socket.userId} (${decoded.role})`);
      console.log(`🏠 Socket a rejoint la room: ${roomName}`);
      console.log(`🔍 Token décodé:`, { userId: decoded.userId, id: decoded.id, role: decoded.role });
    } catch (error) {
      console.log('❌ Token invalide:', error.message);
      console.log('🔍 Token reçu:', token.substring(0, 50) + '...');
      socket.disconnect();
    }
  } else {
    console.log('⚠️ Pas de token fourni - connexion anonyme autorisée pour les tests');
    socket.userId = 'anonymous';
    socket.userRole = 'test';
    console.log('🧪 Socket de test connecté');
  }

  // Authentification manuelle (fallback)
  socket.on('authenticate', (data) => {
    socket.userId = data.userId;
    socket.userRole = data.userRole;
    socket.join(`user_${data.userId}`);
    console.log(`👤 Utilisateur authentifié manuellement: ${data.userId} (${data.userRole})`);
  });

  // Rejoindre une room pour une mission spécifique
  socket.on('join_mission', (missionId) => {
    socket.join(`mission_${missionId}`);
    console.log(`📋 Socket ${socket.id} a rejoint la mission ${missionId}`);
  });

  // Quitter une room de mission
  socket.on('leave_mission', (missionId) => {
    socket.leave(`mission_${missionId}`);
    console.log(`📋 Socket ${socket.id} a quitté la mission ${missionId}`);
  });

  // Événements de chat en temps réel
  socket.on('join_chat', (data) => {
    const { chatId } = data;
    socket.join(`chat_${chatId}`);
    console.log(`💬 Socket ${socket.id} a rejoint le chat ${chatId}`);
  });

  socket.on('leave_chat', (data) => {
    const { chatId } = data;
    socket.leave(`chat_${chatId}`);
    console.log(`💬 Socket ${socket.id} a quitté le chat ${chatId}`);
  });

  socket.on('send_message', async (data) => {
    try {
      const { chatId, content, messageType = 'text' } = data;
      const userId = socket.userId;
      const userRole = socket.userRole;

      console.log('📤 Message reçu via WebSocket:', { chatId, content, userId, userRole });

      // Vérifier que l'utilisateur a accès à ce chat
      const { queryOne, query } = require('./utils/dbHelpers');
      const chat = await queryOne(
        'SELECT * FROM chats WHERE id = $1',
        [chatId]
      );
      
      if (!chat) {
        console.log('❌ Chat non trouvé:', chatId);
        return;
      }

      if (chat.client_id !== userId && chat.demenageur_id !== userId) {
        console.log('❌ Accès non autorisé au chat:', chatId);
        return;
      }

      // Créer le message
      const messageResult = await query(
        `INSERT INTO chat_messages (id, chat_id, service_request_id, sender_id, sender_type, content, message_type, status, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING *`,
        [chatId, chat.service_request_id, userId, userRole, content, messageType, 'sent']
      );
      const message = messageResult.rows[0];

      // Mettre à jour le chat
      if (userRole === 'client') {
        await query(
          `UPDATE chats 
           SET last_message_at = NOW(), unread_by_demenageur = unread_by_demenageur + 1
           WHERE id = $1`,
          [chatId]
        );
      } else {
        await query(
          `UPDATE chats 
           SET last_message_at = NOW(), unread_by_client = unread_by_client + 1
           WHERE id = $1`,
          [chatId]
        );
      }

      // Récupérer les informations de l'expéditeur
      const sender = await queryOne(
        'SELECT first_name, last_name FROM users WHERE id = $1',
        [userId]
      );

      // Émettre le message à tous les participants du chat
      io.to(`chat_${chatId}`).emit('new_message', {
        chatId,
        message: {
          id: message.id,
          content: message.content,
          senderType: message.sender_type,
          senderName: sender ? `${sender.first_name} ${sender.last_name}` : 'Unknown',
          messageType: message.message_type,
          createdAt: message.created_at,
          status: message.status
        }
      });

      console.log('✅ Message diffusé dans le chat:', chatId);

    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi du message via WebSocket:', error);
    }
  });

  socket.on('mark_messages_read', async (data) => {
    try {
      const { chatId } = data;
      const userId = socket.userId;
      const userRole = socket.userRole;

      console.log('👁️ Marquage des messages comme lus:', { chatId, userId, userRole });

      const { queryOne, query } = require('./utils/dbHelpers');
      const chat = await queryOne(
        'SELECT * FROM chats WHERE id = $1',
        [chatId]
      );
      
      if (!chat) {
        console.log('❌ Chat non trouvé:', chatId);
        return;
      }

      if (chat.client_id !== userId && chat.demenageur_id !== userId) {
        console.log('❌ Accès non autorisé au chat:', chatId);
        return;
      }

      // Marquer les messages comme lus
      if (userRole === 'client') {
        await query(
          `UPDATE chats SET unread_by_client = 0 WHERE id = $1`,
          [chatId]
        );
        await query(
          `UPDATE chat_messages 
           SET status = 'read', read_at = NOW() 
           WHERE chat_id = $1 AND sender_type = 'demenageur' AND status = 'sent'`,
          [chatId]
        );
      } else if (userRole === 'demenageur') {
        await query(
          `UPDATE chats SET unread_by_demenageur = 0 WHERE id = $1`,
          [chatId]
        );
        await query(
          `UPDATE chat_messages 
           SET status = 'read', read_at = NOW() 
           WHERE chat_id = $1 AND sender_type = 'client' AND status = 'sent'`,
          [chatId]
        );
      }

      // Notifier l'autre utilisateur que les messages ont été lus
      const targetUserId = userRole === 'client' ? chat.demenageur_id : chat.client_id;
      io.to(`user_${targetUserId}`).emit('messages_read', {
        chatId,
        readBy: userId
      });

      console.log('✅ Messages marqués comme lus dans le chat:', chatId);

    } catch (error) {
      console.error('❌ Erreur lors du marquage des messages:', error);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Client déconnecté:', socket.id, 'Raison:', reason);
  });

  socket.on('error', (error) => {
    console.error('❌ Erreur WebSocket:', error);
  });
});

// Rendre io accessible aux routes
app.set('io', io);

// Démarrage du serveur
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📱 API disponible sur: http://localhost:${PORT}`);
  console.log(`🌐 API accessible depuis le réseau sur: http://192.168.1.13:${PORT}`);
  console.log(`🔌 WebSocket disponible sur: ws://localhost:${PORT}`);
});

