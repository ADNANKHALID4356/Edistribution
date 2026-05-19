/**
 * Shop Detail Screen
 * Distribution Management System
 * Company: Ummahtechinnovations.com
 * 
 * Purpose: Display detailed information about a shop
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import dbHelper from '../database/dbHelper';
import { useToast } from '../context/ToastContext';

const ShopDetailScreen = ({ route, navigation }) => {
  const { showToast } = useToast();
  const { shopId } = route.params;
  const { user } = useAuth(); // Use AuthContext instead of AsyncStorage
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShopDetails();
  }, [shopId]);

  const loadShopDetails = async () => {
    try {
      setLoading(true);
      const shopData = await dbHelper.getShopById(shopId);
      
      if (!shopData) {
        showToast('Shop not found', 'error');
        navigation.goBack();
        return;
      }

      setShop(shopData);
    } catch (error) {
      showToast('Failed to load shop details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getCreditStatusColor = (currentBalance, creditLimit) => {
    if (!creditLimit || creditLimit === 0) return '#6B7280';
    const usagePercent = (currentBalance / creditLimit) * 100;
    if (usagePercent >= 90) return '#EF4444';
    if (usagePercent >= 70) return '#F59E0B';
    return '#10B981';
  };

  const handleCall = (phone) => {
    if (!phone) {
      showToast('Phone number not available', 'error');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleMessage = (phone) => {
    if (!phone) {
      showToast('Phone number not available', 'error');
      return;
    }
    Linking.openURL(`sms:${phone}`);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading shop details...</Text>
      </View>
    );
  }

  if (!shop) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle" size={64} color="#EF4444" />
        <Text style={styles.errorText}>Shop not found</Text>
      </View>
    );
  }

  const availableCredit = (shop.credit_limit || 0) - (shop.current_balance || 0);
  const creditUsagePercent = shop.credit_limit > 0 
    ? ((shop.current_balance / shop.credit_limit) * 100).toFixed(1)
    : 0;
  const creditStatusColor = getCreditStatusColor(shop.current_balance, shop.credit_limit);

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
        <Text style={styles.headerTitle}>Shop Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Shop Name Card */}
        <View style={styles.nameCard}>
          <View style={styles.nameHeader}>
            <Ionicons name="storefront" size={32} color="#3B82F6" />
            <View style={styles.nameTitleContainer}>
              <Text style={styles.shopName}>{shop.shop_name}</Text>
              <Text style={styles.shopCode}>{shop.shop_code}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { 
            backgroundColor: shop.is_active ? '#10B981' : '#EF4444' 
          }]}>
            <Text style={styles.statusText}>
              {shop.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="person" size={20} color="#6B7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Owner Name</Text>
              <Text style={styles.infoValue}>{shop.owner_name || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="call" size={20} color="#6B7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{shop.phone || 'N/A'}</Text>
            </View>
            {shop.phone && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleCall(shop.phone)}
                >
                  <Ionicons name="call" size={20} color="#10B981" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleMessage(shop.phone)}
                >
                  <Ionicons name="chatbubble" size={20} color="#3B82F6" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color="#6B7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{shop.address || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color="#6B7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>City</Text>
              <Text style={styles.infoValue}>{shop.city || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Route Information */}
        {shop.route_name && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Route Information</Text>
            
            <View style={styles.infoRow}>
              <Ionicons name="map" size={20} color="#6B7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Assigned Route</Text>
                <Text style={styles.infoValue}>{shop.route_name}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Credit Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Credit Information</Text>
          
          <View style={styles.creditCard}>
            <View style={styles.creditRow}>
              <Text style={styles.creditLabel}>Credit Limit</Text>
              <Text style={styles.creditAmount}>{formatCurrency(shop.credit_limit)}</Text>
            </View>

            <View style={styles.creditRow}>
              <Text style={styles.creditLabel}>Current Balance</Text>
              <Text style={[styles.creditAmount, { color: creditStatusColor }]}>
                {formatCurrency(shop.current_balance)}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.creditRow}>
              <Text style={styles.creditLabelBold}>Available Credit</Text>
              <Text style={[styles.creditAmountLarge, { 
                color: availableCredit >= 0 ? '#10B981' : '#EF4444' 
              }]}>
                {formatCurrency(availableCredit)}
              </Text>
            </View>

            <View style={styles.creditUsageContainer}>
              <Text style={styles.creditUsageLabel}>Credit Usage: {creditUsagePercent}%</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(parseFloat(creditUsagePercent), 100)}%`,
                      backgroundColor: creditStatusColor,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Financial Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Opening Balance</Text>
            <Text style={styles.summaryValue}>{formatCurrency(shop.opening_balance)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Credit Limit Status</Text>
            <View style={[styles.statusDot, { backgroundColor: creditStatusColor }]} />
            <Text style={[styles.summaryValue, { color: creditStatusColor }]}>
              {creditUsagePercent < 70 ? 'Good' : creditUsagePercent < 90 ? 'Warning' : 'Critical'}
            </Text>
          </View>
        </View>

        {/* Create Order Button - Sprint 5 - VISIBLE FOR ALL AUTHENTICATED USERS */}
        {user && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.createOrderButton}
              onPress={() =>
                navigation.navigate('ProductSelection', {
                  shopId: shop.id,
                  shopName: shop.shop_name,
                  salesmanId: user.salesman_id || user.id, // Use salesman_id if exists, otherwise user.id
                  salesmanName: user.full_name || user.username,
                  routeId: shop.route_id,
                  routeName: shop.route_name,
                })
              }
            >
              <View style={styles.createOrderIcon}>
                <Ionicons name="cart" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.createOrderContent}>
                <Text style={styles.createOrderTitle}>Create New Order</Text>
                <Text style={styles.createOrderSubtitle}>
                  Select products and place an order for this shop
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={24} color="#3B82F6" />
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={{ height: 32 }} />
      </ScrollView>
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
  errorText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
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
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  nameCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  nameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  nameTitleContainer: {
    marginLeft: 12,
    flex: 1,
  },
  shopName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  shopCode: {
    fontSize: 16,
    color: '#6B7280',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  creditCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 8,
  },
  creditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  creditLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  creditLabelBold: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  creditAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  creditAmountLarge: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  creditUsageContainer: {
    marginTop: 8,
  },
  creditUsageLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  // Sprint 5: Create Order Button
  createOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3B82F6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  createOrderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  createOrderContent: {
    flex: 1,
  },
  createOrderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  createOrderSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
});

export default ShopDetailScreen;
