import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper
} from '@mui/material';
import {
  Settings as SettingsIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import {
  getServerConfig,
  setServerConfig,
  testServerConnection
} from '../utils/serverConfig';

const ServerConfigDialog = ({ open, onClose, onConfigured }) => {
  const [config, setConfig] = useState({ host: '', port: '', protocol: 'http' });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const currentConfig = getServerConfig();
      setConfig(currentConfig);
      setTestResult(null);
    }
  }, [open]);

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
  };

  const handleSave = async () => {
    setSaving(true);
    const saved = setServerConfig(config);
    
    if (saved) {
      setTimeout(() => {
        setSaving(false);
        if (onConfigured) onConfigured();
        onClose();
        // Reload the page to apply new configuration
        window.location.reload();
      }, 500);
    } else {
      setSaving(false);
      setTestResult({
        success: false,
        message: 'Failed to save configuration'
      });
    }
  };

  const currentServerUrl = `${config.protocol}://${config.host}:${config.port}/api`;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <SettingsIcon />
          <Typography variant="h6">Server Configuration</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Alert severity="info">
            Configure the central server IP address. All clients must connect to the same server.
          </Alert>

          <FormControl fullWidth>
            <InputLabel>Protocol</InputLabel>
            <Select
              value={config.protocol}
              label="Protocol"
              onChange={(e) => handleChange('protocol', e.target.value)}
            >
              <MenuItem value="http">HTTP</MenuItem>
              <MenuItem value="https">HTTPS</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Server IP / Hostname"
            value={config.host}
            onChange={(e) => handleChange('host', e.target.value)}
            placeholder="192.168.1.100 or your-server.com"
            fullWidth
            helperText="Enter the IP address of the central server"
          />

          <TextField
            label="Port"
            value={config.port}
            onChange={(e) => handleChange('port', e.target.value)}
            placeholder="5000"
            fullWidth
            type="number"
          />

          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="caption" color="text.secondary">
              Server URL:
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
              {currentServerUrl}
            </Typography>
          </Paper>

          <Button
            variant="outlined"
            onClick={handleTest}
            disabled={testing || !config.host || !config.port}
            startIcon={testing ? <CircularProgress size={20} /> : <RefreshIcon />}
            fullWidth
          >
            {testing ? 'Testing Connection...' : 'Test Connection'}
          </Button>

          {testResult && (
            <Alert 
              severity={testResult.success ? 'success' : 'error'}
              icon={testResult.success ? <CheckIcon /> : <ErrorIcon />}
            >
              <Typography variant="body2" fontWeight="bold">
                {testResult.success ? '✅ Connection Successful' : '❌ Connection Failed'}
              </Typography>
              <Typography variant="caption">
                {testResult.message}
              </Typography>
              {testResult.data && (
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  Server: {testResult.data.company} | Status: {testResult.data.status}
                </Typography>
              )}
            </Alert>
          )}

          <Alert severity="warning" sx={{ mt: 1 }}>
            <Typography variant="caption">
              <strong>Important:</strong> Make sure the central server is running before saving this configuration.
              The app will reload after saving.
            </Typography>
          </Alert>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || !config.host || !config.port || (testResult && !testResult.success)}
          startIcon={saving ? <CircularProgress size={20} /> : null}
        >
          {saving ? 'Saving...' : 'Save & Apply'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ServerConfigDialog;
