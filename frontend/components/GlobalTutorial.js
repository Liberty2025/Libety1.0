import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTutorial } from '../context/TutorialContext';
import { getTutorialRefs } from '../hooks/useTutorialRefs';

const { width, height } = Dimensions.get('window');

// Configuration des étapes de tutoriel pour chaque page
const tutorialConfig = {
  Accueil: [
    {
      title: 'Transport Rapide',
      description: 'Appuyez ici si vous voulez transporter un article rapidement. Cette option envoie votre demande à tous les déménageurs disponibles.',
      icon: 'flash',
      refName: 'quickTransportButton',
    },
    {
      title: 'Liste des déménageurs',
      description: 'Cette liste affiche tous les déménageurs disponibles, triés par distance. Appuyez sur un déménageur pour créer une demande personnalisée.',
      icon: 'list',
      refName: 'demenageurList',
      position: 'top',
    },
    {
      title: 'Bouton de liste',
      description: 'Si la liste est cachée, appuyez ici pour l\'afficher à nouveau et voir tous les déménageurs disponibles.',
      icon: 'list',
      refName: 'showListButton',
    },
    {
      title: 'Navigation',
      description: 'Utilisez les onglets en bas pour naviguer entre les différentes sections de l\'application.',
      icon: 'apps',
      refName: 'tabBar',
      position: 'top',
    },
  ],
  Suivre: [
    {
      title: 'Vos demandes',
      description: 'Cette liste affiche toutes vos demandes de service avec leur statut. Appuyez sur une demande pour voir les détails.',
      icon: 'list',
      refName: 'requestsList',
    },
    {
      title: 'Négocier le prix',
      description: 'Si un déménageur a proposé un prix, vous pouvez négocier en appuyant sur ce bouton.',
      icon: 'cash',
      refName: 'negotiateButton',
    },
    {
      title: 'Détails de la demande',
      description: 'Appuyez sur une demande pour voir tous les détails et suivre son évolution.',
      icon: 'information-circle',
      refName: 'detailsButton',
    },
  ],
  Chat: [
    {
      title: 'Liste des conversations',
      description: 'Ici vous pouvez voir toutes vos conversations avec les déménageurs. Appuyez sur une conversation pour l\'ouvrir.',
      icon: 'chatbubbles',
      refName: 'chatsList',
    },
    {
      title: 'Envoyer un message',
      description: 'Tapez votre message ici et appuyez sur le bouton d\'envoi pour communiquer avec le déménageur.',
      icon: 'send',
      refName: 'messageInput',
    },
  ],
  Notification: [
    {
      title: 'Vos notifications',
      description: 'Ici vous pouvez voir toutes vos notifications concernant vos demandes de service.',
      icon: 'notifications',
      refName: 'notificationsList',
    },
    {
      title: 'Effacer toutes les notifications',
      description: 'Appuyez ici pour marquer toutes les notifications comme lues et les effacer.',
      icon: 'trash',
      refName: 'clearButton',
    },
  ],
  Profil: [
    {
      title: 'Modifier le profil',
      description: 'Appuyez ici pour modifier vos informations personnelles (nom, téléphone, adresse).',
      icon: 'create',
      refName: 'editButton',
    },
    {
      title: 'Changer le mot de passe',
      description: 'Utilisez cette option pour changer votre mot de passe de connexion.',
      icon: 'lock-closed',
      refName: 'changePasswordButton',
    },
    {
      title: 'Guide d\'utilisation',
      description: 'Accédez au guide complet pour apprendre à utiliser toutes les fonctionnalités de l\'application.',
      icon: 'help-circle',
      refName: 'guideButton',
    },
  ],
};

