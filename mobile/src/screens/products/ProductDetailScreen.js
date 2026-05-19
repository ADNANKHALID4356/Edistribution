/**
 * Product Detail Screen
 * Distribution Management System
 * Company: Ummahtechinnovations.com
 * 
 * Purpose: Display detailed product information
 * Features: Complete product info, stock status, supplier details
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import productService from '../../services/productService';
import { useAuth } from '../../context/AuthContext';

const ProductDetailScreen = ({ route, navigation }) => {
  const { productId } = route.params;
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Check if user is salesman (role_id = 3)
  const isSalesman = user?.role_id === 3;

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const result = await productService.getProductById(productId);
      
      if (result.success) {
        setProduct(result.data);
      } else {
        Alert.alert('Error', 'Product not found');
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load product details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading product...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#ef4444" />
        <Text style={styles.errorText}>Product not found</Text>
      </View>
    );
  }

  const formatted = productService.formatProduct(product);
  const stockColor = productService.getStockStatusColor(formatted.stockStatus);
  const stockLabel = productService.getStockStatusLabel(formatted.stockStatus);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <View style={[styles.stockBadge, { backgroundColor: stockColor }]}>
            <Text style={styles.stockText}>{stockLabel}</Text>
          </View>
        </View>

        <Text style={styles.productName}>{product.product_name}</Text>
        <Text style={styles.productCode}>Code: {product.product_code}</Text>
        {product.barcode && (
          <Text style={styles.barcode}>Barcode: {product.barcode}</Text>
        )}
      </View>

      {/* Price Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="pricetag" size={20} color="#1f2937" /> Price Information
        </Text>
        <View style={styles.priceGrid}>
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>Unit Price</Text>
            <Text style={styles.priceValue}>{formatted.formattedPrice}</Text>
          </View>
          {!isSalesman && (
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Carton Price</Text>
              <Text style={styles.priceValue}>{formatted.formattedCartonPrice}</Text>
            </View>
          )}
          {!isSalesman && (
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Purchase Price</Text>
              <Text style={styles.priceValue}>
                Rs. {parseFloat(product.purchase_price || 0).toFixed(2)}
              </Text>
            </View>
          )}
          {!isSalesman && (
            <View style={styles.priceItem}>
              <Text style={styles.priceLabel}>Profit Margin</Text>
              <Text style={styles.priceValue}>
                {product.profit_margin || 0}%
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Stock Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="cube" size={20} color="#1f2937" /> Stock Information
        </Text>
        <View style={styles.infoGrid}>
          <InfoRow
            icon="cube"
            label="Current Stock"
            value={`${product.stock_quantity} units`}
            color={stockColor}
          />
          <InfoRow
            icon="alert-circle"
            label="Reorder Level"
            value={`${product.reorder_level} units`}
          />
          <InfoRow
            icon="archive"
            label="Units per Carton"
            value={`${product.units_per_carton || 'N/A'}`}
          />
        </View>
      </View>

      {/* Product Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="information-circle" size={20} color="#1f2937" /> Product Details
        </Text>
        <View style={styles.infoGrid}>
          <InfoRow icon="grid" label="Category" value={product.category} />
          <InfoRow icon="star" label="Brand" value={product.brand} />
          <InfoRow
            icon="resize"
            label="Pack Size"
            value={product.pack_size || 'N/A'}
          />
          <InfoRow icon="scale" label="Unit" value={product.unit || 'N/A'} />
        </View>
        {product.description && (
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionLabel}>Description:</Text>
            <Text style={styles.descriptionText}>{product.description}</Text>
          </View>
        )}
      </View>

      {/* Supplier Information */}
      {product.supplier_name && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="business" size={20} color="#1f2937" /> Supplier Information
          </Text>
          <View style={styles.supplierCard}>
            <Text style={styles.supplierName}>{product.supplier_name}</Text>
            {product.supplier_contact && (
              <Text style={styles.supplierDetail}>
                <Ionicons name="call" size={14} /> {product.supplier_contact}
              </Text>
            )}
            {product.supplier_email && (
              <Text style={styles.supplierDetail}>
                <Ionicons name="mail" size={14} /> {product.supplier_email}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Status Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="checkmark-circle" size={20} color="#1f2937" /> Status
        </Text>
        <View style={styles.infoGrid}>
          <InfoRow
            icon="checkmark-circle"
            label="Active Status"
            value={product.is_active ? 'Active' : 'Inactive'}
            color={product.is_active ? '#10b981' : '#ef4444'}
          />
          <InfoRow
            icon="calendar"
            label="Created"
            value={new Date(product.created_at).toLocaleDateString()}
          />
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={() => {
            Alert.alert(
              'Create Order',
              'To add this product to an order, please go to Shops → Select a shop → Create Order',
              [
                {
                  text: 'Cancel',
                  style: 'cancel'
                },
                {
                  text: 'Go to Shops',
                  onPress: () => navigation.navigate('ShopListing')
                }
              ]
            );
          }}
        >
          <Ionicons name="cart" size={20} color="#fff" />
          <Text style={styles.primaryButtonText}>Add to Order</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// Helper component for info rows
const InfoRow = ({ icon, label, value, color = '#1f2937' }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoLeft}>
      <Ionicons name={icon} size={18} color="#6b7280" />
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    <Text style={[styles.infoValue, { color }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  stockText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  productCode: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  barcode: {
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  priceItem: {
    width: '50%',
    padding: 8,
  },
  priceLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3b82f6',
  },
  infoGrid: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  descriptionBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  supplierCard: {
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  supplierDetail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
  },
});

export default ProductDetailScreen;
