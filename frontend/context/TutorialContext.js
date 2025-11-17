import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TutorialContext = createContext();

export const TutorialProvider = ({ children }) => {
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentPage, setCurrentPage] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const timerRef = useRef(null);

  // Le tutoriel ne démarre plus automatiquement ici
  // Il sera démarré depuis AccueilScreen quand le client est authentifié

  const startTutorial = (page = 'Accueil') => {
    setCurrentPage(page);
    setCurrentStep(0);
    setShowTutorial(true);
  };

  const nextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  };

  const goToPage = (page) => {
    setCurrentPage(page);
    setCurrentStep(0);
  };

  const closeTutorial = async () => {
    setShowTutorial(false);
    setCurrentPage(null);
    setCurrentStep(0);
  };

  const completeTutorial = async () => {
    try {
      // Ne plus sauvegarder le statut de complétion pour que le tutoriel s'affiche à chaque connexion
      // Le tutoriel s'affichera toujours au prochain démarrage
      setTutorialCompleted(false);
      setShowTutorial(false);
      setCurrentPage(null);
      setCurrentStep(0);
    } catch (error) {
      console.error('Erreur lors de la fermeture du tutoriel:', error);
    }
  };

  const resetTutorial = async () => {
    try {
      await AsyncStorage.removeItem('tutorial_completed');
      setTutorialCompleted(false);
      setShowTutorial(false);
      setCurrentPage(null);
      setCurrentStep(0);
    } catch (error) {
      console.error('Erreur lors de la réinitialisation du tutoriel:', error);
    }
  };

  return (
    <TutorialContext.Provider
      value={{
        showTutorial,
        currentPage,
        currentStep,
        tutorialCompleted,
        startTutorial,
        nextStep,
        prevStep,
        goToPage,
        closeTutorial,
        completeTutorial,
        resetTutorial,
        setCurrentStep,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};

