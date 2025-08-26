// Delta Baba Sniper 18.0 - Background Service Worker
// Handles extension lifecycle, message passing, and API communication

class DeltaBabaBackground {
    constructor() {
        this.isActive = false;
        this.connections = new Map();
        this.lastDataUpdate = 0;
        this.dataCache = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.startHeartbeat();
        console.log('Delta Baba Sniper: Background service worker initialized');
    }

    setupEventListeners() {
        // Extension installation
        chrome.runtime.onInstalled.addListener((details) => {
            this.onExtensionInstalled(details);
        });

        // Extension startup
        chrome.runtime.onStartup.addListener(() => {
            this.onExtensionStartup();
        });

        // Message handling
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open for async response
        });

        // Tab updates
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.onTabUpdated(tabId, changeInfo, tab);
        });

        // Tab activation
        chrome.tabs.onActivated.addListener((activeInfo) => {
            this.onTabActivated(activeInfo);
        });

        // Connection handling
        chrome.runtime.onConnect.addListener((port) => {
            this.onPortConnect(port);
        });
    }

    onExtensionInstalled(details) {
        console.log('Delta Baba Sniper: Extension installed', details);
        
        // Set default settings
        this.setDefaultSettings();
        
        // Open welcome page if first install
        if (details.reason === 'install') {
            this.openWelcomePage();
        }
    }

    onExtensionStartup() {
        console.log('Delta Baba Sniper: Extension started');
        this.isActive = true;
        
        // Check for Delta Exchange tabs
        this.checkDeltaExchangeTabs();
    }

    async setDefaultSettings() {
        try {
            const defaultSettings = {
                soundAlerts: true,
                language: 'en',
                predictionTime: 5,
                theme: 'light',
                autoSync: true,
                notifications: true
            };
            
            await chrome.storage.sync.set({ settings: defaultSettings });
            console.log('Delta Baba Sniper: Default settings applied');
        } catch (error) {
            console.error('Delta Baba Sniper: Failed to set default settings:', error);
        }
    }

    openWelcomePage() {
        try {
            chrome.tabs.create({
                url: chrome.runtime.getURL('welcome.html')
            });
        } catch (error) {
            console.error('Delta Baba Sniper: Failed to open welcome page:', error);
        }
    }

    async checkDeltaExchangeTabs() {
        try {
            const tabs = await chrome.tabs.query({ url: '*://*.delta.exchange/*' });
            
            if (tabs.length > 0) {
                console.log('Delta Baba Sniper: Found Delta Exchange tabs:', tabs.length);
                
                // Inject content script into existing tabs
                for (const tab of tabs) {
                    await this.injectContentScript(tab.id);
                }
            }
        } catch (error) {
            console.error('Delta Baba Sniper: Error checking Delta Exchange tabs:', error);
        }
    }

    async injectContentScript(tabId) {
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            });
            console.log('Delta Baba Sniper: Content script injected into tab', tabId);
        } catch (error) {
            console.error('Delta Baba Sniper: Failed to inject content script:', error);
        }
    }

    onTabUpdated(tabId, changeInfo, tab) {
        // Check if this is a Delta Exchange tab
        if (tab.url && tab.url.includes('delta.exchange') && changeInfo.status === 'complete') {
            console.log('Delta Baba Sniper: Delta Exchange tab updated:', tabId);
            
            // Inject content script
            this.injectContentScript(tabId);
        }
    }

    onTabActivated(activeInfo) {
        // Handle tab activation
        this.updateExtensionIcon(activeInfo.tabId);
    }

    async updateExtensionIcon(tabId) {
        try {
            const tab = await chrome.tabs.get(tabId);
            
            if (tab.url && tab.url.includes('delta.exchange')) {
                // Set active icon
                await chrome.action.setIcon({
                    path: {
                        16: 'icons/icon16-active.png',
                        32: 'icons/icon32-active.png',
                        48: 'icons/icon48-active.png',
                        128: 'icons/icon128-active.png'
                    }
                });
                
                // Set active title
                await chrome.action.setTitle({
                    title: 'Delta Baba Sniper 18.0 - Active on Delta Exchange'
                });
            } else {
                // Set inactive icon
                await chrome.action.setIcon({
                    path: {
                        16: 'icons/icon16.png',
                        32: 'icons/icon32.png',
                        48: 'icons/icon48.png',
                        128: 'icons/icon128.png'
                    }
                });
                
                // Set inactive title
                await chrome.action.setTitle({
                    title: 'Delta Baba Sniper 18.0 - Navigate to Delta Exchange to use'
                });
            }
        } catch (error) {
            console.error('Delta Baba Sniper: Failed to update extension icon:', error);
        }
    }

    onPortConnect(port) {
        console.log('Delta Baba Sniper: Port connected:', port.name);
        
        // Store connection
        this.connections.set(port.name, port);
        
        // Handle port messages
        port.onMessage.addListener((message) => {
            this.handlePortMessage(message, port);
        });
        
        // Handle port disconnect
        port.onDisconnect.addListener(() => {
            this.connections.delete(port.name);
            console.log('Delta Baba Sniper: Port disconnected:', port.name);
        });
    }

    async handleMessage(message, sender, sendResponse) {
        try {
            console.log('Delta Baba Sniper: Received message:', message.type, sender);
            
            switch (message.type) {
                case 'CHART_DATA':
                    await this.handleChartData(message.data, sender);
                    sendResponse({ success: true });
                    break;
                    
                case 'GET_CHART_DATA':
                    const data = await this.getChartData();
                    sendResponse(data);
                    break;
                    
                case 'UPDATE_SETTINGS':
                    await this.updateSettings(message.settings);
                    sendResponse({ success: true });
                    break;
                    
                case 'GET_SETTINGS':
                    const settings = await this.getSettings();
                    sendResponse(settings);
                    break;
                    
                case 'NOTIFICATION':
                    await this.showNotification(message.notification);
                    sendResponse({ success: true });
                    break;
                    
                case 'API_REQUEST':
                    const apiResponse = await this.makeAPIRequest(message.request);
                    sendResponse(apiResponse);
                    break;
                    
                default:
                    console.warn('Delta Baba Sniper: Unknown message type:', message.type);
                    sendResponse({ error: 'Unknown message type' });
            }
        } catch (error) {
            console.error('Delta Baba Sniper: Error handling message:', error);
            sendResponse({ error: error.message });
        }
    }

    handlePortMessage(message, port) {
        try {
            console.log('Delta Baba Sniper: Port message:', message.type, port.name);
            
            switch (message.type) {
                case 'PING':
                    port.postMessage({ type: 'PONG', timestamp: Date.now() });
                    break;
                    
                case 'CHART_DATA_UPDATE':
                    this.broadcastChartData(message.data);
                    break;
                    
                default:
                    console.warn('Delta Baba Sniper: Unknown port message type:', message.type);
            }
        } catch (error) {
            console.error('Delta Baba Sniper: Error handling port message:', error);
        }
    }

    async handleChartData(data, sender) {
        try {
            // Cache the data
            this.dataCache = {
                ...data,
                timestamp: Date.now(),
                source: sender.tab?.id || 'unknown'
            };
            
            this.lastDataUpdate = Date.now();
            
            // Broadcast to all connected popups
            this.broadcastChartData(data);
            
            // Store in storage for persistence
            await chrome.storage.local.set({ lastChartData: this.dataCache });
            
            console.log('Delta Baba Sniper: Chart data processed and cached');
        } catch (error) {
            console.error('Delta Baba Sniper: Error handling chart data:', error);
        }
    }

    broadcastChartData(data) {
        // Send to all connected popups
        for (const [name, port] of this.connections) {
            if (name === 'popup') {
                try {
                    port.postMessage({
                        type: 'CHART_DATA_UPDATE',
                        data: data
                    });
                } catch (error) {
                    console.error('Delta Baba Sniper: Failed to send to popup:', error);
                    this.connections.delete(name);
                }
            }
        }
    }

    async getChartData() {
        try {
            if (this.dataCache && (Date.now() - this.lastDataUpdate) < 30000) {
                // Return cached data if recent
                return this.dataCache;
            }
            
            // Try to get from storage
            const result = await chrome.storage.local.get(['lastChartData']);
            if (result.lastChartData) {
                this.dataCache = result.lastChartData;
                this.lastDataUpdate = result.lastChartData.timestamp;
                return this.dataCache;
            }
            
            return null;
        } catch (error) {
            console.error('Delta Baba Sniper: Error getting chart data:', error);
            return null;
        }
    }

    async updateSettings(newSettings) {
        try {
            const result = await chrome.storage.sync.get(['settings']);
            const currentSettings = result.settings || {};
            
            const updatedSettings = { ...currentSettings, ...newSettings };
            await chrome.storage.sync.set({ settings: updatedSettings });
            
            console.log('Delta Baba Sniper: Settings updated');
            
            // Broadcast settings update
            this.broadcastSettingsUpdate(updatedSettings);
        } catch (error) {
            console.error('Delta Baba Sniper: Failed to update settings:', error);
            throw error;
        }
    }

    async getSettings() {
        try {
            const result = await chrome.storage.sync.get(['settings']);
            return result.settings || {};
        } catch (error) {
            console.error('Delta Baba Sniper: Failed to get settings:', error);
            return {};
        }
    }

    broadcastSettingsUpdate(settings) {
        for (const [name, port] of this.connections) {
            try {
                port.postMessage({
                    type: 'SETTINGS_UPDATE',
                    settings: settings
                });
            } catch (error) {
                console.error('Delta Baba Sniper: Failed to broadcast settings:', error);
                this.connections.delete(name);
            }
        }
    }

    async showNotification(notification) {
        try {
            await chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: notification.title || 'Delta Baba Sniper',
                message: notification.message,
                priority: notification.priority || 1
            });
        } catch (error) {
            console.error('Delta Baba Sniper: Failed to show notification:', error);
        }
    }

    async makeAPIRequest(request) {
        try {
            const response = await fetch(request.url, {
                method: request.method || 'GET',
                headers: request.headers || {},
                body: request.body
            });
            
            const data = await response.json();
            return { success: true, data: data };
        } catch (error) {
            console.error('Delta Baba Sniper: API request failed:', error);
            return { success: false, error: error.message };
        }
    }

    startHeartbeat() {
        // Send heartbeat every 30 seconds to keep service worker alive
        setInterval(() => {
            this.broadcastHeartbeat();
        }, 30000);
    }

    broadcastHeartbeat() {
        for (const [name, port] of this.connections) {
            try {
                port.postMessage({
                    type: 'HEARTBEAT',
                    timestamp: Date.now()
                });
            } catch (error) {
                console.error('Delta Baba Sniper: Failed to send heartbeat:', error);
                this.connections.delete(name);
            }
        }
    }

    // Utility methods
    async getCurrentTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            return tab;
        } catch (error) {
            console.error('Delta Baba Sniper: Failed to get current tab:', error);
            return null;
        }
    }

    async isDeltaExchangeTab(tabId) {
        try {
            const tab = await chrome.tabs.get(tabId);
            return tab.url && tab.url.includes('delta.exchange');
        } catch (error) {
            return false;
        }
    }
}

// Initialize background service
const background = new DeltaBabaBackground();

// Handle service worker lifecycle
self.addEventListener('install', (event) => {
    console.log('Delta Baba Sniper: Service worker installing');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Delta Baba Sniper: Service worker activating');
    event.waitUntil(self.clients.claim());
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeltaBabaBackground;
}