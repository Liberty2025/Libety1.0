const express = require('express');
const router = express.Router();
const { queryOne, queryMany } = require('../utils/dbHelpers');

// GET /api/users - Liste tous les utilisateurs
router.get('/', async (req, res) => {
  try {
    const users = await queryMany(
      'SELECT id, first_name, last_name, email, phone, role, status, address, created_at, updated_at FROM users'
    );
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs',
      error: error.message
    });
  }
});

// GET /api/users/demenageurs - Liste tous les déménageurs
router.get('/demenageurs', async (req, res) => {
  try {
    const demenageurs = await queryMany(
      'SELECT id, first_name, last_name, email, phone, role, status, address, created_at, updated_at FROM users WHERE role = $1',
      ['demenageur']
    );
    res.json({
      success: true,
      data: demenageurs,
      count: demenageurs.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des déménageurs',
      error: error.message
    });
  }
});

// GET /api/users/:id - Détails d'un utilisateur
router.get('/:id', async (req, res) => {
  try {
    const user = await queryOne(
      'SELECT id, first_name, last_name, email, phone, role, status, address, created_at, updated_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Récupérer la localisation si elle existe
    const location = await queryOne(
      'SELECT * FROM user_locations WHERE user_id = $1',
      [user.id]
    );
    
    res.json({
      success: true,
      data: {
        ...user,
        latitude: location ? parseFloat(location.lat) : null,
        longitude: location ? parseFloat(location.lng) : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'utilisateur',
      error: error.message
    });
  }
});

// GET /api/users/:id/profile - Profil complet d'un déménageur
router.get('/:id/profile', async (req, res) => {
  try {
    const user = await queryOne(
      'SELECT id, first_name, last_name, email, phone, role, status, address, created_at, updated_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    if (user.role !== 'demenageur') {
      return res.status(400).json({
        success: false,
        message: 'Cet utilisateur n\'est pas un déménageur'
      });
    }

    const profile = await queryOne(
      'SELECT * FROM mover_profiles WHERE user_id = $1',
      [user.id]
    );
    const location = await queryOne(
      'SELECT * FROM user_locations WHERE user_id = $1',
      [user.id]
    );

    res.json({
      success: true,
      data: {
        user: {
          ...user,
          latitude: location ? parseFloat(location.lat) : null,
          longitude: location ? parseFloat(location.lng) : null
        },
        profile,
        location
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil',
      error: error.message
    });
  }
});

// GET /api/users/demenageurs/nearby - Déménageurs à proximité
router.get('/demenageurs/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 10 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude et longitude requises'
      });
    }

    // Récupérer tous les déménageurs disponibles
    const demenageurs = await queryMany(
      `SELECT id, first_name, last_name, email, phone, role, status, address, created_at, updated_at 
       FROM users 
       WHERE role = 'demenageur' AND status = 'available'`
    );

    const demenageursWithProfiles = await Promise.all(
      demenageurs.map(async (demenageur) => {
        const profile = await queryOne(
          'SELECT * FROM mover_profiles WHERE user_id = $1',
          [demenageur.id]
        );
        const location = await queryOne(
          'SELECT * FROM user_locations WHERE user_id = $1',
          [demenageur.id]
        );
        return {
          ...demenageur,
          profile,
          location
        };
      })
    );

    res.json({
      success: true,
      data: demenageursWithProfiles,
      count: demenageursWithProfiles.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des déménageurs à proximité',
      error: error.message
    });
  }
});

module.exports = router;
