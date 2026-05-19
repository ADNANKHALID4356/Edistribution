/**
 * Order Cart Screen
 * Sprint 5: Order Management System
 * 
 * Purpose: Review cart, adjust quantities, add discount, and finalize order
 * Navigation: ProductSelectionScreen → OrderCartScreen → Confirmation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import orderService from '../services/orderService';
import syncService from '../services/syncService';
import dbHelper from '../database/dbHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OrderCartScreen = ({ route, navigation }) => {
  const { 
    shopId, 
    shopName, 
    salesmanId, 
    salesmanName, 
    routeId, 
    routeName, 
    cartItems,
    editMode = false,
    orderId = null,
    existingDiscount = '0',
    existingNotes = '',
  } = route.params;
  
  const [items, setItems] = useState(cartItems || []);
  const [discountAmount, setDiscountAmount] = useState(existingDiscount);
  const [notes, setNotes] = useState(existingNotes);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    calculateTotals();
  }, [items, discountAmount]);

  const calculateTotals = () => {
    const discount = parseFloat(discountAmount) || 0;
    const calculatedTotals = orderService.calculateOrderTotals(items, discount);
    setTotals(calculatedTotals);
  };

  const updateQuantity = (index, change) => {
    const updatedItems = [...items];
    const newQuantity = updatedItems[index].quantity + change;
    
    if (newQuantity <= 0) {
      // Remove item
      Alert.alert(
        'Remove Item',
        'Do you want to remove this item from cart?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              updatedItems.splice(index, 1);
              setItems(updatedItems);
            },
          },
        ]
      );
      return;
    }
    
    updatedItems[index].quantity = newQuantity;
    const itemDiscount = updatedItems[index].discount_percentage || 0;
    const subtotal = newQuantity * updatedItems[index].unit_price;
    const discountAmount = (subtotal * itemDiscount) / 100;
    updatedItems[index].total_price = subtotal - discountAmount;
    updatedItems[index].discount_amount = discountAmount;
    
    setItems(updatedItems);
  };

  const updateItemDiscount = (index, discount) => {
    const updatedItems = [...items];
    const discountValue = parseFloat(discount) || 0;
    updatedItems[index].discount_percentage = discountValue;
    
    const subtotal = updatedItems[index].quantity * updatedItems[index].unit_price;
    const discountAmount = (subtotal * discountValue) / 100;
    updatedItems[index].discount_amount = discountAmount;
    updatedItems[index].total_price = subtotal - discountAmount;
    
    setItems(updatedItems);
  };

  const removeItem = (index) => {
    Alert.alert(
      'Remove Item',
      'Do you want to remove this item from cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedItems = [...items];
            updatedItems.splice(index, 1);
            setItems(updatedItems);
          },
        },
      ]
    );
  };

  const saveDraft = async () => {
    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Cannot save an empty order');
      return;
    }
    
    try {
      setLoading(true);
      
      let orderResult;
      
      if (editMode && orderId) {
        // Update existing draft order
        // Delete old order details
        await dbHelper.deleteOrderDetails(orderId);
        
        // Add new items
        await dbHelper.addOrderDetails(orderId, items);
        
        // Update totals
        const discount = parseFloat(discountAmount) || 0;
        await orderService.updateOrderWithItems(orderId, items, discount, notes);
        
        orderResult = await dbHelper.getOrderById(orderId);
        
        Alert.alert(
          'Draft Updated',
          `Order ${orderResult.order_number} has been updated`,
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('OrdersList'),
            },
          ]
        );
      } else {
        // Create new draft order
        orderResult = await orderService.createDraftOrder(
          salesmanId,
          salesmanName,
          shopId,
          shopName,
          routeId,
          routeName
        );
        
        // Add items
        await dbHelper.addOrderDetails(orderResult.id, items);
        
        // Update totals
        const discount = parseFloat(discountAmount) || 0;
        await orderService.updateOrderWithItems(orderResult.id, items, discount, notes);
        
        Alert.alert(
          'Draft Saved',
          `Order ${orderResult.order_number} saved as draft`,
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('ShopListing'),
            },
          ]
        );
      }
    } catch (error) {
      const errorMessage = error.message || 'An unexpected error occurred';
      Alert.alert(
        'Save Failed',
        `Unable to save draft order. ${errorMessage}. Your changes are still in the cart.`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const finalizeOrder = async () => {
    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Cannot place an empty order');
      return;
    }
    
    Alert.alert(
      editMode ? 'Update & Finalize Order' : 'Finalize Order',
      editMode 
        ? 'Update this draft and place the order?'
        : `Do you want to finalize and place this order?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finalize',
          onPress: async () => {
            try {
              setLoading(true);
              
              let orderResult;
              
              if (editMode && orderId) {
                // Delete the old draft order
                await dbHelper.deleteOrder(orderId);
              }
              
              // Create new finalized order
              orderResult = await orderService.createDraftOrder(
                salesmanId,
                salesmanName,
                shopId,
                shopName,
                routeId,
                routeName
              );
              
              // Add items
              await dbHelper.addOrderDetails(orderResult.id, items);
              
              // Update totals
              const discount = parseFloat(discountAmount) || 0;
              await orderService.updateOrderWithItems(orderResult.id, items, discount, notes);
              
              // Finalize order (change status to placed)
              await orderService.finalizeOrder(orderResult.id, notes);
              
            // Sync to backend - show errors to salesman
            try {
              const netInfo = await NetInfo.fetch().catch(() => ({ isConnected: false }));
              if (netInfo.isConnected && salesmanId) {
                const syncResult = await syncService.syncOrders(salesmanId, {
                  deviceId: 'mobile-app',
                  os: Platform.OS,
                  appVersion: '1.0.0'
                });
                
                // Check if sync failed due to stock issues
                if (!syncResult.success && syncResult.errors && syncResult.errors.length > 0) {
                  const stockErrors = syncResult.errors.filter(err => 
                    err.error && err.error.toLowerCase().includes('insufficient stock')
                  );
                  
                  if (stockErrors.length > 0) {
                    // Show stock error to salesman
                    Alert.alert(
                      'Stock Not Available',
                      stockErrors[0].error || 'Some products have insufficient stock. Please adjust quantities and try again.',
                      [{ text: 'OK' }]
                    );
                  } else {
                    // Other sync error
                    Alert.alert(
                      'Sync Warning',
                      'Order saved locally but couldn\'t sync to server. It will retry automatically when connection is available.',
                      [{ text: 'OK' }]
                    );
                  }
                }
              }
            } catch (syncError) {
              // Network or other error - order saved locally
              console.log('Sync error (will retry later):', syncError.message);
            }              Alert.alert(
                'Order Placed',
                `Order ${orderResult.order_number} has been successfully placed!`,
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.navigate(editMode ? 'OrdersList' : 'ShopListing'),
                  },
                ]
              );
            } catch (error) {
              const errorMessage = error.message || 'Connection issue';
              Alert.alert(
                'Order Saved Locally',
                `Your order has been saved on this device and will sync automatically when online. ${errorMessage}`,
                [{ text: 'OK', onPress: () => navigation.navigate(editMode ? 'OrdersList' : 'ShopListing') }]
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount) => {
    return orderService.formatCurrency(amount);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Processing order...</Text>
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
          <Text style={styles.headerTitle}>{editMode ? 'Edit Order' : 'Order Cart'}</Text>
          <Text style={styles.headerSubtitle}>{shopName}</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Add More Products Button - Shows in edit mode or when cart has items */}
        {(editMode || items.length > 0) && (
          <View style={styles.addMoreSection}>
            <TouchableOpacity
              style={styles.addMoreButton}
              onPress={() => {
                // Navigate to ProductSelection with existing cart items
                navigation.navigate('ProductSelection', {
                  shopId,
                  shopName,
                  salesmanId,
                  salesmanName,
                  routeId,
                  routeName,
                  existingCartItems: items, // Pass existing items
                  editMode: editMode,
                  orderId: orderId,
                  existingDiscount: discountAmount,
                  existingNotes: notes,
                });
              }}
            >
              <Ionicons name="add-circle" size={24} color="#3B82F6" />
              <Text style={styles.addMoreButtonText}>Add More Products</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Items List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items ({items.length})</Text>
          
          {items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cart" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Your cart is empty</Text>
              <Text style={styles.emptySubtext}>Tap 'Add More Products' to get started</Text>
            </View>
          ) : (
            items.map((item, index) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.product_name}</Text>
                  <Text style={styles.itemCode}>{item.product_code}</Text>
                  <Text style={styles.itemPrice}>{formatCurrency(item.unit_price)} / unit</Text>
                  
                  {/* Item Discount */}
                  <View style={styles.itemDiscountRow}>
                    <Text style={styles.itemDiscountLabel}>Discount:</Text>
                    <View style={styles.itemDiscountInput}>
                      <TextInput
                        style={styles.discountInputSmall}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        value={item.discount_percentage?.toString() || '0'}
                        onChangeText={(text) => updateItemDiscount(index, text)}
                        placeholderTextColor="#9CA3AF"
                      />
                      <Text style={styles.percentLabelSmall}>%</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.itemActions}>
                  <View style={styles.quantityControl}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => updateQuantity(index, -1)}
                    >
                      <Ionicons name="remove" size={20} color="#3B82F6" />
                    </TouchableOpacity>
                    
                    <Text style={styles.quantityText}>{item.quantity}</Text>
                    
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => updateQuantity(index, 1)}
                    >
                      <Ionicons name="add" size={20} color="#3B82F6" />
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={styles.itemTotal}>{formatCurrency(item.total_price)}</Text>
                  
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => removeItem(index)}
                  >
                    <Ionicons name="trash" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Discount */}
        {items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Discount</Text>
            <View style={styles.discountRow}>
              <TextInput
                style={styles.discountInput}
                placeholder="0"
                keyboardType="decimal-pad"
                value={discountAmount}
                onChangeText={setDiscountAmount}
                placeholderTextColor="#9CA3AF"
              />
              <Text style={styles.percentLabel}>Rs.</Text>
            </View>
          </View>
        )}

        {/* Notes */}
        {items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Add any special instructions..."
              multiline
              numberOfLines={4}
              value={notes}
              onChangeText={setNotes}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        )}

        {/* Order Summary */}
        {items.length > 0 && totals && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatCurrency(totals.subtotal)}</Text>
            </View>
            
            {totals.discount_amount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Discount
                </Text>
                <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
                  - {formatCurrency(totals.discount_amount)}
                </Text>
              </View>
            )}
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>{formatCurrency(totals.total_amount)}</Text>
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Action Buttons */}
      {items.length > 0 && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.draftButton}
            onPress={saveDraft}
            disabled={loading}
          >
            <Ionicons name="save" size={20} color="#3B82F6" />
            <Text style={styles.draftButtonText}>Save Draft</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.finalizeButton}
            onPress={finalizeOrder}
            disabled={loading}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.finalizeButtonText}>Place Order</Text>
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
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  itemCode: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 13,
    color: '#059669',
  },
  itemActions: {
    alignItems: 'flex-end',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  quantityButton: {
    padding: 4,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginHorizontal: 12,
    minWidth: 30,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
    marginBottom: 8,
  },
  deleteButton: {
    padding: 4,
  },
  itemDiscountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  itemDiscountLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginRight: 8,
  },
  itemDiscountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  discountInputSmall: {
    width: 40,
    fontSize: 13,
    color: '#111827',
    textAlign: 'center',
    padding: 0,
  },
  percentLabelSmall: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 2,
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  discountInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  percentLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 12,
  },
  notesInput: {
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#059669',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#D1D5DB',
    marginTop: 8,
  },
  addMoreSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
  },
  addMoreButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 8,
  },
  actionBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
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
  draftButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 14,
    borderRadius: 12,
    marginRight: 8,
  },
  draftButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 8,
  },
  finalizeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    marginLeft: 8,
    elevation: 2,
  },
  finalizeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});

export default OrderCartScreen;
