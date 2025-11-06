const express = require('express');
const router = express.Router();
const { Chat, ChatMessage, ServiceRequest, User } = require('../models');
const jwt = require('jsonwebtoken');

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token d\'accès requis'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'liberty_mobile_secret_key', (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Token invalide'
      });
    }
    req.user = user;
    next();
  });
};

// Créer un chat automatiquement quand une demande est acceptée
router.post('/create-from-service-request', async (req, res) => {
  try {
    const { serviceRequestId } = req.body;

    // Vérifier que la demande de service existe et est acceptée
    const serviceRequest = await ServiceRequest.findById(serviceRequestId)
      .populate('clientId', 'first_name last_name')
      .populate('demenageurId', 'first_name last_name');

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demande de service non trouvée'
      });
    }

    if (serviceRequest.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'La demande doit être acceptée pour créer un chat'
      });
    }

    // Vérifier qu'un chat n'existe pas déjà
    const existingChat = await Chat.findOne({ serviceRequestId });
    if (existingChat) {
      return res.status(200).json({
        success: true,
        message: 'Chat déjà existant',
        chat: existingChat
      });
    }

    // Créer le chat
    const chat = new Chat({
      serviceRequestId,
      clientId: serviceRequest.clientId._id,
      demenageurId: serviceRequest.demenageurId._id,
      status: 'active'
    });

    await chat.save();

    // Créer un message système de bienvenue
    const welcomeMessage = new ChatMessage({
      chatId: chat._id,
      serviceRequestId,
      senderId: serviceRequest.demenageurId._id,
      senderType: 'demenageur',
      content: `Bonjour ${serviceRequest.clientId.first_name} ! Votre demande de ${serviceRequest.serviceType} a été acceptée. Nous pouvons maintenant discuter des détails.`,
      messageType: 'system'
    });

    await welcomeMessage.save();

    // Émettre un événement WebSocket
    const io = req.app.get('io');
    if (io) {
      // Notifier le client qu'un chat a été créé
      io.to(`user_${serviceRequest.clientId._id}`).emit('chat_created', {
        chatId: chat._id,
        serviceRequestId,
        demenageurName: `${serviceRequest.demenageurId.first_name} ${serviceRequest.demenageurId.last_name}`,
        message: welcomeMessage.content
      });

      // Notifier le déménageur
      io.to(`user_${serviceRequest.demenageurId._id}`).emit('chat_created', {
        chatId: chat._id,
        serviceRequestId,
        clientName: `${serviceRequest.clientId.first_name} ${serviceRequest.clientId.last_name}`,
        message: welcomeMessage.content
      });
    }

    res.status(201).json({
      success: true,
      message: 'Chat créé avec succès',
      chat: await Chat.findById(chat._id)
        .populate('clientId', 'first_name last_name')
        .populate('demenageurId', 'first_name last_name')
    });

  } catch (error) {
    console.error('Erreur lors de la création du chat:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

// Récupérer les chats d'un utilisateur
router.get('/my-chats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    let query = {};
    if (userRole === 'client') {
      query.clientId = userId;
    } else if (userRole === 'demenageur') {
      query.demenageurId = userId;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Rôle non autorisé'
      });
    }

    const chats = await Chat.find(query)
      .populate('clientId', 'first_name last_name')
      .populate('demenageurId', 'first_name last_name')
      .populate('serviceRequestId', 'serviceType departureAddress destinationAddress status')
      .sort({ lastMessageAt: -1 });

    // Enrichir avec le dernier message
    const chatsWithLastMessage = await Promise.all(
      chats.map(async (chat) => {
        const lastMessage = await ChatMessage.findOne({ chatId: chat._id })
          .sort({ createdAt: -1 })
          .populate('senderId', 'first_name last_name');

        return {
          ...chat.toObject(),
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            senderName: `${lastMessage.senderId.first_name} ${lastMessage.senderId.last_name}`,
            senderType: lastMessage.senderType,
            createdAt: lastMessage.createdAt
          } : null
        };
      })
    );

    res.status(200).json({
      success: true,
      chats: chatsWithLastMessage
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des chats:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

// Récupérer les messages d'un chat
router.get('/:chatId/messages', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.userId;

    // Vérifier que l'utilisateur a accès à ce chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat non trouvé'
      });
    }

    if (chat.clientId.toString() !== userId && chat.demenageurId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce chat'
      });
    }

    // Récupérer les messages
    const messages = await ChatMessage.find({ chatId })
      .populate('senderId', 'first_name last_name')
      .sort({ createdAt: 1 });

    // Marquer les messages comme lus
    const userRole = req.user.role;
    if (userRole === 'client') {
      chat.unreadByClient = 0;
    } else if (userRole === 'demenageur') {
      chat.unreadByDemenageur = 0;
    }
    await chat.save();

    res.status(200).json({
      success: true,
      messages: messages.map(msg => ({
        _id: msg._id,
        content: msg.content,
        senderType: msg.senderType,
        senderName: `${msg.senderId.first_name} ${msg.senderId.last_name}`,
        messageType: msg.messageType,
        createdAt: msg.createdAt,
        status: msg.status
      }))
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

// Envoyer un message
router.post('/:chatId/messages', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, messageType = 'text' } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Vérifier que l'utilisateur a accès à ce chat
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat non trouvé'
      });
    }

    if (chat.clientId.toString() !== userId && chat.demenageurId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce chat'
      });
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

    // Émettre l'événement WebSocket
    const io = req.app.get('io');
    if (io) {
      const targetUserId = userRole === 'client' ? chat.demenageurId : chat.clientId;
      
      io.to(`user_${targetUserId}`).emit('new_message', {
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

      // Émettre aussi à l'expéditeur pour confirmation
      io.to(`user_${userId}`).emit('message_sent', {
        chatId,
        message: {
          _id: message._id,
          content: message.content,
          senderType: message.senderType,
          senderName: `${messageWithSender.senderId.first_name} ${messageWithSender.senderId.last_name}`,
          messageType: message.messageType,
          createdAt: message.createdAt,
          status: 'delivered'
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Message envoyé avec succès',
      data: {
        _id: message._id,
        content: message.content,
        senderType: message.senderType,
        senderName: `${messageWithSender.senderId.first_name} ${messageWithSender.senderId.last_name}`,
        messageType: message.messageType,
        createdAt: message.createdAt,
        status: message.status
      }
    });

  } catch (error) {
    console.error('Erreur lors de l\'envoi du message:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

// Marquer les messages comme lus
router.put('/:chatId/mark-read', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat non trouvé'
      });
    }

    if (chat.clientId.toString() !== userId && chat.demenageurId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce chat'
      });
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

    res.status(200).json({
      success: true,
      message: 'Messages marqués comme lus'
    });

  } catch (error) {
    console.error('Erreur lors du marquage des messages:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

module.exports = router;
