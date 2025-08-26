// Delta Baba Sniper 18.0 - Background Service Worker
// Handles extension lifecycle and communication

class DeltaBabaBackground {
  constructor() {
    this.isActive = false;
    this.currentTab = null;
    this.connections = new Map();
    this.init();
  }

  init() {
    // Listen for extension installation/update
    chrome.runtime.onInstalled.addListener(this.handleInstall.bind(this));
    
    // Listen for messages from content scripts and popup
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // Handle tab updates to inject content scripts
    chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
    
    // Handle tab activation
    chrome.tabs.onActivated.addListener(this.handleTabActivated.bind(this));
    
    // Handle extension icon click
    chrome.action.onClicked.addListener(this.handleActionClick.bind(this));
    
    console.log('🚀 Delta Baba Sniper 18.0 Background Service Worker Initialized');
  }

  async handleInstall(details) {
    if (details.reason === 'install') {
      console.log('🎉 Delta Baba Sniper 18.0 Installed Successfully');
      
      // Set default settings
      await chrome.storage.local.set({
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
      });
    } else if (details.reason === 'update') {
      console.log('🔄 Delta Baba Sniper 18.0 Updated to Version 18.0.0');
    }
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'GET_STATUS':
          sendResponse({ 
            isActive: this.isActive, 
            currentTab: this.currentTab,
            version: '18.0.0'
          });
          break;

        case 'ACTIVATE_SCANNER':
          this.isActive = true;
          this.currentTab = request.tabId;
          await this.injectScanner(request.tabId);
          sendResponse({ success: true, message: 'Scanner activated' });
          break;

        case 'DEACTIVATE_SCANNER':
          this.isActive = false;
          this.currentTab = null;
          sendResponse({ success: true, message: 'Scanner deactivated' });
          break;

        case 'UPDATE_SETTINGS':
          await chrome.storage.local.set(request.settings);
          sendResponse({ success: true, message: 'Settings updated' });
          break;

        case 'GET_SETTINGS':
          const settings = await chrome.storage.local.get();
          sendResponse({ success: true, settings });
          break;

        case 'SIGNAL_GENERATED':
          // Handle trading signal
          await this.handleTradingSignal(request.signal);
          sendResponse({ success: true, message: 'Signal processed' });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('❌ Background Error:', error);
      sendResponse({ success: false, error: error.message });
    }
    
    return true; // Keep message channel open for async response
  }

  async handleTabUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && 
        tab.url && 
        tab.url.includes('delta.exchange') &&
        this.isActive) {
      
      // Re-inject scanner if needed
      await this.injectScanner(tabId);
    }
  }

  async handleTabActivated(activeInfo) {
    if (this.isActive && activeInfo.tabId === this.currentTab) {
      // Tab is active, ensure scanner is running
      await this.injectScanner(activeInfo.tabId);
    }
  }

  async handleActionClick(tab) {
    if (tab.url && tab.url.includes('delta.exchange')) {
      // Open popup or toggle scanner
      if (this.isActive) {
        this.isActive = false;
        this.currentTab = null;
        chrome.action.setBadgeText({ text: '' });
      } else {
        this.isActive = true;
        this.currentTab = tab.id;
        chrome.action.setBadgeText({ text: 'ON' });
        chrome.action.setBadgeBackgroundColor({ color: '#00ff00' });
      }
    } else {
      // Show error message
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#ff0000' });
    }
  }

  async injectScanner(tabId) {
    try {
      // Inject the main scanner script
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['chart.js', 'indicators.js', 'prediction.js']
      });

      // Inject the content script
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });

      console.log(`✅ Scanner injected into tab ${tabId}`);
    } catch (error) {
      console.error(`❌ Failed to inject scanner into tab ${tabId}:`, error);
    }
  }

  async handleTradingSignal(signal) {
    try {
      // Store signal in storage
      const signals = await chrome.storage.local.get('signals') || [];
      signals.push({
        ...signal,
        timestamp: Date.now(),
        id: `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });

      // Keep only last 100 signals
      if (signals.length > 100) {
        signals.splice(0, signals.length - 100);
      }

      await chrome.storage.local.set({ signals });

      // Show notification if enabled
      if (signal.type === 'BUY' || signal.type === 'SELL') {
        await this.showNotification(signal);
      }

      console.log('📊 Trading signal processed:', signal);
    } catch (error) {
      console.error('❌ Error processing trading signal:', error);
    }
  }

  async showNotification(signal) {
    try {
      const settings = await chrome.storage.local.get();
      
      if (settings.soundAlerts) {
        // Play sound alert
        const audio = new Audio(chrome.runtime.getURL('sounds/alert.mp3'));
        audio.play().catch(() => {}); // Ignore errors
      }

      // Show browser notification
      if (Notification.permission === 'granted') {
        new Notification('Delta Baba Sniper Signal', {
          body: `${signal.type} ${signal.symbol} at ${signal.price}`,
          icon: chrome.runtime.getURL('icons/icon48.png'),
          tag: 'delta-baba-signal'
        });
      }
    } catch (error) {
      console.error('❌ Error showing notification:', error);
    }
  }
}

// Initialize the background service
const deltaBaba = new DeltaBabaBackground();