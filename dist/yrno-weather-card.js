import {
  LitElement,
  html,
  css,
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

const translations = {
  pl: {
    default_title: "Prognoza pogody yr.no",
    today: "Dzisiaj",
    now: "Teraz",
    days: ["Ndz", "Pon", "Wto", "Śro", "Czw", "Pią", "Sob"],
    no_data: "Brak szczegółowych danych na tę godzinę od dostawcy",
    detailed_data: "Dostępna szczegółowa prognoza godzinowa"
  },
  en: {
    default_title: "Yr.no Weather Forecast",
    today: "Today",
    now: "Now",
    days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    no_data: "Detailed data for this hour not provided by the API",
    detailed_data: "Detailed hourly forecast available"
  },
  no: {
    default_title: "Yr.no Værmelding",
    today: "I dag",
    now: "Nå",
    days: ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"],
    no_data: "Detaljerte data for denne timen er ikke levert av API-et",
    detailed_data: "Detaljert timevarsel tilgjengelig"
  }
};

class YrNoWeatherCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {},
      forecastData: { type: Array },
      selectedDayIndex: { type: Number },
      currentTemp: { type: String },
    };
  }

  constructor() {
    super();
    this.forecastData = [];
    this.selectedDayIndex = 0; // Default selection is today

    // Safe defaults
    this.config = {
      lang: "en",
      days: 7,
      show_wind: true,
      show_pressure: true,
      show_rain: true,
      show_thunder: true,
    };
  }

  setConfig(config) {
    if (!config) return;
    this.config = {
      title: config.title,
      lang: config.lang !== undefined ? config.lang : "en",
      days: config.days !== undefined ? Math.min(config.days, 9) : 7,
      show_wind: config.show_wind !== undefined ? config.show_wind : true,
      show_pressure: config.show_pressure !== undefined ? config.show_pressure : true,
      show_rain: config.show_rain !== undefined ? config.show_rain : true,
      show_thunder: config.show_thunder !== undefined ? config.show_thunder : true,
      lat: config.lat, // Custom Latitude
      lon: config.lon, // Custom Longitude
      ...config,
    };
  }

  async updated(changedProperties) {
    if (changedProperties.has("hass") && this.hass && this.forecastData.length === 0) {
      // Use configured lat/lon if provided, otherwise fallback to Home Assistant location
      const lat = this.config.lat !== undefined ? this.config.lat : this.hass.config.latitude;
      const lon = this.config.lon !== undefined ? this.config.lon : this.hass.config.longitude;
      await this.fetchWeatherData(lat, lon);
    }
  }

  async fetchWeatherData(lat, lon) {
    try {
      const response = await fetch(`https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`, {
        headers: { 'User-Agent': 'HomeAssistantYrNoCard/1.0 github.com/user/yrno-card' }
      });
      const data = await response.json();
      this.processData(data);
    } catch (error) {
      console.error("Error fetching Yr.no data:", error);
    }
  }

  getWeatherIcon(symbolCode) {
    if (!symbolCode) return 'mdi:weather-cloudy';
    const base = symbolCode.split('_')[0];
    const isNight = symbolCode.includes('_night');
    const map = {
      clearsky: isNight ? 'mdi:weather-night' : 'mdi:weather-sunny',
      fair: isNight ? 'mdi:weather-night-partly-cloudy' : 'mdi:weather-partly-cloudy',
      partlycloudy: isNight ? 'mdi:weather-night-partly-cloudy' : 'mdi:weather-partly-cloudy',
      cloudy: 'mdi:weather-cloudy',
      lightrain: 'mdi:weather-rainy',
      rain: 'mdi:weather-pouring',
      heavyrain: 'mdi:weather-pouring',
      snow: 'mdi:weather-snowy',
      sleet: 'mdi:weather-snowy-rainy',
      fog: 'mdi:weather-fog',
      thunder: 'mdi:weather-lightning-rainy'
    };
    return map[base] || 'mdi:weather-cloudy';
  }

  processData(data) {
    const timeseries = data.properties.timeseries;
    const dailyData = {};

    // Extract current immediate temperature
    if (timeseries.length > 0) {
      this.currentTemp = timeseries[0].data.instant.details.air_temperature.toFixed(1);
    }

    timeseries.forEach(entry => {
      // Automatic local timezone conversion
      const dateObj = new Date(entry.time);

      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const localDateStr = `${year}-${month}-${day}`;
      const timeHour = String(dateObj.getHours()).padStart(2, '0') + ':00';

      if (!dailyData[localDateStr]) {
        dailyData[localDateStr] = {
          date: dateObj, 
          temps: [], wind: [], pressure: [],
          rain: 0, thunder: false, symbol_code: null,
          hourlyMap: {} 
        };
      }

      const details = entry.data.instant.details;
      const period = entry.data.next_1_hours || entry.data.next_6_hours || entry.data.next_12_hours;

      dailyData[localDateStr].temps.push(details.air_temperature);
      if(details.wind_speed) dailyData[localDateStr].wind.push(details.wind_speed);
      if(details.air_pressure_at_sea_level) dailyData[localDateStr].pressure.push(details.air_pressure_at_sea_level);

      // Try to get representative symbol around local noon (12:00)
      if (period && period.summary) {
        if (!dailyData[localDateStr].symbol_code || dateObj.getHours() === 12) {
          dailyData[localDateStr].symbol_code = period.summary.symbol_code;
        }
      }

      if (period && period.details && period.details.precipitation_amount) {
        dailyData[localDateStr].rain += period.details.precipitation_amount;
      }
      if (period && period.summary && period.summary.symbol_code && period.summary.symbol_code.includes("thunder")) {
         dailyData[localDateStr].thunder = true;
      }

      const hourlyRain = entry.data.next_1_hours?.details?.precipitation_amount || 
                         (entry.data.next_6_hours?.details?.precipitation_amount ? entry.data.next_6_hours.details.precipitation_amount / 6 : 0);

      dailyData[localDateStr].hourlyMap[timeHour] = {
        time: timeHour,
        temp: details.air_temperature.toFixed(0),
        icon: this.getWeatherIcon(period ? period.summary.symbol_code : null),
        rain: hourlyRain > 0 ? hourlyRain.toFixed(1) : 0,
        isMissing: false
      };
    });

    const sortedDateKeys = Object.keys(dailyData).sort();

    this.forecastData = sortedDateKeys.slice(0, this.config.days).map((dateKey, index) => {
      const day = dailyData[dateKey];
      let filledHourly = [];

      const availableHours = Object.keys(day.hourlyMap).map(h => parseInt(h));
      // Rule: if API provided at least 6 points for a day, it's "Detailed". Otherwise "Sparse".
      const isDetailed = availableHours.length >= 6; 

      if (isDetailed) {
        // Detailed Mode: Fill the grid up to 23:00 to keep the scrollbar consistent
        const firstHour = (index === 0 && availableHours.length > 0) ? Math.min(...availableHours) : 0;
        for (let h = firstHour; h <= 23; h++) {
          const hStr = String(h).padStart(2, '0') + ':00';
          if (day.hourlyMap[hStr]) {
            filledHourly.push(day.hourlyMap[hStr]);
          } else {
            // Gap - no data provided by API for this specific hour
            filledHourly.push({
              time: hStr,
              temp: '-',
              icon: 'mdi:dots-horizontal', 
              rain: 0,
              isMissing: true
            });
          }
        }
      } else {
        // Sparse Mode: Only show what the API provides (e.g., 4 intervals), no fillers
        availableHours.sort((a,b) => a - b).forEach(h => {
          const hStr = String(h).padStart(2, '0') + ':00';
          filledHourly.push(day.hourlyMap[hStr]);
        });
      }

      return {
        date: day.date,
        tempMax: Math.max(...day.temps),
        tempMin: Math.min(...day.temps),
        windMax: Math.max(...day.wind).toFixed(1),
        pressureAvg: (day.pressure.reduce((a, b) => a + b, 0) / day.pressure.length).toFixed(0),
        rainTotal: day.rain.toFixed(1),
        thunder: day.thunder,
        icon: this.getWeatherIcon(day.symbol_code),
        hourly: filledHourly,
        isDetailed: isDetailed
      };
    });
  }

  // Helper method to reset selected index explicitly and trigger render
  selectDay(index) {
    this.selectedDayIndex = index;
    this.requestUpdate();
  }

  render() {
    if (!this.forecastData.length) {
      return html`<ha-card><div class="loading">Loading Yr.no data...</div></ha-card>`;
    }

    const t = translations[this.config.lang] || translations.en;
    const cardTitle = this.config.title !== undefined ? this.config.title : t.default_title;
    const selectedDayData = this.forecastData[this.selectedDayIndex];

    return html`
      <ha-card>
        <div class="card-content">
          ${cardTitle ? html`<div class="card-header">${cardTitle}</div>` : ""}

          <div class="layout-top-grid">
            <!-- LEFT: Main Display -->
            <div class="main-display">
              <div class="main-info">
                <ha-icon class="main-icon" icon="${selectedDayData.icon}"></ha-icon>
                <div class="main-temp-block">
                  <span class="main-temp">${this.selectedDayIndex === 0 ? this.currentTemp : selectedDayData.tempMax.toFixed(1)}°</span>
                  <span class="main-desc">${this.selectedDayIndex === 0 ? t.now : t.days[selectedDayData.date.getDay()]}</span>
                </div>
              </div>

              <div class="main-details">
                ${this.config.show_rain ? html`
                  <div class="detail-pill"><ha-icon icon="mdi:water-outline"></ha-icon> ${selectedDayData.rainTotal} mm</div>` : ""}
                ${this.config.show_wind ? html`
                  <div class="detail-pill"><ha-icon icon="mdi:weather-windy"></ha-icon> ${selectedDayData.windMax} m/s</div>` : ""}
                ${this.config.show_pressure ? html`
                  <div class="detail-pill"><ha-icon icon="mdi:gauge"></ha-icon> ${selectedDayData.pressureAvg} hPa</div>` : ""}
              </div>
            </div>

            <!-- RIGHT: Days Tiles -->
            <div class="days-selector-wrapper">
              <div class="days-selector">
                ${this.forecastData.map((day, index) => html`
                  <div class="day-tile ${this.selectedDayIndex === index ? 'selected' : ''}" @click=${() => this.selectDay(index)}>
                    <div class="tile-header">
                      <span class="tile-name">${index === 0 ? t.today : t.days[day.date.getDay()]}</span>
                      ${day.isDetailed ? html`<div class="detail-dot" title="${t.detailed_data}"></div>` : ""}
                    </div>
                    <ha-icon class="tile-icon" icon="${day.icon}"></ha-icon>
                    <div class="tile-temps">
                      <span class="t-max">${day.tempMax.toFixed(0)}°</span>
                      <span class="t-min">${day.tempMin.toFixed(0)}°</span>
                    </div>
                  </div>
                `)}
              </div>
            </div>
          </div>

          <!-- BOTTOM: Hourly Forecast -->
          <div class="hourly-slider-wrapper">
            <div class="hourly-slider">
              ${selectedDayData.hourly.map(hour => html`
                <div class="hour-block ${hour.isMissing ? 'missing-data' : ''}" title="${hour.isMissing ? t.no_data : ''}">
                  <span class="h-time">${hour.time}</span>
                  <ha-icon class="h-icon" icon="${hour.icon}"></ha-icon>
                  <span class="h-temp">${hour.isMissing ? '-' : hour.temp + '°'}</span>
                  ${hour.rain > 0 && !hour.isMissing ? html`<span class="h-rain">${hour.rain}</span>` : html`<span class="h-rain-empty">&nbsp;</span>`}
                </div>
              `)}
            </div>
          </div>

        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      ha-card { overflow: hidden; }
      .card-content { padding: 16px 20px; }
      .card-header { font-size: 16px; font-weight: 500; color: var(--secondary-text-color); margin-bottom: 16px; }
      .loading { padding: 24px; text-align: center; color: var(--secondary-text-color); }

      .layout-top-grid {
        display: flex;
        flex-direction: column;
        gap: 20px;
        margin-bottom: 16px; /* Reduced for better mobile spacing */
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
        padding-bottom: 16px;
      }

      @media (min-width: 600px) {
        .layout-top-grid {
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 20px;
        }
        .main-display {
          flex: 0 0 auto;
          margin-bottom: 0;
          border-right: 1px solid var(--divider-color, #e0e0e0);
          padding-right: 24px;
        }
        .days-selector-wrapper {
          flex: 1 1 auto;
          min-width: 0; 
          padding-left: 8px;
        }
      }

      .main-display { display: flex; flex-direction: column; gap: 16px; }
      .main-info { display: flex; align-items: center; gap: 16px; }
      .main-icon { --mdc-icon-size: 56px; color: var(--state-icon-color, var(--primary-color)); }
      .main-temp-block { display: flex; flex-direction: column; }
      .main-temp { font-size: 42px; font-weight: 400; line-height: 1; color: var(--primary-text-color); }
      .main-desc { font-size: 14px; color: var(--secondary-text-color); margin-top: 4px; }
      .main-details { display: flex; flex-wrap: wrap; gap: 8px; }
      .detail-pill { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--secondary-text-color); background: var(--secondary-background-color); padding: 4px 10px; border-radius: 12px; }
      .detail-pill ha-icon { --mdc-icon-size: 16px; color: var(--primary-color); }

      .days-selector-wrapper { 
        width: 100%; 
        min-height: 90px; /* Force minimum height so it doesn't collapse on mobile */
      }

      .days-selector {
        display: flex;
        overflow-x: auto;
        gap: 10px;
        padding-bottom: 8px;
      }

      .days-selector::-webkit-scrollbar,
      .hourly-slider::-webkit-scrollbar {
        height: 6px;
      }
      .days-selector::-webkit-scrollbar-track,
      .hourly-slider::-webkit-scrollbar-track {
        background: rgba(var(--rgb-primary-text-color), 0.05);
        border-radius: 4px;
      }
      .days-selector::-webkit-scrollbar-thumb,
      .hourly-slider::-webkit-scrollbar-thumb {
        background: rgba(var(--rgb-primary-text-color), 0.2);
        border-radius: 4px;
      }
      .days-selector::-webkit-scrollbar-thumb:hover,
      .hourly-slider::-webkit-scrollbar-thumb:hover {
        background: rgba(var(--rgb-primary-text-color), 0.4);
      }

      .day-tile { display: flex; flex-direction: column; align-items: center; min-width: 65px; padding: 10px 8px; border-radius: 12px; background: transparent; cursor: pointer; transition: background 0.2s, outline 0.2s; border: 1px solid transparent; flex-shrink: 0; }
      .day-tile:hover { background: var(--secondary-background-color); }
      .day-tile.selected { background: rgba(var(--rgb-primary-color), 0.1); border: 1px solid var(--primary-color); }

      .tile-header { display: flex; align-items: center; gap: 4px; margin-bottom: 8px; }
      .tile-name { font-size: 13px; font-weight: 500; }
      .detail-dot { width: 6px; height: 6px; background-color: var(--primary-color); border-radius: 50%; }

      .tile-icon { --mdc-icon-size: 28px; color: var(--state-icon-color, var(--primary-color)); margin-bottom: 8px; }
      .tile-temps { display: flex; gap: 6px; font-size: 13px; }
      .t-max { font-weight: 500; color: var(--primary-text-color); }
      .t-min { color: var(--secondary-text-color); }

      .hourly-slider-wrapper {
        width: 100%;
        min-height: 80px; /* Prevents height collapsing to 0 on Android App */
        display: block;
      }

      .hourly-slider {
        display: flex;
        overflow-x: scroll;
        gap: 16px;
        padding-bottom: 12px; 
        cursor: grab;
      }
      .hourly-slider:active { cursor: grabbing; }

      .hour-block { display: flex; flex-direction: column; align-items: center; min-width: 45px; flex-shrink: 0; }
      .hour-block:last-child { padding-right: 8px; }

      .hour-block.missing-data { opacity: 0.5; cursor: help; }
      .hour-block.missing-data .h-icon { color: var(--disabled-text-color, #9e9e9e); }
      .hour-block.missing-data .h-temp { color: var(--disabled-text-color, #9e9e9e); }

      .h-time { font-size: 12px; color: var(--secondary-text-color); margin-bottom: 8px; }
      .h-icon { --mdc-icon-size: 24px; color: var(--state-icon-color, var(--primary-color)); margin-bottom: 8px; }
      .h-temp { font-size: 14px; font-weight: 500; margin-bottom: 4px; }
      .h-rain { font-size: 11px; color: var(--info-color, #2196f3); }
      .h-rain-empty { font-size: 11px; user-select: none; }
    `;
  }
}

customElements.define("yrno-weather-card", YrNoWeatherCard);
