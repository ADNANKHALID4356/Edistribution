/**
 * Auto Sync Service - Sprint 9
 * Distribution Management System
 * Company: Ummahtechinnovations.com
 * 
 * Features:
 * - Detect network connectivity changes
 * - Auto-sync when connection restored
 * - Background sync with configurable interval
 * - App state monitoring (foreground/background)
 * - Sync attempt tracking
 */

import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import orderService from './orderService'; // ✅ Use Sprint 5 proven service

const BACKGROUND_SYNC_TASK = 'background-order-sync';
const SYNC_INTERVAL = 30 * 60; // 30 minutes in seconds

class AutoSyncService {
  constructor() {
    this.isConnected = true;
    this.appState = 'active';
    this.syncInProgress = false;
    this.unsubscribeNetInfo = null;
    this.appStateSubscription = null;
    this.salesmanId = null;
    this.autoSyncEnabled = true;
  }

  /**
   * Initialize auto-sync service
   */
  async initialize(salesmanId) {
    try {
      console.log('🔄 Initializing Auto-Sync Service...');
      this.salesmanId = salesmanId;

      // Load auto-sync preference
      const enabled = await AsyncStorage.getItem('auto_sync_enabled');
      this.autoSyncEnabled = enabled !== 'false'; // Default to true

      // Setup network connectivity listener
      await this.setupNetworkListener();

      // Setup app state listener
      this.setupAppStateListener();

      // Register background task
      await this.registerBackgroundSync();

      // Check initial connectivity
      const netState = await NetInfo.fetch();
      this.isConnected = netState.isConnected && netState.isInternetReachable;

      console.log(`✅ Auto-Sync initialized (Connected: ${this.isConnected}, Enabled: ${this.autoSyncEnabled})`);
    } catch (error) {
      console.error('❌ Failed to initialize Auto-Sync:', error);
    }
  }

  /**
   * Setup network connectivity listener
   */
  async setupNetworkListener() {
    this.unsubscribeNetInfo = NetInfo.addEventListener(state => {
      const wasConnected = this.isConnected;
      const isConnected = state.isConnected && state.isInternetReachable;

      console.log(`📡 Network changed: ${wasConnected ? 'Connected' : 'Disconnected'} → ${isConnected ? 'Connected' : 'Disconnected'}`);
      console.log(`   Type: ${state.type}, Details:`, state.details);

      this.isConnected = isConnected;

      // Trigger sync when connection is restored
      if (!wasConnected && isConnected && this.autoSyncEnabled) {
        console.log('✅ Connection restored - triggering auto-sync...');
        this.triggerAutoSync('connectivity_restored');
      }
    });
  }

  /**
   * Setup app state listener (foreground/background)
   */
  setupAppStateListener() {
    this.appStateSubscription = AppState.addEventListener('change', nextAppState => {
      console.log(`📱 App state changed: ${this.appState} → ${nextAppState}`);

      const wasBackground = this.appState === 'background' || this.appState === 'inactive';
      const isActive = nextAppState === 'active';

      this.appState = nextAppState;

      // Trigger sync when app comes to foreground
      if (wasBackground && isActive && this.autoSyncEnabled && this.isConnected) {
        console.log('✅ App resumed - checking for pending orders...');
        this.triggerAutoSync('app_resumed');
      }
    });
  }

