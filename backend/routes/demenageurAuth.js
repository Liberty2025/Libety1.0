const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { queryOne, query } = require('../utils/dbHelpers');
const router = express.Router();

// Configuration de multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/demenageurs';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'), false);
    }
  }
});

// Middleware pour vérifier le token JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token d\'accès requis' 
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'liberty_mobile_secret_key', (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        message: 'Token invalide' 
      });
    }
    req.user = user;
    next();
  });
};

// Route d'inscription pour déménageurs
router.post('/register', upload.fields([
  { name: 'drivingLicenseFront', maxCount: 1 },
  { name: 'drivingLicenseBack', maxCount: 1 },
  { name: 'vehicleRegistrationFront', maxCount: 1 },
  { name: 'vehicleRegistrationBack', maxCount: 1 },
  { name: 'identityCardFront', maxCount: 1 },
  { name: 'identityCardBack', maxCount: 1 }
]), async (req, res) => {
  try {
    const { firstName, lastName, email, phone, identityCardNumber, password } = req.body;

    // Validation des données
    if (!firstName || !lastName || !email || !phone || !identityCardNumber || !password) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs obligatoires doivent être remplis'
      });
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Format d\'email invalide'
      });
    }

    // Validation du mot de passe
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 6 caractères'
      });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await queryOne(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Un compte avec cet email existe déjà'
      });
    }

    // Vérifier si le numéro de carte d'identité existe déjà dans mover_profiles
    const existingIdentityCard = await queryOne(
      'SELECT user_id FROM mover_profiles WHERE cin_number = $1',
      [identityCardNumber]
    );
    if (existingIdentityCard) {
      return res.status(409).json({
        success: false,
        message: 'Un compte avec ce numéro de carte d\'identité existe déjà'
      });
    }

    // Vérifier que tous les documents sont fournis (face avant et arrière)
    if (!req.files || 
        !req.files.drivingLicenseFront || !req.files.drivingLicenseBack ||
        !req.files.vehicleRegistrationFront || !req.files.vehicleRegistrationBack ||
        !req.files.identityCardFront || !req.files.identityCardBack) {
      return res.status(400).json({
        success: false,
        message: 'Tous les documents sont requis (face avant et arrière pour chaque document)'
      });
    }

    // Hacher le mot de passe
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Préparer les chemins des documents (face avant et arrière)
    const documents = {
      drivingLicense: {
        front: req.files.drivingLicenseFront[0].filename,
        back: req.files.drivingLicenseBack[0].filename
      },
      vehicleRegistration: {
        front: req.files.vehicleRegistrationFront[0].filename,
        back: req.files.vehicleRegistrationBack[0].filename
      },
      identityCard: {
        front: req.files.identityCardFront[0].filename,
        back: req.files.identityCardBack[0].filename
      }
    };

    // Créer le nouvel utilisateur déménageur avec les photos dans users (carte_grise, carte_cin, permis)
    const newUserResult = await query(
      `INSERT INTO users (id, first_name, last_name, email, phone, password, role, status, carte_grise, carte_cin, permis, is_verified, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
       RETURNING id, first_name, last_name, email, phone, role, status, carte_grise, carte_cin, permis, is_verified, created_at`,
      [
        firstName, 
        lastName, 
        email.toLowerCase(), 
        phone, 
        hashedPassword, 
        'demenageur', 
        'inactive', 
        JSON.stringify(documents.vehicleRegistration), // carte_grise
        JSON.stringify(documents.identityCard), // carte_cin
        JSON.stringify(documents.drivingLicense), // permis
        false
      ]
    );
    const newUser = newUserResult.rows[0];

    // Créer le profil déménageur avec le cin_number
    const moverProfileResult = await query(
      `INSERT INTO mover_profiles (user_id, cin_number, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       RETURNING user_id, cin_number`,
      [newUser.id, identityCardNumber]
    );
    const moverProfile = moverProfileResult.rows[0];

    // Générer un token JWT
    const token = jwt.sign(
      { 
        userId: newUser.id, 
        email: newUser.email, 
        role: newUser.role 
      },
      process.env.JWT_SECRET || 'liberty_mobile_secret_key',
      { expiresIn: '7d' }
    );

    // Retourner la réponse (sans le mot de passe)
    const userResponse = {
      id: newUser.id,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      email: newUser.email,
      phone: newUser.phone,
      identityCardNumber: moverProfile.cin_number,
      carteGrise: newUser.carte_grise ? (typeof newUser.carte_grise === 'string' ? JSON.parse(newUser.carte_grise) : newUser.carte_grise) : null,
      carteCin: newUser.carte_cin ? (typeof newUser.carte_cin === 'string' ? JSON.parse(newUser.carte_cin) : newUser.carte_cin) : null,
      permis: newUser.permis ? (typeof newUser.permis === 'string' ? JSON.parse(newUser.permis) : newUser.permis) : null,
      role: newUser.role,
      status: newUser.status,
      isVerified: newUser.is_verified,
      createdAt: newUser.created_at
    };

    res.status(201).json({
      success: true,
      message: 'Compte déménageur créé avec succès. Votre compte sera vérifié par notre équipe.',
      user: userResponse,
      token: token
    });

  } catch (error) {
    console.error('Erreur lors de l\'inscription déménageur:', error);
    
    // Nettoyer les fichiers uploadés en cas d'erreur
    if (req.files) {
      Object.values(req.files).forEach(fileArray => {
        if (fileArray && fileArray.length > 0) {
          fileArray.forEach(file => {
            const filePath = path.join('uploads/demenageurs', file.filename);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          });
        }
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Route de connexion pour déménageurs
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation des données
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis'
      });
    }

    // Trouver l'utilisateur par email
    const user = await queryOne(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier que c'est un déménageur
    if (user.role !== 'demenageur') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé. Ce compte n\'est pas un compte déménageur.'
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect'
      });
    }

    // Vérifier le statut de l'utilisateur
    if (user.status === 'banned') {
      return res.status(403).json({
        success: false,
        message: 'Votre compte a été suspendu',
        banReason: user.ban_reason
      });
    }

    // Vérifier si le compte est en attente de vérification (inactive et non vérifié)
    if (user.status === 'inactive' && !user.is_verified) {
      return res.status(403).json({
        success: false,
        message: 'Votre compte est en attente de vérification. Veuillez patienter.'
      });
    }

    // Vérifier si le compte est simplement inactif (mais vérifié)
    if (user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'Votre compte est inactif'
      });
    }

    // Récupérer le profil déménageur pour obtenir le cin_number
    const moverProfile = await queryOne(
      'SELECT cin_number FROM mover_profiles WHERE user_id = $1',
      [user.id]
    );

    // Générer un token JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'liberty_mobile_secret_key',
      { expiresIn: '7d' }
    );

    // Parser les photos depuis users
    const carteGrise = user.carte_grise ? (typeof user.carte_grise === 'string' ? JSON.parse(user.carte_grise) : user.carte_grise) : null;
    const carteCin = user.carte_cin ? (typeof user.carte_cin === 'string' ? JSON.parse(user.carte_cin) : user.carte_cin) : null;
    const permis = user.permis ? (typeof user.permis === 'string' ? JSON.parse(user.permis) : user.permis) : null;

    // Retourner la réponse (sans le mot de passe)
    const userResponse = {
      id: user.id,
      userId: user.id, // Ajouter userId pour compatibilité
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone,
      identityCardNumber: moverProfile ? moverProfile.cin_number : null,
      role: user.role,
      status: user.status,
      isVerified: user.is_verified,
      carteGrise: carteGrise,
      carteCin: carteCin,
      permis: permis,
      createdAt: user.created_at
    };

    res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      user: userResponse,
      token: token
    });

  } catch (error) {
    console.error('Erreur lors de la connexion déménageur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Route pour obtenir le profil du déménageur connecté
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await queryOne(
      `SELECT id, first_name, last_name, email, phone, role, status, is_verified, carte_grise, carte_cin, permis, address, created_at, updated_at
       FROM users WHERE id = $1`,
      [req.user.userId]
    );
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    if (user.role !== 'demenageur') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    // Récupérer le profil déménageur pour obtenir le cin_number
    const moverProfile = await queryOne(
      'SELECT cin_number FROM mover_profiles WHERE user_id = $1',
      [user.id]
    );

    // Récupérer la localisation si elle existe
    const location = await queryOne(
      'SELECT * FROM user_locations WHERE user_id = $1',
      [user.id]
    );

    // Parser les photos depuis users
    const carteGrise = user.carte_grise ? (typeof user.carte_grise === 'string' ? JSON.parse(user.carte_grise) : user.carte_grise) : null;
    const carteCin = user.carte_cin ? (typeof user.carte_cin === 'string' ? JSON.parse(user.carte_cin) : user.carte_cin) : null;
    const permis = user.permis ? (typeof user.permis === 'string' ? JSON.parse(user.permis) : user.permis) : null;

    const userResponse = {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone,
      identityCardNumber: moverProfile ? moverProfile.cin_number : null,
      role: user.role,
      status: user.status,
      isVerified: user.is_verified,
      carteGrise: carteGrise,
      carteCin: carteCin,
      permis: permis,
      address: user.address,
      latitude: location ? parseFloat(location.lat) : null,
      longitude: location ? parseFloat(location.lng) : null,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };

    res.status(200).json({
      success: true,
      user: userResponse
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du profil déménageur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Route pour mettre à jour le profil du déménageur
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, phone, address } = req.body;
    const userId = req.user.userId;

    // Construire la requête de mise à jour dynamiquement
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (firstName) {
      updates.push(`first_name = $${paramIndex++}`);
      values.push(firstName);
    }
    if (lastName) {
      updates.push(`last_name = $${paramIndex++}`);
      values.push(lastName);
    }
    if (phone) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(phone);
    }
    if (address) {
      updates.push(`address = $${paramIndex++}`);
      values.push(address);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucune donnée à mettre à jour'
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);
    const finalParamIndex = paramIndex;

    const user = await queryOne(
      `SELECT id, first_name, last_name, email, phone, role, status, is_verified, carte_grise, carte_cin, permis, address, created_at, updated_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    if (user.role !== 'demenageur') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }

    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${finalParamIndex}`,
      values
    );

    // Récupérer l'utilisateur mis à jour
    const updatedUser = await queryOne(
      `SELECT id, first_name, last_name, email, phone, role, status, is_verified, carte_grise, carte_cin, permis, address, created_at, updated_at
       FROM users WHERE id = $1`,
      [userId]
    );

    // Récupérer le profil déménageur pour obtenir le cin_number
    const moverProfile = await queryOne(
      'SELECT cin_number FROM mover_profiles WHERE user_id = $1',
      [userId]
    );

    // Récupérer la localisation si elle existe
    const location = await queryOne(
      'SELECT * FROM user_locations WHERE user_id = $1',
      [userId]
    );

    // Parser les photos depuis users
    const carteGrise = updatedUser.carte_grise ? (typeof updatedUser.carte_grise === 'string' ? JSON.parse(updatedUser.carte_grise) : updatedUser.carte_grise) : null;
    const carteCin = updatedUser.carte_cin ? (typeof updatedUser.carte_cin === 'string' ? JSON.parse(updatedUser.carte_cin) : updatedUser.carte_cin) : null;
    const permis = updatedUser.permis ? (typeof updatedUser.permis === 'string' ? JSON.parse(updatedUser.permis) : updatedUser.permis) : null;

    const userResponse = {
      id: updatedUser.id,
      firstName: updatedUser.first_name,
      lastName: updatedUser.last_name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      identityCardNumber: moverProfile ? moverProfile.cin_number : null,
      role: updatedUser.role,
      status: updatedUser.status,
      isVerified: updatedUser.is_verified,
      carteGrise: carteGrise,
      carteCin: carteCin,
      permis: permis,
      address: updatedUser.address,
      latitude: location ? parseFloat(location.lat) : null,
      longitude: location ? parseFloat(location.lng) : null,
      createdAt: updatedUser.created_at,
      updatedAt: updatedUser.updated_at
    };

    res.status(200).json({
      success: true,
      message: 'Profil mis à jour avec succès',
      user: userResponse
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil déménageur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur interne du serveur',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Route pour vérifier la validité du token
router.get('/verify-token', authenticateToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Token valide',
    user: {
      userId: req.user.userId,
      email: req.user.email,
      role: req.user.role
    }
  });
});

module.exports = router;
