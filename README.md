# 🌧️ RainSmart – AI-Powered Intelligent Rainwater Harvesting & Urban Water Management System

**Production-Grade Hackathon Platform – Real-Time Data Architecture**

RainSmart is an advanced, full-stack environmental web platform engineered to model, compute, and optimize rooftop rainwater harvesting (RWH), dynamic dual-reservoir storage, automated overflow diversion, domestic water consumption, and groundwater percolation recharge for urban infrastructure.

---

## ⚡ How to Run the Application

You can run RainSmart in **two modes**:

### Mode A: Full-Stack Mode with Live AI Proxy (Recommended)
This runs the zero-dependency Node.js backend server (`server.js`) which securely hosts the application and proxies AI questions to **Google Gemini 1.5 Flash** without exposing keys to the client:
```bash
# 1. Start the server
node server.js
# Or with npm:
npm start

# 2. Open in browser:
http://localhost:3000
```
- Automatically reads `GEMINI_API_KEY` from `.env` or `.env.example`.
- Static files served with full CORS headers.
- Endpoints:
  - `POST /api/chat` (Google Gemini AI proxy with real hydrological telemetry)
  - `GET /api/status` (Health & configuration check)

### Mode B: Client-Only Mode via VS Code Live Server
1. Open this workspace in **VS Code**.
2. Right-click [`index.html`](./index.html) and click **"Open with Live Server"**.
3. The site opens at `http://127.0.0.1:5500`.
4. Open-Meteo Forecast and Historical Archive APIs run directly in the browser.
5. If `server.js` is also running on port 3000, the AI Chatbot automatically routes to `http://localhost:3000/api/chat`. If `server.js` is offline, it seamlessly falls back to the client-side **Hydrology Expert Rule Engine**.

---

## 🚀 Real-Time Meteorological & Hydrological Data Integrations

### 1. 🔍 Universal Location Search & Geocoding API
- **Provider**: Open-Meteo Geocoding API + Regional Karnataka Gazetteer
- **Endpoint**: `https://geocoding-api.open-meteo.com/v1/search?name={query}&count=10&language=en&format=json`
- **Capabilities**:
  - **Search Any Location**: Major cities, small cities, towns, suburban areas, villages, taluks, and districts worldwide (e.g. Moodbidri, Mangaluru, Bantwal, Mulki, Udupi, Puttur, Belthangady, Vittal, Alike, and nearby villages).
  - **Dynamic Suggestions Dropdown**: Debounced autocomplete (280ms) with keyboard navigation (Arrow Up/Down, Enter, Esc).
  - **Explicit User Selection**: Never automatically picks the first match when multiple places exist; displays village/town name, district, state, and country so users choose the exact target.
  - **Spelling Variation & Transliteration Engine**: Gracefully handles spelling aliases (e.g., `Moodbidri` $\leftrightarrow$ `Mudbidri`, `Mangalore` $\leftrightarrow$ `Mangaluru`, `Bantwal` $\leftrightarrow$ `Bantval`, `Udupi` $\leftrightarrow$ `Udipi`, `Belthangady` $\leftrightarrow$ `Beltangadi`).
  - **Direct GPS Coordinates**: Supports entering latitude/longitude directly (e.g., `13.0665, 74.9953`).
  - **1-Click Quick Tags**: Dedicated quick tags for Karnataka locations (Moodbidri, Mangaluru, Udupi, Bantwal, Puttur, Alike, Bengaluru) on the dashboard.
  - **Local Persistence**: Stores user's selected location in `localStorage` under `rainsmart_selected_location_v2` and restores it on page refresh.

### 2. 🌦️ Real-Time Weather & Meteorological Forecast API
- **Provider**: Open-Meteo Weather Forecast API
- **Endpoint**: `https://api.open-meteo.com/v1/forecast`
- **Parameters**: `latitude={lat}&longitude={lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&hourly=precipitation,precipitation_probability&daily=weather_code,precipitation_sum,precipitation_probability_max&past_days=7&forecast_days=7&timezone=auto`
- **Real Data Delivered**:
  - **Current & Apparent Temperature**: Exact temperature and Apparent ("Feels like") temperature based on atmospheric humidity and wind speed.
  - **Relative Humidity & Wind Speed**: Real-time atmospheric telemetry.
  - **Current Precipitation Rate**: Instantaneous precipitation intensity ($mm/h$).
  - **24-Hour Forecast Rain**: Forecast precipitation sum directly from numerical weather prediction models.
  - **7-Day Daily Forecast**: Authentic forward precipitation sums and confidence intervals.
  - **Hourly Precipitation**: Hourly breakdown for peak rainfall analysis.
  - **Past 7 Days Observed Rain**: Real observed precipitation used in the Daily Usage Analytics view.
  - **Location-Specific Catchment Modeling**: Recalculates estimated collection ($V = R \times A \times C$), potential harvest, and tank fill times for that specific location.
  - **Automatic Refresh**: Live meteorological data re-syncs every 30 minutes automatically.
  - **Manual Sync**: Topbar **"Refresh Data"** button immediately fetches the latest atmospheric packets.

