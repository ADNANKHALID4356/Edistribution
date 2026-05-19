import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Card, HelperText, ActivityIndicator, Divider, IconButton } from 'react-native-paper';
import { getServerConfig, setServerConfig, testServerConnection, getDefaultConfig } from '../utils/serverConfig';
import { useToast } from '../context/ToastContext';

const ServerConfigScreen = ({ navigation }) => {
  const { showToast } = useToast();
  // Use production defaults as initial state (VPS: 147.93.108.205:5005)
  const [config, setConfig] = useState(getDefaultConfig());
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    const currentConfig = await getServerConfig();
    setConfig(currentConfig);
    setLoading(false);
  };

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setTestResult(null);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    
    const result = await testServerConnection(config.host, config.port, config.protocol);
    setTestResult(result);
    setTesting(false);

    if (result.success) {
      showToast('✅ Connection Successful! Server is reachable.', 'success');
    } else {
      Alert.alert(
        '❌ Connection Failed',
        result.message,
        [{ text: 'OK' }]
      );
    }
  };

  const handleSave = async () => {
    if (!config.host || !config.port) {
      showToast('Please enter both host and port', 'warning');
      return;
    }

    setSaving(true);
    const result = await setServerConfig(config);
    setSaving(false);

    if (result.success) {
      Alert.alert(
        'Configuration Saved',
        'Server configuration updated successfully. Please restart the app for changes to take effect.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } else {
      showToast('Failed to save configuration: ' + result.error, 'error');
    }
  };

  const currentServerUrl = `${config.protocol}://${config.host}:${config.port}/api`;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading configuration...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.header}>
              <Text variant="headlineSmall" style={styles.title}>
                Server Configuration
              </Text>
              <Text variant="bodySmall" style={styles.subtitle}>
                Configure the central server IP address
              </Text>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.infoBox}>
              <Text variant="bodySmall" style={styles.infoText}>
                ℹ️ All mobile devices must connect to the same central server where the backend is running.
              </Text>
            </View>

            <TextInput
              label="Server IP / Hostname"
              value={config.host}
              onChangeText={(text) => handleChange('host', text)}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., 192.168.1.100 or your-server.com"
              autoCapitalize="none"
              keyboardType="url"
            />
            <HelperText type="info">
              Enter the IP address of your central server
            </HelperText>

            <TextInput
              label="Port"
              value={config.port}
              onChangeText={(text) => handleChange('port', text)}
              mode="outlined"
              style={styles.input}
              placeholder="5000"
              keyboardType="numeric"
            />
            <HelperText type="info">
              Default is 5005
            </HelperText>

            <View style={styles.urlPreview}>
              <Text variant="labelSmall" style={styles.urlLabel}>
                Server URL:
              </Text>
              <Text variant="bodySmall" style={styles.urlText}>
                {currentServerUrl}
              </Text>
            </View>

            <Button
              mode="outlined"
              onPress={handleTest}
              loading={testing}
              disabled={testing || !config.host || !config.port}
              style={styles.testButton}
              icon="lan-connect"
            >
              Test Connection
            </Button>

            {testResult && (
              <View style={[styles.resultBox, testResult.success ? styles.successBox : styles.errorBox]}>
                <Text style={styles.resultText}>
                  {testResult.success ? '✅ Connection Successful' : '❌ Connection Failed'}
                </Text>
                <Text style={styles.resultMessage}>{testResult.message}</Text>
              </View>
            )}

            <Divider style={styles.divider} />

            <View style={styles.warningBox}>
              <Text variant="bodySmall" style={styles.warningText}>
                ⚠️ Important: Make sure the central server is running before saving. 
                The app needs to be restarted after changing configuration.
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={() => navigation.goBack()}
                style={styles.cancelButton}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={saving}
                disabled={saving || !config.host || !config.port}
                style={styles.saveButton}
                icon="content-save"
              >
                Save & Apply
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  scrollContainer: {
    padding: 16,
  },
  card: {
    elevation: 4,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#666',
  },
  divider: {
    marginVertical: 16,
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    color: '#1976d2',
  },
  input: {
    marginTop: 8,
  },
  urlPreview: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 16,
  },
  urlLabel: {
    color: '#666',
    marginBottom: 4,
  },
  urlText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#000',
  },
  testButton: {
    marginBottom: 16,
  },
  resultBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successBox: {
    backgroundColor: '#e8f5e9',
  },
  errorBox: {
    backgroundColor: '#ffebee',
  },
  resultText: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultMessage: {
    fontSize: 12,
  },
  warningBox: {
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    color: '#e65100',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
});

export default ServerConfigScreen;
