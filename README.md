# 🌧️ RainSmart – AI-Powered Intelligent Rainwater Harvesting & Urban Water Management System

**Upgraded, Enterprise-Grade Hackathon Platform**

RainSmart is a responsive, client-side web application engineered to model, compute, and optimize rooftop rainwater harvesting (RWH), dynamic storage reservoirs, domestic water consumption, and groundwater percolation recharge for urban buildings.

---

## ⚡ How to Run Using VS Code Live Server

1. Open this project folder (`c:\Users\VAISHAK I\OneDrive\Documents\hackathaon`) in **VS Code**.
2. Make sure the **Live Server** extension (by Ritwick Dey) is installed in VS Code.
3. Right-click on [`index.html`](./index.html) in the file explorer and select **"Open with Live Server"** (or click **"Go Live"** in the bottom status bar).
4. The application will launch automatically in your browser at `http://127.0.0.1:5500/index.html`.
5. Every feature works seamlessly out-of-the-box with zero build configuration or backend installation needed.

---

## 🚀 Key Features Implemented & Integrated

### 1. 🌦️ Live Weather and Rainfall Forecast
- **Open-Meteo Live API Integration**: Completely free, CORS-enabled, public meteorological API requiring **no paid API keys** or signups.
- **Atmospheric Telemetry**: Displays current temperature (°C), weather conditions, wind speed, relative humidity, 24-hour rainfall forecast (mm), and probability of rain (%).
- **Automated Collection Modeling**: Automatically multiplies forecasted rain depth with the building's active roof area to predict harvestable liters.
- **7-Day Meteorological Outlook**: Day-by-day precipitation and collection potential forecast cards.
- **City Switcher**: 1-click presets for major urban hubs (Bengaluru, Mumbai, Delhi, Chennai, Hyderabad, London, New York) or custom coordinates.
- **Demonstration Fallback**: Transparent toggle between **📡 Live Open-Meteo API** and **🧪 Calibrated Demo Mode** with clearly labeled status badges.
- **Transfer Forecast Button**: 1-click button to load the forecasted rain depth directly into the Rooftop Calculator.

### 2. 🛢️ Smart Dual-Tank Monitoring & Automated Overflow Diversion System
- **Dual Reservoir Architecture**: Full support for both a **Primary Tank (Main Catchment)** and a **Secondary Tank (Auxiliary Storage)** with user-customizable capacities and manual level controls.
- **Automated Hydraulic Overflow Diversion**:
  - Automatically calculates inflow allocations using pure hydrological equations:
    $$\text{Primary Inflow} = \min(Q_{\text{in}}, \text{Headroom}_1)$$
    $$\text{Diverted to Secondary} = \min(Q_{\text{in}} - \text{Primary Inflow}, \text{Headroom}_2)$$
    $$\text{Groundwater Recharge Overflow} = \max(0, Q_{\text{in}} - \text{Primary Inflow} - \text{Diverted to Secondary})$$
  - When the Primary Tank reaches 100%, the automated smart valve triggers **OPEN**, routing excess water into the Secondary Tank.
  - When the Secondary Tank also reaches 100%, the tertiary spillway safely discharges surplus water to groundwater recharge percolation pits.
- **Dual Visual Level Indicators**:
  - Independent animated fluid liquid waves for both tanks with measurement ticks, individual volume counters, and fill percentages.
  - Interconnecting **Smart Solenoid Valve & Diversion Pipe Conduit** with animated directional flow pulses when active.
  - Tertiary Recharge Pit node displaying real-time aquifer infiltration.
- **Combined System Metrics**:
  - Real-time display of **Total Stored Water**, **Total Storage Capacity**, **Remaining Available Headroom Space**, and **Total Autonomy Days**.
- **Interactive Diversion Simulation Studio**:
  - **"Run Animated Diversion Demo"**: 3-stage animated storm demonstration showing Primary filling to 100%, smart valve triggering open to fill Secondary, and cloudburst spill recharging groundwater aquifers.
  - **"Inject Storm Pulse (+5,000 L)"**: Instant storm pulse testing automated diversion routing.
  - **Custom Inflow Tester**: Test any user-defined inflow volume (e.g. 8,000 L) and view the exact liter allocation in the live **Diversion Calculation Ledger**.
- **Smart Active Alerts for Dual Tanks**:
  - 🚨 **Primary Tank Full (100%)**: Triggers when Primary reaches capacity and smart valve is actively diverting.
  - ℹ️ **Secondary Tank Filling**: Triggers when auxiliary storage is capturing diverted overflow.
  - ⚠️ **Dual Reservoir Storage Full (100%)**: Triggers when both reservoirs are full and overflow is spilling to percolation recharge.