const GlobalTutorial = () => {
  const {
    showTutorial,
    currentPage,
    currentStep,
    nextStep,
    prevStep,
    closeTutorial,
    completeTutorial,
    goToPage,
  } = useTutorial();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [currentTarget, setCurrentTarget] = useState(null);

  useEffect(() => {
    if (showTutorial && currentPage) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // Attendre un peu pour que les éléments soient rendus
      const timer = setTimeout(() => {
        updateTarget();
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      setCurrentTarget(null);
    }
  }, [showTutorial, currentPage, currentStep]);

  const updateTarget = () => {
    if (!currentPage) {
      setCurrentTarget(null);
      return;
    }
    
    const refs = getTutorialRefs();
    const steps = tutorialConfig[currentPage];
    
    if (!steps || steps.length === 0) {
      setCurrentTarget(null);
      return;
    }

    const step = steps[currentStep];
    if (!step) {
      setCurrentTarget(null);
      return;
    }

    const ref = refs[step.refName];
    if (!ref?.current) {
      // Réessayer plusieurs fois si la ref n'est pas encore disponible
      let retryCount = 0;
      const maxRetries = 5;
      
      const retryInterval = setInterval(() => {
        retryCount++;
        const retryRefs = getTutorialRefs();
        const retryRef = retryRefs[step.refName];
        
        if (retryRef?.current) {
          clearInterval(retryInterval);
          retryRef.current.measure((x, y, width, height, pageX, pageY) => {
            setCurrentTarget({
              x: pageX,
              y: pageY,
              width,
              height,
              position: step.position || 'bottom',
            });
          });
        } else if (retryCount >= maxRetries) {
          clearInterval(retryInterval);
          // Si la ref n'est toujours pas disponible après plusieurs tentatives,
          // afficher quand même le tutoriel sans cible spécifique
          setCurrentTarget(null);
        }
      }, 500);
      
      return () => clearInterval(retryInterval);
    }

    try {
      ref.current.measure((x, y, width, height, pageX, pageY) => {
        setCurrentTarget({
          x: pageX,
          y: pageY,
          width,
          height,
          position: step.position || 'bottom',
        });
      });
    } catch (error) {
      console.error('Erreur lors de la mesure de l\'élément:', error);
      setCurrentTarget(null);
    }
  };

  // Debug: vérifier l'état du tutoriel
  useEffect(() => {
    console.log('🎓 GlobalTutorial - État:', {
      showTutorial,
      currentPage,
      currentStep,
      hasSteps: tutorialConfig[currentPage]?.length || 0
    });
  }, [showTutorial, currentPage, currentStep]);

  if (!showTutorial || !currentPage) {
    return null;
  }

  const steps = tutorialConfig[currentPage] || [];
  if (steps.length === 0) {
    // Si pas d'étapes configurées pour cette page, passer à la suivante ou terminer
    const pages = Object.keys(tutorialConfig);
    const currentIndex = pages.indexOf(currentPage);
    if (currentIndex < pages.length - 1) {
      // Passer automatiquement à la page suivante après un court délai
      setTimeout(() => {
        goToPage(pages[currentIndex + 1]);
      }, 1000);
    } else {
      // Si c'est la dernière page, fermer le tutoriel
      setTimeout(() => {
        closeTutorial();
      }, 1000);
    }
    return null;
  }

  const step = steps[currentStep];
  if (!step) {
    return null;
  }
  
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      // Si c'est la dernière étape de la page, passer à la page suivante ou terminer
      const pages = Object.keys(tutorialConfig);
      const currentIndex = pages.indexOf(currentPage);
      if (currentIndex < pages.length - 1) {
        goToPage(pages[currentIndex + 1]);
      } else {
        completeTutorial();
      }
    } else {
      nextStep();
    }
  };

  const handlePrev = () => {
    if (isFirstStep) {
      // Si c'est la première étape, revenir à la page précédente
      const pages = Object.keys(tutorialConfig);
      const currentIndex = pages.indexOf(currentPage);
      if (currentIndex > 0) {
        goToPage(pages[currentIndex - 1]);
        // Aller à la dernière étape de la page précédente
        const prevSteps = tutorialConfig[pages[currentIndex - 1]];
        if (prevSteps) {
          // Le setCurrentStep sera géré par goToPage qui remet à 0, donc on doit le faire manuellement
          setTimeout(() => {
            // Cette logique sera gérée différemment
          }, 0);
        }
      }
    } else {
      prevStep();
    }
  };

  // Afficher le tutoriel même si currentTarget n'est pas encore disponible
  // Le tooltip sera centré si pas de cible
  if (!step) return null;

  const getTooltipPosition = () => {
    // Si pas de cible, centrer le tooltip
    if (!currentTarget) {
      return { 
        top: height / 2 - 120, 
        left: width / 2 - 150,
        arrowPosition: 'bottom'
      };
    }

    const tooltipHeight = 180; // Hauteur approximative du tooltip
    const tooltipWidth = 300;
    const spacing = 15;
    let top, left;
    let arrowPosition = currentTarget.position || 'bottom';

    if (arrowPosition === 'top') {
      // Positionner le tooltip au-dessus de l'élément
      top = currentTarget.y - tooltipHeight - spacing - 20; // Espace pour la flèche
      left = Math.max(10, Math.min(
        currentTarget.x + (currentTarget.width / 2) - (tooltipWidth / 2),
        width - tooltipWidth - 10
      ));
      
      // Si le tooltip sort en haut, le mettre en dessous
      if (top < 50) {
        top = currentTarget.y + currentTarget.height + spacing + 20;
        arrowPosition = 'bottom'; // Changer la position pour la flèche
      }
    } else if (arrowPosition === 'right') {
      top = currentTarget.y + (currentTarget.height / 2) - (tooltipHeight / 2);
      left = currentTarget.x + currentTarget.width + spacing;
      // Si sort à droite, mettre à gauche
      if (left + tooltipWidth > width - 10) {
        left = currentTarget.x - tooltipWidth - spacing;
        arrowPosition = 'left';
      }
    } else if (arrowPosition === 'left') {
      top = currentTarget.y + (currentTarget.height / 2) - (tooltipHeight / 2);
      left = currentTarget.x - tooltipWidth - spacing;
      // Si sort à gauche, mettre à droite
      if (left < 10) {
        left = currentTarget.x + currentTarget.width + spacing;
        arrowPosition = 'right';
      }
    } else {
      // bottom (par défaut)
      top = currentTarget.y + currentTarget.height + spacing + 20;
      left = Math.max(10, Math.min(
        currentTarget.x + (currentTarget.width / 2) - (tooltipWidth / 2),
        width - tooltipWidth - 10
      ));
      
      // Si le tooltip sort en bas, le mettre au-dessus
      if (top + tooltipHeight > height - 100) {
        top = currentTarget.y - tooltipHeight - spacing - 20;
        arrowPosition = 'top';
      }
    }
    
    // Ajustements finaux pour rester dans l'écran
    top = Math.max(50, Math.min(top, height - tooltipHeight - 100));
    left = Math.max(10, Math.min(left, width - tooltipWidth - 10));

    return { top, left, arrowPosition };
  };

  const { top, left, arrowPosition } = getTooltipPosition();

  return (
    <Modal
      visible={showTutorial}
      transparent={true}
      animationType="fade"
      onRequestClose={closeTutorial}
    >
      <View style={styles.overlay}>
        {/* Zone sombre avec trou pour l'élément ciblé */}
        {currentTarget ? (
          <>
            {/* Overlay sombre en haut */}
            {currentTarget.y > 0 && (
              <View style={[styles.darkOverlay, { 
                top: 0, 
                left: 0, 
                right: 0, 
                height: currentTarget.y - 10 
              }]} />
            )}
            
            {/* Overlay sombre à gauche */}
            {currentTarget.x > 0 && (
              <View style={[styles.darkOverlay, { 
                top: currentTarget.y - 10, 
                left: 0, 
                width: currentTarget.x - 10, 
                height: currentTarget.height + 20 
              }]} />
            )}
            
            {/* Overlay sombre à droite */}
            {currentTarget.x + currentTarget.width < width && (
              <View style={[styles.darkOverlay, { 
                top: currentTarget.y - 10, 
                left: currentTarget.x + currentTarget.width + 10, 
                right: 0, 
                height: currentTarget.height + 20 
              }]} />
            )}
            
            {/* Overlay sombre en bas */}
            {currentTarget.y + currentTarget.height < height && (
              <View style={[styles.darkOverlay, { 
                top: currentTarget.y + currentTarget.height + 10, 
                left: 0, 
                right: 0, 
                bottom: 0 
              }]} />
            )}
            
            {/* Bordure de mise en évidence autour de l'élément */}
            <View
              style={[
                styles.highlight,
                {
                  top: currentTarget.y - 10,
                  left: currentTarget.x - 10,
                  width: currentTarget.width + 20,
                  height: currentTarget.height + 20,
                }
              ]}
            />
          </>
        ) : (
          <View style={styles.fullOverlay} />
        )}

        {/* Tooltip avec flèche - afficher même si pas de cible */}
        <Animated.View
          style={[
            styles.tooltipContainer,
            currentTarget ? {
              top,
              left,
            } : {
              top: height / 2 - 100,
              left: width / 2 - 150,
            },
            {
              opacity: fadeAnim,
            }
          ]}
        >
          <View style={styles.tooltip}>
            {/* Flèche - seulement si on a une cible */}
            {currentTarget && (
              <View style={[
                styles.arrow,
                arrowPosition === 'bottom' && styles.arrowUp,
                arrowPosition === 'top' && styles.arrowDown,
                arrowPosition === 'right' && styles.arrowLeft,
                arrowPosition === 'left' && styles.arrowRight,
              ]} />
            )}
            
            <View style={styles.tooltipContent}>
              <View style={styles.tooltipHeader}>
                {step.icon && <Ionicons name={step.icon} size={24} color="#ff6b35" />}
                <Text style={styles.tooltipTitle}>{step.title}</Text>
              </View>
              <Text style={styles.tooltipText}>{step.description}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Indicateur de progression et navigation */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.skipButton} onPress={closeTutorial}>
            <Text style={styles.skipButtonText}>Passer</Text>
          </TouchableOpacity>

          <View style={styles.pageIndicator}>
            <Text style={styles.pageText}>{currentPage}</Text>
            <View style={styles.stepIndicator}>
              {steps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.stepDot,
                    index === currentStep && styles.stepDotActive
                  ]}
                />
              ))}
            </View>
          </View>

          <View style={styles.navigationButtons}>
            {!isFirstStep && (
              <TouchableOpacity
                style={styles.navButton}
                onPress={handlePrev}
              >
                <Ionicons name="chevron-back" size={20} color="#ffffff" />
                <Text style={styles.navButtonText}>Précédent</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.navButton, styles.navButtonPrimary]}
              onPress={handleNext}
            >
              <Text style={styles.navButtonText}>
                {isLastStep ? (currentPage === 'Profil' ? 'Terminer' : 'Page suivante') : 'Suivant'}
              </Text>
              {!isLastStep && <Ionicons name="chevron-forward" size={20} color="#ffffff" />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  fullOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  darkOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  highlight: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#ff6b35',
    shadowColor: '#ff6b35',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 25,
    elevation: 15,
    zIndex: 100,
  },
  tooltipContainer: {
    position: 'absolute',
    width: 300,
    zIndex: 2000,
  },
  tooltip: {
    backgroundColor: '#1a0d2e',
    borderRadius: 15,
    padding: 18,
    borderWidth: 2,
    borderColor: '#ff6b35',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 20,
    minHeight: 140,
  },
  arrow: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
  arrowUp: {
    top: -14,
    left: '50%',
    marginLeft: -14,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#ff6b35',
    zIndex: 1,
  },
  arrowDown: {
    bottom: -14,
    left: '50%',
    marginLeft: -14,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#ff6b35',
    zIndex: 1,
  },
  arrowLeft: {
    left: -12,
    top: '50%',
    marginTop: -12,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderRightWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: '#ff6b35',
  },
  arrowRight: {
    right: -12,
    top: '50%',
    marginTop: -12,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderLeftWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#ff6b35',
  },
  tooltipContent: {
    alignItems: 'center',
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 10,
  },
  tooltipText: {
    fontSize: 14,
    color: '#e0e0e0',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1500,
  },
  skipButton: {
    position: 'absolute',
    top: -40,
    right: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  skipButtonText: {
    color: '#8e8e93',
    fontSize: 14,
    fontWeight: '600',
  },
  pageIndicator: {
    alignItems: 'center',
    marginBottom: 15,
  },
  pageText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  stepDotActive: {
    backgroundColor: '#ff6b35',
    width: 24,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  navButtonPrimary: {
    backgroundColor: '#ff6b35',
  },
  navButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 5,
  },
});

export default GlobalTutorial;

