/**
 * Delta Baba Sniper 18.0 - Background Service Worker
 * Handles WebSocket connections, API polling, and data coordination
 */

class DeltaBabaSniperBackground {
    constructor() {
        this.isActive = false;
        this.websocket = null;
        this.chartData = null;
        this.predictions = [];
        this.accuracy = 0;
        this.signalCount = 0;
        this.settings = {
            soundEnabled: true,
            theme: 'light',
            language: 'en',
            timeframe: '5m'
        };
        
        this.init();
    }

    init() {
        console.log('🚀 Delta Baba Sniper Background - Initializing...');
        
        // Listen for extension events
        this.setupEventListeners();
        
        // Load saved settings
        this.loadSettings();
        
        // Start periodic data sync
        this.startDataSync();
        
        // Initialize Delta Exchange API connection
        this.initializeDeltaAPI();
    }

    setupEventListeners() {
        // Listen for popup connection
        chrome.runtime.onConnect.addListener((port) => {
            console.log('📱 Popup connected');
            
            if (port.name === 'popup') {
                this.setupPopupCommunication(port);
            }
        });

        // Listen for messages from content script and popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // Keep channel open for async response
        });

        // Listen for tab updates
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.url && tab.url.includes('delta.exchange')) {
                console.log('🌐 Delta Exchange tab loaded');
                this.onDeltaExchangeTabReady(tabId);
            }
        });

        // Listen for extension icon click
        chrome.action.onClicked.addListener((tab) => {
            // Open popup or perform action
            console.log('🎯 Extension icon clicked');
        });
    }

    setupPopupCommunication(port) {
        port.onMessage.addListener((message) => {
            switch (message.action) {
                case 'getInitialData':
                    this.sendInitialDataToPopup(port);
                    break;
                case 'updateSettings':
                    this.updateSettings(message.settings);
                    break;
                case 'requestRefresh':
                    this.refreshAllData();
                    break;
            }
        });

        port.onDisconnect.addListener(() => {
            console.log('📱 Popup disconnected');
        });
    }

    handleMessage(request, sender, sendResponse) {
        switch (request.action) {
            case 'chartDataUpdate':
                this.handleChartDataUpdate(request);
                sendResponse({ success: true });
                break;

            case 'getChartData':
                this.getChartDataFromTab(sender.tab?.id)
                    .then(data => sendResponse(data))
                    .catch(error => sendResponse({ error: error.message }));
                break;

            case 'generatePrediction':
                this.generatePrediction(request.data)
                    .then(prediction => sendResponse(prediction))
                    .catch(error => sendResponse({ error: error.message }));
                break;

            case 'updateAccuracy':
                this.updateAccuracy(request.correct, request.total);
                sendResponse({ success: true });
                break;
        }
    }

    handleChartDataUpdate(request) {
        // Process chart data update from content script
        this.chartData = {
            symbol: request.symbol,
            price: request.price,
            timeframe: request.timeframe,
            candles: request.candles,
            connected: request.connected,
            timestamp: request.timestamp
        };
        
        // Broadcast update
        this.broadcastChartUpdate();
        
        // Generate prediction if we have enough data
        if (this.chartData.candles && this.chartData.candles.length > 50) {
            this.generatePredictionsIfDataAvailable();
        }
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['deltaSniperSettings']);
            if (result.deltaSniperSettings) {
                this.settings = { ...this.settings, ...result.deltaSniperSettings };
            }
            console.log('⚙️ Settings loaded:', this.settings);
        } catch (error) {
            console.error('❌ Failed to load settings:', error);
        }
    }

    async updateSettings(newSettings) {
        try {
            this.settings = { ...this.settings, ...newSettings };
            await chrome.storage.sync.set({ deltaSniperSettings: this.settings });
            console.log('⚙️ Settings updated:', this.settings);
            
            // Notify all connected components
            this.broadcastSettingsUpdate();
        } catch (error) {
            console.error('❌ Failed to update settings:', error);
        }
    }

    startDataSync() {
        // Sync data every 5 seconds
        setInterval(() => {
            this.syncChartData();
        }, 5000);

        // Generate predictions every 30 seconds
        setInterval(() => {
            this.generatePredictionsIfDataAvailable();
        }, 30000);
    }

    async syncChartData() {
        try {
            // Get data from local storage (updated by content script)
            const result = await chrome.storage.local.get(['deltaChartData']);
            if (result.deltaChartData) {
                const data = result.deltaChartData;
                
                // Update our internal data if newer
                if (!this.chartData || data.timestamp > this.chartData.timestamp) {
                    this.chartData = data;
                    console.log('📊 Chart data synced:', data.symbol, data.price);
                    
                    // Broadcast update to popup if connected
                    this.broadcastChartUpdate();
                }
            }
        } catch (error) {
            console.error('❌ Failed to sync chart data:', error);
        }
    }

    async initializeDeltaAPI() {
        try {
            // Initialize WebSocket connection to Delta Exchange
            this.connectToDeltaWebSocket();
            
            // Set up API polling as backup
            this.startAPIPolling();
            
        } catch (error) {
            console.error('❌ Failed to initialize Delta API:', error);
        }
    }

    connectToDeltaWebSocket() {
        try {
            // Connect to Delta Exchange WebSocket
            const wsUrl = 'wss://socket.delta.exchange';
            this.websocket = new WebSocket(wsUrl);

            this.websocket.onopen = () => {
                console.log('📡 Connected to Delta Exchange WebSocket');
                
                // Subscribe to ticker updates
                this.subscribeTickers();
            };

            this.websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.processDeltaWebSocketData(data);
                } catch (e) {
                    console.error('❌ Failed to parse WebSocket data:', e);
                }
            };

            this.websocket.onclose = () => {
                console.log('📡 Delta Exchange WebSocket closed, reconnecting...');
                
                // Reconnect after delay
                setTimeout(() => {
                    this.connectToDeltaWebSocket();
                }, 5000);
            };

            this.websocket.onerror = (error) => {
                console.error('❌ Delta Exchange WebSocket error:', error);
            };

        } catch (error) {
            console.error('❌ Failed to connect to WebSocket:', error);
        }
    }

    subscribeTickers() {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            // Subscribe to all ticker updates
            const subscribeMessage = {
                type: 'subscribe',
                payload: {
                    channels: [
                        { name: 'all_ticker' },
                        { name: 'candlestick_1m' },
                        { name: 'candlestick_5m' },
                        { name: 'candlestick_15m' },
                        { name: 'candlestick_1h' }
                    ]
                }
            };
            
            this.websocket.send(JSON.stringify(subscribeMessage));
            console.log('📡 Subscribed to Delta Exchange tickers');
        }
    }

    processDeltaWebSocketData(data) {
        // Process different types of WebSocket data
        if (data.type === 'ticker') {
            this.processTickerUpdate(data);
        } else if (data.type === 'candlestick') {
            this.processCandlestickUpdate(data);
        } else if (data.type === 'trade') {
            this.processTradeUpdate(data);
        }
    }

    processTickerUpdate(data) {
        // Update current price and symbol info
        if (data.symbol && data.price) {
            const update = {
                action: 'priceUpdate',
                symbol: data.symbol,
                price: parseFloat(data.price),
                volume: parseFloat(data.volume || 0),
                change: parseFloat(data.change || 0),
                timestamp: Date.now()
            };
            
            this.broadcastPriceUpdate(update);
        }
    }

    processCandlestickUpdate(data) {
        // Process candlestick data
        if (data.candle) {
            const candle = {
                time: data.candle.timestamp,
                open: parseFloat(data.candle.open),
                high: parseFloat(data.candle.high),
                low: parseFloat(data.candle.low),
                close: parseFloat(data.candle.close),
                volume: parseFloat(data.candle.volume || 0)
            };
            
            this.broadcastCandleUpdate(candle, data.symbol, data.interval);
        }
    }

    processTradeUpdate(data) {
        // Process trade updates for volume analysis
        console.log('💹 Trade update:', data);
    }

    startAPIPolling() {
        // Poll Delta Exchange REST API every 10 seconds as backup
        setInterval(async () => {
            try {
                await this.pollDeltaAPI();
            } catch (error) {
                console.error('❌ API polling failed:', error);
            }
        }, 10000);
    }

    async pollDeltaAPI() {
        try {
            // Fetch ticker data from Delta Exchange API
            const response = await fetch('https://api.delta.exchange/v2/tickers');
            if (response.ok) {
                const data = await response.json();
                this.processDeltaAPIData(data);
            }
        } catch (error) {
            console.error('❌ Failed to poll Delta API:', error);
        }
    }

    processDeltaAPIData(data) {
        // Process API response data
        if (data.result && Array.isArray(data.result)) {
            data.result.forEach(ticker => {
                if (ticker.symbol && ticker.last_price) {
                    const update = {
                        action: 'priceUpdate',
                        symbol: ticker.symbol,
                        price: parseFloat(ticker.last_price),
                        volume: parseFloat(ticker.volume || 0),
                        change: parseFloat(ticker.change || 0),
                        timestamp: Date.now()
                    };
                    
                    this.broadcastPriceUpdate(update);
                }
            });
        }
    }

    async generatePredictionsIfDataAvailable() {
        if (this.chartData && this.chartData.candles && this.chartData.candles.length > 50) {
            try {
                const prediction = await this.generatePrediction(this.chartData);
                this.predictions.unshift(prediction);
                
                // Keep only last 10 predictions
                this.predictions = this.predictions.slice(0, 10);
                
                // Broadcast prediction
                this.broadcastPredictionUpdate(prediction);
                
                // Play sound if enabled
                if (this.settings.soundEnabled && prediction.confidence > 60) {
                    this.playSignalSound();
                }
                
            } catch (error) {
                console.error('❌ Failed to generate prediction:', error);
            }
        }
    }

    async generatePrediction(chartData) {
        // Import and use technical analysis module
        const indicators = await this.calculateTechnicalIndicators(chartData.candles);
        const signals = this.analyzeSignals(indicators, chartData.candles);
        
        const prediction = {
            timestamp: Date.now(),
            symbol: chartData.symbol,
            currentPrice: chartData.price,
            timeframe: chartData.timeframe,
            signals: signals,
            confidence: this.calculateConfidence(signals),
            entryPrice: this.calculateEntryPrice(signals, chartData.price),
            exitPrice: this.calculateExitPrice(signals, chartData.price),
            direction: this.determineDirection(signals),
            indicators: indicators
        };
        
        console.log('🎯 Generated prediction:', prediction);
        return prediction;
    }

    async calculateTechnicalIndicators(candles) {
        // Calculate all technical indicators
        const closes = candles.map(c => c.close);
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);
        const volumes = candles.map(c => c.volume);
        
        const indicators = {
            ema9: this.calculateEMA(closes, 9),
            ema21: this.calculateEMA(closes, 21),
            ema55: this.calculateEMA(closes, 55),
            rsi: this.calculateRSI(closes, 14),
            macd: this.calculateMACD(closes),
            supertrend: this.calculateSupertrend(highs, lows, closes),
            pivotPoints: this.calculatePivotPoints(candles.slice(-1)[0]),
            volume: volumes.slice(-1)[0],
            atr: this.calculateATR(highs, lows, closes, 14)
        };
        
        return indicators;
    }

    calculateEMA(prices, period) {
        if (prices.length < period) return null;
        
        const multiplier = 2 / (period + 1);
        let ema = prices[0];
        
        for (let i = 1; i < prices.length; i++) {
            ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
        }
        
        return ema;
    }

    calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) return null;
        
        let gains = 0;
        let losses = 0;
        
        // Calculate initial average gain and loss
        for (let i = 1; i <= period; i++) {
            const change = prices[i] - prices[i - 1];
            if (change >= 0) {
                gains += change;
            } else {
                losses -= change;
            }
        }
        
        let avgGain = gains / period;
        let avgLoss = losses / period;
        
        // Calculate RSI for remaining periods
        for (let i = period + 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            const gain = change >= 0 ? change : 0;
            const loss = change < 0 ? -change : 0;
            
            avgGain = (avgGain * (period - 1) + gain) / period;
            avgLoss = (avgLoss * (period - 1) + loss) / period;
        }
        
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        if (prices.length < slowPeriod) return null;
        
        const fastEMA = this.calculateEMA(prices, fastPeriod);
        const slowEMA = this.calculateEMA(prices, slowPeriod);
        const macdLine = fastEMA - slowEMA;
        
        // Calculate signal line (EMA of MACD line)
        const macdArray = [];
        for (let i = slowPeriod - 1; i < prices.length; i++) {
            const fast = this.calculateEMA(prices.slice(0, i + 1), fastPeriod);
            const slow = this.calculateEMA(prices.slice(0, i + 1), slowPeriod);
            macdArray.push(fast - slow);
        }
        
        const signalLine = this.calculateEMA(macdArray, signalPeriod);
        const histogram = macdLine - signalLine;
        
        return {
            macd: macdLine,
            signal: signalLine,
            histogram: histogram
        };
    }

    calculateSupertrend(highs, lows, closes, period = 10, multiplier = 3) {
        if (highs.length < period) return null;
        
        const atr = this.calculateATR(highs, lows, closes, period);
        const hl2 = highs.map((h, i) => (h + lows[i]) / 2);
        
        const upperBand = hl2[hl2.length - 1] + (multiplier * atr);
        const lowerBand = hl2[hl2.length - 1] - (multiplier * atr);
        
        const currentClose = closes[closes.length - 1];
        const prevSupertrend = this.prevSupertrend || lowerBand;
        
        let supertrend;
        if (currentClose >= prevSupertrend) {
            supertrend = lowerBand;
        } else {
            supertrend = upperBand;
        }
        
        this.prevSupertrend = supertrend;
        
        return {
            value: supertrend,
            direction: currentClose >= supertrend ? 'bullish' : 'bearish'
        };
    }

    calculateATR(highs, lows, closes, period = 14) {
        if (highs.length < period + 1) return 0;
        
        const trueRanges = [];
        for (let i = 1; i < highs.length; i++) {
            const tr1 = highs[i] - lows[i];
            const tr2 = Math.abs(highs[i] - closes[i - 1]);
            const tr3 = Math.abs(lows[i] - closes[i - 1]);
            trueRanges.push(Math.max(tr1, tr2, tr3));
        }
        
        return trueRanges.slice(-period).reduce((sum, tr) => sum + tr, 0) / period;
    }

    calculatePivotPoints(lastCandle) {
        const { high, low, close } = lastCandle;
        const pivot = (high + low + close) / 3;
        
        return {
            pivot: pivot,
            r1: (2 * pivot) - low,
            r2: pivot + (high - low),
            r3: high + 2 * (pivot - low),
            s1: (2 * pivot) - high,
            s2: pivot - (high - low),
            s3: low - 2 * (high - pivot)
        };
    }

    analyzeSignals(indicators, candles) {
        const signals = {
            emaSignal: this.analyzeEMASignal(indicators),
            rsiSignal: this.analyzeRSISignal(indicators.rsi),
            macdSignal: this.analyzeMACD(indicators.macd),
            supertrendSignal: this.analyzeSupertrend(indicators.supertrend),
            pivotSignal: this.analyzePivotPoints(indicators.pivotPoints, candles.slice(-1)[0].close),
            volumeSignal: this.analyzeVolume(indicators.volume, candles)
        };
        
        return signals;
    }

    analyzeEMASignal(indicators) {
        const { ema9, ema21, ema55 } = indicators;
        
        if (ema9 > ema21 && ema21 > ema55) {
            return { signal: 'bullish', strength: 'strong' };
        } else if (ema9 < ema21 && ema21 < ema55) {
            return { signal: 'bearish', strength: 'strong' };
        } else if (ema9 > ema21) {
            return { signal: 'bullish', strength: 'weak' };
        } else if (ema9 < ema21) {
            return { signal: 'bearish', strength: 'weak' };
        }
        
        return { signal: 'neutral', strength: 'none' };
    }

    analyzeRSISignal(rsi) {
        if (rsi >= 70) {
            return { signal: 'bearish', strength: 'strong', reason: 'overbought' };
        } else if (rsi <= 30) {
            return { signal: 'bullish', strength: 'strong', reason: 'oversold' };
        } else if (rsi >= 60) {
            return { signal: 'bearish', strength: 'weak', reason: 'high' };
        } else if (rsi <= 40) {
            return { signal: 'bullish', strength: 'weak', reason: 'low' };
        }
        
        return { signal: 'neutral', strength: 'none' };
    }

    analyzeMACD(macd) {
        if (!macd) return { signal: 'neutral', strength: 'none' };
        
        if (macd.histogram > 0 && macd.macd > macd.signal) {
            return { signal: 'bullish', strength: 'strong' };
        } else if (macd.histogram < 0 && macd.macd < macd.signal) {
            return { signal: 'bearish', strength: 'strong' };
        }
        
        return { signal: 'neutral', strength: 'none' };
    }

    analyzeSupertrend(supertrend) {
        if (!supertrend) return { signal: 'neutral', strength: 'none' };
        
        return {
            signal: supertrend.direction,
            strength: 'strong'
        };
    }

    analyzePivotPoints(pivots, currentPrice) {
        const { pivot, r1, r2, s1, s2 } = pivots;
        
        if (currentPrice > r1) {
            return { signal: 'bullish', strength: 'strong', level: 'above_resistance' };
        } else if (currentPrice < s1) {
            return { signal: 'bearish', strength: 'strong', level: 'below_support' };
        } else if (currentPrice > pivot) {
            return { signal: 'bullish', strength: 'weak', level: 'above_pivot' };
        } else {
            return { signal: 'bearish', strength: 'weak', level: 'below_pivot' };
        }
    }

    analyzeVolume(currentVolume, candles) {
        const avgVolume = candles.slice(-20).reduce((sum, c) => sum + c.volume, 0) / 20;
        
        if (currentVolume > avgVolume * 1.5) {
            return { signal: 'strong', strength: 'high' };
        } else if (currentVolume > avgVolume) {
            return { signal: 'normal', strength: 'medium' };
        } else {
            return { signal: 'weak', strength: 'low' };
        }
    }

    calculateConfidence(signals) {
        let bullishSignals = 0;
        let bearishSignals = 0;
        let strongSignals = 0;
        
        Object.values(signals).forEach(signal => {
            if (signal.signal === 'bullish') bullishSignals++;
            if (signal.signal === 'bearish') bearishSignals++;
            if (signal.strength === 'strong') strongSignals++;
        });
        
        const totalSignals = Object.keys(signals).length;
        const dominantSignals = Math.max(bullishSignals, bearishSignals);
        
        return Math.round((dominantSignals / totalSignals) * 100 * (1 + strongSignals / totalSignals));
    }

    determineDirection(signals) {
        let bullishCount = 0;
        let bearishCount = 0;
        
        Object.values(signals).forEach(signal => {
            if (signal.signal === 'bullish') bullishCount++;
            if (signal.signal === 'bearish') bearishCount++;
        });
        
        return bullishCount > bearishCount ? 'bullish' : 'bearish';
    }

    calculateEntryPrice(signals, currentPrice) {
        const direction = this.determineDirection(signals);
        const buffer = currentPrice * 0.001; // 0.1% buffer
        
        return direction === 'bullish' ? currentPrice + buffer : currentPrice - buffer;
    }

    calculateExitPrice(signals, currentPrice) {
        const direction = this.determineDirection(signals);
        const target = currentPrice * 0.02; // 2% target
        
        return direction === 'bullish' ? currentPrice + target : currentPrice - target;
    }

    updateAccuracy(correct, total) {
        this.accuracy = Math.round((correct / total) * 100);
        console.log('📊 Accuracy updated:', this.accuracy + '%');
    }

    playSignalSound() {
        if (this.settings.soundEnabled) {
            // Create audio notification
            console.log('🔊 Playing signal sound');
            // In a real extension, you would play an actual sound file
        }
    }

    broadcastChartUpdate() {
        // Send chart update to all connected components
        const message = {
            action: 'chartDataUpdate',
            data: this.chartData
        };
        
        this.sendMessageToAllTabs(message);
    }

    broadcastPriceUpdate(update) {
        // Send price update to all connected components
        const message = {
            action: 'priceUpdate',
            data: update
        };
        
        this.sendMessageToAllTabs(message);
    }

    broadcastCandleUpdate(candle, symbol, interval) {
        // Send candle update to all connected components
        const message = {
            action: 'candleUpdate',
            data: { candle, symbol, interval }
        };
        
        this.sendMessageToAllTabs(message);
    }

    broadcastPredictionUpdate(prediction) {
        // Send prediction update to all connected components
        const message = {
            action: 'predictionUpdate',
            data: prediction
        };
        
        this.sendMessageToAllTabs(message);
        
        // Update signal count
        this.signalCount++;
    }

    broadcastSettingsUpdate() {
        // Send settings update to all connected components
        const message = {
            action: 'settingsUpdate',
            data: this.settings
        };
        
        this.sendMessageToAllTabs(message);
    }

    async sendMessageToAllTabs(message) {
        try {
            const tabs = await chrome.tabs.query({});
            tabs.forEach(tab => {
                if (tab.url && tab.url.includes('delta.exchange')) {
                    chrome.tabs.sendMessage(tab.id, message).catch(() => {
                        // Tab might not have content script loaded
                    });
                }
            });
        } catch (error) {
            console.error('❌ Failed to send message to tabs:', error);
        }
    }

    async sendInitialDataToPopup(port) {
        // Send initial data to popup
        const initialData = {
            action: 'initialData',
            chartData: this.chartData,
            predictions: this.predictions,
            settings: this.settings,
            accuracy: this.accuracy,
            signalCount: this.signalCount
        };
        
        port.postMessage(initialData);
    }

    async getChartDataFromTab(tabId) {
        try {
            const response = await chrome.tabs.sendMessage(tabId, { action: 'getChartData' });
            return response;
        } catch (error) {
            throw new Error('Failed to get chart data from tab');
        }
    }

    async onDeltaExchangeTabReady(tabId) {
        // Inject content script if not already present
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => {
                    // Check if content script is already loaded
                    return window.deltaBabaSniper ? true : false;
                }
            });
        } catch (error) {
            console.log('Content script already loaded or failed to check');
        }
    }

    refreshAllData() {
        // Refresh all data sources
        this.syncChartData();
        this.generatePredictionsIfDataAvailable();
        
        // Request refresh from all tabs
        this.sendMessageToAllTabs({ action: 'refresh' });
    }
}

// Initialize background service
const deltaBabaSniperBG = new DeltaBabaSniperBackground();

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
    console.log('🚀 Delta Baba Sniper - Extension started');
});

chrome.runtime.onInstalled.addListener((details) => {
    console.log('📦 Delta Baba Sniper - Extension installed/updated');
    
    if (details.reason === 'install') {
        // First time installation
        console.log('🎉 Welcome to Delta Baba Sniper 18.0!');
    }
});