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

    // Vérifier que la demande de service existe et est acceptée (utiliser quotes)
    const serviceRequest = await queryOne(
      `SELECT q.*, 
              c.id as client_id, c.first_name as client_first_name, c.last_name as client_last_name,
              d.id as mover_id, d.first_name as mover_first_name, d.last_name as mover_last_name
       FROM quotes q
       JOIN users c ON q.client_id = c.id
       LEFT JOIN users d ON q.mover_id = d.id
       WHERE q.id = $1`,
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

    // Vérifier qu'une conversation n'existe pas déjà
    const existingChat = await queryOne(
      'SELECT * FROM conversations WHERE client_id = $1 AND mover_id = $2',
      [serviceRequest.client_id, serviceRequest.mover_id]
    );
    if (existingChat) {
      return res.status(200).json({
        success: true,
        message: 'Conversation déjà existante',
        chat: existingChat
      });
    }

    // Créer la conversation
    const chatResult = await query(
      `INSERT INTO conversations (id, client_id, mover_id, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())
       RETURNING *`,
      [serviceRequest.client_id, serviceRequest.mover_id]
    );
    const chat = chatResult.rows[0];

    // Extraire serviceType depuis services
    let services = serviceRequest.services;
    if (typeof services === 'string') {
      try {
        services = JSON.parse(services);
      } catch (e) {
        services = {};
      }
    }
    const serviceType = services.serviceType || 'demenagement';

    // Créer un message système de bienvenue
    const welcomeMessageResult = await query(
      `INSERT INTO messages (id, sender_id, recipient_id, content, conversation_id, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
       RETURNING *`,
      [
        serviceRequest.mover_id,
        serviceRequest.client_id,
        `Bonjour ${serviceRequest.client_first_name} ! Votre demande de ${serviceType} a été acceptée. Nous pouvons maintenant discuter des détails.`,
        chat.id
      ]
    );

    // Émettre un événement WebSocket
    const io = req.app.get('io');
    if (io) {
      // Notifier le client qu'un chat a été créé
      io.to(`user_${serviceRequest.client_id}`).emit('chat_created', {
        chatId: chat.id,
        serviceRequestId,
        demenageurName: `${serviceRequest.mover_first_name} ${serviceRequest.mover_last_name}`,
        message: welcomeMessageResult.rows[0].content
      });

      // Notifier le déménageur
      io.to(`user_${serviceRequest.mover_id}`).emit('chat_created', {
        chatId: chat.id,
        serviceRequestId,
        clientName: `${serviceRequest.client_first_name} ${serviceRequest.client_last_name}`,
        message: welcomeMessageResult.rows[0].content
      });
    }

    // Mettre à jour last_message_id dans la conversation
    await query(
      'UPDATE conversations SET last_message_id = $1 WHERE id = $2',
      [welcomeMessageResult.rows[0].id, chat.id]
    );

    // Récupérer la conversation avec les informations des utilisateurs
    const chatWithUsers = await queryOne(
      `SELECT c.*, 
              cl.first_name as client_first_name, cl.last_name as client_last_name,
              d.first_name as mover_first_name, d.last_name as mover_last_name
       FROM conversations c
       JOIN users cl ON c.client_id = cl.id
       JOIN users d ON c.mover_id = d.id
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
                d.first_name as mover_first_name, d.last_name as mover_last_name,
                q.services as quote_services, q.from_address as quote_from_address
         FROM conversations c
         JOIN users cl ON c.client_id = cl.id
         JOIN users d ON c.mover_id = d.id
         LEFT JOIN quotes q ON q.client_id = c.client_id AND q.mover_id = c.mover_id
         WHERE c.client_id = $1
         ORDER BY c.updated_at DESC, c.created_at DESC`,
        [userId]
      );
    } else {
      chats = await queryMany(
        `SELECT c.*, 
                cl.first_name as client_first_name, cl.last_name as client_last_name,
                cl.email as client_email, cl.phone as client_phone,
                d.first_name as mover_first_name, d.last_name as mover_last_name,
                q.services as quote_services, q.from_address as quote_from_address
         FROM conversations c
         JOIN users cl ON c.client_id = cl.id
         JOIN users d ON c.mover_id = d.id
         LEFT JOIN quotes q ON q.client_id = c.client_id AND q.mover_id = c.mover_id
         WHERE c.mover_id = $1
         ORDER BY c.updated_at DESC, c.created_at DESC`,
        [userId]
      );
    }

    // Enrichir avec le dernier message et transformer en camelCase
    const chatsWithLastMessage = await Promise.all(
      chats.map(async (chat) => {
        const lastMessage = await queryOne(
          `SELECT m.*, u.first_name, u.last_name
           FROM messages m
           JOIN users u ON m.sender_id = u.id
           WHERE m.conversation_id = $1
           ORDER BY m.created_at DESC
           LIMIT 1`,
          [chat.id]
        );

        // Compter les messages non lus
        const unreadCount = await queryOne(
          `SELECT COUNT(*) as count
           FROM messages m
           WHERE m.conversation_id = $1 
             AND m.recipient_id = $2 
             AND m.read_at IS NULL`,
          [chat.id, userId]
        );

        // Extraire serviceType depuis quote_services (JSONB)
        let serviceType = null;
        if (chat.quote_services) {
          try {
            const services = typeof chat.quote_services === 'string' 
              ? JSON.parse(chat.quote_services) 
              : chat.quote_services;
            serviceType = services.serviceType || null;
          } catch (e) {
            console.error('Erreur parsing quote_services:', e);
          }
        }

        // Transformer en camelCase pour le frontend
        return {
          id: chat.id,
          _id: chat.id, // Pour compatibilité MongoDB
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
            id: chat.mover_id,
            firstName: chat.mover_first_name,
            lastName: chat.mover_last_name,
            first_name: chat.mover_first_name, // Pour compatibilité
            last_name: chat.mover_last_name // Pour compatibilité
          },
          serviceRequestId: {
            serviceType: serviceType,
            departureAddress: chat.quote_from_address || null
          },
          unreadCount: parseInt(unreadCount?.count || 0),
          createdAt: chat.created_at,
          updatedAt: chat.updated_at,
          lastMessage: lastMessage ? {
            id: lastMessage.id,
            _id: lastMessage.id, // Pour compatibilité
            content: lastMessage.content,
            senderName: `${lastMessage.first_name} ${lastMessage.last_name}`,
            senderId: lastMessage.sender_id,
            recipientId: lastMessage.recipient_id,
            createdAt: lastMessage.created_at,
            readAt: lastMessage.read_at
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

    // Vérifier que l'utilisateur a accès à cette conversation
    const chat = await queryOne(
      'SELECT * FROM conversations WHERE id = $1',
      [chatId]
    );
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Conversation non trouvée'
      });
    }

    if (chat.client_id !== userId && chat.mover_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à cette conversation'
      });
    }

    // Récupérer les messages avec le rôle de l'expéditeur
    const messages = await queryMany(
      `SELECT m.*, u.first_name, u.last_name, u.role as sender_role
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [chatId]
    );

    // Marquer les messages comme lus (où l'utilisateur actuel est le destinataire)
    await query(
      `UPDATE messages 
       SET read_at = NOW() 
       WHERE conversation_id = $1 AND recipient_id = $2 AND read_at IS NULL`,
      [chatId, userId]
    );

    res.status(200).json({
      success: true,
      messages: messages.map(msg => ({
        id: msg.id,
        _id: msg.id, // Pour compatibilité MongoDB
        content: msg.content,
        senderId: msg.sender_id,
        recipientId: msg.recipient_id,
        senderName: `${msg.first_name} ${msg.last_name}`,
        senderType: msg.sender_role || 'client', // Ajouter senderType basé sur le rôle
        createdAt: msg.created_at,
        readAt: msg.read_at
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
    const { content } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Vérifier que l'utilisateur a accès à cette conversation
    const chat = await queryOne(
      'SELECT * FROM conversations WHERE id = $1',
      [chatId]
    );
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Conversation non trouvée'
      });
    }

    if (chat.client_id !== userId && chat.mover_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à cette conversation'
      });
    }

    // Déterminer le destinataire
    const recipientId = userRole === 'client' ? chat.mover_id : chat.client_id;

    // Créer le message
    const messageResult = await query(
      `INSERT INTO messages (id, sender_id, recipient_id, content, conversation_id, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
       RETURNING *`,
      [userId, recipientId, content, chatId]
    );
    const message = messageResult.rows[0];

    // Mettre à jour la conversation
    await query(
      `UPDATE conversations 
       SET last_message_id = $1, updated_at = NOW()
       WHERE id = $2`,
      [message.id, chatId]
    );

    // Récupérer les informations de l'expéditeur avec son rôle
    const sender = await queryOne(
      'SELECT first_name, last_name, role FROM users WHERE id = $1',
      [userId]
    );

    // Émettre l'événement WebSocket
    const io = req.app.get('io');
    if (io) {
      const targetUserId = userRole === 'client' ? chat.mover_id : chat.client_id;
      
      io.to(`user_${targetUserId}`).emit('new_message', {
        chatId,
        message: {
          id: message.id,
          content: message.content,
          senderId: message.sender_id,
          recipientId: message.recipient_id,
          senderName: sender ? `${sender.first_name} ${sender.last_name}` : 'Unknown',
          senderType: sender ? sender.role : userRole, // Ajouter senderType
          createdAt: message.created_at,
          readAt: message.read_at
        }
      });

      // Émettre aussi à l'expéditeur pour confirmation
      io.to(`user_${userId}`).emit('message_sent', {
        chatId,
        message: {
          id: message.id,
          content: message.content,
          senderId: message.sender_id,
          recipientId: message.recipient_id,
          senderName: sender ? `${sender.first_name} ${sender.last_name}` : 'Unknown',
          senderType: sender ? sender.role : userRole, // Ajouter senderType
          createdAt: message.created_at,
          readAt: message.read_at
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Message envoyé avec succès',
      data: {
        id: message.id,
        content: message.content,
        senderId: message.sender_id,
        recipientId: message.recipient_id,
        senderName: sender ? `${sender.first_name} ${sender.last_name}` : 'Unknown',
        senderType: sender ? sender.role : userRole, // Ajouter senderType
        createdAt: message.created_at,
        readAt: message.read_at
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
      'SELECT * FROM conversations WHERE id = $1',
      [chatId]
    );
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Conversation non trouvée'
      });
    }

    if (chat.client_id !== userId && chat.mover_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé à cette conversation'
      });
    }

    // Marquer les messages comme lus
    await query(
      `UPDATE messages 
       SET read_at = NOW() 
       WHERE conversation_id = $1 AND recipient_id = $2 AND read_at IS NULL`,
      [chatId, userId]
    );

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