### 3. 🏛️ Historical Weather Archive API
- **Provider**: Open-Meteo Historical Weather Archive API
- **Endpoint**: `https://archive-api.open-meteo.com/v1/archive`
- **Parameters**: `latitude={lat}&longitude={lon}&start_date={YYYY-01-01}&end_date={YYYY-12-31}&daily=precipitation_sum&timezone=auto`
- **Real Data Delivered**:
  - Fetches actual daily precipitation sums across all 365 days of the latest completed calendar year from European ERA5 and ERA5-Land atmospheric reanalysis.
  - **Authentic Monthly Aggregation**: Computes true monthly totals for January through December from daily observations. August and September reflect actual observed rainfall records.
  - **Location-Specific Climatology**: Accurately reflects regional climate differences (e.g. Coastal Karnataka / Moodbidri receiving ~4,200 mm annual rainfall with a peak July of >1,000 mm, vs. interior Deccan plateau Bengaluru receiving ~1,035 mm).
  - **Persistent Local Caching**: Caches records in `localStorage` under `rainsmart_archive_{city}_{year}` to optimize network performance and avoid rate limits.
  - **Zero Fabrication**: Replaced hardcoded monthly factor models with authentic observations.

### 3. 🤖 Conversational AI Water Advisor (Google Gemini Multi-Model Chain)
- **Backend Architecture**: Node.js zero-dependency HTTP/HTTPS proxy in `server.js` (`POST /api/chat`).
- **Multi-Model Reliability Chain**: Automatically fails over across `gemini-3.5-flash` $\rightarrow$ `gemini-flash-lite-latest` $\rightarrow$ `gemini-3.5-flash-lite` $\rightarrow$ `gemini-3.8-flash` if quota or demand limits occur.
- **Conversational Memory**: Retains multi-turn dialogue history so users can ask contextual follow-up inquiries (e.g., *"What happens if the secondary tank overflows too?"*).
- **Security Standard**: Secret API keys remain strictly server-side in `.env` and are **never exposed to frontend HTML/JS**.
- **Context Telemetry Injection**: The proxy dynamically injects live system parameters (catchment area, runoff coefficient, event rainfall, primary & secondary tank levels, 24h storm forecast, and autonomy days) into Gemini's system instructions.
- **Transparent Fallback**: If the server is offline or no key is configured, inquiries route cleanly to the built-in **Hydrology Expert Rule Engine** with clear provenance attribution.

### 4. 🛢️ Smart Dual-Tank Monitoring & Automated Overflow Diversion
- **Primary & Secondary Reservoirs**: Configurable capacities and real-time stored volume tracking.
- **Automated Diversion Sequence**:
  $$\text{Primary Inflow} = \min(Q_{\text{in}}, \text{Headroom}_1)$$
  $$\text{Diverted to Secondary} = \min(Q_{\text{in}} - \text{Primary Inflow}, \text{Headroom}_2)$$
  $$\text{Groundwater Recharge Overflow} = \max(0, Q_{\text{in}} - \text{Primary Inflow} - \text{Diverted to Secondary})$$
- **Hardware Sensor Transparency**:
  - Telemetry badge honestly indicates: `SENSOR NOT CONNECTED`.
  - Tank Liquid Column Depth shows `Hardware sensor not connected`.
  - Water Temperature & Turbidity show `Sensor not connected`.
  - Flow rates are mathematically computed and labeled `ESTIMATED DATA (L/min)`.
  - Manual capacity and water level controls remain fully configurable by the user.
- **Zero Fabrication**: Eliminated fake `Math.random()` noise and artificial sensor jitter.

