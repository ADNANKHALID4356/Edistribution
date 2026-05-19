/**
 * Shop Listing Screen
 * Distribution Management System
 * Company: Ummahtechinnovations.com
 * 
 * Purpose: Display list of shops with hybrid online/offline capability
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import shopService from '../services/shopService';
import routeService from '../services/routeService';
import syncService from '../services/syncService';
import { useFocusEffect } from '@react-navigation/native';
import { useToast } from '../context/ToastContext';

const ShopListingScreen = ({ navigation }) => {
  const { showToast } = useToast();
  const [shops, setShops] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');
  const [filteredShops, setFilteredShops] = useState([]);

  // Load initial data
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get current user's route_id for filtering (salesman isolation)
      const userStr = await AsyncStorage.getItem('user');
      let userRouteId = null;
      if (userStr) {
        const user = JSON.parse(userStr);
        // If user is salesman (role_id = 3), filter by their route
        if (user.role_id === 3) {
          const salesmanStr = await AsyncStorage.getItem('salesman');
          if (salesmanStr) {
            const salesman = JSON.parse(salesmanStr);
            userRouteId = salesman.route_id;
            console.log(`🔒 [ISOLATION] Filtering shops for salesman's route: ${userRouteId}`);
          }
        }
      }
      
      // Load routes (hybrid mode: server first, then cache)
      const routesData = await routeService.getRoutes();
      setRoutes(routesData);
      
      // Load shops (hybrid mode: server first, then cache)
      // Apply route filter for salesman isolation
      const filters = userRouteId ? { routeId: userRouteId } : {};
      const shopsData = await shopService.getShops(filters);
      setShops(shopsData);
      setFilteredShops(shopsData);
      
      // Check if data is empty and suggest sync
      if (shopsData.length === 0) {
        Alert.alert(
          'No Shops Found',
          'Would you like to sync data from the server?',
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Sync Now', onPress: handleSync },
          ]
        );
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert(
        'Data Loading Issue',
        'Unable to load shops. Please check your connection and try again.',
        [
          { text: 'OK' },
          { text: 'Retry', onPress: loadData }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setRefreshing(true);
      
      // Force refresh from server
      const routesResult = await routeService.forceRefresh();
      const shopsResult = await shopService.forceRefresh();
      
      if (routesResult.success && shopsResult.success) {
        showToast(`Synced ${shopsResult.count} shops successfully`, 'success');
        await loadData();
      } else if (routesResult.fromCache || shopsResult.fromCache) {
        showToast('Offline Mode: No internet connection. Showing cached data.', 'info');
        await loadData();
      } else {
        showToast('Sync Error: Failed to sync data from server. Showing cached data.', 'error');
        await loadData();
      }
    } catch (error) {
      console.error('Sync error:', error);
      showToast('Sync Failed: Unable to connect to server. Using cached data.', 'error');
      await loadData(); // Load cached data
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    handleSync();
  };

  // Filter shops based on search and route
  useEffect(() => {
    let filtered = [...shops];

    // Filter by route
    if (selectedRoute) {
      filtered = filtered.filter(shop => shop.route_id === parseInt(selectedRoute));
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        shop =>
          shop.shop_name?.toLowerCase().includes(query) ||
          shop.owner_name?.toLowerCase().includes(query) ||
          shop.phone?.includes(query) ||
          shop.shop_code?.toLowerCase().includes(query)
      );
    }

    setFilteredShops(filtered);
  }, [searchQuery, selectedRoute, shops]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getCreditStatusColor = (currentBalance, creditLimit) => {
    if (!creditLimit || creditLimit === 0) return '#6B7280'; // Gray
    const usagePercent = (currentBalance / creditLimit) * 100;
    if (usagePercent >= 90) return '#EF4444'; // Red
    if (usagePercent >= 70) return '#F59E0B'; // Orange
    return '#10B981'; // Green
  };

  const renderShopItem = ({ item }) => {
    const creditStatusColor = getCreditStatusColor(item.current_balance, item.credit_limit);
    const availableCredit = (item.credit_limit || 0) - (item.current_balance || 0);

    return (
      <TouchableOpacity
        style={styles.shopCard}
        onPress={() => navigation.navigate('ShopDetail', { shopId: item.id })}
      >
        <View style={styles.shopHeader}>
          <View style={styles.shopTitleContainer}>
            <Text style={styles.shopName}>{item.shop_name}</Text>
            <Text style={styles.shopCode}>{item.shop_code}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#10B981' : '#EF4444' }]}>
            <Text style={styles.statusText}>{item.is_active ? 'Active' : 'Inactive'}</Text>
          </View>
        </View>

        <View style={styles.shopDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="person" size={16} color="#6B7280" />
            <Text style={styles.detailText}>{item.owner_name || 'N/A'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="call" size={16} color="#6B7280" />
            <Text style={styles.detailText}>{item.phone || 'N/A'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="location" size={16} color="#6B7280" />
            <Text style={styles.detailText}>{item.city || 'N/A'}</Text>
          </View>

          {item.route_name && (
            <View style={styles.detailRow}>
              <Ionicons name="map" size={16} color="#6B7280" />
              <Text style={styles.detailText}>{item.route_name}</Text>
            </View>
          )}
        </View>

        <View style={styles.creditInfo}>
          <View style={styles.creditRow}>
            <Text style={styles.creditLabel}>Credit Limit:</Text>
            <Text style={styles.creditValue}>{formatCurrency(item.credit_limit)}</Text>
          </View>
          <View style={styles.creditRow}>
            <Text style={styles.creditLabel}>Current Balance:</Text>
            <Text style={[styles.creditValue, { color: creditStatusColor }]}>
              {formatCurrency(item.current_balance)}
            </Text>
          </View>
          <View style={styles.creditRow}>
            <Text style={styles.creditLabel}>Available Credit:</Text>
            <Text style={[styles.creditValue, { color: availableCredit >= 0 ? '#10B981' : '#EF4444' }]}>
              {formatCurrency(availableCredit)}
            </Text>
          </View>
        </View>

        <View style={styles.shopFooter}>
          <Ionicons name="chevron-forward" size={20} color="#3B82F6" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading shops...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shops ({filteredShops.length})</Text>
        <TouchableOpacity
          style={styles.syncButton}
          onPress={handleSync}
        >
          <Ionicons name="sync" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by shop name, owner, phone..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Route Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by Route:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedRoute}
            onValueChange={(itemValue) => setSelectedRoute(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="All Routes" value="" />
            {routes.map(route => (
              <Picker.Item
                key={route.id}
                label={route.route_name}
                value={route.id.toString()}
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Shops List */}
      {filteredShops.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="storefront" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>No shops found</Text>
          {searchQuery || selectedRoute ? (
            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
          ) : (
            <Text style={styles.emptySubtext}>Pull down to sync data</Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredShops}
          renderItem={renderShopItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3B82F6']}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#3B82F6',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    marginLeft: 12,
  },
  syncButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  listContainer: {
    padding: 16,
  },
  shopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  shopTitleContainer: {
    flex: 1,
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  shopCode: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  shopDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
  },
  creditInfo: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  creditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  creditLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  creditValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  shopFooter: {
    alignItems: 'flex-end',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
});

export default ShopListingScreen;
