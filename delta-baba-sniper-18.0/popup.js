// Delta Baba Sniper 18.0 - Popup JavaScript
// Handles popup UI interactions and communication with background script

class DeltaBabaPopup {
  constructor() {
    this.isActive = false;
    this.currentTab = null;
    this.settings = {};
    this.signals = [];
    this.updateInterval = null;
    
    this.init();
  }

  async init() {
    try {
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.setup());
      } else {
        this.setup();
      }
    } catch (error) {
      console.error('❌ Popup initialization failed:', error);
    }
  }

  async setup() {
    try {
      // Load settings
      await this.loadSettings();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Initialize UI
      this.initializeUI();
      
      // Start periodic updates
      this.startPeriodicUpdates();
      
      // Check current status
      await this.checkStatus();
      
      console.log('✅ Popup setup complete');
      
    } catch (error) {
      console.error('❌ Setup failed:', error);
    }
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get();
      this.settings = result;
      
      // Apply theme
      this.applyTheme(this.settings.theme || 'trader');
      
      // Apply language
      this.applyLanguage(this.settings.language || 'english');
      
      console.log('✅ Settings loaded:', this.settings);
      
    } catch (error) {
      console.error('❌ Failed to load settings:', error);
      // Use default settings
      this.settings = {
        theme: 'trader',
        language: 'english',
        soundAlerts: true,
        timeframes: ['1m', '5m', '15m', '1h'],
        indicators: {
          ema: [9, 21, 55],
          rsi: { period: 14, overbought: 70, oversold: 30 },
          macd: { fast: 12, slow: 26, signal: 9 },
          supertrend: [
            { period: 4, multiplier: 1 },
            { period: 7, multiplier: 2 },
            { period: 10, multiplier: 3 }
          ]
        }
      };
    }
  }

  setupEventListeners() {
    // Scanner control buttons
    const activateBtn = document.getElementById('activate-scanner');
    const deactivateBtn = document.getElementById('deactivate-scanner');
    
    if (activateBtn) {
      activateBtn.addEventListener('click', () => this.activateScanner());
    }
    
    if (deactivateBtn) {
      deactivateBtn.addEventListener('click', () => this.deactivateScanner());
    }

    // Timeframe selection
    const timeframeBtns = document.querySelectorAll('.timeframe-btn');
    timeframeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.selectTimeframe(e.target.dataset.timeframe);
      });
    });

    // Settings controls
    const themeSelector = document.getElementById('theme-selector');
    if (themeSelector) {
      themeSelector.addEventListener('change', (e) => {
        this.changeTheme(e.target.value);
      });
    }

    const languageSelector = document.getElementById('language-selector');
    if (languageSelector) {
      languageSelector.addEventListener('change', (e) => {
        this.changeLanguage(e.target.value);
      });
    }

    const soundAlerts = document.getElementById('sound-alerts');
    if (soundAlerts) {
      soundAlerts.addEventListener('change', (e) => {
        this.toggleSoundAlerts(e.target.checked);
      });
    }

    // Footer buttons
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshData());
    }

    const helpBtn = document.getElementById('help-btn');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => this.showHelp());
    }

    // Help modal
    const helpModal = document.getElementById('help-modal');
    const modalClose = helpModal?.querySelector('.modal-close');
    
    if (helpModal) {
      helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) {
          this.hideHelp();
        }
      });
    }
    
    if (modalClose) {
      modalClose.addEventListener('click', () => this.hideHelp());
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideHelp();
      }
    });
  }

  initializeUI() {
    try {
      // Set initial theme
      const themeSelector = document.getElementById('theme-selector');
      if (themeSelector) {
        themeSelector.value = this.settings.theme || 'trader';
      }

      // Set initial language
      const languageSelector = document.getElementById('language-selector');
      if (languageSelector) {
        languageSelector.value = this.settings.language || 'english';
      }

      // Set initial sound alerts
      const soundAlerts = document.getElementById('sound-alerts');
      if (soundAlerts) {
        soundAlerts.checked = this.settings.soundAlerts !== false;
      }

      // Set initial timeframe
      this.selectTimeframe(this.settings.timeframes?.[1] || '5m');

      console.log('✅ UI initialized');

    } catch (error) {
      console.error('❌ UI initialization failed:', error);
    }
  }

  startPeriodicUpdates() {
    // Update status every 2 seconds
    this.updateInterval = setInterval(async () => {
      if (this.isActive) {
        await this.updateStatus();
      }
    }, 2000);
  }

  async checkStatus() {
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;

      if (!tab) {
        this.updateStatusDisplay('offline', 'No active tab');
        return;
      }

      // Check if we're on Delta Exchange
      if (!tab.url || !tab.url.includes('delta.exchange')) {
        this.updateStatusDisplay('offline', 'Not on Delta Exchange');
        return;
      }

      // Get extension status
      const response = await chrome.runtime.sendMessage({ action: 'GET_STATUS' });
      
      if (response && response.isActive) {
        this.isActive = true;
        this.updateStatusDisplay('online', 'Scanner Active');
        this.updateScannerControls(true);
        await this.updateScannerInfo();
      } else {
        this.isActive = false;
        this.updateStatusDisplay('offline', 'Scanner Inactive');
        this.updateScannerControls(false);
      }

    } catch (error) {
      console.error('❌ Status check failed:', error);
      this.updateStatusDisplay('offline', 'Error checking status');
    }
  }

  async activateScanner() {
    try {
      if (!this.currentTab) {
        throw new Error('No active tab found');
      }

      this.setLoadingState(true);

      const response = await chrome.runtime.sendMessage({
        action: 'ACTIVATE_SCANNER',
        tabId: this.currentTab.id
      });

      if (response && response.success) {
        this.isActive = true;
        this.updateStatusDisplay('online', 'Scanner Active');
        this.updateScannerControls(true);
        this.updateStatusDisplay('success', 'Scanner activated successfully');
        
        // Start monitoring
        await this.startMonitoring();
        
      } else {
        throw new Error(response?.error || 'Failed to activate scanner');
      }

    } catch (error) {
      console.error('❌ Failed to activate scanner:', error);
      this.updateStatusDisplay('error', `Activation failed: ${error.message}`);
    } finally {
      this.setLoadingState(false);
    }
  }

  async deactivateScanner() {
    try {
      this.setLoadingState(true);

      const response = await chrome.runtime.sendMessage({
        action: 'DEACTIVATE_SCANNER'
      });

      if (response && response.success) {
        this.isActive = false;
        this.updateStatusDisplay('offline', 'Scanner Inactive');
        this.updateScannerControls(false);
        this.updateStatusDisplay('success', 'Scanner deactivated successfully');
        
        // Stop monitoring
        this.stopMonitoring();
        
      } else {
        throw new Error(response?.error || 'Failed to deactivate scanner');
      }

    } catch (error) {
      console.error('❌ Failed to deactivate scanner:', error);
      this.updateStatusDisplay('error', `Deactivation failed: ${error.message}`);
    } finally {
      this.setLoadingState(false);
    }
  }

  selectTimeframe(timeframe) {
    try {
      // Update active button
      const timeframeBtns = document.querySelectorAll('.timeframe-btn');
      timeframeBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.timeframe === timeframe) {
          btn.classList.add('active');
        }
      });

      // Update current timeframe display
      const currentTimeframeElement = document.getElementById('current-timeframe');
      if (currentTimeframeElement) {
        currentTimeframeElement.textContent = timeframe;
      }

      // Send timeframe update to content script
      if (this.currentTab && this.isActive) {
        chrome.tabs.sendMessage(this.currentTab.id, {
          action: 'UPDATE_TIMEFRAME',
          timeframe: timeframe
        }).catch(() => {
          // Ignore errors if content script is not ready
        });
      }

      console.log(`✅ Timeframe updated to: ${timeframe}`);

    } catch (error) {
      console.error('❌ Failed to update timeframe:', error);
    }
  }

  changeTheme(theme) {
    try {
      this.settings.theme = theme;
      this.applyTheme(theme);
      
      // Save settings
      this.saveSettings();
      
      console.log(`✅ Theme changed to: ${theme}`);

    } catch (error) {
      console.error('❌ Failed to change theme:', error);
    }
  }

  changeLanguage(language) {
    try {
      this.settings.language = language;
      this.applyLanguage(language);
      
      // Save settings
      this.saveSettings();
      
      console.log(`✅ Language changed to: ${language}`);

    } catch (error) {
      console.error('❌ Failed to change language:', error);
    }
  }

  toggleSoundAlerts(enabled) {
    try {
      this.settings.soundAlerts = enabled;
      
      // Save settings
      this.saveSettings();
      
      console.log(`✅ Sound alerts ${enabled ? 'enabled' : 'disabled'}`);

    } catch (error) {
      console.error('❌ Failed to toggle sound alerts:', error);
    }
  }

  applyTheme(theme) {
    try {
      const container = document.querySelector('.popup-container');
      if (container) {
        container.setAttribute('data-theme', theme);
      }

      // Update theme selector
      const themeSelector = document.getElementById('theme-selector');
      if (themeSelector) {
        themeSelector.value = theme;
      }

    } catch (error) {
      console.error('❌ Failed to apply theme:', error);
    }
  }

  applyLanguage(language) {
    try {
      // Update language selector
      const languageSelector = document.getElementById('language-selector');
      if (languageSelector) {
        languageSelector.value = language;
      }

      // Apply translations if available
      this.translateUI(language);

    } catch (error) {
      console.error('❌ Failed to apply language:', error);
    }
  }

  translateUI(language) {
    // Simple translation system
    const translations = {
      english: {
        'scanner-control': 'Scanner Control',
        'activate-scanner': '🚀 Activate Scanner',
        'deactivate-scanner': '⏹️ Deactivate Scanner',
        'timeframe-selection': 'Timeframe Selection',
        'live-signals': 'Live Signals',
        'settings': 'Settings',
        'performance': 'Performance'
      },
      hindi: {
        'scanner-control': 'स्कैनर नियंत्रण',
        'activate-scanner': '🚀 स्कैनर सक्रिय करें',
        'deactivate-scanner': '⏹️ स्कैनर निष्क्रिय करें',
        'timeframe-selection': 'समय सीमा चयन',
        'live-signals': 'लाइव संकेत',
        'settings': 'सेटिंग्स',
        'performance': 'प्रदर्शन'
      }
    };

    const currentTranslations = translations[language] || translations.english;
    
    // Apply translations to section headers
    Object.entries(currentTranslations).forEach(([key, value]) => {
      const elements = document.querySelectorAll(`[data-translate="${key}"]`);
      elements.forEach(element => {
        element.textContent = value;
      });
    });
  }

  async startMonitoring() {
    try {
      // Start monitoring for signals
      this.monitorSignals();
      
      // Start monitoring for updates
      this.monitorUpdates();
      
      console.log('✅ Monitoring started');

    } catch (error) {
      console.error('❌ Failed to start monitoring:', error);
    }
  }

  stopMonitoring() {
    try {
      // Clear any monitoring intervals
      if (this.signalMonitorInterval) {
        clearInterval(this.signalMonitorInterval);
        this.signalMonitorInterval = null;
      }
      
      if (this.updateMonitorInterval) {
        clearInterval(this.updateMonitorInterval);
        this.updateMonitorInterval = null;
      }
      
      console.log('✅ Monitoring stopped');

    } catch (error) {
      console.error('❌ Failed to stop monitoring:', error);
    }
  }

  monitorSignals() {
    // Monitor for new signals every 5 seconds
    this.signalMonitorInterval = setInterval(async () => {
      if (this.isActive) {
        await this.checkForNewSignals();
      }
    }, 5000);
  }

  monitorUpdates() {
    // Monitor for updates every 10 seconds
    this.updateMonitorInterval = setInterval(async () => {
      if (this.isActive) {
        await this.updateScannerInfo();
        await this.updatePerformanceMetrics();
      }
    }, 10000);
  }

  async checkForNewSignals() {
    try {
      // Get signals from storage
      const result = await chrome.storage.local.get('signals');
      const signals = result.signals || [];
      
      // Check for new signals
      const newSignals = signals.filter(signal => 
        !this.signals.find(existing => existing.id === signal.id)
      );
      
      if (newSignals.length > 0) {
        // Add new signals
        this.signals.unshift(...newSignals);
        
        // Update display
        this.updateSignalsDisplay();
        
        // Play sound if enabled
        if (this.settings.soundAlerts) {
          this.playAlertSound();
        }
        
        // Show notification
        this.showSignalNotification(newSignals[0]);
      }

    } catch (error) {
      console.error('❌ Failed to check for new signals:', error);
    }
  }

  async updateScannerInfo() {
    try {
      if (!this.currentTab || !this.isActive) return;

      // Get status from content script
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'GET_STATUS'
      });

      if (response) {
        // Update symbol
        const symbolElement = document.getElementById('current-symbol');
        if (symbolElement) {
          symbolElement.textContent = response.symbol || '-';
        }

        // Update timeframe
        const timeframeElement = document.getElementById('current-timeframe');
        if (timeframeElement) {
          timeframeElement.textContent = response.timeframe || '-';
        }

        // Update data points
        const dataPointsElement = document.getElementById('data-points');
        if (dataPointsElement) {
          dataPointsElement.textContent = response.dataPoints || '-';
        }
      }

    } catch (error) {
      // Ignore errors if content script is not ready
    }
  }

  async updatePerformanceMetrics() {
    try {
      // Get performance metrics from storage
      const result = await chrome.storage.local.get(['signals', 'performance']);
      const signals = result.signals || [];
      const performance = result.performance || {};
      
      // Calculate metrics
      const totalSignals = signals.length;
      const successfulSignals = signals.filter(s => s.confidence > 0.7).length;
      const accuracy = totalSignals > 0 ? (successfulSignals / totalSignals * 100).toFixed(1) : 0;
      const successRate = totalSignals > 0 ? (successfulSignals / totalSignals * 100).toFixed(1) : 0;
      
      // Update display
      const accuracyElement = document.getElementById('accuracy-metric');
      if (accuracyElement) {
        accuracyElement.textContent = `${accuracy}%`;
      }

      const totalSignalsElement = document.getElementById('total-signals');
      if (totalSignalsElement) {
        totalSignalsElement.textContent = totalSignals;
      }

      const successRateElement = document.getElementById('success-rate');
      if (successRateElement) {
        successRateElement.textContent = `${successRate}%`;
      }

    } catch (error) {
      console.error('❌ Failed to update performance metrics:', error);
    }
  }

  updateSignalsDisplay() {
    try {
      const container = document.getElementById('signals-container');
      if (!container) return;

      if (this.signals.length === 0) {
        container.innerHTML = `
          <div class="no-signals">
            <div class="no-signals-icon">📊</div>
            <p>No signals yet</p>
            <small>Activate scanner to start receiving signals</small>
          </div>
        `;
        return;
      }

      // Clear container
      container.innerHTML = '';

      // Add signal items
      this.signals.slice(0, 5).forEach(signal => {
        const signalElement = this.createSignalElement(signal);
        container.appendChild(signalElement);
      });

    } catch (error) {
      console.error('❌ Failed to update signals display:', error);
    }
  }

  createSignalElement(signal) {
    try {
      const signalElement = document.createElement('div');
      signalElement.className = 'signal-item';
      
      const signalType = signal.type.includes('BUY') ? 'buy' : 'sell';
      const confidence = Math.round(signal.confidence * 100);
      
      signalElement.innerHTML = `
        <div class="signal-header">
          <span class="signal-type ${signalType}">${signal.type}</span>
          <span class="signal-time">${this.formatTime(signal.timestamp)}</span>
        </div>
        <div class="signal-details">
          <div class="signal-detail">
            <span class="label">Price</span>
            <span class="value">${signal.price || 'N/A'}</span>
          </div>
          <div class="signal-detail">
            <span class="label">Symbol</span>
            <span class="value">${signal.symbol || 'N/A'}</span>
          </div>
        </div>
        <div class="signal-confidence">
          <div class="confidence-bars">
            ${this.createConfidenceBars(confidence)}
          </div>
          <span class="confidence-text">${confidence}% confidence</span>
        </div>
      `;
      
      return signalElement;

    } catch (error) {
      console.error('❌ Failed to create signal element:', error);
      return document.createElement('div');
    }
  }

  createConfidenceBars(confidence) {
    const bars = [];
    const totalBars = 5;
    const activeBars = Math.round((confidence / 100) * totalBars);
    
    for (let i = 0; i < totalBars; i++) {
      const isActive = i < activeBars;
      bars.push(`<div class="confidence-bar ${isActive ? 'active' : ''}"></div>`);
    }
    
    return bars.join('');
  }

  formatTime(timestamp) {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      
      if (diff < 60000) { // Less than 1 minute
        return 'Just now';
      } else if (diff < 3600000) { // Less than 1 hour
        const minutes = Math.floor(diff / 60000);
        return `${minutes}m ago`;
      } else if (diff < 86400000) { // Less than 1 day
        const hours = Math.floor(diff / 3600000);
        return `${hours}h ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      return 'Unknown';
    }
  }

  updateStatusDisplay(status, message) {
    try {
      const statusDot = document.getElementById('status-dot');
      const statusText = document.getElementById('status-text');
      
      if (statusDot) {
        statusDot.className = `status-dot ${status}`;
      }
      
      if (statusText) {
        statusText.textContent = message;
      }

      // Auto-clear success/error messages
      if (status === 'success' || status === 'error') {
        setTimeout(() => {
          if (this.isActive) {
            this.updateStatusDisplay('online', 'Scanner Active');
          } else {
            this.updateStatusDisplay('offline', 'Scanner Inactive');
          }
        }, 3000);
      }

    } catch (error) {
      console.error('❌ Failed to update status display:', error);
    }
  }

  updateScannerControls(active) {
    try {
      const activateBtn = document.getElementById('activate-scanner');
      const deactivateBtn = document.getElementById('deactivate-scanner');
      
      if (activateBtn) {
        activateBtn.disabled = active;
      }
      
      if (deactivateBtn) {
        deactivateBtn.disabled = !active;
      }

    } catch (error) {
      console.error('❌ Failed to update scanner controls:', error);
    }
  }

  setLoadingState(loading) {
    try {
      const container = document.querySelector('.popup-container');
      if (container) {
        if (loading) {
          container.classList.add('loading');
        } else {
          container.classList.remove('loading');
        }
      }

    } catch (error) {
      console.error('❌ Failed to set loading state:', error);
    }
  }

  async refreshData() {
    try {
      this.setLoadingState(true);
      
      // Refresh status
      await this.checkStatus();
      
      // Refresh scanner info
      if (this.isActive) {
        await this.updateScannerInfo();
        await this.updatePerformanceMetrics();
        await this.checkForNewSignals();
      }
      
      // Update last update time
      const lastUpdateElement = document.getElementById('last-update');
      if (lastUpdateElement) {
        lastUpdateElement.textContent = `Last update: ${new Date().toLocaleTimeString()}`;
      }
      
      this.updateStatusDisplay('success', 'Data refreshed');
      
    } catch (error) {
      console.error('❌ Failed to refresh data:', error);
      this.updateStatusDisplay('error', 'Refresh failed');
    } finally {
      this.setLoadingState(false);
    }
  }

  showHelp() {
    try {
      const modal = document.getElementById('help-modal');
      if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
      }

    } catch (error) {
      console.error('❌ Failed to show help:', error);
    }
  }

  hideHelp() {
    try {
      const modal = document.getElementById('help-modal');
      if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
      }

    } catch (error) {
      console.error('❌ Failed to hide help:', error);
    }
  }

  playAlertSound() {
    try {
      // Create audio context for sound alerts
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
      
    } catch (error) {
      console.error('❌ Failed to play alert sound:', error);
    }
  }

  showSignalNotification(signal) {
    try {
      // Show browser notification if permitted
      if (Notification.permission === 'granted') {
        new Notification('Delta Baba Sniper Signal', {
          body: `${signal.type} ${signal.symbol} at ${signal.price}`,
          icon: chrome.runtime.getURL('icons/icon48.png'),
          tag: 'delta-baba-signal'
        });
      }
      
      // Show in-app notification
      this.showInAppNotification(signal);
      
    } catch (error) {
      console.error('❌ Failed to show signal notification:', error);
    }
  }

  showInAppNotification(signal) {
    try {
      // Create notification element
      const notification = document.createElement('div');
      notification.className = 'in-app-notification';
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--bg-primary);
        border: 2px solid var(--success-color);
        border-radius: var(--radius-md);
        padding: var(--spacing-md);
        box-shadow: var(--shadow-heavy);
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
      `;
      
      notification.innerHTML = `
        <div style="font-weight: 600; margin-bottom: var(--spacing-sm);">
          🚀 New Signal: ${signal.type}
        </div>
        <div style="font-size: 12px; color: var(--text-secondary);">
          ${signal.symbol} @ ${signal.price}
        </div>
      `;
      
      // Add to page
      document.body.appendChild(notification);
      
      // Remove after 5 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 5000);
      
    } catch (error) {
      console.error('❌ Failed to show in-app notification:', error);
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.local.set(this.settings);
      console.log('✅ Settings saved');
    } catch (error) {
      console.error('❌ Failed to save settings:', error);
    }
  }

  async updateStatus() {
    try {
      if (this.isActive) {
        await this.updateScannerInfo();
      }
    } catch (error) {
      console.error('❌ Status update failed:', error);
    }
  }

  // Cleanup method
  destroy() {
    try {
      // Clear intervals
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
      }
      
      if (this.signalMonitorInterval) {
        clearInterval(this.signalMonitorInterval);
      }
      
      if (this.updateMonitorInterval) {
        clearInterval(this.updateMonitorInterval);
      }
      
      console.log('✅ Popup destroyed');
      
    } catch (error) {
      console.error('❌ Failed to destroy popup:', error);
    }
  }
}

// Initialize popup when DOM is ready
let deltaBabaPopup;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    deltaBabaPopup = new DeltaBabaPopup();
  });
} else {
  deltaBabaPopup = new DeltaBabaPopup();
}

// Cleanup on popup close
window.addEventListener('beforeunload', () => {
  if (deltaBabaPopup) {
    deltaBabaPopup.destroy();
  }
});