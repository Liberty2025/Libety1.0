# Rapport de Correction des Tables de Base de Données

## Date: 2025-11-14

## Résumé
Analyse et correction de toutes les références aux tables dans le code pour correspondre aux tables réelles de la base de données PostgreSQL.

## Tables identifiées dans la base: 41 tables

## Corrections effectuées

### 1. ✅ server.js
**Problèmes identifiés:**
- Utilisait `chats` (n'existe pas)
- Utilisait `chat_messages` (n'existe pas)

**Corrections:**
- `chats` → `conversations`
- `chat_messages` → `messages`
- `demenageur_id` → `mover_id`
- Suppression des colonnes inexistantes: `unread_by_client`, `unread_by_demenageur`, `last_message_at`
- Adaptation pour utiliser `last_message_id` dans `conversations`
- Adaptation pour utiliser `sender_id`, `recipient_id`, `read_at` dans `messages`

### 2. ✅ routes/chat.js
**Déjà corrigé précédemment:**
- Utilise `conversations` et `messages`
- Colonnes adaptées correctement

### 3. ✅ routes/serviceRequests.js
**Déjà corrigé précédemment:**
- Utilise `quotes` au lieu de `service_requests`
- Colonnes adaptées: `mover_id`, `from_address`, `to_address`, `move_date`, `price_cents`, `services`

### 4. ✅ routes/statistics.js
**Déjà corrigé précédemment:**
- Utilise `quotes` au lieu de `service_requests`
- Colonnes adaptées correctement

### 5. ✅ routes/demenageurs.js
**Problèmes identifiés:**
- Utilisait des colonnes inexistantes dans `mover_profiles`:
  - `total_reviews` (n'existe pas)
  - `experience_years` (n'existe pas)
  - `services_offered` (n'existe pas)
  - `equipment_available` (n'existe pas)
  - `insurance_coverage` (n'existe pas)

**Corrections:**
- `total_reviews`: Valeur par défaut 0 (peut être calculé depuis `demenageur_evaluations`)
- `experience_years`: Valeur par défaut 0
- `services_offered`: Utilise `truck_types` (qui existe) au lieu de `services_offered`
- `equipment_available`: Tableau vide par défaut
- `insurance_coverage`: Dérivé de `insurance_certificate` (qui existe)

## Tables utilisées dans le code (vérifiées)

### ✅ Tables existantes et utilisées:
- `users` - ✅ Utilisé correctement
- `user_locations` - ✅ Utilisé correctement
- `mover_profiles` - ✅ Utilisé correctement (colonnes corrigées)
- `quotes` - ✅ Utilisé correctement
- `conversations` - ✅ Utilisé correctement
- `messages` - ✅ Utilisé correctement
- `notifications` - ✅ Utilisé correctement
- `reservations` - ✅ Utilisé correctement

### ❌ Tables qui n'existent pas (corrigées):
- `chats` → Remplacé par `conversations`
- `chat_messages` → Remplacé par `messages`
- `service_requests` → Remplacé par `quotes`

## Tables dans la base mais non utilisées (normales)

Ces tables existent mais ne sont pas encore utilisées dans le code actuel:
- `ai_knowledge`, `ai_messages`, `ai_sessions`, `ai_usage`
- `client_profiles`
- `codes_promo`
- `contracts`
- `demenageur_evaluations`
- `demenageur_gift_stats`, `demenageur_gifts`
- `demenageur_payment_preferences`, `demenageur_payments`
- `demenageur_scores`, `demenageur_specialties`
- `demenageur_subscription`, `demenageur_subscriptions`
- `move_events`, `move_live_tracking`, `mover_availability`
- `moves`
- `notification_logs`
- `offers`
- `password_history`
- `payments`
- `scoring_config`, `scoring_config_history`
- `security_activity_log`
- `subscription_plans`
- `tickets`
- `user_devices`, `user_ratings`, `user_security_settings`
- `users_location` (alternative à `user_locations`)

## Statut final

✅ **Toutes les références aux tables dans le code ont été corrigées pour correspondre aux tables réelles de la base de données.**

## Fichiers modifiés

1. `backend/server.js` - Corrections WebSocket pour conversations/messages
2. `backend/routes/demenageurs.js` - Corrections colonnes mover_profiles
3. `backend/routes/chat.js` - Déjà corrigé précédemment
4. `backend/routes/serviceRequests.js` - Déjà corrigé précédemment
5. `backend/routes/statistics.js` - Déjà corrigé précédemment

