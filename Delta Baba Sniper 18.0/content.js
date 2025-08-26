/**
 * Delta Baba Sniper 18.0 - Content Script
 * Injected into Delta Exchange pages to extract chart data and coin information
 */

class DeltaExchangeScanner {
    constructor() {
        this.isActive = false;
        this.currentSymbol = '';
        this.currentPrice = '';
        this.chartData = [];
        this.lastUpdate = 0;
        this.updateInterval = null;
        
        this.init();
    }

    init() {
        try {
            this.waitForPageLoad();
            this.setupMessageListener();
            this.startDataExtraction();
        } catch (error) {
            console.error('Delta Exchange Scanner initialization error:', error);
        }
    }

    waitForPageLoad() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.onPageReady();
            });
        } else {
            this.onPageReady();
        }
    }

    onPageReady() {
        // Wait a bit more for dynamic content to load
        setTimeout(() => {
            this.extractInitialData();
            this.setupDataMonitoring();
        }, 2000);
    }

    setupMessageListener() {
        // Listen for messages from the extension popup
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === 'GET_COIN_DATA') {
                const data = this.getCurrentCoinData();
                sendResponse(data);
            } else if (message.type === 'START_SCANNING') {
                this.startScanning();
                sendResponse({ success: true });
            } else if (message.type === 'STOP_SCANNING') {
                this.stopScanning();
                sendResponse({ success: true });
            }
        });
    }

    extractInitialData() {
        try {
            // Extract current trading pair/symbol
            this.extractSymbol();
            
            // Extract current price
            this.extractPrice();
            
            // Extract timeframe
            this.extractTimeframe();
            
            // Send initial data to extension
            this.sendDataToExtension();
            
        } catch (error) {
            console.error('Error extracting initial data:', error);
        }
    }

    extractSymbol() {
        try {
            // Multiple selectors to find the trading symbol
            const selectors = [
                '[data-testid="symbol-name"]',
                '.symbol-name',
                '.trading-pair',
                'h1',
                '.header-title',
                '[class*="symbol"]',
                '[class*="pair"]'
            ];
            
            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim()) {
                    this.currentSymbol = element.textContent.trim();
                    console.log('Extracted symbol:', this.currentSymbol);
                    break;
                }
            }
            
            // Fallback: try to extract from URL
            if (!this.currentSymbol) {
                const urlPath = window.location.pathname;
                const symbolMatch = urlPath.match(/\/([A-Z0-9]+)-([A-Z0-9]+)/);
                if (symbolMatch) {
                    this.currentSymbol = `${symbolMatch[1]}/${symbolMatch[2]}`;
                }
            }
            
        } catch (error) {
            console.error('Error extracting symbol:', error);
        }
    }

    extractPrice() {
        try {
            // Multiple selectors to find the current price
            const selectors = [
                '[data-testid="price"]',
                '.price',
                '.current-price',
                '.ticker-price',
                '[class*="price"]',
                '.last-price'
            ];
            
            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim()) {
                    this.currentPrice = element.textContent.trim();
                    console.log('Extracted price:', this.currentPrice);
                    break;
                }
            }
            
        } catch (error) {
            console.error('Error extracting price:', error);
        }
    }

    extractTimeframe() {
        try {
            // Look for timeframe selector or current timeframe
            const timeframeSelectors = [
                '.timeframe-selector',
                '.interval-selector',
                '[class*="timeframe"]',
                '[class*="interval"]'
            ];
            
            for (const selector of timeframeSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    const activeTimeframe = element.querySelector('.active, .selected');
                    if (activeTimeframe) {
                        this.currentTimeframe = activeTimeframe.textContent.trim();
                        break;
                    }
                }
            }
            
        } catch (error) {
            console.error('Error extracting timeframe:', error);
        }
    }

    setupDataMonitoring() {
        // Monitor for changes in price and symbol
        this.setupPriceMonitoring();
        this.setupSymbolMonitoring();
        this.setupChartDataMonitoring();
    }

    setupPriceMonitoring() {
        // Create a MutationObserver to watch for price changes
        const priceObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' || mutation.type === 'characterData') {
                    this.extractPrice();
                    this.sendDataToExtension();
                }
            });
        });
        
        // Observe price-related elements
        const priceElements = document.querySelectorAll('[class*="price"], [data-testid*="price"]');
        priceElements.forEach(element => {
            priceObserver.observe(element, {
                childList: true,
                characterData: true,
                subtree: true
            });
        });
    }

    setupSymbolMonitoring() {
        // Monitor for symbol changes (when user switches trading pairs)
        const symbolObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    const oldSymbol = this.currentSymbol;
                    this.extractSymbol();
                    
                    if (oldSymbol !== this.currentSymbol) {
                        console.log('Symbol changed from', oldSymbol, 'to', this.currentSymbol);
                        this.onSymbolChange();
                    }
                }
            });
        });
        
        // Observe symbol-related elements
        const symbolElements = document.querySelectorAll('[class*="symbol"], [data-testid*="symbol"]');
        symbolElements.forEach(element => {
            symbolObserver.observe(element, {
                childList: true,
                subtree: true
            });
        });
    }

    setupChartDataMonitoring() {
        // Monitor for chart data changes
        const chartObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    this.extractChartData();
                }
            });
        });
        
        // Observe chart container
        const chartContainer = document.querySelector('.chart-container, .trading-chart, [class*="chart"]');
        if (chartContainer) {
            chartObserver.observe(chartContainer, {
                childList: true,
                subtree: true
            });
        }
    }

    extractChartData() {
        try {
            // Look for candlestick data in the page
            // This is a simplified approach - in a real implementation, you'd need to
            // access the actual chart library's data or WebSocket feeds
            
            const chartData = this.findChartData();
            if (chartData && chartData.length > 0) {
                this.chartData = chartData;
                this.sendChartDataToExtension();
            }
            
        } catch (error) {
            console.error('Error extracting chart data:', error);
        }
    }

    findChartData() {
        // This is a placeholder for actual chart data extraction
        // In a real implementation, you'd need to:
        // 1. Access the chart library's data directly
        // 2. Listen to WebSocket feeds
        // 3. Parse network requests for chart data
        
        // For now, return empty array
        return [];
    }

    onSymbolChange() {
        // Reset data when symbol changes
        this.chartData = [];
        this.lastUpdate = 0;
        
        // Extract new symbol data
        this.extractInitialData();
        
        // Notify extension of symbol change
        this.sendDataToExtension();
    }

    startScanning() {
        if (this.isActive) return;
        
        this.isActive = true;
        console.log('Delta Exchange Scanner: Started scanning');
        
        // Start periodic data extraction
        this.updateInterval = setInterval(() => {
            this.extractPrice();
            this.extractChartData();
            this.sendDataToExtension();
        }, 5000); // Update every 5 seconds
    }

    stopScanning() {
        if (!this.isActive) return;
        
        this.isActive = false;
        console.log('Delta Exchange Scanner: Stopped scanning');
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    getCurrentCoinData() {
        return {
            symbol: this.currentSymbol,
            price: this.currentPrice,
            timeframe: this.currentTimeframe,
            timestamp: Date.now()
        };
    }

    sendDataToExtension() {
        try {
            const data = {
                type: 'DELTA_EXCHANGE_DATA',
                data: this.getCurrentCoinData()
            };
            
            chrome.runtime.sendMessage(data);
            
        } catch (error) {
            console.error('Error sending data to extension:', error);
        }
    }

    sendChartDataToExtension() {
        try {
            const data = {
                type: 'CHART_DATA_UPDATE',
                data: {
                    symbol: this.currentSymbol,
                    chartData: this.chartData,
                    timestamp: Date.now()
                }
            };
            
            chrome.runtime.sendMessage(data);
            
        } catch (error) {
            console.error('Error sending chart data to extension:', error);
        }
    }

    // Utility function to find elements by partial class name
    findElementByPartialClass(partialClass) {
        const elements = document.querySelectorAll('*');
        for (const element of elements) {
            if (element.className && element.className.includes(partialClass)) {
                return element;
            }
        }
        return null;
    }

    // Utility function to find elements by partial data attribute
    findElementByPartialDataAttr(partialAttr) {
        const elements = document.querySelectorAll('*');
        for (const element of elements) {
            for (const attr of element.attributes) {
                if (attr.name.includes(partialAttr)) {
                    return element;
                }
            }
        }
        return null;
    }
}

// Initialize the scanner when the script loads
const scanner = new DeltaExchangeScanner();

// Export for potential external use
window.DeltaBabaScanner = scanner;

// Send ready message to extension
chrome.runtime.sendMessage({
    type: 'CONTENT_SCRIPT_READY',
    data: { status: 'ready', timestamp: Date.now() }
});

console.log('Delta Baba Sniper 18.0 - Content Script Loaded');