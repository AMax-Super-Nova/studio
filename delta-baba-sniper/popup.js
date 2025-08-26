/**
 * Delta Baba Sniper 18.0 - Popup Script
 * Main UI logic, chart rendering, and prediction display
 */

class DeltaBabaSniperPopup {
    constructor() {
        this.chart = null;
        this.candleSeries = null;
        this.volumeSeries = null;
        this.indicatorSeries = {};
        this.chartData = null;
        this.predictions = [];
        this.settings = {
            theme: 'light',
            language: 'en',
            soundEnabled: true,
            timeframe: '5m'
        };
        this.port = null;
        this.updateInterval = null;
        this.translations = {
            en: {
                symbol: 'Symbol',
                price: 'Price', 
                status: 'Status',
                connected: 'Connected',
                disconnected: 'Disconnected',
                timeframe: 'Timeframe',
                language: 'Language',
                refresh: 'Refresh',
                technicalIndicators: 'Technical Indicators',
                tradingSignals: 'Trading Signals',
                noSignal: 'No Signal',
                entry: 'Entry',
                exit: 'Exit',
                time: 'Time',
                next5min: 'Next 5min Prediction',
                accuracy: 'Accuracy',
                signals: 'Signals'
            },
            hi: {
                symbol: 'सिंबल',
                price: 'मूल्य',
                status: 'स्थिति',
                connected: 'जुड़ा हुआ',
                disconnected: 'डिस्कनेक्ट',
                timeframe: 'समयसीमा',
                language: 'भाषा',
                refresh: 'रीफ्रेश',
                technicalIndicators: 'तकनीकी संकेतक',
                tradingSignals: 'ट्रेडिंग सिग्नल',
                noSignal: 'कोई सिग्नल नहीं',
                entry: 'एंट्री',
                exit: 'एक्जिट', 
                time: 'समय',
                next5min: 'अगले 5 मिनट की भविष्यवाणी',
                accuracy: 'सटीकता',
                signals: 'सिग्नल'
            }
        };
        
        this.init();
    }

    async init() {
        console.log('🚀 Delta Baba Sniper Popup - Initializing...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
            return;
        }

        // Initialize chart
        await this.initializeChart();
        
        // Set up UI event listeners
        this.setupEventListeners();
        
        // Connect to background script
        this.connectToBackground();
        
        // Load saved settings
        await this.loadSettings();
        
        // Start data refresh cycle
        this.startDataRefresh();
        
        // Request initial data
        this.requestInitialData();
        
        console.log('✅ Delta Baba Sniper Popup - Initialized successfully');
    }

    async initializeChart() {
        try {
            // Check if LightweightCharts is available
            if (typeof LightweightCharts === 'undefined') {
                console.error('❌ LightweightCharts library not loaded');
                await this.loadLightweightCharts();
            }

            const chartContainer = document.getElementById('tradingview-chart');
            if (!chartContainer) {
                console.error('❌ Chart container not found');
                return;
            }

            // Create chart with initial settings
            this.chart = LightweightCharts.createChart(chartContainer, {
                width: chartContainer.clientWidth,
                height: 200,
                layout: {
                    backgroundColor: 'transparent',
                    textColor: getComputedStyle(document.documentElement).getPropertyValue('--chart-text'),
                },
                grid: {
                    vertLines: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--chart-grid'),
                    },
                    horzLines: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--chart-grid'),
                    },
                },
                crosshair: {
                    mode: LightweightCharts.CrosshairMode.Normal,
                },
                rightPriceScale: {
                    borderColor: getComputedStyle(document.documentElement).getPropertyValue('--border-color'),
                },
                timeScale: {
                    borderColor: getComputedStyle(document.documentElement).getPropertyValue('--border-color'),
                    timeVisible: true,
                    secondsVisible: false,
                },
            });

            // Create candlestick series
            this.candleSeries = this.chart.addCandlestickSeries({
                upColor: getComputedStyle(document.documentElement).getPropertyValue('--bullish'),
                downColor: getComputedStyle(document.documentElement).getPropertyValue('--bearish'),
                borderVisible: false,
                wickUpColor: getComputedStyle(document.documentElement).getPropertyValue('--bullish'),
                wickDownColor: getComputedStyle(document.documentElement).getPropertyValue('--bearish'),
            });