- **Simulated IoT Telemetry Stream**: Explicitly labeled as **"Simulated IoT Telemetry (Ultrasonic JSN-SR04T Sensor)"** with:
  - Ultrasonic Water Depth ($m$ with real-time microscopic fluctuation)
  - Water Temperature (°C)
  - Turbidity & Clarity Index (NTU, indicating potable clarity)
  - Inflow & Outflow Flow Rate Sensors (L/min)
  - Telemetry Stream Pause / Resume toggle button.
- **Clear Software Simulation Labeling**: Clearly identified as a software simulation across the UI, indicating that physical valves, sensors, and actuators are simulated.

### 3. 📈 Water Consumption Analytics
- **Multi-Timeframe Time Series**: Switch between **Daily (7 Days)**, **Weekly (4 Weeks)**, and **Monthly (12 Months)** views.
- **Chart.js Dual Visualizations**:
  - Bar charts comparing **Rainwater Harvested (L)** vs. **Domestic Water Consumed (L)**.
  - Smooth line chart tracing the **Net Storage Reserve (L)** over time.
- **Financial & Ecological Counters**: Cumulative rainwater collected, consumed, remaining storage, and net financial savings (₹) vs. municipal tanker rates.
- **Historical Telemetry Log Table**: Detailed breakdown with individual period entries and a dedicated **Download CSV Log** button.

### 4. 🤖 AI Water Advisor (Interactive Chatbot)
- **Chatbot Dialogue Interface**: Interactive message stream with user bubbles, AI assistant bubbles, and typing status indicator.
- **Contextual Live Data Awareness**: The AI engine directly accesses the live website state (current stored volume, capacity, days of autonomy, number of rooftops, and forecasted rainfall) when generating recommendations.
- **Security & Privacy Architecture**:
  - Adheres strictly to enterprise security standards: **No secret API keys are exposed in frontend JavaScript**.
  - Provides a configuration drawer to connect an optional secure backend proxy endpoint (e.g. `http://localhost:5000/api/chat` or AWS Lambda / Express proxy).
  - Built-in **Expert Hydrology Rule Engine** acts as an instant, 100% free, local fallback whenever no backend is configured.
- **Interactive Quick Inquiries**: Fast 1-click prompts for rapid judge demonstrations (e.g. *"Prevent monsoon overflow?"*, *"Explain my calculation"*, *"Water coverage duration?"*, *"Multi-rooftop guide"*).

### 5. 🏢 Multiple Rooftop Calculator
- **Dynamic Multi-Rooftop System**:
  - Add as many distinct rooftops as needed (e.g., Main Villa, Terrace Concrete Slab, Garage Outbuilding, Garden Shed).
  - Specify custom **Rooftop Name**, **Catchment Area ($m^2$)**, and **Runoff Coefficient ($C$)** for each roof.
  - Deleting or adding rooftops dynamically updates the combined total area and weighted runoff coefficient.
- **Scientific Hydrological Calculation**:
  $$\mathbf{Collected\ Water\ (L) = Rainfall\ (mm) \times Roof\ Area\ (m^2) \times Runoff\ Coefficient}$$
  - First-flush deduction ($1.5\text{ mm}$) to bypass soot and dust.
- **Combined Impact**: Shows individual rooftop yields and combined total harvest with an **"Apply Combined Multi-Roof Harvest to Tank"** button.

### 6. 🚨 Smart Alerts Notification Engine
- **Automated Rule Evaluation**: Continuously scans reservoir storage, weather forecasts, and consumption rates:
  - 🚨 **Critical**: Low Tank Reserve Alert ($<20\%$ capacity or $<4$ days coverage).
  - ⚠️ **Warning**: Overflow Risk Alert ($>85\%$ capacity or forecast storm exceeds available headroom).
  - 🌧️ **Info**: Heavy Rainfall Storm Advisory ($>50\text{ mm}$ predicted).
  - 💧 **Warning**: High Domestic Deficit (Daily demand outpaces replenishment).
  - ✅ **Success**: Aquifer Groundwater Recharge Active (Surplus safely directed to percolation pits).
- **Notification Bell & Flyout Menu**: Topbar bell icon with animated unread count badge and flyout list.
- **Dismissible Alerts**: Each alert can be dismissed individually (✕) or cleared with **"Dismiss All"**.
- **Contextual Actions**: Alerts include 1-click navigation buttons directly to relevant views (e.g. *"Check Overflow Pit"*, *"View Forecast"*).

### 7. 📑 Reports and Downloads
- **CSV Data Export**:
  - Generates and downloads `RainSmart_Water_Audit_[City]_[Date].csv` with complete hydrological parameters, rooftop inventory, storage telemetry, demand demographics, 7-day logs, and financial savings.
- **Print / PDF Audit Report**:
  - Printable certified engineering assessment layout (Grade A Feasibility) with clean `@media print` styling that hides navigation and highlights tables and totals.

