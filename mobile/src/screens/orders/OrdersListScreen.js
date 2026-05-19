/**
 * Orders List Screen - Sprint 9
 * Distribution Management System
 * Company: Ummahtechinnovations.com
 * 
 * Features:
 * - Display all orders with sync status
 * - Visual sync indicators (✓ synced, ⏳ pending, ❌ failed)
 * - Color-coded status badges
 * - Manual sync button
 * - Pull-to-refresh
 * - Filter by sync status
 * - Order details modal
 * - Edit/Delete buttons (unsynced only)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import dbHelper from '../../database/dbHelper';
import orderService from '../../services/orderService'; // ✅ Use Sprint 5 proven service
import syncService from '../../services/syncService'; // Sprint 9 sync service
import Toast from '../../components/Toast'; // Sprint 9 toast notifications
import ConnectivityBanner from '../../components/ConnectivityBanner'; // Sprint 9 connectivity indicator

const OrdersListScreen = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0); // Sprint 9: Track sync progress
  const [filter, setFilter] = useState('all'); // all, synced, pending
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [syncStats, setSyncStats] = useState({
    total: 0,
    synced: 0,
    pending: 0,
  });
  const [salesmanId, setSalesmanId] = useState(null);
  
  // Sprint 9: Toast notification state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('info');

  useEffect(() => {
    loadSalesmanId();
    
    // Sprint 9: Setup sync listener for progress updates
    const syncListener = (status) => {
      if (status.table === 'orders') {
        if (status.progress !== undefined) {
          setSyncProgress(status.progress);
        }
        
        if (status.status === 'completed') {
          showToast('✅ Orders synced successfully!', 'success');
          loadOrders();
        } else if (status.status === 'failed') {
          showToast(`❌ Sync failed: ${status.error || 'Unknown error'}`, 'error');
        }
      }
    };
    
    syncService.addListener(syncListener);
    
    return () => {
      syncService.removeListener(syncListener);
    };
  }, []);

  useEffect(() => {
    applyFilter();
  }, [orders, filter]);

  // Sprint 9: Toast helper function
  const showToast = (message, type = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const loadSalesmanId = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      console.log('🔍 [ORDERS LIST] Loading salesman ID from AsyncStorage...');
      if (userStr) {
        const user = JSON.parse(userStr);
        console.log(`✅ [ORDERS LIST] User found:`, { id: user.id, username: user.username, role_id: user.role_id, salesman_id: user.salesman_id });
        const id = user.salesman_id || user.id;
        console.log(`✅ [ORDERS LIST] Setting salesmanId to: ${id}`);
        setSalesmanId(id);
      } else {
        console.warn('⚠️ [ORDERS LIST] No user found in AsyncStorage');
      }
    } catch (error) {
      console.error('❌ [ORDERS LIST] Error loading salesman ID:', error.message);
    }
  };

  // Load orders when salesmanId changes
  useEffect(() => {
    if (salesmanId) {
      loadOrders();
    }
  }, [salesmanId]);

  const loadOrders = async () => {
    try {
      if (!salesmanId) {
        console.warn('⚠️ [ORDERS LIST] Cannot load orders - salesmanId not set');
        return;
      }
      
      console.log(`🔍 [ORDERS LIST] Loading orders for salesman: ${salesmanId}`);
      setLoading(true);
      const allOrders = await dbHelper.getAllOrders(salesmanId);
      console.log(`✅ [ORDERS LIST] Loaded ${allOrders.length} orders from database`);
      console.log('📋 [ORDERS LIST] Orders:', JSON.stringify(allOrders.map(o => ({
        id: o.id,
        order_number: o.order_number,
        status: o.status,
        synced: o.synced,
        shop_name: o.shop_name,
        total_amount: o.total_amount
      })), null, 2));
      setOrders(allOrders);
      
      // Calculate stats
      const stats = {
        total: allOrders.length,
        synced: allOrders.filter(o => o.synced === 1).length,
        pending: allOrders.filter(o => o.synced === 0 && o.status !== 'draft').length,
      };
      setSyncStats(stats);
      console.log(`📊 [ORDERS LIST] Stats - Total: ${stats.total}, Synced: ${stats.synced}, Pending: ${stats.pending}`);
    } catch (error) {
      console.error('❌ [ORDERS LIST] Error loading orders:', error.message);
      console.error('❌ [ORDERS LIST] Error stack:', error.stack);
      Alert.alert(
        'Loading Issue',
        `Unable to load orders: ${error.message}. Please try again.`,
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  }, []);

  const applyFilter = () => {
    let filtered = orders;
    
    if (filter === 'synced') {
      filtered = orders.filter(o => o.synced === 1);
    } else if (filter === 'pending') {
      filtered = orders.filter(o => o.synced === 0 && o.status !== 'draft');
    } else if (filter === 'draft') {
      filtered = orders.filter(o => o.status === 'draft');
    }
    
    setFilteredOrders(filtered);
  };

  const handleSyncStatus = (status) => {
    console.log('Sync status update:', status);
    if (status.table === 'orders') {
      if (status.status === 'completed') {
        loadOrders(); // Reload orders after sync
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (status.status === 'failed') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const handleManualSync = async () => {
    if (!salesmanId) {
      showToast('❌ Salesman ID not found. Please login again.', 'error');
      return;
    }

    if (syncing) {
      showToast('⏳ Sync already in progress', 'warning');
      return;
    }

    const unsyncedCount = orders.filter(o => o.synced === 0 && o.status !== 'draft').length;
    
    if (unsyncedCount === 0) {
      showToast('✅ All orders are already synced', 'success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    Alert.alert(
      'Sync Orders',
      `Upload ${unsyncedCount} unsynced order${unsyncedCount !== 1 ? 's' : ''} to server?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sync Now',
          onPress: async () => {
            try {
              setSyncing(true);
              setSyncProgress(0);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

              showToast(`🔄 Syncing ${unsyncedCount} orders...`, 'info');

              // Sprint 9: First retry any previously failed syncs
              console.log('🔄 Attempting to retry failed syncs...');
              await syncService.retryFailedSyncs();

              const deviceInfo = {
                deviceId: 'mobile-app',
                os: 'iOS/Android',
                appVersion: '1.0.0',
              };

              const result = await syncService.syncOrders(salesmanId, deviceInfo);

              if (result.success) {
                showToast(
                  `✅ Successfully synced ${result.synced}/${result.total} orders!`,
                  'success'
                );
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                await loadOrders(); // Reload to update UI
              } else {
                const errorMsg = result.failed > 0 
                  ? `⚠️ Synced ${result.synced}/${result.total} orders. ${result.failed} failed (will retry automatically)`
                  : result.error || 'Failed to sync orders';
                
                showToast(errorMsg, result.synced > 0 ? 'warning' : 'error');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                
                // Show retry queue info if applicable
                const retryStatus = syncService.getRetryQueueStatus();
                if (retryStatus.totalItems > 0) {
                  Alert.alert(
                    'Sync Partially Failed',
                    `${result.synced} orders synced successfully.\n${result.failed} orders failed and will be retried automatically.`,
                    [{ text: 'OK' }]
                  );
                }
              }
            } catch (error) {
              showToast('❌ Sync failed - Orders saved locally', 'error');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            } finally {
              setSyncing(false);
              setSyncProgress(0);
            }
          },
        },
      ]
    );
  };

  const handleOrderPress = (order) => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const handleEditOrder = async (order) => {
    if (order.synced === 1) {
      Alert.alert('Cannot Edit', 'Synced orders cannot be edited');
      return;
    }
    
    try {
      setModalVisible(false);
      
      // Load full order details with items
      const orderDetails = await dbHelper.getOrderById(order.id);
      
      if (!orderDetails || !orderDetails.items || orderDetails.items.length === 0) {
        Alert.alert('Error', 'Cannot load order details');
        return;
      }
      
      // Get discount amount from order (stored as price, not percentage)
      const discountAmount = orderDetails.discount?.toString() || '0';
      
      // Format items for OrderCart
      const cartItems = orderDetails.items.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name || 'Unknown Product',
        product_code: item.product_code || '',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));
      
      // Navigate to OrderCart with existing order data
      navigation.navigate('OrderCart', {
        shopId: orderDetails.shop_id,
        shopName: orderDetails.shop_name,
        salesmanId: orderDetails.salesman_id,
        salesmanName: orderDetails.salesman_name || 'Salesman',
        routeId: orderDetails.route_id,
        routeName: orderDetails.route_name || 'Route',
        cartItems: cartItems,
        editMode: true,
        orderId: order.id,
        existingDiscount: discountAmount,
        existingNotes: orderDetails.notes || '',
      });
    } catch (error) {
      Alert.alert(
        'Edit Failed',
        'Unable to load order details. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleDeleteOrder = (order) => {
    if (order.synced === 1) {
      Alert.alert('Cannot Delete', 'Synced orders cannot be deleted');
      return;
    }

    Alert.alert(
      'Delete Order',
      `Are you sure you want to delete order ${order.order_number}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dbHelper.deleteOrder(order.id);
              Alert.alert('Success', 'Order deleted successfully');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setModalVisible(false);
              await loadOrders();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete order');
            }
          },
        },
      ]
    );
  };

  const getSyncIcon = (order) => {
    if (order.synced === 1) {
      return { 
        name: 'checkmark-circle', 
        color: '#10B981', 
        label: 'Synced',
        bgColor: '#D1FAE5' 
      };
    } else if (order.status === 'draft') {
      return { 
        name: 'create', 
        color: '#9CA3AF', 
        label: 'Draft',
        bgColor: '#F3F4F6' 
      };
    } else if (order.notes && order.notes.includes('Sync Error')) {
      return { 
        name: 'alert-circle', 
        color: '#EF4444', 
        label: 'Failed (Will Retry)',
        bgColor: '#FEE2E2' 
      };
    } else if (order.sync_retry_count && order.sync_retry_count > 0) {
      return { 
        name: 'refresh-circle', 
        color: '#F59E0B', 
        label: `Retrying (${order.sync_retry_count})`,
        bgColor: '#FEF3C7' 
      };
    } else {
      return { 
        name: 'time', 
        color: '#F59E0B', 
        label: 'Pending Sync',
        bgColor: '#FEF3C7' 
      };
    }
  };

  const renderOrder = ({ item }) => {
    const syncIcon = getSyncIcon(item);
    
    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => handleOrderPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderNumber}>{item.order_number}</Text>
            <Text style={styles.shopName}>{item.shop_name}</Text>
          </View>
          <View style={[styles.syncBadge, { backgroundColor: syncIcon.bgColor }]}>
            <Ionicons name={syncIcon.name} size={16} color={syncIcon.color} />
            <Text style={[styles.syncLabel, { color: syncIcon.color }]}>
              {syncIcon.label}
            </Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={14} color="#6B7280" />
            <Text style={styles.detailText}>
              {new Date(item.order_date).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="cash" size={14} color="#6B7280" />
            <Text style={styles.detailText}>
              Rs. {parseFloat(item.total_amount).toFixed(2)}
            </Text>
          </View>
        </View>

        {item.synced === 1 && item.synced_at && (
          <Text style={styles.syncedAt}>
            Synced: {new Date(item.synced_at).toLocaleString()}
          </Text>
        )}
        
        {!item.synced && item.status !== 'draft' && (
          <View style={styles.unsyncedBanner}>
            <Ionicons name="cloud-upload" size={12} color="#F59E0B" />
            <Text style={styles.unsyncedText}>Waiting to sync</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderFilterButton = (filterType, label, icon) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filter === filterType && styles.filterButtonActive,
      ]}
      onPress={() => setFilter(filterType)}
    >
      <Ionicons
        name={icon}
        size={18}
        color={filter === filterType ? '#FFFFFF' : '#6B7280'}
      />
      <Text
        style={[
          styles.filterButtonText,
          filter === filterType && styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderOrderModal = () => {
    if (!selectedOrder) return null;

    const syncIcon = getSyncIcon(selectedOrder);
    const hasDiscount = selectedOrder.discount > 0;
    const itemCount = selectedOrder.items ? selectedOrder.items.length : 0;

    return (
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Text style={styles.modalTitle}>Order Details</Text>
                <View style={[styles.modalStatusBadge, { backgroundColor: syncIcon.color + '20' }]}>
                  <Ionicons name={syncIcon.name} size={14} color={syncIcon.color} />
                  <Text style={[styles.modalStatusLabel, { color: syncIcon.color }]}>
                    {syncIcon.label}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Order Information */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Order Information</Text>
                
                <View style={styles.modalInfoGrid}>
                  <View style={styles.modalInfoItem}>
                    <Text style={styles.modalLabel}>Order Number</Text>
                    <Text style={styles.modalValue}>{selectedOrder.order_number}</Text>
                  </View>

                  <View style={styles.modalInfoItem}>
                    <Text style={styles.modalLabel}>Date</Text>
                    <Text style={styles.modalValue}>
                      {new Date(selectedOrder.order_date).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalInfoItem}>
                  <Text style={styles.modalLabel}>Shop Name</Text>
                  <Text style={styles.modalValue} numberOfLines={2}>{selectedOrder.shop_name}</Text>
                </View>

                {selectedOrder.route_name && (
                  <View style={styles.modalInfoItem}>
                    <Text style={styles.modalLabel}>Route</Text>
                    <Text style={styles.modalValue}>{selectedOrder.route_name}</Text>
                  </View>
                )}
              </View>

              {/* Order Items */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Items ({itemCount})</Text>
                  {selectedOrder.items.map((item, index) => (
                    <View key={index} style={styles.modalItemCard}>
                      <View style={styles.modalItemHeader}>
                        <Text style={styles.modalItemName} numberOfLines={1}>
                          {item.product_name || 'Unknown Product'}
                        </Text>
                        <Text style={styles.modalItemTotal}>
                          Rs. {parseFloat(item.total_price).toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.modalItemDetails}>
                        <Text style={styles.modalItemDetail}>
                          Qty: {item.quantity} × Rs. {parseFloat(item.unit_price).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Financial Summary */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Summary</Text>
                
                <View style={styles.modalSummaryRow}>
                  <Text style={styles.modalSummaryLabel}>Subtotal:</Text>
                  <Text style={styles.modalSummaryValue}>
                    Rs. {parseFloat(selectedOrder.total_amount).toFixed(2)}
                  </Text>
                </View>

                {hasDiscount && (
                  <View style={styles.modalSummaryRow}>
                    <Text style={styles.modalSummaryLabel}>Discount:</Text>
                    <Text style={[styles.modalSummaryValue, { color: '#10B981' }]}>
                      - Rs. {parseFloat(selectedOrder.discount).toFixed(2)}
                    </Text>
                  </View>
                )}

                <View style={[styles.modalSummaryRow, styles.modalSummaryTotal]}>
                  <Text style={styles.modalSummaryTotalLabel}>Net Amount:</Text>
                  <Text style={styles.modalSummaryTotalValue}>
                    Rs. {parseFloat(selectedOrder.net_amount || selectedOrder.total_amount).toFixed(2)}
                  </Text>
                </View>
              </View>

              {selectedOrder.notes && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Notes</Text>
                  <Text style={styles.modalNotesText}>{selectedOrder.notes}</Text>
                </View>
              )}

              {selectedOrder.synced === 1 && selectedOrder.synced_at && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSyncInfo}>
                    ✓ Synced on {new Date(selectedOrder.synced_at).toLocaleString()}
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              {selectedOrder.synced === 0 && (
                <>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.editButton]}
                    onPress={() => handleEditOrder(selectedOrder)}
                  >
                    <Ionicons name="create" size={18} color="#FFFFFF" />
                    <Text style={styles.modalButtonText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.deleteButton]}
                    onPress={() => handleDeleteOrder(selectedOrder)}
                  >
                    <Ionicons name="trash" size={18} color="#FFFFFF" />
                    <Text style={styles.modalButtonText}>Delete</Text>
                  </TouchableOpacity>
                </>
              )}
              {selectedOrder.synced === 1 && (
                <Text style={styles.readOnlyText}>
                  ✓ Synced orders are read-only
                </Text>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Connectivity Banner */}
      <ConnectivityBanner />

      {/* Toast Notification */}
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        onHide={() => setToastVisible(false)}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
        <TouchableOpacity
          style={styles.syncButton}
          onPress={handleManualSync}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
          )}
          <Text style={styles.syncButtonText}>
            {syncing ? 'Syncing...' : 'Sync'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sync Progress Bar */}
      {syncing && syncProgress > 0 && (
        <View style={styles.syncProgressContainer}>
          <View style={styles.syncProgressBar}>
            <View 
              style={[
                styles.syncProgressFill, 
                { width: `${syncProgress}%` }
              ]} 
            />
          </View>
          <Text style={styles.syncProgressText}>
            {syncProgress.toFixed(0)}% complete
          </Text>
        </View>
      )}

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{syncStats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{syncStats.synced}</Text>
          <Text style={styles.statLabel}>Synced</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{syncStats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {renderFilterButton('all', 'All', 'list')}
        {renderFilterButton('synced', 'Synced', 'checkmark-circle')}
        {renderFilterButton('pending', 'Pending', 'time')}
        {renderFilterButton('draft', 'Drafts', 'create')}
      </View>

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>No orders found</Text>
            <Text style={styles.emptySubtext}>
              {filter !== 'all' 
                ? `No ${filter} orders` 
                : 'Create your first order to get started'}
            </Text>
          </View>
        )}
      />

      {/* Order Details Modal */}
      {renderOrderModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  statCard: {
    flex: 1,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  filters: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#FFFFFF',
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    gap: 6,
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
  },
  orderCard: {
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
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  shopName: {
    fontSize: 14,
    color: '#6B7280',
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  syncLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  orderDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 13,
    color: '#6B7280',
  },
  syncedAt: {
    fontSize: 11,
    color: '#10B981',
    marginTop: 4,
  },
  unsyncedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    gap: 6,
  },
  unsyncedText: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalBody: {
    maxHeight: '70%',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  modalStatusLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  modalInfoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  modalInfoItem: {
    flex: 1,
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  modalItemCard: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  modalItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  modalItemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  modalItemTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3B82F6',
  },
  modalItemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalItemDetail: {
    fontSize: 12,
    color: '#6B7280',
  },
  modalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalSummaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalSummaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  modalSummaryTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  modalSummaryTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  modalSummaryTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6',
  },
  modalNotesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  modalSyncInfo: {
    fontSize: 12,
    color: '#10B981',
    textAlign: 'center',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 6,
  },
  editButton: {
    backgroundColor: '#3B82F6',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  readOnlyText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    paddingVertical: 14,
  },
  syncProgressContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  syncProgressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  syncProgressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  syncProgressText: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default OrdersListScreen;
