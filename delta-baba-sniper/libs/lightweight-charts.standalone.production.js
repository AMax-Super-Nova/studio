// TradingView Lightweight Charts - Minimal Fallback
// This is a simplified version for the extension demo
// In a real extension, you would include the full library

window.LightweightCharts = {
    createChart: function(container, options) {
        return new MockChart(container, options);
    },
    CrosshairMode: {
        Normal: 0
    }
};

class MockChart {
    constructor(container, options) {
        this.container = container;
        this.options = options;
        this.series = [];
        this.container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666; font-size: 14px;">📊 Chart Loading...</div>';
    }

    addCandlestickSeries(options) {
        return new MockSeries('candlestick', options);
    }

    addLineSeries(options) {
        return new MockSeries('line', options);
    }

    addHistogramSeries(options) {
        return new MockSeries('histogram', options);
    }

    applyOptions(options) {
        this.options = { ...this.options, ...options };
    }

    timeScale() {
        return {
            fitContent: () => {},
            setVisibleRange: () => {}
        };
    }

    remove() {
        this.container.innerHTML = '';
    }
}

class MockSeries {
    constructor(type, options) {
        this.type = type;
        this.options = options;
        this.data = [];
    }

    setData(data) {
        this.data = data;
        console.log(`📊 ${this.type} series updated with ${data.length} points`);
    }

    update(point) {
        this.data.push(point);
        console.log(`📊 ${this.type} series updated`);
    }

    setMarkers(markers) {
        console.log(`📊 ${this.type} series markers set:`, markers);
    }
}