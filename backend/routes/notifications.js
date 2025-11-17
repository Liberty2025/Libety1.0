const express = require('express');
const router = express.Router();
const { queryMany, queryOne, query } = require('../utils/dbHelpers');
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token d\'accès requis',
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'liberty_mobile_secret_key', (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Token invalide',
      });
    }
    req.user = user;
    next();
  });
};

const extractUserId = (req) => req.user?.userId || req.user?.id;

let notificationsSchemaEnsured = false;
const ensureNotificationsSchema = async () => {
  if (notificationsSchemaEnsured) {
    return;
  }

  try {
    await query(
      `ALTER TABLE notifications
       ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`
    );
    notificationsSchemaEnsured = true;
  } catch (error) {
    console.error('❌ Erreur lors de la vérification du schéma notifications:', error.message || error);
  }
};

router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = extractUserId(req);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Utilisateur introuvable dans le token' });
    }

    // Augmenter la limite pour charger plus de notifications
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);

    // Charger TOUTES les notifications (lues et non lues) pour l'historique
    const notifications = await queryMany(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    
    console.log(`📋 Notifications récupérées pour l'utilisateur ${userId}: ${notifications.length}`);

    res.json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des notifications:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    await ensureNotificationsSchema();

    const notificationId = parseInt(req.params.id, 10);
    if (Number.isNaN(notificationId)) {
      return res.status(400).json({ success: false, message: 'Identifiant de notification invalide' });
    }

    const userId = extractUserId(req);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Utilisateur introuvable dans le token' });
    }

    const notification = await queryOne(
      `UPDATE notifications
       SET is_read = TRUE, read_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [notificationId, userId]
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification introuvable' });
    }

    res.json({ success: true, notification });
  } catch (error) {
    console.error('❌ Erreur lors du marquage de la notification comme lue:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

router.put('/mark-all/read', authenticateToken, async (req, res) => {
  try {
    await ensureNotificationsSchema();

    const userId = extractUserId(req);
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Utilisateur introuvable dans le token' });
    }

    await queryOne(
      `UPDATE notifications
       SET is_read = TRUE, read_at = NOW(), updated_at = NOW()
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Erreur lors du marquage des notifications:', error);
    res.status(500).json({ success: false, message: 'Erreur interne du serveur' });
  }
});

module.exports = router;

