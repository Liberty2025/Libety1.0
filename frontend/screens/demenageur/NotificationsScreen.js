import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const formatDateTime = (dateString) => {
  if (!dateString) return 'Date inconnue';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    return 'Date inconnue';
  }
};

const humanizeLabel = (label) => {
  if (!label) return '';
  return label
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());
};

const renderNotificationCard = (notification, onRemove) => {
  const subtitle = notification.message || notification.payload?.message || '';
  const serviceTypeLabel = notification.serviceType || notification.payload?.serviceType || notification.payload?.serviceDetails?.serviceType;
  
  // Extraire les informations du payload si disponibles
  const payload = notification.payload || {};
  const clientName = notification.clientName || payload.clientName || payload.clientId?.first_name || payload.clientId?.firstName || '';
  const departureAddress = notification.departureAddress || payload.departureAddress || '';
  const destinationAddress = notification.destinationAddress || payload.destinationAddress || '';
  const estimatedPrice = notification.estimatedPrice || payload.estimatedPrice || payload.acceptedPrice || payload.clientPrice || null;

  return (
    <View key={notification.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconWrapper}>
          <Ionicons name="notifications" size={22} color="#ff6b35" />
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.cardTitle}>
            {notification.title || clientName || 'Notification'}
            {notification.isRead && (
              <Text style={styles.readIndicator}> (Lue)</Text>
            )}
          </Text>
          <Text style={styles.cardDate}>{formatDateTime(notification.receivedAt || notification.createdAt || notification.payload?.createdAt)}</Text>
        </View>
        {onRemove && (
          <TouchableOpacity style={styles.dismissButton} onPress={() => onRemove(notification)}>
            <Ionicons name="close-circle-outline" size={20} color="#8e8e93" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.cardBody}>
        {subtitle ? <Text style={styles.cardMessage}>{subtitle}</Text> : null}

        {serviceTypeLabel ? (
          <>
            <Text style={styles.label}>Type de service</Text>
            <Text style={styles.value}>
              {serviceTypeLabel === 'demenagement' ? 'Déménagement' : serviceTypeLabel === 'transport' ? 'Transport' : humanizeLabel(serviceTypeLabel)}
            </Text>
          </>
        ) : null}

        {departureAddress ? (
          <View style={styles.inlineRow}>
            <Ionicons name="navigate-outline" size={16} color="#ff6b35" />
            <Text style={styles.inlineText}>{departureAddress}</Text>
          </View>
        ) : null}

        {destinationAddress ? (
          <View style={styles.inlineRow}>
            <Ionicons name="flag-outline" size={16} color="#ff6b35" />
            <Text style={styles.inlineText}>{destinationAddress}</Text>
          </View>
        ) : null}

        {estimatedPrice ? (
          <View style={styles.inlineRow}>
            <Ionicons name="cash-outline" size={16} color="#ff6b35" />
            <Text style={styles.inlineText}>
              {estimatedPrice} TND
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const DemenageurNotificationsScreen = ({
  notifications = [],
  onRemove,
  onClearAll,
  onRefresh,
  isRefreshing,
  connectionStatus,
}) => {
  const hasNotifications = notifications.length > 0;

  // Log pour déboguer les mises à jour
  useEffect(() => {
    console.log('📋 NotificationsScreen - Nombre de notifications:', notifications.length);
    if (notifications.length > 0) {
      console.log('📋 Première notification:', {
        id: notifications[0].id,
        type: notifications[0].type,
        title: notifications[0].title,
        receivedAt: notifications[0].receivedAt,
      });
    }
  }, [notifications]);

  const connectionLabel = (() => {
    switch (connectionStatus) {
      case 'connected':
        return { text: 'Connecté', color: '#2ecc71' };
      case 'connecting':
        return { text: 'Connexion…', color: '#f1c40f' };
      case 'error':
        return { text: 'Erreur', color: '#e74c3c' };
      default:
        return { text: 'Déconnecté', color: '#bdc3c7' };
    }
  })();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>Restez informé des nouvelles demandes</Text>
        </View>
        <View style={styles.statusBadge}>
          <View style={[styles.statusIndicator, { backgroundColor: connectionLabel.color }]} />
          <Text style={[styles.statusText, { color: connectionLabel.color }]}>{connectionLabel.text}</Text>
        </View>
      </View>

      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh} disabled={isRefreshing}>
          <Ionicons name="reload" size={18} color={isRefreshing ? '#8e8e93' : '#ff6b35'} />
        </TouchableOpacity>

        {hasNotifications && onClearAll && (
          <TouchableOpacity style={styles.clearButton} onPress={onClearAll}>
            <Ionicons name="checkmark-done-outline" size={18} color="#ff6b35" />
            <Text style={styles.clearButtonText}>Tout marquer comme lu</Text>
          </TouchableOpacity>
        )}
      </View>

      {!hasNotifications ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="notifications-off-outline" size={56} color="#ff6b35" />
          </View>
          <Text style={styles.emptyTitle}>Pas de notifications pour le moment</Text>
          <Text style={styles.emptyText}>Vous serez alerté dès qu’une nouvelle demande arrivera ou qu’un client réagira.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {notifications.map((notification) => renderNotificationCard(notification, onRemove))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#120824',
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 20,
    backgroundColor: 'rgba(255, 107, 53, 0.18)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    gap: 6,
  },
  clearButtonText: {
    color: '#ff6b35',
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyIconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 22,
  },
  listContent: {
    paddingBottom: 80,
    gap: 18,
    paddingTop: 24,
  },
  card: {
    backgroundColor: '#1d0f33',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.25)',
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 107, 53, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  headerContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  dismissButton: {
    padding: 6,
  },
  cardBody: {
    gap: 12,
  },
  cardMessage: {
    fontSize: 15,
    color: '#f6f1ff',
    lineHeight: 22,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: {
    fontSize: 16,
    color: '#ffffff',
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inlineText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
    lineHeight: 20,
  },
  readIndicator: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
    fontWeight: 'normal',
  },
});

export default DemenageurNotificationsScreen;