### 5. 🏷️ Data Provenance & Source Transparency Tagging
Every section across RainSmart features clear, standardized badges to prevent misleading users or evaluators:
- `LIVE WEATHER`: Real-time weather fetched via Open-Meteo Forecast API.
- `HISTORICAL DATA`: Authentic ERA5 reanalysis data fetched via Open-Meteo Archive API.
- `WEATHER FORECAST`: Forward 7-day numerical precipitation prediction.
- `ESTIMATED DATA`: Derived from scientific hydrological formulas ($V = R \times A \times C$).
- `DATA UNAVAILABLE`: Displayed whenever network connectivity or API data is missing (no silent synthetic replacement).
- `SENSOR NOT CONNECTED`: Transparently displays that physical IoT probes (ultrasonic/turbidity) are absent.

### 5. 🏢 Multiple Rooftop Scientific Calculator
- **Catchment Formula**:
  $$\mathbf{Collected\ Water\ (L) = Rainfall\ (mm) \times Roof\ Area\ (m^2) \times Runoff\ Coefficient}$$
- **Multi-Catchment Aggregation**:
  $$\text{Net Harvest} = \sum_{i=1}^{n} \left[ \max(0, R - \text{Flush}) \times A_i \times C_i \right]$$
- Supports custom rooftops (Main Villa, Terrace, Garage, Shed, Courtyard) with distinct runoff coefficients ($C = 0.50 - 0.90$).

### 6. 📈 Consumption Analytics & Time Series
- **Daily View (7 Days)**: Uses actual daily precipitation observations from Open-Meteo `past_days=7`.
- **Weekly View (4 Weeks)**: Aggregates recent calendar weeks dynamically.
- **Monthly View (12 Months)**: Uses authentic monthly sums from the Open-Meteo Historical Archive API.
- **Financial & Ecological ROI**: Computes cost offset against municipal water rates (₹90/kL) and carbon emissions saved ($0.72\text{ kg CO}_2\text{e/kL}$).

---

## 📂 Project Architecture

```
hackathaon/
├── .env                # Secure server environment configuration (GEMINI_API_KEY, PORT)
├── .env.example        # Environment variable template
├── index.html          # Responsive single-page application with 8 views
├── package.json        # NPM project scripts (npm start -> node server.js)
├── README.md           # Technical documentation and audit report
├── script.js           # Client-side hydrology engine, Chart.js renderers & API integrations
├── server.js           # Zero-dependency Node.js static server & Gemini AI proxy
└── style.css           # Premium environmental UI stylesheet
```

---

## ⚙️ Environment Variables

Create or update `.env` in the root folder:
```env
PORT=3000

```

---

## 🏆 Demonstration Walkthrough for Hackathon Judges

1. **Dashboard & Meteorological Synchronization**:
   - Verify the dynamic topbar system date, city selector, and live Open-Meteo weather badge.
   - Note the **Current Precipitation Rate** ($mm/h$) and 24h rainfall forecast.
   - Click **"Refresh Data"** in the topbar to see instant synchronization with live weather and historical archive APIs.
2. **Rainfall vs. Harvest Potential Chart**:
   - Hover over the 12-month bars: values represent verified historical observations from the **Open-Meteo Historical Weather Archive API** (ERA5 reanalysis) for the selected city.
   - Notice that August, September, and all months display authentic historical rainfall depths rather than fixed percentages.
3. **Multiple Rooftop Catchment Calculator**:
   - Add multiple distinct surfaces with unique coefficients ($C = 0.90$ for metal, $0.80$ for concrete).
   - Click **"Apply Combined Multi-Roof Harvest to Tank"**.
4. **Smart Dual-Tank Monitoring & Automated Overflow Diversion**:
   - Demonstrate the dual visual liquid stages.
   - Click **"Run Animated Diversion Demo"**: watch Primary fill to 100%, the automated diverter valve switch to `ACTIVE`, excess water transfer to the Secondary tank, and cloudburst overflow safely infiltrate into the Groundwater Recharge Pit.
   - Inspect the **Hydrological Reservoir Telemetry** card: verify that liquid height, inflow rate, and outflow rate are calculated from deterministic physical formulas.
5. **AI Water Advisor Dialogue**:
   - Click a quick prompt (e.g. *"Prevent Monsoon Overflow?"* or *"Explain My Calculation"*).
   - If running `node server.js`, the response is generated securely by **Google Gemini 1.5 Flash**.
   - If running client-only, the response is generated instantaneously by the **RainSmart Hydrology Expert Engine** with transparent attribution.
6. **Water Audit Report Export**:
   - Click **"Export CSV"** to download `RainSmart_Water_Audit_[City]_[Date].csv` with verified data.
