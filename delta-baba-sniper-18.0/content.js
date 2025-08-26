// Delta Baba Sniper 18.0 - Content Script
// Injects into Delta Exchange India pages and provides live chart integration

class DeltaBabaContentScript {
  constructor() {
    this.isActive = false;
    this.chart = null;
    this.dataCollector = null;
    this.settings = {};
    this.currentSymbol = '';
    this.currentTimeframe = '5m';
    this.websocket = null;
    this.dataBuffer = [];
    this.lastUpdate = 0;
    this.updateInterval = 1000; // 1 second update interval
    
    this.init();
  }

  async init() {
    try {
      // Wait for page to load
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.setup());
      } else {
        this.setup();
      }
    } catch (error) {
      console.error('❌ Content script initialization failed:', error);
    }
  }

  async setup() {
    try {
      // Check if we're on Delta Exchange India
      if (!this.isDeltaExchangePage()) {
        console.log('⚠️ Not on Delta Exchange India page, skipping setup');
        return;
      }

      // Load settings
      await this.loadSettings();
      
      // Initialize data collector
      this.initializeDataCollector();
      
      // Create chart overlay
      this.createChartOverlay();
      
      // Start data collection
      this.startDataCollection();
      
      // Set up message listeners
      this.setupMessageListeners();
      
      this.isActive = true;
      console.log('✅ Delta Baba Content Script setup complete');
      
    } catch (error) {
      console.error('❌ Setup failed:', error);
    }
  }

  isDeltaExchangePage() {
    const url = window.location.href.toLowerCase();
    return url.includes('delta.exchange') || url.includes('deltaexchange');
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get();
      this.settings = result;
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

  initializeDataCollector() {
    this.dataCollector = {
      // Collect data from page elements
      collectSymbolInfo: () => this.collectSymbolInfo(),
      collectTimeframeInfo: () => this.collectTimeframeInfo(),
      collectPriceData: () => this.collectPriceData(),
      collectChartData: () => this.collectChartData(),
      
      // WebSocket data collection
      setupWebSocket: () => this.setupWebSocket(),
      collectWebSocketData: (data) => this.collectWebSocketData(data)
    };
  }

  createChartOverlay() {
    try {
      // Create main container
      const container = document.createElement('div');
      container.id = 'delta-baba-chart-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 400px;
        height: 600px;
        background: #1e222d;
        border: 2px solid #2B2B43;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      `;

      // Create header
      const header = document.createElement('div');
      header.style.cssText = `
        background: #2B2B43;
        color: #d1d4dc;
        padding: 10px 15px;
        border-radius: 6px 6px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #3a3a5a;
      `;
      
      header.innerHTML = `
        <div style="font-weight: bold; font-size: 14px;">
          🚀 Delta Baba Sniper 18.0
        </div>
        <div style="display: flex; gap: 10px;">
          <button id="delta-baba-minimize" style="background: #4caf50; border: none; color: white; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">−</button>
          <button id="delta-baba-close" style="background: #f44336; border: none; color: white; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px;">×</button>
        </div>
      `;

      // Create chart area
      const chartArea = document.createElement('div');
      chartArea.id = 'delta-baba-chart';
      chartArea.style.cssText = `
        flex: 1;
        min-height: 400px;
        background: #1e222d;
        position: relative;
      `;

      // Create control panel
      const controlPanel = document.createElement('div');
      controlPanel.style.cssText = `
        background: #2B2B43;
        padding: 10px 15px;
        border-top: 1px solid #3a3a5a;
        display: flex;
        flex-direction: column;
        gap: 10px;
      `;

      // Timeframe selector
      const timeframeSelector = document.createElement('select');
      timeframeSelector.id = 'delta-baba-timeframe';
      timeframeSelector.style.cssText = `
        background: #3a3a5a;
        color: #d1d4dc;
        border: 1px solid #4a4a6a;
        border-radius: 4px;
        padding: 5px 10px;
        font-size: 12px;
        width: 100%;
      `;
      
      const timeframes = ['1m', '5m', '10m', '15m', '30m', '1h', '2h', '3h'];
      timeframes.forEach(tf => {
        const option = document.createElement('option');
        option.value = tf;
        option.textContent = tf;
        if (tf === '5m') option.selected = true;
        timeframeSelector.appendChild(option);
      });

      // Status display
      const statusDisplay = document.createElement('div');
      statusDisplay.id = 'delta-baba-status';
      statusDisplay.style.cssText = `
        color: #4caf50;
        font-size: 12px;
        text-align: center;
        padding: 5px;
        background: #1e222d;
        border-radius: 4px;
        border: 1px solid #3a3a5a;
      `;
      statusDisplay.textContent = '🔄 Initializing...';

      // Add elements to control panel
      controlPanel.appendChild(timeframeSelector);
      controlPanel.appendChild(statusDisplay);

      // Add all elements to container
      container.appendChild(header);
      container.appendChild(chartArea);
      container.appendChild(controlPanel);

      // Add to page
      document.body.appendChild(container);

      // Set up event listeners
      this.setupChartEventListeners(container);

      // Initialize chart
      this.initializeChart();

      console.log('✅ Chart overlay created successfully');

    } catch (error) {
      console.error('❌ Failed to create chart overlay:', error);
    }
  }

  setupChartEventListeners(container) {
    // Minimize button
    const minimizeBtn = container.querySelector('#delta-baba-minimize');
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        const chartArea = container.querySelector('#delta-baba-chart');
        const controlPanel = container.querySelector('div:last-child');
        
        if (chartArea.style.display === 'none') {
          chartArea.style.display = 'block';
          controlPanel.style.display = 'block';
          minimizeBtn.textContent = '−';
        } else {
          chartArea.style.display = 'none';
          controlPanel.style.display = 'none';
          minimizeBtn.textContent = '+';
        }
      });
    }

    // Close button
    const closeBtn = container.querySelector('#delta-baba-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        container.remove();
        this.isActive = false;
      });
    }

    // Timeframe selector
    const timeframeSelector = container.querySelector('#delta-baba-timeframe');
    if (timeframeSelector) {
      timeframeSelector.addEventListener('change', (e) => {
        this.currentTimeframe = e.target.value;
        if (this.chart) {
          this.chart.setTimeframe(this.currentTimeframe);
        }
        this.updateStatus(`Timeframe changed to ${this.currentTimeframe}`);
      });
    }
  }

  async initializeChart() {
    try {
      // Wait for chart container to be available
      const chartContainer = document.getElementById('delta-baba-chart');
      if (!chartContainer) {
        setTimeout(() => this.initializeChart(), 100);
        return;
      }

      // Initialize Delta Baba Chart
      this.chart = new DeltaBabaChart('delta-baba-chart', {
        width: 380,
        height: 380
      });

      // Wait for chart to be ready
      const checkReady = setInterval(() => {
        if (this.chart && this.chart.isReady()) {
          clearInterval(checkReady);
          this.updateStatus('✅ Chart ready');
          this.startDataCollection();
        }
      }, 100);

    } catch (error) {
      console.error('❌ Failed to initialize chart:', error);
      this.updateStatus('❌ Chart initialization failed');
    }
  }

  startDataCollection() {
    try {
      // Start collecting data from page
      this.collectInitialData();
      
      // Set up periodic data collection
      setInterval(() => {
        if (this.isActive) {
          this.collectPageData();
        }
      }, this.updateInterval);

      // Try to set up WebSocket connection
      this.setupWebSocket();

      console.log('✅ Data collection started');

    } catch (error) {
      console.error('❌ Failed to start data collection:', error);
    }
  }

  collectInitialData() {
    try {
      // Collect current symbol and timeframe
      this.currentSymbol = this.dataCollector.collectSymbolInfo();
      this.currentTimeframe = this.dataCollector.collectTimeframeInfo();
      
      // Update chart with symbol info
      if (this.chart) {
        this.chart.setSymbol(this.currentSymbol);
        this.chart.setTimeframe(this.currentTimeframe);
      }

      console.log(`✅ Initial data collected: ${this.currentSymbol} @ ${this.currentTimeframe}`);

    } catch (error) {
      console.error('❌ Failed to collect initial data:', error);
    }
  }

  collectPageData() {
    try {
      // Collect current price and chart data
      const priceData = this.dataCollector.collectPriceData();
      const chartData = this.dataCollector.collectChartData();
      
      // Update data buffer
      if (priceData) {
        this.dataBuffer.push(priceData);
        
        // Keep only last 100 data points
        if (this.dataBuffer.length > 100) {
          this.dataBuffer.splice(0, this.dataBuffer.length - 100);
        }
      }

      // Update chart if we have enough data
      if (this.dataBuffer.length >= 55 && this.chart && this.chart.isReady()) {
        this.chart.updateCandlestickData(this.dataBuffer);
        this.lastUpdate = Date.now();
      }

    } catch (error) {
      console.error('❌ Failed to collect page data:', error);
    }
  }

  setupWebSocket() {
    try {
      // Try to find WebSocket connections on the page
      const existingWebSockets = this.findExistingWebSockets();
      
      if (existingWebSockets.length > 0) {
        // Intercept existing WebSocket
        this.interceptWebSocket(existingWebSockets[0]);
      } else {
        // Try to create new WebSocket connection to Delta Exchange API
        this.createWebSocketConnection();
      }

    } catch (error) {
      console.error('❌ Failed to setup WebSocket:', error);
    }
  }

  findExistingWebSockets() {
    // This is a simplified approach - in practice, you'd need more sophisticated
    // WebSocket interception techniques
    return [];
  }

  interceptWebSocket(webSocket) {
    try {
      // Intercept WebSocket messages
      const originalSend = webSocket.send;
      const originalAddEventListener = webSocket.addEventListener;

      webSocket.send = (data) => {
        // Intercept outgoing messages
        console.log('📤 WebSocket send:', data);
        return originalSend.call(webSocket, data);
      };

      webSocket.addEventListener('message', (event) => {
        // Intercept incoming messages
        console.log('📥 WebSocket message:', event.data);
        this.dataCollector.collectWebSocketData(event.data);
      });

      console.log('✅ WebSocket intercepted successfully');

    } catch (error) {
      console.error('❌ Failed to intercept WebSocket:', error);
    }
  }

  createWebSocketConnection() {
    try {
      // Create WebSocket connection to Delta Exchange API
      // Note: This would require proper API endpoints and authentication
      const wsUrl = 'wss://api.delta.exchange/v2/ws';
      
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        console.log('✅ WebSocket connected to Delta Exchange');
        this.subscribeToMarketData();
      };

      this.websocket.onmessage = (event) => {
        this.dataCollector.collectWebSocketData(event.data);
      };

      this.websocket.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

      this.websocket.onclose = () => {
        console.log('🔌 WebSocket connection closed');
        // Try to reconnect after delay
        setTimeout(() => this.createWebSocketConnection(), 5000);
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
    }
  }

  subscribeToMarketData() {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) return;

    try {
      // Subscribe to market data for current symbol
      const subscription = {
        type: 'subscribe',
        channel: 'v2/orderbook',
        payload: {
          symbol: this.currentSymbol
        }
      };

      this.websocket.send(JSON.stringify(subscription));
      console.log('✅ Subscribed to market data');

    } catch (error) {
      console.error('❌ Failed to subscribe to market data:', error);
    }
  }

  // ===== Data Collection Methods =====
  collectSymbolInfo() {
    try {
      // Try to extract symbol from various page elements
      const selectors = [
        '[data-symbol]',
        '.symbol',
        '.pair-name',
        '.instrument-name',
        'h1',
        'h2',
        '.title'
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent || element.getAttribute('data-symbol');
          if (text && text.length > 0) {
            return text.trim().toUpperCase();
          }
        }
      }

      // Fallback: try to extract from URL
      const url = window.location.href;
      const symbolMatch = url.match(/[A-Z]{3,10}-[A-Z]{3,10}/);
      if (symbolMatch) {
        return symbolMatch[0];
      }

      return 'UNKNOWN';

    } catch (error) {
      console.error('❌ Failed to collect symbol info:', error);
      return 'UNKNOWN';
    }
  }

  collectTimeframeInfo() {
    try {
      // Try to extract timeframe from page elements
      const selectors = [
        '[data-timeframe]',
        '.timeframe',
        '.interval',
        '.period'
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent || element.getAttribute('data-timeframe');
          if (text) {
            const timeframe = this.normalizeTimeframe(text);
            if (timeframe) return timeframe;
          }
        }
      }

      return '5m'; // Default timeframe

    } catch (error) {
      console.error('❌ Failed to collect timeframe info:', error);
      return '5m';
    }
  }

  normalizeTimeframe(timeframe) {
    const timeframes = {
      '1m': ['1m', '1min', '1 minute', '1minute'],
      '5m': ['5m', '5min', '5 minutes', '5minutes'],
      '10m': ['10m', '10min', '10 minutes', '10minutes'],
      '15m': ['15m', '15min', '15 minutes', '15minutes'],
      '30m': ['30m', '30min', '30 minutes', '30minutes'],
      '1h': ['1h', '1hour', '1 hour', '1hour'],
      '2h': ['2h', '2hours', '2 hours', '2hours'],
      '3h': ['3h', '3hours', '3 hours', '3hours']
    };

    const normalized = timeframe.toLowerCase().trim();
    
    for (const [key, values] of Object.entries(timeframes)) {
      if (values.includes(normalized)) {
        return key;
      }
    }

    return '5m'; // Default
  }

  collectPriceData() {
    try {
      // Try to extract current price from page
      const priceSelectors = [
        '[data-price]',
        '.price',
        '.current-price',
        '.last-price',
        '.bid-price',
        '.ask-price'
      ];

      for (const selector of priceSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const priceText = element.textContent || element.getAttribute('data-price');
          if (priceText) {
            const price = parseFloat(priceText.replace(/[^\d.-]/g, ''));
            if (!isNaN(price)) {
              return {
                timestamp: Date.now(),
                open: price,
                high: price,
                low: price,
                close: price,
                volume: 0
              };
            }
          }
        }
      }

      return null;

    } catch (error) {
      console.error('❌ Failed to collect price data:', error);
      return null;
    }
  }

  collectChartData() {
    try {
      // Try to extract chart data from page
      // This would typically involve finding chart elements and extracting OHLC data
      // For now, return empty array
      return [];

    } catch (error) {
      console.error('❌ Failed to collect chart data:', error);
      return [];
    }
  }

  collectWebSocketData(data) {
    try {
      // Parse WebSocket data and extract market information
      const parsed = JSON.parse(data);
      
      if (parsed.type === 'orderbook' && parsed.data) {
        // Process orderbook data
        this.processOrderbookData(parsed.data);
      } else if (parsed.type === 'trade' && parsed.data) {
        // Process trade data
        this.processTradeData(parsed.data);
      }

    } catch (error) {
      // Data might not be JSON, ignore
    }
  }

  processOrderbookData(data) {
    try {
      // Process orderbook data to extract price information
      if (data.bids && data.bids.length > 0) {
        const bidPrice = parseFloat(data.bids[0][0]);
        if (!isNaN(bidPrice)) {
          this.updatePriceData(bidPrice, 'bid');
        }
      }

      if (data.asks && data.asks.length > 0) {
        const askPrice = parseFloat(data.asks[0][0]);
        if (!isNaN(askPrice)) {
          this.updatePriceData(askPrice, 'ask');
        }
      }

    } catch (error) {
      console.error('❌ Failed to process orderbook data:', error);
    }
  }

  processTradeData(data) {
    try {
      // Process trade data to extract OHLC information
      if (data.price && data.size) {
        const price = parseFloat(data.price);
        const size = parseFloat(data.size);
        
        if (!isNaN(price) && !isNaN(size)) {
          this.updateTradeData(price, size);
        }
      }

    } catch (error) {
      console.error('❌ Failed to process trade data:', error);
    }
  }

  updatePriceData(price, type) {
    // Update price data buffer
    const timestamp = Date.now();
    
    if (this.dataBuffer.length === 0) {
      // Initialize with current price
      this.dataBuffer.push({
        timestamp,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 0
      });
    } else {
      // Update last candle
      const lastCandle = this.dataBuffer[this.dataBuffer.length - 1];
      lastCandle.high = Math.max(lastCandle.high, price);
      lastCandle.low = Math.min(lastCandle.low, price);
      lastCandle.close = price;
    }
  }

  updateTradeData(price, size) {
    // Update trade data in buffer
    const timestamp = Date.now();
    
    if (this.dataBuffer.length === 0) {
      // Initialize with trade data
      this.dataBuffer.push({
        timestamp,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: size
      });
    } else {
      // Update last candle
      const lastCandle = this.dataBuffer[this.dataBuffer.length - 1];
      lastCandle.high = Math.max(lastCandle.high, price);
      lastCandle.low = Math.min(lastCandle.low, price);
      lastCandle.close = price;
      lastCandle.volume += size;
    }
  }

  // ===== Utility Methods =====
  updateStatus(message) {
    const statusElement = document.getElementById('delta-baba-status');
    if (statusElement) {
      statusElement.textContent = message;
      
      // Auto-clear status after 5 seconds
      setTimeout(() => {
        if (statusElement.textContent === message) {
          statusElement.textContent = '✅ Ready';
        }
      }, 5000);
    }
  }

  setupMessageListeners() {
    // Listen for messages from popup or background
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      try {
        switch (request.action) {
          case 'GET_STATUS':
            sendResponse({
              isActive: this.isActive,
              symbol: this.currentSymbol,
              timeframe: this.currentTimeframe,
              dataPoints: this.dataBuffer.length
            });
            break;

          case 'UPDATE_SETTINGS':
            this.settings = { ...this.settings, ...request.settings };
            this.updateStatus('Settings updated');
            sendResponse({ success: true });
            break;

          case 'COLLECT_DATA':
            this.collectPageData();
            sendResponse({ success: true, dataPoints: this.dataBuffer.length });
            break;

          default:
            sendResponse({ success: false, error: 'Unknown action' });
        }
      } catch (error) {
        console.error('❌ Message handling error:', error);
        sendResponse({ success: false, error: error.message });
      }
      
      return true; // Keep message channel open
    });
  }

  destroy() {
    try {
      // Clean up resources
      if (this.websocket) {
        this.websocket.close();
        this.websocket = null;
      }

      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }

      // Remove overlay
      const container = document.getElementById('delta-baba-chart-container');
      if (container) {
        container.remove();
      }

      this.isActive = false;
      console.log('✅ Content script destroyed');

    } catch (error) {
      console.error('❌ Error destroying content script:', error);
    }
  }
}

// Initialize content script
const deltaBabaContent = new DeltaBabaContentScript();

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  if (deltaBabaContent) {
    deltaBabaContent.destroy();
  }
});