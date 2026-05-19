import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';

/**
 * ConnectivityBanner Component
 * Sprint 9: Shows network connectivity status with auto-sync indication
 * Displays a banner at the top when offline or when connection is restored
 */
const ConnectivityBanner = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable;
      
      // Show banner when connection changes
      if (connected !== isConnected) {
        setIsConnected(connected);
        setShowBanner(true);

        // Slide in banner
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }).start();

        // Auto-hide success banner after 3 seconds
        if (connected) {
          setTimeout(() => {
            hideBanner();
          }, 3000);
        }
      }
    });

    // Initial connectivity check
    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected && state.isInternetReachable);
    });

    return () => unsubscribe();
  }, [isConnected]);

  const hideBanner = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowBanner(false);
    });
  };

  if (!showBanner) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.banner,
        isConnected ? styles.onlineBanner : styles.offlineBanner,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Ionicons
        name={isConnected ? 'checkmark-circle' : 'cloud-offline'}
        size={20}
        color="#FFFFFF"
      />
      <Text style={styles.bannerText}>
        {isConnected
          ? '✅ Connected - Auto-sync enabled'
          : '⚠️ No internet connection - Changes saved locally'}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  onlineBanner: {
    backgroundColor: '#10B981',
  },
  offlineBanner: {
    backgroundColor: '#EF4444',
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ConnectivityBanner;
