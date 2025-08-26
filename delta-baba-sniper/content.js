/**
 * Delta Baba Sniper 18.0 - Content Script
 * Injected into Delta Exchange India to read live chart data
 */

class DeltaExchangeDataReader {
    constructor() {
        this.currentSymbol = null;
        this.currentPrice = null;
        this.timeframe = '5m';
        this.candleData = [];
        this.isConnected = false;
        this.websocket = null;
        this.retryCount = 0;
        this.maxRetries = 5;
        
        // Initialize data reading
        this.init();
    }

    async init() {
        console.log('🚀 Delta Baba Sniper - Initializing...');
        
        // Wait for page to fully load
        if (document.readyState !== 'complete') {
            window.addEventListener('load', () => this.init());
            return;
        }

        // Start monitoring for chart data
        this.startDataCollection();
        
        // Set up communication with extension
        this.setupMessageListener();
        
        // Auto-detect current symbol and timeframe
        this.detectCurrentChart();
        
        // Monitor for symbol changes
        this.monitorSymbolChanges();
    }

    startDataCollection() {
        // Method 1: Try to tap into existing WebSocket connections
        this.interceptWebSocketData();
        
        // Method 2: Read from DOM elements
        this.readFromDOM();
        
        // Method 3: Access chart APIs if available
        this.accessChartAPIs();
        
        // Method 4: Monitor network requests
        this.monitorNetworkRequests();
    }

    interceptWebSocketData() {
        // Override WebSocket to capture Delta Exchange data
        const originalWebSocket = window.WebSocket;
        const self = this;
        
        window.WebSocket = function(url, protocols) {
            const ws = new originalWebSocket(url, protocols);
            
            // Check if this is Delta Exchange WebSocket
            if (url.includes('delta.exchange') || url.includes('socket')) {
                console.log('📡 Intercepted WebSocket:', url);
                
                ws.addEventListener('message', function(event) {
                    try {
                        const data = JSON.parse(event.data);
                        self.processWebSocketData(data);
                    } catch (e) {
                        // Handle non-JSON messages
                        self.processRawWebSocketData(event.data);
                    }
                });
                
                self.websocket = ws;
                self.isConnected = true;
            }
            
            return ws;
        };
    }

    processWebSocketData(data) {
        // Process different types of WebSocket messages
        if (data.type === 'candle' || data.type === 'kline') {
            this.processCandleData(data);
        } else if (data.type === 'ticker' || data.type === 'price') {
            this.processPriceUpdate(data);
        } else if (data.symbol && data.price) {
            // Generic price/symbol update
            this.updateCurrentData(data.symbol, data.price);
        }
    }

    processRawWebSocketData(data) {
        // Try to extract useful data from raw WebSocket messages
        if (typeof data === 'string') {
            // Look for price patterns
            const priceMatch = data.match(/[\d,]+\.[\d]+/);
            const symbolMatch = data.match(/[A-Z]{3,}[-_\/][A-Z]{3,}/);
            
            if (priceMatch && symbolMatch) {
                this.updateCurrentData(symbolMatch[0], parseFloat(priceMatch[0].replace(',', '')));
            }
        }
    }

