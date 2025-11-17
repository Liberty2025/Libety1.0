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
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useRealtimeChat from '../../hooks/useRealtimeChat';
import { getAPIBaseURL } from '../../config/api';

const { width } = Dimensions.get('window');

const ChatScreen = ({ userData }) => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const API_BASE_URL = getAPIBaseURL();

  // Hook pour le chat en temps réel
  const { 
    isConnected, 
    sendMessage: sendRealtimeMessage, 
    markMessagesAsRead: markRealtimeRead,
    joinChat,
    leaveChat,
    getNewMessages,
    newMessagesCount
  } = useRealtimeChat(userData?.token, userData?.id || userData?._id);

  // Animation d'entrée
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Traiter les nouveaux messages en temps réel
  useEffect(() => {
    const newMessages = getNewMessages();
    
    if (newMessages.length > 0) {
      if (selectedChat) {
        setMessages(prev => {
          const updatedMessages = [...prev, ...newMessages.map(msg => msg.message)];
          return updatedMessages;
        });
        
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
      
      updateChatsList(newMessages);
      
      const newChats = newMessages.filter(msg => msg.type === 'chat_created');
      if (newChats.length > 0) {
        loadChats();
      }
    }
  }, [newMessagesCount, selectedChat]);

  useEffect(() => {
    if (userData?.token && isConnected) {
      loadChats();
    }
  }, [userData, isConnected]);

  const updateChatsList = (newMessages) => {
    const normalMessages = newMessages.filter(msg => msg.type !== 'chat_created');
    
    if (normalMessages.length === 0) return;
    
    setChats(prevChats => {
      const updatedChats = prevChats.map(chat => {
        const chatId = chat.id || chat._id;
        const chatMessages = normalMessages.filter(msg => msg.chatId === chatId);
        
        if (chatMessages.length > 0) {
          const latestMessage = chatMessages[chatMessages.length - 1];
          
          return {
            ...chat,
            lastMessage: latestMessage.message,
            lastMessageAt: latestMessage.message.createdAt,
            unreadByDemenageur: latestMessage.message.senderType === 'client' 
              ? (chat.unreadByDemenageur || 0) + 1 
              : chat.unreadByDemenageur || 0
          };
        }
        
        return chat;
      });
      
      return updatedChats.sort((a, b) => 
        new Date(b.lastMessageAt || b.createdAt) - new Date(a.lastMessageAt || a.createdAt)
      );
    });
  };

  const loadChats = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/api/chat/my-chats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userData.token}`,
          'Content-Type': 'application/json',
        },
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Réponse non-JSON reçue (${response.status}): ${contentType}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setChats(result.chats || []);
      } else {
        console.log('❌ Échec du chargement des conversations:', result.message);
        setChats([]);
      }
    } catch (error) {
      console.error('❌ Erreur de connexion:', error);
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (chatId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/${chatId}/messages`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userData.token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (result.success) {
        setMessages(result.messages);
        await markRealtimeRead(chatId);
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    if (isConnected) {
      const chatId = selectedChat.id || selectedChat._id;
      sendRealtimeMessage(chatId, newMessage.trim());
      setNewMessage('');
      
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } else {
      try {
        const chatId = selectedChat.id || selectedChat._id;
        const response = await fetch(`${API_BASE_URL}/api/chat/${chatId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userData.token}`,
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
        }
      } catch (error) {
        Alert.alert('Erreur', 'Impossible d\'envoyer le message');
      }
    }
  };

  const selectChat = (chat) => {
    const chatId = chat.id || chat._id;
    
    if (selectedChat) {
      const selectedChatId = selectedChat.id || selectedChat._id;
      leaveChat(selectedChatId);
    }
    
    setSelectedChat(chat);
    loadMessages(chatId);
    
    if (isConnected) {
      joinChat(chatId);
    }
  };

  const getAvatarColor = (name) => {
    const colors = ['#ff6b35', '#ff8c42', '#ffa726', '#ffb74d', '#ffcc80', '#ffe0b2'];
    return colors[name.charCodeAt(0) % colors.length];
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      return '';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
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
    } catch (error) {
      return '';
    }
  };

  const getServiceIcon = (serviceType) => {
    return serviceType === 'demenagement' ? 'home' : 'car';
  };

  const getServiceColor = (serviceType) => {
    return serviceType === 'demenagement' ? '#ff6b35' : '#ff8c42';
  };

  if (selectedChat) {
    return (
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar barStyle="light-content" backgroundColor="#ff6b35" />
        
        {/* En-tête de conversation avec gradient */}
        <View style={styles.conversationHeader}>
          <View style={styles.headerGradient}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setSelectedChat(null)}
            >
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            
            <View style={styles.conversationInfo}>
              <View style={styles.avatarContainer}>
                <View style={[styles.avatar, { backgroundColor: getAvatarColor(selectedChat.clientId?.firstName || selectedChat.clientId?.first_name || 'C') }]}>
                  <Text style={styles.avatarText}>
                    {(selectedChat.clientId?.firstName || selectedChat.clientId?.first_name || 'C').charAt(0)}
                  </Text>
                </View>
                <View style={styles.onlineIndicator} />
              </View>
              
              <View style={styles.conversationDetails}>
                <Text style={styles.conversationName}>
                  {selectedChat.clientId?.firstName || selectedChat.clientId?.first_name || 'Client'} {selectedChat.clientId?.lastName || selectedChat.clientId?.last_name || ''}
                </Text>
                <View style={styles.statusContainer}>
                  <Ionicons 
                    name={getServiceIcon(selectedChat.serviceRequestId?.serviceType)} 
                    size={14} 
                    color="#ffffff" 
                  />
                  <Text style={styles.serviceType}>
                    {selectedChat.serviceRequestId?.serviceType === 'demenagement' ? 'Déménagement' : 'Transport'}
                  </Text>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>En ligne</Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity style={styles.moreButton}>
              <Ionicons name="ellipsis-vertical" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages avec design moderne */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer} 
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((message, index) => {
            // Les messages du déménageur sont affichés à droite, les messages du client à gauche
            const isDemenageurMessage = message.senderType === 'demenageur' || message.senderType === 'Demenageur';
            
            return (
              <Animated.View 
                key={message.id || message._id || `msg-${index}`} 
                style={[
                  styles.messageContainer,
                  isDemenageurMessage ? styles.messageRight : styles.messageLeft
                ]}
              >
                <View style={[
                  styles.messageBubble,
                  isDemenageurMessage ? styles.messageBubbleRight : styles.messageBubbleLeft
                ]}>
                  <Text style={[
                    styles.messageText,
                    isDemenageurMessage ? styles.messageTextRight : styles.messageTextLeft
                  ]}>
                    {message.content}
                  </Text>
                  <Text style={[
                    styles.messageTime,
                    isDemenageurMessage ? styles.messageTimeRight : styles.messageTimeLeft
                  ]}>
                    {formatTime(message.createdAt)}
                  </Text>
                </View>
              </Animated.View>
            );
          })}
        </ScrollView>

        {/* Input de message avec design moderne */}
        <View style={styles.messageInputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.messageInput}
              placeholder="Tapez votre message..."
              placeholderTextColor="#ffb74d"
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
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#ff6b35" />
      
      {/* En-tête avec gradient moderne */}
      <View style={styles.header}>
        <View style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Messages</Text>
            <View style={styles.headerSubtitle}>
              <View style={[styles.connectionDot, { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }]} />
              <Text style={styles.connectionText}>
                {isConnected ? 'En ligne' : 'Hors ligne'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.searchButton}>
            <Ionicons name="search" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Liste des conversations avec animations */}
      <Animated.View style={[styles.conversationsList, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Animated.View style={[styles.loadingSpinner, { opacity: fadeAnim }]}>
                <Ionicons name="chatbubbles" size={32} color="#ff6b35" />
              </Animated.View>
              <Animated.Text style={[styles.loadingText, { opacity: fadeAnim }]}>
                Chargement des conversations...
              </Animated.Text>
            </View>
          ) : chats.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color="#ff6b35" />
              </View>
              <Text style={styles.emptyText}>Aucune conversation</Text>
              <Text style={styles.emptySubtext}>
                Vos conversations avec les clients apparaîtront ici une fois vos missions acceptées.
              </Text>
            </View>
          ) : (
            chats.map((chat, index) => {
              // Vérification de la structure des données
              const clientFirstName = chat.clientId?.firstName || chat.clientId?.first_name;
              if (!chat.clientId || !clientFirstName) {
                console.log('⚠️ Chat sans clientId valide:', chat);
                return null;
              }
              
              return (
                <Animated.View
                  key={chat.id || chat._id || `chat-${index}`}
                  style={[
                    styles.conversationItem,
                    chat.unreadByDemenageur > 0 && styles.conversationItemUnread,
                    { transform: [{ translateX: slideAnim }] }
                  ]}
                >
                  <TouchableOpacity 
                    style={styles.conversationTouchable}
                    onPress={() => selectChat(chat)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.avatarContainer}>
                      <View style={[styles.avatar, { backgroundColor: getAvatarColor(clientFirstName) }]}>
                        <Text style={styles.avatarText}>
                          {clientFirstName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      {chat.unreadByDemenageur > 0 && (
                        <View style={styles.unreadIndicator} />
                      )}
                    </View>
                    
                    <View style={styles.conversationContent}>
                      <View style={styles.conversationHeader}>
                        <Text style={[
                          styles.conversationName,
                          chat.unreadByDemenageur > 0 && styles.conversationNameUnread
                        ]}>
                          {clientFirstName} {chat.clientId?.lastName || chat.clientId?.last_name || ''}
                        </Text>
                        <Text style={styles.conversationTime}>
                          {chat.lastMessage ? formatDate(chat.lastMessage.createdAt) : formatDate(chat.createdAt)}
                        </Text>
                      </View>
                      
                      <View style={styles.conversationFooter}>
                        <Text 
                          style={[
                            styles.lastMessage,
                            chat.unreadByDemenageur > 0 && styles.lastMessageUnread
                          ]}
                          numberOfLines={1}
                        >
                          {chat.lastMessage ? chat.lastMessage.content : 'Nouvelle conversation'}
                        </Text>
                        {chat.unreadByDemenageur > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>{chat.unreadByDemenageur}</Text>
                          </View>
                        )}
                      </View>
                      
                      <View style={styles.serviceInfoContainer}>
                        <View style={[
                          styles.serviceTypeBadge,
                          { backgroundColor: getServiceColor(chat.serviceRequestId?.serviceType) + '20' }
                        ]}>
                          <Ionicons 
                            name={getServiceIcon(chat.serviceRequestId?.serviceType)} 
                            size={12} 
                            color={getServiceColor(chat.serviceRequestId?.serviceType)} 
                          />
                          <Text style={[
                            styles.serviceTypeText,
                            { color: getServiceColor(chat.serviceRequestId?.serviceType) }
                          ]}>
                            {chat.serviceRequestId?.serviceType === 'demenagement' ? 'Déménagement' : 'Transport'}
                          </Text>
                        </View>
                        <Text style={styles.serviceAddress} numberOfLines={1}>
                          {chat.serviceRequestId?.departureAddress || 'Adresse non disponible'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    backgroundColor: '#ff6b35',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  connectionText: {
    fontSize: 13,
    color: '#ffffff',
    opacity: 0.9,
    fontWeight: '500',
  },
  searchButton: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  conversationsList: {
    flex: 1,
  },
  conversationItem: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  conversationItemUnread: {
    backgroundColor: '#fff8f5',
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b35',
    shadowOpacity: 0.15,
  },
  conversationTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  unreadIndicator: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ff6b35',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  conversationName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ff6b35',
  },
  conversationNameUnread: {
    fontWeight: 'bold',
  },
  conversationTime: {
    fontSize: 13,
    color: '#8e8e93',
    fontWeight: '500',
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  lastMessage: {
    fontSize: 15,
    color: '#8e8e93',
    flex: 1,
    fontWeight: '400',
    lineHeight: 20,
  },
  lastMessageUnread: {
    color: '#ff6b35',
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: '#ff6b35',
    borderRadius: 14,
    minWidth: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    paddingHorizontal: 10,
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  serviceInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serviceTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  serviceTypeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  serviceAddress: {
    fontSize: 13,
    color: '#8e8e93',
    flex: 1,
    marginLeft: 10,
    fontWeight: '400',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginLeft: 8,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  conversationHeader: {
    backgroundColor: '#ff6b35',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 15,
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  backButton: {
    padding: 12,
    marginRight: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  conversationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  conversationDetails: {
    marginLeft: 16,
  },
  conversationName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 13,
    color: '#ffffff',
    opacity: 0.9,
    marginLeft: 8,
    fontWeight: '500',
  },
  moreButton: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fafafa',
  },
  messageContainer: {
    marginVertical: 8,
  },
  messageLeft: {
    alignItems: 'flex-start',
  },
  messageRight: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messageBubbleLeft: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  messageBubbleRight: {
    backgroundColor: '#ff6b35',
    borderBottomRightRadius: 8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  messageTextLeft: {
    color: '#ff6b35',
  },
  messageTextRight: {
    color: '#ffffff',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
  messageTimeLeft: {
    color: '#8e8e93',
  },
  messageTimeRight: {
    color: '#ffffff',
    opacity: 0.8,
  },
  messageInputContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f8f9fa',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageInput: {
    flex: 1,
    fontSize: 16,
    color: '#ff6b35',
    maxHeight: 100,
    paddingVertical: 10,
    fontWeight: '400',
  },
  sendButton: {
    backgroundColor: '#ff6b35',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  sendButtonDisabled: {
    backgroundColor: '#8e8e93',
    shadowOpacity: 0,
    elevation: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingSpinner: {
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 17,
    color: '#8e8e93',
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    marginBottom: 24,
    opacity: 0.6,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ff6b35',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    color: '#8e8e93',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '400',
  },
});

export default ChatScreen;