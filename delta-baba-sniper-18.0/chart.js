// Delta Baba Sniper 18.0 - Chart Module
// Integrates with TradingView Lightweight Charts for live trading visualization

class DeltaBabaChart {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.chart = null;
    this.series = {};
    this.indicators = {};
    this.predictions = [];
    this.currentTimeframe = '5m';
    this.currentSymbol = 'UNKNOWN';
    this.isInitialized = false;
    
    // Default options
    this.options = {
      width: 800,
      height: 600,
      layout: {
        backgroundColor: '#1e222d',
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#2B2B43' },
        horzLines: { color: '#2B2B43' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#758696',
          width: 1,
          style: 3,
        },
        horzLine: {
          color: '#758696',
          width: 1,
          style: 3,
        },
      },
      rightPriceScale: {
        borderColor: '#2B2B43',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: '#2B2B43',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 12,
        barSpacing: 3,
        fixLeftEdge: true,
        lockVisibleTimeRangeOnResize: true,
        rightBarStaysOnScroll: true,
        borderVisible: false,
        visible: true,
        tickMarkFormatter: (time) => {
          return new Date(time * 1000).toLocaleTimeString();
        },
      },
      ...options
    };

    this.init();
  }

  async init() {
    try {
      // Load TradingView Lightweight Charts
      await this.loadTradingViewLibrary();
      
      // Initialize chart
      this.createChart();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Initialize indicators
      this.initializeIndicators();
      
      this.isInitialized = true;
      console.log('✅ Delta Baba Chart initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize chart:', error);
    }
  }

  async loadTradingViewLibrary() {
    return new Promise((resolve, reject) => {
      if (window.LightweightCharts) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load TradingView library'));
      document.head.appendChild(script);
    });
  }

  createChart() {
    if (!this.container) {
      throw new Error(`Container with ID '${this.containerId}' not found`);
    }

    // Create chart instance
    this.chart = window.LightweightCharts.createChart(this.container, this.options);
    
    // Create candlestick series
    this.series.candlestick = this.chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderDownColor: '#ef5350',
      borderUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      wickUpColor: '#26a69a',
    });

    // Create volume series
    this.series.volume = this.chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Create EMA series
    this.series.ema9 = this.chart.addLineSeries({
      color: '#ff9800',
      lineWidth: 1,
      title: 'EMA 9',
    });

    this.series.ema21 = this.chart.addLineSeries({
      color: '#2196f3',
      lineWidth: 1,
      title: 'EMA 21',
    });

    this.series.ema55 = this.chart.addLineSeries({
      color: '#9c27b0',
      lineWidth: 1,
      title: 'EMA 55',
    });

    // Create RSI series (on separate scale)
    this.series.rsi = this.chart.addLineSeries({
      color: '#ff5722',
      lineWidth: 2,
      title: 'RSI',
      priceScaleId: 'rsi',
    });

    // Create MACD series
    this.series.macd = this.chart.addLineSeries({
      color: '#00bcd4',
      lineWidth: 1,
      title: 'MACD',
      priceScaleId: 'macd',
    });

    this.series.macdSignal = this.chart.addLineSeries({
      color: '#ff9800',
      lineWidth: 1,
      title: 'MACD Signal',
      priceScaleId: 'macd',
    });

    this.series.macdHistogram = this.chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'macd',
      scaleMargins: {
        top: 0.7,
        bottom: 0,
      },
    });

    // Create Supertrend series
    this.series.supertrend = this.chart.addLineSeries({
      color: '#4caf50',
      lineWidth: 2,
      title: 'Supertrend',
    });

    // Create pivot point lines
    this.series.pivot = this.chart.addLineSeries({
      color: '#ffeb3b',
      lineWidth: 1,
      lineStyle: 2,
      title: 'Pivot',
    });

    this.series.r1 = this.chart.addLineSeries({
      color: '#f44336',
      lineWidth: 1,
      lineStyle: 2,
      title: 'R1',
    });

    this.series.s1 = this.chart.addLineSeries({
      color: '#4caf50',
      lineWidth: 1,
      lineStyle: 2,
      title: 'S1',
    });

    // Add price scales for indicators
    this.chart.priceScale('rsi').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
      borderVisible: false,
    });

    this.chart.priceScale('macd').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
      borderVisible: false,
    });

    console.log('✅ Chart and series created successfully');
  }

  setupEventListeners() {
    if (!this.chart) return;

    // Handle chart resize
    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0 || entries[0].target !== this.container) return;
      
      const newRect = entries[0].contentRect;
      this.chart.applyOptions({
        width: newRect.width,
        height: newRect.height,
      });
    });

    resizeObserver.observe(this.container);

    // Handle crosshair move
    this.chart.subscribeCrosshairMove(param => {
      if (param.time) {
        this.handleCrosshairMove(param);
      }
    });

    // Handle chart click
    this.chart.subscribeClick(param => {
      this.handleChartClick(param);
    });
  }

  initializeIndicators() {
    // Initialize technical indicators
    this.indicators = {
      ema: new TechnicalIndicators(),
      prediction: new PredictionEngine()
    };

    // Initialize prediction engine
    this.indicators.prediction.initialize();
  }

  // ===== Data Management =====
  updateCandlestickData(data) {
    if (!this.series.candlestick || !data || data.length === 0) return;

    try {
      // Format data for TradingView
      const formattedData = data.map(candle => ({
        time: Math.floor(new Date(candle.timestamp).getTime() / 1000),
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
        volume: parseFloat(candle.volume || 0)
      }));

      // Update candlestick series
      this.series.candlestick.setData(formattedData);

      // Update volume series
      if (this.series.volume) {
        const volumeData = formattedData.map(candle => ({
          time: candle.time,
          value: candle.volume,
          color: candle.close >= candle.open ? '#26a69a' : '#ef5350'
        }));
        this.series.volume.setData(volumeData);
      }

      // Update indicators
      this.updateIndicators(data);
      
      // Generate predictions
      this.generatePredictions(data);

      console.log(`✅ Updated chart with ${data.length} candlesticks`);
      
    } catch (error) {
      console.error('❌ Error updating candlestick data:', error);
    }
  }

  updateIndicators(data) {
    if (!data || data.length < 55) return;

    try {
      // Calculate indicators
      const analysis = this.indicators.ema.analyzeAll(data, this.settings?.indicators);
      
      // Update EMA lines
      if (analysis.ema) {
        this.updateEMALines(data, analysis.ema);
      }

      // Update RSI
      if (analysis.rsi !== null) {
        this.updateRSI(data, analysis.rsi);
      }

      // Update MACD
      if (analysis.macd) {
        this.updateMACD(data, analysis.macd);
      }

      // Update Supertrend
      if (analysis.supertrend) {
        this.updateSupertrend(data, analysis.supertrend);
      }

      // Update Pivot Points
      if (analysis.pivotPoints) {
        this.updatePivotPoints(data, analysis.pivotPoints);
      }

    } catch (error) {
      console.error('❌ Error updating indicators:', error);
    }
  }

  updateEMALines(data, emaData) {
    if (!this.series.ema9 || !this.series.ema21 || !this.series.ema55) return;

    const timeData = data.map(candle => 
      Math.floor(new Date(candle.timestamp).getTime() / 1000)
    );

    // Update EMA 9
    if (emaData.EMA9) {
      const ema9Data = timeData.map(time => ({
        time: time,
        value: emaData.EMA9
      }));
      this.series.ema9.setData(ema9Data);
    }

    // Update EMA 21
    if (emaData.EMA21) {
      const ema21Data = timeData.map(time => ({
        time: time,
        value: emaData.EMA21
      }));
      this.series.ema21.setData(ema21Data);
    }

    // Update EMA 55
    if (emaData.EMA55) {
      const ema55Data = timeData.map(time => ({
        time: time,
        value: emaData.EMA55
      }));
      this.series.ema55.setData(ema55Data);
    }
  }

  updateRSI(data, rsiValue) {
    if (!this.series.rsi) return;

    const rsiData = data.map(candle => ({
      time: Math.floor(new Date(candle.timestamp).getTime() / 1000),
      value: rsiValue
    }));

    this.series.rsi.setData(rsiData);
  }

  updateMACD(data, macdData) {
    if (!this.series.macd || !this.series.macdSignal || !this.series.macdHistogram) return;

    const timeData = data.map(candle => 
      Math.floor(new Date(candle.timestamp).getTime() / 1000)
    );

    // Update MACD line
    const macdLineData = timeData.map(time => ({
      time: time,
      value: macdData.macd
    }));
    this.series.macd.setData(macdLineData);

    // Update MACD signal line
    const signalLineData = timeData.map(time => ({
      time: time,
      value: macdData.signal
    }));
    this.series.macdSignal.setData(signalLineData);

    // Update MACD histogram
    const histogramData = timeData.map(time => ({
      time: time,
      value: macdData.histogram,
      color: macdData.histogram >= 0 ? '#26a69a' : '#ef5350'
    }));
    this.series.macdHistogram.setData(histogramData);
  }

  updateSupertrend(data, supertrendData) {
    if (!this.series.supertrend) return;

    const supertrendLineData = data.map(candle => ({
      time: Math.floor(new Date(candle.timestamp).getTime() / 1000),
      value: supertrendData.value || 0
    }));

    this.series.supertrend.setData(supertrendLineData);
  }

  updatePivotPoints(data, pivotData) {
    if (!this.series.pivot || !this.series.r1 || !this.series.s1) return;

    const timeData = data.map(candle => 
      Math.floor(new Date(candle.timestamp).getTime() / 1000)
    );

    // Update pivot line
    const pivotLineData = timeData.map(time => ({
      time: time,
      value: pivotData.pivot
    }));
    this.series.pivot.setData(pivotLineData);

    // Update R1 line
    const r1LineData = timeData.map(time => ({
      time: time,
      value: pivotData.r1
    }));
    this.series.r1.setData(r1LineData);

    // Update S1 line
    const s1LineData = timeData.map(time => ({
      time: time,
      value: pivotData.s1
    }));
    this.series.s1.setData(s1LineData);
  }

  // ===== Prediction Management =====
  async generatePredictions(data) {
    if (!this.indicators.prediction || !data || data.length < 55) return;

    try {
      const currentTime = Date.now();
      const prediction = await this.indicators.prediction.generatePrediction(
        data, 
        currentTime, 
        this.currentTimeframe
      );

      if (prediction.predictions && prediction.predictions.length > 0) {
        this.predictions = prediction.predictions;
        this.displayPredictions(prediction.predictions);
        
        // Send signal to background
        this.sendSignalToBackground(prediction);
      }

    } catch (error) {
      console.error('❌ Error generating predictions:', error);
    }
  }

  displayPredictions(predictions) {
    if (!this.chart || !predictions || predictions.length === 0) return;

    try {
      // Clear existing prediction markers
      this.clearPredictionMarkers();

      predictions.forEach((prediction, index) => {
        this.addPredictionMarker(prediction, index);
      });

    } catch (error) {
      console.error('❌ Error displaying predictions:', error);
    }
  }

  addPredictionMarker(prediction, index) {
    if (!this.chart) return;

    try {
      const marker = {
        time: Math.floor(new Date(prediction.entryTime).getTime() / 1000),
        position: prediction.type.includes('BUY') ? 'belowBar' : 'aboveBar',
        color: prediction.type.includes('BUY') ? '#4caf50' : '#f44336',
        shape: prediction.type.includes('BUY') ? 'arrowUp' : 'arrowDown',
        text: `${prediction.type} @ ${prediction.entryPrice}`,
        size: 2
      };

      this.series.candlestick.setMarkers([marker]);

    } catch (error) {
      console.error('❌ Error adding prediction marker:', error);
    }
  }

  clearPredictionMarkers() {
    if (this.series.candlestick) {
      this.series.candlestick.setMarkers([]);
    }
  }

  // ===== Event Handlers =====
  handleCrosshairMove(param) {
    if (!param.time || !param.seriesData) return;

    // Update tooltip or info panel with current values
    this.updateTooltip(param);
  }

  handleChartClick(param) {
    if (!param.time || !param.seriesData) return;

    // Handle chart click events (e.g., zoom, pan, etc.)
    console.log('Chart clicked at:', new Date(param.time * 1000));
  }

  updateTooltip(param) {
    // Update tooltip with current values
    // This would typically update a floating tooltip element
  }

  // ===== Communication =====
  sendSignalToBackground(prediction) {
    try {
      chrome.runtime.sendMessage({
        action: 'SIGNAL_GENERATED',
        signal: {
          type: prediction.predictions[0]?.type || 'UNKNOWN',
          symbol: this.currentSymbol,
          price: prediction.predictions[0]?.entryPrice || 0,
          confidence: prediction.confidence,
          timeframe: this.currentTimeframe,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error('❌ Error sending signal to background:', error);
    }
  }

  // ===== Public Methods =====
  setTimeframe(timeframe) {
    this.currentTimeframe = timeframe;
    console.log(`✅ Timeframe updated to: ${timeframe}`);
  }

  setSymbol(symbol) {
    this.currentSymbol = symbol;
    console.log(`✅ Symbol updated to: ${symbol}`);
  }

  resize(width, height) {
    if (this.chart) {
      this.chart.applyOptions({ width, height });
    }
  }

  destroy() {
    if (this.chart) {
      this.chart.remove();
      this.chart = null;
    }
    this.isInitialized = false;
  }

  // ===== Utility Methods =====
  getChart() {
    return this.chart;
  }

  isReady() {
    return this.isInitialized && this.chart !== null;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DeltaBabaChart;
} else if (typeof window !== 'undefined') {
  window.DeltaBabaChart = DeltaBabaChart;
}