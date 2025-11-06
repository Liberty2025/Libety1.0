const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
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

// Connexion à MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connexion à MongoDB Atlas réussie');
})
.catch((error) => {
  console.error('❌ Erreur de connexion à MongoDB:', error);
});

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

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
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
      const { Chat, ChatMessage } = require('./models');
      const chat = await Chat.findById(chatId);
      
      if (!chat) {
        console.log('❌ Chat non trouvé:', chatId);
        return;
      }

      if (chat.clientId.toString() !== userId && chat.demenageurId.toString() !== userId) {
        console.log('❌ Accès non autorisé au chat:', chatId);
        return;
      }

      // Créer le message
      const message = new ChatMessage({
        chatId,
        serviceRequestId: chat.serviceRequestId,
        senderId: userId,
        senderType: userRole,
        content,
        messageType,
        status: 'sent'
      });

      await message.save();

      // Mettre à jour le chat
      chat.lastMessageAt = new Date();
      
      // Incrémenter les messages non lus pour l'autre utilisateur
      if (userRole === 'client') {
        chat.unreadByDemenageur += 1;
      } else {
        chat.unreadByClient += 1;
      }

      await chat.save();

      // Récupérer le message avec les informations de l'expéditeur
      const messageWithSender = await ChatMessage.findById(message._id)
        .populate('senderId', 'first_name last_name');

      // Émettre le message à tous les participants du chat
      io.to(`chat_${chatId}`).emit('new_message', {
        chatId,
        message: {
          _id: message._id,
          content: message.content,
          senderType: message.senderType,
          senderName: `${messageWithSender.senderId.first_name} ${messageWithSender.senderId.last_name}`,
          messageType: message.messageType,
          createdAt: message.createdAt,
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

      const { Chat, ChatMessage } = require('./models');
      const chat = await Chat.findById(chatId);
      
      if (!chat) {
        console.log('❌ Chat non trouvé:', chatId);
        return;
      }

      if (chat.clientId.toString() !== userId && chat.demenageurId.toString() !== userId) {
        console.log('❌ Accès non autorisé au chat:', chatId);
        return;
      }

      // Marquer les messages comme lus
      if (userRole === 'client') {
        chat.unreadByClient = 0;
        await ChatMessage.updateMany(
          { chatId, senderType: 'demenageur', status: 'sent' },
          { status: 'read', readAt: new Date() }
        );
      } else if (userRole === 'demenageur') {
        chat.unreadByDemenageur = 0;
        await ChatMessage.updateMany(
          { chatId, senderType: 'client', status: 'sent' },
          { status: 'read', readAt: new Date() }
        );
      }

      await chat.save();

      // Notifier l'autre utilisateur que les messages ont été lus
      const targetUserId = userRole === 'client' ? chat.demenageurId : chat.clientId;
      io.to(`user_${targetUserId}`).emit('messages_read', {
        chatId,
        readBy: userId
      });

      console.log('✅ Messages marqués comme lus dans le chat:', chatId);

    } catch (error) {
      console.error('❌ Erreur lors du marquage des messages:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client déconnecté:', socket.id);
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

