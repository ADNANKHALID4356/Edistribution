import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Text, Card, Snackbar, IconButton } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { getServerUrl, getServerConfig, testServerConnection } from '../utils/serverConfig';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);
  const [testing, setTesting] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const { login } = useAuth();

  useEffect(() => {
    loadServerUrl();
  }, []);

  const loadServerUrl = async () => {
    const url = await getServerUrl();
    setServerUrl(url);
  };

  const testConnection = async () => {
    setTesting(true);
    const config = await getServerConfig();
    const result = await testServerConnection(config.host, config.port, config.protocol);
    setTesting(false);

    if (result.success) {
      Alert.alert(
        '✅ Connection Success',
        `Backend server is reachable!\n\nServer: ${result.data?.company}\nStatus: ${result.data?.status}\n\nYou can now login.`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('❌ Connection Failed', result.message, [{ text: 'OK' }]);
    }
  };

  const handleLogin = async () => {
    setError('');
    
    if (!username || !password) {
      setError('Please enter both username and password');
      setShowError(true);
      return;
    }

    setLoading(true);
    const result = await login(username, password);
    setLoading(false);

    if (!result.success) {
      setError(result.message);
      setShowError(true);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>📦</Text>
          </View>
          <Text variant="headlineMedium" style={styles.title}>
            Welcome Back
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Distribution Management System
          </Text>
          <Text variant="bodySmall" style={styles.company}>
            Ummahtechinnovations.com
          </Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <TextInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              mode="outlined"
              style={styles.input}
              autoCapitalize="none"
              disabled={loading}
              left={<TextInput.Icon icon="account" />}
            />
            
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry
              style={styles.input}
              disabled={loading}
              left={<TextInput.Icon icon="lock" />}
            />

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              Sign In
            </Button>

            <Button
              mode="outlined"
              onPress={testConnection}
              loading={testing}
              disabled={testing}
              style={[styles.button, { marginTop: 8 }]}
              contentStyle={styles.buttonContent}
            >
              Test Connection
            </Button>

            <View style={styles.actionButtons}>
              <Button
                mode="text"
                onPress={() => navigation.navigate('ServerConfig')}
                style={styles.serverButton}
                icon="cog"
              >
                Server Settings
              </Button>
            </View>

            <View style={styles.serverInfo}>
              <Text variant="bodySmall" style={styles.serverText}>
                📡 Connected to: {serverUrl || 'Loading...'}
              </Text>
            </View>

            <View style={styles.testInfo}>
              <Text variant="bodySmall" style={styles.testText}>
                Test Salesmen: Salesman1-10
              </Text>
              <Text variant="bodySmall" style={styles.testText}>
                Password: Salesman[N]## (e.g., Salesman1##)
              </Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <Snackbar
        visible={showError}
        onDismiss={() => setShowError(false)}
        duration={3000}
        style={styles.snackbar}
      >
        {error}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0ea5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 40,
  },
  title: {
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    color: '#6b7280',
    marginBottom: 4,
  },
  company: {
    color: '#0ea5e9',
    fontWeight: 'bold',
  },
  card: {
    elevation: 4,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    marginBottom: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  actionButtons: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  serverButton: {
    marginVertical: 4,
  },
  serverInfo: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  serverText: {
    color: '#6b7280',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 11,
  },
  testInfo: {
    alignItems: 'center',
    marginTop: 8,
  },
  testText: {
    color: '#6b7280',
  },
  snackbar: {
    backgroundColor: '#ef4444',
  },
});

export default LoginScreen;
