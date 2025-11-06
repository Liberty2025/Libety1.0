import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocale, LOCALES } from '../context/LocaleContext';

const LanguageSelector = ({ style, showLabel = true }) => {
  const { locale, changeLocale, t } = useLocale();
  const [modalVisible, setModalVisible] = useState(false);

  const handleLanguageChange = async (newLocale) => {
    await changeLocale(newLocale);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.selectorButton, style]}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="language" size={20} color="#ff6b35" />
        {showLabel && (
          <Text style={styles.selectorText}>{locale.name}</Text>
        )}
        <Ionicons name="chevron-down" size={16} color="#8e8e93" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, locale.direction === 'rtl' && styles.modalContentRTL]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('change_language')}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {Object.values(LOCALES).map((loc) => (
                <TouchableOpacity
                  key={loc.code}
                  style={[
                    styles.languageOption,
                    locale.code === loc.code && styles.languageOptionSelected,
                    locale.direction === 'rtl' && styles.languageOptionRTL,
                  ]}
                  onPress={() => handleLanguageChange(loc)}
                >
                  <View style={styles.languageInfo}>
                    <Text
                      style={[
                        styles.languageName,
                        locale.code === loc.code && styles.languageNameSelected,
                      ]}
                    >
                      {loc.name}
                    </Text>
                    <Text style={styles.languageCurrency}>
                      {loc.currency} - {loc.currencySymbol}
                    </Text>
                  </View>
                  {locale.code === loc.code && (
                    <Ionicons name="checkmark-circle" size={24} color="#ff6b35" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    gap: 6,
  },
  selectorText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a0d2e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalContentRTL: {
    direction: 'rtl',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 107, 53, 0.3)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeButton: {
    padding: 5,
  },
  modalBody: {
    padding: 20,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  languageOptionRTL: {
    direction: 'rtl',
  },
  languageOptionSelected: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  languageNameSelected: {
    color: '#ff6b35',
  },
  languageCurrency: {
    fontSize: 12,
    color: '#8e8e93',
  },
});

export default LanguageSelector;



