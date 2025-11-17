import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTutorial } from '../context/TutorialContext';
import { useTutorialRefs } from './useTutorialRefs';

// Hook pour enregistrer automatiquement les refs quand on change de page
export const useNavigationTutorial = (pageName, refs) => {
  const navigation = useNavigation();
  const { currentPage, showTutorial } = useTutorial();
  const { registerRef, unregisterRef } = useTutorialRefs();

  useEffect(() => {
    // Enregistrer toutes les refs pour cette page
    if (refs && typeof refs === 'object') {
      Object.keys(refs).forEach(refName => {
        if (refs[refName]) {
          registerRef(refName, refs[refName]);
        }
      });
    }

    return () => {
      // Désenregistrer les refs quand on quitte la page
      if (refs && typeof refs === 'object') {
        Object.keys(refs).forEach(refName => {
          unregisterRef(refName);
        });
      }
    };
  }, [refs, registerRef, unregisterRef]);

  // Détecter les changements de page et mettre à jour le tutoriel
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Si le tutoriel est actif et qu'on est sur cette page, mettre à jour les refs
      if (showTutorial && currentPage === pageName) {
        // Les refs seront automatiquement mises à jour via le useEffect ci-dessus
      }
    });

    return unsubscribe;
  }, [navigation, showTutorial, currentPage, pageName]);
};

