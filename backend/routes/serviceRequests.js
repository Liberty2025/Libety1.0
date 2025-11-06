const express = require('express');
const router = express.Router();
const ServiceRequest = require('../models/ServiceRequest');
const User = require('../models/User');
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
    const client = await User.findById(clientId);
    if (!client || client.role !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Vérifier que le déménageur existe
    const demenageur = await User.findById(demenageurId);
    if (!demenageur || demenageur.role !== 'demenageur') {
      return res.status(404).json({
        success: false,
        message: 'Déménageur non trouvé'
      });
    }

    // Créer la demande de service
    const serviceRequest = new ServiceRequest({
      clientId,
      demenageurId,
      serviceType,
      departureAddress,
      destinationAddress,
      serviceDetails,
      estimatedPrice,
      scheduledDate,
      status: 'pending'
    });

    await serviceRequest.save();

    // Émettre un événement WebSocket au déménageur
    const io = req.app.get('io');
    if (io) {
      console.log('🔔 Émission notification WebSocket pour déménageur:', demenageurId);
      io.to(`user_${demenageurId}`).emit('new_service_request', {
        _id: serviceRequest._id,
        clientId: {
          _id: client._id,
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
        createdAt: serviceRequest.createdAt,
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
    const client = await User.findById(clientId);
    if (!client || client.role !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    const serviceRequests = await ServiceRequest.find({ clientId })
      .populate('demenageurId', 'first_name last_name email phone')
      .sort({ createdAt: -1 });

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
    const demenageur = await User.findById(demenageurId);
    if (!demenageur || demenageur.role !== 'demenageur') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Trouver une demande en attente
    const pendingRequest = await ServiceRequest.findOne({ 
      demenageurId, 
      status: 'pending' 
    }).populate('clientId', 'first_name last_name email phone');

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
        _id: pendingRequest._id,
        clientId: {
          _id: pendingRequest.clientId._id,
          first_name: pendingRequest.clientId.first_name,
          last_name: pendingRequest.clientId.last_name,
          email: pendingRequest.clientId.email,
          phone: pendingRequest.clientId.phone
        },
        serviceType: pendingRequest.serviceType,
        departureAddress: pendingRequest.departureAddress,
        destinationAddress: pendingRequest.destinationAddress,
        serviceDetails: pendingRequest.serviceDetails,
        estimatedPrice: pendingRequest.estimatedPrice,
        scheduledDate: pendingRequest.scheduledDate,
        status: pendingRequest.status,
        createdAt: pendingRequest.createdAt,
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
    const demenageur = await User.findById(demenageurId);
    if (!demenageur || demenageur.role !== 'demenageur') {
      console.log('❌ Utilisateur non autorisé:', demenageur?.role);
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    const serviceRequests = await ServiceRequest.find({ demenageurId })
      .populate('clientId', 'first_name last_name email phone')
      .sort({ createdAt: -1 });

    console.log('📊 Toutes les missions trouvées:', serviceRequests.length);
    console.log('📋 Détail des missions:', serviceRequests.map(req => ({
      id: req._id,
      status: req.status,
      client: req.clientId?.first_name,
      departureAddress: req.departureAddress,
      serviceType: req.serviceType
    })));

    // Filtrer les missions acceptées
    const acceptedMissions = serviceRequests.filter(req => req.status === 'accepted');
    console.log('✅ Missions acceptées:', acceptedMissions.length);
    console.log('✅ Détail des missions acceptées:', acceptedMissions.map(req => ({
      id: req._id,
      client: req.clientId?.first_name,
      departureAddress: req.departureAddress,
      serviceType: req.serviceType
    })));

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

    const serviceRequest = await ServiceRequest.findById(requestId);
    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée'
      });
    }

    // Vérifier que l'utilisateur peut modifier cette demande
    if (serviceRequest.demenageurId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    serviceRequest.status = status;
    serviceRequest.updatedAt = new Date();
    await serviceRequest.save();

    // Émettre un événement WebSocket au client ET au déménageur
    const io = req.app.get('io');
    if (io) {
      // Émettre vers le client
      io.to(`user_${serviceRequest.clientId}`).emit('status_updated', {
        missionId: serviceRequest._id,
        newStatus: status,
        demenageurName: `${req.user.firstName} ${req.user.lastName}`
      });
      
      // Émettre vers le déménageur pour mettre à jour sa liste
      io.to(`user_${serviceRequest.demenageurId}`).emit('status_updated', {
        missionId: serviceRequest._id,
        newStatus: status,
        demenageurName: `${req.user.firstName} ${req.user.lastName}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Statut mis à jour avec succès',
      serviceRequest
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
    const serviceRequest = await ServiceRequest.findOne({ 
      _id: id, 
      demenageurId: demenageurId,
      status: 'pending'
    });

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée ou non autorisée'
      });
    }

    // Mettre à jour avec le prix proposé
    serviceRequest.proposedPrice = proposedPrice;
    serviceRequest.priceNegotiation = {
      demenageurPrice: proposedPrice,
      status: 'pending'
    };

    await serviceRequest.save();

    // Récupérer les informations du déménageur pour l'événement
    const demenageur = await User.findById(demenageurId);
    const demenageurName = demenageur 
      ? `${demenageur.first_name || ''} ${demenageur.last_name || ''}`.trim() 
      : 'Déménageur';

    // Émettre un événement WebSocket au client ET au déménageur
    const io = req.app.get('io');
    if (io) {
      // Convertir clientId en string pour la room
      const clientIdString = serviceRequest.clientId.toString();
      const clientRoom = `user_${clientIdString}`;
      
      console.log('🔔 Émission price_proposed vers le client:');
      console.log('   - Client ID (ObjectId):', serviceRequest.clientId);
      console.log('   - Client ID (String):', clientIdString);
      console.log('   - Room:', clientRoom);
      console.log('   - Prix proposé:', serviceRequest.proposedPrice);
      console.log('   - Nom déménageur:', demenageurName);
      
      // Vérifier combien de sockets sont dans cette room
      const room = io.sockets.adapter.rooms.get(clientRoom);
      const socketCount = room ? room.size : 0;
      console.log(`   - Sockets dans la room: ${socketCount}`);
      
      // Émettre vers le client
      io.to(clientRoom).emit('price_proposed', {
        missionId: serviceRequest._id,
        proposedPrice: serviceRequest.proposedPrice,
        demenageurName: demenageurName
      });
      
      console.log('✅ Événement price_proposed émis vers:', clientRoom);
      
      // Émettre vers le déménageur pour mettre à jour sa liste
      io.to(`user_${serviceRequest.demenageurId}`).emit('price_proposed', {
        missionId: serviceRequest._id,
        proposedPrice: serviceRequest.proposedPrice,
        demenageurName: `${req.user.firstName} ${req.user.lastName}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Prix proposé avec succès',
      serviceRequest
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
    const serviceRequest = await ServiceRequest.findOne({ 
      _id: id, 
      clientId: clientId,
      status: 'pending'
    });

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée ou non autorisée'
      });
    }

    if (!serviceRequest.proposedPrice) {
      return res.status(400).json({
        success: false,
        message: 'Aucun prix proposé'
      });
    }

    // Accepter le prix et changer le statut
    serviceRequest.actualPrice = serviceRequest.proposedPrice;
    serviceRequest.status = 'accepted';
    serviceRequest.priceNegotiation.status = 'accepted';

    await serviceRequest.save();

    // Émettre un événement WebSocket au déménageur
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${serviceRequest.demenageurId}`).emit('price_accepted', {
        missionId: serviceRequest._id,
        acceptedPrice: serviceRequest.actualPrice,
        clientName: `${req.user.firstName} ${req.user.lastName}`
      });
    }

    // Créer automatiquement un chat pour cette demande acceptée
    try {
      const { Chat } = require('../models');
      
      // Vérifier qu'un chat n'existe pas déjà
      const existingChat = await Chat.findOne({ serviceRequestId: serviceRequest._id });
      if (!existingChat) {
        const chat = new Chat({
          serviceRequestId: serviceRequest._id,
          clientId: serviceRequest.clientId,
          demenageurId: serviceRequest.demenageurId,
          status: 'active'
        });

        await chat.save();

        // Créer un message système de bienvenue
        const { ChatMessage } = require('../models');
        const welcomeMessage = new ChatMessage({
          chatId: chat._id,
          serviceRequestId: serviceRequest._id,
          senderId: serviceRequest.demenageurId,
          senderType: 'demenageur',
          content: `Bonjour ! Votre demande a été acceptée. Nous pouvons maintenant discuter des détails de votre ${serviceRequest.serviceType}.`,
          messageType: 'system'
        });

        await welcomeMessage.save();

        // Notifier les utilisateurs qu'un chat a été créé
        if (io) {
          io.to(`user_${serviceRequest.clientId}`).emit('chat_created', {
            chatId: chat._id,
            serviceRequestId: serviceRequest._id,
            demenageurName: `${req.user.firstName} ${req.user.lastName}`,
            message: welcomeMessage.content
          });

          io.to(`user_${serviceRequest.demenageurId}`).emit('chat_created', {
            chatId: chat._id,
            serviceRequestId: serviceRequest._id,
            clientName: `${req.user.firstName} ${req.user.lastName}`,
            message: welcomeMessage.content
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
      serviceRequest
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
    const serviceRequest = await ServiceRequest.findOne({ 
      _id: id, 
      clientId: clientId,
      status: 'pending'
    });

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée ou non autorisée'
      });
    }

    if (!serviceRequest.proposedPrice) {
      return res.status(400).json({
        success: false,
        message: 'Aucun prix proposé'
      });
    }

    // Mettre à jour avec le prix du client
    serviceRequest.priceNegotiation.clientPrice = clientPrice;
    serviceRequest.priceNegotiation.status = 'negotiating';

    await serviceRequest.save();

    // Émettre un événement WebSocket au déménageur
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${serviceRequest.demenageurId}`).emit('price_negotiated', {
        missionId: serviceRequest._id,
        clientPrice: serviceRequest.priceNegotiation.clientPrice,
        clientName: `${req.user.firstName} ${req.user.lastName}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Prix négocié envoyé au déménageur',
      serviceRequest
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
    const serviceRequest = await ServiceRequest.findOne({ 
      _id: id, 
      demenageurId: demenageurId,
      status: 'pending'
    });

    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demande non trouvée ou non autorisée'
      });
    }

    if (!serviceRequest.priceNegotiation.clientPrice) {
      return res.status(400).json({
        success: false,
        message: 'Aucune négociation en cours'
      });
    }

    // Accepter le prix du client et changer le statut
    serviceRequest.actualPrice = serviceRequest.priceNegotiation.clientPrice;
    serviceRequest.status = 'accepted';
    serviceRequest.priceNegotiation.status = 'accepted';

    await serviceRequest.save();

    // Émettre un événement WebSocket au client
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${serviceRequest.clientId}`).emit('negotiation_accepted', {
        missionId: serviceRequest._id,
        acceptedPrice: serviceRequest.actualPrice,
        demenageurName: `${req.user.firstName} ${req.user.lastName}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Négociation acceptée, mission démarrée',
      serviceRequest
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
    const pendingRequests = await ServiceRequest.find({
      status: 'pending',
      viewedByDemenageur: { $ne: true }
    })
    .populate('clientId', 'firstName lastName email phone')
    .sort({ createdAt: -1 })
    .limit(10);

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
    // Vérifier que l'utilisateur est un déménageur
    if (req.user.role !== 'demenageur') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé. Seuls les déménageurs peuvent accéder à cette ressource.'
      });
    }

    const serviceRequest = await ServiceRequest.findById(req.params.id);
    
    if (!serviceRequest) {
      return res.status(404).json({
        success: false,
        message: 'Demande de service non trouvée'
      });
    }

    // Marquer comme vue par le déménageur
    serviceRequest.viewedByDemenageur = true;
    await serviceRequest.save();

    res.status(200).json({
      success: true,
      message: 'Demande marquée comme vue',
      serviceRequest
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
