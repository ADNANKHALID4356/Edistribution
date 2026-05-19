/**
 * Product List Screen
 * Distribution Management System
 * Company: Ummahtechinnovations.com
 * 
 * Purpose: Display list of products with search and filters
 * Features: Offline support, pull-to-refresh, search, category/brand filters
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import productService from '../../services/productService';
import syncService from '../../services/syncService';
import NetInfo from '@react-native-community/netinfo';

const ProductListScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadInitialData();
    checkNetworkStatus();
    
    // Subscribe to network status changes
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
    });

    // Subscribe to sync updates
    const syncListener = syncService.addListener(handleSyncUpdate);

    return () => {
      unsubscribe();
      syncService.removeListener(syncListener);
    };
  }, []);

  // Check network status
  const checkNetworkStatus = async () => {
    const state = await NetInfo.fetch();
    setIsOnline(state.isConnected);
  };

  // Handle sync updates
  const handleSyncUpdate = (status) => {
    if (status.status === 'COMPLETED' && status.table === 'products') {
      console.log('Products synced, reloading...');
      loadProducts();
    }
  };

  // Load initial data
  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadProducts(),
        loadCategories(),
        loadBrands(),
      ]);
    } catch (error) {
      // Silent fail - individual loaders will handle their errors
    } finally {
      setLoading(false);
    }
  };

  // Load products
  const loadProducts = async () => {
    try {
      const result = await productService.getAllProducts();
      
      if (result.success) {
        setProducts(result.data);
        setFilteredProducts(result.data);
        console.log(`Loaded ${result.data.length} products from ${result.source}`);
      } else {
        Alert.alert('Error', result.message || 'Failed to load products');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load products');
    }
  };

  // Load categories
  const loadCategories = async () => {
    try {
      const result = await productService.getCategories();
      if (result.success) {
        setCategories(result.data);
      }
    } catch (error) {
      // Silent fail - categories optional
    }
  };

  // Load brands
  const loadBrands = async () => {
    try {
      const result = await productService.getBrands();
      if (result.success) {
        setBrands(result.data);
      }
    } catch (error) {
      // Silent fail - brands optional
    }
  };

  // Handle refresh (pull-to-refresh)
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    
    try {
      if (!isOnline) {
        Alert.alert('Offline', 'Cannot sync while offline');
        setRefreshing(false);
        return;
      }

      // Force sync
      const result = await syncService.syncProducts(true);
      
      if (result.success) {
        await loadProducts();
        Alert.alert('Success', `Synced ${result.total} products`);
      } else {
        Alert.alert('Sync Failed', result.error || 'Failed to sync products');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to sync products');
    } finally {
      setRefreshing(false);
    }
  }, [isOnline]);

  // Search products
  const handleSearch = useCallback(async (text) => {
    setSearchTerm(text);
    setSearching(true);

    try {
      if (text.trim() === '') {
        // No search term, show all or filtered
        applyFilters(products, selectedCategory, selectedBrand);
      } else {
        const result = await productService.searchProducts(text);
        if (result.success) {
          applyFilters(result.data, selectedCategory, selectedBrand);
        }
      }
    } catch (error) {
      // Silent fail - search will show current results
    } finally {
      setSearching(false);
    }
  }, [products, selectedCategory, selectedBrand]);

  // Apply filters
  const applyFilters = useCallback((productsList, category, brand) => {
    let filtered = [...productsList];

    // Filter by category
    if (category) {
      filtered = filtered.filter(p => p.category === category);
    }

    // Filter by brand
    if (brand) {
      filtered = filtered.filter(p => p.brand === brand);
    }

    setFilteredProducts(filtered);
  }, []);

  // Handle category change
  const handleCategoryChange = useCallback((category) => {
    setSelectedCategory(category);
    applyFilters(products, category, selectedBrand);
  }, [products, selectedBrand, applyFilters]);

  // Handle brand change
  const handleBrandChange = useCallback((brand) => {
    setSelectedBrand(brand);
    applyFilters(products, selectedCategory, brand);
  }, [products, selectedCategory, applyFilters]);

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedBrand('');
    setFilteredProducts(products);
  };

  // Navigate to product detail
  const handleProductPress = (product) => {
    navigation.navigate('ProductDetail', { productId: product.id });
  };

  // Render product item
  const renderProductItem = ({ item }) => {
    const formatted = productService.formatProduct(item);
    const stockColor = productService.getStockStatusColor(formatted.stockStatus);
    const stockLabel = productService.getStockStatusLabel(formatted.stockStatus);

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => handleProductPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.productHeader}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.product_name}
          </Text>
          <View style={[styles.stockBadge, { backgroundColor: stockColor }]}>
            <Text style={styles.stockText}>{stockLabel}</Text>
          </View>
        </View>

        <View style={styles.productDetails}>
          <Text style={styles.productCode}>Code: {item.product_code}</Text>
          <Text style={styles.productCategory}>
            {item.category} • {item.brand}
          </Text>
        </View>

        <View style={styles.productFooter}>
          <View>
            <Text style={styles.priceLabel}>Unit Price</Text>
            <Text style={styles.price}>{formatted.formattedPrice}</Text>
          </View>
          <View style={styles.stockInfo}>
            <Ionicons name="cube" size={16} color="#6b7280" />
            <Text style={styles.stockQuantity}>{item.stock_quantity} units</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render empty list
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cube" size={64} color="#d1d5db" />
      <Text style={styles.emptyText}>No products found</Text>
      {!isOnline && (
        <Text style={styles.emptySubtext}>
          You're offline. Pull down to sync when online.
        </Text>
      )}
    </View>
  );

  // Render loading
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with offline indicator */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Products</Text>
        {!isOnline && (
          <View style={styles.offlineBadge}>
            <Ionicons name="cloud-offline" size={16} color="#fff" />
            <Text style={styles.offlineText}>Offline</Text>
          </View>
        )}
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, code, or barcode..."
          value={searchTerm}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {searching && <ActivityIndicator size="small" color="#3b82f6" />}
        {searchTerm !== '' && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter toggle button */}
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setShowFilters(!showFilters)}
      >
        <Ionicons name="filter" size={20} color="#3b82f6" />
        <Text style={styles.filterButtonText}>Filters</Text>
        <Ionicons 
          name={showFilters ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#3b82f6" 
        />
      </TouchableOpacity>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Category:</Text>
            <Picker
              selectedValue={selectedCategory}
              style={styles.picker}
              onValueChange={handleCategoryChange}
            >
              <Picker.Item label="All Categories" value="" />
              {categories.map((cat) => (
                <Picker.Item key={cat} label={cat} value={cat} />
              ))}
            </Picker>
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Brand:</Text>
            <Picker
              selectedValue={selectedBrand}
              style={styles.picker}
              onValueChange={handleBrandChange}
            >
              <Picker.Item label="All Brands" value="" />
              {brands.map((brand) => (
                <Picker.Item key={brand} label={brand} value={brand} />
              ))}
            </Picker>
          </View>

          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <Text style={styles.clearButtonText}>Clear Filters</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Product list */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3b82f6']}
          />
        }
        ListEmptyComponent={renderEmptyList}
      />

      {/* Results count */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {filteredProducts.length} of {products.length} products
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  offlineText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    gap: 8,
  },
  filterButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  picker: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  clearButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  clearButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginRight: 8,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stockText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  productDetails: {
    marginBottom: 12,
  },
  productCode: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
    color: '#6b7280',
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockQuantity: {
    fontSize: 14,
    color: '#6b7280',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
});

export default ProductListScreen;
