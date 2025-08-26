// Delta Baba Sniper 18.0 - Technical Indicators Module
// Implements all required technical indicators for trading analysis

class TechnicalIndicators {
  constructor() {
    this.indicators = {};
  }

  // ===== EMA (Exponential Moving Average) =====
  calculateEMA(data, period) {
    if (data.length < period) return null;
    
    const multiplier = 2 / (period + 1);
    let ema = data[0].close;
    
    for (let i = 1; i < data.length; i++) {
      ema = (data[i].close * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  calculateEMAs(data, periods = [9, 21, 55]) {
    const emas = {};
    
    periods.forEach(period => {
      emas[`EMA${period}`] = this.calculateEMA(data, period);
    });
    
    return emas;
  }

  // ===== RSI (Relative Strength Index) =====
  calculateRSI(data, period = 14) {
    if (data.length < period + 1) return null;
    
    let gains = 0;
    let losses = 0;
    
    // Calculate initial gains and losses
    for (let i = 1; i <= period; i++) {
      const change = data[i].close - data[i - 1].close;
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }
    
    // Calculate average gains and losses
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    // Calculate RSI for the most recent data point
    for (let i = period + 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close;
      
      if (change > 0) {
        avgGain = (avgGain * (period - 1) + change) / period;
        avgLoss = (avgLoss * (period - 1)) / period;
      } else {
        avgGain = (avgGain * (period - 1)) / period;
        avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
      }
    }
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return rsi;
  }

  // ===== MACD (Moving Average Convergence Divergence) =====
  calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (data.length < slowPeriod) return null;
    
    const fastEMA = this.calculateEMA(data, fastPeriod);
    const slowEMA = this.calculateEMA(data, slowPeriod);
    
    if (!fastEMA || !slowEMA) return null;
    
    const macdLine = fastEMA - slowEMA;
    const signalLine = this.calculateSignalLine(data, macdLine, signalPeriod);
    const histogram = macdLine - signalLine;
    
    return {
      macd: macdLine,
      signal: signalLine,
      histogram: histogram
    };
  }

  calculateSignalLine(data, macdLine, period) {
    // Simplified signal line calculation
    // In a real implementation, you'd need to track MACD values over time
    return macdLine * 0.9; // Approximation
  }

  // ===== Supertrend =====
  calculateSupertrend(data, period = 10, multiplier = 3) {
    if (data.length < period) return null;
    
    const atr = this.calculateATR(data, period);
    const basicUpperBand = this.calculateBasicBand(data, period, 'upper');
    const basicLowerBand = this.calculateBasicBand(data, period, 'lower');
    
    let finalUpperBand = basicUpperBand;
    let finalLowerBand = basicLowerBand;
    let supertrend = basicLowerBand;
    let trend = 'UP';
    
    // Calculate final bands and supertrend
    for (let i = period; i < data.length; i++) {
      const currentClose = data[i].close;
      const prevClose = data[i - 1].close;
      
      // Update final upper band
      if (basicUpperBand[i] < finalUpperBand[i - 1] || prevClose > finalUpperBand[i - 1]) {
        finalUpperBand[i] = basicUpperBand[i];
      } else {
        finalUpperBand[i] = finalUpperBand[i - 1];
      }
      
      // Update final lower band
      if (basicLowerBand[i] > finalLowerBand[i - 1] || prevClose < finalLowerBand[i - 1]) {
        finalLowerBand[i] = basicLowerBand[i];
      } else {
        finalLowerBand[i] = finalLowerBand[i - 1];
      }
      
      // Determine supertrend
      if (supertrend[i - 1] === finalUpperBand[i - 1] && currentClose <= finalUpperBand[i]) {
        supertrend[i] = finalUpperBand[i];
      } else if (supertrend[i - 1] === finalUpperBand[i - 1] && currentClose > finalUpperBand[i]) {
        supertrend[i] = finalLowerBand[i];
      } else if (supertrend[i - 1] === finalLowerBand[i - 1] && currentClose >= finalLowerBand[i]) {
        supertrend[i] = finalLowerBand[i];
      } else if (supertrend[i - 1] === finalLowerBand[i - 1] && currentClose < finalLowerBand[i]) {
        supertrend[i] = finalUpperBand[i];
      }
      
      // Determine trend
      if (currentClose > supertrend[i]) {
        trend = 'UP';
      } else if (currentClose < supertrend[i]) {
        trend = 'DOWN';
      }
    }
    
    return {
      value: supertrend[supertrend.length - 1],
      trend: trend,
      upperBand: finalUpperBand[finalUpperBand.length - 1],
      lowerBand: finalLowerBand[finalLowerBand.length - 1]
    };
  }

  calculateATR(data, period) {
    const tr = [];
    
    for (let i = 1; i < data.length; i++) {
      const high = data[i].high;
      const low = data[i].low;
      const prevClose = data[i - 1].close;
      
      const tr1 = high - low;
      const tr2 = Math.abs(high - prevClose);
      const tr3 = Math.abs(low - prevClose);
      
      tr.push(Math.max(tr1, tr2, tr3));
    }
    
    // Calculate ATR as simple moving average of TR
    let atr = 0;
    for (let i = 0; i < period; i++) {
      atr += tr[i];
    }
    
    return atr / period;
  }

  calculateBasicBand(data, period, type) {
    const atr = this.calculateATR(data, period);
    const basicBand = [];
    
    for (let i = 0; i < data.length; i++) {
      if (type === 'upper') {
        basicBand.push((data[i].high + data[i].low) / 2 + (atr * 3));
      } else {
        basicBand.push((data[i].high + data[i].low) / 2 - (atr * 3));
      }
    }
    
    return basicBand;
  }

  // ===== Pivot Points =====
  calculatePivotPoints(data) {
    if (data.length < 1) return null;
    
    const current = data[data.length - 1];
    const high = current.high;
    const low = current.low;
    const close = current.close;
    
    const pivot = (high + low + close) / 3;
    const r1 = (2 * pivot) - low;
    const s1 = (2 * pivot) - high;
    const r2 = pivot + (high - low);
    const s2 = pivot - (high - low);
    const r3 = high + 2 * (pivot - low);
    const s3 = low - 2 * (high - pivot);
    
    return {
      pivot: pivot,
      r1: r1,
      r2: r2,
      r3: r3,
      s1: s1,
      s2: s2,
      s3: s3
    };
  }

  // ===== OHLC Analysis =====
  analyzeOHLC(data) {
    if (data.length < 2) return null;
    
    const current = data[data.length - 1];
    const previous = data[data.length - 2];
    
    const bodySize = Math.abs(current.close - current.open);
    const upperShadow = current.high - Math.max(current.open, current.close);
    const lowerShadow = Math.min(current.open, current.close) - current.low;
    const totalRange = current.high - current.low;
    
    // Candle patterns
    const isBullish = current.close > current.open;
    const isBearish = current.close < current.open;
    const isDoji = bodySize < (totalRange * 0.1);
    const isHammer = lowerShadow > (bodySize * 2) && upperShadow < bodySize;
    const isShootingStar = upperShadow > (bodySize * 2) && lowerShadow < bodySize;
    
    return {
      isBullish,
      isBearish,
      isDoji,
      isHammer,
      isShootingStar,
      bodySize,
      upperShadow,
      lowerShadow,
      totalRange,
      bodyRatio: bodySize / totalRange
    };
  }

  // ===== Combined Analysis =====
  analyzeAll(data, settings = {}) {
    const analysis = {
      ema: this.calculateEMAs(data, settings.ema || [9, 21, 55]),
      rsi: this.calculateRSI(data, settings.rsi?.period || 14),
      macd: this.calculateMACD(data, 
        settings.macd?.fast || 12, 
        settings.macd?.slow || 26, 
        settings.macd?.signal || 9),
      supertrend: {},
      pivotPoints: this.calculatePivotPoints(data),
      ohlc: this.analyzeOHLC(data)
    };

    // Calculate multiple Supertrend variants
    if (settings.supertrend) {
      settings.supertrend.forEach(config => {
        const key = `ST${config.period}_${config.multiplier}`;
        analysis.supertrend[key] = this.calculateSupertrend(data, config.period, config.multiplier);
      });
    }

    return analysis;
  }

  // ===== Signal Generation =====
  generateSignals(analysis, currentPrice) {
    const signals = [];
    
    // EMA Crossover Signals
    if (analysis.ema.EMA9 && analysis.ema.EMA21) {
      if (analysis.ema.EMA9 > analysis.ema.EMA21) {
        signals.push({
          type: 'EMA_BULLISH',
          strength: 'STRONG',
          description: 'EMA9 above EMA21 - Bullish trend'
        });
      } else {
        signals.push({
          type: 'EMA_BEARISH',
          strength: 'STRONG',
          description: 'EMA9 below EMA21 - Bearish trend'
        });
      }
    }

    // RSI Signals
    if (analysis.rsi !== null) {
      if (analysis.rsi < 30) {
        signals.push({
          type: 'RSI_OVERSOLD',
          strength: 'MEDIUM',
          description: `RSI oversold at ${analysis.rsi.toFixed(2)}`
        });
      } else if (analysis.rsi > 70) {
        signals.push({
          type: 'RSI_OVERBOUGHT',
          strength: 'MEDIUM',
          description: `RSI overbought at ${analysis.rsi.toFixed(2)}`
        });
      }
    }

    // MACD Signals
    if (analysis.macd) {
      if (analysis.macd.histogram > 0 && analysis.macd.macd > analysis.macd.signal) {
        signals.push({
          type: 'MACD_BULLISH',
          strength: 'STRONG',
          description: 'MACD bullish crossover'
        });
      } else if (analysis.macd.histogram < 0 && analysis.macd.macd < analysis.macd.signal) {
        signals.push({
          type: 'MACD_BEARISH',
          strength: 'STRONG',
          description: 'MACD bearish crossover'
        });
      }
    }

    // Supertrend Signals
    Object.entries(analysis.supertrend).forEach(([key, st]) => {
      if (st.trend === 'UP') {
        signals.push({
          type: `SUPERTREND_${key}_BULLISH`,
          strength: 'STRONG',
          description: `${key} Supertrend is UP`
        });
      } else {
        signals.push({
          type: `SUPERTREND_${key}_BEARISH`,
          strength: 'STRONG',
          description: `${key} Supertrend is DOWN`
        });
      }
    });

    // Pivot Point Signals
    if (analysis.pivotPoints) {
      const pp = analysis.pivotPoints;
      if (currentPrice > pp.r1) {
        signals.push({
          type: 'PIVOT_RESISTANCE_BREAK',
          strength: 'MEDIUM',
          description: 'Price above R1 resistance'
        });
      } else if (currentPrice < pp.s1) {
        signals.push({
          type: 'PIVOT_SUPPORT_BREAK',
          strength: 'MEDIUM',
          description: 'Price below S1 support'
        });
      }
    }

    // OHLC Pattern Signals
    if (analysis.ohlc) {
      if (analysis.ohlc.isHammer && analysis.ohlc.isBullish) {
        signals.push({
          type: 'HAMMER_BULLISH',
          strength: 'MEDIUM',
          description: 'Bullish hammer pattern detected'
        });
      } else if (analysis.ohlc.isShootingStar && analysis.ohlc.isBearish) {
        signals.push({
          type: 'SHOOTING_STAR_BEARISH',
          strength: 'MEDIUM',
          description: 'Bearish shooting star pattern detected'
        });
      }
    }

    return signals;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TechnicalIndicators;
} else if (typeof window !== 'undefined') {
  window.TechnicalIndicators = TechnicalIndicators;
}