const express = require('express');
const router = express.Router();
const { User, MoverProfile, UserLocation } = require('../models');

// GET /api/demenageurs - Liste tous les déménageurs avec leurs informations complètes
router.get('/', async (req, res) => {
  try {
    const demenageurs = await User.find({ role: 'demenageur' }).select('-password');
    
    // Enrichir avec les profils et localisations
    const demenageursWithDetails = await Promise.all(
      demenageurs.map(async (demenageur) => {
        const profile = await MoverProfile.findOne({ user_id: demenageur._id });
        const location = await UserLocation.findOne({ user_id: demenageur._id });
        
        return {
          id: demenageur._id,
          first_name: demenageur.first_name,
          last_name: demenageur.last_name,
          email: demenageur.email,
          phone: demenageur.phone,
          address: demenageur.address,
          latitude: demenageur.latitude,
          longitude: demenageur.longitude,
          status: demenageur.status,
          company_name: profile ? profile.company_name : null,
          rating: profile ? profile.rating : 0,
          total_reviews: profile ? profile.total_reviews : 0,
          experience_years: profile ? profile.experience_years : 0,
          services_offered: profile ? profile.services_offered : [],
          is_verified: profile ? profile.is_verified : false,
          location: location ? {
            lat: location.lat,
            lng: location.lng,
            address: location.address
          } : null
        };
      })
    );

    res.json({
      success: true,
      data: demenageursWithDetails,
      count: demenageursWithDetails.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des déménageurs',
      error: error.message
    });
  }
});

// GET /api/demenageurs/nearby - Déménageurs à proximité d'une position
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 20 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude et longitude requises'
      });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const searchRadius = parseFloat(radius);

    const demenageurs = await User.find({ 
      role: 'demenageur', 
      status: 'available',
      latitude: { $exists: true },
      longitude: { $exists: true }
    }).select('-password');

    // Filtrer par distance
    const nearbyDemenageurs = demenageurs.filter(demenageur => {
      const distance = calculateDistance(
        userLat, userLng,
        demenageur.latitude, demenageur.longitude
      );
      return distance <= searchRadius;
    });

    // Enrichir avec les profils
    const demenageursWithDetails = await Promise.all(
      nearbyDemenageurs.map(async (demenageur) => {
        const profile = await MoverProfile.findOne({ user_id: demenageur._id });
        const distance = calculateDistance(
          userLat, userLng,
          demenageur.latitude, demenageur.longitude
        );
        
        return {
          id: demenageur._id,
          first_name: demenageur.first_name,
          last_name: demenageur.last_name,
          email: demenageur.email,
          phone: demenageur.phone,
          address: demenageur.address,
          latitude: demenageur.latitude,
          longitude: demenageur.longitude,
          status: demenageur.status,
          distance: Math.round(distance * 100) / 100, // Arrondir à 2 décimales
          company_name: profile ? profile.company_name : null,
          rating: profile ? profile.rating : 0,
          total_reviews: profile ? profile.total_reviews : 0,
          experience_years: profile ? profile.experience_years : 0,
          services_offered: profile ? profile.services_offered : [],
          is_verified: profile ? profile.is_verified : false
        };
      })
    );

    // Trier par distance
    demenageursWithDetails.sort((a, b) => a.distance - b.distance);

    res.json({
      success: true,
      data: demenageursWithDetails,
      count: demenageursWithDetails.length,
      search_center: { lat: userLat, lng: userLng },
      radius: searchRadius
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des déménageurs à proximité',
      error: error.message
    });
  }
});

// GET /api/demenageurs/:id - Détails d'un déménageur
router.get('/:id', async (req, res) => {
  try {
    const demenageur = await User.findById(req.params.id).select('-password');
    if (!demenageur || demenageur.role !== 'demenageur') {
      return res.status(404).json({
        success: false,
        message: 'Déménageur non trouvé'
      });
    }

    const profile = await MoverProfile.findOne({ user_id: demenageur._id });
    const location = await UserLocation.findOne({ user_id: demenageur._id });

    res.json({
      success: true,
      data: {
        id: demenageur._id,
        first_name: demenageur.first_name,
        last_name: demenageur.last_name,
        email: demenageur.email,
        phone: demenageur.phone,
        address: demenageur.address,
        latitude: demenageur.latitude,
        longitude: demenageur.longitude,
        status: demenageur.status,
        company_name: profile ? profile.company_name : null,
        description: profile ? profile.description : null,
        rating: profile ? profile.rating : 0,
        total_reviews: profile ? profile.total_reviews : 0,
        experience_years: profile ? profile.experience_years : 0,
        services_offered: profile ? profile.services_offered : [],
        equipment_available: profile ? profile.equipment_available : [],
        insurance_coverage: profile ? profile.insurance_coverage : false,
        is_verified: profile ? profile.is_verified : false,
        location: location ? {
          lat: location.lat,
          lng: location.lng,
          address: location.address
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du déménageur',
      error: error.message
    });
  }
});

// Fonction pour calculer la distance entre deux points GPS
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

module.exports = router;
