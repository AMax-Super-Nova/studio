// Delta Baba Sniper 18.0 - Prediction Engine Module
// Combines technical indicators to predict entry/exit points with timing

class PredictionEngine {
  constructor() {
    this.indicators = new TechnicalIndicators();
    this.settings = {};
    this.predictionHistory = [];
    this.confidenceThreshold = 0.7;
    this.predictionWindow = 5; // 5 minutes ahead
  }

  async initialize() {
    try {
      // Load settings from storage
      const result = await chrome.storage.local.get();
      this.settings = result;
      console.log('✅ Prediction Engine initialized with settings:', this.settings);
    } catch (error) {
      console.error('❌ Failed to initialize Prediction Engine:', error);
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

  // ===== Main Prediction Method =====
  async generatePrediction(marketData, currentTime, timeframe) {
    try {
      if (!marketData || marketData.length < 55) {
        throw new Error('Insufficient market data for analysis');
      }

      // Analyze all technical indicators
      const analysis = this.indicators.analyzeAll(marketData, this.settings.indicators);
      
      // Generate base signals
      const currentPrice = marketData[marketData.length - 1].close;
      const signals = this.indicators.generateSignals(analysis, currentPrice);
      
      // Calculate prediction confidence
      const confidence = this.calculateConfidence(signals, analysis, marketData);
      
      // Generate entry/exit predictions
      const predictions = this.generateEntryExitPredictions(
        signals, 
        analysis, 
        marketData, 
        currentTime, 
        timeframe,
        confidence
      );

      // Store prediction in history
      if (predictions.length > 0) {
        this.predictionHistory.push({
          timestamp: currentTime,
          predictions,
          confidence,
          timeframe,
          symbol: this.extractSymbol(marketData)
        });

        // Keep only last 100 predictions
        if (this.predictionHistory.length > 100) {
          this.predictionHistory.splice(0, this.predictionHistory.length - 100);
        }
      }

      return {
        timestamp: currentTime,
        predictions,
        confidence,
        analysis,
        signals,
        timeframe
      };

    } catch (error) {
      console.error('❌ Prediction generation failed:', error);
      return {
        timestamp: currentTime,
        predictions: [],
        confidence: 0,
        error: error.message,
        timeframe
      };
    }
  }

  // ===== Confidence Calculation =====
  calculateConfidence(signals, analysis, marketData) {
    let confidence = 0;
    let totalWeight = 0;

    // Signal strength weights
    const weights = {
      'STRONG': 1.0,
      'MEDIUM': 0.7,
      'WEAK': 0.4
    };

    // Calculate weighted confidence from signals
    signals.forEach(signal => {
      const weight = weights[signal.strength] || 0.5;
      confidence += weight;
      totalWeight += weight;
    });

    // Add confidence from trend consistency
    if (analysis.ema && analysis.ema.EMA9 && analysis.ema.EMA21) {
      const emaTrend = analysis.ema.EMA9 > analysis.ema.EMA21;
      const priceAboveEMA = marketData[marketData.length - 1].close > analysis.ema.EMA21;
      
      if (emaTrend === priceAboveEMA) {
        confidence += 0.3;
        totalWeight += 0.3;
      }
    }

    // Add confidence from volume analysis (if available)
    if (marketData[0].volume) {
      const recentVolume = marketData.slice(-5).reduce((sum, candle) => sum + candle.volume, 0);
      const avgVolume = marketData.reduce((sum, candle) => sum + candle.volume, 0) / marketData.length;
      
      if (recentVolume > avgVolume * 1.2) {
        confidence += 0.2;
        totalWeight += 0.2;
      }
    }

    // Normalize confidence to 0-1 range
    return totalWeight > 0 ? Math.min(confidence / totalWeight, 1) : 0;
  }

  // ===== Entry/Exit Prediction Generation =====
  generateEntryExitPredictions(signals, analysis, marketData, currentTime, timeframe, confidence) {
    const predictions = [];
    const currentPrice = marketData[marketData.length - 1].close;
    
    if (confidence < this.confidenceThreshold) {
      return predictions;
    }

    // Convert timeframe to minutes for prediction window
    const timeframeMinutes = this.timeframeToMinutes(timeframe);
    const predictionTimeMinutes = currentTime + (this.predictionWindow * 60000); // 5 minutes ahead

    // Analyze trend direction
    const trendDirection = this.determineTrendDirection(signals, analysis);
    
    if (trendDirection === 'BULLISH') {
      // Generate bullish entry prediction
      const entryPrice = this.calculateEntryPrice(currentPrice, 'BUY', analysis);
      const exitPrice = this.calculateExitPrice(entryPrice, 'BUY', analysis);
      
      predictions.push({
        type: 'BUY_ENTRY',
        entryPrice: entryPrice,
        exitPrice: exitPrice,
        entryTime: predictionTimeMinutes,
        exitTime: predictionTimeMinutes + (timeframeMinutes * 3), // 3 candles ahead
        confidence: confidence,
        reason: this.generateReason(signals, 'BUY'),
        stopLoss: this.calculateStopLoss(entryPrice, 'BUY', analysis),
        takeProfit: exitPrice
      });

    } else if (trendDirection === 'BEARISH') {
      // Generate bearish entry prediction
      const entryPrice = this.calculateEntryPrice(currentPrice, 'SELL', analysis);
      const exitPrice = this.calculateExitPrice(entryPrice, 'SELL', analysis);
      
      predictions.push({
        type: 'SELL_ENTRY',
        entryPrice: entryPrice,
        exitPrice: exitPrice,
        entryTime: predictionTimeMinutes,
        exitTime: predictionTimeMinutes + (timeframeMinutes * 3), // 3 candles ahead
        confidence: confidence,
        reason: this.generateReason(signals, 'SELL'),
        stopLoss: this.calculateStopLoss(entryPrice, 'SELL', analysis),
        takeProfit: exitPrice
      });
    }

    // Generate exit predictions for existing positions
    const exitPredictions = this.generateExitPredictions(signals, analysis, marketData, currentTime, timeframe);
    predictions.push(...exitPredictions);

    return predictions;
  }

  // ===== Trend Direction Analysis =====
  determineTrendDirection(signals, analysis) {
    let bullishScore = 0;
    let bearishScore = 0;

    // Score signals by type
    signals.forEach(signal => {
      if (signal.type.includes('BULLISH') || signal.type.includes('OVERSOLD')) {
        bullishScore += 1;
      } else if (signal.type.includes('BEARISH') || signal.type.includes('OVERBOUGHT')) {
        bearishScore += 1;
      }
    });

    // Add trend scores from indicators
    if (analysis.ema && analysis.ema.EMA9 && analysis.ema.EMA21) {
      if (analysis.ema.EMA9 > analysis.ema.EMA21) {
        bullishScore += 2;
      } else {
        bearishScore += 2;
      }
    }

    if (analysis.supertrend) {
      Object.values(analysis.supertrend).forEach(st => {
        if (st.trend === 'UP') {
          bullishScore += 1;
        } else {
          bearishScore += 1;
        }
      });
    }

    // Determine overall trend
    if (bullishScore > bearishScore + 1) {
      return 'BULLISH';
    } else if (bearishScore > bullishScore + 1) {
      return 'BEARISH';
    } else {
      return 'NEUTRAL';
    }
  }

  // ===== Price Calculation Methods =====
  calculateEntryPrice(currentPrice, direction, analysis) {
    let entryPrice = currentPrice;
    
    if (direction === 'BUY') {
      // For buy entries, look for support levels
      if (analysis.pivotPoints && analysis.pivotPoints.s1) {
        entryPrice = Math.min(currentPrice, analysis.pivotPoints.s1);
      }
      
      // Add EMA support
      if (analysis.ema && analysis.ema.EMA21) {
        entryPrice = Math.min(entryPrice, analysis.ema.EMA21);
      }
      
    } else if (direction === 'SELL') {
      // For sell entries, look for resistance levels
      if (analysis.pivotPoints && analysis.pivotPoints.r1) {
        entryPrice = Math.max(currentPrice, analysis.pivotPoints.r1);
      }
      
      // Add EMA resistance
      if (analysis.ema && analysis.ema.EMA21) {
        entryPrice = Math.max(entryPrice, analysis.ema.EMA21);
      }
    }

    return this.roundPrice(entryPrice);
  }

  calculateExitPrice(entryPrice, direction, analysis) {
    let exitPrice = entryPrice;
    const riskRewardRatio = 2.5; // 1:2.5 risk-reward ratio
    
    if (direction === 'BUY') {
      // Calculate take profit above entry
      const atr = analysis.supertrend ? 
        Object.values(analysis.supertrend)[0]?.value * 0.1 : 
        entryPrice * 0.02;
      
      exitPrice = entryPrice + (atr * riskRewardRatio);
      
    } else if (direction === 'SELL') {
      // Calculate take profit below entry
      const atr = analysis.supertrend ? 
        Object.values(analysis.supertrend)[0]?.value * 0.1 : 
        entryPrice * 0.02;
      
      exitPrice = entryPrice - (atr * riskRewardRatio);
    }

    return this.roundPrice(exitPrice);
  }

  calculateStopLoss(entryPrice, direction, analysis) {
    let stopLoss = entryPrice;
    
    if (direction === 'BUY') {
      // Stop loss below entry
      if (analysis.pivotPoints && analysis.pivotPoints.s2) {
        stopLoss = analysis.pivotPoints.s2;
      } else {
        stopLoss = entryPrice * 0.98; // 2% below entry
      }
      
    } else if (direction === 'SELL') {
      // Stop loss above entry
      if (analysis.pivotPoints && analysis.pivotPoints.r2) {
        stopLoss = analysis.pivotPoints.r2;
      } else {
        stopLoss = entryPrice * 1.02; // 2% above entry
      }
    }

    return this.roundPrice(stopLoss);
  }

  // ===== Exit Prediction Generation =====
  generateExitPredictions(signals, analysis, marketData, currentTime, timeframe) {
    const exitPredictions = [];
    const currentPrice = marketData[marketData.length - 1].close;
    
    // Check for reversal signals that suggest exiting positions
    const reversalSignals = signals.filter(signal => 
      signal.type.includes('REVERSAL') || 
      signal.type.includes('OVERBOUGHT') || 
      signal.type.includes('OVERSOLD')
    );

    if (reversalSignals.length > 0) {
      const timeframeMinutes = this.timeframeToMinutes(timeframe);
      const exitTime = currentTime + (timeframeMinutes * 2); // 2 candles ahead
      
      reversalSignals.forEach(signal => {
        if (signal.type.includes('OVERBOUGHT')) {
          exitPredictions.push({
            type: 'BUY_EXIT',
            exitPrice: currentPrice * 0.99, // Slightly below current
            exitTime: exitTime,
            confidence: 0.8,
            reason: 'RSI overbought - Exit long position'
          });
        } else if (signal.type.includes('OVERSOLD')) {
          exitPredictions.push({
            type: 'SELL_EXIT',
            exitPrice: currentPrice * 1.01, // Slightly above current
            exitTime: exitTime,
            confidence: 0.8,
            reason: 'RSI oversold - Exit short position'
          });
        }
      });
    }

    return exitPredictions;
  }

  // ===== Utility Methods =====
  timeframeToMinutes(timeframe) {
    const timeframes = {
      '1m': 1,
      '5m': 5,
      '10m': 10,
      '15m': 15,
      '30m': 30,
      '1h': 60,
      '2h': 120,
      '3h': 180
    };
    
    return timeframes[timeframe] || 5;
  }

  roundPrice(price) {
    // Round to appropriate decimal places based on price
    if (price >= 1000) return Math.round(price);
    if (price >= 100) return Math.round(price * 10) / 10;
    if (price >= 10) return Math.round(price * 100) / 100;
    return Math.round(price * 1000) / 1000;
  }

  generateReason(signals, direction) {
    const relevantSignals = signals.filter(signal => 
      signal.type.includes(direction) || 
      (direction === 'BUY' && signal.type.includes('OVERSOLD')) ||
      (direction === 'SELL' && signal.type.includes('OVERBOUGHT'))
    );

    if (relevantSignals.length === 0) return 'Technical analysis suggests trend continuation';

    const reasons = relevantSignals.map(signal => signal.description);
    return reasons.join('. ');
  }

  extractSymbol(marketData) {
    // Extract symbol from market data if available
    // This would typically come from the data source
    return 'UNKNOWN';
  }

  // ===== Prediction Validation =====
  validatePrediction(prediction, actualData) {
    if (!prediction || !actualData) return false;

    const { entryPrice, exitPrice, entryTime, exitTime } = prediction;
    const currentTime = Date.now();
    
    // Check if prediction time has passed
    if (currentTime < entryTime) return false;

    // Validate entry conditions
    const entryValid = this.validateEntryConditions(prediction, actualData);
    
    // Validate exit conditions
    const exitValid = this.validateExitConditions(prediction, actualData);

    return {
      isValid: entryValid && exitValid,
      entryValid,
      exitValid,
      timestamp: currentTime
    };
  }

  validateEntryConditions(prediction, actualData) {
    const currentPrice = actualData[actualData.length - 1].close;
    const { entryPrice, type } = prediction;

    if (type.includes('BUY')) {
      return currentPrice <= entryPrice * 1.01; // Within 1% of entry price
    } else if (type.includes('SELL')) {
      return currentPrice >= entryPrice * 0.99; // Within 1% of entry price
    }

    return false;
  }

  validateExitConditions(prediction, actualData) {
    const currentPrice = actualData[actualData.length - 1].close;
    const { exitPrice, type } = prediction;

    if (type.includes('BUY')) {
      return currentPrice >= exitPrice * 0.99; // Within 1% of exit price
    } else if (type.includes('SELL')) {
      return currentPrice <= exitPrice * 1.01; // Within 1% of exit price
    }

    return false;
  }

  // ===== Performance Metrics =====
  getPerformanceMetrics() {
    if (this.predictionHistory.length === 0) {
      return { accuracy: 0, totalPredictions: 0, successfulPredictions: 0 };
    }

    const totalPredictions = this.predictionHistory.length;
    const successfulPredictions = this.predictionHistory.filter(pred => 
      pred.confidence > this.confidenceThreshold
    ).length;

    return {
      accuracy: (successfulPredictions / totalPredictions) * 100,
      totalPredictions,
      successfulPredictions,
      averageConfidence: this.predictionHistory.reduce((sum, pred) => 
        sum + pred.confidence, 0) / totalPredictions
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PredictionEngine;
} else if (typeof window !== 'undefined') {
  window.PredictionEngine = PredictionEngine;
}