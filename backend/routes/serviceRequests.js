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

    // Créer la demande de service
    const serviceRequestResult = await query(
      `INSERT INTO service_requests (id, client_id, demenageur_id, service_type, departure_address, destination_address, service_details, proposed_price, scheduled_date, status, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING *`,
      [clientId, demenageurId, serviceType, departureAddress, destinationAddress, JSON.stringify(serviceDetails), estimatedPrice, scheduledDate, 'pending']
    );
    const serviceRequest = serviceRequestResult.rows[0];

    // Émettre un événement WebSocket au déménageur
    const io = req.app.get('io');
    if (io) {
      console.log('🔔 Émission notification WebSocket pour déménageur:', demenageurId);
      io.to(`user_${demenageurId}`).emit('new_service_request', {
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
        demenageurId: demenageurId
      });
      console.log('✅ Notification WebSocket émise');
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

    const serviceRequests = await queryMany(
      `SELECT sr.*, 
              d.id as demenageur_id, d.first_name as demenageur_first_name, d.last_name as demenageur_last_name, 
              d.email as demenageur_email, d.phone as demenageur_phone
       FROM service_requests sr
       JOIN users d ON sr.demenageur_id = d.id
       WHERE sr.client_id = $1
       ORDER BY sr.created_at DESC`,
      [clientId]
    );

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
      `SELECT sr.*, 
              c.id as client_id, c.first_name as client_first_name, c.last_name as client_last_name, 
              c.email as client_email, c.phone as client_phone
       FROM service_requests sr
       JOIN users c ON sr.client_id = c.id
       WHERE sr.demenageur_id = $1 AND sr.status = 'pending'
       ORDER BY sr.created_at DESC
       LIMIT 1`,
      [demenageurId]
    );

    if (!pendingRequest) {
      return res.status(404).json({
        success: false,
        message: 'Aucune demande en attente trouvée'
      });
    }

    // Émettre l'événement WebSocket
    const io = req.app.get('io');
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
        serviceType: pendingRequest.service_type,
        departureAddress: pendingRequest.departure_address,
        destinationAddress: pendingRequest.destination_address,
        serviceDetails: typeof pendingRequest.service_details === 'string' ? JSON.parse(pendingRequest.service_details) : pendingRequest.service_details,
        estimatedPrice: pendingRequest.proposed_price,
        scheduledDate: pendingRequest.scheduled_date,
        status: pendingRequest.status,
        createdAt: pendingRequest.created_at,
        demenageurId: demenageurId
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
      `SELECT sr.*, 
              c.id as client_id, c.first_name as client_first_name, c.last_name as client_last_name, 
              c.email as client_email, c.phone as client_phone
       FROM service_requests sr
       JOIN users c ON sr.client_id = c.id
       WHERE sr.demenageur_id = $1
       ORDER BY sr.created_at DESC`,
      [demenageurId]
    );

    console.log('📊 Toutes les missions trouvées:', serviceRequestsRaw.length);

    // Transformer les données en camelCase pour le frontend
    const serviceRequests = serviceRequestsRaw.map(req => {
      // Parser service_details si c'est une chaîne JSON
      let serviceDetails = req.service_details;
      if (typeof serviceDetails === 'string') {
        try {
          serviceDetails = JSON.parse(serviceDetails);
        } catch (e) {
          serviceDetails = {};
        }
      }

      // Parser price_negotiation si c'est une chaîne JSON
      let priceNegotiation = req.price_negotiation;
      if (typeof priceNegotiation === 'string') {
        try {
          priceNegotiation = JSON.parse(priceNegotiation);
        } catch (e) {
          priceNegotiation = null;
        }
      }

      return {
        id: req.id,
        _id: req.id, // Pour compatibilité avec MongoDB
        serviceType: req.service_type,
        departureAddress: req.departure_address,
        destinationAddress: req.destination_address,
        serviceDetails: serviceDetails,
        proposedPrice: req.proposed_price,
        actualPrice: req.actual_price,
        scheduledDate: req.scheduled_date,
        status: req.status,
        viewedByDemenageur: req.viewed_by_demenageur,
        priceNegotiation: priceNegotiation,
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
        demenageurId: req.demenageur_id
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
      'SELECT * FROM service_requests WHERE id = $1',
      [requestId]
    );
    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée'
      });
    }

    // Vérifier que l'utilisateur peut modifier cette demande
    if (serviceRequest.demenageur_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    await query(
      'UPDATE service_requests SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, requestId]
    );

    // Récupérer la demande mise à jour
    const updatedRequest = await queryOne(
      'SELECT * FROM service_requests WHERE id = $1',
      [requestId]
    );

    // Émettre un événement WebSocket au client ET au déménageur
    const io = req.app.get('io');
    if (io) {
      // Émettre vers le client
      io.to(`user_${serviceRequest.client_id}`).emit('status_updated', {
        missionId: serviceRequest.id,
        newStatus: status,
        demenageurName: `${req.user.firstName} ${req.user.lastName}`
      });
      
      // Émettre vers le déménageur pour mettre à jour sa liste
      io.to(`user_${serviceRequest.demenageur_id}`).emit('status_updated', {
        missionId: serviceRequest.id,
        newStatus: status,
        demenageurName: `${req.user.firstName} ${req.user.lastName}`
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
      'SELECT * FROM service_requests WHERE id = $1 AND demenageur_id = $2 AND status = $3',
      [id, demenageurId, 'pending']
    );

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée ou non autorisée'
      });
    }

    // Mettre à jour avec le prix proposé
    const priceNegotiation = {
      demenageurPrice: proposedPrice,
      status: 'pending'
    };

    await query(
      `UPDATE service_requests 
       SET proposed_price = $1, price_negotiation = $2, updated_at = NOW() 
       WHERE id = $3`,
      [proposedPrice, JSON.stringify(priceNegotiation), id]
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
      'SELECT * FROM service_requests WHERE id = $1',
      [id]
    );

    // Émettre un événement WebSocket au client ET au déménageur
    const io = req.app.get('io');
    if (io) {
      const clientIdString = serviceRequest.client_id;
      const clientRoom = `user_${clientIdString}`;
      
      console.log('🔔 Émission price_proposed vers le client:', clientRoom);
      
      // Émettre vers le client
      io.to(clientRoom).emit('price_proposed', {
        missionId: serviceRequest.id,
        proposedPrice: proposedPrice,
        demenageurName: demenageurName
      });
      
      console.log('✅ Événement price_proposed émis vers:', clientRoom);
      
      // Émettre vers le déménageur pour mettre à jour sa liste
      io.to(`user_${serviceRequest.demenageur_id}`).emit('price_proposed', {
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
      'SELECT * FROM service_requests WHERE id = $1 AND client_id = $2 AND status = $3',
      [id, clientId, 'pending']
    );

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée ou non autorisée'
      });
    }

    if (!serviceRequest.proposed_price) {
      return res.status(400).json({
        success: false,
        message: 'Aucun prix proposé'
      });
    }

    // Accepter le prix et changer le statut
    const priceNegotiation = typeof serviceRequest.price_negotiation === 'string' 
      ? JSON.parse(serviceRequest.price_negotiation) 
      : serviceRequest.price_negotiation || {};
    priceNegotiation.status = 'accepted';

    await query(
      `UPDATE service_requests 
       SET actual_price = $1, status = $2, price_negotiation = $3, updated_at = NOW() 
       WHERE id = $4`,
      [serviceRequest.proposed_price, 'accepted', JSON.stringify(priceNegotiation), id]
    );

    // Récupérer la demande mise à jour
    const updatedRequest = await queryOne(
      'SELECT * FROM service_requests WHERE id = $1',
      [id]
    );

    // Émettre un événement WebSocket au déménageur
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${serviceRequest.demenageur_id}`).emit('price_accepted', {
        missionId: serviceRequest.id,
        acceptedPrice: serviceRequest.proposed_price,
        clientName: `${req.user.firstName} ${req.user.lastName}`
      });
    }

    // Créer automatiquement un chat pour cette demande acceptée
    try {
      // Vérifier qu'un chat n'existe pas déjà
      const existingChat = await queryOne(
        'SELECT * FROM chats WHERE service_request_id = $1',
        [serviceRequest.id]
      );
      if (!existingChat) {
        const chatResult = await query(
          `INSERT INTO chats (id, service_request_id, client_id, demenageur_id, status, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
           RETURNING *`,
          [serviceRequest.id, serviceRequest.client_id, serviceRequest.demenageur_id, 'active']
        );
        const chat = chatResult.rows[0];

        // Créer un message système de bienvenue
        const welcomeMessageResult = await query(
          `INSERT INTO chat_messages (id, chat_id, service_request_id, sender_id, sender_type, content, message_type, status, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
           RETURNING *`,
          [
            chat.id,
            serviceRequest.id,
            serviceRequest.demenageur_id,
            'demenageur',
            `Bonjour ! Votre demande a été acceptée. Nous pouvons maintenant discuter des détails de votre ${serviceRequest.service_type}.`,
            'system',
            'sent'
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

          io.to(`user_${serviceRequest.demenageur_id}`).emit('chat_created', {
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
      'SELECT * FROM service_requests WHERE id = $1 AND client_id = $2 AND status = $3',
      [id, clientId, 'pending']
    );

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée ou non autorisée'
      });
    }

    if (!serviceRequest.proposed_price) {
      return res.status(400).json({
        success: false,
        message: 'Aucun prix proposé'
      });
    }

    // Mettre à jour avec le prix du client
    const priceNegotiation = typeof serviceRequest.price_negotiation === 'string'
      ? JSON.parse(serviceRequest.price_negotiation)
      : serviceRequest.price_negotiation || {};
    priceNegotiation.clientPrice = clientPrice;
    priceNegotiation.status = 'negotiating';

    await query(
      `UPDATE service_requests 
       SET price_negotiation = $1, updated_at = NOW() 
       WHERE id = $2`,
      [JSON.stringify(priceNegotiation), id]
    );

    // Récupérer la demande mise à jour
    const updatedRequest = await queryOne(
      'SELECT * FROM service_requests WHERE id = $1',
      [id]
    );

    // Émettre un événement WebSocket au déménageur
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${serviceRequest.demenageur_id}`).emit('price_negotiated', {
        missionId: serviceRequest.id,
        clientPrice: clientPrice,
        clientName: `${req.user.firstName} ${req.user.lastName}`
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
      'SELECT * FROM service_requests WHERE id = $1 AND demenageur_id = $2 AND status = $3',
      [id, demenageurId, 'pending']
    );

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée ou non autorisée'
      });
    }

    const priceNegotiation = typeof serviceRequest.price_negotiation === 'string'
      ? JSON.parse(serviceRequest.price_negotiation)
      : serviceRequest.price_negotiation || {};

    if (!priceNegotiation.clientPrice) {
      return res.status(400).json({
        success: false,
        message: 'Aucune négociation en cours'
      });
    }

    // Accepter le prix du client et changer le statut
    priceNegotiation.status = 'accepted';

    await query(
      `UPDATE service_requests 
       SET actual_price = $1, status = $2, price_negotiation = $3, updated_at = NOW() 
       WHERE id = $4`,
      [priceNegotiation.clientPrice, 'accepted', JSON.stringify(priceNegotiation), id]
    );

    // Récupérer la demande mise à jour
    const updatedRequest = await queryOne(
      'SELECT * FROM service_requests WHERE id = $1',
      [id]
    );

    // Émettre un événement WebSocket au client
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${serviceRequest.client_id}`).emit('negotiation_accepted', {
        missionId: serviceRequest.id,
        acceptedPrice: priceNegotiation.clientPrice,
        demenageurName: `${req.user.firstName} ${req.user.lastName}`
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
      `SELECT sr.*, 
              c.id as client_id, c.first_name as client_first_name, c.last_name as client_last_name, 
              c.email as client_email, c.phone as client_phone
       FROM service_requests sr
       JOIN users c ON sr.client_id = c.id
       WHERE sr.status = 'pending' AND (sr.viewed_by_demenageur IS NULL OR sr.viewed_by_demenageur = false)
       ORDER BY sr.created_at DESC
       LIMIT 10`
    );

    // Transformer les données en camelCase pour le frontend
    const pendingRequests = pendingRequestsRaw.map(req => {
      // Parser service_details si c'est une chaîne JSON
      let serviceDetails = req.service_details;
      if (typeof serviceDetails === 'string') {
        try {
          serviceDetails = JSON.parse(serviceDetails);
        } catch (e) {
          serviceDetails = {};
        }
      }

      return {
        id: req.id,
        _id: req.id, // Pour compatibilité avec MongoDB
        serviceType: req.service_type,
        departureAddress: req.departure_address,
        destinationAddress: req.destination_address,
        serviceDetails: serviceDetails,
        estimatedPrice: req.proposed_price,
        scheduledDate: req.scheduled_date,
        status: req.status,
        viewedByDemenageur: req.viewed_by_demenageur,
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
        demenageurId: req.demenageur_id
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
      'SELECT * FROM service_requests WHERE id = $1',
      [serviceRequestId]
    );
    
    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demande de service non trouvée'
      });
    }

    // Marquer comme vue par le déménageur
    await query(
      'UPDATE service_requests SET viewed_by_demenageur = true, updated_at = NOW() WHERE id = $1',
      [serviceRequestId]
    );

    // Récupérer la demande mise à jour
    const updatedRequest = await queryOne(
      'SELECT * FROM service_requests WHERE id = $1',
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
