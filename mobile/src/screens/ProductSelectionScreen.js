/**
 * Product Selection Screen
 * Sprint 5: Order Management System
 * 
 * Purpose: Select products and add them to order cart
 * Navigation: ShopDetailScreen → ProductSelectionScreen → OrderCartScreen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dbHelper from '../database/dbHelper';
import orderService from '../services/orderService';
import productService from '../services/productService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const ProductSelectionScreen = ({ route, navigation }) => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { 
    shopId, 
    shopName, 
    salesmanId, 
    salesmanName, 
    routeId, 
    routeName,
    existingCartItems = [], // Existing items from OrderCart (for edit mode)
    editMode = false,
    orderId = null,
    existingDiscount = '0',
    existingNotes = '',
  } = route.params;
  
  // Check if user is salesman (role_id = 3)
  const isSalesman = user?.role_id === 3;
  
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState(existingCartItems); // Initialize with existing items

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchQuery, selectedCategory, products]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const productsData = await dbHelper.getAllProducts();
      const activeProducts = productsData.filter(p => p.is_active === 1);
      setProducts(activeProducts);
      
      // Extract unique categories
      const uniqueCategories = ['All', ...new Set(activeProducts.map(p => p.category).filter(Boolean))];
      setCategories(uniqueCategories);
      
      setFilteredProducts(activeProducts);
    } catch (error) {
      Alert.alert(
        'Loading Issue',
        'Unable to load products from local database. Please sync data from the server.',
        [
          { text: 'OK' },
          {
            text: 'Try Again',
            onPress: () => loadProducts()
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const syncProducts = async () => {
    try {
      setRefreshing(true);
      const result = await productService.syncProductsFromServer();
      
      if (result.success) {
        // Reload products from database after successful sync
        const productsData = await dbHelper.getAllProducts();
        const activeProducts = productsData.filter(p => p.is_active === 1);
        setProducts(activeProducts);
        
        // Extract unique categories
        const uniqueCategories = ['All', ...new Set(activeProducts.map(p => p.category).filter(Boolean))];
        setCategories(uniqueCategories);
        
        setFilteredProducts(activeProducts);
        
        showToast(result.message, 'success');
      } else {
        showToast(result.message, 'error');
      }
    } catch (error) {
      showToast('Failed to sync products from server.', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];
    
    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.product_name.toLowerCase().includes(query) ||
          p.product_code.toLowerCase().includes(query) ||
          (p.brand && p.brand.toLowerCase().includes(query))
      );
    }
    
    setFilteredProducts(filtered);
  };

  const addToCart = (product) => {
    const existingIndex = cart.findIndex(item => item.product_id === product.id);
    
    if (existingIndex >= 0) {
      // Update quantity
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += 1;
      updatedCart[existingIndex].total_price = orderService.calculateItemTotal(
        updatedCart[existingIndex].quantity,
        updatedCart[existingIndex].unit_price
      );
      setCart(updatedCart);
    } else {
      // Add new item
      const cartItem = {
        product_id: product.id,
        product_code: product.product_code,
        product_name: product.product_name,
        quantity: 1,
        unit_price: product.unit_price,
        total_price: product.unit_price,
        discount_amount: 0
      };
      setCart([...cart, cartItem]);
    }
    
    // Show subtle feedback (removed intrusive Alert)
    // User can see the cart count update
  };

  const removeFromCart = (productId) => {
    const updatedCart = cart.filter(item => item.product_id !== productId);
    setCart(updatedCart);
  };

  const getCartQuantity = (productId) => {
    const item = cart.find(item => item.product_id === productId);
    return item ? item.quantity : 0;
  };

  const getTotalCartItems = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getTotalCartAmount = () => {
    return cart.reduce((sum, item) => sum + item.total_price, 0);
  };

  const proceedToCart = () => {
    if (cart.length === 0) {
      showToast('Please add at least one product to proceed', 'warning');
      return;
    }
    
    navigation.navigate('OrderCart', {
      shopId,
      shopName,
      salesmanId,
      salesmanName,
      routeId,
      routeName,
      cartItems: cart,
      editMode: editMode,
      orderId: orderId,
      existingDiscount: existingDiscount,
      existingNotes: existingNotes,
    });
  };

  const formatCurrency = (amount) => {
    return orderService.formatCurrency(amount);
  };

  const renderProductCard = ({ item }) => {
    const inCart = getCartQuantity(item.id);
    
    return (
      <View style={styles.productCard}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.product_name}</Text>
          <Text style={styles.productCode}>{item.product_code}</Text>
          {item.brand && (
            <View style={styles.brandTag}>
              <Text style={styles.brandText}>{item.brand}</Text>
            </View>
          )}
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Unit Price:</Text>
            <Text style={styles.priceValue}>{formatCurrency(item.unit_price)}</Text>
          </View>
          {!isSalesman && item.carton_price > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Carton Price:</Text>
              <Text style={styles.priceValue}>{formatCurrency(item.carton_price)}</Text>
              <Text style={styles.packInfo}>({item.pieces_per_carton} pcs)</Text>
            </View>
          )}
          <View style={styles.stockRow}>
            <Ionicons 
              name="cube" 
              size={14} 
              color={item.stock_quantity > item.reorder_level ? '#10B981' : '#EF4444'} 
            />
            <Text style={[
              styles.stockText,
              { color: item.stock_quantity > item.reorder_level ? '#10B981' : '#EF4444' }
            ]}>
              Stock: {item.stock_quantity}
            </Text>
          </View>
        </View>
        
        <View style={styles.productActions}>
          {inCart > 0 ? (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>In Cart: {inCart}</Text>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeFromCart(item.id)}
              >
                <Ionicons name="close-circle" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : null}
          
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => addToCart(item)}
          >
            <Ionicons name="add-circle" size={24} color="#3B82F6" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCategoryChip = (category) => {
    const isSelected = category === selectedCategory;
    return (
      <TouchableOpacity
        key={category}
        style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
        onPress={() => setSelectedCategory(category)}
      >
        <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>
          {category}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading products...</Text>
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
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Select Products</Text>
          <Text style={styles.headerSubtitle}>{shopName}</Text>
        </View>
        <TouchableOpacity
          style={styles.syncButton}
          onPress={syncProducts}
          disabled={refreshing}
        >
          <Ionicons 
            name={refreshing ? "sync" : "cloud-download-outline"} 
            size={24} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
        contentContainerStyle={styles.categoryContent}
      >
        {categories.map(renderCategoryChip)}
      </ScrollView>

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProductCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.productsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={syncProducts}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        }
      />

      {/* Cart Summary Bar */}
      {cart.length > 0 && (
        <View style={styles.cartBar}>
          <View style={styles.cartSummary}>
            <Text style={styles.cartItemCount}>{getTotalCartItems()} items</Text>
            <Text style={styles.cartTotal}>{formatCurrency(getTotalCartAmount())}</Text>
          </View>
          <TouchableOpacity style={styles.proceedButton} onPress={proceedToCart}>
            <Text style={styles.proceedButtonText}>Proceed to Cart</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
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
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#DBEAFE',
    marginTop: 2,
  },
  syncButton: {
    padding: 8,
    marginLeft: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  categoryContainer: {
    maxHeight: 50,
    marginBottom: 8,
  },
  categoryContent: {
    paddingHorizontal: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  productsList: {
    padding: 16,
    paddingTop: 8,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  productInfo: {
    marginBottom: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  productCode: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  brandTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  brandText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  priceLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginRight: 8,
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#059669',
  },
  packInfo: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  stockText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  productActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cartBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
    marginRight: 8,
  },
  removeButton: {
    padding: 2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
  cartBar: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cartSummary: {
    flex: 1,
  },
  cartItemCount: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  cartTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
  },
  proceedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
  },
  proceedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
});

export default ProductSelectionScreen;
