/**
 * Delta Baba Sniper 18.0 - Background Service Worker
 * Handles extension lifecycle and communication between components
 */

class DeltaBabaBackground {
    constructor() {
        this.isActive = false;
        this.currentTab = null;
        this.deltaExchangeTabs = new Set();
        this.messageHandlers = new Map();
        
        this.init();
    }

    init() {
        this.setupMessageHandlers();
        this.setupEventListeners();
        this.setupTabMonitoring();
        console.log('Delta Baba Sniper 18.0 - Background Service Worker Initialized');
    }

    setupMessageHandlers() {
        // Handle messages from content scripts
        this.messageHandlers.set('DELTA_EXCHANGE_DATA', this.handleDeltaExchangeData.bind(this));
        this.messageHandlers.set('CHART_DATA_UPDATE', this.handleChartDataUpdate.bind(this));
        this.messageHandlers.set('CONTENT_SCRIPT_READY', this.handleContentScriptReady.bind(this));
        
        // Handle messages from popup
        this.messageHandlers.set('GET_COIN_DATA', this.handleGetCoinData.bind(this));
        this.messageHandlers.set('START_SCANNING', this.handleStartScanning.bind(this));
        this.messageHandlers.set('STOP_SCANNING', this.handleStopScanning.bind(this));
    }

