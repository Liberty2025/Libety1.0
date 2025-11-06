const express = require('express');
const router = express.Router();
const { queryOne, queryMany } = require('../utils/dbHelpers');

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

// GET /api/demenageurs - Liste tous les déménageurs avec leurs informations complètes
router.get('/', async (req, res) => {
  try {
    // Filtrer uniquement les déménageurs disponibles
    const demenageurs = await queryMany(
      'SELECT id, first_name, last_name, email, phone, role, status, address, is_verified, created_at, updated_at FROM users WHERE role = $1 AND status = $2',
      ['demenageur', 'available']
    );
    
    console.log(`📋 Déménageurs trouvés: ${demenageurs.length}`);
    
    // Enrichir avec les profils et localisations
    const demenageursWithDetails = await Promise.all(
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
          id: demenageur.id,
          first_name: demenageur.first_name,
          last_name: demenageur.last_name,
          email: demenageur.email,
          phone: demenageur.phone,
          address: demenageur.address,
          status: demenageur.status,
          company_name: profile ? (profile.company_name || null) : null,
          rating: profile && profile.rating != null ? parseFloat(profile.rating) : 0,
          total_reviews: profile && profile.total_reviews != null ? parseInt(profile.total_reviews) : 0,
          experience_years: profile && profile.experience_years != null ? parseInt(profile.experience_years) : 0,
          services_offered: profile ? (Array.isArray(profile.services_offered) ? profile.services_offered : []) : [],
          is_verified: demenageur.is_verified || false, // is_verified est dans la table users, pas mover_profiles
          // Retourner les coordonnées directement pour faciliter l'utilisation dans le frontend
          latitude: location ? parseFloat(location.lat) : null,
          longitude: location ? parseFloat(location.lng) : null,
          location: location ? {
            lat: parseFloat(location.lat),
            lng: parseFloat(location.lng),
            address: location.address || null,
            city: location.city || null,
            country: location.country || null
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
    console.error('❌ Erreur dans /api/demenageurs:', error);
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

    const demenageurs = await queryMany(
      `SELECT id, first_name, last_name, email, phone, role, status, address, is_verified, created_at, updated_at 
       FROM users 
       WHERE role = 'demenageur' AND status = 'available'`
    );

    // Récupérer les localisations et filtrer par distance
    const demenageursWithLocations = await Promise.all(
      demenageurs.map(async (demenageur) => {
        const location = await queryOne(
          'SELECT * FROM user_locations WHERE user_id = $1',
          [demenageur.id]
        );
        return {
          ...demenageur,
          location
        };
      })
    );

    // Filtrer par distance
    const nearbyDemenageurs = demenageursWithLocations.filter(demenageur => {
      if (!demenageur.location || !demenageur.location.lat || !demenageur.location.lng) return false;
      const distance = calculateDistance(
        userLat, userLng,
        parseFloat(demenageur.location.lat), parseFloat(demenageur.location.lng)
      );
      return distance <= searchRadius;
    });

    // Enrichir avec les profils
    const demenageursWithDetails = await Promise.all(
      nearbyDemenageurs.map(async (demenageur) => {
        const profile = await queryOne(
          'SELECT * FROM mover_profiles WHERE user_id = $1',
          [demenageur.id]
        );
        const distance = calculateDistance(
          userLat, userLng,
          parseFloat(demenageur.location.lat), parseFloat(demenageur.location.lng)
        );
        
        return {
          id: demenageur.id,
          first_name: demenageur.first_name,
          last_name: demenageur.last_name,
          email: demenageur.email,
          phone: demenageur.phone,
          address: demenageur.address,
          latitude: parseFloat(demenageur.location.lat),
          longitude: parseFloat(demenageur.location.lng),
          status: demenageur.status,
          distance: Math.round(distance * 100) / 100, // Arrondir à 2 décimales
          company_name: profile ? (profile.company_name || null) : null,
          rating: profile && profile.rating != null ? parseFloat(profile.rating) : 0,
          total_reviews: profile && profile.total_reviews != null ? parseInt(profile.total_reviews) : 0,
          experience_years: profile && profile.experience_years != null ? parseInt(profile.experience_years) : 0,
          services_offered: profile ? (Array.isArray(profile.services_offered) ? profile.services_offered : []) : [],
          is_verified: demenageur.is_verified || false, // is_verified est dans la table users
          location: {
            lat: parseFloat(demenageur.location.lat),
            lng: parseFloat(demenageur.location.lng),
            city: demenageur.location.city || null,
            country: demenageur.location.country || null
          }
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
    const demenageur = await queryOne(
      'SELECT id, first_name, last_name, email, phone, role, status, address, is_verified, created_at, updated_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (!demenageur || demenageur.role !== 'demenageur') {
      return res.status(404).json({
        success: false,
        message: 'Déménageur non trouvé'
      });
    }

    const profile = await queryOne(
      'SELECT * FROM mover_profiles WHERE user_id = $1',
      [demenageur.id]
    );
    const location = await queryOne(
      'SELECT * FROM user_locations WHERE user_id = $1',
      [demenageur.id]
    );

    res.json({
      success: true,
      data: {
        id: demenageur.id,
        first_name: demenageur.first_name,
        last_name: demenageur.last_name,
        email: demenageur.email,
        phone: demenageur.phone,
        address: demenageur.address,
        latitude: location ? parseFloat(location.lat) : null,
        longitude: location ? parseFloat(location.lng) : null,
        status: demenageur.status,
        company_name: profile ? (profile.company_name || null) : null,
        description: profile ? (profile.bio || null) : null,
        rating: profile && profile.rating != null ? parseFloat(profile.rating) : 0,
        total_reviews: profile && profile.total_reviews != null ? parseInt(profile.total_reviews) : 0,
        experience_years: profile && profile.experience_years != null ? parseInt(profile.experience_years) : 0,
        services_offered: profile ? (Array.isArray(profile.services_offered) ? profile.services_offered : []) : [],
        equipment_available: profile ? (Array.isArray(profile.equipment_available) ? profile.equipment_available : []) : [],
        insurance_coverage: profile ? (profile.insurance_coverage || false) : false,
        is_verified: demenageur.is_verified || false, // is_verified est dans la table users
        location: location ? {
          lat: parseFloat(location.lat),
          lng: parseFloat(location.lng),
          address: location.address || null,
          city: location.city || null,
          country: location.country || null
        } : null
      }
    });
  } catch (error) {
    console.error('❌ Erreur dans /api/demenageurs/:id:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du déménageur',
      error: error.message
    });
  }
});

module.exports = router;
