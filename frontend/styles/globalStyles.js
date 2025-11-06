import { StyleSheet } from 'react-native';

export const globalStyles = StyleSheet.create({
  // Couleurs principales
  colors: {
    primary: '#ff6b35',
    secondary: '#4ecdc4',
    background: '#f8f9fa',
    white: '#ffffff',
    black: '#000000',
    gray: '#8e8e93',
    lightGray: '#f1f1f1',
    darkGray: '#333333',
    success: '#28a745',
    warning: '#ffc107',
    danger: '#dc3545',
    info: '#17a2b8'
  },

  // Styles de base
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },

  // En-têtes
  header: {
    backgroundColor: '#ff6b35',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // Boutons
  primaryButton: {
    backgroundColor: '#ff6b35',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#ff6b35',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    color: '#ff6b35',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Cartes
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    marginVertical: 10,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },

  // Textes
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 16,
    color: '#8e8e93',
    marginBottom: 15,
  },

  text: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },

  // Inputs
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e1e1',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333333',
    marginBottom: 15,
  },

  // Navigation
  tabBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
    paddingTop: 10,
    paddingBottom: 10,
    height: 80,
  },

  tabBarLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },

  // Icônes
  icon: {
    fontSize: 24,
    color: '#ff6b35',
  },

  // Espacement
  marginTop: {
    marginTop: 20,
  },

  marginBottom: {
    marginBottom: 20,
  },

  marginHorizontal: {
    marginHorizontal: 20,
  },

  marginVertical: {
    marginVertical: 10,
  },

  // Flexbox
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  column: {
    flexDirection: 'column',
  },

  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  spaceBetween: {
    justifyContent: 'space-between',
  },

  // Statuts
  statusAvailable: {
    backgroundColor: '#28a745',
    color: '#ffffff',
  },

  statusBusy: {
    backgroundColor: '#ffc107',
    color: '#000000',
  },

  statusOffline: {
    backgroundColor: '#dc3545',
    color: '#ffffff',
  },
});