    readFromDOM() {
        // Method to read chart data from DOM elements
        const chartSelectors = [
            '[data-testid*="price"]',
            '[data-testid*="symbol"]',
            '.price-display',
            '.symbol-display',
            '.current-price',
            '.ticker-price',
            '#chart-price',
            '.chart-symbol'
        ];

        const checkInterval = setInterval(() => {
            // Try to find price elements
            for (const selector of chartSelectors) {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    const text = el.textContent || el.innerText;
                    if (text) {
                        this.extractDataFromText(text);
                    }
                });
            }

            // Look for TradingView chart
            this.checkTradingViewChart();
            
            // Look for chart canvas elements
            this.checkChartCanvas();
            
        }, 1000);

        // Store interval for cleanup
        this.domCheckInterval = checkInterval;
    }

    checkTradingViewChart() {
        // Check if TradingView chart is loaded
        const tvCharts = document.querySelectorAll('iframe[src*="tradingview"]');
        if (tvCharts.length > 0) {
            console.log('📊 Found TradingView chart');
            this.extractTradingViewData();
        }

        // Check for lightweight charts
        const chartContainers = document.querySelectorAll('[id*="chart"], [class*="chart"]');
        chartContainers.forEach(container => {
            if (container._chart || container.chart) {
                console.log('📊 Found chart container with data');
                this.extractChartData(container);
            }
        });
    }

    extractTradingViewData() {
        // Try to access TradingView chart data
        if (window.TradingView && window.TradingView.widget) {
            try {
                const widget = window.TradingView.widget;
                if (widget.chart) {
                    const symbol = widget.chart().symbol();
                    const price = widget.chart().getStudyData();
                    console.log('📊 TradingView data:', { symbol, price });
                }
            } catch (e) {
                console.log('❌ Could not access TradingView data:', e);
            }
        }
    }

    checkChartCanvas() {
        // Check canvas elements for chart data
        const canvases = document.querySelectorAll('canvas');
        canvases.forEach(canvas => {
            if (canvas.width > 300 && canvas.height > 200) {
                // Likely a chart canvas
                this.extractCanvasData(canvas);
            }
        });
    }

    extractCanvasData(canvas) {
        // Try to extract data from chart canvas
        const context = canvas.getContext('2d');
        if (context) {
            // Look for chart data in canvas context
            console.log('📊 Found chart canvas');
        }
    }

    extractDataFromText(text) {
        // Extract price and symbol from text
        const pricePattern = /₹?\$?[\d,]+\.[\d]+/g;
        const symbolPattern = /[A-Z]{3,}[-_\/][A-Z]{3,}/g;
        
        const priceMatches = text.match(pricePattern);
        const symbolMatches = text.match(symbolPattern);
        
        if (priceMatches) {
            const price = parseFloat(priceMatches[0].replace(/[₹$,]/g, ''));
            if (price > 0) {
                this.currentPrice = price;
            }
        }
        
        if (symbolMatches) {
            this.currentSymbol = symbolMatches[0];
        }
    }

    accessChartAPIs() {
        // Try to access chart APIs directly
        const checkAPIs = () => {
            // Check for common chart library globals
            const chartLibs = ['Chart', 'LightweightCharts', 'TradingView', 'Plotly'];
            
            chartLibs.forEach(lib => {
                if (window[lib]) {
                    console.log(`📊 Found chart library: ${lib}`);
                    this.extractAPIData(window[lib]);
                }
            });
        };

        // Check immediately and periodically
        checkAPIs();
        setInterval(checkAPIs, 5000);
    }

    extractAPIData(chartLib) {
        // Extract data from chart library APIs
        try {
            if (chartLib.chart && typeof chartLib.chart === 'function') {
                const chart = chartLib.chart();
                if (chart.getData) {
                    const data = chart.getData();
                    this.processCandleData(data);
                }
            }
        } catch (e) {
            console.log('❌ Error accessing chart API:', e);
        }
    }

    monitorNetworkRequests() {
        // Intercept fetch requests for chart data
        const originalFetch = window.fetch;
        const self = this;
        
        window.fetch = async function(...args) {
            const response = await originalFetch.apply(this, args);
            
            // Check if this is a chart data request
            const url = args[0];
            if (typeof url === 'string' && self.isChartDataURL(url)) {
                const clonedResponse = response.clone();
                try {
                    const data = await clonedResponse.json();
                    self.processAPIResponse(data, url);
                } catch (e) {
                    // Handle non-JSON responses
                }
            }
            
            return response;
        };

        // Intercept XMLHttpRequest
        const originalXHR = window.XMLHttpRequest;
        window.XMLHttpRequest = function() {
            const xhr = new originalXHR();
            const originalOpen = xhr.open;
            
            xhr.open = function(method, url) {
                if (self.isChartDataURL(url)) {
                    xhr.addEventListener('load', function() {
                        try {
                            const data = JSON.parse(this.responseText);
                            self.processAPIResponse(data, url);
                        } catch (e) {
                            // Handle non-JSON responses
                        }
                    });
                }
                return originalOpen.apply(this, arguments);
            };
            
            return xhr;
        };
    }

    isChartDataURL(url) {
        // Check if URL is likely to contain chart data
        const chartKeywords = [
            'candles', 'kline', 'ohlc', 'ticker', 'price', 'chart',
            'market-data', 'trades', 'orderbook', 'history'
        ];
        
        return chartKeywords.some(keyword => url.toLowerCase().includes(keyword));
    }

    processAPIResponse(data, url) {
        console.log('📊 Chart API Response:', url, data);
        
        // Process different types of API responses
        if (Array.isArray(data)) {
            // Likely candle data array
            this.processCandleArray(data);
        } else if (data.result && Array.isArray(data.result)) {
            // API response with result array
            this.processCandleArray(data.result);
        } else if (data.data && Array.isArray(data.data)) {
            // API response with data array
            this.processCandleArray(data.data);
        } else if (data.symbol && data.price) {
            // Price update
            this.updateCurrentData(data.symbol, data.price);
        }
    }

    processCandleArray(candles) {
        // Process array of candle data
        const processedCandles = candles.map(candle => {
            // Handle different candle formats
            if (Array.isArray(candle)) {
                // [timestamp, open, high, low, close, volume]
                return {
                    time: candle[0],
                    open: parseFloat(candle[1]),
                    high: parseFloat(candle[2]),
                    low: parseFloat(candle[3]),
                    close: parseFloat(candle[4]),
                    volume: parseFloat(candle[5] || 0)
                };
            } else if (typeof candle === 'object') {
                // Object format
                return {
                    time: candle.timestamp || candle.time || candle.t,
                    open: parseFloat(candle.open || candle.o),
                    high: parseFloat(candle.high || candle.h),
                    low: parseFloat(candle.low || candle.l),
                    close: parseFloat(candle.close || candle.c),
                    volume: parseFloat(candle.volume || candle.v || 0)
                };
            }
        }).filter(candle => candle && candle.time && candle.close);

        if (processedCandles.length > 0) {
            this.candleData = processedCandles;
            this.currentPrice = processedCandles[processedCandles.length - 1].close;
            this.sendDataToExtension();
        }
    }

    processCandleData(data) {
        // Process single candle update
        const candle = {
            time: data.timestamp || data.time || Date.now(),
            open: parseFloat(data.open || data.o),
            high: parseFloat(data.high || data.h),
            low: parseFloat(data.low || data.l),
            close: parseFloat(data.close || data.c),
            volume: parseFloat(data.volume || data.v || 0)
        };

        if (candle.close) {
            this.candleData.push(candle);
            this.currentPrice = candle.close;
            this.sendDataToExtension();
        }
    }

    processPriceUpdate(data) {
        // Process price ticker update
        if (data.symbol) {
            this.currentSymbol = data.symbol;
        }
        if (data.price || data.last_price) {
            this.currentPrice = parseFloat(data.price || data.last_price);
        }
        
        this.sendDataToExtension();
    }

    updateCurrentData(symbol, price) {
        if (symbol) this.currentSymbol = symbol;
        if (price) this.currentPrice = price;
        this.sendDataToExtension();
    }

    detectCurrentChart() {
        // Try to detect current symbol and timeframe from URL and DOM
        const url = window.location.href;
        
        // Extract symbol from URL
        const urlSymbolMatch = url.match(/symbol[=\/]([A-Z0-9_-]+)/i);
        if (urlSymbolMatch) {
            this.currentSymbol = urlSymbolMatch[1];
        }
        
        // Extract timeframe from URL
        const urlTimeframeMatch = url.match(/interval[=\/](\d+[mhd])/i);
        if (urlTimeframeMatch) {
            this.timeframe = urlTimeframeMatch[1];
        }
        
        // Try to find symbol in page title or headings
        const titleSymbolMatch = document.title.match(/([A-Z]{3,}[-_\/][A-Z]{3,})/);
        if (titleSymbolMatch) {
            this.currentSymbol = titleSymbolMatch[1];
        }
        
        console.log('🎯 Detected chart:', { symbol: this.currentSymbol, timeframe: this.timeframe });
    }

    monitorSymbolChanges() {
        // Monitor for symbol/timeframe changes
        let lastURL = window.location.href;
        let lastTitle = document.title;
        
        setInterval(() => {
            const currentURL = window.location.href;
            const currentTitle = document.title;
            
            if (currentURL !== lastURL || currentTitle !== lastTitle) {
                console.log('🔄 Chart changed, re-detecting...');
                this.detectCurrentChart();
                lastURL = currentURL;
                lastTitle = currentTitle;
            }
        }, 2000);
    }

    setupMessageListener() {
        // Listen for messages from extension
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            switch (request.action) {
                case 'getChartData':
                    sendResponse({
                        symbol: this.currentSymbol,
                        price: this.currentPrice,
                        timeframe: this.timeframe,
                        candles: this.candleData.slice(-100), // Last 100 candles
                        connected: this.isConnected
                    });
                    break;
                    
                case 'setTimeframe':
                    this.timeframe = request.timeframe;
                    this.requestNewData();
                    sendResponse({ success: true });
                    break;
                    
                case 'refresh':
                    this.refreshData();
                    sendResponse({ success: true });
                    break;
            }
        });
    }

    requestNewData() {
        // Request new data for current timeframe
        this.candleData = [];
        this.startDataCollection();
    }

    refreshData() {
        // Refresh all data
        this.detectCurrentChart();
        this.requestNewData();
    }

    sendDataToExtension() {
        // Send current data to extension
        const data = {
            action: 'chartDataUpdate',
            symbol: this.currentSymbol,
            price: this.currentPrice,
            timeframe: this.timeframe,
            candles: this.candleData.slice(-100),
            connected: this.isConnected,
            timestamp: Date.now()
        };

        // Send to extension popup if open
        chrome.runtime.sendMessage(data).catch(error => {
            // Extension popup might not be open, that's ok
        });
        
        // Store in local storage for extension to access
        chrome.storage.local.set({ deltaChartData: data });
    }

    cleanup() {
        // Cleanup intervals and listeners
        if (this.domCheckInterval) {
            clearInterval(this.domCheckInterval);
        }
        if (this.websocket) {
            this.websocket.close();
        }
    }
}

// Initialize the data reader
let deltaReader = null;

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeReader);
} else {
    initializeReader();
}

function initializeReader() {
    try {
        deltaReader = new DeltaExchangeDataReader();
        console.log('✅ Delta Baba Sniper - Content script loaded successfully');
    } catch (error) {
        console.error('❌ Delta Baba Sniper - Failed to initialize:', error);
        
        // Retry after delay
        setTimeout(initializeReader, 3000);
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (deltaReader) {
        deltaReader.cleanup();
    }
});

// Export for debugging
window.deltaBabaSniper = deltaReader;