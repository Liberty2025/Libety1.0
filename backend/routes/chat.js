const express = require('express');
const router = express.Router();
const { queryOne, queryMany, query } = require('../utils/dbHelpers');
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
    const serviceRequest = await queryOne(
      `SELECT sr.*, 
              c.id as client_id, c.first_name as client_first_name, c.last_name as client_last_name,
              d.id as demenageur_id, d.first_name as demenageur_first_name, d.last_name as demenageur_last_name
       FROM service_requests sr
       JOIN users c ON sr.client_id = c.id
       JOIN users d ON sr.demenageur_id = d.id
       WHERE sr.id = $1`,
      [serviceRequestId]
    );

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
    const existingChat = await queryOne(
      'SELECT * FROM chats WHERE service_request_id = $1',
      [serviceRequestId]
    );
    if (existingChat) {
      return res.status(200).json({
        success: true,
        message: 'Chat déjà existant',
        chat: existingChat
      });
    }

    // Créer le chat
    const chatResult = await query(
      `INSERT INTO chats (id, service_request_id, client_id, demenageur_id, status, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [serviceRequestId, serviceRequest.client_id, serviceRequest.demenageur_id, 'active']
    );
    const chat = chatResult.rows[0];

    // Créer un message système de bienvenue
    const welcomeMessageResult = await query(
      `INSERT INTO chat_messages (id, chat_id, service_request_id, sender_id, sender_type, content, message_type, status, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [
        chat.id,
        serviceRequestId,
        serviceRequest.demenageur_id,
        'demenageur',
        `Bonjour ${serviceRequest.client_first_name} ! Votre demande de ${serviceRequest.service_type} a été acceptée. Nous pouvons maintenant discuter des détails.`,
        'system',
        'sent'
      ]
    );

    // Émettre un événement WebSocket
    const io = req.app.get('io');
    if (io) {
      // Notifier le client qu'un chat a été créé
      io.to(`user_${serviceRequest.client_id}`).emit('chat_created', {
        chatId: chat.id,
        serviceRequestId,
        demenageurName: `${serviceRequest.demenageur_first_name} ${serviceRequest.demenageur_last_name}`,
        message: welcomeMessageResult.rows[0].content
      });

      // Notifier le déménageur
      io.to(`user_${serviceRequest.demenageur_id}`).emit('chat_created', {
        chatId: chat.id,
        serviceRequestId,
        clientName: `${serviceRequest.client_first_name} ${serviceRequest.client_last_name}`,
        message: welcomeMessageResult.rows[0].content
      });
    }

    // Récupérer le chat avec les informations des utilisateurs
    const chatWithUsers = await queryOne(
      `SELECT c.*, 
              cl.first_name as client_first_name, cl.last_name as client_last_name,
              d.first_name as demenageur_first_name, d.last_name as demenageur_last_name
       FROM chats c
       JOIN users cl ON c.client_id = cl.id
       JOIN users d ON c.demenageur_id = d.id
       WHERE c.id = $1`,
      [chat.id]
    );

    res.status(201).json({
      success: true,
      message: 'Chat créé avec succès',
      chat: chatWithUsers
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

    if (userRole !== 'client' && userRole !== 'demenageur') {
      return res.status(403).json({
        success: false,
        message: 'Rôle non autorisé'
      });
    }

    let chats;
    if (userRole === 'client') {
      chats = await queryMany(
        `SELECT c.*, 
                cl.first_name as client_first_name, cl.last_name as client_last_name,
                cl.email as client_email, cl.phone as client_phone,
                d.first_name as demenageur_first_name, d.last_name as demenageur_last_name,
                sr.service_type, sr.departure_address, sr.destination_address, sr.status as service_status
         FROM chats c
         JOIN users cl ON c.client_id = cl.id
         JOIN users d ON c.demenageur_id = d.id
         JOIN service_requests sr ON c.service_request_id = sr.id
         WHERE c.client_id = $1
         ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC`,
        [userId]
      );
    } else {
      chats = await queryMany(
        `SELECT c.*, 
                cl.first_name as client_first_name, cl.last_name as client_last_name,
                cl.email as client_email, cl.phone as client_phone,
                d.first_name as demenageur_first_name, d.last_name as demenageur_last_name,
                sr.service_type, sr.departure_address, sr.destination_address, sr.status as service_status
         FROM chats c
         JOIN users cl ON c.client_id = cl.id
         JOIN users d ON c.demenageur_id = d.id
         JOIN service_requests sr ON c.service_request_id = sr.id
         WHERE c.demenageur_id = $1
         ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC`,
        [userId]
      );
    }

    // Enrichir avec le dernier message et transformer en camelCase
    const chatsWithLastMessage = await Promise.all(
      chats.map(async (chat) => {
        const lastMessage = await queryOne(
          `SELECT cm.*, u.first_name, u.last_name
           FROM chat_messages cm
           JOIN users u ON cm.sender_id = u.id
           WHERE cm.chat_id = $1
           ORDER BY cm.created_at DESC
           LIMIT 1`,
          [chat.id]
        );

        // Transformer en camelCase pour le frontend
        return {
          id: chat.id,
          _id: chat.id, // Pour compatibilité MongoDB
          serviceRequestId: {
            id: chat.service_request_id,
            serviceType: chat.service_type,
            departureAddress: chat.departure_address,
            destinationAddress: chat.destination_address,
            status: chat.service_status
          },
          clientId: {
            id: chat.client_id,
            firstName: chat.client_first_name,
            lastName: chat.client_last_name,
            first_name: chat.client_first_name, // Pour compatibilité
            last_name: chat.client_last_name, // Pour compatibilité
            email: chat.client_email || null,
            phone: chat.client_phone || null
          },
          demenageurId: {
            id: chat.demenageur_id,
            firstName: chat.demenageur_first_name,
            lastName: chat.demenageur_last_name,
            first_name: chat.demenageur_first_name, // Pour compatibilité
            last_name: chat.demenageur_last_name // Pour compatibilité
          },
          status: chat.status,
          unreadByDemenageur: chat.unread_by_demenageur || 0,
          unreadByClient: chat.unread_by_client || 0,
          createdAt: chat.created_at,
          updatedAt: chat.updated_at,
          lastMessageAt: chat.last_message_at,
          lastMessage: lastMessage ? {
            id: lastMessage.id,
            _id: lastMessage.id, // Pour compatibilité
            content: lastMessage.content,
            senderName: `${lastMessage.first_name} ${lastMessage.last_name}`,
            senderType: lastMessage.sender_type,
            messageType: lastMessage.message_type,
            createdAt: lastMessage.created_at,
            updatedAt: lastMessage.updated_at
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
    const chat = await queryOne(
      'SELECT * FROM chats WHERE id = $1',
      [chatId]
    );
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat non trouvé'
      });
    }

    if (chat.client_id !== userId && chat.demenageur_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce chat'
      });
    }

    // Récupérer les messages
    const messages = await queryMany(
      `SELECT cm.*, u.first_name, u.last_name
       FROM chat_messages cm
       JOIN users u ON cm.sender_id = u.id
       WHERE cm.chat_id = $1
       ORDER BY cm.created_at ASC`,
      [chatId]
    );

    // Marquer les messages comme lus
    const userRole = req.user.role;
    if (userRole === 'client') {
      await query('UPDATE chats SET unread_by_client = 0 WHERE id = $1', [chatId]);
    } else if (userRole === 'demenageur') {
      await query('UPDATE chats SET unread_by_demenageur = 0 WHERE id = $1', [chatId]);
    }

    res.status(200).json({
      success: true,
      messages: messages.map(msg => ({
        id: msg.id,
        _id: msg.id, // Pour compatibilité MongoDB
        content: msg.content,
        senderType: msg.sender_type,
        senderName: `${msg.first_name} ${msg.last_name}`,
        messageType: msg.message_type,
        createdAt: msg.created_at,
        updatedAt: msg.updated_at,
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
    const chat = await queryOne(
      'SELECT * FROM chats WHERE id = $1',
      [chatId]
    );
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat non trouvé'
      });
    }

    if (chat.client_id !== userId && chat.demenageur_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce chat'
      });
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

    // Émettre l'événement WebSocket
    const io = req.app.get('io');
    if (io) {
      const targetUserId = userRole === 'client' ? chat.demenageur_id : chat.client_id;
      
      io.to(`user_${targetUserId}`).emit('new_message', {
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

      // Émettre aussi à l'expéditeur pour confirmation
      io.to(`user_${userId}`).emit('message_sent', {
        chatId,
        message: {
          id: message.id,
          content: message.content,
          senderType: message.sender_type,
          senderName: sender ? `${sender.first_name} ${sender.last_name}` : 'Unknown',
          messageType: message.message_type,
          createdAt: message.created_at,
          status: 'delivered'
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Message envoyé avec succès',
      data: {
        id: message.id,
        content: message.content,
        senderType: message.sender_type,
        senderName: sender ? `${sender.first_name} ${sender.last_name}` : 'Unknown',
        messageType: message.message_type,
        createdAt: message.created_at,
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

    const chat = await queryOne(
      'SELECT * FROM chats WHERE id = $1',
      [chatId]
    );
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat non trouvé'
      });
    }

    if (chat.client_id !== userId && chat.demenageur_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à ce chat'
      });
    }

    // Marquer les messages comme lus
    if (userRole === 'client') {
      await query('UPDATE chats SET unread_by_client = 0 WHERE id = $1', [chatId]);
      await query(
        `UPDATE chat_messages 
         SET status = 'read', read_at = NOW() 
         WHERE chat_id = $1 AND sender_type = 'demenageur' AND status = 'sent'`,
        [chatId]
      );
    } else if (userRole === 'demenageur') {
      await query('UPDATE chats SET unread_by_demenageur = 0 WHERE id = $1', [chatId]);
      await query(
        `UPDATE chat_messages 
         SET status = 'read', read_at = NOW() 
         WHERE chat_id = $1 AND sender_type = 'client' AND status = 'sent'`,
        [chatId]
      );
    }

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