  /**
   * Register background sync task
   */
  async registerBackgroundSync() {
    try {
      // Check if task is already registered
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
      
      if (!isRegistered) {
        // Define the background task
        TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
          try {
            console.log('⏰ Background sync task triggered');
            
            // Get salesman ID from storage
            const userStr = await AsyncStorage.getItem('user');
            if (!userStr) {
              console.log('⏭️  No user found - skipping background sync');
              return BackgroundFetch.BackgroundFetchResult.NoData;
            }

            const user = JSON.parse(userStr);
            const salesmanId = user.id;

            // Check if auto-sync is enabled
            const enabled = await AsyncStorage.getItem('auto_sync_enabled');
            if (enabled === 'false') {
              console.log('⏭️  Auto-sync disabled - skipping');
              return BackgroundFetch.BackgroundFetchResult.NoData;
            }

            // Sprint 9: First, retry any previously failed syncs
            console.log('🔄 Checking for failed syncs to retry...');
            const retryResult = await this.retryFailedSyncs();
            console.log(`✅ Retry result: ${retryResult.succeeded} succeeded, ${retryResult.failed} failed`);

            // Then perform regular sync
            const result = await syncService.syncOrders(salesmanId, {
              deviceId: 'background-task',
              os: 'iOS/Android',
              appVersion: '1.0.0',
            });

            // Track attempt
            await this.trackSyncAttempt('background_task', result.success);

            // Sprint 9: Record failure for retry if sync failed
            if (!result.success) {
              await this.recordFailedSync('background_task', result.error);
            }

            if (result.success && result.synced > 0) {
              console.log(`✅ Background sync completed: ${result.synced} orders synced`);
              return BackgroundFetch.BackgroundFetchResult.NewData;
            } else {
              return BackgroundFetch.BackgroundFetchResult.NoData;
            }
          } catch (error) {
            console.error('❌ Background sync error:', error);
            // Sprint 9: Record failure for retry
            await this.recordFailedSync('background_task', error.message);
            return BackgroundFetch.BackgroundFetchResult.Failed;
          }
        });

        // Register the task with the system
        await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
          minimumInterval: SYNC_INTERVAL, // 30 minutes
          stopOnTerminate: false, // Continue after app is killed
          startOnBoot: true, // Start on device boot
        });

        console.log(`✅ Background sync registered (interval: ${SYNC_INTERVAL / 60} minutes)`);
      } else {
        console.log('ℹ️  Background sync already registered');
      }
    } catch (error) {
      console.error('❌ Failed to register background sync:', error);
    }
  }

  /**
   * Trigger auto-sync
   */
  async triggerAutoSync(reason = 'manual') {
    if (this.syncInProgress) {
      console.log('⏳ Sync already in progress - skipping');
      return { success: false, message: 'Sync already in progress' };
    }

    if (!this.isConnected) {
      console.log('❌ No internet connection - skipping sync');
      return { success: false, message: 'No internet connection' };
    }

    if (!this.autoSyncEnabled) {
      console.log('⏭️  Auto-sync disabled - skipping');
      return { success: false, message: 'Auto-sync disabled' };
    }

    if (!this.salesmanId) {
      console.log('❌ No salesman ID - cannot sync');
      return { success: false, message: 'No salesman ID' };
    }

    try {
      this.syncInProgress = true;
      console.log(`🔄 Auto-sync triggered (reason: ${reason})`);

      // ✅ Use Sprint 5's proven sync method (same as Dashboard and OrdersListScreen)
      const result = await orderService.syncOrdersToBackend(this.salesmanId);

      // Track attempt
      await this.trackSyncAttempt(reason, result.success);

      if (result.success && result.synced > 0) {
        console.log(`✅ Auto-sync completed: ${result.synced} orders synced`);
      } else if (result.success) {
        console.log('ℹ️  Auto-sync completed: No orders to sync');
      } else {
        console.log(`⚠️  Auto-sync failed: ${result.error}`);
        // Sprint 9: Record failed sync for automatic retry
        await this.recordFailedSync(reason, result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ Auto-sync error:', error);
      await this.trackSyncAttempt(reason, false);
      // Sprint 9: Record failed sync for automatic retry
      await this.recordFailedSync(reason, error.message);
      return { success: false, error: error.message };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Track sync attempt in AsyncStorage
   */
  async trackSyncAttempt(reason, success) {
    try {
      const attempt = {
        timestamp: new Date().toISOString(),
        reason,
        success,
        connected: this.isConnected,
        appState: this.appState,
      };

      // Get existing attempts
      const attemptsStr = await AsyncStorage.getItem('sync_attempts');
      const attempts = attemptsStr ? JSON.parse(attemptsStr) : [];

      // Add new attempt
      attempts.unshift(attempt);

      // Keep only last 50 attempts
      if (attempts.length > 50) {
        attempts.length = 50;
      }

      await AsyncStorage.setItem('sync_attempts', JSON.stringify(attempts));
      console.log(`📊 Sync attempt tracked: ${reason} - ${success ? 'Success' : 'Failed'}`);
    } catch (error) {
      console.error('Error tracking sync attempt:', error);
    }
  }

  /**
   * Get sync attempt history
   */
  async getSyncHistory() {
    try {
      const attemptsStr = await AsyncStorage.getItem('sync_attempts');
      return attemptsStr ? JSON.parse(attemptsStr) : [];
    } catch (error) {
      console.error('Error getting sync history:', error);
      return [];
    }
  }

  /**
   * Sprint 9: Get failed sync operations that need retry
   * Returns syncs that failed and haven't exceeded max retry attempts
   */
  async getFailedSyncs() {
    try {
      const historyStr = await AsyncStorage.getItem('failed_syncs');
      if (!historyStr) {
        return [];
      }

      const allFailed = JSON.parse(historyStr);
      const now = Date.now();

      // Filter syncs that need retry (not exceeded max attempts and backoff time passed)
      const needRetry = allFailed.filter(sync => {
        const attempts = sync.attempts || 0;
        if (attempts >= 5) {
          return false; // Max retries exceeded
        }

        const backoffDelay = this.calculateBackoffDelay(attempts);
        const timeSinceLastAttempt = now - new Date(sync.last_attempt_at).getTime();
        
        return timeSinceLastAttempt >= backoffDelay;
      });

      return needRetry;
    } catch (error) {
      console.error('Error getting failed syncs:', error);
      return [];
    }
  }

  /**
   * Sprint 9: Calculate exponential backoff delay
   * Retry attempts: 1min, 5min, 15min, 30min, 60min
   */
  calculateBackoffDelay(attempts) {
    const delays = [
      1 * 60 * 1000,      // 1 minute
      5 * 60 * 1000,      // 5 minutes
      15 * 60 * 1000,     // 15 minutes
      30 * 60 * 1000,     // 30 minutes
      60 * 60 * 1000,     // 60 minutes
    ];

    return delays[Math.min(attempts, delays.length - 1)];
  }

  /**
   * Sprint 9: Record a failed sync operation for retry
   */
  async recordFailedSync(reason, errorMessage) {
    try {
      const failedSync = {
        id: Date.now(), // Simple unique ID
        reason,
        error: errorMessage,
        attempts: 0,
        first_failed_at: new Date().toISOString(),
        last_attempt_at: new Date().toISOString(),
      };

      // Get existing failed syncs
      const historyStr = await AsyncStorage.getItem('failed_syncs');
      const history = historyStr ? JSON.parse(historyStr) : [];

      // Add new failed sync
      history.push(failedSync);

      // Keep only last 100 failed syncs
      if (history.length > 100) {
        history.shift();
      }

      await AsyncStorage.setItem('failed_syncs', JSON.stringify(history));
      console.log(`📝 Failed sync recorded: ${reason}`);
    } catch (error) {
      console.error('Error recording failed sync:', error);
    }
  }

  /**
   * Sprint 9: Retry failed sync operations with exponential backoff
   * Called by background task every 30 minutes
   */
  async retryFailedSyncs() {
    try {
      const failedSyncs = await this.getFailedSyncs();
      
      if (failedSyncs.length === 0) {
        console.log('✅ No failed syncs to retry');
        return { success: true, retried: 0, succeeded: 0, failed: 0 };
      }

      console.log(`🔄 Retrying ${failedSyncs.length} failed sync operations...`);

      let succeeded = 0;
      let failed = 0;

      for (const sync of failedSyncs) {
        try {
          // Attempt sync
          const result = await this.triggerAutoSync(`retry_${sync.reason}`);

          if (result.success) {
            // Sync succeeded - remove from failed list
            await this.removeFailedSync(sync.id);
            succeeded++;
            console.log(`✅ Retry succeeded for: ${sync.reason}`);
          } else {
            // Sync failed again - increment attempts
            await this.updateFailedSyncAttempt(sync.id);
            failed++;
            console.log(`❌ Retry failed for: ${sync.reason} (attempt ${sync.attempts + 1}/5)`);
          }
        } catch (error) {
          // Error during retry - increment attempts
          await this.updateFailedSyncAttempt(sync.id);
          failed++;
          console.error(`❌ Error retrying sync: ${sync.reason}`, error);
        }
      }

      console.log(`✅ Retry completed: ${succeeded} succeeded, ${failed} failed`);
      return {
        success: true,
        retried: failedSyncs.length,
        succeeded,
        failed,
      };
    } catch (error) {
      console.error('❌ Error in retryFailedSyncs:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sprint 9: Update failed sync attempt count
   */
  async updateFailedSyncAttempt(syncId) {
    try {
      const historyStr = await AsyncStorage.getItem('failed_syncs');
      if (!historyStr) return;

      const history = JSON.parse(historyStr);
      const sync = history.find(s => s.id === syncId);
      
      if (sync) {
        sync.attempts = (sync.attempts || 0) + 1;
        sync.last_attempt_at = new Date().toISOString();
        await AsyncStorage.setItem('failed_syncs', JSON.stringify(history));
      }
    } catch (error) {
      console.error('Error updating failed sync attempt:', error);
    }
  }

  /**
   * Sprint 9: Remove a failed sync from the retry queue
   */
  async removeFailedSync(syncId) {
    try {
      const historyStr = await AsyncStorage.getItem('failed_syncs');
      if (!historyStr) return;

      const history = JSON.parse(historyStr);
      const filtered = history.filter(s => s.id !== syncId);
      
      await AsyncStorage.setItem('failed_syncs', JSON.stringify(filtered));
      console.log(`🗑️  Removed failed sync ${syncId} from retry queue`);
    } catch (error) {
      console.error('Error removing failed sync:', error);
    }
  }

  /**
   * Enable/disable auto-sync
   */
  async setAutoSyncEnabled(enabled) {
    this.autoSyncEnabled = enabled;
    await AsyncStorage.setItem('auto_sync_enabled', enabled ? 'true' : 'false');
    console.log(`⚙️  Auto-sync ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if auto-sync is enabled
   */
  isAutoSyncEnabled() {
    return this.autoSyncEnabled;
  }

  /**
   * Get current connection status
   */
  isOnline() {
    return this.isConnected;
  }

  /**
   * Get current app state
   */
  getAppState() {
    return this.appState;
  }

  /**
   * Force sync now (manual trigger)
   */
  async syncNow() {
    return this.triggerAutoSync('manual_trigger');
  }

  /**
   * Cleanup listeners
   */
  cleanup() {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    console.log('🧹 Auto-Sync Service cleaned up');
  }

  /**
   * Unregister background task
   */
  async unregisterBackgroundSync() {
    try {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
      console.log('✅ Background sync unregistered');
    } catch (error) {
      console.error('Error unregistering background sync:', error);
    }
  }
}

// Export singleton instance
const autoSyncService = new AutoSyncService();
export default autoSyncService;
