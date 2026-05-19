import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import AuthStack from './AuthStack';
import AppStack from './AppStack';
import autoSyncService from '../services/autoSyncService'; // ✅ Sprint 9 auto-sync

const RootNavigator = () => {
  const { isAuthenticated, loading, user } = useAuth();

  // ✅ Sprint 9: Initialize auto-sync service when authenticated
  useEffect(() => {
    if (isAuthenticated && user?.salesman_id) {
      autoSyncService.initialize(user.salesman_id);
      console.log('✅ Auto-sync service initialized for salesman:', user.salesman_id);
      
      return () => {
        autoSyncService.cleanup();
        console.log('🧹 Auto-sync service cleaned up');
      };
    }
  }, [isAuthenticated, user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return isAuthenticated ? <AppStack /> : <AuthStack />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});

export default RootNavigator;
