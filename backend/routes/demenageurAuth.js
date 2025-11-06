const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
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
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Un compte avec cet email existe déjà'
      });
    }

    // Vérifier si le numéro de carte d'identité existe déjà
    const existingIdentityCard = await User.findOne({ identityCardNumber });
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

    // Créer le nouvel utilisateur déménageur
    const newUser = new User({
      first_name: firstName,
      last_name: lastName,
      email: email.toLowerCase(),
      phone: phone,
      identityCardNumber: identityCardNumber,
      password: hashedPassword,
      role: 'demenageur',
      status: 'pending_verification', // Statut en attente de vérification
      documents: documents,
      is_verified: false
    });

    // Sauvegarder l'utilisateur
    await newUser.save();

    // Générer un token JWT
    const token = jwt.sign(
      { 
        userId: newUser._id, 
        email: newUser.email, 
        role: newUser.role 
      },
      process.env.JWT_SECRET || 'liberty_mobile_secret_key',
      { expiresIn: '7d' }
    );

    // Retourner la réponse (sans le mot de passe)
    const userResponse = {
      id: newUser._id,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      email: newUser.email,
      phone: newUser.phone,
      identityCardNumber: newUser.identityCardNumber,
      role: newUser.role,
      status: newUser.status,
      isVerified: newUser.is_verified,
      createdAt: newUser.createdAt
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
    const user = await User.findOne({ email: email.toLowerCase() });
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

    if (user.status === 'inactive') {
      return res.status(403).json({
        success: false,
        message: 'Votre compte est inactif'
      });
    }

    if (user.status === 'pending_verification') {
      return res.status(403).json({
        success: false,
        message: 'Votre compte est en attente de vérification. Veuillez patienter.'
      });
    }

    // Générer un token JWT
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'liberty_mobile_secret_key',
      { expiresIn: '7d' }
    );

    // Retourner la réponse (sans le mot de passe)
    const userResponse = {
      id: user._id,
      userId: user._id, // Ajouter userId pour compatibilité
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone,
      identityCardNumber: user.identityCardNumber,
      role: user.role,
      status: user.status,
      isVerified: user.is_verified,
      createdAt: user.createdAt
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
    const user = await User.findById(req.user.userId).select('-password');
    
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

    const userResponse = {
      id: user._id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone,
      identityCardNumber: user.identityCardNumber,
      role: user.role,
      status: user.status,
      isVerified: user.is_verified,
      documents: user.documents,
      address: user.address,
      latitude: user.latitude,
      longitude: user.longitude,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
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

    const updateData = {};
    if (firstName) updateData.first_name = firstName;
    if (lastName) updateData.last_name = lastName;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

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

    const userResponse = {
      id: user._id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone,
      identityCardNumber: user.identityCardNumber,
      role: user.role,
      status: user.status,
      isVerified: user.is_verified,
      documents: user.documents,
      address: user.address,
      latitude: user.latitude,
      longitude: user.longitude,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
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
