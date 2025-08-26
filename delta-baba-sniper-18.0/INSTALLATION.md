# 🚀 Installation Guide - Delta Baba Sniper 18.0

This guide will walk you through installing the Delta Baba Sniper 18.0 Chrome extension step by step.

## 📋 Prerequisites

- **Google Chrome Browser** (version 88 or higher)
- **Delta Exchange India Account** (for trading)
- **Basic understanding of technical analysis** (recommended)

## 🔧 Installation Methods

### Method 1: Chrome Web Store (Recommended for End Users)

1. **Open Chrome Browser**
   - Launch Google Chrome on your computer
   - Ensure you're using version 88 or higher

2. **Navigate to Chrome Web Store**
   - Go to: [Chrome Web Store](https://chrome.google.com/webstore)
   - Or search for "Delta Baba Sniper 18.0" in Chrome

3. **Find the Extension**
   - Search for "Delta Baba Sniper 18.0"
   - Look for the extension with the rocket 🚀 icon
   - Verify it's version 18.0.0

4. **Install Extension**
   - Click "Add to Chrome" button
   - Review permissions and click "Add extension"
   - Wait for installation to complete

5. **Verify Installation**
   - Look for the Delta Baba Sniper icon in Chrome toolbar
   - Icon should appear in the top-right corner of Chrome

### Method 2: Manual Installation (For Developers/Advanced Users)

1. **Download Extension Files**
   - Download the extension ZIP file
   - Extract to a folder on your computer
   - Ensure all files are present:
     ```
     delta-baba-sniper-18.0/
     ├── manifest.json
     ├── background.js
     ├── content.js
     ├── content.css
     ├── popup.html
     ├── popup.css
     ├── popup.js
     ├── chart.js
     ├── indicators.js
     ├── prediction.js
     └── README.md
     ```

2. **Open Chrome Extensions Page**
   - Type `chrome://extensions/` in Chrome address bar
   - Press Enter

3. **Enable Developer Mode**
   - Toggle "Developer mode" switch in top-right corner
   - This enables advanced installation options

4. **Load Extension**
   - Click "Load unpacked" button
   - Navigate to your extracted extension folder
   - Select the folder and click "Select Folder"

5. **Verify Installation**
   - Extension should appear in your extensions list
   - Status should show "Enabled"
   - Look for the extension icon in Chrome toolbar

### Method 3: From Source Code (For Developers)

1. **Clone Repository**
   ```bash
   git clone https://github.com/your-repo/delta-baba-sniper-18.0.git
   cd delta-baba-sniper-18.0
   ```

2. **Install Dependencies** (if any)
   ```bash
   npm install
   ```

3. **Follow Method 2 Steps**
   - Use the cloned folder for manual installation

## ✅ Post-Installation Setup

### 1. First Launch
- Click the Delta Baba Sniper icon in Chrome toolbar
- Extension popup should open with welcome message
- Review the interface and available options

### 2. Navigate to Delta Exchange
- Go to [delta.exchange](https://delta.exchange)
- Log in to your account (if you have one)
- Navigate to any trading pair page

### 3. Activate Scanner
- Click the Delta Baba Sniper icon again
- Click "🚀 Activate Scanner" button
- Extension should detect the Delta Exchange page
- Chart overlay should appear on the right side

### 4. Configure Settings
- Choose your preferred theme (Trader/Desi Mode)
- Select language (English/Hindi)
- Enable/disable sound alerts
- Choose default timeframe

## 🔒 Permissions Explained

The extension requests the following permissions:

- **activeTab**: Access to current tab for data collection
- **storage**: Save settings and signal history
- **scripting**: Inject content scripts into pages
- **webNavigation**: Monitor page navigation for Delta Exchange

## 🚨 Troubleshooting

### Extension Not Installing
- Ensure Chrome version is 88+
- Check if Developer mode is enabled (for manual install)
- Verify all files are present in the extension folder
- Try restarting Chrome browser

### Extension Not Working on Delta Exchange
- Ensure you're on a valid Delta Exchange page
- Check if the scanner is activated
- Look for error messages in Chrome DevTools console
- Verify extension permissions are granted

### Chart Not Displaying
- Check if TradingView library is loading
- Ensure sufficient data points are available
- Verify timeframe selection is correct
- Check browser console for JavaScript errors

### Performance Issues
- Close unnecessary browser tabs
- Disable other extensions temporarily
- Check system memory usage
- Update Chrome to latest version

## 🔄 Updating the Extension

### Chrome Web Store Version
- Updates are automatic
- Chrome will notify you of available updates
- Click "Update" when prompted

### Manual Installation
- Download new version files
- Remove old extension from Chrome
- Load new version using "Load unpacked"
- Or replace files in existing folder and reload

## 📱 Browser Compatibility

- **Chrome**: ✅ Full support (version 88+)
- **Edge**: ✅ Full support (Chromium-based)
- **Opera**: ✅ Full support (Chromium-based)
- **Firefox**: ❌ Not supported (different extension format)
- **Safari**: ❌ Not supported (different extension format)

## 🆘 Getting Help

If you encounter issues:

1. **Check Documentation**: Review this guide and README.md
2. **Console Errors**: Open Chrome DevTools (F12) and check Console tab
3. **GitHub Issues**: Report bugs on our GitHub repository
4. **Community Support**: Join our trading community for help

## 🎯 Next Steps

After successful installation:

1. **Learn the Interface**: Familiarize yourself with the popup and chart overlay
2. **Test Indicators**: Try different timeframes and observe signals
3. **Customize Settings**: Adjust themes, languages, and alert preferences
4. **Practice Trading**: Use signals for paper trading or small positions
5. **Join Community**: Connect with other traders using the extension

---

**🎉 Congratulations!** You've successfully installed Delta Baba Sniper 18.0. 

**⚠️ Remember**: This extension provides analysis tools only. All trades must be placed manually on Delta Exchange India. Always use proper risk management and conduct your own research.

**Happy Trading! 🚀📈**