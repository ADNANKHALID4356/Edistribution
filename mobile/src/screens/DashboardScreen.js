import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Text, Alert } from 'react-native';
import { Card, Button, Appbar, Divider, Avatar, ProgressBar, Badge } from 'react-native-paper';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import productService from '../services/productService';
import syncService from '../services/syncService';
import dashboardService from '../services/dashboardService';
import dbHelper from '../database/dbHelper';

const DashboardScreen = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  
  // Basic stats
  const [productCount, setProductCount] = useState(0);
  const [shopCount, setShopCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [unsyncedOrderCount, setUnsyncedOrderCount] = useState(0);
  const [syncingOrders, setSyncingOrders] = useState(false);

  // Sprint 4: Salesman dashboard stats
  const [salesmanStats, setSalesmanStats] = useState(null);
  const [isSalesman, setIsSalesman] = useState(false);

  const statsData = [
    { title: 'Total Products', value: productCount.toString(), icon: 'package-variant', color: '#0ea5e9', screen: 'ProductList' },
    { title: 'Total Shops', value: shopCount.toString(), icon: 'storefront', color: '#ec4899', screen: 'ShopListing' },
    { title: 'Active Orders', value: orderCount.toString(), icon: 'cart', color: '#10b981', screen: 'ShopListing' },
    { title: 'Pending Payments', value: '0', icon: 'currency-usd', color: '#f59e0b', screen: null },
  ];

  // Load data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      // Database already initialized in AuthContext - no need to init here

      // Check if user is a salesman (role_id = 3)
      const userIsSalesman = user?.role_id === 3;
      setIsSalesman(userIsSalesman);

      // Get product count
      const count = await productService.getProductsCount();
      setProductCount(count);

      // Get shop count
      const shops = await dbHelper.getShopsCount();
      setShopCount(shops);

      // Sprint 5: Get order count for current salesman
      if (userIsSalesman) {
        try {
          const salesmanId = user.salesman_id || user.id;
          console.log('🔍 [DASHBOARD] Loading order stats for salesman:', salesmanId);
          const orderStats = await dbHelper.getOrderStats(salesmanId);
          console.log(`✅ [DASHBOARD] Order stats:`, orderStats);
          setOrderCount(orderStats.total_orders || 0);
        } catch (error) {
          console.error('❌ [DASHBOARD] Error loading order stats:', error.message);
          setOrderCount(0);
        }
      } else {
        setOrderCount(0);
      }

      // Sprint 4: Load salesman dashboard stats if user is salesman
      if (userIsSalesman) {
        try {
          const stats = await dashboardService.getDashboardStats();
          setSalesmanStats(stats);
          // Update shop count with route-specific count
          setShopCount(stats.shop_count);
        } catch (error) {
          setSalesmanStats(null);
        }
      }

      // Get sync status
      const status = await syncService.getSyncStatus();
      setSyncStatus(status);

      // Get last sync time for products
      const lastSync = await syncService.getLastSyncTime('products');
      setLastSyncTime(lastSync);

      // Sprint 5: Get unsynced orders count for salesman
      if (userIsSalesman) {
        try {
          // Only get unsynced orders for current salesman (multi-tenancy)
          const salesmanId = user.salesman_id || user.id;
          console.log('🔍 [DASHBOARD] Loading unsynced orders for salesman:', salesmanId);
          
          if (!salesmanId) {
            console.error('❌ [DASHBOARD] Cannot load unsynced orders - salesmanId is null');
            setUnsyncedOrderCount(0);
          } else {
            const unsyncedOrders = await dbHelper.getUnsyncedOrders(salesmanId);
            console.log(`✅ [DASHBOARD] Found ${unsyncedOrders.length} unsynced orders`);
            setUnsyncedOrderCount(unsyncedOrders.length);
          }
        } catch (error) {
          console.error('❌ [DASHBOARD] Error loading unsynced orders:', error.message);
          setUnsyncedOrderCount(0);
        }
      }
    } catch (error) {
      // Silent fail - dashboard will show with available data
    }
  };

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, []);

  // Handle sync
  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncService.syncAll(true);
      
      if (result.success) {
        await loadDashboardData();
        alert(`Sync complete!\nProducts: ${result.products?.total || 0}\nSuppliers: ${result.suppliers?.total || 0}\nRoutes: ${result.routes?.total || 0}\nShops: ${result.shops?.total || 0}`);
      } else {
        alert('Sync failed. Please try again.');
      }
    } catch (error) {
      alert('Sync error. Please check your connection.');
    } finally {
      setSyncing(false);
    }
  };

  // Sprint 5: Handle sync orders to backend
  const handleSyncOrders = async () => {
    // Check internet connectivity
    const netInfo = await NetInfo.fetch();
    
    if (!netInfo.isConnected) {
      Alert.alert(
        'No Internet Connection',
        'Please connect to WiFi or mobile data to sync orders.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (unsyncedOrderCount === 0) {
      Alert.alert(
        'No Orders to Sync',
        'All orders are already synced to the server.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Sync Orders',
      `Sync ${unsyncedOrderCount} order(s) to server?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sync Now', 
          onPress: async () => {
            setSyncingOrders(true);
            try {
              // Pass salesman_id for multi-tenancy filtering
              const salesmanId = user.salesman_id || user.id;
              
              if (!salesmanId) {
                Alert.alert('Error', 'User ID not found. Please log out and log in again.');
                return;
              }
              
              const result = await syncService.syncOrders(salesmanId, {
                deviceId: 'dashboard-sync',
                os: 'mobile',
                appVersion: '1.0.0',
              });
              
              if (result.success) {
                await loadDashboardData();
                // ✅ Sprint 9 enhancement: Success haptic feedback
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert(
                  'Success!',
                  `${result.synced} order(s) synced successfully!`,
                  [{ text: 'OK' }]
                );
              } else {
                // ✅ Sprint 9 enhancement: Error haptic feedback
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert(
                  'Sync Failed',
                  result.message || 'Some orders could not be synced. Please try again.',
                  [{ text: 'OK' }]
                );
              }
            } catch (error) {
              console.error('❌ [DASHBOARD] Order sync error:', error.message);
              console.error('❌ [DASHBOARD] Error stack:', error.stack);
              // ✅ Sprint 9 enhancement: Error haptic feedback
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert(
                'Error',
                `Failed to sync orders: ${error.message}. Please check your connection and try again.`,
                [{ text: 'OK' }]
              );
            } finally {
              setSyncingOrders(false);
            }
          }
        }
      ]
    );
  };

  // Clear all cached orders (for testing/cleanup)
  const handleClearOrders = async () => {
    Alert.alert(
      '⚠️ Clear All Orders',
      'This will permanently delete ALL orders from your device (synced and unsynced). Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All Orders', 
          style: 'destructive',
          onPress: async () => {
            try {
              await dbHelper.clearAllOrders();
              await loadDashboardData();
              Alert.alert(
                '✓ Success',
                'All orders have been cleared from your device.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              Alert.alert(
                'Error',
                'Failed to clear orders. Please try again.',
                [{ text: 'OK' }]
              );
            }
          }
        }
      ]
    );
  };

  // Navigate to stat screen
  const handleStatPress = (stat) => {
    if (stat.screen) {
      navigation.navigate(stat.screen);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header elevated>
        <Appbar.Content title="Dashboard" />
        <Appbar.Action icon="sync" onPress={handleSync} disabled={syncing} />
        <Appbar.Action icon="logout" onPress={logout} />
      </Appbar.Header>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* User Info Card */}
        <Card style={styles.userCard}>
          <Card.Content>
            <View style={styles.userInfo}>
              <Avatar.Text 
                size={60} 
                label={user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'} 
                style={styles.avatar}
              />
              <View style={styles.userDetails}>
                <Text style={styles.userName}>
                  {user?.full_name || 'User'}
                </Text>
                <Text style={styles.userRole}>
                  {user?.role_name || 'Role'}
                </Text>
                <Text style={styles.userEmail}>
                  {user?.email || ''}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Sprint 4: Salesman Route & Target Info */}
        {isSalesman && salesmanStats && (
          <Card style={styles.targetCard}>
            <Card.Content>
              <View style={styles.targetHeader}>
                <Text style={styles.targetTitle}>📍 {salesmanStats.route_name}</Text>
                <Text style={styles.targetSubtitle}>
                  {salesmanStats.salesman_code}
                </Text>
              </View>
              
              <Divider style={styles.divider} />
              
              {/* Monthly Target Progress */}
              <View style={styles.targetSection}>
                <View style={styles.targetRow}>
                  <Text style={styles.targetLabel}>Monthly Target</Text>
                  <Text style={styles.targetValue}>
                    PKR {salesmanStats.monthly_target.toLocaleString()}
                  </Text>
                </View>
                
                <View style={styles.targetRow}>
                  <Text style={styles.targetLabel}>Achieved</Text>
                  <Text style={[styles.targetValue, styles.successText]}>
                    PKR {salesmanStats.achieved_sales.toLocaleString()}
                  </Text>
                </View>
                
                <View style={styles.targetRow}>
                  <Text style={styles.targetLabel}>Remaining</Text>
                  <Text style={[styles.targetValue, styles.warningText]}>
                    PKR {salesmanStats.remaining_target.toLocaleString()}
                  </Text>
                </View>
                
                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <Text style={styles.progressLabel}>
                    Progress: {salesmanStats.target_progress}%
                  </Text>
                  <ProgressBar 
                    progress={salesmanStats.target_progress / 100} 
                    color={salesmanStats.is_target_achieved ? '#10b981' : '#0ea5e9'}
                    style={styles.progressBar}
                  />
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Sync Status Card */}
        {lastSyncTime && (
          <Card style={styles.syncCard}>
            <Card.Content>
              <View style={styles.syncInfo}>
                <Text style={styles.syncText}>
                  🔄 Last synced: {syncService.formatSyncTime(lastSyncTime)}
                </Text>
                {syncing ? (
                  <ActivityIndicator size="small" color="#0ea5e9" />
                ) : (
                  <Button 
                    mode="outlined" 
                    onPress={handleSync}
                    compact
                    style={styles.syncButton}
                  >
                    Sync Now
                  </Button>
                )}
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Sprint 5: Sync Orders Card - Only for Salesman */}
        {isSalesman && (
          <Card style={styles.syncOrdersCard}>
            <Card.Content>
              <View style={styles.syncOrdersHeader}>
                <View style={styles.syncOrdersTitle}>
                  <Text style={styles.syncOrdersText}>📦 Sync Orders to Server</Text>
                  {unsyncedOrderCount > 0 && (
                    <Badge style={styles.badge}>{unsyncedOrderCount}</Badge>
                  )}
                </View>
                {unsyncedOrderCount > 0 && (
                  <Text style={styles.syncOrdersSubtext}>
                    {unsyncedOrderCount} order(s) pending sync
                  </Text>
                )}
              </View>
              
              <Button 
                mode="contained" 
                onPress={handleSyncOrders}
                disabled={syncingOrders || unsyncedOrderCount === 0}
                loading={syncingOrders}
                icon="cloud-upload"
                style={styles.syncOrdersButton}
                contentStyle={styles.syncOrdersButtonContent}
              >
                {syncingOrders ? 'Syncing...' : unsyncedOrderCount === 0 ? 'All Synced ✓' : 'Sync Orders'}
              </Button>
              
              {/* Clear Orders Button for Testing */}
              <Button 
                mode="outlined" 
                onPress={handleClearOrders}
                icon="delete-sweep"
                style={[styles.syncOrdersButton, { marginTop: 8 }]}
                buttonColor="#fee"
                textColor="#c00"
              >
                Clear All Orders
              </Button>
              
              {unsyncedOrderCount === 0 && (
                <Text style={styles.allSyncedText}>
                  ✓ All orders are synced to the server
                </Text>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Welcome Banner */}
        <Card style={styles.welcomeCard}>
          <Card.Content>
            <Text style={styles.welcomeTitle}>
              Welcome to Distribution System 👋
            </Text>
            <Text style={styles.welcomeText}>
              Sprint 4 - Salesman Management & Dashboard Metrics
            </Text>
          </Card.Content>
        </Card>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {statsData.map((stat, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleStatPress(stat)}
              disabled={!stat.screen}
              activeOpacity={0.7}
              style={styles.statCardWrapper}
            >
              <Card style={styles.statCard}>
                <Card.Content style={styles.statCardContent}>
                  <View style={[styles.statIconContainer, { backgroundColor: stat.color + '20' }]}>
                    <Text style={styles.statIconText}>
                      {stat.icon === 'package-variant' && '📦'}
                      {stat.icon === 'storefront' && '🏪'}
                      {stat.icon === 'cart' && '�'}
                      {stat.icon === 'currency-usd' && '�'}
                    </Text>
                  </View>
                  <View style={styles.statTextContainer}>
                    <Text style={styles.statValueText}>
                      {stat.value}
                    </Text>
                    <Text style={styles.statTitleText} numberOfLines={2}>
                      {stat.title}
                    </Text>
                  </View>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <Card style={styles.actionsCard}>
          <Card.Content>
            <Text style={styles.actionsTitle}>
              Quick Actions
            </Text>
            <Divider style={styles.divider} />
            <Button 
              mode="contained" 
              onPress={() => navigation.navigate('ProductList')}
              style={styles.actionButton}
              icon="package-variant"
              buttonColor="#0ea5e9"
            >
              View Products
            </Button>
            <Button 
              mode="contained" 
              onPress={() => navigation.navigate('ShopListing')}
              style={styles.actionButton}
              icon="storefront"
              buttonColor="#ec4899"
            >
              View Shops
            </Button>
            <Button 
              mode="outlined" 
              onPress={() => navigation.navigate('QuickOrder')}
              style={styles.actionButton}
              icon="cart"
            >
              Create Order
            </Button>
            <Button 
              mode="outlined" 
              onPress={() => navigation.navigate('OrdersList')}
              style={styles.actionButton}
              icon="clipboard-list"
            >
              View Orders
            </Button>
          </Card.Content>
        </Card>

        {/* Logout Button */}
        <Button 
          mode="contained" 
          onPress={logout}
          style={styles.logoutButton}
          icon="logout"
          buttonColor="#ef4444"
        >
          Logout
        </Button>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  userCard: {
    marginBottom: 16,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#0ea5e9',
  },
  userDetails: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  userRole: {
    fontSize: 16,
    color: '#0ea5e9',
    fontWeight: '600',
    marginTop: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  syncCard: {
    marginBottom: 16,
    elevation: 2,
  },
  syncInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncText: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  syncButton: {
    marginLeft: 8,
  },
  welcomeCard: {
    marginBottom: 16,
    backgroundColor: '#0ea5e9',
    elevation: 2,
  },
  welcomeTitle: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: '#e0f2fe',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCardWrapper: {
    width: '48%',
    marginBottom: 12,
  },
  statCard: {
    elevation: 2,
    backgroundColor: '#ffffff',
  },
  statCardContent: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIconText: {
    fontSize: 24,
  },
  statTextContainer: {
    alignItems: 'flex-start',
  },
  statValueText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statTitleText: {
    fontSize: 12,
    color: '#6b7280',
    flexWrap: 'wrap',
  },
  actionsCard: {
    marginBottom: 16,
    elevation: 2,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  actionButton: {
    marginTop: 12,
  },
  infoCard: {
    marginBottom: 16,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  featureList: {
    marginLeft: 8,
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  infoFooter: {
    fontSize: 14,
    color: '#0ea5e9',
    fontWeight: '600',
  },
  logoutButton: {
    marginBottom: 24,
  },
  // Sprint 4: Salesman Target Styles
  targetCard: {
    marginBottom: 16,
    elevation: 2,
    backgroundColor: '#ffffff',
  },
  targetHeader: {
    marginBottom: 8,
  },
  targetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  targetSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  targetSection: {
    marginTop: 8,
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  targetLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  targetValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  successText: {
    color: '#10b981',
  },
  warningText: {
    color: '#f59e0b',
  },
  progressContainer: {
    marginTop: 16,
  },
  progressLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
  },
  // Sprint 5: Sync Orders Styles
  syncOrdersCard: {
    marginBottom: 16,
    elevation: 3,
    backgroundColor: '#ffffff',
    borderLeftWidth: 4,
    borderLeftColor: '#0ea5e9',
  },
  syncOrdersHeader: {
    marginBottom: 16,
  },
  syncOrdersTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  syncOrdersText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginRight: 8,
  },
  badge: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
  },
  syncOrdersSubtext: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  syncOrdersButton: {
    borderRadius: 8,
    elevation: 2,
  },
  syncOrdersButtonContent: {
    paddingVertical: 4,
  },
  allSyncedText: {
    fontSize: 13,
    color: '#10b981',
    marginTop: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default DashboardScreen;
