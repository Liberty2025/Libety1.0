import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocale } from '../context/LocaleContext';
import LanguageSelector from './LanguageSelector';

const { width, height } = Dimensions.get('window');

const RoleSelectionScreen = ({ onRoleSelected }) => {
  const { t, locale } = useLocale();
  
  return (
    <View style={[styles.container, locale.direction === 'rtl' && styles.containerRTL]}>
      {/* Sélecteur de langue */}
      <View style={styles.languageSelectorContainer}>
        <LanguageSelector />
      </View>
      
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('app_name')}</Text>
        <Text style={styles.subtitle}>{t('choose_role')}</Text>
      </View>

      {/* Options de rôle */}
      <View style={styles.rolesContainer}>
        <TouchableOpacity 
          style={styles.roleCard}
          onPress={() => onRoleSelected('client')}
        >
          <View style={styles.roleIconContainer}>
            <Ionicons name="person" size={40} color="#ff6b35" />
          </View>
          <Text style={styles.roleTitle}>{t('client')}</Text>
          <Text style={styles.roleDescription}>
            {t('client_description')}
          </Text>
          <View style={styles.roleFeatures}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark" size={14} color="#28a745" />
              <Text style={styles.featureText}>{t('client_features_find')}</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark" size={14} color="#28a745" />
              <Text style={styles.featureText}>{t('client_features_book')}</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark" size={14} color="#28a745" />
              <Text style={styles.featureText}>{t('client_features_track')}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.roleCard}
          onPress={() => onRoleSelected('demenageur')}
        >
          <View style={styles.roleIconContainer}>
            <Ionicons name="car" size={40} color="#ff6b35" />
          </View>
          <Text style={styles.roleTitle}>{t('demenageur')}</Text>
          <Text style={styles.roleDescription}>
            {t('demenageur_description')}
          </Text>
          <View style={styles.roleFeatures}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark" size={14} color="#28a745" />
              <Text style={styles.featureText}>{t('demenageur_features_receive')}</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark" size={14} color="#28a745" />
              <Text style={styles.featureText}>{t('demenageur_features_manage')}</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark" size={14} color="#28a745" />
              <Text style={styles.featureText}>{t('demenageur_features_earnings')}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {t('terms_acceptance')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  containerRTL: {
    direction: 'rtl',
  },
  languageSelectorContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ff6b35',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#8e8e93',
    textAlign: 'center',
  },
  rolesContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  roleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    marginVertical: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  roleIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff5f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 14,
    color: '#8e8e93',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 20,
  },
  roleFeatures: {
    width: '100%',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  featureText: {
    fontSize: 12,
    color: '#333333',
    marginLeft: 8,
  },
  footer: {
    paddingHorizontal: 40,
    paddingBottom: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#8e8e93',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default RoleSelectionScreen;