    setupEventListeners() {
        // Listen for messages from content scripts and popup
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
        });

        // Handle extension installation
        chrome.runtime.onInstalled.addListener((details) => {
            this.onExtensionInstalled(details);
        });

        // Handle extension startup
        chrome.runtime.onStartup.addListener(() => {
            this.onExtensionStartup();
        });

        // Handle tab updates
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.onTabUpdated(tabId, changeInfo, tab);
        });

        // Handle tab removal
        chrome.tabs.onRemoved.addListener((tabId) => {
            this.onTabRemoved(tabId);
        });

        // Handle extension icon click
        chrome.action.onClicked.addListener((tab) => {
            this.onExtensionIconClicked(tab);
        });
    }

    setupTabMonitoring() {
        // Get all current tabs and identify Delta Exchange tabs
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (this.isDeltaExchangeTab(tab)) {
                    this.deltaExchangeTabs.add(tab.id);
                }
            });
        });
    }

    handleMessage(message, sender, sendResponse) {
        try {
            const handler = this.messageHandlers.get(message.type);
            if (handler) {
                handler(message, sender, sendResponse);
            } else {
                console.warn('Unknown message type:', message.type);
                sendResponse({ error: 'Unknown message type' });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ error: 'Internal error' });
        }
    }

    handleDeltaExchangeData(message, sender, sendResponse) {
        try {
            const { data } = message;
            console.log('Received Delta Exchange data:', data);
            
            // Store the data for popup access
            chrome.storage.local.set({
                'deltaExchangeData': {
                    ...data,
                    timestamp: Date.now()
                }
            });
            
            // Broadcast to all popup instances
            this.broadcastToPopups({
                type: 'DELTA_EXCHANGE_DATA_UPDATE',
                data: data
            });
            
            sendResponse({ success: true });
            
        } catch (error) {
            console.error('Error handling Delta Exchange data:', error);
            sendResponse({ error: 'Failed to process data' });
        }
    }

    handleChartDataUpdate(message, sender, sendResponse) {
        try {
            const { data } = message;
            console.log('Received chart data update:', data);
            
            // Store chart data
            chrome.storage.local.set({
                'chartData': {
                    ...data,
                    timestamp: Date.now()
                }
            });
            
            // Broadcast to popups
            this.broadcastToPopups({
                type: 'CHART_DATA_UPDATE',
                data: data
            });
            
            sendResponse({ success: true });
            
        } catch (error) {
            console.error('Error handling chart data update:', error);
            sendResponse({ error: 'Failed to process chart data' });
        }
    }

    handleContentScriptReady(message, sender, sendResponse) {
        try {
            console.log('Content script ready in tab:', sender.tab.id);
            
            // Mark this tab as having the content script
            if (sender.tab) {
                this.deltaExchangeTabs.add(sender.tab.id);
            }
            
            sendResponse({ success: true });
            
        } catch (error) {
            console.error('Error handling content script ready:', error);
            sendResponse({ error: 'Failed to acknowledge content script' });
        }
    }

    handleGetCoinData(message, sender, sendResponse) {
        try {
            // Get stored Delta Exchange data
            chrome.storage.local.get(['deltaExchangeData'], (result) => {
                if (result.deltaExchangeData) {
                    sendResponse(result.deltaExchangeData);
                } else {
                    sendResponse({ error: 'No data available' });
                }
            });
            
            return true; // Keep message channel open for async response
            
        } catch (error) {
            console.error('Error getting coin data:', error);
            sendResponse({ error: 'Failed to get coin data' });
        }
    }

    handleStartScanning(message, sender, sendResponse) {
        try {
            this.isActive = true;
            console.log('Scanning started');
            
            // Notify all Delta Exchange tabs to start scanning
            this.broadcastToContentScripts({
                type: 'START_SCANNING'
            });
            
            sendResponse({ success: true });
            
        } catch (error) {
            console.error('Error starting scanning:', error);
            sendResponse({ error: 'Failed to start scanning' });
        }
    }

    handleStopScanning(message, sender, sendResponse) {
        try {
            this.isActive = false;
            console.log('Scanning stopped');
            
            // Notify all Delta Exchange tabs to stop scanning
            this.broadcastToContentScripts({
                type: 'STOP_SCANNING'
            });
            
            sendResponse({ success: true });
            
        } catch (error) {
            console.error('Error stopping scanning:', error);
            sendResponse({ error: 'Failed to stop scanning' });
        }
    }

    broadcastToPopups(message) {
        try {
            // Send message to all popup instances
            chrome.runtime.sendMessage(message).catch(() => {
                // Ignore errors for disconnected popups
            });
        } catch (error) {
            console.error('Error broadcasting to popups:', error);
        }
    }

    broadcastToContentScripts(message) {
        try {
            // Send message to all Delta Exchange tabs
            this.deltaExchangeTabs.forEach(tabId => {
                chrome.tabs.sendMessage(tabId, message).catch(() => {
                    // Remove tab if message fails
                    this.deltaExchangeTabs.delete(tabId);
                });
            });
        } catch (error) {
            console.error('Error broadcasting to content scripts:', error);
        }
    }

    isDeltaExchangeTab(tab) {
        return tab.url && (
            tab.url.includes('delta.exchange') ||
            tab.url.includes('delta.exchange') ||
            tab.url.includes('delta.exchange')
        );
    }

    onExtensionInstalled(details) {
        console.log('Delta Baba Sniper 18.0 installed:', details.reason);
        
        // Set default settings
        chrome.storage.sync.set({
            theme: 'light',
            language: 'en',
            autoScan: false,
            scanInterval: 5000
        });
        
        // Open welcome page if it's a fresh install
        if (details.reason === 'install') {
            chrome.tabs.create({
                url: 'https://delta.exchange'
            });
        }
    }

    onExtensionStartup() {
        console.log('Delta Baba Sniper 18.0 started');
        this.setupTabMonitoring();
    }

    onTabUpdated(tabId, changeInfo, tab) {
        // Check if this is a Delta Exchange tab
        if (changeInfo.status === 'complete' && this.isDeltaExchangeTab(tab)) {
            this.deltaExchangeTabs.add(tabId);
            
            // Inject content script if not already present
            this.injectContentScript(tabId);
        }
    }

    onTabRemoved(tabId) {
        // Remove from Delta Exchange tabs set
        this.deltaExchangeTabs.delete(tabId);
    }

    onExtensionIconClicked(tab) {
        // Open popup when extension icon is clicked
        if (this.isDeltaExchangeTab(tab)) {
            // Popup will open automatically due to manifest configuration
            console.log('Extension icon clicked on Delta Exchange tab');
        } else {
            // If not on Delta Exchange, open the exchange
            chrome.tabs.create({
                url: 'https://delta.exchange'
            });
        }
    }

    async injectContentScript(tabId) {
        try {
            // Check if content script is already injected
            const results = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => window.DeltaBabaScanner !== undefined
            });
            
            if (!results[0].result) {
                // Inject content script
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content.js']
                });
                console.log('Content script injected into tab:', tabId);
            }
        } catch (error) {
            console.error('Error injecting content script:', error);
        }
    }

    // Utility method to get current Delta Exchange data
    async getCurrentDeltaExchangeData() {
        try {
            const result = await chrome.storage.local.get(['deltaExchangeData']);
            return result.deltaExchangeData || null;
        } catch (error) {
            console.error('Error getting Delta Exchange data:', error);
            return null;
        }
    }

    // Utility method to get current chart data
    async getCurrentChartData() {
        try {
            const result = await chrome.storage.local.get(['chartData']);
            return result.chartData || null;
        } catch (error) {
            console.error('Error getting chart data:', error);
            return null;
        }
    }
}

// Initialize the background service worker
const backgroundWorker = new DeltaBabaBackground();

// Export for potential external use
self.DeltaBabaBackground = backgroundWorker;