// Delta Baba Sniper 18.0 - Content Script
// Injected into Delta Exchange pages to extract chart data and trading information

class DeltaExchangeScanner {
    constructor() {
        this.isActive = false;
        this.currentSymbol = '';
        this.currentPrice = 0;
        this.currentChange = 0;
        this.currentTimeframe = '';
        this.chartData = [];
        this.lastUpdate = 0;
        
        this.init();
    }

    init() {
        // Wait for page to load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.startScanning());
        } else {
            this.startScanning();
        }
    }

    startScanning() {
        this.isActive = true;
        this.scanPage();
        
        // Set up continuous scanning
        setInterval(() => this.scanPage(), 2000); // Scan every 2 seconds
        
        // Listen for DOM changes
        this.observeDOMChanges();
        
        console.log('Delta Baba Sniper: Content script activated');
    }

    scanPage() {
        try {
            this.extractSymbol();
            this.extractPrice();
            this.extractChange();
            this.extractTimeframe();
            this.extractChartData();
            
            // Send data to popup if we have valid information
            if (this.currentSymbol && this.currentPrice > 0) {
                this.sendDataToPopup();
            }
        } catch (error) {
            console.error('Delta Baba Sniper: Error scanning page:', error);
        }
    }

    extractSymbol() {
        try {
            // Multiple selectors to find the trading pair symbol
            const selectors = [
                '[data-symbol]',
                '.symbol',
                '.pair-name',
                '.trading-pair',
                '.instrument-name',
                '[class*="symbol"]',
                '[class*="pair"]',
                '.header-symbol',
                '.chart-symbol'
            ];
            
            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    const text = element.textContent.trim();
                    if (text && text.length > 0 && text.length < 20) {
                        this.currentSymbol = text;
                        return;
                    }
                }
            }
            
            // Fallback: Look for common patterns in the page
            const pageText = document.body.textContent;
            const symbolPatterns = [
                /([A-Z]{3,5})\/([A-Z]{3,5})/g,  // BTC/USDT, ETH/USDT
                /([A-Z]{3,5})-([A-Z]{3,5})/g,  // BTC-USDT, ETH-USDT
                /([A-Z]{3,5})_([A-Z]{3,5})/g   // BTC_USDT, ETH_USDT
            ];
            
            for (const pattern of symbolPatterns) {
                const match = pageText.match(pattern);
                if (match) {
                    this.currentSymbol = match[0];
                    return;
                }
            }
        } catch (error) {
            console.error('Delta Baba Sniper: Error extracting symbol:', error);
        }
    }

    extractPrice() {
        try {
            // Multiple selectors to find the current price
            const selectors = [
                '.price',
                '.current-price',
                '.live-price',
                '.ticker-price',
                '[data-price]',
                '[class*="price"]',
                '.market-price',
                '.spot-price'
            ];
            
            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    const text = element.textContent.trim();
                    const price = this.parsePrice(text);
                    if (price > 0) {
                        this.currentPrice = price;
                        return;
                    }
                }
            }
            
            // Fallback: Look for price patterns in the page
            const pageText = document.body.textContent;
            const pricePatterns = [
                /₹\s*([\d,]+\.?\d*)/g,      // ₹ 50,000.00
                /\$\s*([\d,]+\.?\d*)/g,      // $ 50,000.00
                /([\d,]+\.?\d*)\s*₹/g,       // 50,000.00 ₹
                /([\d,]+\.?\d*)\s*\$/g       // 50,000.00 $
            ];
            
            for (const pattern of pricePatterns) {
                const match = pageText.match(pattern);
                if (match) {
                    const price = this.parsePrice(match[1]);
                    if (price > 0) {
                        this.currentPrice = price;
                        return;
                    }
                }
            }
        } catch (error) {
            console.error('Delta Baba Sniper: Error extracting price:', error);
        }
    }

    extractChange() {
        try {
            // Multiple selectors to find the price change
            const selectors = [
                '.change',
                '.change-percent',
                '.price-change',
                '.ticker-change',
                '[data-change]',
                '[class*="change"]',
                '.market-change',
                '.spot-change'
            ];
            
            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    const text = element.textContent.trim();
                    const change = this.parseChange(text);
                    if (change !== null) {
                        this.currentChange = change;
                        return;
                    }
                }
            }
            
            // Fallback: Look for change patterns
            const pageText = document.body.textContent;
            const changePatterns = [
                /([+-]?\d+\.?\d*)\s*%/g,     // +5.25%, -2.10%
                /([+-]?\d+\.?\d*)\s*percent/g, // +5.25 percent
                /([+-]?\d+\.?\d*)\s*per\s*cent/g // +5.25 per cent
            ];
            
            for (const pattern of changePatterns) {
                const match = pageText.match(pattern);
                if (match) {
                    const change = this.parseChange(match[1]);
                    if (change !== null) {
                        this.currentChange = change;
                        return;
                    }
                }
            }
        } catch (error) {
            console.error('Delta Baba Sniper: Error extracting change:', error);
        }
    }

    extractTimeframe() {
        try {
            // Look for timeframe indicators
            const selectors = [
                '.timeframe',
                '.interval',
                '.period',
                '[data-timeframe]',
                '[class*="timeframe"]',
                '[class*="interval"]'
            ];
            
            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    const text = element.textContent.trim().toLowerCase();
                    if (text.includes('1m') || text.includes('1 minute')) {
                        this.currentTimeframe = '1m';
                        return;
                    } else if (text.includes('5m') || text.includes('5 minute')) {
                        this.currentTimeframe = '5m';
                        return;
                    } else if (text.includes('15m') || text.includes('15 minute')) {
                        this.currentTimeframe = '15m';
                        return;
                    } else if (text.includes('1h') || text.includes('1 hour')) {
                        this.currentTimeframe = '1h';
                        return;
                    } else if (text.includes('4h') || text.includes('4 hour')) {
                        this.currentTimeframe = '4h';
                        return;
                    } else if (text.includes('1d') || text.includes('1 day')) {
                        this.currentTimeframe = '1d';
                        return;
                    }
                }
            }
            
            // Default timeframe
            this.currentTimeframe = '5m';
        } catch (error) {
            console.error('Delta Baba Sniper: Error extracting timeframe:', error);
        }
    }

    extractChartData() {
        try {
            // Try to extract candlestick data from chart elements
            const chartSelectors = [
                '.chart-container',
                '.trading-chart',
                '.candlestick-chart',
                '[class*="chart"]',
                '[id*="chart"]'
            ];
            
            for (const selector of chartSelectors) {
                const chartElement = document.querySelector(selector);
                if (chartElement) {
                    // Look for candlestick data in the chart
                    this.extractCandlestickData(chartElement);
                    break;
                }
            }
        } catch (error) {
            console.error('Delta Baba Sniper: Error extracting chart data:', error);
        }
    }

    extractCandlestickData(chartElement) {
        try {
            // Look for candlestick data in various formats
            const dataSelectors = [
                '[data-candles]',
                '[data-ohlc]',
                '[data-kline]',
                '.candlestick-data',
                '.ohlc-data'
            ];
            
            for (const selector of dataSelectors) {
                const dataElement = chartElement.querySelector(selector);
                if (dataElement) {
                    const dataText = dataElement.textContent || dataElement.getAttribute('data-candles');
                    if (dataText) {
                        this.parseCandlestickData(dataText);
                        return;
                    }
                }
            }
            
            // Look for data in script tags
            const scripts = chartElement.querySelectorAll('script');
            for (const script of scripts) {
                const scriptText = script.textContent;
                if (scriptText.includes('candlestick') || scriptText.includes('ohlc') || scriptText.includes('kline')) {
                    this.parseCandlestickData(scriptText);
                    return;
                }
            }
        } catch (error) {
            console.error('Delta Baba Sniper: Error extracting candlestick data:', error);
        }
    }

    parseCandlestickData(dataText) {
        try {
            // Try to parse JSON data
            if (dataText.includes('{') || dataText.includes('[')) {
                const jsonMatch = dataText.match(/\[.*\]|\{.*\}/);
                if (jsonMatch) {
                    const data = JSON.parse(jsonMatch[0]);
                    if (Array.isArray(data) && data.length > 0) {
                        this.chartData = this.formatCandlestickData(data);
                        return;
                    }
                }
            }
            
            // Try to parse CSV-like data
            const lines = dataText.split('\n');
            const candles = [];
            
            for (const line of lines) {
                const parts = line.split(/[,\s]+/);
                if (parts.length >= 4) {
                    const candle = this.parseCandlestickLine(parts);
                    if (candle) {
                        candles.push(candle);
                    }
                }
            }
            
            if (candles.length > 0) {
                this.chartData = candles;
            }
        } catch (error) {
            console.error('Delta Baba Sniper: Error parsing candlestick data:', error);
        }
    }

    parseCandlestickLine(parts) {
        try {
            // Try different formats: timestamp, open, high, low, close, volume
            const timestamp = this.parseTimestamp(parts[0]);
            const open = parseFloat(parts[1]);
            const high = parseFloat(parts[2]);
            const low = parseFloat(parts[3]);
            const close = parseFloat(parts[4]);
            
            if (timestamp && !isNaN(open) && !isNaN(high) && !isNaN(low) && !isNaN(close)) {
                return {
                    time: timestamp,
                    open: open,
                    high: high,
                    low: low,
                    close: close
                };
            }
        } catch (error) {
            // Skip invalid lines
        }
        return null;
    }

    parseTimestamp(timestampStr) {
        try {
            // Try different timestamp formats
            if (timestampStr.includes('-') || timestampStr.includes('/')) {
                // Date string format
                return Math.floor(new Date(timestampStr).getTime() / 1000);
            } else if (timestampStr.length === 10) {
                // Unix timestamp in seconds
                return parseInt(timestampStr);
            } else if (timestampStr.length === 13) {
                // Unix timestamp in milliseconds
                return Math.floor(parseInt(timestampStr) / 1000);
            }
        } catch (error) {
            // Invalid timestamp
        }
        return null;
    }

    formatCandlestickData(data) {
        try {
            const candles = [];
            
            for (const item of data) {
                if (item.time && item.open && item.high && item.low && item.close) {
                    candles.push({
                        time: typeof item.time === 'number' ? item.time : this.parseTimestamp(item.time),
                        open: parseFloat(item.open),
                        high: parseFloat(item.high),
                        low: parseFloat(item.low),
                        close: parseFloat(item.close)
                    });
                }
            }
            
            return candles.sort((a, b) => a.time - b.time);
        } catch (error) {
            console.error('Delta Baba Sniper: Error formatting candlestick data:', error);
            return [];
        }
    }

    parsePrice(priceText) {
        try {
            // Remove currency symbols and commas, then parse
            const cleanPrice = priceText.replace(/[₹$,]/g, '').trim();
            const price = parseFloat(cleanPrice);
            return isNaN(price) ? 0 : price;
        } catch (error) {
            return 0;
        }
    }

    parseChange(changeText) {
        try {
            // Remove % and other symbols, then parse
            const cleanChange = changeText.replace(/[%]/g, '').trim();
            const change = parseFloat(cleanChange);
            return isNaN(change) ? null : change;
        } catch (error) {
            return null;
        }
    }

    sendDataToPopup() {
        try {
            const data = {
                symbol: this.currentSymbol,
                price: this.currentPrice,
                change: this.currentChange,
                timeframe: this.currentTimeframe,
                chartData: this.chartData,
                timestamp: Date.now()
            };
            
            // Send data to popup via background script
            chrome.runtime.sendMessage({
                type: 'CHART_DATA',
                data: data
            });
            
            this.lastUpdate = Date.now();
        } catch (error) {
            console.error('Delta Baba Sniper: Error sending data to popup:', error);
        }
    }

    observeDOMChanges() {
        try {
            // Observe DOM changes to detect dynamic content updates
            const observer = new MutationObserver((mutations) => {
                let shouldRescan = false;
                
                for (const mutation of mutations) {
                    if (mutation.type === 'childList' || mutation.type === 'attributes') {
                        // Check if relevant elements changed
                        if (this.isRelevantChange(mutation)) {
                            shouldRescan = true;
                            break;
                        }
                    }
                }
                
                if (shouldRescan) {
                    // Debounce rescanning
                    clearTimeout(this.rescanTimeout);
                    this.rescanTimeout = setTimeout(() => this.scanPage(), 500);
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'data-symbol', 'data-price', 'data-change']
            });
        } catch (error) {
            console.error('Delta Baba Sniper: Error setting up DOM observer:', error);
        }
    }

    isRelevantChange(mutation) {
        try {
            // Check if the mutation affects relevant elements
            const relevantSelectors = [
                '[data-symbol]',
                '.symbol',
                '.price',
                '.change',
                '.timeframe',
                '[class*="chart"]'
            ];
            
            for (const selector of relevantSelectors) {
                if (mutation.target.matches && mutation.target.matches(selector)) {
                    return true;
                }
                
                if (mutation.addedNodes) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE && node.matches(selector)) {
                            return true;
                        }
                    }
                }
            }
            
            return false;
        } catch (error) {
            return false;
        }
    }

    // Utility method to check if we're on a Delta Exchange page
    isDeltaExchangePage() {
        return window.location.hostname.includes('delta.exchange') ||
               window.location.hostname.includes('delta.exchange.in') ||
               document.title.toLowerCase().includes('delta');
    }
}

// Initialize the scanner
const scanner = new DeltaExchangeScanner();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_CHART_DATA') {
        // Send current data to popup
        sendResponse({
            symbol: scanner.currentSymbol,
            price: scanner.currentPrice,
            change: scanner.currentChange,
            timeframe: scanner.currentTimeframe,
            chartData: scanner.chartData
        });
    }
});

// Expose scanner to window for debugging
window.deltaBabaSniper = scanner;