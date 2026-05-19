import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '../screens/DashboardScreen';
import ProductListScreen from '../screens/products/ProductListScreen';
import ProductDetailScreen from '../screens/products/ProductDetailScreen';
import ShopListingScreen from '../screens/ShopListingScreen';
import ShopDetailScreen from '../screens/ShopDetailScreen';
import ProductSelectionScreen from '../screens/ProductSelectionScreen';
import OrderCartScreen from '../screens/OrderCartScreen';
import QuickOrderScreen from '../screens/QuickOrderScreen';
import OrdersListScreen from '../screens/orders/OrdersListScreen'; // ✅ Sprint 9 enhancement

const Stack = createNativeStackNavigator();

const AppStack = () => {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
      />
      <Stack.Screen 
        name="ProductList" 
        component={ProductListScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="ProductDetail" 
        component={ProductDetailScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="ShopListing" 
        component={ShopListingScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="ShopDetail" 
        component={ShopDetailScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="QuickOrder" 
        component={QuickOrderScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="ProductSelection" 
        component={ProductSelectionScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="OrderCart" 
        component={OrderCartScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="OrdersList" 
        component={OrdersListScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default AppStack;

