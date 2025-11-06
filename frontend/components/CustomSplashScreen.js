import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Video } from 'expo-av';

const CustomSplashScreen = ({ onFinished }) => {
  const videoRef = useRef(null);
  const hasFinished = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasFinished.current) {
        hasFinished.current = true;
        onFinished();
      }
    }, 4500);

    return () => {
      clearTimeout(timer);
    };
  }, [onFinished]);

  const handleVideoFinish = () => {
    if (!hasFinished.current) {
      hasFinished.current = true;
      onFinished();
    }
  };

  return (
    <View style={styles.splashContainer}>
      <Video
        ref={videoRef}
        source={require('../assets/splash-video.mp4')}
        style={styles.splashVideo}
        resizeMode="contain"
        shouldPlay={true}
        isLooping={false}
        isMuted={false}
        useNativeControls={false}
        onPlaybackStatusUpdate={(status) => {
          if (status.didJustFinish && !hasFinished.current) {
            handleVideoFinish();
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashVideo: {
    width: '100%',
    height: '100%',
  },
});

export default CustomSplashScreen;

