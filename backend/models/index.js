// Export de tous les modèles
const User = require('./User');
const UserLocation = require('./UserLocation');
const Reservation = require('./Reservation');
const Payment = require('./Payment');
const SubscriptionPlan = require('./SubscriptionPlan');
const DemenageurSubscription = require('./DemenageurSubscription');
const CodePromo = require('./CodePromo');
const Ticket = require('./Ticket');
const MoverProfile = require('./MoverProfile');
const DemenageurEvaluation = require('./DemenageurEvaluation');
const ScoringConfig = require('./ScoringConfig');
const ScoringConfigHistory = require('./ScoringConfigHistory');
const DemenageurGift = require('./DemenageurGift');
const DemenageurGiftStats = require('./DemenageurGiftStats');
const DemenageurPayment = require('./DemenageurPayment');
const DemenageurPaymentPreferences = require('./DemenageurPaymentPreferences');
const ServiceRequest = require('./ServiceRequest');
const Chat = require('./Chat');
const ChatMessage = require('./ChatMessage');

module.exports = {
  User,
  UserLocation,
  Reservation,
  Payment,
  SubscriptionPlan,
  DemenageurSubscription,
  CodePromo,
  Ticket,
  MoverProfile,
  DemenageurEvaluation,
  ScoringConfig,
  ScoringConfigHistory,
  DemenageurGift,
  DemenageurGiftStats,
  DemenageurPayment,
  DemenageurPaymentPreferences,
  ServiceRequest,
  Chat,
  ChatMessage
};
