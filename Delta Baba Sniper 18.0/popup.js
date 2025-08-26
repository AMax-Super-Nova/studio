/**
 * Delta Baba Sniper 18.0 - Main Popup Logic
 * Advanced trading scanner with real-time technical analysis
 */

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
        
        this.isScanning = false;
        this.currentData = [];
        this.currentCoin = '';
        this.currentTimeframe = '5m';
        this.language = 'en';
        this.theme = 'light';
        
        this.init();
    }

    async init() {
        try {
            await this.initializeChart();
            this.setupEventListeners();
            this.loadSettings();
            this.initializeIndicators();
            this.startDataSync();
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize extension');
        }
    }

    async initializeChart() {
        const chartContainer = document.getElementById('chart');
        
        // Create chart with TradingView Lightweight Charts
        this.chart = LightweightCharts.createChart(chartContainer, {
            width: chartContainer.clientWidth,
            height: 200,
            layout: {
                background: { color: this.theme === 'dark' ? '#1e293b' : '#ffffff' },
                textColor: this.theme === 'dark' ? '#f8fafc' : '#1e293b',
            },
            grid: {
                vertLines: { color: this.theme === 'dark' ? '#334155' : '#e2e8f0' },
                horzLines: { color: this.theme === 'dark' ? '#334155' : '#e2e8f0' },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
            },
            rightPriceScale: {
                borderColor: this.theme === 'dark' ? '#334155' : '#e2e8f0',
            },
            timeScale: {
                borderColor: this.theme === 'dark' ? '#334155' : '#e2e8f0',
                timeVisible: true,
                secondsVisible: false,
            },
        });

        // Create candlestick series
        this.candlestickSeries = this.chart.addCandlestickSeries({
            upColor: '#059669',
            downColor: '#dc2626',
            borderDownColor: '#dc2626',
            borderUpColor: '#059669',
            wickDownColor: '#dc2626',
            wickUpColor: '#059669',
        });

        // Create EMA series
        this.ema9Series = this.chart.addLineSeries({
            color: '#3b82f6',
            lineWidth: 1,
            title: 'EMA 9',
        });

        this.ema21Series = this.chart.addLineSeries({
            color: '#f59e0b',
            lineWidth: 1,
            title: 'EMA 21',
        });

        this.ema55Series = this.chart.addLineSeries({
            color: '#8b5cf6',
            lineWidth: 1,
            title: 'EMA 55',
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.chart.applyOptions({
                width: chartContainer.clientWidth,
            });
        });
    }

    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Language toggle
        document.getElementById('languageToggle').addEventListener('click', () => {
            this.toggleLanguage();
        });

        // Timeframe selector
        document.getElementById('timeframe').addEventListener('change', (e) => {
            this.currentTimeframe = e.target.value;
            this.updateTimeframe();
        });

        // Control buttons
        document.getElementById('startScanning').addEventListener('click', () => {
            this.startScanning();
        });

        document.getElementById('stopScanning').addEventListener('click', () => {
            this.stopScanning();
        });

        document.getElementById('refreshData').addEventListener('click', () => {
            this.refreshData();
        });

        // Indicators toggle
        document.getElementById('toggleIndicators').addEventListener('click', () => {
            this.toggleIndicatorsPanel();
        });
    }

    loadSettings() {
        chrome.storage.sync.get(['theme', 'language'], (result) => {
            if (result.theme) {
                this.theme = result.theme;
                this.applyTheme();
            }
            if (result.language) {
                this.language = result.language;
                this.applyLanguage();
            }
        });
    }

    applyTheme() {
        document.body.setAttribute('data-theme', this.theme);
        const themeIcon = document.getElementById('themeIcon');
        themeIcon.textContent = this.theme === 'dark' ? '☀️' : '🌙';
        
        // Update chart theme
        if (this.chart) {
            this.chart.applyOptions({
                layout: {
                    background: { color: this.theme === 'dark' ? '#1e293b' : '#ffffff' },
                    textColor: this.theme === 'dark' ? '#f8fafc' : '#1e293b',
                },
                grid: {
                    vertLines: { color: this.theme === 'dark' ? '#334155' : '#e2e8f0' },
                    horzLines: { color: this.theme === 'dark' ? '#334155' : '#e2e8f0' },
                },
                rightPriceScale: {
                    borderColor: this.theme === 'dark' ? '#334155' : '#e2e8f0',
                },
                timeScale: {
                    borderColor: this.theme === 'dark' ? '#334155' : '#e2e8f0',
                },
            });
        }
    }

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        chrome.storage.sync.set({ theme: this.theme });
    }

    toggleLanguage() {
        this.language = this.language === 'en' ? 'hi' : 'en';
        this.applyLanguage();
        chrome.storage.sync.set({ language: this.language });
    }

    applyLanguage() {
        const langBtn = document.getElementById('languageToggle');
        if (this.language === 'hi') {
            langBtn.textContent = '🇺🇸 English';
            this.translateToHindi();
        } else {
            langBtn.textContent = '🇮🇳 हिंदी';
            this.translateToEnglish();
        }
    }

    translateToHindi() {
        // Hindi translations
        const translations = {
            'Start Scanning': 'स्कैनिंग शुरू करें',
            'Stop Scanning': 'स्कैनिंग रोकें',
            'Refresh Data': 'डेटा रिफ्रेश करें',
            'Live Signals': 'लाइव सिग्नल',
            'Technical Indicators': 'तकनीकी संकेतक',
            'Scanning...': 'स्कैन कर रहा है...',
            'Coin:': 'कॉइन:',
            'Price:': 'मूल्य:',
            'Timeframe:': 'समय सीमा:',
            'Signal:': 'संकेत:',
            'Confidence:': 'विश्वास:',
            'Entry Price:': 'प्रवेश मूल्य:',
            'Signal Time:': 'संकेत समय:'
        };

        Object.keys(translations).forEach(key => {
            const elements = document.querySelectorAll(`*:contains("${key}")`);
            elements.forEach(el => {
                if (el.textContent === key) {
                    el.textContent = translations[key];
                }
            });
        });
    }

    translateToEnglish() {
        // Reset to English (reload page content)
        location.reload();
    }

    async startDataSync() {
        try {
            // Get current tab to inject content script
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab.url && tab.url.includes('delta.exchange')) {
                // Inject content script to get current coin data
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    function: this.extractCoinData,
                });
            }
        } catch (error) {
            console.error('Data sync error:', error);
        }
    }

    extractCoinData() {
        // This function runs in the context of the Delta Exchange page
        try {
            // Extract coin name from page
            const coinElement = document.querySelector('[data-testid="symbol-name"], .symbol-name, h1');
            const coinName = coinElement ? coinElement.textContent.trim() : 'Unknown';
            
            // Extract current price
            const priceElement = document.querySelector('[data-testid="price"], .price, .current-price');
            const currentPrice = priceElement ? priceElement.textContent.trim() : '₹0.00';
            
            // Send data back to extension
            chrome.runtime.sendMessage({
                type: 'COIN_DATA',
                data: { coinName, currentPrice }
            });
            
            return { coinName, currentPrice };
        } catch (error) {
            console.error('Error extracting coin data:', error);
            return { coinName: 'Error', currentPrice: '₹0.00' };
        }
    }

    async startScanning() {
        if (this.isScanning) return;
        
        this.isScanning = true;
        document.getElementById('startScanning').disabled = true;
        document.getElementById('stopScanning').disabled = false;
        
        this.updateStatus('Scanning...', 'scanning');
        
        // Start real-time data polling
        this.scanningInterval = setInterval(() => {
            this.performTechnicalAnalysis();
        }, 5000); // Scan every 5 seconds
        
        this.showSuccess('Scanning started successfully');
    }

    stopScanning() {
        if (!this.isScanning) return;
        
        this.isScanning = false;
        document.getElementById('startScanning').disabled = false;
        document.getElementById('stopScanning').disabled = true;
        
        if (this.scanningInterval) {
            clearInterval(this.scanningInterval);
        }
        
        this.updateStatus('Stopped', 'stopped');
        this.showInfo('Scanning stopped');
    }

    async performTechnicalAnalysis() {
        try {
            // Simulate real-time data (replace with actual Delta Exchange API calls)
            const mockData = this.generateMockData();
            this.currentData = mockData;
            
            // Calculate technical indicators
            const indicators = this.calculateIndicators(mockData);
            
            // Generate trading signals
            const signals = this.generateSignals(indicators, mockData);
            
            // Update UI
            this.updateIndicators(indicators);
            this.updateSignals(signals);
            this.updateChart(mockData, indicators);
            
        } catch (error) {
            console.error('Technical analysis error:', error);
            this.showError('Analysis failed');
        }
    }

    generateMockData() {
        // Generate realistic candlestick data for demonstration
        const data = [];
        const now = Date.now();
        const basePrice = 50000; // Base price in INR
        
        for (let i = 100; i >= 0; i--) {
            const time = now - (i * 5 * 60 * 1000); // 5-minute intervals
            const open = basePrice + (Math.random() - 0.5) * 1000;
            const high = open + Math.random() * 500;
            const low = open - Math.random() * 500;
            const close = open + (Math.random() - 0.5) * 200;
            const volume = Math.floor(Math.random() * 1000000) + 100000;
            
            data.push({
                time: Math.floor(time / 1000),
                open: parseFloat(open.toFixed(2)),
                high: parseFloat(high.toFixed(2)),
                low: parseFloat(low.toFixed(2)),
                close: parseFloat(close.toFixed(2)),
                volume: volume
            });
        }
        
        return data;
    }

    calculateIndicators(data) {
        const indicators = {};
        
        // Calculate EMAs
        indicators.ema9 = this.calculateEMA(data, 9);
        indicators.ema21 = this.calculateEMA(data, 21);
        indicators.ema55 = this.calculateEMA(data, 55);
        
        // Calculate RSI
        indicators.rsi = this.calculateRSI(data, 14);
        
        // Calculate MACD
        indicators.macd = this.calculateMACD(data);
        
        // Calculate Supertrend
        indicators.supertrend = this.calculateSupertrend(data);
        
        return indicators;
    }

    calculateEMA(data, period) {
        const multiplier = 2 / (period + 1);
        let ema = data[0].close;
        
        for (let i = 1; i < data.length; i++) {
            ema = (data[i].close * multiplier) + (ema * (1 - multiplier));
        }
        
        return parseFloat(ema.toFixed(2));
    }

    calculateRSI(data, period) {
        let gains = 0;
        let losses = 0;
        
        for (let i = 1; i <= period; i++) {
            const change = data[i].close - data[i - 1].close;
            if (change > 0) {
                gains += change;
            } else {
                losses -= change;
            }
        }
        
        const avgGain = gains / period;
        const avgLoss = losses / period;
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        
        return parseFloat(rsi.toFixed(2));
    }

    calculateMACD(data) {
        const ema12 = this.calculateEMA(data, 12);
        const ema26 = this.calculateEMA(data, 26);
        const macd = ema12 - ema26;
        const signal = this.calculateEMA([...data.slice(-9).map(d => ({ close: d.close }))], 9);
        const histogram = macd - signal;
        
        return {
            macd: parseFloat(macd.toFixed(2)),
            signal: parseFloat(signal.toFixed(2)),
            histogram: parseFloat(histogram.toFixed(2))
        };
    }

    calculateSupertrend(data) {
        // Simplified Supertrend calculation
        const atr = this.calculateATR(data, 10);
        const multiplier = 3;
        const upperBand = data[data.length - 1].high + (multiplier * atr);
        const lowerBand = data[data.length - 1].low - (multiplier * atr);
        
        const currentPrice = data[data.length - 1].close;
        const trend = currentPrice > upperBand ? 'bullish' : 'bearish';
        
        return {
            trend: trend,
            upperBand: parseFloat(upperBand.toFixed(2)),
            lowerBand: parseFloat(lowerBand.toFixed(2)),
            atr: parseFloat(atr.toFixed(2))
        };
    }

    calculateATR(data, period) {
        let trSum = 0;
        
        for (let i = 1; i <= period; i++) {
            const high = data[i].high;
            const low = data[i].low;
            const prevClose = data[i - 1].close;
            
            const tr1 = high - low;
            const tr2 = Math.abs(high - prevClose);
            const tr3 = Math.abs(low - prevClose);
            
            trSum += Math.max(tr1, tr2, tr3);
        }
        
        return trSum / period;
    }

    generateSignals(indicators, data) {
        const signals = {
            type: 'neutral',
            confidence: 0,
            entryPrice: 0,
            signalTime: new Date().toLocaleTimeString(),
            reasoning: []
        };
        
        let bullishSignals = 0;
        let bearishSignals = 0;
        
        // EMA Crossover Analysis
        if (indicators.ema9 > indicators.ema21 && indicators.ema21 > indicators.ema55) {
            bullishSignals += 2;
            signals.reasoning.push('EMA 9 > EMA 21 > EMA 55 (Bullish alignment)');
        } else if (indicators.ema9 < indicators.ema21 && indicators.ema21 < indicators.ema55) {
            bearishSignals += 2;
            signals.reasoning.push('EMA 9 < EMA 21 < EMA 55 (Bearish alignment)');
        }
        
        // RSI Analysis
        if (indicators.rsi < 30) {
            bullishSignals += 1;
            signals.reasoning.push('RSI oversold (< 30)');
        } else if (indicators.rsi > 70) {
            bearishSignals += 1;
            signals.reasoning.push('RSI overbought (> 70)');
        }
        
        // MACD Analysis
        if (indicators.macd.histogram > 0 && indicators.macd.macd > indicators.macd.signal) {
            bullishSignals += 1;
            signals.reasoning.push('MACD bullish crossover');
        } else if (indicators.macd.histogram < 0 && indicators.macd.macd < indicators.macd.signal) {
            bearishSignals += 1;
            signals.reasoning.push('MACD bearish crossover');
        }
        
        // Supertrend Analysis
        if (indicators.supertrend.trend === 'bullish') {
            bullishSignals += 1;
            signals.reasoning.push('Supertrend bullish');
        } else {
            bearishSignals += 1;
            signals.reasoning.push('Supertrend bearish');
        }
        
        // Determine final signal
        if (bullishSignals > bearishSignals && bullishSignals >= 3) {
            signals.type = 'buy';
            signals.confidence = Math.min(bullishSignals, 5);
        } else if (bearishSignals > bullishSignals && bearishSignals >= 3) {
            signals.type = 'sell';
            signals.confidence = Math.min(bearishSignals, 5);
        }
        
        signals.entryPrice = data[data.length - 1].close;
        
        return signals;
    }

    updateIndicators(indicators) {
        document.getElementById('ema9').textContent = indicators.ema9;
        document.getElementById('ema21').textContent = indicators.ema21;
        document.getElementById('ema55').textContent = indicators.ema55;
        document.getElementById('rsi').textContent = indicators.rsi;
        document.getElementById('macd').textContent = `${indicators.macd.macd} (${indicators.macd.histogram > 0 ? '+' : ''}${indicators.macd.histogram})`;
        document.getElementById('supertrend').textContent = `${indicators.supertrend.trend} (${indicators.supertrend.upperBand})`;
    }

    updateSignals(signals) {
        const signalType = document.getElementById('signalType');
        const entryPrice = document.getElementById('entryPrice');
        const signalTime = document.getElementById('signalTime');
        const confidenceBars = document.querySelectorAll('.confidence-bars .bar');
        
        // Update signal type
        signalType.textContent = signals.type.toUpperCase();
        signalType.className = `signal-value signal-${signals.type}`;
        
        // Update entry price
        entryPrice.textContent = `₹${signals.entryPrice}`;
        
        // Update signal time
        signalTime.textContent = signals.signalTime;
        
        // Update confidence bars
        confidenceBars.forEach((bar, index) => {
            bar.classList.toggle('active', index < signals.confidence);
        });
        
        // Update status
        if (signals.type !== 'neutral') {
            this.updateStatus(`${signals.type.toUpperCase()} Signal Generated`, 'signal');
            this.playAlert();
        }
    }

    updateChart(data, indicators) {
        // Update candlestick data
        this.candlestickSeries.setData(data);
        
        // Update EMA lines
        const emaData = data.map((candle, index) => ({
            time: candle.time,
            value: this.calculateEMA(data.slice(0, index + 1), 9)
        }));
        this.ema9Series.setData(emaData);
        
        // Fit chart to content
        this.chart.timeScale().fitContent();
    }

    updateStatus(text, type) {
        const statusText = document.querySelector('.status-text');
        const statusIndicator = document.querySelector('.status-indicator');
        
        statusText.textContent = text;
        
        // Update indicator color based on status type
        statusIndicator.className = 'status-indicator';
        statusIndicator.classList.add(`status-${type}`);
    }

    toggleIndicatorsPanel() {
        const content = document.getElementById('indicatorsContent');
        const toggleBtn = document.getElementById('toggleIndicators');
        
        if (content.style.display === 'none') {
            content.style.display = 'grid';
            toggleBtn.textContent = 'Hide';
        } else {
            content.style.display = 'none';
            toggleBtn.textContent = 'Show';
        }
    }

    updateTimeframe() {
        this.refreshData();
    }

    async refreshData() {
        try {
            this.updateStatus('Refreshing data...', 'loading');
            await this.performTechnicalAnalysis();
            this.updateStatus('Data refreshed', 'success');
        } catch (error) {
            console.error('Data refresh error:', error);
            this.updateStatus('Refresh failed', 'error');
        }
    }

    playAlert() {
        // Play alert sound for signal generation
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
            audio.play();
        } catch (error) {
            console.log('Audio alert not supported');
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} fade-in`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize extension when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DeltaBabaSniper();
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'COIN_DATA') {
        // Update coin information
        document.getElementById('coinName').textContent = message.data.coinName;
        document.getElementById('currentPrice').textContent = message.data.currentPrice;
    }
});