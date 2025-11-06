const express = require('express');
const router = express.Router();
const ServiceRequest = require('../models/ServiceRequest');
const User = require('../models/User');

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token d\'authentification requis' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'liberty_mobile_secret_key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Token invalide' });
  }
};

// Récupérer les statistiques d'un déménageur
router.get('/demenageur', authenticateToken, async (req, res) => {
  try {
    const demenageurId = req.user.userId;

    // Vérifier que l'utilisateur est un déménageur
    const demenageur = await User.findById(demenageurId);
    if (!demenageur || demenageur.role !== 'demenageur') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Récupérer toutes les missions du déménageur
    const missions = await ServiceRequest.find({ demenageurId })
      .populate('clientId', 'first_name last_name')
      .sort({ createdAt: -1 });

    // Calculer les statistiques
    const totalMissions = missions.length;
    const completedMissions = missions.filter(m => m.status === 'completed').length;
    const cancelledMissions = missions.filter(m => m.status === 'cancelled').length;
    const pendingMissions = missions.filter(m => m.status === 'pending').length;
    const acceptedMissions = missions.filter(m => m.status === 'accepted').length;
    const inProgressMissions = missions.filter(m => m.status === 'in_progress').length;

    // Calculer les gains totaux
    const totalEarnings = missions
      .filter(m => m.actualPrice && m.status === 'completed')
      .reduce((sum, m) => sum + m.actualPrice, 0);

    // Calculer le taux de completion
    const completionRate = totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 0;

    // Calculer le temps de réponse moyen (en heures)
    let averageResponseTime = 'N/A';
    if (missions.length > 0) {
      const responseTimes = missions
        .filter(m => m.createdAt && m.updatedAt)
        .map(m => {
          const responseTime = new Date(m.updatedAt) - new Date(m.createdAt);
          return responseTime / (1000 * 60 * 60); // Convertir en heures
        });
      
      if (responseTimes.length > 0) {
        const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        averageResponseTime = avgResponseTime < 1 
          ? `${Math.round(avgResponseTime * 60)} min`
          : `${Math.round(avgResponseTime)}h`;
      }
    }

    // Statistiques par mois (derniers 6 mois)
    const monthlyStats = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthMissions = missions.filter(m => {
        const missionDate = new Date(m.createdAt);
        return missionDate >= monthStart && missionDate <= monthEnd;
      });
      
      const monthEarnings = monthMissions
        .filter(m => m.actualPrice && m.status === 'completed')
        .reduce((sum, m) => sum + m.actualPrice, 0);
      
      monthlyStats.push({
        month: date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
        missions: monthMissions.length,
        earnings: monthEarnings
      });
    }

    // Missions récentes (dernières 5)
    const recentMissions = missions.slice(0, 5).map(mission => ({
      id: mission._id,
      clientName: mission.clientId ? `${mission.clientId.first_name} ${mission.clientId.last_name}` : 'Client inconnu',
      serviceType: mission.serviceType,
      status: mission.status,
      actualPrice: mission.actualPrice,
      createdAt: mission.createdAt,
      departureAddress: mission.departureAddress,
      destinationAddress: mission.destinationAddress
    }));

    const statistics = {
      totalMissions,
      completedMissions,
      cancelledMissions,
      pendingMissions,
      acceptedMissions,
      inProgressMissions,
      totalEarnings,
      completionRate,
      averageResponseTime,
      monthlyStats,
      recentMissions
    };

    res.status(200).json({
      success: true,
      statistics
    });

  } catch (error) {
    console.error('Erreur lors du chargement des statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur'
    });
  }
});

module.exports = router;
