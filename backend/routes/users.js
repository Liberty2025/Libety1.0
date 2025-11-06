const express = require('express');
const router = express.Router();
const { User, MoverProfile, UserLocation } = require('../models');

// GET /api/users - Liste tous les utilisateurs
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password');
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
    const demenageurs = await User.find({ role: 'demenageur' }).select('-password');
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
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    res.json({
      success: true,
      data: user
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
    const user = await User.findById(req.params.id).select('-password');
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

    const profile = await MoverProfile.findOne({ user_id: user._id });
    const location = await UserLocation.findOne({ user_id: user._id });

    res.json({
      success: true,
      data: {
        user,
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

    // Pour une vraie application, vous utiliseriez une requête géospatiale
    // Ici, on récupère tous les déménageurs disponibles
    const demenageurs = await User.find({ 
      role: 'demenageur', 
      status: 'available' 
    }).select('-password');

    const demenageursWithProfiles = await Promise.all(
      demenageurs.map(async (demenageur) => {
        const profile = await MoverProfile.findOne({ user_id: demenageur._id });
        const location = await UserLocation.findOne({ user_id: demenageur._id });
        return {
          ...demenageur.toObject(),
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
