# Liberty Mobile Backend

## 🗄️ Structure de la Base de Données

### 📊 16 Tableaux Principaux

#### 👥 Utilisateurs (2 tableaux)
- **users** - Utilisateurs principaux (clients, déménageurs, admins)
- **users_location** - Localisation des utilisateurs

#### 🏠 Déménagements (1 tableau)
- **reservations** - Réservations de déménagement

#### 💳 Paiements (3 tableaux)
- **payments** - Paiements généraux
- **subscription_plans** - Plans d'abonnement
- **demenageur_subscriptions** - Abonnements déménageurs

#### 🎫 Support (2 tableaux)
- **codes_promo** - Codes promotionnels
- **tickets** - Tickets de support

#### 👷 Profils (2 tableaux)
- **mover_profiles** - Profils déménageurs
- **demenageur_evaluations** - Évaluations

#### 🎯 Scoring (4 tableaux)
- **scoring_config** - Configuration du scoring
- **scoring_config_history** - Historique des configurations
- **demenageur_gifts** - Cadeaux pour déménageurs
- **demenageur_gift_stats** - Statistiques des cadeaux

#### 💰 Paiements déménageurs (2 tableaux)
- **demenageur_payments** - Paiements des déménageurs
- **demenageur_payment_preferences** - Préférences de paiement

## 🚀 Installation et Configuration

### 1. Installation des dépendances
```bash
npm install
```

### 2. Configuration de l'environnement
Créez un fichier `.env` à la racine du backend :
```env
MONGODB_URI=mongodb://localhost:27017/liberty-mobile
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-here
```

### 3. Insertion des données d'exemple
```bash
npm run seed
```

## 👥 Déménageurs Créés

Le script d'insertion crée automatiquement 5 déménageurs :

1. **Ali Ben Ali** - Déménagements Ali Express
   - Plan: Premium
   - Score: 150 points
   - Note: 4.8/5 (127 avis)

2. **Mohamed Trabelsi** - Mohamed Moving Services
   - Plan: Pro
   - Score: 280 points
   - Note: 4.9/5 (203 avis)

3. **Lassad Hammami** - Lassad Transport
   - Plan: Basique
   - Score: 75 points
   - Note: 4.6/5 (89 avis)

4. **Sofien Khelil** - Sofien Déménagements
   - Plan: Premium
   - Score: 200 points
   - Note: 4.7/5 (156 avis)

5. **Seddik Bouaziz** - Seddik Express Moving
   - Plan: Pro
   - Score: 350 points
   - Note: 4.9/5 (312 avis)

## 🎁 Système de Cadeaux

### Cadeaux Disponibles
- **Café Premium** (100 points) - 25€
- **Formation Avancée** (200 points) - 75€
- **Équipement Professionnel** (250 points) - 150€
- **Assurance Complémentaire** (300 points) - 50€
- **Voucher Repas** (400 points) - 100€

## 📱 API Endpoints

### Utilisateurs
- `GET /api/users` - Liste des utilisateurs
- `GET /api/users/:id` - Détails d'un utilisateur
- `POST /api/users` - Créer un utilisateur
- `PUT /api/users/:id` - Modifier un utilisateur

### Déménageurs
- `GET /api/demenageurs` - Liste des déménageurs
- `GET /api/demenageurs/:id` - Profil d'un déménageur
- `GET /api/demenageurs/nearby` - Déménageurs à proximité

### Réservations
- `GET /api/reservations` - Liste des réservations
- `POST /api/reservations` - Créer une réservation
- `PUT /api/reservations/:id` - Modifier une réservation

## 🔧 Scripts Disponibles

- `npm start` - Démarrer le serveur en production
- `npm run dev` - Démarrer le serveur en développement
- `npm run seed` - Insérer les données d'exemple

## 📊 Statistiques

Après l'insertion des données, vous aurez :
- 3 plans d'abonnement
- 5 déménageurs avec profils complets
- 5 localisations
- 5 abonnements actifs
- 5 statistiques de cadeaux
- 5 préférences de paiement
- 5 configurations de scoring
- 5 cadeaux disponibles

## 🔐 Sécurité

- Les mots de passe doivent être hashés avec bcrypt en production
- Utilisez des clés JWT sécurisées
- Configurez CORS appropriément
- Validez toutes les entrées utilisateur
