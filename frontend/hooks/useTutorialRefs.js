import { useState, useCallback } from 'react';

// Stockage global des refs pour le tutoriel
let tutorialRefsStore = {};

export const useTutorialRefs = () => {
  const registerRef = useCallback((name, ref) => {
    tutorialRefsStore[name] = ref;
  }, []);

  const unregisterRef = useCallback((name) => {
    delete tutorialRefsStore[name];
  }, []);

  const getRefs = useCallback(() => {
    return tutorialRefsStore;
  }, []);

  return { registerRef, unregisterRef, getRefs };
};

// Fonction pour obtenir toutes les refs (utilisée par GlobalTutorial)
export const getTutorialRefs = () => {
  return tutorialRefsStore;
};

