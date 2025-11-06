const express = require('express');
const router = express.Router();
const { Reservation, User } = require('../models');

// GET /api/reservations - Liste toutes les réservations
router.get('/', async (req, res) => {
  try {
    const reservations = await Reservation.find()
      .populate('client_id', 'first_name last_name email phone')
      .populate('demenageur_id', 'first_name last_name email phone')
      .sort({ created_at: -1 });
    
    res.json({
      success: true,
      data: reservations,
      count: reservations.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des réservations',
      error: error.message
    });
  }
});

// GET /api/reservations/:id - Détails d'une réservation
router.get('/:id', async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('client_id', 'first_name last_name email phone')
      .populate('demenageur_id', 'first_name last_name email phone');
    
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }
    
    res.json({
      success: true,
      data: reservation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de la réservation',
      error: error.message
    });
  }
});

// POST /api/reservations - Créer une nouvelle réservation
router.post('/', async (req, res) => {
  try {
    const {
      client_id,
      date_reservation,
      adresse_depart,
      adresse_arrivee,
      volume_m3,
      description,
      special_requirements
    } = req.body;

    // Validation des champs requis
    if (!client_id || !date_reservation || !adresse_depart || !adresse_arrivee || !volume_m3) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs requis doivent être fournis'
      });
    }

    // Vérifier que le client existe
    const client = await User.findById(client_id);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client non trouvé'
      });
    }

    const reservation = new Reservation({
      client_id,
      date_reservation: new Date(date_reservation),
      adresse_depart,
      adresse_arrivee,
      volume_m3: parseFloat(volume_m3),
      description,
      special_requirements,
      status: 'en_attente'
    });

    await reservation.save();
    await reservation.populate('client_id', 'first_name last_name email phone');

    res.status(201).json({
      success: true,
      message: 'Réservation créée avec succès',
      data: reservation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la réservation',
      error: error.message
    });
  }
});

// PUT /api/reservations/:id - Modifier une réservation
router.put('/:id', async (req, res) => {
  try {
    const { status, demenageur_id } = req.body;
    
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    // Si on assigne un déménageur, vérifier qu'il existe
    if (demenageur_id) {
      const demenageur = await User.findById(demenageur_id);
      if (!demenageur || demenageur.role !== 'demenageur') {
        return res.status(400).json({
          success: false,
          message: 'Déménageur non trouvé ou invalide'
        });
      }
    }

    // Mettre à jour les champs fournis
    if (status) reservation.status = status;
    if (demenageur_id) reservation.demenageur_id = demenageur_id;

    await reservation.save();
    await reservation.populate('client_id', 'first_name last_name email phone');
    await reservation.populate('demenageur_id', 'first_name last_name email phone');

    res.json({
      success: true,
      message: 'Réservation mise à jour avec succès',
      data: reservation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la réservation',
      error: error.message
    });
  }
});

// GET /api/reservations/client/:clientId - Réservations d'un client
router.get('/client/:clientId', async (req, res) => {
  try {
    const reservations = await Reservation.find({ client_id: req.params.clientId })
      .populate('demenageur_id', 'first_name last_name email phone')
      .sort({ created_at: -1 });
    
    res.json({
      success: true,
      data: reservations,
      count: reservations.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des réservations du client',
      error: error.message
    });
  }
});

// GET /api/reservations/demenageur/:demenageurId - Réservations d'un déménageur
router.get('/demenageur/:demenageurId', async (req, res) => {
  try {
    const reservations = await Reservation.find({ demenageur_id: req.params.demenageurId })
      .populate('client_id', 'first_name last_name email phone')
      .sort({ created_at: -1 });
    
    res.json({
      success: true,
      data: reservations,
      count: reservations.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des réservations du déménageur',
      error: error.message
    });
  }
});

module.exports = router;