---

## 📂 Modified & Updated Files

| File | Changes Made |
| :--- | :--- |
| [`index.html`](./index.html) | Upgraded navigation to 8 tabs; integrated topbar weather chip and smart alerts bell with flyout; added Live Weather view with Open-Meteo cards; added Multi-Rooftop mode to Calculator; integrated Simulated IoT sensor telemetry panel into Tank tab; added Water Consumption Analytics view with daily/weekly/monthly tables; added Chatbot interface to AI Advisor; added CSV download buttons. |
| [`style.css`](./style.css) | Added styling for the live weather hero card, city chips, 7-day forecast grid; styled topbar alert bell, flyout menu, and alert severity tags; styled multi-rooftop item cards; styled IoT telemetry sensor metric boxes and pulsing indicators; styled analytics timeframe switcher buttons; styled chatbot dialogue bubbles and security notice callouts. |
| [`script.js`](./script.js) | Implemented Open-Meteo fetch engine with offline fallback; added Multi-Rooftop reactive data model and dynamic DOM renderers; implemented simulated IoT sensor stream with micro-noise ticker; added dynamic Chart.js rendering for daily/weekly/monthly analytics; created smart alerts engine with dismiss caching in `localStorage`; upgraded AI Advisor to chatbot with contextual live website data injection; built dynamic CSV generator and downloader. |
| [`README.md`](./README.md) | Complete documentation updated with Live Server launch guide, feature breakdown, engineering formulas, and pitch talking points. |

---

## ⚙️ API Configuration Guide

1. **Weather API (Open-Meteo)**:
   - **No API key is required.** Open-Meteo is open-source and free for non-commercial/hackathon use.
   - Works immediately when opening the site in a browser with internet access.
   - If offline, click **"Switch to Demo Mode"** on the Weather page to show calibrated demonstration data.

2. **Optional Backend AI Proxy (For Chatbot)**:
   - By default, RainSmart uses its built-in **Hydrology Expert Rule Engine** which works **100% offline, free, and instantaneously**.
   - If you have an LLM backend (e.g. Node/Express, Flask, or AWS Lambda), open the **"AI API Configuration & Security Notice"** accordion on the AI Advisor tab and paste your endpoint URL (e.g. `http://localhost:5000/api/chat`).
   - The frontend will forward user queries and live website telemetry safely without ever storing or leaking secret API keys in client-side code.

---

## 🏆 Hackathon Judge Demo Walkthrough (3 Minutes)

1. **Dashboard & Weather (0:00 - 0:45)**:
   - Point out the clean eco-modern theme (Emerald Green, Ocean Blue, and Slate).
   - Show the **Live Open-Meteo Weather Bar**: point out the live temperature, rainfall forecast, and potential harvest.
   - Click the **Alerts Bell** in the topbar to show active smart notifications with severity badges and dismiss an alert.
2. **Multiple Rooftop Calculator (0:45 - 1:30)**:
   - Navigate to **Rooftop Calculator** and toggle to **"Multiple Rooftop System"**.
   - Click **"Add Rooftop"**, name it *"Garage Outbuilding"*, set area to $80\text{ m}^2$, and select *GI Metal Sheet*.
   - Watch the individual yields update in real-time, then click **"Apply Combined Multi-Roof Harvest to Tank"**.
3. **Smart Dual-Tank Monitoring & Automated Overflow Diversion (1:30 - 2:00)**:
   - Switch to **Smart Tank Monitor**: show the dual-reservoir visual stage (Primary Tank, Automated Diverter Valve, Secondary Auxiliary Tank, and Groundwater Recharge Pit).
   - Click **"Run Animated Diversion Demo"** to demonstrate automated storm flow: Primary fills to 100%, valve flips to `ACTIVE`, water diverts to Secondary, and excess spills to Aquifer Recharge.
   - Highlight the **Simulated IoT Telemetry Panel** (Ultrasonic depth, turbidity NTU, water temperature, flow rates) and note the clear software simulation labeling.
   - Test a custom inflow (e.g. 8,000 L) in the **Diversion Simulator** and watch the live calculation ledger update.
4. **Consumption Analytics & AI Chatbot (2:00 - 2:40)**:
   - Open **Usage Analytics**: toggle between **Daily**, **Weekly**, and **Monthly** charts.
   - Open **AI Water Advisor**: click the quick inquiry chip *"Prevent Monsoon Overflow?"* or *"Explain My Calculation"* to show contextual answers based on actual website data.
5. **CSV & PDF Report Export (2:40 - 3:00)**:
   - Click **"Export CSV"** in the topbar to instantly download the structured `RainSmart_Water_Audit.csv`.
   - Open **Reports & Downloads** and click **"Print / Save as PDF"** to display the certified engineering assessment.
