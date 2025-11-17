import React, { useContext, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ClientNotificationContext } from '../../components/ClientNotificationProvider';
import { useTutorialRefs } from '../../hooks/useTutorialRefs';
import { useNavigationTutorial } from '../../hooks/useNavigationTutorial';

const NotificationScreen = () => {
  const notificationContext = useContext(ClientNotificationContext);
  
  // Refs pour le tutoriel
  const notificationsListRef = useRef(null);
  const clearButtonRef = useRef(null);
  
  // Enregistrer les refs pour le tutoriel
  const tutorialRefs = {
    notificationsList: notificationsListRef,
    clearButton: clearButtonRef,
  };
  
  useNavigationTutorial('Notification', tutorialRefs);

  const notifications = notificationContext?.notifications || [];
  const clearNotifications = notificationContext?.clearNotifications || (() => {});
  const removeNotification = notificationContext?.removeNotification;
  const markNotificationAsRead = notificationContext?.markNotificationAsRead;
  const markAllNotificationsAsRead = notificationContext?.markAllNotificationsAsRead;
  const refreshNotifications = notificationContext?.refreshNotifications;
  const isLoadingNotifications = notificationContext?.isLoadingNotifications;

  const hasNotifications = notifications.length > 0;
  const sortedNotifications = useMemo(() => [...notifications], [notifications]);

  const handleClearAll = () => {
    if (!hasNotifications) {
      return;
    }

    if (markAllNotificationsAsRead) {
      markAllNotificationsAsRead();
    }

    clearNotifications();
  };

  const handleRefresh = () => {
    refreshNotifications?.();
  };

  const formatDate = (dateString) => {
    if (!dateString) {
      return 'Date inconnue';
    }

    try {
      const date = new Date(dateString);
      return date.toLocaleString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Date inconnue';
    }
  };

  const getVisualsForType = (type) => {
    switch (type) {
      case 'price_proposed':
        return { icon: 'cash-outline', color: '#28a745' };
      case 'negotiation_accepted':
        return { icon: 'hand-right-outline', color: '#ffc107' };
      case 'status_updated':
        return { icon: 'repeat-outline', color: '#17a2b8' };
      case 'chat_message':
        return { icon: 'chatbubble-ellipses-outline', color: '#ff6b35' };
      default:
        return { icon: 'notifications-outline', color: '#ff6b35' };
    }
  };

  const renderPriceDetails = (notification) => {
    const proposedPrice = notification?.payload?.proposedPrice;
    const demenageurName = notification?.payload?.demenageurName;

    if (!proposedPrice && !demenageurName) {
      return null;
    }

    return (
      <View style={styles.detailsContainer}>
        {demenageurName ? (
          <View style={styles.detailRow}>
            <Ionicons name="person-circle-outline" size={16} color="#ff6b35" />
            <Text style={styles.detailText}>Déménageur: {demenageurName}</Text>
          </View>
        ) : null}
        {proposedPrice ? (
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color="#ff6b35" />
            <Text style={styles.detailText}>Prix proposé: {proposedPrice} TND</Text>
          </View>
        ) : null}
      </View>
    );
  };

  const renderNegotiationDetails = (notification) => {
    const clientPrice = notification?.payload?.clientPrice;
    const proposedPrice = notification?.payload?.proposedPrice;

    if (!clientPrice && !proposedPrice) {
      return null;
    }

    return (
      <View style={styles.detailsContainer}>
        {clientPrice ? (
          <View style={styles.detailRow}>
            <Ionicons name="pricetag-outline" size={16} color="#ff6b35" />
            <Text style={styles.detailText}>Prix accepté: {clientPrice} TND</Text>
          </View>
        ) : null}
        {proposedPrice ? (
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color="#ff6b35" />
            <Text style={styles.detailText}>Prix proposé initial: {proposedPrice} TND</Text>
          </View>
        ) : null}
      </View>
    );
  };

  const renderStatusDetails = (notification) => {
    const newStatus = notification?.payload?.newStatus;
    const missionMessage = notification?.message;

    if (!newStatus && !missionMessage) {
      return null;
    }

    return (
      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Ionicons name="ellipse-outline" size={16} color="#ff6b35" />
          <Text style={styles.detailText}>Nouveau statut: {newStatus}</Text>
        </View>
        {missionMessage ? (
          <View style={styles.detailRow}>
            <Ionicons name="information-circle-outline" size={16} color="#ff6b35" />
            <Text style={styles.detailText}>{missionMessage}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  const renderChatDetails = (notification) => {
    const senderName = notification?.payload?.senderName;
    const messageContent = notification?.payload?.messageContent || notification?.message;

    if (!senderName && !messageContent) {
      return null;
    }

    return (
      <View style={styles.detailsContainer}>
        {senderName ? (
          <View style={styles.detailRow}>
            <Ionicons name="person-circle-outline" size={16} color="#ff6b35" />
            <Text style={styles.detailText}>Expéditeur: {senderName}</Text>
          </View>
        ) : null}
        {messageContent ? (
          <View style={styles.detailRow}>
            <Ionicons name="chatbubbles-outline" size={16} color="#ff6b35" />
            <Text style={styles.detailText}>{messageContent}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  const renderNotificationDetails = (notification) => {
    switch (notification?.type) {
      case 'price_proposed':
        return renderPriceDetails(notification);
      case 'negotiation_accepted':
        return renderNegotiationDetails(notification);
      case 'status_updated':
        return renderStatusDetails(notification);
      case 'chat_message':
        return renderChatDetails(notification);
      default:
        return null;
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Notifications</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} disabled={isLoadingNotifications}>
            <Ionicons name="reload" size={18} color={isLoadingNotifications ? '#8e8e93' : '#ff6b35'} />
          </TouchableOpacity>
          {hasNotifications && (
            <TouchableOpacity 
              ref={clearButtonRef}
              style={styles.clearButton} 
              onPress={handleClearAll}
            >
              <Ionicons name="trash-outline" size={18} color="#ff6b35" />
              <Text style={styles.clearButtonText}>Effacer tout</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoadingNotifications && (
        <View style={styles.loadingBanner}>
          <Text style={styles.loadingText}>Chargement des notifications...</Text>
        </View>
      )}

      {!hasNotifications ? (
        <View style={styles.emptyState}>
          <Ionicons name="notifications-off-outline" size={48} color="#8e8e93" />
          <Text style={styles.emptyTitle}>Aucune notification</Text>
          <Text style={styles.emptyText}>
            Vous n'avez pas encore reçu de notification.
          </Text>
        </View>
      ) : (
        <ScrollView 
          ref={notificationsListRef}
          contentContainerStyle={styles.listContent} 
          showsVerticalScrollIndicator={false}
        >
          {sortedNotifications.map((notification) => {
            const visuals = getVisualsForType(notification?.type);

            return (
              <View key={notification.id} style={styles.notificationCard}>
                <View style={styles.notificationHeader}>
                  <View style={[styles.iconWrapper, { backgroundColor: `${visuals.color}20` }]}> 
                    <Ionicons name={visuals.icon} size={20} color={visuals.color} />
                  </View>
                  <View style={styles.headerTextContainer}>
                    <Text style={styles.notificationTitle} numberOfLines={2}>
                      {notification.title || 'Notification'}
                    </Text>
                    <Text style={styles.notificationDate}>{formatDate(notification.receivedAt)}</Text>
                  </View>

                  {removeNotification ? (
                    <TouchableOpacity
                      style={styles.dismissButton}
                      onPress={() => {
                        if (notification.recordId && markNotificationAsRead) {
                          markNotificationAsRead(notification.recordId);
                        }
                        removeNotification(notification.id);
                      }}
                    >
                      <Ionicons name="close-circle-outline" size={18} color="#8e8e93" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {notification.message ? (
                  <Text style={styles.notificationMessage}>{notification.message}</Text>
                ) : null}

                {renderNotificationDetails(notification)}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#1a0d2e',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  clearButtonText: {
    color: '#ff6b35',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingBanner: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  loadingText: {
    color: '#ff6b35',
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#c7c7cc',
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 40,
  },
  notificationCard: {
    backgroundColor: '#2d1b4e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#ff6b35',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  notificationTitle: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
  },
  notificationDate: {
    color: '#b3b3b3',
    fontSize: 12,
  },
  dismissButton: {
    marginLeft: 8,
    padding: 4,
  },
  notificationMessage: {
    color: '#e8e8ff',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  detailsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#3c255d',
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    color: '#d6c9ff',
    fontSize: 13,
    flex: 1,
  },
});

export default NotificationScreen;

