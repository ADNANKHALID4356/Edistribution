import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import ServerConfigScreen from '../screens/ServerConfigScreen';

const Stack = createNativeStackNavigator();

const AuthStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen 
        name="ServerConfig" 
        component={ServerConfigScreen}
        options={{
          headerShown: true,
          title: 'Server Configuration',
          headerBackTitle: 'Back'
        }}
      />
    </Stack.Navigator>
  );
};

export default AuthStack;
