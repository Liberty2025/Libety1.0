const express = require('express');
const router = express.Router();
const { queryOne, queryMany, query } = require('../utils/dbHelpers');

// GET /api/reservations - Liste toutes les réservations
router.get('/', async (req, res) => {
  try {
    const reservations = await queryMany(
      `SELECT r.*, 
              c.id as client_id, c.first_name as client_first_name, c.last_name as client_last_name, 
              c.email as client_email, c.phone as client_phone,
              d.id as demenageur_id, d.first_name as demenageur_first_name, d.last_name as demenageur_last_name, 
              d.email as demenageur_email, d.phone as demenageur_phone
       FROM reservations r
       LEFT JOIN users c ON r.client_id = c.id
       LEFT JOIN users d ON r.demenageur_id = d.id
       ORDER BY r.created_at DESC`
    );
    
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
    const reservation = await queryOne(
      `SELECT r.*, 
              c.id as client_id, c.first_name as client_first_name, c.last_name as client_last_name, 
              c.email as client_email, c.phone as client_phone,
              d.id as demenageur_id, d.first_name as demenageur_first_name, d.last_name as demenageur_last_name, 
              d.email as demenageur_email, d.phone as demenageur_phone
       FROM reservations r
       LEFT JOIN users c ON r.client_id = c.id
       LEFT JOIN users d ON r.demenageur_id = d.id
       WHERE r.id = $1`,
      [req.params.id]
    );
    
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
    const client = await queryOne(
      'SELECT * FROM users WHERE id = $1',
      [client_id]
    );
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client non trouvé'
      });
    }

    const reservationResult = await query(
      `INSERT INTO reservations (id, client_id, date_reservation, adresse_depart, adresse_arrivee, volume_m3, description, special_requirements, status, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      [client_id, date_reservation, adresse_depart, adresse_arrivee, parseFloat(volume_m3), description || null, special_requirements || null, 'en_attente']
    );
    const reservation = reservationResult.rows[0];

    // Récupérer la réservation avec les informations du client
    const reservationWithClient = await queryOne(
      `SELECT r.*, 
              c.id as client_id, c.first_name as client_first_name, c.last_name as client_last_name, 
              c.email as client_email, c.phone as client_phone
       FROM reservations r
       JOIN users c ON r.client_id = c.id
       WHERE r.id = $1`,
      [reservation.id]
    );

    res.status(201).json({
      success: true,
      message: 'Réservation créée avec succès',
      data: reservationWithClient
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
    
    const reservation = await queryOne(
      'SELECT * FROM reservations WHERE id = $1',
      [req.params.id]
    );
    if (!reservation) {
      return res.status(404).json({
        success: false,
        message: 'Réservation non trouvée'
      });
    }

    // Si on assigne un déménageur, vérifier qu'il existe
    if (demenageur_id) {
      const demenageur = await queryOne(
        'SELECT * FROM users WHERE id = $1',
        [demenageur_id]
      );
      if (!demenageur || demenageur.role !== 'demenageur') {
        return res.status(400).json({
          success: false,
          message: 'Déménageur non trouvé ou invalide'
        });
      }
    }

    // Construire la requête de mise à jour
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (status) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (demenageur_id) {
      updates.push(`demenageur_id = $${paramIndex++}`);
      values.push(demenageur_id);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucune donnée à mettre à jour'
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.params.id);

    await query(
      `UPDATE reservations SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    // Récupérer la réservation mise à jour avec les informations
    const updatedReservation = await queryOne(
      `SELECT r.*, 
              c.id as client_id, c.first_name as client_first_name, c.last_name as client_last_name, 
              c.email as client_email, c.phone as client_phone,
              d.id as demenageur_id, d.first_name as demenageur_first_name, d.last_name as demenageur_last_name, 
              d.email as demenageur_email, d.phone as demenageur_phone
       FROM reservations r
       LEFT JOIN users c ON r.client_id = c.id
       LEFT JOIN users d ON r.demenageur_id = d.id
       WHERE r.id = $1`,
      [req.params.id]
    );

    res.json({
      success: true,
      message: 'Réservation mise à jour avec succès',
      data: updatedReservation
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
    const reservations = await queryMany(
      `SELECT r.*, 
              d.id as demenageur_id, d.first_name as demenageur_first_name, d.last_name as demenageur_last_name, 
              d.email as demenageur_email, d.phone as demenageur_phone
       FROM reservations r
       LEFT JOIN users d ON r.demenageur_id = d.id
       WHERE r.client_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.clientId]
    );
    
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
    const reservations = await queryMany(
      `SELECT r.*, 
              c.id as client_id, c.first_name as client_first_name, c.last_name as client_last_name, 
              c.email as client_email, c.phone as client_phone
       FROM reservations r
       LEFT JOIN users c ON r.client_id = c.id
       WHERE r.demenageur_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.demenageurId]
    );
    
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
