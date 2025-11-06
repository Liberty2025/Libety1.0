import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useRealtimeChat from '../../hooks/useRealtimeChat';
import { getAPIBaseURL } from '../../config/api';

const ClientChatScreen = ({ authToken, userData }) => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef(null);

  // Utiliser la configuration API centralisée
  const API_BASE_URL = getAPIBaseURL();

  // Hook pour le chat en temps réel - utiliser l'ID utilisateur réel
  const { 
    isConnected, 
    sendMessage: sendRealtimeMessage, 
    markMessagesAsRead: markRealtimeRead,
    joinChat,
    leaveChat,
    getNewMessages,
    newMessagesCount
  } = useRealtimeChat(authToken, userData?.id || userData?._id);

  // Traiter les nouveaux messages en temps réel
  useEffect(() => {
    const newMessages = getNewMessages();
    console.log('🔄 Vérification des nouveaux messages:', {
      newMessagesCount: newMessages.length,
      selectedChat: selectedChat?._id,
      isConnected
    });
    
    if (newMessages.length > 0) {
      console.log('📨 Nouveaux messages reçus:', newMessages);
      console.log('📨 Messages détaillés:', newMessages.map(msg => ({
        type: msg.type,
        chatId: msg.chatId,
        content: msg.message?.content,
        senderType: msg.message?.senderType,
        messageId: msg.message?._id
      })));
      
      // Mettre à jour les messages si on est dans le bon chat
      if (selectedChat) {
        console.log('📨 Messages à ajouter:', newMessages.map(msg => ({
          chatId: msg.chatId,
          content: msg.message?.content,
          senderType: msg.message?.senderType,
          messageId: msg.message?._id
        })));
        
        setMessages(prev => {
          const updatedMessages = [...prev, ...newMessages.map(msg => msg.message)];
          console.log('📨 Messages mis à jour:', updatedMessages.length);
          return updatedMessages;
        });
        
        // Scroll vers le bas
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
      
      // Mettre à jour la liste des chats pour refléter les nouveaux messages
      console.log('🔄 Appel de updateChatsList avec:', newMessages.length, 'messages');
      updateChatsList(newMessages);
      
      // Gérer les nouveaux chats créés
      const newChats = newMessages.filter(msg => msg.type === 'chat_created');
      if (newChats.length > 0) {
        console.log('💬 Nouveaux chats créés:', newChats);
        // Recharger la liste des chats pour inclure les nouveaux
        loadChats();
      }
    }
  }, [newMessagesCount, selectedChat]);

  useEffect(() => {
    if (isConnected) {
      loadChats();
      console.log('🔌 État de connexion WebSocket:', {
        isConnected,
        userId: userData?.id || userData?._id,
        hasToken: !!authToken
      });
    }
  }, [isConnected]);


  // Debug pour voir l'état des chats
  useEffect(() => {
    console.log('📊 État actuel des chats:', {
      chatsCount: chats.length,
      chats: chats.map(chat => ({
        id: chat._id,
        lastMessage: chat.lastMessage?.content,
        lastMessageAt: chat.lastMessageAt,
        unreadByClient: chat.unreadByClient
      }))
    });
  }, [chats]);

  // Fonction pour mettre à jour la liste des chats avec les nouveaux messages
  const updateChatsList = (newMessages) => {
    console.log('🔄 updateChatsList appelé avec:', newMessages.length, 'messages');
    
    // Filtrer seulement les messages normaux (pas les événements de chat créé)
    const normalMessages = newMessages.filter(msg => msg.type !== 'chat_created');
    console.log('🔄 Messages normaux filtrés:', normalMessages.length);
    
    if (normalMessages.length === 0) {
      console.log('🔄 Aucun message normal à traiter');
      return;
    }
    
    setChats(prevChats => {
      console.log('🔄 Chats actuels:', prevChats.length);
      
      const updatedChats = prevChats.map(chat => {
        // Trouver les messages pour ce chat
        const chatMessages = normalMessages.filter(msg => msg.chatId === chat._id);
        
        if (chatMessages.length > 0) {
          // Mettre à jour le dernier message et les compteurs
          const latestMessage = chatMessages[chatMessages.length - 1];
          console.log('🔄 Mise à jour du chat:', chat._id, 'avec le message:', latestMessage.message?.content);
          
          return {
            ...chat,
            lastMessage: latestMessage.message,
            lastMessageAt: latestMessage.message.createdAt,
            unreadByClient: latestMessage.message.senderType === 'demenageur' 
              ? (chat.unreadByClient || 0) + 1 
              : chat.unreadByClient || 0
          };
        }
        
        return chat;
      });
      
      // Trier par date du dernier message (plus récent en premier)
      const sortedChats = updatedChats.sort((a, b) => 
        new Date(b.lastMessageAt || b.createdAt) - new Date(a.lastMessageAt || a.createdAt)
      );
      
      console.log('📋 Liste des chats mise à jour:', sortedChats.length, 'chats');
      return sortedChats;
    });
  };

  const loadChats = async () => {
    console.log('📋 Chargement de la liste des chats...');
    console.log('🌐 URL utilisée:', `${API_BASE_URL}/api/chat/my-chats`);
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/chat/my-chats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 Réponse reçue:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur HTTP:', response.status, errorText);
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      // Vérifier que la réponse est bien JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('❌ Réponse non-JSON reçue pour les chats:', {
          status: response.status,
          contentType: contentType,
          url: response.url
        });
        throw new Error(`Réponse non-JSON reçue (${response.status}): ${contentType}`);
      }

      const result = await response.json();
      console.log('📋 Résultat:', result);
      
      if (result.success) {
        console.log('✅ Chats chargés avec succès:', result.chats?.length || 0, 'chats');
        // Transformer les données pour correspondre au format attendu par le frontend
        const transformedChats = (result.chats || []).map(chat => ({
          _id: chat.id || chat._id,
          demenageurId: {
            _id: chat.demenageur_id, // Colonne de la table chats
            first_name: chat.demenageur_first_name, // Alias du JOIN
            last_name: chat.demenageur_last_name, // Alias du JOIN
            email: null, // Non retourné par la requête actuelle
            phone: null, // Non retourné par la requête actuelle
            is_verified: false // Non retourné par la requête actuelle
          },
          serviceRequestId: {
            _id: chat.service_request_id, // Colonne de la table chats
            serviceType: chat.service_type, // Alias du JOIN
            departureAddress: chat.departure_address // Alias du JOIN
          },
          lastMessage: chat.lastMessage ? {
            _id: chat.lastMessage.id || null,
            content: chat.lastMessage.content,
            createdAt: chat.lastMessage.createdAt || chat.lastMessage.created_at,
            senderType: chat.lastMessage.senderType || chat.lastMessage.sender_type
          } : null,
          lastMessageAt: chat.last_message_at || chat.lastMessageAt || chat.created_at,
          unreadByClient: chat.unread_by_client || chat.unreadByClient || 0,
          createdAt: chat.created_at || chat.createdAt
        }));
        console.log('📋 Chats transformés:', transformedChats.length);
        setChats(transformedChats);
      } else {
        console.error('❌ Erreur lors du chargement des chats:', result.message);
        Alert.alert('Erreur', result.message || 'Erreur lors du chargement des conversations');
      }
    } catch (error) {
      console.error('❌ Erreur de connexion:', error);
      console.error('❌ Détails:', error.message);
      Alert.alert('Erreur', `Erreur de connexion au serveur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chatId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/${chatId}/messages`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Vérifier que la réponse est bien JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('❌ Réponse non-JSON reçue pour les messages:', {
          status: response.status,
          contentType: contentType,
          url: response.url
        });
        throw new Error(`Réponse non-JSON reçue (${response.status}): ${contentType}`);
      }

      const result = await response.json();
      if (result.success) {
        setMessages(result.messages);
        // Marquer les messages comme lus
        await markMessagesAsRead(chatId);
      } else {
        console.error('Erreur lors du chargement des messages:', result.message);
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
    }
  };

  const markMessagesAsRead = async (chatId) => {
    try {
      await fetch(`${API_BASE_URL}/api/chat/${chatId}/mark-read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Erreur lors du marquage des messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    // Envoyer via WebSocket en temps réel
    if (isConnected) {
      sendRealtimeMessage(selectedChat._id, newMessage.trim());
      setNewMessage('');
      
      // Scroll vers le bas
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } else {
      // Fallback vers l'API REST
      try {
        const response = await fetch(`${API_BASE_URL}/api/chat/${selectedChat._id}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: newMessage.trim(),
            messageType: 'text'
          }),
        });

        const result = await response.json();
        if (result.success) {
          setMessages([...messages, result.data]);
          setNewMessage('');
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        } else {
          Alert.alert('Erreur', result.message);
        }
      } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
        Alert.alert('Erreur', 'Impossible d\'envoyer le message');
      }
    }
  };

  const selectChat = (chat) => {
    // Quitter le chat précédent si il y en a un
    if (selectedChat) {
      leaveChat(selectedChat._id);
    }
    
    setSelectedChat(chat);
    loadMessages(chat._id);
    
    // Rejoindre le nouveau chat en temps réel
    if (isConnected) {
      joinChat(chat._id);
    }
  };

  const getServiceIcon = (serviceType) => {
    if (!serviceType) return 'business';
    switch (serviceType) {
      case 'demenagement':
        return 'home';
      case 'transport':
        return 'car';
      default:
        return 'business';
    }
  };

  const getServiceDotColor = (serviceType) => {
    if (!serviceType) return '#FF9800';
    switch (serviceType) {
      case 'demenagement':
        return '#4CAF50'; // Vert pour déménagement
      case 'transport':
        return '#2196F3'; // Bleu pour transport
      default:
        return '#FF9800'; // Orange pour autres
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Aujourd\'hui';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    } else {
      return date.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  };

  if (selectedChat) {
    return (
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* En-tête de conversation */}
        <View style={styles.conversationHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setSelectedChat(null)}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <View style={styles.conversationInfo}>
            <View style={styles.avatar}>
              <Ionicons 
                name={getServiceIcon(selectedChat.serviceRequestId?.serviceType)} 
                size={24} 
                color="#ffffff" 
              />
            </View>
            <View style={styles.conversationDetails}>
              <Text style={styles.conversationName}>
                {selectedChat.demenageurId.first_name} {selectedChat.demenageurId.last_name}
              </Text>
              <Text style={styles.serviceType}>
                {selectedChat.serviceRequestId?.serviceType || 'Service'}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-vertical" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer} 
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((message) => (
            <View 
              key={message._id} 
              style={[
                styles.messageContainer,
                message.senderType === 'client' ? styles.messageRight : styles.messageLeft
              ]}
            >
              <View style={[
                styles.messageBubble,
                message.senderType === 'client' ? styles.messageBubbleRight : styles.messageBubbleLeft
              ]}>
                <Text style={[
                  styles.messageText,
                  message.senderType === 'client' ? styles.messageTextRight : styles.messageTextLeft
                ]}>
                  {message.content}
                </Text>
                <Text style={[
                  styles.messageTime,
                  message.senderType === 'client' ? styles.messageTimeRight : styles.messageTimeLeft
                ]}>
                  {formatTime(message.createdAt)}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Input de message */}
        <View style={styles.messageInputContainer}>
          <TextInput
            style={styles.messageInput}
            placeholder="Tapez votre message..."
            placeholderTextColor="#8e8e93"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity 
            style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!newMessage.trim()}
          >
            <Ionicons name="send" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Liste des conversations */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Chargement des conversations...</Text>
        </View>
      ) : (
        <ScrollView style={styles.conversationsList} showsVerticalScrollIndicator={false}>
          <View style={styles.timelineLine} />
          <View style={styles.timelineContainer}>
            {chats.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color="#8e8e93" />
                <Text style={styles.emptyText}>Aucune conversation</Text>
                <Text style={styles.emptySubtext}>
                  Vos conversations avec les déménageurs apparaîtront ici une fois vos demandes acceptées.
                </Text>
              </View>
            ) : (
              chats.map((chat) => (
              <TouchableOpacity 
                key={chat._id}
                style={styles.conversationItem}
                onPress={() => selectChat(chat)}
              >
                <View style={styles.timelineDot} />
                {chat.unreadByClient > 0 && <View style={styles.unreadIndicator} />}
                
                <View style={styles.conversationContent}>
                  <View style={styles.conversationHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                      <Text style={styles.conversationName}>
                        {chat.demenageurId.first_name} {chat.demenageurId.last_name}
                      </Text>
                      {chat.demenageurId.is_verified && (
                        <Ionicons 
                          name="checkmark-circle" 
                          size={16} 
                          color="#4CAF50" 
                          style={styles.verifiedIcon}
                        />
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.conversationFooter}>
                    <Text 
                      style={[
                        styles.lastMessage,
                        chat.unreadByClient > 0 && styles.lastMessageUnread
                      ]}
                      numberOfLines={3}
                    >
                      {chat.lastMessage ? chat.lastMessage.content : 'Nouvelle conversation'}
                    </Text>
                    {chat.unreadByClient > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{chat.unreadByClient}</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.serviceInfo}>
                    <View style={[styles.serviceDot, { backgroundColor: getServiceDotColor(chat.serviceRequestId?.serviceType) }]} />
                    <Text>
                      {chat.serviceRequestId?.serviceType || 'Service'} • {chat.serviceRequestId?.departureAddress || 'Adresse non disponible'}
                    </Text>
                  </View>
                  
                  <Text style={styles.conversationTime}>
                    {chat.lastMessage ? formatTime(chat.lastMessage.createdAt) : ''}
                  </Text>
                  <Text style={styles.conversationDate}>
                    {chat.lastMessage ? formatDate(chat.lastMessage.createdAt) : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2d1b4e', // Violet foncé
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#8e8e93',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  conversationsList: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  timelineContainer: {
    flex: 1,
    paddingLeft: 30,
  },
  timelineLine: {
    position: 'absolute',
    left: 20,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#FFD700', // Ligne fine jaune
  },
  conversationItem: {
    backgroundColor: '#ff6b35', // Orange pour les bulles
    borderRadius: 20,
    padding: 15,
    marginBottom: 20,
    marginLeft: 0,
    marginRight: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 6,
    position: 'relative',
    minHeight: 80,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    backgroundColor: '#ff6b35',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  conversationContent: {
    flex: 1,
    marginLeft: 0,
    paddingRight: 80, // Espace pour l'heure et la date
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Montserrat-Bold' : 'Montserrat-Bold',
    flexDirection: 'row',
    alignItems: 'center',
  },
  conversationTime: {
    fontSize: 12,
    color: '#E0E0E0', // Gris clair
    fontFamily: Platform.OS === 'ios' ? 'Montserrat-Regular' : 'Montserrat-Regular',
    position: 'absolute',
    right: 15,
    top: 15,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#ffffff',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Montserrat-Regular' : 'Montserrat-Regular',
    opacity: 0.9,
  },
  lastMessageUnread: {
    color: '#ffffff',
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: '#FF5722', // Orange vif
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  unreadText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  unreadIndicator: {
    position: 'absolute',
    left: -5,
    top: -5,
    right: -5,
    bottom: -5,
    backgroundColor: '#FFD700', // Halo jaune
    borderRadius: 20,
    opacity: 0.3,
    zIndex: -1,
  },
  serviceInfo: {
    fontSize: 12,
    color: '#ffffff',
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'Montserrat-Regular' : 'Montserrat-Regular',
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  verifiedIcon: {
    marginLeft: 5,
  },
  timelineDot: {
    position: 'absolute',
    left: -35,
    top: 20,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff6b35',
    borderWidth: 3,
    borderColor: '#2d1b4e',
    zIndex: 1,
  },
  conversationDate: {
    fontSize: 10,
    color: '#B0B0B0', // Gris plus clair pour la date
    fontFamily: Platform.OS === 'ios' ? 'Montserrat-Regular' : 'Montserrat-Regular',
    position: 'absolute',
    right: 15,
    top: 30,
  },
  conversationHeader: {
    backgroundColor: '#ff6b35',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 15,
  },
  conversationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  conversationDetails: {
    marginLeft: 15,
  },
  conversationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  serviceType: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
    marginTop: 2,
  },
  moreButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1a0d2e',
  },
  messageContainer: {
    marginVertical: 5,
  },
  messageLeft: {
    alignItems: 'flex-start',
  },
  messageRight: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
  },
  messageBubbleLeft: {
    backgroundColor: '#2a1a3a',
    borderBottomLeftRadius: 5,
  },
  messageBubbleRight: {
    backgroundColor: '#ff6b35',
    borderBottomRightRadius: 5,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  messageTextLeft: {
    color: '#ffffff',
  },
  messageTextRight: {
    color: '#ffffff',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 5,
  },
  messageTimeLeft: {
    color: '#8e8e93',
  },
  messageTimeRight: {
    color: '#ffffff',
    opacity: 0.8,
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#2a1a3a',
    borderTopWidth: 1,
    borderTopColor: '#3a2a4a',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#3a2a4a',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
    color: '#ffffff',
  },
  sendButton: {
    backgroundColor: '#ff6b35',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#8e8e93',
  },
});

export default ClientChatScreen;