            // Create volume series
            this.volumeSeries = this.chart.addHistogramSeries({
                color: '#26a69a',
                priceFormat: {
                    type: 'volume',
                },
                priceScaleId: 'volume',
                scaleMargins: {
                    top: 0.8,
                    bottom: 0,
                },
            });

            // Create indicator series
            this.createIndicatorSeries();

            // Hide chart loader
            this.hideChartLoader();

            // Handle chart resize
            new ResizeObserver(entries => {
                if (entries.length === 0 || entries[0].target !== chartContainer) return;
                const newRect = entries[0].contentRect;
                this.chart.applyOptions({ width: newRect.width, height: newRect.height });
            }).observe(chartContainer);

            console.log('📊 Chart initialized successfully');

        } catch (error) {
            console.error('❌ Failed to initialize chart:', error);
            this.showChartError('Failed to initialize chart');
        }
    }

    async loadLightweightCharts() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    createIndicatorSeries() {
        // EMA Series
        this.indicatorSeries.ema9 = this.chart.addLineSeries({
            color: '#FFD700',
            lineWidth: 1,
            title: 'EMA 9'
        });

        this.indicatorSeries.ema21 = this.chart.addLineSeries({
            color: '#FF6347',
            lineWidth: 1,
            title: 'EMA 21'
        });

        this.indicatorSeries.ema55 = this.chart.addLineSeries({
            color: '#4169E1',
            lineWidth: 2,
            title: 'EMA 55'
        });

        // Supertrend Series
        this.indicatorSeries.supertrend = this.chart.addLineSeries({
            color: '#FF00FF',
            lineWidth: 2,
            title: 'Supertrend'
        });

        // Support/Resistance levels
        this.indicatorSeries.support = this.chart.addLineSeries({
            color: '#00FF00',
            lineWidth: 1,
            lineStyle: 2, // Dashed
            title: 'Support'
        });

        this.indicatorSeries.resistance = this.chart.addLineSeries({
            color: '#FF0000',
            lineWidth: 1,
            lineStyle: 2, // Dashed
            title: 'Resistance'
        });
    }

    setupEventListeners() {
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Timeframe selector
        const timeframeSelect = document.getElementById('timeframe');
        if (timeframeSelect) {
            timeframeSelect.addEventListener('change', (e) => {
                this.settings.timeframe = e.target.value;
                this.saveSettings();
                this.requestTimeframeChange(e.target.value);
            });
        }

        // Language selector
        const languageSelect = document.getElementById('language');
        if (languageSelect) {
            languageSelect.addEventListener('change', (e) => {
                this.settings.language = e.target.value;
                this.saveSettings();
                this.updateUILanguage();
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshData());
        }

        // Sound toggle
        const soundToggle = document.getElementById('soundToggle');
        if (soundToggle) {
            soundToggle.addEventListener('click', () => this.toggleSound());
        }

        // Window resize
        window.addEventListener('resize', () => {
            if (this.chart) {
                const container = document.getElementById('tradingview-chart');
                this.chart.applyOptions({
                    width: container.clientWidth,
                    height: container.clientHeight
                });
            }
        });

        // Handle messages from background script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleBackgroundMessage(message);
        });
    }

    connectToBackground() {
        try {
            this.port = chrome.runtime.connect({ name: 'popup' });
            
            this.port.onMessage.addListener((message) => {
                this.handleBackgroundMessage(message);
            });

            this.port.onDisconnect.addListener(() => {
                console.log('📱 Disconnected from background script');
                // Attempt to reconnect
                setTimeout(() => this.connectToBackground(), 1000);
            });

            console.log('📱 Connected to background script');
        } catch (error) {
            console.error('❌ Failed to connect to background script:', error);
        }
    }

    handleBackgroundMessage(message) {
        switch (message.action) {
            case 'initialData':
                this.handleInitialData(message);
                break;
            case 'chartDataUpdate':
                this.handleChartDataUpdate(message.data);
                break;
            case 'priceUpdate':
                this.handlePriceUpdate(message.data);
                break;
            case 'predictionUpdate':
                this.handlePredictionUpdate(message.data);
                break;
            case 'settingsUpdate':
                this.handleSettingsUpdate(message.data);
                break;
        }
    }

    handleInitialData(data) {
        console.log('📊 Received initial data:', data);
        
        if (data.chartData) {
            this.handleChartDataUpdate(data.chartData);
        }
        
        if (data.predictions) {
            this.predictions = data.predictions;
            this.updatePredictionsDisplay();
        }
        
        if (data.settings) {
            this.settings = { ...this.settings, ...data.settings };
            this.applySettings();
        }
        
        if (data.accuracy !== undefined) {
            this.updateAccuracyDisplay(data.accuracy);
        }
        
        if (data.signalCount !== undefined) {
            this.updateSignalCountDisplay(data.signalCount);
        }
    }

    handleChartDataUpdate(data) {
        console.log('📊 Chart data update:', data);
        
        this.chartData = data;
        
        // Update status
        this.updateConnectionStatus(data.connected);
        this.updateSymbolDisplay(data.symbol);
        this.updatePriceDisplay(data.price);
        
        // Update chart
        if (data.candles && data.candles.length > 0) {
            this.updateChart(data.candles);
            this.calculateAndDisplayIndicators(data.candles);
        }
    }

    handlePriceUpdate(data) {
        this.updatePriceDisplay(data.price);
        
        // Update last candle if we have chart data
        if (this.chartData && this.chartData.candles) {
            const lastCandle = this.chartData.candles[this.chartData.candles.length - 1];
            if (lastCandle) {
                lastCandle.close = data.price;
                if (data.price > lastCandle.high) lastCandle.high = data.price;
                if (data.price < lastCandle.low) lastCandle.low = data.price;
                
                // Update chart
                this.candleSeries.update({
                    time: lastCandle.time,
                    open: lastCandle.open,
                    high: lastCandle.high,
                    low: lastCandle.low,
                    close: lastCandle.close
                });
            }
        }
    }

    handlePredictionUpdate(prediction) {
        console.log('🎯 New prediction:', prediction);
        
        this.predictions.unshift(prediction);
        this.predictions = this.predictions.slice(0, 10); // Keep only last 10
        
        this.updatePredictionsDisplay();
        this.updateCurrentSignal(prediction);
        
        // Show prediction on chart
        this.showPredictionOnChart(prediction);
        
        // Play sound if enabled
        if (this.settings.soundEnabled && prediction.confidence > 60) {
            this.playNotificationSound();
        }
    }

    handleSettingsUpdate(settings) {
        this.settings = { ...this.settings, ...settings };
        this.applySettings();
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['deltaSniperSettings']);
            if (result.deltaSniperSettings) {
                this.settings = { ...this.settings, ...result.deltaSniperSettings };
                this.applySettings();
            }
        } catch (error) {
            console.error('❌ Failed to load settings:', error);
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.sync.set({ deltaSniperSettings: this.settings });
        } catch (error) {
            console.error('❌ Failed to save settings:', error);
        }
    }

    applySettings() {
        // Apply theme
        document.documentElement.setAttribute('data-theme', this.settings.theme);
        
        // Update theme button
        const themeBtn = document.getElementById('themeToggle');
        if (themeBtn) {
            themeBtn.textContent = this.settings.theme === 'dark' ? '☀️' : '🌙';
        }
        
        // Update timeframe selector
        const timeframeSelect = document.getElementById('timeframe');
        if (timeframeSelect) {
            timeframeSelect.value = this.settings.timeframe;
        }
        
        // Update language selector
        const languageSelect = document.getElementById('language');
        if (languageSelect) {
            languageSelect.value = this.settings.language;
        }
        
        // Update sound button
        const soundBtn = document.getElementById('soundToggle');
        if (soundBtn) {
            soundBtn.textContent = this.settings.soundEnabled ? '🔊' : '🔇';
        }
        
        // Update UI language
        this.updateUILanguage();
        
        // Update chart theme
        this.updateChartTheme();
    }

    updateUILanguage() {
        const lang = this.settings.language;
        const t = this.translations[lang] || this.translations.en;
        
        // Update labels
        const elements = {
            'currentSymbol': t.symbol,
            'currentPrice': t.price,
            'connectionStatus': this.getConnectionStatus() ? t.connected : t.disconnected
        };
        
        // Update control labels
        document.querySelectorAll('label').forEach(label => {
            const forAttr = label.getAttribute('for');
            if (forAttr === 'timeframe') label.textContent = t.timeframe + ':';
            if (forAttr === 'language') label.textContent = t.language + ':';
        });
        
        // Update headings
        const indicators = document.querySelector('.indicators-panel h3');
        if (indicators) indicators.textContent = t.technicalIndicators;
        
        const signals = document.querySelector('.signals-panel h3');
        if (signals) signals.textContent = t.tradingSignals;
        
        const predictions = document.querySelector('.predictions-panel h3');
        if (predictions) predictions.textContent = t.next5min;
    }

    updateChartTheme() {
        if (!this.chart) return;
        
        const theme = this.settings.theme;
        const colors = {
            light: {
                backgroundColor: '#ffffff',
                textColor: '#333333',
                gridColor: '#f0f0f0',
                borderColor: '#dee2e6'
            },
            dark: {
                backgroundColor: '#1a1a1a',
                textColor: '#ffffff',
                gridColor: '#333333',
                borderColor: '#404040'
            }
        };
        
        const themeColors = colors[theme] || colors.light;
        
        this.chart.applyOptions({
            layout: {
                backgroundColor: themeColors.backgroundColor,
                textColor: themeColors.textColor,
            },
            grid: {
                vertLines: { color: themeColors.gridColor },
                horzLines: { color: themeColors.gridColor },
            },
            rightPriceScale: { borderColor: themeColors.borderColor },
            timeScale: { borderColor: themeColors.borderColor },
        });
    }

    startDataRefresh() {
        // Refresh data every 5 seconds
        this.updateInterval = setInterval(() => {
            this.requestDataUpdate();
        }, 5000);
    }

    requestInitialData() {
        if (this.port) {
            this.port.postMessage({ action: 'getInitialData' });
        }
    }

    requestDataUpdate() {
        // Request fresh data from content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].url && tabs[0].url.includes('delta.exchange')) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'getChartData' }, (response) => {
                    if (response && !chrome.runtime.lastError) {
                        this.handleChartDataUpdate(response);
                    }
                });
            }
        });
    }

    requestTimeframeChange(timeframe) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].url && tabs[0].url.includes('delta.exchange')) {
                chrome.tabs.sendMessage(tabs[0].id, { 
                    action: 'setTimeframe', 
                    timeframe: timeframe 
                });
            }
        });
    }

    refreshData() {
        console.log('🔄 Refreshing data...');
        
        // Show refresh animation
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.style.transform = 'rotate(360deg)';
            setTimeout(() => {
                refreshBtn.style.transform = 'rotate(0deg)';
            }, 500);
        }
        
        // Request refresh from background
        if (this.port) {
            this.port.postMessage({ action: 'requestRefresh' });
        }
        
        // Request fresh data immediately
        this.requestDataUpdate();
    }

    toggleTheme() {
        this.settings.theme = this.settings.theme === 'light' ? 'dark' : 'light';
        this.saveSettings();
        this.applySettings();
    }

    toggleSound() {
        this.settings.soundEnabled = !this.settings.soundEnabled;
        this.saveSettings();
        this.applySettings();
    }

    updateChart(candles) {
        if (!this.candleSeries || !candles || candles.length === 0) return;
        
        try {
            // Convert timestamp to TradingView format if needed
            const chartData = candles.map(candle => ({
                time: typeof candle.time === 'number' ? candle.time / 1000 : candle.time,
                open: parseFloat(candle.open),
                high: parseFloat(candle.high),
                low: parseFloat(candle.low),
                close: parseFloat(candle.close)
            }));
            
            // Update candlestick series
            this.candleSeries.setData(chartData);
            
            // Update volume series if available
            if (this.volumeSeries && candles[0].volume !== undefined) {
                const volumeData = candles.map(candle => ({
                    time: typeof candle.time === 'number' ? candle.time / 1000 : candle.time,
                    value: parseFloat(candle.volume || 0),
                    color: candle.close >= candle.open ? '#26a69a' : '#ef5350'
                }));
                
                this.volumeSeries.setData(volumeData);
            }
            
            // Fit chart to data
            this.chart.timeScale().fitContent();
            
        } catch (error) {
            console.error('❌ Failed to update chart:', error);
        }
    }

    calculateAndDisplayIndicators(candles) {
        if (!candles || candles.length < 55) return;
        
        try {
            const closes = candles.map(c => parseFloat(c.close));
            const highs = candles.map(c => parseFloat(c.high));
            const lows = candles.map(c => parseFloat(c.low));
            
            // Calculate indicators
            const indicators = this.calculateIndicators(closes, highs, lows, candles);
            
            // Update indicator displays
            this.updateIndicatorDisplays(indicators);
            
            // Update indicator series on chart
            this.updateIndicatorSeries(indicators, candles);
            
        } catch (error) {
            console.error('❌ Failed to calculate indicators:', error);
        }
    }

    calculateIndicators(closes, highs, lows, candles) {
        return {
            ema9: this.calculateEMA(closes, 9),
            ema21: this.calculateEMA(closes, 21),
            ema55: this.calculateEMA(closes, 55),
            rsi: this.calculateRSI(closes, 14),
            macd: this.calculateMACD(closes),
            supertrend: this.calculateSupertrend(highs, lows, closes),
            pivotPoints: this.calculatePivotPoints(candles[candles.length - 1]),
            atr: this.calculateATR(highs, lows, closes, 14)
        };
    }

    calculateEMA(prices, period) {
        if (prices.length < period) return [];
        
        const ema = [];
        const multiplier = 2 / (period + 1);
        
        // Start with SMA for first value
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += prices[i];
        }
        ema[period - 1] = sum / period;
        
        // Calculate EMA for remaining values
        for (let i = period; i < prices.length; i++) {
            ema[i] = (prices[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
        }
        
        return ema;
    }

    calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) return null;
        
        const gains = [];
        const losses = [];
        
        // Calculate price changes
        for (let i = 1; i < prices.length; i++) {
            const change = prices[i] - prices[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? -change : 0);
        }
        
        // Calculate initial averages
        let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
        let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
        
        // Calculate RSI for remaining periods
        for (let i = period; i < gains.length; i++) {
            avgGain = (avgGain * (period - 1) + gains[i]) / period;
            avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
        }
        
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        if (prices.length < slowPeriod) return null;
        
        const fastEMA = this.calculateEMA(prices, fastPeriod);
        const slowEMA = this.calculateEMA(prices, slowPeriod);
        
        if (fastEMA.length === 0 || slowEMA.length === 0) return null;
        
        const macdLine = fastEMA[fastEMA.length - 1] - slowEMA[slowEMA.length - 1];
        
        return {
            macd: macdLine,
            signal: 0, // Simplified for display
            histogram: macdLine
        };
    }

    calculateSupertrend(highs, lows, closes, period = 10, multiplier = 3) {
        if (highs.length < period) return null;
        
        const atr = this.calculateATR(highs, lows, closes, period);
        const hl2 = (highs[highs.length - 1] + lows[lows.length - 1]) / 2;
        
        const upperBand = hl2 + (multiplier * atr);
        const lowerBand = hl2 - (multiplier * atr);
        
        const currentClose = closes[closes.length - 1];
        const trend = currentClose >= lowerBand ? 'bullish' : 'bearish';
        
        return {
            value: trend === 'bullish' ? lowerBand : upperBand,
            direction: trend
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
        const pivot = (parseFloat(high) + parseFloat(low) + parseFloat(close)) / 3;
        
        return {
            pivot: pivot,
            r1: (2 * pivot) - parseFloat(low),
            r2: pivot + (parseFloat(high) - parseFloat(low)),
            s1: (2 * pivot) - parseFloat(high),
            s2: pivot - (parseFloat(high) - parseFloat(low))
        };
    }

    updateIndicatorDisplays(indicators) {
        // Update EMA values
        if (indicators.ema9) {
            this.updateElement('ema9', indicators.ema9[indicators.ema9.length - 1]?.toFixed(2) || '-');
        }
        if (indicators.ema21) {
            this.updateElement('ema21', indicators.ema21[indicators.ema21.length - 1]?.toFixed(2) || '-');
        }
        if (indicators.ema55) {
            this.updateElement('ema55', indicators.ema55[indicators.ema55.length - 1]?.toFixed(2) || '-');
        }
        
        // Update RSI
        if (indicators.rsi !== null) {
            this.updateElement('rsi', indicators.rsi.toFixed(1));
        }
        
        // Update MACD
        if (indicators.macd) {
            this.updateElement('macd', indicators.macd.macd?.toFixed(4) || '-');
        }
        
        // Update Supertrend
        if (indicators.supertrend) {
            const element = document.getElementById('supertrend');
            if (element) {
                element.textContent = indicators.supertrend.value.toFixed(2);
                element.style.color = indicators.supertrend.direction === 'bullish' ? 
                    'var(--success)' : 'var(--danger)';
            }
        }
    }

    updateIndicatorSeries(indicators, candles) {
        if (!this.indicatorSeries) return;
        
        try {
            // Update EMA series
            if (indicators.ema9 && this.indicatorSeries.ema9) {
                const ema9Data = indicators.ema9.map((value, index) => ({
                    time: typeof candles[index].time === 'number' ? candles[index].time / 1000 : candles[index].time,
                    value: value
                })).filter(item => item.value !== undefined);
                
                this.indicatorSeries.ema9.setData(ema9Data);
            }
            
            if (indicators.ema21 && this.indicatorSeries.ema21) {
                const ema21Data = indicators.ema21.map((value, index) => ({
                    time: typeof candles[index].time === 'number' ? candles[index].time / 1000 : candles[index].time,
                    value: value
                })).filter(item => item.value !== undefined);
                
                this.indicatorSeries.ema21.setData(ema21Data);
            }
            
            if (indicators.ema55 && this.indicatorSeries.ema55) {
                const ema55Data = indicators.ema55.map((value, index) => ({
                    time: typeof candles[index].time === 'number' ? candles[index].time / 1000 : candles[index].time,
                    value: value
                })).filter(item => item.value !== undefined);
                
                this.indicatorSeries.ema55.setData(ema55Data);
            }
            
            // Update support/resistance from pivot points
            if (indicators.pivotPoints && this.indicatorSeries.support && this.indicatorSeries.resistance) {
                const lastTime = typeof candles[candles.length - 1].time === 'number' ? 
                    candles[candles.length - 1].time / 1000 : candles[candles.length - 1].time;
                
                this.indicatorSeries.support.setData([
                    { time: lastTime, value: indicators.pivotPoints.s1 }
                ]);
                
                this.indicatorSeries.resistance.setData([
                    { time: lastTime, value: indicators.pivotPoints.r1 }
                ]);
            }
            
        } catch (error) {
            console.error('❌ Failed to update indicator series:', error);
        }
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.textContent = connected ? 
                this.translations[this.settings.language].connected : 
                this.translations[this.settings.language].disconnected;
            statusElement.className = connected ? 'value status-connected' : 'value status-disconnected';
        }
    }

    updateSymbolDisplay(symbol) {
        this.updateElement('currentSymbol', symbol || '-');
    }

    updatePriceDisplay(price) {
        if (price) {
            this.updateElement('currentPrice', '₹' + parseFloat(price).toFixed(2));
        }
    }

    updateCurrentSignal(prediction) {
        if (!prediction) return;
        
        // Update signal type
        const signalTypeElement = document.getElementById('signalType');
        if (signalTypeElement) {
            signalTypeElement.textContent = prediction.direction === 'bullish' ? 'BUY' : 'SELL';
            signalTypeElement.className = `signal-type ${prediction.direction}`;
        }
        
        // Update confidence bars
        this.updateConfidenceBars(prediction.confidence);
        
        // Update signal details
        this.updateElement('entryPrice', '₹' + (prediction.entryPrice || 0).toFixed(2));
        this.updateElement('exitPrice', '₹' + (prediction.exitPrice || 0).toFixed(2));
        this.updateElement('signalTime', new Date(prediction.timestamp).toLocaleTimeString());
        
        // Add highlight animation
        const signalCard = document.getElementById('currentSignal');
        if (signalCard) {
            signalCard.classList.add('signal-highlight');
            setTimeout(() => signalCard.classList.remove('signal-highlight'), 500);
        }
    }

    updateConfidenceBars(confidence) {
        const bars = document.querySelectorAll('#signalConfidence .bar');
        const activeBars = Math.ceil((confidence / 100) * bars.length);
        
        bars.forEach((bar, index) => {
            if (index < activeBars) {
                bar.classList.add('active');
            } else {
                bar.classList.remove('active');
            }
        });
    }

    updatePredictionsDisplay() {
        const predictionsList = document.getElementById('predictionsList');
        if (!predictionsList) return;
        
        predictionsList.innerHTML = '';
        
        if (this.predictions.length === 0) {
            predictionsList.innerHTML = '<div class="prediction-item"><div class="prediction-time">No predictions yet...</div></div>';
            return;
        }
        
        this.predictions.slice(0, 5).forEach(prediction => {
            const item = document.createElement('div');
            item.className = 'prediction-item';
            
            const time = new Date(prediction.timestamp).toLocaleTimeString();
            const direction = prediction.direction === 'bullish' ? '📈 BUY' : '📉 SELL';
            const confidence = prediction.confidence + '%';
            
            item.innerHTML = `
                <div class="prediction-time">${time}</div>
                <div class="prediction-signal ${prediction.direction}">${direction} (${confidence})</div>
            `;
            
            predictionsList.appendChild(item);
        });
    }

    updateAccuracyDisplay(accuracy) {
        this.updateElement('accuracy', accuracy);
    }

    updateSignalCountDisplay(count) {
        this.updateElement('signalCount', count);
    }

    showPredictionOnChart(prediction) {
        if (!this.chart || !prediction) return;
        
        try {
            // Add prediction marker to chart
            const marker = {
                time: prediction.timestamp / 1000,
                position: 'aboveBar',
                color: prediction.direction === 'bullish' ? '#26a69a' : '#ef5350',
                shape: prediction.direction === 'bullish' ? 'arrowUp' : 'arrowDown',
                text: `${prediction.direction.toUpperCase()} ${prediction.confidence}%`
            };
            
            this.candleSeries.setMarkers([marker]);
            
        } catch (error) {
            console.error('❌ Failed to show prediction on chart:', error);
        }
    }

    playNotificationSound() {
        if (!this.settings.soundEnabled) return;
        
        try {
            // Create audio context for notification sound
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
            
        } catch (error) {
            console.error('❌ Failed to play notification sound:', error);
        }
    }

    hideChartLoader() {
        const loader = document.getElementById('chartLoader');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    showChartError(message) {
        const chartContainer = document.getElementById('tradingview-chart');
        if (chartContainer) {
            chartContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-secondary); font-size: 14px;">
                    <div>⚠️ ${message}</div>
                </div>
            `;
        }
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    getConnectionStatus() {
        return this.chartData && this.chartData.connected;
    }

    // Cleanup when popup closes
    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        if (this.port) {
            this.port.disconnect();
        }
        
        if (this.chart) {
            this.chart.remove();
        }
    }
}

// Initialize popup when DOM is ready
let deltaBabaSniperPopup = null;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePopup);
} else {
    initializePopup();
}

function initializePopup() {
    try {
        deltaBabaSniperPopup = new DeltaBabaSniperPopup();
    } catch (error) {
        console.error('❌ Failed to initialize popup:', error);
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (deltaBabaSniperPopup) {
        deltaBabaSniperPopup.cleanup();
    }
});