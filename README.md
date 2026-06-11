# Yr.no Weather Card for Home Assistant

A responsive, detailed, and visually clean custom weather card for Home Assistant, pulling data directly from the Norwegian Meteorological Institute's Locationforecast 2.0 API (`yr.no`). 

> **Important Note:** This card's code was generated entirely by AI (Perplexity / Gemini) as a guided project. While it works great in my environment, it might contain edge-case bugs, unhandled exceptions, or be untested in specific scenarios. Use it, enjoy it, but be aware of its synthetic origins! 🤖

![Screenshot](https://dummyimage.com/600x400/222/fff&text=Add+a+screenshot+here)

## Features
- **Smart Location Setup:** By default, it inherits latitude/longitude directly from your Home Assistant settings. You can also override this per-card to show weather for anywhere in the world.
- **Detailed Hourly Slider:** Scrollable timeline covering current day up to the next 7+ days. 
- **Intelligent Data Fallback:** If the `yr.no` API provides less detailed data for days further in the future (e.g., only 4 intervals instead of hourly), the card gracefully adapts (indicated by a small dot on detailed days).
- **Responsive Design:** Adapts smoothly between mobile (companion app) and desktop views.
- **Multilingual Support:** Currently supports English (`en`), Polish (`pl`), and Norwegian (`no`).

## Installation

### Method 1: HACS (Recommended)
This is the easiest way to install and keep the card updated.
1. Open Home Assistant and go to **HACS**.
2. Click on **Frontend**.
3. Click the 3 dots in the top right corner and select **Custom repositories**.
4. Paste the URL of this repository: `https://github.com/msztolcman/yrno-weather-card`
5. Select **Dashboard** as the category and click Add.
6. Find "YrNo Weather Card" in HACS, install it, and reload your browser.

### Method 2: Manual
1. Download the `yrno-weather-card.js` file from the latest release.
2. Place the file inside your `<config>/www/` directory.
3. In Home Assistant, go to **Settings** -> **Dashboards** -> **Resources** (requires Advanced Mode enabled in user profile).
4. Add a new resource: `/local/yrno-weather-card.js` and set the type to **JavaScript Module**.
5. Restart Home Assistant or clear your browser cache.

## Configuration

This card requires exactly **0 configuration** to work. By default, it will use your home coordinates, English language, show 7 days of forecast, and display all available details.

### Overriding default location
If you want to display weather for a different city (e.g., for a vacation home), you can specify custom coordinates (`lat` and `lon`). 

**How to find coordinates using OpenStreetMap:**
1. Go to [OpenStreetMap.org](https://www.openstreetmap.org/).
2. Use the search bar to find your desired city or address.
3. **Right-click** exactly where you want the weather forecast for.
4. Click on **"Show address"**.
5. On the left sidebar, the coordinates will appear in the format `Latitude, Longitude` (e.g., `52.2297, 21.0122`).
6. Copy these numbers into your YAML configuration as `lat` and `lon`.

### Full Configuration Example

```yaml
type: custom:yrno-weather-card
lat: 52.2297         # Override latitude (optional)
lon: 21.0122         # Override longitude (optional)
title: "Warsaw"      # Overrides default title
lang: pl             # Options: en, pl, no. Default: en
days: 5              # Max days to show (up to 9). Default: 7
show_wind: false     # Hide wind info. Default: true
show_pressure: false # Hide pressure info. Default: true
show_rain: true      # Default: true
show_thunder: true   # Default: true
```

## Authors
**Marcin Sztolcman** (`marcin@urzenia.net`) – Concept, UI/UX guidelines, and project orchestration.  
**Perplexity AI** – Code writing and CSS styling.

## Contact & Contribution
If you like or dislike this software, please do not hesitate to tell me about it via email (`marcin@urzenia.net`) or open an Issue on GitHub.

## License
MIT License. Feel free to fork, modify, and distribute.
