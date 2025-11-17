const express = require('express');
const router = express.Router();
const { queryOne, queryMany, query } = require('../utils/dbHelpers');
const { createNotification } = require('../utils/notificationService');
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

// Créer une nouvelle demande de service
router.post('/create', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Données reçues du frontend:', req.body);
    
    const {
      demenageurId,
      serviceType, // 'demenagement' ou 'transport'
      departureAddress,
      destinationAddress,
      serviceDetails,
      estimatedPrice,
      scheduledDate
    } = req.body;

    console.log('🔍 ServiceType reçu:', serviceType);
    console.log('🔍 ServiceDetails reçus:', serviceDetails);

    const clientId = req.user.userId;

    // Vérifier que le client existe
    const client = await queryOne(
      'SELECT * FROM users WHERE id = $1',
      [clientId]
    );
    if (!client || client.role !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Vérifier que le déménageur existe
    const demenageur = await queryOne(
      'SELECT * FROM users WHERE id = $1',
      [demenageurId]
    );
    if (!demenageur || demenageur.role !== 'demenageur') {
      return res.status(404).json({
        success: false,
        message: 'Déménageur non trouvé'
      });
    }

    // Créer la demande de service dans quotes
    const servicesData = {
      ...serviceDetails,
      serviceType: serviceType
    };
    const priceCents = estimatedPrice ? Math.round(estimatedPrice * 100) : null;
    
    const serviceRequestResult = await query(
      `INSERT INTO quotes (id, client_id, mover_id, from_address, to_address, services, price_cents, move_date, status, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      [clientId, demenageurId, departureAddress, destinationAddress, JSON.stringify(servicesData), priceCents, scheduledDate, 'pending']
    );
    const serviceRequest = serviceRequestResult.rows[0];

    let demenageurNotification = null;
    const io = req.app.get('io'); // Obtenir l'instance Socket.IO
    
    // Vérifier si c'est un service rapide
    const isQuickService = serviceDetails && serviceDetails.isQuickService === true;
    const serviceTypeLabel = serviceType === 'demenagement' ? 'déménagement' : 'transport';
    const quickServiceLabel = isQuickService ? ' (Service Rapide)' : '';
    
    try {
      demenageurNotification = await createNotification({
        userId: demenageurId,
        title: isQuickService ? '⚡ Service Rapide' : 'Nouvelle demande de service',
        message: `${client.first_name} ${client.last_name || ''} a créé une demande de ${serviceTypeLabel}${quickServiceLabel}.`,
        type: 'new_service_request',
        data: {
          missionId: serviceRequest.id,
          serviceType,
          departureAddress,
          destinationAddress,
          estimatedPrice,
          scheduledDate,
          clientId,
          demenageurId,
          isQuickService: isQuickService,
        },
        io: io, // Passer l'instance Socket.IO pour l'envoi en temps réel
      });
    } catch (notificationError) {
      console.error('❌ Erreur création notification new_service_request:', notificationError);
    }

    // Émettre un événement WebSocket au déménageur
    if (io) {
      const roomName = `user_${demenageurId}`;
      console.log('🔔 Émission notification WebSocket pour déménageur:', demenageurId);
      console.log('🔔 Room WebSocket:', roomName);
      
      // Vérifier les sockets dans la room (pour debug)
      const room = io.sockets.adapter.rooms.get(roomName);
      if (room) {
        console.log(`✅ Room "${roomName}" existe avec ${room.size} socket(s) connecté(s)`);
      } else {
        console.log(`⚠️ Room "${roomName}" n'existe pas - le déménageur n'est peut-être pas connecté`);
      }
      
      const notificationData = {
        _id: serviceRequest.id, // Ajouter _id pour compatibilité
        id: serviceRequest.id,
        clientId: {
          id: client.id,
          first_name: client.first_name,
          last_name: client.last_name,
          email: client.email,
          phone: client.phone
        },
        serviceType: serviceType,
        departureAddress: departureAddress,
        destinationAddress: destinationAddress,
        serviceDetails: serviceDetails,
        estimatedPrice: estimatedPrice,
        scheduledDate: scheduledDate,
        status: 'pending',
        createdAt: serviceRequest.created_at,
        demenageurId: demenageurId,
        notificationId: demenageurNotification ? demenageurNotification.id : null,
      };
      
      console.log('📤 Données WebSocket à émettre:', JSON.stringify(notificationData, null, 2));
      io.to(roomName).emit('new_service_request', notificationData);
      console.log('✅ Notification WebSocket émise vers room:', roomName);
    } else {
      console.log('❌ io n\'est pas disponible dans req.app');
    }

    res.status(201).json({
      success: true,
      message: 'Demande de service créée avec succès',
      serviceRequest
    });

  } catch (error) {
    console.error('Erreur lors de la création de la demande:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Récupérer les demandes d'un client
router.get('/client', authenticateToken, async (req, res) => {
  try {
    const clientId = req.user.userId;

    // Vérifier que l'utilisateur est un client
    const client = await queryOne(
      'SELECT * FROM users WHERE id = $1',
      [clientId]
    );
    if (!client || client.role !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    const serviceRequestsRaw = await queryMany(
      `SELECT q.*, 
              d.id as demenageur_id, d.first_name as demenageur_first_name, d.last_name as demenageur_last_name, 
              d.email as demenageur_email, d.phone as demenageur_phone
       FROM quotes q
       LEFT JOIN users d ON q.mover_id = d.id
       WHERE q.client_id = $1
       ORDER BY q.created_at DESC`,
      [clientId]
    );

    // Transformer les données en camelCase pour le frontend
    const serviceRequests = serviceRequestsRaw.map(req => {
      // Parser services si c'est une chaîne JSON
      let serviceDetails = req.services;
      if (typeof serviceDetails === 'string') {
        try {
          serviceDetails = JSON.parse(serviceDetails);
        } catch (e) {
          serviceDetails = {};
        }
      } else if (!serviceDetails) {
        serviceDetails = {};
      }

      // Extraire serviceType depuis services si disponible
      const serviceType = serviceDetails.serviceType || 'demenagement';

      // Calculer le prix proposé
      const proposedPrice = req.price_cents != null ? req.price_cents / 100 : null;
      
      // Debug log pour vérifier les prix
      if (req.price_cents != null) {
        console.log(`💰 Quote ${req.id}: price_cents=${req.price_cents}, proposedPrice=${proposedPrice}`);
      }

      return {
        id: req.id,
        _id: req.id, // Pour compatibilité avec MongoDB
        serviceType: serviceType,
        service_type: serviceType, // Pour compatibilité
        departureAddress: req.from_address,
        departure_address: req.from_address, // Pour compatibilité
        from_address: req.from_address, // Pour compatibilité
        destinationAddress: req.to_address,
        destination_address: req.to_address, // Pour compatibilité
        to_address: req.to_address, // Pour compatibilité
        serviceDetails: serviceDetails,
        service_details: serviceDetails, // Pour compatibilité
        proposedPrice: proposedPrice,
        proposed_price: proposedPrice, // Pour compatibilité avec l'ancien format
        actualPrice: req.price_cents ? req.price_cents / 100 : null,
        scheduledDate: req.move_date,
        scheduled_date: req.move_date, // Pour compatibilité
        move_date: req.move_date, // Pour compatibilité
        status: req.status,
        createdAt: req.created_at,
        created_at: req.created_at, // Pour compatibilité
        updatedAt: req.updated_at,
        updated_at: req.updated_at, // Pour compatibilité
        clientId: req.client_id,
        client_id: req.client_id, // Pour compatibilité
        demenageurId: req.mover_id ? {
          id: req.mover_id,
          _id: req.mover_id, // Pour compatibilité avec MongoDB
          firstName: req.demenageur_first_name,
          lastName: req.demenageur_last_name,
          first_name: req.demenageur_first_name, // Pour compatibilité
          last_name: req.demenageur_last_name, // Pour compatibilité
          email: req.demenageur_email,
          phone: req.demenageur_phone
        } : null,
        mover_id: req.mover_id, // Pour compatibilité
        demenageur_id: req.mover_id // Pour compatibilité
      };
    });

    res.status(200).json({
      success: true,
      serviceRequests
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des demandes client:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

// Déclencher une notification de test
router.post('/test-notification', authenticateToken, async (req, res) => {
  try {
    const demenageurId = req.user.userId;
    console.log('🔔 Test de notification pour déménageur:', demenageurId);

    // Vérifier que l'utilisateur est un déménageur
    const demenageur = await queryOne(
      'SELECT * FROM users WHERE id = $1',
      [demenageurId]
    );
    if (!demenageur || demenageur.role !== 'demenageur') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Trouver une demande en attente
    const pendingRequest = await queryOne(
      `SELECT q.*, 
              c.id as client_id, c.first_name as client_first_name, c.last_name as client_last_name, 
              c.email as client_email, c.phone as client_phone
       FROM quotes q
       JOIN users c ON q.client_id = c.id
       WHERE q.mover_id = $1 AND q.status = 'pending'
       ORDER BY q.created_at DESC
       LIMIT 1`,
      [demenageurId]
    );

    if (!pendingRequest) {
      return res.status(404).json({
        success: false,
        message: 'Aucune demande en attente trouvée'
      });
    }

    let testNotificationRecord = null;
    const io = req.app.get('io'); // Obtenir l'instance Socket.IO
    try {
      testNotificationRecord = await createNotification({
        userId: demenageurId,
        title: 'Nouvelle demande de service',
        message: `${pendingRequest.client_first_name} ${pendingRequest.client_last_name || ''} a une demande en attente.`,
        type: 'new_service_request',
        data: {
          missionId: pendingRequest.id,
          serviceType: (typeof pendingRequest.services === 'string' ? JSON.parse(pendingRequest.services) : pendingRequest.services || {}).serviceType || 'demenagement',
          departureAddress: pendingRequest.from_address,
          destinationAddress: pendingRequest.to_address,
          estimatedPrice: pendingRequest.price_cents ? pendingRequest.price_cents / 100 : null,
          scheduledDate: pendingRequest.move_date,
          clientId: pendingRequest.client_id,
          demenageurId,
        },
        io: io, // Passer l'instance Socket.IO pour l'envoi en temps réel
      });
    } catch (notificationError) {
      console.error('❌ Erreur création notification test new_service_request:', notificationError);
    }

    // Émettre l'événement WebSocket
    if (io) {
      console.log('🔔 Émission notification de test WebSocket');
      io.to(`user_${demenageurId}`).emit('new_service_request', {
        id: pendingRequest.id,
        clientId: {
          id: pendingRequest.client_id,
          first_name: pendingRequest.client_first_name,
          last_name: pendingRequest.client_last_name,
          email: pendingRequest.client_email,
          phone: pendingRequest.client_phone
        },
        serviceType: (typeof pendingRequest.services === 'string' ? JSON.parse(pendingRequest.services) : pendingRequest.services || {}).serviceType || 'demenagement',
        departureAddress: pendingRequest.from_address,
        destinationAddress: pendingRequest.to_address,
        serviceDetails: typeof pendingRequest.services === 'string' ? JSON.parse(pendingRequest.services) : pendingRequest.services || {},
        estimatedPrice: pendingRequest.price_cents ? pendingRequest.price_cents / 100 : null,
        scheduledDate: pendingRequest.move_date,
        status: pendingRequest.status,
        createdAt: pendingRequest.created_at,
        demenageurId: demenageurId,
        notificationId: testNotificationRecord ? testNotificationRecord.id : null,
      });
      console.log('✅ Notification de test émise');
    }

    res.status(200).json({
      success: true,
      message: 'Notification de test envoyée',
      serviceRequest: pendingRequest
    });

  } catch (error) {
    console.error('❌ Erreur lors du test de notification:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

// Récupérer les demandes d'un déménageur
router.get('/demenageur', authenticateToken, async (req, res) => {
  try {
    const demenageurId = req.user.userId;
    console.log('🔍 Récupération des missions pour déménageur:', demenageurId);

    // Vérifier que l'utilisateur est un déménageur
    const demenageur = await queryOne(
      'SELECT * FROM users WHERE id = $1',
      [demenageurId]
    );
    if (!demenageur || demenageur.role !== 'demenageur') {
      console.log('❌ Utilisateur non autorisé:', demenageur?.role);
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    const serviceRequestsRaw = await queryMany(
      `SELECT q.*, 
              c.id as client_id, c.first_name as client_first_name, c.last_name as client_last_name, 
              c.email as client_email, c.phone as client_phone
       FROM quotes q
       JOIN users c ON q.client_id = c.id
       WHERE q.mover_id = $1
       ORDER BY q.created_at DESC`,
      [demenageurId]
    );

    console.log('📊 Toutes les missions trouvées:', serviceRequestsRaw.length);

    // Transformer les données en camelCase pour le frontend
    const serviceRequests = serviceRequestsRaw.map(req => {
      // Parser services si c'est une chaîne JSON
      let serviceDetails = req.services;
      if (typeof serviceDetails === 'string') {
        try {
          serviceDetails = JSON.parse(serviceDetails);
        } catch (e) {
          serviceDetails = {};
        }
      } else if (!serviceDetails) {
        serviceDetails = {};
      }

      // Extraire serviceType depuis services si disponible
      const serviceType = serviceDetails.serviceType || 'demenagement';

      return {
        id: req.id,
        _id: req.id, // Pour compatibilité avec MongoDB
        serviceType: serviceType,
        departureAddress: req.from_address,
        destinationAddress: req.to_address,
        serviceDetails: serviceDetails,
        proposedPrice: req.price_cents ? req.price_cents / 100 : null,
        actualPrice: req.price_cents ? req.price_cents / 100 : null,
        scheduledDate: req.move_date,
        status: req.status,
        viewedByDemenageur: false, // Pas de champ dans quotes
        priceNegotiation: null, // Pas de champ dans quotes
        createdAt: req.created_at,
        updatedAt: req.updated_at,
        clientId: {
          id: req.client_id,
          firstName: req.client_first_name,
          lastName: req.client_last_name,
          first_name: req.client_first_name, // Pour compatibilité
          last_name: req.client_last_name, // Pour compatibilité
          email: req.client_email,
          phone: req.client_phone
        },
        demenageurId: req.mover_id
      };
    });

    res.status(200).json({
      success: true,
      serviceRequests
    });

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des demandes déménageur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

// Mettre à jour le statut d'une demande
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const requestId = req.params.id;
    const userId = req.user.userId;

    const serviceRequest = await queryOne(
      'SELECT * FROM quotes WHERE id = $1',
      [requestId]
    );
    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée'
      });
    }

    // Vérifier que l'utilisateur peut modifier cette demande
    if (serviceRequest.mover_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    await query(
      'UPDATE quotes SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, requestId]
    );

    // Récupérer la demande mise à jour
    const updatedRequest = await queryOne(
      'SELECT * FROM quotes WHERE id = $1',
      [requestId]
    );

    const demenageurFullName = `${req.user.firstName} ${req.user.lastName}`;

    let statusMessage;
    switch (status) {
      case 'in_progress':
        statusMessage = 'Camion en route vers vous. La mission est en cours.';
        break;
      case 'completed':
        statusMessage = 'La mission est terminée. Merci pour votre confiance.';
        break;
      case 'accepted':
        statusMessage = 'La mission a été acceptée et va démarrer prochainement.';
        break;
      case 'cancelled':
        statusMessage = 'La mission a été annulée.';
        break;
      default:
        statusMessage = `Le statut de la mission est maintenant ${status}.`;
        break;
    }

    let statusNotification = null;
    const io = req.app.get('io'); // Obtenir l'instance Socket.IO
    try {
      statusNotification = await createNotification({
        userId: serviceRequest.client_id,
        title: 'Statut de mission',
        message: statusMessage,
        type: 'status_updated',
        data: {
          missionId: serviceRequest.id,
          newStatus: status,
          demenageurName: demenageurFullName,
        },
        io: io, // Passer l'instance Socket.IO pour l'envoi en temps réel
      });
    } catch (notificationError) {
      console.error('❌ Erreur lors de la création de la notification status_updated:', notificationError);
    }

    // Émettre un événement WebSocket au client ET au déménageur
    if (io) {
      // Émettre vers le client
      io.to(`user_${serviceRequest.client_id}`).emit('status_updated', {
        missionId: serviceRequest.id,
        newStatus: status,
        demenageurName: demenageurFullName,
        notificationId: statusNotification ? statusNotification.id : null,
      });
      
      // Émettre vers le déménageur pour mettre à jour sa liste
      io.to(`user_${serviceRequest.mover_id}`).emit('status_updated', {
        missionId: serviceRequest.id,
        newStatus: status,
        demenageurName: demenageurFullName,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Statut mis à jour avec succès',
      serviceRequest: updatedRequest
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

// Proposer un prix (déménageur)
router.post('/:id/propose-price', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { proposedPrice } = req.body;
    const demenageurId = req.user.userId;

    // Vérifier que la demande existe et appartient au déménageur
    const serviceRequest = await queryOne(
      'SELECT * FROM quotes WHERE id = $1 AND mover_id = $2 AND status = $3',
      [id, demenageurId, 'pending']
    );

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée ou non autorisée'
      });
    }

    // Mettre à jour avec le prix proposé (convertir en cents)
    const priceCents = Math.round(proposedPrice * 100);

    await query(
      `UPDATE quotes 
       SET price_cents = $1, updated_at = NOW() 
       WHERE id = $2`,
      [priceCents, id]
    );

    // Récupérer les informations du déménageur pour l'événement
    const demenageur = await queryOne(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [demenageurId]
    );
    const demenageurName = demenageur 
      ? `${demenageur.first_name || ''} ${demenageur.last_name || ''}`.trim() 
      : 'Déménageur';

    // Récupérer la demande mise à jour
    const updatedRequest = await queryOne(
      'SELECT * FROM quotes WHERE id = $1',
      [id]
    );

    // Créer une notification persistante pour le client
    let clientNotification = null;
    const io = req.app.get('io'); // Obtenir l'instance Socket.IO
    try {
      clientNotification = await createNotification({
        userId: serviceRequest.client_id,
        title: 'Nouvelle proposition de prix',
        message: `${demenageurName} propose ${proposedPrice} TND pour votre mission.`,
        type: 'price_proposed',
        data: {
          missionId: serviceRequest.id,
          proposedPrice: proposedPrice,
          demenageurName,
          demenageurId,
        },
        io: io, // Passer l'instance Socket.IO pour l'envoi en temps réel
      });
    } catch (notificationError) {
      console.error('❌ Erreur lors de la création de la notification price_proposed:', notificationError);
    }

    // Émettre un événement WebSocket au client ET au déménageur
    if (io) {
      const clientIdString = serviceRequest.client_id;
      const clientRoom = `user_${clientIdString}`;
      
      console.log('🔔 Émission price_proposed vers le client:', clientRoom);
      
      // Émettre vers le client
      io.to(clientRoom).emit('price_proposed', {
        missionId: serviceRequest.id,
        proposedPrice: proposedPrice,
        demenageurName: demenageurName,
        notificationId: clientNotification ? clientNotification.id : null,
      });
      
      console.log('✅ Événement price_proposed émis vers:', clientRoom);
      
      // Émettre vers le déménageur pour mettre à jour sa liste
      io.to(`user_${serviceRequest.mover_id}`).emit('price_proposed', {
        missionId: serviceRequest.id,
        proposedPrice: proposedPrice,
        demenageurName: `${req.user.firstName} ${req.user.lastName}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Prix proposé avec succès',
      serviceRequest: updatedRequest
    });

  } catch (error) {
    console.error('Erreur lors de la proposition de prix:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

// Accepter le prix proposé (client)
router.post('/:id/accept-price', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const clientId = req.user.userId;

    // Vérifier que la demande existe et appartient au client
    const serviceRequest = await queryOne(
      'SELECT * FROM quotes WHERE id = $1 AND client_id = $2 AND status = $3',
      [id, clientId, 'pending']
    );

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée ou non autorisée'
      });
    }

    if (!serviceRequest.price_cents) {
      return res.status(400).json({
        success: false,
        message: 'Aucun prix proposé'
      });
    }

    // Accepter le prix et changer le statut
    await query(
      `UPDATE quotes 
       SET status = $1, updated_at = NOW() 
       WHERE id = $2`,
      ['accepted', id]
    );

    // Récupérer la demande mise à jour
    const updatedRequest = await queryOne(
      'SELECT * FROM quotes WHERE id = $1',
      [id]
    );

    // Émettre un événement WebSocket au déménageur
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${serviceRequest.mover_id}`).emit('price_accepted', {
        missionId: serviceRequest.id,
        acceptedPrice: serviceRequest.price_cents ? serviceRequest.price_cents / 100 : null,
        clientName: `${req.user.firstName} ${req.user.lastName}`
      });
    }

    // Créer automatiquement un chat pour cette demande acceptée
    try {
      // Vérifier qu'un chat n'existe pas déjà (utiliser conversations au lieu de chats)
      const existingChat = await queryOne(
        'SELECT * FROM conversations WHERE id = $1',
        [serviceRequest.id]
      );
      if (!existingChat) {
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
        
        const chatResult = await query(
          `INSERT INTO conversations (id, client_id, mover_id, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())
           RETURNING *`,
          [serviceRequest.client_id, serviceRequest.mover_id]
        );
        const chat = chatResult.rows[0];

        // Créer un message système de bienvenue (utiliser messages au lieu de chat_messages)
        const welcomeMessageResult = await query(
          `INSERT INTO messages (id, sender_id, recipient_id, content, conversation_id, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())
           RETURNING *`,
          [
            serviceRequest.mover_id,
            serviceRequest.client_id,
            `Bonjour ! Votre demande a été acceptée. Nous pouvons maintenant discuter des détails de votre ${serviceType}.`,
            chat.id
          ]
        );

        // Notifier les utilisateurs qu'un chat a été créé
        if (io) {
          io.to(`user_${serviceRequest.client_id}`).emit('chat_created', {
            chatId: chat.id,
            serviceRequestId: serviceRequest.id,
            demenageurName: `${req.user.firstName} ${req.user.lastName}`,
            message: welcomeMessageResult.rows[0].content
          });

          io.to(`user_${serviceRequest.mover_id}`).emit('chat_created', {
            chatId: chat.id,
            serviceRequestId: serviceRequest.id,
            clientName: `${req.user.firstName} ${req.user.lastName}`,
            message: welcomeMessageResult.rows[0].content
          });
        }

        console.log('✅ Chat créé automatiquement pour la demande acceptée');
      }
    } catch (chatError) {
      console.error('❌ Erreur lors de la création du chat:', chatError);
      // Ne pas faire échouer la requête si le chat ne peut pas être créé
    }

    res.status(200).json({
      success: true,
      message: 'Prix accepté, mission démarrée',
      serviceRequest: updatedRequest
    });

  } catch (error) {
    console.error('Erreur lors de l\'acceptation du prix:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

// Négocier le prix (client)
router.post('/:id/negotiate-price', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { clientPrice } = req.body;
    const clientId = req.user.userId;

    // Vérifier que la demande existe et appartient au client
    const serviceRequest = await queryOne(
      'SELECT * FROM quotes WHERE id = $1 AND client_id = $2 AND status = $3',
      [id, clientId, 'pending']
    );

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée ou non autorisée'
      });
    }

    if (!serviceRequest.price_cents) {
      return res.status(400).json({
        success: false,
        message: 'Aucun prix proposé'
      });
    }

    // Mettre à jour avec le prix du client (convertir en cents)
    const clientPriceCents = Math.round(clientPrice * 100);
    await query(
      `UPDATE quotes 
       SET price_cents = $1, updated_at = NOW() 
       WHERE id = $2`,
      [clientPriceCents, id]
    );

    // Créer une notification persistante pour le déménageur
    let demenageurNotification = null;
    const io = req.app.get('io'); // Obtenir l'instance Socket.IO
    try {
      demenageurNotification = await createNotification({
        userId: serviceRequest.mover_id,
        title: 'Nouvelle proposition du client',
        message: `${req.user.firstName || 'Client'} ${req.user.lastName || ''} propose ${clientPrice} TND pour la mission.`,
        type: 'client_price_proposed',
        data: {
          missionId: serviceRequest.id,
          clientPrice,
          clientId: serviceRequest.client_id,
          demenageurId,
        },
        io: io, // Passer l'instance Socket.IO pour l'envoi en temps réel
      });
    } catch (notificationError) {
      console.error('❌ Erreur création notification client_price_proposed:', notificationError);
    }

    // Récupérer la demande mise à jour
    const updatedRequest = await queryOne(
      'SELECT * FROM quotes WHERE id = $1',
      [id]
    );

    // Émettre un événement WebSocket au déménageur
    if (io) {
      io.to(`user_${serviceRequest.mover_id}`).emit('price_negotiated', {
        missionId: serviceRequest.id,
        clientPrice: clientPrice,
        clientName: `${req.user.firstName} ${req.user.lastName}`,
        notificationId: demenageurNotification ? demenageurNotification.id : null,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Prix négocié envoyé au déménageur',
      serviceRequest: updatedRequest
    });

  } catch (error) {
    console.error('Erreur lors de la négociation du prix:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

// Accepter la négociation (déménageur)
router.post('/:id/accept-negotiation', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const demenageurId = req.user.userId;

    // Vérifier que la demande existe et appartient au déménageur
    const serviceRequest = await queryOne(
      'SELECT * FROM quotes WHERE id = $1 AND mover_id = $2 AND status = $3',
      [id, demenageurId, 'pending']
    );

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée ou non autorisée'
      });
    }

    if (!serviceRequest.price_cents) {
      return res.status(400).json({
        success: false,
        message: 'Aucune négociation en cours'
      });
    }

    // Accepter le prix et changer le statut
    await query(
      `UPDATE quotes 
       SET status = $1, updated_at = NOW() 
       WHERE id = $2`,
      ['accepted', id]
    );

    // Récupérer la demande mise à jour
    const updatedRequest = await queryOne(
      'SELECT * FROM quotes WHERE id = $1',
      [id]
    );

    // Créer une notification pour le client
    let negotiationNotification = null;
    const io = req.app.get('io'); // Obtenir l'instance Socket.IO
    try {
      negotiationNotification = await createNotification({
        userId: serviceRequest.client_id,
        title: 'Négociation acceptée',
        message: `${req.user.firstName} ${req.user.lastName} a accepté votre proposition de ${serviceRequest.price_cents ? serviceRequest.price_cents / 100 : 0} TND.`,
        type: 'negotiation_accepted',
        data: {
          missionId: serviceRequest.id,
          acceptedPrice: serviceRequest.price_cents ? serviceRequest.price_cents / 100 : null,
          demenageurName: `${req.user.firstName} ${req.user.lastName}`,
          demenageurId,
        },
        io: io, // Passer l'instance Socket.IO pour l'envoi en temps réel
      });
    } catch (notificationError) {
      console.error('❌ Erreur lors de la création de la notification negotiation_accepted:', notificationError);
    }

    // Émettre un événement WebSocket au client
    if (io) {
      io.to(`user_${serviceRequest.client_id}`).emit('negotiation_accepted', {
        missionId: serviceRequest.id,
        acceptedPrice: serviceRequest.price_cents ? serviceRequest.price_cents / 100 : null,
        demenageurName: `${req.user.firstName} ${req.user.lastName}`,
        notificationId: negotiationNotification ? negotiationNotification.id : null,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Négociation acceptée, mission démarrée',
      serviceRequest: updatedRequest
    });

  } catch (error) {
    console.error('Erreur lors de l\'acceptation de la négociation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

// Route pour récupérer les demandes en attente pour le déménageur
router.get('/pending-for-demenageur', authenticateToken, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est un déménageur
    if (req.user.role !== 'demenageur') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Seuls les déménageurs peuvent accéder à cette ressource.'
      });
    }

    // Récupérer les demandes en attente avec toutes les données
    const pendingRequestsRaw = await queryMany(
      `SELECT q.*, 
              c.id as client_id, c.first_name as client_first_name, c.last_name as client_last_name, 
              c.email as client_email, c.phone as client_phone
       FROM quotes q
       JOIN users c ON q.client_id = c.id
       WHERE q.status = 'pending' AND q.mover_id IS NULL
       ORDER BY q.created_at DESC
       LIMIT 10`
    );

    // Transformer les données en camelCase pour le frontend
    const pendingRequests = pendingRequestsRaw.map(req => {
      // Parser services si c'est une chaîne JSON
      let serviceDetails = req.services;
      if (typeof serviceDetails === 'string') {
        try {
          serviceDetails = JSON.parse(serviceDetails);
        } catch (e) {
          serviceDetails = {};
        }
      } else if (!serviceDetails) {
        serviceDetails = {};
      }

      // Extraire serviceType depuis services si disponible
      const serviceType = serviceDetails.serviceType || 'demenagement';

      return {
        id: req.id,
        _id: req.id, // Pour compatibilité avec MongoDB
        serviceType: serviceType,
        departureAddress: req.from_address,
        destinationAddress: req.to_address,
        serviceDetails: serviceDetails,
        estimatedPrice: req.price_cents ? req.price_cents / 100 : null,
        scheduledDate: req.move_date,
        status: req.status,
        viewedByDemenageur: false, // Pas de champ dans quotes
        createdAt: req.created_at,
        updatedAt: req.updated_at,
        clientId: {
          id: req.client_id,
          firstName: req.client_first_name,
          lastName: req.client_last_name,
          first_name: req.client_first_name, // Pour compatibilité
          last_name: req.client_last_name, // Pour compatibilité
          email: req.client_email,
          phone: req.client_phone
        },
        demenageurId: req.mover_id
      };
    });

    res.status(200).json({
      success: true,
      requests: pendingRequests,
      count: pendingRequests.length
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des demandes en attente:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

// Route pour marquer une demande comme vue par le déménageur
router.post('/:id/mark-viewed', authenticateToken, async (req, res) => {
  try {
    // Vérifier que l'ID est fourni
    const serviceRequestId = req.params.id || req.body.id || req.body.serviceRequestId;
    
    if (!serviceRequestId) {
      return res.status(400).json({
        success: false,
        message: 'ID de la demande de service requis'
      });
    }

    // Vérifier que l'utilisateur est un déménageur
    if (req.user.role !== 'demenageur') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Seuls les déménageurs peuvent accéder à cette ressource.'
      });
    }

    const serviceRequest = await queryOne(
      'SELECT * FROM quotes WHERE id = $1',
      [serviceRequestId]
    );
    
    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demande de service non trouvée'
      });
    }

    // Marquer comme vue par le déménageur (pas de champ dans quotes, donc on met juste à jour updated_at)
    await query(
      'UPDATE quotes SET updated_at = NOW() WHERE id = $1',
      [serviceRequestId]
    );

    // Récupérer la demande mise à jour
    const updatedRequest = await queryOne(
      'SELECT * FROM quotes WHERE id = $1',
      [serviceRequestId]
    );

    res.status(200).json({
      success: true,
      message: 'Demande marquée comme vue',
      serviceRequest: updatedRequest
    });

  } catch (error) {
    console.error('Erreur lors du marquage de la demande:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

module.exports = router;
