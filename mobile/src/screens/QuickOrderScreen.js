/**
 * Quick Order Screen
 * Sprint 5: Order Management System
 * 
 * Purpose: Quick shop selection for direct order creation from Dashboard
 * Flow: Dashboard → QuickOrderScreen (select shop) → ProductSelection → OrderCart
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import shopService from '../services/shopService';
import { useToast } from '../context/ToastContext';

const QuickOrderScreen = ({ navigation }) => {
  const { showToast } = useToast();
  const { user } = useAuth(); // Use AuthContext instead of AsyncStorage
  const [shops, setShops] = useState([]);
  const [filteredShops, setFilteredShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadShops();
  }, []);

  useEffect(() => {
    filterShops();
  }, [searchQuery, shops]);

  const loadShops = async () => {
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
      
      // Load shops using hybrid service (server first, then cache)
      // Apply route filter for salesman isolation
      const filters = userRouteId ? { routeId: userRouteId } : {};
      const shopsData = await shopService.getShops(filters);
      
      // Filter active shops only
      const activeShops = shopsData.filter(shop => shop.is_active === 1);
      
      setShops(activeShops);
      setFilteredShops(activeShops);

      // Show alert if no shops found
      if (activeShops.length === 0) {
        Alert.alert(
          'No Shops Available',
          'No shops found. Please sync data from the server first.',
          [
            { text: 'OK' },
            { 
              text: 'Sync Now', 
              onPress: async () => {
                const result = await shopService.forceRefresh();
                if (result.success) {
                  loadShops(); // Reload after sync
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error loading shops:', error);
      showToast('Failed to load shops. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterShops = () => {
    if (!searchQuery.trim()) {
      setFilteredShops(shops);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = shops.filter(shop => 
      shop.shop_name.toLowerCase().includes(query) ||
      shop.owner_name?.toLowerCase().includes(query) ||
      shop.area?.toLowerCase().includes(query)
    );
    setFilteredShops(filtered);
  };

  const handleShopSelect = (shop) => {
    // Check if user is authenticated and is a salesman (role_id = 3)
    if (!user || (user.role_id !== 3 && user.role !== 'Salesman')) {
      Alert.alert(
        'Authentication Required', 
        'Please ensure you are logged in as a salesman to create orders.',
        [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]
      );
      return;
    }

    // For salesman users, use user.id as the salesman identifier
    const salesmanId = user.salesman_id || user.id;

    navigation.navigate('ProductSelection', {
      shopId: shop.id,
      shopName: shop.shop_name,
      salesmanId: salesmanId,
      salesmanName: user.full_name || user.username,
      routeId: shop.route_id,
      routeName: shop.route_name || 'N/A',
    });
  };

  const renderShopItem = ({ item }) => (
    <TouchableOpacity
      style={styles.shopCard}
      onPress={() => handleShopSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.shopHeader}>
        <View style={styles.shopIconContainer}>
          <Ionicons name="storefront" size={24} color="#3B82F6" />
        </View>
        <View style={styles.shopInfo}>
          <Text style={styles.shopName}>{item.shop_name}</Text>
          {item.owner_name && (
            <Text style={styles.ownerName}>Owner: {item.owner_name}</Text>
          )}
        </View>
        <Ionicons name="arrow-forward" size={20} color="#9CA3AF" />
      </View>
      
      {item.area && (
        <View style={styles.shopDetail}>
          <Ionicons name="location" size={14} color="#6B7280" />
          <Text style={styles.detailText}>{item.area}</Text>
        </View>
      )}
      
      {item.phone && (
        <View style={styles.shopDetail}>
          <Ionicons name="call" size={14} color="#6B7280" />
          <Text style={styles.detailText}>{item.phone}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
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
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Select Shop</Text>
          <Text style={styles.headerSubtitle}>Choose a shop to create order</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search shops by name, owner, or area..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Shop Count */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          {filteredShops.length} {filteredShops.length === 1 ? 'shop' : 'shops'} available
        </Text>
      </View>

      {/* Shops List */}
      {filteredShops.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="storefront" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>No shops found</Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? 'Try a different search term' : 'No shops available'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredShops}
          renderItem={renderShopItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
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
  countContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  countText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  shopCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  shopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  shopIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  ownerName: {
    fontSize: 14,
    color: '#6B7280',
  },
  shopDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default QuickOrderScreen;
