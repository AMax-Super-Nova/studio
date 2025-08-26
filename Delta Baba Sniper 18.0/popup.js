// Delta Baba Sniper 18.0 - Main Popup Logic
// Handles UI interactions, chart rendering, and signal generation

class DeltaBabaSniper {
    constructor() {
        this.chart = null;
        this.candlestickSeries = null;
        this.ema9Series = null;
        this.ema21Series = null;
        this.ema55Series = null;
        this.rsiSeries = null;
        this.macdSeries = null;
        this.supertrendSeries = null;
        
        this.currentData = [];
        this.currentSymbol = '';
        this.currentTimeframe = '5m';
        this.isConnected = false;
        this.lastUpdate = null;
        
        this.settings = {
            soundAlerts: true,
            language: 'en',
            predictionTime: 5
        };
        
        this.init();
    }

    async init() {
        try {
            await this.loadSettings();
            this.setupEventListeners();
            this.initializeChart();
            this.loadTranslations();
            this.startDataPolling();
            this.updateUI();
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize extension');
        }
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['settings']);
            if (result.settings) {
                this.settings = { ...this.settings, ...result.settings };
            }
            this.applySettings();
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.sync.set({ settings: this.settings });
        } catch (error) {
            console.error('Failed to save settings:', error);
        }
    }

    applySettings() {
        // Apply language
        document.documentElement.lang = this.settings.language;
        
        // Apply sound alerts
        document.getElementById('soundAlerts').checked = this.settings.soundAlerts;
        
        // Apply language dropdown
        document.getElementById('language').value = this.settings.language;
        
        // Apply prediction time
        document.getElementById('predictionTime').value = this.settings.predictionTime;
        
        // Apply theme
        const currentTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        this.updateThemeIcon(currentTheme);
    }

    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Timeframe selector
        document.getElementById('timeframe').addEventListener('change', (e) => {
            this.currentTimeframe = e.target.value;
            this.onTimeframeChange();
        });

        // Settings
        document.getElementById('soundAlerts').addEventListener('change', (e) => {
            this.settings.soundAlerts = e.target.checked;
            this.saveSettings();
        });

        document.getElementById('language').addEventListener('change', (e) => {
            this.settings.language = e.target.value;
            this.saveSettings();
            this.loadTranslations();
        });

        document.getElementById('predictionTime').addEventListener('change', (e) => {
            this.settings.predictionTime = parseInt(e.target.value);
            this.saveSettings();
        });

        // Refresh indicators
        document.getElementById('refreshIndicators').addEventListener('click', () => {
            this.refreshIndicators();
        });
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeIcon(newTheme);
        
        // Refresh chart with new theme
        if (this.chart) {
            this.chart.applyOptions({
                layout: {
                    background: { color: newTheme === 'dark' ? '#0f172a' : '#ffffff' },
                    textColor: newTheme === 'dark' ? '#f8fafc' : '#1e293b'
                },
                grid: {
                    vertLines: { color: newTheme === 'dark' ? '#334155' : '#e2e8f0' },
                    horzLines: { color: newTheme === 'dark' ? '#334155' : '#e2e8f0' }
                }
            });
        }
    }

    updateThemeIcon(theme) {
        const themeIcon = document.querySelector('.theme-icon');
        themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }

    initializeChart() {
        const chartContainer = document.getElementById('chart');
        
        this.chart = LightweightCharts.createChart(chartContainer, {
            width: chartContainer.clientWidth,
            height: chartContainer.clientHeight,
            layout: {
                background: { color: getComputedStyle(document.documentElement).getPropertyValue('--chart-bg') },
                textColor: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
            },
            grid: {
                vertLines: { color: getComputedStyle(document.documentElement).getPropertyValue('--grid-color') },
                horzLines: { color: getComputedStyle(document.documentElement).getPropertyValue('--grid-color') }
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal
            },
            rightPriceScale: {
                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--border-color')
            },
            timeScale: {
                borderColor: getComputedStyle(document.documentElement).getPropertyValue('--border-color'),
                timeVisible: true,
                secondsVisible: false
            }
        });

        // Create series
        this.candlestickSeries = this.chart.addCandlestickSeries({
            upColor: '#10b981',
            downColor: '#ef4444',
            borderDownColor: '#ef4444',
            borderUpColor: '#10b981',
            wickDownColor: '#ef4444',
            wickUpColor: '#10b981'
        });

        this.ema9Series = this.chart.addLineSeries({
            color: '#f59e0b',
            lineWidth: 2,
            title: 'EMA 9'
        });

        this.ema21Series = this.chart.addLineSeries({
            color: '#2563eb',
            lineWidth: 2,
            title: 'EMA 21'
        });

        this.ema55Series = this.chart.addLineSeries({
            color: '#8b5cf6',
            lineWidth: 2,
            title: 'EMA 55'
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.chart.applyOptions({
                width: chartContainer.clientWidth,
                height: chartContainer.clientHeight
            });
        });
    }

    async startDataPolling() {
        // Start polling for data
        this.pollData();
        setInterval(() => this.pollData(), 5000); // Poll every 5 seconds
    }

    async pollData() {
        try {
            // Get current tab to check if we're on Delta Exchange
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab.url && tab.url.includes('delta.exchange')) {
                // Inject content script to get data
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: this.extractChartData
                });
                
                // Listen for response from content script
                chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                    if (message.type === 'CHART_DATA') {
                        this.processChartData(message.data);
                    }
                });
            } else {
                this.updateConnectionStatus(false);
                this.showError('Please navigate to Delta Exchange to use this extension');
            }
        } catch (error) {
            console.error('Data polling error:', error);
            this.updateConnectionStatus(false);
        }
    }

    extractChartData() {
        // This function will be injected into the Delta Exchange page
        try {
            // Extract chart data from the page
            const chartData = {
                symbol: '',
                price: 0,
                change: 0,
                timeframe: '',
                candles: []
            };

            // Try to extract symbol from various page elements
            const symbolElements = document.querySelectorAll('[data-symbol], .symbol, .pair-name');
            if (symbolElements.length > 0) {
                chartData.symbol = symbolElements[0].textContent.trim();
            }

            // Try to extract price
            const priceElements = document.querySelectorAll('.price, .current-price, [data-price]');
            if (priceElements.length > 0) {
                const priceText = priceElements[0].textContent.trim();
                chartData.price = parseFloat(priceText.replace(/[^\d.-]/g, ''));
            }

            // Try to extract change percentage
            const changeElements = document.querySelectorAll('.change, .change-percent, [data-change]');
            if (changeElements.length > 0) {
                const changeText = changeElements[0].textContent.trim();
                chartData.change = parseFloat(changeText.replace(/[^\d.-]/g, ''));
            }

            // Send data back to popup
            chrome.runtime.sendMessage({
                type: 'CHART_DATA',
                data: chartData
            });

        } catch (error) {
            console.error('Error extracting chart data:', error);
        }
    }

    processChartData(data) {
        if (data && data.symbol) {
            this.currentSymbol = data.symbol;
            this.updateCoinInfo(data);
            this.updateConnectionStatus(true);
            this.lastUpdate = new Date();
            this.updateLastUpdate();
            
            // Generate sample data for demonstration
            this.generateSampleData();
            this.updateChart();
            this.calculateIndicators();
            this.generateSignals();
        }
    }

    generateSampleData() {
        // Generate sample candlestick data for demonstration
        const now = Math.floor(Date.now() / 1000);
        const basePrice = 50000; // Base price for demonstration
        
        this.currentData = [];
        for (let i = 100; i >= 0; i--) {
            const time = now - (i * 60); // 1 minute intervals
            const open = basePrice + (Math.random() - 0.5) * 1000;
            const high = open + Math.random() * 500;
            const low = open - Math.random() * 500;
            const close = open + (Math.random() - 0.5) * 200;
            
            this.currentData.push({
                time: time,
                open: open,
                high: high,
                low: low,
                close: close
            });
        }
    }

    updateChart() {
        if (this.currentData.length > 0) {
            this.candlestickSeries.setData(this.currentData);
            
            // Update EMAs
            const ema9Data = this.calculateEMA(this.currentData, 9);
            const ema21Data = this.calculateEMA(this.currentData, 21);
            const ema55Data = this.calculateEMA(this.currentData, 55);
            
            this.ema9Series.setData(ema9Data);
            this.ema21Series.setData(ema21Data);
            this.ema55Series.setData(ema55Data);
        }
    }

    calculateEMA(data, period) {
        const emaData = [];
        let ema = data[0].close;
        const multiplier = 2 / (period + 1);
        
        for (let i = 0; i < data.length; i++) {
            ema = (data[i].close * multiplier) + (ema * (1 - multiplier));
            emaData.push({
                time: data[i].time,
                value: ema
            });
        }
        
        return emaData;
    }

    calculateIndicators() {
        if (this.currentData.length === 0) return;
        
        const latest = this.currentData[this.currentData.length - 1];
        const previous = this.currentData[this.currentData.length - 2];
        
        // Calculate RSI
        const rsi = this.calculateRSI(this.currentData, 14);
        
        // Calculate MACD
        const macd = this.calculateMACD(this.currentData);
        
        // Calculate Supertrend
        const supertrend = this.calculateSupertrend(this.currentData);
        
        // Update indicator values in UI
        this.updateIndicatorValues({
            ema9: this.calculateEMA(this.currentData, 9).slice(-1)[0]?.value || 0,
            ema21: this.calculateEMA(this.currentData, 21).slice(-1)[0]?.value || 0,
            ema55: this.calculateEMA(this.currentData, 55).slice(-1)[0]?.value || 0,
            rsi: rsi,
            macd: macd,
            supertrend: supertrend
        });
    }

    calculateRSI(data, period) {
        if (data.length < period + 1) return 50;
        
        let gains = 0;
        let losses = 0;
        
        for (let i = 1; i <= period; i++) {
            const change = data[data.length - i].close - data[data.length - i - 1].close;
            if (change > 0) {
                gains += change;
            } else {
                losses += Math.abs(change);
            }
        }
        
        const avgGain = gains / period;
        const avgLoss = losses / period;
        
        if (avgLoss === 0) return 100;
        
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    calculateMACD(data) {
        if (data.length < 26) return 0;
        
        const ema12 = this.calculateEMA(data, 12);
        const ema26 = this.calculateEMA(data, 26);
        
        const macdLine = ema12[ema12.length - 1].value - ema26[ema26.length - 1].value;
        return macdLine;
    }

    calculateSupertrend(data) {
        if (data.length < 10) return 'NEUTRAL';
        
        const atr = this.calculateATR(data, 10);
        const latest = data[data.length - 1];
        
        // Simplified Supertrend calculation
        const upperBand = latest.high + (atr * 2);
        const lowerBand = latest.low - (atr * 2);
        
        if (latest.close > upperBand) return 'BULLISH';
        if (latest.close < lowerBand) return 'BEARISH';
        return 'NEUTRAL';
    }

    calculateATR(data, period) {
        if (data.length < period + 1) return 0;
        
        let atrSum = 0;
        for (let i = 1; i <= period; i++) {
            const high = data[data.length - i].high;
            const low = data[data.length - i].low;
            const prevClose = data[data.length - i - 1].close;
            
            const tr1 = high - low;
            const tr2 = Math.abs(high - prevClose);
            const tr3 = Math.abs(low - prevClose);
            
            atrSum += Math.max(tr1, tr2, tr3);
        }
        
        return atrSum / period;
    }

    updateIndicatorValues(values) {
        document.getElementById('ema9').textContent = values.ema9.toFixed(2);
        document.getElementById('ema21').textContent = values.ema21.toFixed(2);
        document.getElementById('ema55').textContent = values.ema55.toFixed(2);
        document.getElementById('rsi').textContent = values.rsi.toFixed(2);
        document.getElementById('macd').textContent = values.macd.toFixed(4);
        document.getElementById('supertrend').textContent = values.supertrend;
    }

    generateSignals() {
        if (this.currentData.length < 55) return;
        
        const latest = this.currentData[this.currentData.length - 1];
        const ema9 = this.calculateEMA(this.currentData, 9).slice(-1)[0]?.value || 0;
        const ema21 = this.calculateEMA(this.currentData, 21).slice(-1)[0]?.value || 0;
        const ema55 = this.calculateEMA(this.currentData, 55).slice(-1)[0]?.value || 0;
        const rsi = this.calculateRSI(this.currentData, 14);
        const macd = this.calculateMACD(this.currentData);
        const supertrend = this.calculateSupertrend(this.currentData);
        
        let signal = 'NO_SIGNAL';
        let confidence = 0;
        let signalType = '';
        
        // EMA Crossover Signal
        if (ema9 > ema21 && ema21 > ema55) {
            signal = 'BUY_ENTRY';
            signalType = 'Bullish Trend';
            confidence += 1;
        } else if (ema9 < ema21 && ema21 < ema55) {
            signal = 'SELL_ENTRY';
            signalType = 'Bearish Trend';
            confidence += 1;
        }
        
        // RSI Signal
        if (rsi < 30) {
            if (signal === 'BUY_ENTRY') confidence += 1;
        } else if (rsi > 70) {
            if (signal === 'SELL_ENTRY') confidence += 1;
        }
        
        // MACD Signal
        if (macd > 0 && signal === 'BUY_ENTRY') {
            confidence += 1;
        } else if (macd < 0 && signal === 'SELL_ENTRY') {
            confidence += 1;
        }
        
        // Supertrend Signal
        if (supertrend === 'BULLISH' && signal === 'BUY_ENTRY') {
            confidence += 1;
        } else if (supertrend === 'BEARISH' && signal === 'SELL_ENTRY') {
            confidence += 1;
        }
        
        // Update signal display
        this.updateSignalDisplay(signal, signalType, confidence);
        
        // Play sound alert if enabled
        if (this.settings.soundAlerts && signal !== 'NO_SIGNAL' && confidence >= 2) {
            this.playSoundAlert(signal);
        }
    }

    updateSignalDisplay(signal, signalType, confidence) {
        const signalItem = document.getElementById('currentSignal');
        const signalStatus = document.getElementById('signalStatus');
        
        if (signal === 'NO_SIGNAL') {
            signalItem.className = 'signal-item';
            signalItem.innerHTML = `
                <div class="signal-type">No Signal</div>
                <div class="signal-confidence">--</div>
                <div class="signal-time">--</div>
            `;
            signalStatus.textContent = 'Scanning...';
            signalStatus.className = 'signal-status scanning';
        } else {
            const signalClass = signal.includes('BUY') ? 'buy' : 'sell';
            const signalText = signal.includes('BUY') ? 'Buy Entry' : 'Sell Entry';
            
            signalItem.className = `signal-item ${signalClass}`;
            signalItem.innerHTML = `
                <div class="signal-type">${signalText}</div>
                <div class="signal-confidence">${this.renderConfidenceBars(confidence)}</div>
                <div class="signal-time">${this.formatTime(new Date())}</div>
            `;
            
            signalStatus.textContent = signalType;
            signalStatus.className = `signal-status ${signalClass}`;
        }
    }

    renderConfidenceBars(confidence) {
        let bars = '';
        for (let i = 0; i < 3; i++) {
            const activeClass = i < confidence ? 'active' : '';
            bars += `<div class="bar ${activeClass}"></div>`;
        }
        return bars;
    }

    formatTime(date) {
        return date.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    playSoundAlert(signal) {
        // Create audio context for sound alerts
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Different frequencies for buy/sell signals
            oscillator.frequency.setValueAtTime(signal.includes('BUY') ? 800 : 400, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            console.error('Sound alert failed:', error);
        }
    }

    updateCoinInfo(data) {
        if (data.symbol) {
            document.getElementById('coinName').textContent = data.symbol;
        }
        
        if (data.price) {
            document.getElementById('coinPrice').textContent = `₹${data.price.toLocaleString()}`;
        }
        
        if (data.change !== undefined) {
            const changeElement = document.getElementById('coinChange');
            changeElement.textContent = `${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)}%`;
            changeElement.className = `coin-change ${data.change < 0 ? 'negative' : ''}`;
        }
    }

    updateConnectionStatus(connected) {
        this.isConnected = connected;
        const statusElement = document.getElementById('connectionStatus');
        
        if (connected) {
            statusElement.innerHTML = '🟢 Connected';
            statusElement.className = 'connection-status';
        } else {
            statusElement.innerHTML = '🔴 Disconnected';
            statusElement.className = 'connection-status';
        }
    }

    updateLastUpdate() {
        if (this.lastUpdate) {
            const timeString = this.lastUpdate.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            document.getElementById('lastUpdate').textContent = `Last Update: ${timeString}`;
        }
    }

    onTimeframeChange() {
        // Handle timeframe change
        this.refreshIndicators();
    }

    refreshIndicators() {
        if (this.currentData.length > 0) {
            this.calculateIndicators();
            this.generateSignals();
        }
    }

    loadTranslations() {
        // Load language-specific translations
        const translations = {
            en: {
                'Live Signals': 'Live Signals',
                'Scanning...': 'Scanning...',
                'No Signal': 'No Signal',
                'Technical Indicators': 'Technical Indicators',
                'Settings': 'Settings',
                'Sound Alerts': 'Sound Alerts',
                'Language': 'Language',
                'Prediction Time (min)': 'Prediction Time (min)'
            },
            hi: {
                'Live Signals': 'लाइव सिग्नल',
                'Scanning...': 'स्कैनिंग...',
                'No Signal': 'कोई सिग्नल नहीं',
                'Technical Indicators': 'तकनीकी संकेतक',
                'Settings': 'सेटिंग्स',
                'Sound Alerts': 'ध्वनि अलर्ट',
                'Language': 'भाषा',
                'Prediction Time (min)': 'भविष्यवाणी समय (मिनट)'
            }
        };
        
        const currentLang = this.settings.language;
        const currentTranslations = translations[currentLang] || translations.en;
        
        // Apply translations
        Object.keys(currentTranslations).forEach(key => {
            const elements = document.querySelectorAll(`[data-translate="${key}"]`);
            elements.forEach(element => {
                element.textContent = currentTranslations[key];
            });
        });
    }

    updateUI() {
        // Update UI elements
        this.updateLastUpdate();
        
        // Apply current theme
        const currentTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        this.updateThemeIcon(currentTheme);
    }

    showError(message) {
        // Show error message to user
        console.error(message);
        // You can implement a toast notification here
    }
}

// Initialize the extension when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DeltaBabaSniper();
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CHART_DATA') {
        // Handle chart data from content script
        window.postMessage({
            type: 'CHART_DATA_RECEIVED',
            data: message.data
        }, '*');
    }
});