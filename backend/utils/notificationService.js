const { queryOne } = require('./dbHelpers');

const mapToJson = (value, fallback = {}) => {
  if (!value) {
    return fallback;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  return value;
};

const createNotification = async ({
  userId,
  title,
  message,
  type,
  data = {},
  metadata = {},
  priority = 'medium',
  status = 'sent',
  io = null, // Socket.IO instance optionnelle
}) => {
  if (!userId || !title || !message || !type) {
    throw new Error('Missing required notification fields');
  }

  const notification = await queryOne(
    `INSERT INTO notifications (user_id, title, message, type, data, metadata, priority, status)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8)
     RETURNING *`,
    [
      userId,
      title,
      message,
      type,
      JSON.stringify(data || {}),
      JSON.stringify(metadata || {}),
      priority,
      status,
    ]
  );

  // Envoyer la notification en temps réel via WebSocket si disponible
  if (io && notification) {
    try {
      const roomName = `user_${userId}`;
      console.log(`📤 Envoi notification en temps réel à ${roomName}:`, {
        id: notification.id,
        type: notification.type,
        title: notification.title
      });
      
      // Émettre l'événement selon le type de notification
      io.to(roomName).emit('notification', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: mapToJson(notification.data, {}),
        metadata: mapToJson(notification.metadata, {}),
        priority: notification.priority,
        createdAt: notification.created_at,
        receivedAt: new Date().toISOString(),
      });
      
      // Émettre aussi des événements spécifiques selon le type
      switch (type) {
        case 'price_proposed':
          io.to(roomName).emit('price_proposed', {
            ...mapToJson(notification.data, {}),
            notificationId: notification.id,
          });
          break;
        case 'negotiation_accepted':
          io.to(roomName).emit('negotiation_accepted', {
            ...mapToJson(notification.data, {}),
            notificationId: notification.id,
          });
          break;
        case 'status_updated':
          io.to(roomName).emit('status_updated', {
            ...mapToJson(notification.data, {}),
            notificationId: notification.id,
          });
          break;
        case 'chat_message':
          io.to(roomName).emit('chat_message_notification', {
            ...mapToJson(notification.data, {}),
            notificationId: notification.id,
          });
          break;
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi de la notification WebSocket:', error);
      // Ne pas faire échouer la création de la notification si l'envoi WebSocket échoue
    }
  }

  return notification;
};

module.exports = {
  createNotification,
  mapToJson,
};

