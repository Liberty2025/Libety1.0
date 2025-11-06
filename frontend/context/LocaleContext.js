import React, { createContext, useState, useContext, useEffect } from 'react';
// Imports statiques des traductions
import frTranslations from '../locales/fr.json';
import arTranslations from '../locales/ar.json';

// Utilisation d'un storage simple (pourra être remplacé par AsyncStorage plus tard)
const Storage = {
  getItem: async (key) => {
    try {
      // Dans un vrai app, utiliser @react-native-async-storage/async-storage
      // Pour l'instant, on utilise un fallback
      return null;
    } catch (e) {
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      // Dans un vrai app, utiliser @react-native-async-storage/async-storage
      return true;
    } catch (e) {
      return false;
    }
  },
};

// Mapper les traductions
const translationsMap = {
  fr: frTranslations,
  ar: arTranslations,
};

// Configuration des contextes
export const LOCALES = {
  FR: {
    code: 'fr',
    name: 'Français',
    currency: 'EUR',
    currencySymbol: '€',
    locale: 'fr-FR',
    direction: 'ltr',
  },
  AR: {
    code: 'ar',
    name: 'العربية',
    currency: 'TND',
    currencySymbol: 'د.ت',
    locale: 'ar-TN',
    direction: 'rtl',
  },
};

const LocaleContext = createContext();

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};

export const LocaleProvider = ({ children }) => {
  const [locale, setLocale] = useState(LOCALES.FR);
  const [translations, setTranslations] = useState({});
  const [loading, setLoading] = useState(true);

  const loadTranslations = (localeCode = locale.code) => {
    try {
      // Charger les traductions selon la locale actuelle (imports statiques)
      const translations = translationsMap[localeCode];
      if (translations) {
        setTranslations(translations);
      } else {
        // Fallback sur français si locale non trouvée
        console.warn(`Traductions non trouvées pour ${localeCode}, utilisation du français`);
        setTranslations(frTranslations);
        if (localeCode !== 'fr') {
          setLocale(LOCALES.FR);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des traductions:', error);
      // Fallback sur français en cas d'erreur
      setTranslations(frTranslations);
      if (localeCode !== 'fr') {
        setLocale(LOCALES.FR);
      }
    } finally {
      setLoading(false);
    }
  };

  // Charger les traductions et la locale sauvegardée
  useEffect(() => {
    const initializeLocale = async () => {
      const savedLocaleCode = await Storage.getItem('app_locale');
      if (savedLocaleCode) {
        const savedLocale = Object.values(LOCALES).find(
          loc => loc.code === savedLocaleCode
        );
        if (savedLocale) {
          setLocale(savedLocale);
          loadTranslations(savedLocale.code);
          return;
        }
      }
      // Charger les traductions par défaut (français)
      loadTranslations('fr');
    };
    initializeLocale();
  }, []);

  // Note: Les traductions sont rechargées automatiquement lors du changement via changeLocale
  // Ce useEffect évite les rechargements inutiles

  const changeLocale = async (newLocale) => {
    try {
      setLocale(newLocale);
      await Storage.setItem('app_locale', newLocale.code);
      // Charger les nouvelles traductions (synchrone maintenant)
      loadTranslations(newLocale.code);
    } catch (error) {
      console.error('Erreur lors du changement de locale:', error);
    }
  };

  const t = (key, params = {}) => {
    let translation = translations[key] || key;
    
    // Remplacer les paramètres si présents
    if (params && Object.keys(params).length > 0) {
      Object.keys(params).forEach(paramKey => {
        translation = translation.replace(
          new RegExp(`{{${paramKey}}}`, 'g'),
          params[paramKey]
        );
      });
    }
    
    return translation;
  };

  // Formater une devise selon le contexte
  const formatCurrency = (amount) => {
    if (typeof amount !== 'number') {
      amount = parseFloat(amount) || 0;
    }

    if (locale.code === 'ar') {
      // Format tunisien : 1.234,567 د.ت
      return `${amount.toLocaleString('ar-TN', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} ${locale.currencySymbol}`;
    } else {
      // Format français : 1 234,56 €
      return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${locale.currencySymbol}`;
    }
  };

  // Formater une date selon le contexte
  const formatDate = (date, options = {}) => {
    if (!date) return '';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return '';

    const defaultOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };

    return dateObj.toLocaleDateString(locale.locale, { ...defaultOptions, ...options });
  };

  // Formater une date courte (JJ/MM/AAAA)
  const formatDateShort = (date) => {
    if (!date) return '';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return '';

    if (locale.code === 'ar') {
      // Format arabe : YYYY/MM/DD (format standard tunisien)
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}/${month}/${day}`;
    } else {
      // Format français : DD/MM/YYYY
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${day}/${month}/${year}`;
    }
  };

  // Formater une heure
  const formatTime = (date, options = {}) => {
    if (!date) return '';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return '';

    const defaultOptions = {
      hour: '2-digit',
      minute: '2-digit',
    };

    return dateObj.toLocaleTimeString(locale.locale, { ...defaultOptions, ...options });
  };

  const value = {
    locale,
    translations,
    t,
    formatCurrency,
    formatDate,
    formatDateShort,
    formatTime,
    changeLocale,
    loading,
    isRTL: locale.direction === 'rtl',
  };

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
};

