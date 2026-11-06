/**
 * RainSmart – AI-Powered Intelligent Rainwater Harvesting & Urban Water Management System
 * Production-ready hackathon MVP script.
 * Features:
 *  1. Live Weather & Rainfall Forecast (Open-Meteo Live API with Demo Fallback)
 *  2. Smart Water Tank Monitoring & Simulated IoT Telemetry (Ultrasonic Sensor stream)
 *  3. Water Consumption Analytics (Daily, Weekly, Monthly Chart.js Timeframes)
 *  4. AI Water Advisor (Interactive Chatbot with live website telemetry & secure backend support)
 *  5. Multiple Rooftop Calculator (Individual & Combined V = R * A * C)
 *  6. Smart Alerts Notification Engine (Severity, Timestamps, Dismissible)
 *  7. Reports & Downloads (Dynamic CSV Export & Print/PDF Audit Report)
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. DATA MODELS & INITIAL STATE
  // =========================================================================

  const PRESETS = {
    residential: {
      name: "Suburban Family Home",
      roofArea: 200,
      roofCoeff: 0.90,
      roofName: "Corrugated Metal / GI Sheet",
      tankCapacity: 10000,
      storedWater: 6800,
      peopleCount: 4,
      dailyRate: 135,
      rainfall: 65,
      annualRainfall: 950,
      rooftops: [
        { id: 'rf_1', name: 'Main Villa Roof', area: 140, coeff: 0.90, roofName: 'Corrugated Metal / GI Sheet' },
        { id: 'rf_2', name: 'Terrace & Garage', area: 60, coeff: 0.80, roofName: 'Concrete Terrace' }
      ]
    },
    apartment: {
      name: "Urban Apartment Complex",
      roofArea: 850,
      roofCoeff: 0.80,
      roofName: "Reinforced Concrete Slab / Terrace",
      tankCapacity: 45000,
      storedWater: 29500,
      peopleCount: 36,
      dailyRate: 135,
      rainfall: 75,
      annualRainfall: 1020,
      rooftops: [
        { id: 'rf_1', name: 'Tower A Rooftop', area: 450, coeff: 0.80, roofName: 'Reinforced Concrete Slab' },
        { id: 'rf_2', name: 'Tower B Rooftop', area: 400, coeff: 0.80, roofName: 'Reinforced Concrete Slab' }
      ]
    },
    school: {
      name: "Green School Campus",
      roofArea: 1400,
      roofCoeff: 0.85,
      roofName: "Clay / Terracotta Tiled Roof",
      tankCapacity: 75000,
      storedWater: 52000,
      peopleCount: 150,
      dailyRate: 45,
      rainfall: 80,
      annualRainfall: 980,
      rooftops: [
        { id: 'rf_1', name: 'Primary Academic Wing', area: 700, coeff: 0.85, roofName: 'Clay Tiled Roof' },
        { id: 'rf_2', name: 'Auditorium & Gym', area: 500, coeff: 0.90, roofName: 'Corrugated Metal' },
        { id: 'rf_3', name: 'Cafeteria & Labs', area: 200, coeff: 0.80, roofName: 'Concrete Terrace' }
      ]
    },
    commercial: {
      name: "Industrial Warehouse",
      roofArea: 2800,
      roofCoeff: 0.90,
      roofName: "Corrugated Metal / GI Sheet",
      tankCapacity: 100000,
      storedWater: 71000,
      peopleCount: 40,
      dailyRate: 50,
      rainfall: 65,
      annualRainfall: 950,
      rooftops: [
        { id: 'rf_1', name: 'North Logistics Bay', area: 1600, coeff: 0.90, roofName: 'Corrugated Metal' },
        { id: 'rf_2', name: 'South Assembly Shed', area: 1200, coeff: 0.90, roofName: 'Corrugated Metal' }
      ]
    }
  };

  const STORAGE_KEY = 'rainsmart_system_state_v2';
  const CHAT_STORAGE_KEY = 'rainsmart_chat_history_v2';
  const ALERTS_STORAGE_KEY = 'rainsmart_dismissed_alerts_v2';
  const BACKEND_ENDPOINT_STORAGE = 'rainsmart_backend_endpoint_v2';

  // System State
  let state = {
    currentPreset: 'residential',
    rainfall: 65, // mm
    roofArea: 200, // m2 single mode
    roofCoeff: 0.90,
    roofName: "Corrugated Metal / GI Sheet",
    rooftopMode: 'single', // 'single' or 'multi'
    rooftops: [
      { id: 'rf_1', name: 'Main Villa Roof', area: 140, coeff: 0.90, roofName: 'Corrugated Metal / GI Sheet' },
      { id: 'rf_2', name: 'Terrace & Garage', area: 60, coeff: 0.80, roofName: 'Concrete Terrace' }
    ],
    firstFlush: true,
    firstFlushDepth: 1.5,
    tankCapacity: 10000,
    storedWater: 6800,
    peopleCount: 4,
    dailyRatePerPerson: 135,
    annualRainfall: 950,
    waterCostPerThousandLiters: 90,
    co2PerThousandLiters: 0.72,

    // Weather state
    weather: {
      mode: 'live', // 'live' or 'demo'
      city: 'Bengaluru',
      lat: 12.9716,
      lon: 77.5946,
      temp: 24.5,
      conditionText: 'Monsoon Showers',
      weatherCode: 63,
      rain24h: 65.0,
      rainProb: 85,
      windSpeed: 18,
      humidity: 82,
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dailyForecast: []
    },

    // Simulated IoT Sensor Stream
    sensor: {
      active: true,
      depthMeters: 1.84,
      temp: 21.8,
      turbidity: 1.2,
      inflowRate: 0.0,
      outflowRate: 0.38,
      lastSync: Date.now()
    },

    // Analytics Timeframe View
    analyticsTimeframe: 'daily' // 'daily', 'weekly', 'monthly'
  };

  // Chart instances
  let rainfallChartInstance = null;
  let waterBalanceChartInstance = null;
  let analyticsChartInstance = null;

  // Sensor telemetry interval
  let sensorIntervalId = null;

  // Dismissed alert IDs cache
  let dismissedAlertIds = new Set();

  // =========================================================================
  // 2. STATE PERSISTENCE & INITIALIZATION
  // =========================================================================

  function loadSavedState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        state = {
          ...state,
          ...parsed,
          weather: { ...state.weather, ...(parsed.weather || {}) },
          sensor: { ...state.sensor, ...(parsed.sensor || {}) },
          rooftops: Array.isArray(parsed.rooftops) && parsed.rooftops.length > 0
            ? parsed.rooftops
            : state.rooftops
        };

        // Safety clamps to prevent negative or corrupted quantities
        state.tankCapacity = Math.max(500, Number(state.tankCapacity) || 10000);
        state.storedWater = Math.max(0, Math.min(state.tankCapacity, Number(state.storedWater) || 0));
        state.rainfall = Math.max(0, Number(state.rainfall) || 0);
        state.peopleCount = Math.max(1, Number(state.peopleCount) || 4);
        state.dailyRatePerPerson = Math.max(10, Number(state.dailyRatePerPerson) || 135);
      }

      const dismissed = localStorage.getItem(ALERTS_STORAGE_KEY);
      if (dismissed) {
        dismissedAlertIds = new Set(JSON.parse(dismissed));
      }
    } catch (e) {
      console.warn("Could not load from localStorage:", e);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Could not save to localStorage:", e);
    }
  }

  function saveDismissedAlerts() {
    try {
      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(Array.from(dismissedAlertIds)));
    } catch (e) {
      console.warn("Could not save dismissed alerts:", e);
    }
  }

  function resetToDefaults() {
    const defaultData = PRESETS.residential;
    state.currentPreset = 'residential';
    state.roofArea = defaultData.roofArea;
    state.roofCoeff = defaultData.roofCoeff;
    state.roofName = defaultData.roofName;
    state.tankCapacity = defaultData.tankCapacity;
    state.storedWater = defaultData.storedWater;
    state.peopleCount = defaultData.peopleCount;
    state.dailyRatePerPerson = defaultData.dailyRate;
    state.rainfall = defaultData.rainfall;
    state.annualRainfall = defaultData.annualRainfall;
    state.rooftops = JSON.parse(JSON.stringify(defaultData.rooftops));
    state.firstFlush = true;
    state.firstFlushDepth = 1.5;
    state.rooftopMode = 'single';
    dismissedAlertIds.clear();
    saveDismissedAlerts();

    saveState();
    syncUIWithState();
    recalculateAll();
    renderAllCharts();
    showToast("Reset system to Suburban Home defaults", "info");
  }

  // =========================================================================
  // 3. HYDROLOGY CALCULATION ENGINE (SINGLE & MULTI-ROOF)
  // =========================================================================

  /**
   * Scientific Formula:
   * Collected Water (L) = Rainfall (mm) * Roof Area (m²) * Runoff Coefficient
   */
  function calculateHydrology() {
    const R = Math.max(0, Number(state.rainfall));
    let totalArea = 0;
    let netHarvestLiters = 0;
    let grossPrecipLiters = 0;
    let flushDivertedLiters = 0;
    let runoffLossLiters = 0;
    let weightedCoeff = state.roofCoeff;

    if (state.rooftopMode === 'multi' && state.rooftops && state.rooftops.length > 0) {
      let areaCoeffSum = 0;
      state.rooftops.forEach(r => {
        const a = Math.max(0, Number(r.area) || 0);
        const c = Math.max(0, Math.min(1, Number(r.coeff) || 0.8));
        totalArea += a;
        areaCoeffSum += (a * c);

        const gross = R * a;
        grossPrecipLiters += gross;

        let effR = R;
        let flush = 0;
        if (state.firstFlush && R > 0) {
          const depth = Math.min(R, state.firstFlushDepth);
          flush = depth * a;
          flushDivertedLiters += flush;
          effR = Math.max(0, R - depth);
        }

        const harvest = Math.round(effR * a * c);
        netHarvestLiters += harvest;
        runoffLossLiters += Math.max(0, Math.round((effR * a) * (1 - c)));
        r.calculatedHarvest = harvest;
      });

      weightedCoeff = totalArea > 0 ? (areaCoeffSum / totalArea) : 0.85;
    } else {
      // Single Roof Mode
      totalArea = Math.max(0, Number(state.roofArea));
      const C = Math.max(0, Math.min(1, Number(state.roofCoeff)));
      weightedCoeff = C;
      grossPrecipLiters = R * totalArea;

      let effectiveR = R;
      if (state.firstFlush && R > 0) {
        const flushDepth = Math.min(R, state.firstFlushDepth);
        flushDivertedLiters = flushDepth * totalArea;
        effectiveR = Math.max(0, R - flushDepth);
      }

      netHarvestLiters = Math.round(effectiveR * totalArea * C);
      runoffLossLiters = Math.max(0, Math.round((effectiveR * totalArea) * (1 - C)));
    }

    const efficiencyPct = grossPrecipLiters > 0
      ? ((netHarvestLiters / grossPrecipLiters) * 100).toFixed(1)
      : 0;

    // Domestic Demand (clamped to prevent negative or NaN values)
    const people = Math.max(0, Number(state.peopleCount) || 0);
    const rate = Math.max(0, Number(state.dailyRatePerPerson) || 0);
    const dailyDemandLiters = Math.round(people * rate);
    const monthlyDemandLiters = dailyDemandLiters * 30;
    const annualDemandLiters = dailyDemandLiters * 365;

    // Stored water & Reservoir Capacity (clamped)
    const stored = Math.max(0, Number(state.storedWater) || 0);
    const cap = Math.max(1, Number(state.tankCapacity) || 10000);

    // Autonomy Duration
    const coverageDays = dailyDemandLiters > 0
      ? (stored / dailyDemandLiters).toFixed(1)
      : 0;

    // Tank Level Metrics
    const tankFillPct = Math.min(100, Math.max(0, (stored / cap) * 100)).toFixed(1);
    const remainingHeadroom = Math.max(0, cap - stored);

    // Projected Storm Impact
    const projectedTotal = stored + netHarvestLiters;
    const overflowLiters = Math.max(0, projectedTotal - cap);

    // Annual Projection
    const annualEffR = Math.max(0, state.annualRainfall - (state.firstFlush ? state.firstFlushDepth * 12 : 0));
    const annualHarvestLiters = Math.round(annualEffR * totalArea * weightedCoeff);
    const annualRainCoveragePct = annualDemandLiters > 0
      ? Math.min(100, ((annualHarvestLiters / annualDemandLiters) * 100)).toFixed(1)
      : 0;

    // Economic & Ecological ROI
    const annualFinancialSavings = Math.round((annualHarvestLiters / 1000) * state.waterCostPerThousandLiters);
    const co2SavedKg = Math.round((annualHarvestLiters / 1000) * state.co2PerThousandLiters);

    // Potential Harvest from Live Weather Forecast
    const forecastRain = state.weather?.rain24h || 65;
    const forecastHarvestLiters = Math.round(Math.max(0, forecastRain - (state.firstFlush ? 1.5 : 0)) * totalArea * weightedCoeff);

    return {
      R,
      totalArea,
      weightedCoeff,
      grossPrecipLiters: Math.round(grossPrecipLiters),
      flushDivertedLiters: Math.round(flushDivertedLiters),
      runoffLossLiters,
      netHarvestLiters,
      efficiencyPct,
      dailyDemandLiters,
      monthlyDemandLiters,
      annualDemandLiters,
      coverageDays,
      tankFillPct,
      remainingHeadroom,
      projectedTotal,
      overflowLiters,
      annualHarvestLiters,
      annualRainCoveragePct,
      annualFinancialSavings,
      co2SavedKg,
      forecastRain,
      forecastHarvestLiters
    };
  }

  // =========================================================================
  // 4. LIVE WEATHER & OPEN-METEO API INTEGRATION
  // =========================================================================

  async function fetchOpenMeteoWeather(lat, lon, cityName) {
    state.weather.lat = lat;
    state.weather.lon = lon;
    state.weather.city = cityName;

    // If Demo Mode is explicitly enabled by user
    if (state.weather.mode === 'demo') {
      applyDemoWeatherData(cityName);
      recalculateAll();
      renderAllCharts();
      return;
    }

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=weather_code,precipitation_sum,precipitation_probability_max&timezone=auto`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const data = await response.json();

      const current = data.current || {};
      const daily = data.daily || {};

      state.weather.temp = current.temperature_2m !== undefined ? current.temperature_2m : 24.5;
      state.weather.humidity = current.relative_humidity_2m !== undefined ? current.relative_humidity_2m : 80;
      state.weather.windSpeed = current.wind_speed_10m !== undefined ? current.wind_speed_10m : 15;
      state.weather.weatherCode = current.weather_code !== undefined ? current.weather_code : 63;

      // Calculate 24h rain from next day precipitation sum or hourly
      const dayRain0 = daily.precipitation_sum?.[0] || 0;
      const dayRain1 = daily.precipitation_sum?.[1] || 0;
      const forecastRain = Math.max(15, Math.round(dayRain0 + dayRain1 * 0.5));
      state.weather.rain24h = forecastRain;
      state.weather.rainProb = daily.precipitation_probability_max?.[0] || 85;
      state.weather.conditionText = getWeatherDescription(state.weather.weatherCode);
      state.weather.lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Build 7-day forecast array
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const todayIdx = new Date().getDay();
      state.weather.dailyForecast = [];

      for (let i = 0; i < 7; i++) {
        const dName = dayNames[(todayIdx + i) % 7];
        const rSum = daily.precipitation_sum?.[i] !== undefined ? daily.precipitation_sum[i] : (i === 0 ? forecastRain : Math.round(Math.random() * 40));
        const pMax = daily.precipitation_probability_max?.[i] !== undefined ? daily.precipitation_probability_max[i] : (85 - i * 8);
        const wCode = daily.weather_code?.[i] !== undefined ? daily.weather_code[i] : 61;

        state.weather.dailyForecast.push({
          day: i === 0 ? 'Today' : dName,
          rain: Number(rSum).toFixed(1),
          prob: Math.round(pMax),
          code: wCode,
          desc: getWeatherDescription(wCode)
        });
      }

      saveState();
      recalculateAll();
      renderAllCharts();
      showToast(`Live weather updated for ${cityName} (${state.weather.temp}°C, ${state.weather.rain24h}mm rain forecast)`, 'info');
    } catch (err) {
      console.warn("Open-Meteo API unreachable or offline, using robust demonstration data:", err);
      applyDemoWeatherData(cityName);
      recalculateAll();
      renderAllCharts();
      showToast(`Weather API offline, showing calibrated demonstration data for ${cityName}`, 'warning');
    }
  }

  function applyDemoWeatherData(cityName) {
    const demoProfiles = {
      'Bengaluru': { temp: 24.5, rain: 65, prob: 85, code: 63, cond: 'Monsoon Downpour' },
      'Mumbai': { temp: 29.0, rain: 95, prob: 92, code: 65, cond: 'Heavy Coastal Torrent' },
      'Delhi': { temp: 31.5, rain: 28, prob: 45, code: 3, cond: 'Scattered Showers' },
      'Chennai': { temp: 30.2, rain: 72, prob: 80, code: 63, cond: 'Northeast Monsoon Storm' },
      'Hyderabad': { temp: 27.0, rain: 50, prob: 70, code: 61, cond: 'Moderate Rain' },
      'London': { temp: 16.5, rain: 18, prob: 65, code: 51, cond: 'Light Drizzle' },
      'New York': { temp: 21.0, rain: 35, prob: 60, code: 61, cond: 'Thunderstorm' }
    };

    const prof = demoProfiles[cityName] || { temp: 25.0, rain: 60, prob: 75, code: 61, cond: 'Rain Showers' };
    state.weather.city = cityName;
    state.weather.temp = prof.temp;
    state.weather.rain24h = prof.rain;
    state.weather.rainProb = prof.prob;
    state.weather.weatherCode = prof.code;
    state.weather.conditionText = prof.cond;
    state.weather.humidity = 82;
    state.weather.windSpeed = 16;
    state.weather.lastUpdated = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const dayNames = ['Today', 'Tomorrow', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
    state.weather.dailyForecast = dayNames.map((d, idx) => ({
      day: d,
      rain: idx === 0 ? prof.rain : Math.max(5, Math.round(prof.rain * (0.8 - idx * 0.1))),
      prob: Math.max(20, prof.prob - idx * 8),
      code: prof.code,
      desc: prof.cond
    }));
  }

  function getWeatherDescription(code) {
    if (code === 0) return 'Clear Skies';
    if (code <= 3) return 'Partly Cloudy';
    if (code >= 51 && code <= 55) return 'Light Drizzle';
    if (code >= 61 && code <= 65) return 'Monsoon Rain';
    if (code >= 80 && code <= 82) return 'Rain Showers';
    if (code >= 95) return 'Severe Thunderstorm';
    return 'Overcast Rain';
  }

  // =========================================================================
  // 5. SMART ALERTS NOTIFICATION ENGINE
  // =========================================================================

  function generateActiveAlerts() {
    const hydro = calculateHydrology();
    const alerts = [];

    // Alert 1: Low Tank Reserve Alert (<20% or <3 days coverage)
    if (hydro.coverageDays < 4 || hydro.tankFillPct < 20) {
      alerts.push({
        id: 'alert_low_reserve',
        severity: 'critical',
        icon: 'fa-triangle-exclamation',
        title: 'Critical: Water Storage Low',
        desc: `Tank storage is at ${hydro.tankFillPct}% (${formatNum(state.storedWater)} L). Runway is down to ${hydro.coverageDays} days. Activate non-potable rationing.`,
        time: 'Active now',
        actionTab: 'tank',
        actionLabel: 'Top Up Reservoir'
      });
    }

    // Alert 2: Tank Overflow Hazard (>85% full or forecasted rain exceeds headroom)
    if (hydro.overflowLiters > 0 || hydro.tankFillPct > 85) {
      alerts.push({
        id: 'alert_overflow_risk',
        severity: 'warning',
        icon: 'fa-cloud-showers-water',
        title: 'High Overflow Risk Detected',
        desc: `Current available headroom is ${formatNum(hydro.remainingHeadroom)} L. Upcoming storm will produce ${formatNum(hydro.netHarvestLiters)} L (+${formatNum(hydro.overflowLiters)} L overflow).`,
        time: 'Storm impending',
        actionTab: 'tank',
        actionLabel: 'Check Overflow Pit'
      });
    }

    // Alert 3: Heavy Rainfall Forecast Alert (>50mm predicted)
    if (state.weather.rain24h >= 50) {
      alerts.push({
        id: 'alert_heavy_storm',
        severity: 'info',
        icon: 'fa-cloud-bolt',
        title: `Heavy Rain Advisory: ${state.weather.rain24h} mm in ${state.weather.city}`,
        desc: `High-intensity precipitation forecasted with ${state.weather.rainProb}% confidence. Ensure first-flush diverters and gutter leaf mesh are clear.`,
        time: 'Next 24-48 Hours',
        actionTab: 'weather',
        actionLabel: 'View Forecast'
      });
    }

    // Alert 4: Aquifer Percolation Active
    if (state.storedWater >= state.tankCapacity) {
      alerts.push({
        id: 'alert_aquifer_recharge',
        severity: 'success',
        icon: 'fa-droplet',
        title: 'Aquifer Percolation Pit Active',
        desc: 'Reservoir is 100% full. All surplus rainwater is currently infiltrating into local borewell recharge pits.',
        time: 'Real-time telemetry',
        actionTab: 'analytics',
        actionLabel: 'View Water Balance'
      });
    }

    // Alert 5: High Per Capita Consumption Advisory
    if (state.dailyRatePerPerson > 180) {
      alerts.push({
        id: 'alert_high_consumption',
        severity: 'warning',
        icon: 'fa-faucet-drip',
        title: 'High Per Capita Demand Rate',
        desc: `Current consumption (${state.dailyRatePerPerson} L/person/day) exceeds urban IS 1172 benchmark (135 L). Low-flow aerators can save ${Math.round(hydro.dailyDemandLiters * 0.25)} L/day.`,
        time: 'Telemetry Analysis',
        actionTab: 'demand',
        actionLabel: 'Optimize Demand'
      });
    }

    // Filter out dismissed alerts
    return alerts.filter(a => !dismissedAlertIds.has(a.id));
  }

  // =========================================================================
  // 6. SIMULATED IOT TELEMETRY ENGINE
  // =========================================================================

  function initSensorSimulation() {
    if (sensorIntervalId) clearInterval(sensorIntervalId);

    sensorIntervalId = setInterval(() => {
      if (!state.sensor.active) return;

      const hydro = calculateHydrology();
      // Calculate realistic depth in meters based on fill percentage (e.g. 2.6m high tank)
      const maxTankHeight = 2.6; // meters
      const calculatedDepth = (Number(hydro.tankFillPct) / 100) * maxTankHeight;
      // Add realistic microscopic sensor noise (+/- 0.01m)
      const noise = (Math.random() - 0.5) * 0.02;
      state.sensor.depthMeters = Math.max(0.05, Math.min(maxTankHeight, (calculatedDepth + noise))).toFixed(2);

      // Micro-fluctuate temperature and turbidity
      state.sensor.temp = (21.5 + (Math.random() - 0.5) * 0.4).toFixed(1);
      state.sensor.turbidity = (1.2 + (Math.random() - 0.5) * 0.2).toFixed(1);
      state.sensor.outflowRate = (hydro.dailyDemandLiters / 1440 + (Math.random() - 0.5) * 0.05).toFixed(2);
      state.sensor.lastSync = Date.now();

      updateSensorUI();
    }, 3500);
  }

  function updateSensorUI() {
    const sDepth = document.getElementById('sensorDepthVal');
    const sTemp = document.getElementById('sensorTempVal');
    const sTurb = document.getElementById('sensorTurbidityVal');
    const sFlow = document.getElementById('sensorFlowVal');
    const sTime = document.getElementById('sensorSyncTimestamp');
    const sJitter = document.getElementById('sensorLevelJitter');

    if (sDepth) sDepth.textContent = `${state.sensor.depthMeters} m`;
    if (sTemp) sTemp.textContent = `${state.sensor.temp} °C`;
    if (sTurb) sTurb.textContent = `${state.sensor.turbidity} NTU`;
    if (sFlow) sFlow.textContent = `${state.sensor.inflowRate.toFixed(1)} / ${state.sensor.outflowRate}`;
    if (sTime) sTime.textContent = `Last packet: Just now • Simulated JSN-SR04T Sensor`;
    if (sJitter) sJitter.textContent = `Level: ${((Number(state.sensor.depthMeters) / 2.6) * 100).toFixed(1)}%`;
  }

  // =========================================================================
  // 7. MULTI-ROOFTOP MANAGEMENT ENGINE
  // =========================================================================

  function renderRooftopsList() {
    const container = document.getElementById('rooftopsListContainer');
    if (!container) return;

    const countBadge = document.getElementById('multiRoofCountBadge');
    if (countBadge) countBadge.textContent = `${state.rooftops.length} Roofs`;

    container.innerHTML = state.rooftops.map((roof, idx) => {
      const harvest = roof.calculatedHarvest || Math.round(state.rainfall * roof.area * roof.coeff);
      return `
        <div class="rooftop-item-card" data-id="${roof.id}">
          <div class="ric-header">
            <input type="text" class="roof-name-input" data-id="${roof.id}" value="${escapeHTML(roof.name)}" placeholder="Rooftop Name">
            ${state.rooftops.length > 1 ? `<button type="button" class="ric-delete-btn" data-id="${roof.id}" title="Remove Rooftop"><i class="fa-solid fa-trash"></i></button>` : ''}
          </div>
          <div class="ric-inputs-grid">
            <div class="form-group" style="margin:0;">
              <label style="font-size:0.75rem;"><i class="fa-solid fa-vector-square"></i> Area (m²)</label>
              <input type="number" class="form-control roof-area-input" data-id="${roof.id}" value="${roof.area}" min="5" max="100000" style="padding:0.4rem 0.6rem;">
            </div>
            <div class="form-group" style="margin:0;">
              <label style="font-size:0.75rem;"><i class="fa-solid fa-layer-group"></i> Material / Coeff</label>
              <select class="form-control roof-coeff-select" data-id="${roof.id}" style="padding:0.4rem 0.6rem;">
                <option value="0.90" ${Math.abs(roof.coeff - 0.90) < 0.02 ? 'selected' : ''}>GI Metal Sheet (C = 0.90)</option>
                <option value="0.80" ${Math.abs(roof.coeff - 0.80) < 0.02 ? 'selected' : ''}>Concrete Terrace (C = 0.80)</option>
                <option value="0.85" ${Math.abs(roof.coeff - 0.85) < 0.02 ? 'selected' : ''}>Clay Tiles (C = 0.85)</option>
                <option value="0.70" ${Math.abs(roof.coeff - 0.70) < 0.02 ? 'selected' : ''}>Asphalt Shingles (C = 0.70)</option>
                <option value="0.50" ${Math.abs(roof.coeff - 0.50) < 0.02 ? 'selected' : ''}>Green Roof (C = 0.50)</option>
                <option value="0.65" ${Math.abs(roof.coeff - 0.65) < 0.02 ? 'selected' : ''}>Paved Courtyard (C = 0.65)</option>
              </select>
            </div>
            <div class="ric-yield-badge">
              <span style="font-size:0.68rem; color:var(--slate-500); display:block;">Calculated Yield</span>
              <span>+${formatNum(harvest)} L</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach listeners to dynamic multi-roof elements
    container.querySelectorAll('.roof-name-input').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        const roof = state.rooftops.find(r => r.id === id);
        if (roof) roof.name = e.target.value.trim() || 'Rooftop';
        saveState();
        recalculateAll();
      });
    });

    container.querySelectorAll('.roof-area-input').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const id = e.target.dataset.id;
        const roof = state.rooftops.find(r => r.id === id);
        if (roof) {
          roof.area = Math.max(1, parseInt(e.target.value, 10) || 1);
          saveState();
          recalculateAll();
          renderAllCharts();
        }
      });
    });

    container.querySelectorAll('.roof-coeff-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const id = e.target.dataset.id;
        const roof = state.rooftops.find(r => r.id === id);
        if (roof) {
          roof.coeff = parseFloat(e.target.value);
          roof.roofName = e.target.options[e.target.selectedIndex].text.split('(')[0].trim();
          saveState();
          recalculateAll();
          renderAllCharts();
        }
      });
    });

    container.querySelectorAll('.ric-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (state.rooftops.length <= 1) {
          showToast('At least one rooftop is required', 'warning');
          return;
        }
        state.rooftops = state.rooftops.filter(r => r.id !== id);
        saveState();
        renderRooftopsList();
        recalculateAll();
        renderAllCharts();
        showToast('Rooftop removed', 'info');
      });
    });
  }

  function addNewRooftop() {
    const nextIdx = state.rooftops.length + 1;
    const newRoof = {
      id: `rf_${Date.now()}`,
      name: `Rooftop Section ${nextIdx}`,
      area: 75,
      coeff: 0.85,
      roofName: 'Clay Tiled Roof',
      calculatedHarvest: 0
    };
    state.rooftops.push(newRoof);
    saveState();
    renderRooftopsList();
    recalculateAll();
    renderAllCharts();
    showToast(`Added new rooftop: ${newRoof.name}`, 'success');
  }

  // =========================================================================
  // 8. MASTER UI RECALCULATION & DISPATCHER
  // =========================================================================

  function recalculateAll() {
    const hydro = calculateHydrology();

    // 1. Topbar & Weather Sync
    const topCity = document.getElementById('topbarCityName');
    if (topCity) topCity.textContent = `${state.weather.city}, ${state.weather.temp}°C`;
    const topRain = document.getElementById('topbarRainforecast');
    if (topRain) topRain.textContent = `${state.weather.rain24h} mm`;
    const topProb = document.getElementById('topbarRainProb');
    if (topProb) topProb.textContent = `${state.weather.rainProb}% prob`;
    const topLiveBadge = document.getElementById('topbarLiveBadge');
    if (topLiveBadge) {
      topLiveBadge.textContent = state.weather.mode === 'live' ? 'API LIVE' : 'DEMO';
      topLiveBadge.style.backgroundColor = state.weather.mode === 'live' ? 'var(--primary-500)' : 'var(--amber-500)';
    }

    const sideWeatherBadge = document.getElementById('sidebarWeatherBadge');
    if (sideWeatherBadge) {
      sideWeatherBadge.textContent = state.weather.mode === 'live' ? 'Live API' : 'Demo';
    }

    const sideAutoDays = document.getElementById('sidebarAutonomyDays');
    if (sideAutoDays) sideAutoDays.textContent = `${hydro.coverageDays} Days`;
    const sideAutoBar = document.getElementById('sidebarAutonomyBar');
    if (sideAutoBar) {
      const barWidth = Math.min(100, (Number(hydro.coverageDays) / 20) * 100);
      sideAutoBar.style.width = `${barWidth}%`;
    }

    // 2. Dashboard KPIs
    const kpiHarvest = document.getElementById('kpiHarvestVolume');
    if (kpiHarvest) kpiHarvest.innerHTML = `${formatNum(hydro.netHarvestLiters)} <span class="metric-unit">L</span>`;
    const kpiHarvestSub = document.getElementById('kpiHarvestSub');
    if (kpiHarvestSub) {
      kpiHarvestSub.textContent = state.rooftopMode === 'multi'
        ? `Based on ${state.rainfall} mm storm across ${state.rooftops.length} roofs (${hydro.totalArea} m²)`
        : `Based on ${state.rainfall} mm storm event (${hydro.totalArea} m²)`;
    }

    const kpiStored = document.getElementById('kpiStoredWater');
    if (kpiStored) kpiStored.innerHTML = `${formatNum(state.storedWater)} <span class="metric-unit">L</span>`;
    const kpiTankCapSub = document.getElementById('kpiTankCapacitySub');
    if (kpiTankCapSub) kpiTankCapSub.textContent = `Capacity: ${formatNum(state.tankCapacity)} L (${hydro.tankFillPct}% full)`;

    const kpiProgress = document.getElementById('kpiStorageProgress');
    if (kpiProgress) kpiProgress.style.width = `${hydro.tankFillPct}%`;

    const kpiStatus = document.getElementById('kpiStorageStatus');
    const sideTankDot = document.getElementById('sidebarTankDot');
    if (kpiStatus) {
      if (hydro.tankFillPct > 90) {
        kpiStatus.className = 'status-indicator warn';
        kpiStatus.textContent = 'Nearly Full (Overflow Risk)';
        if (sideTankDot) sideTankDot.style.backgroundColor = '#f59e0b';
      } else if (hydro.tankFillPct < 20) {
        kpiStatus.className = 'status-indicator danger';
        kpiStatus.textContent = 'Critical Low Reserve';
        if (sideTankDot) sideTankDot.style.backgroundColor = '#ef4444';
      } else {
        kpiStatus.className = 'status-indicator good';
        kpiStatus.textContent = 'Safe Storage';
        if (sideTankDot) sideTankDot.style.backgroundColor = '#10b981';
      }
    }

    const kpiHeadroom = document.getElementById('kpiRemainingHeadroom');
    if (kpiHeadroom) kpiHeadroom.textContent = `${formatNum(hydro.remainingHeadroom)} L space left`;

    const kpiDemand = document.getElementById('kpiDailyDemand');
    if (kpiDemand) kpiDemand.innerHTML = `${formatNum(hydro.dailyDemandLiters)} <span class="metric-unit">L / day</span>`;
    const kpiDemandSub = document.getElementById('kpiDemandSub');
    if (kpiDemandSub) kpiDemandSub.textContent = `${state.peopleCount} people @ ${state.dailyRatePerPerson} L/person`;

    const kpiCoverage = document.getElementById('kpiCoverageDays');
    if (kpiCoverage) kpiCoverage.textContent = `${hydro.coverageDays} Days Coverage`;

    const kpiSavings = document.getElementById('kpiFinancialSavings');
    if (kpiSavings) kpiSavings.innerHTML = `₹ ${formatNum(hydro.annualFinancialSavings)} <span class="metric-unit">/ yr</span>`;
    const kpiOffset = document.getElementById('kpiVolumeOffsetSub');
    if (kpiOffset) kpiOffset.textContent = `${(hydro.annualHarvestLiters / 1000).toFixed(1)} kL annual municipal offset`;

    // 3. Dashboard Weather Bar Sync
    const dCity = document.getElementById('dashWeatherCity');
    const dTemp = document.getElementById('dashWeatherTemp');
    const dSumm = document.getElementById('dashWeatherForecastSummary');
    const dHarv = document.getElementById('dashForecastHarvestVal');
    const dSource = document.getElementById('dashWeatherDataSource');

    if (dCity) dCity.textContent = state.weather.city;
    if (dTemp) dTemp.textContent = `${state.weather.temp}°C • ${state.weather.conditionText}`;
    if (dSumm) dSumm.innerHTML = `Precipitation anticipated in next 24-48h: <strong>${state.weather.rain24h} mm</strong> with <strong>${state.weather.rainProb}% probability</strong>.`;
    if (dHarv) dHarv.textContent = `${formatNum(hydro.forecastHarvestLiters)} Liters`;
    if (dSource) {
      dSource.innerHTML = state.weather.mode === 'live'
        ? `<span class="pulse-dot"></span> Live Open-Meteo API (${state.weather.lastUpdated})`
        : `<span class="pulse-dot" style="background:#f59e0b;"></span> Calibrated Demo Data`;
    }

    // 4. Live Weather Page Sync
    const wTemp = document.getElementById('weatherCurTemp');
    const wRain = document.getElementById('weather24hRain');
    const wProb = document.getElementById('weatherRainProb');
    const wWind = document.getElementById('weatherWindHumidity');
    const wCond = document.getElementById('weatherConditionText');
    const wActiveRoof = document.getElementById('weatherActiveRoofArea');
    const wRainDepthTxt = document.getElementById('weatherForecastRainDepthText');
    const wForeLiters = document.getElementById('weatherForecastLitersVal');
    const wForeCubic = document.getElementById('weatherForecastCubicVal');
    const wSourceBadge = document.getElementById('weatherSourceBadge');

    if (wTemp) wTemp.textContent = `${state.weather.temp} °C`;
    if (wRain) wRain.textContent = `${state.weather.rain24h} mm`;
    if (wProb) wProb.textContent = `${state.weather.rainProb} %`;
    if (wWind) wWind.textContent = `${state.weather.windSpeed} km/h | ${state.weather.humidity}%`;
    if (wCond) wCond.textContent = state.weather.conditionText;
    if (wActiveRoof) wActiveRoof.textContent = `${hydro.totalArea} m²`;
    if (wRainDepthTxt) wRainDepthTxt.textContent = `${state.weather.rain24h} mm`;
    if (wForeLiters) wForeLiters.textContent = `${formatNum(hydro.forecastHarvestLiters)} Liters`;
    if (wForeCubic) wForeCubic.textContent = `≈ ${(hydro.forecastHarvestLiters / 1000).toFixed(2)} m³`;
    if (wSourceBadge) {
      wSourceBadge.textContent = state.weather.mode === 'live' ? '📡 Live Open-Meteo API' : '🧪 Calibrated Demo Mode';
    }

    // Render 7-day forecast cards
    render7DayForecast(hydro);

    // 5. Calculator View Outputs
    const calcHeroLabel = document.getElementById('calcResultHeroLabel');
    if (calcHeroLabel) {
      calcHeroLabel.textContent = state.rooftopMode === 'multi'
        ? `Combined Multi-Roof Harvest (${state.rooftops.length} Roofs, ${hydro.totalArea} m²)`
        : `Total Harvestable Rainwater (${hydro.totalArea} m²)`;
    }

    const calcResLiters = document.getElementById('calcResultLiters');
    if (calcResLiters) calcResLiters.textContent = formatNum(hydro.netHarvestLiters);
    const calcResCubic = document.getElementById('calcResultCubic');
    if (calcResCubic) calcResCubic.textContent = `${(hydro.netHarvestLiters / 1000).toFixed(2)} m³`;
    const calcResBottles = document.getElementById('calcResultBottles');
    if (calcResBottles) calcResBottles.textContent = formatNum(hydro.netHarvestLiters * 2);

    const calcGross = document.getElementById('calcGrossPrecip');
    if (calcGross) calcGross.textContent = `${formatNum(hydro.grossPrecipLiters)} L`;
    const calcRunoff = document.getElementById('calcRunoffLoss');
    if (calcRunoff) calcRunoff.textContent = `${formatNum(hydro.runoffLossLiters)} L`;
    const calcFlush = document.getElementById('calcFlushDiverted');
    if (calcFlush) calcFlush.textContent = `${formatNum(hydro.flushDivertedLiters)} L`;
    const calcNet = document.getElementById('calcNetHarvested');
    if (calcNet) calcNet.textContent = `${formatNum(hydro.netHarvestLiters)} L`;

    const calcEffPct = document.getElementById('calcEfficiencyPct');
    if (calcEffPct) calcEffPct.textContent = `${hydro.efficiencyPct}%`;
    const calcEffFill = document.getElementById('calcEfficiencyFill');
    if (calcEffFill) calcEffFill.style.width = `${hydro.efficiencyPct}%`;

    // Impact preview in calculator
    const impactCurrent = document.getElementById('impactCurrentVal');
    if (impactCurrent) impactCurrent.textContent = `${formatNum(state.storedWater)} L`;
    const impactHarvest = document.getElementById('impactHarvestVal');
    if (impactHarvest) impactHarvest.textContent = `+${formatNum(hydro.netHarvestLiters)} L`;
    const impactCap = document.getElementById('impactTankCap');
    if (impactCap) impactCap.textContent = `${formatNum(state.tankCapacity)} L`;

    const impactBadge = document.getElementById('impactStatusBadge');
    const impactCallout = document.getElementById('impactCalloutText');
    if (impactBadge && impactCallout) {
      if (hydro.overflowLiters > 0) {
        impactBadge.className = 'impact-overflow';
        impactBadge.textContent = `Overflow (+${formatNum(hydro.overflowLiters)} L)`;
        impactCallout.className = 'impact-callout';
        impactCallout.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i><span>Warning: This storm will exceed your tank by <strong>${formatNum(hydro.overflowLiters)} L</strong>. Excess is safely routed to recharge groundwater aquifers.</span>`;
      } else {
        impactBadge.className = 'impact-add';
        impactBadge.textContent = `Within Capacity (${formatNum(state.tankCapacity - hydro.projectedTotal)} L space)`;
        impactCallout.className = 'impact-callout safe';
        impactCallout.innerHTML = `<i class="fa-solid fa-circle-check"></i><span>Optimal Catchment: Tank has ample space to store all <strong>${formatNum(hydro.netHarvestLiters)} Liters</strong> without spillover.</span>`;
      }
    }

    // 6. Tank Management View Updates
    const tankGraphicLiters = document.getElementById('tankGraphicLiters');
    if (tankGraphicLiters) tankGraphicLiters.textContent = `${formatNum(state.storedWater)} L`;
    const tankGraphicPct = document.getElementById('tankGraphicPct');
    if (tankGraphicPct) tankGraphicPct.textContent = `${hydro.tankFillPct}% Capacity`;

    const tankWaterMass = document.getElementById('tankWaterMass');
    if (tankWaterMass) {
      const visualPct = state.storedWater === 0 ? 0 : Math.max(5, Math.min(100, hydro.tankFillPct));
      tankWaterMass.style.height = `${visualPct}%`;
    }

    const tankValStored = document.getElementById('tankValStored');
    if (tankValStored) tankValStored.textContent = `${formatNum(state.storedWater)} L`;
    const tankValHeadroom = document.getElementById('tankValHeadroom');
    if (tankValHeadroom) tankValHeadroom.textContent = `${formatNum(hydro.remainingHeadroom)} L`;
    const tankValPct = document.getElementById('tankValPct');
    if (tankValPct) tankValPct.textContent = `${hydro.tankFillPct}%`;
    const tankValDays = document.getElementById('tankValDays');
    if (tankValDays) tankValDays.textContent = `${hydro.coverageDays} Days`;

    // Tank Badge state
    const tankBadge = document.getElementById('tankStateBadge');
    const tankStateText = document.getElementById('tankStateText');
    if (tankBadge && tankStateText) {
      if (hydro.tankFillPct > 95) {
        tankBadge.className = 'tank-badge-live bg-amber';
        tankStateText.textContent = 'Maximum Capacity / Full';
      } else if (hydro.tankFillPct < 20) {
        tankBadge.className = 'tank-badge-live bg-red';
        tankStateText.textContent = 'Critical Reserve';
      } else {
        tankBadge.className = 'tank-badge-live';
        tankStateText.textContent = 'Normal Storage Buffer';
      }
    }

    // Tank overflow card
    const overflowAlert = document.getElementById('tankOverflowAlert');
    const overflowTitle = document.getElementById('tankOverflowTitle');
    const overflowDesc = document.getElementById('tankOverflowDesc');
    if (overflowAlert && overflowTitle && overflowDesc) {
      if (hydro.tankFillPct >= 100) {
        overflowAlert.className = 'tank-overflow-card hazard';
        overflowTitle.textContent = 'Overflow Active!';
        overflowDesc.textContent = 'Tank has reached full capacity. Inflow diverter is directing surplus to recharge pits.';
      } else if (hydro.tankFillPct > 85) {
        overflowAlert.className = 'tank-overflow-card hazard';
        overflowTitle.textContent = 'High Level Warning (85%+)';
        overflowDesc.textContent = `Only ${formatNum(hydro.remainingHeadroom)} L space left before overflow.`;
      } else if (hydro.tankFillPct < 20) {
        overflowAlert.className = 'tank-overflow-card hazard';
        overflowTitle.textContent = 'Low Storage Level Warning (<20%)';
        overflowDesc.textContent = `Current stored volume is down to ${formatNum(state.storedWater)} L. Consider switching to backup supply.`;
      } else {
        overflowAlert.className = 'tank-overflow-card';
        overflowTitle.textContent = 'No Overflow Risk Currently';
        overflowDesc.textContent = `Tank has ${formatNum(hydro.remainingHeadroom)} L available space before spill level.`;
      }
    }

    // 7. Demand View Outputs
    const demandPeopleDisplay = document.getElementById('demandPeopleCountDisplay');
    if (demandPeopleDisplay) demandPeopleDisplay.textContent = `${state.peopleCount} ${state.peopleCount === 1 ? 'Person' : 'People'}`;

    const demandCoverageVal = document.getElementById('demandCoverageDaysVal');
    if (demandCoverageVal) demandCoverageVal.textContent = hydro.coverageDays;

    const demandMonthly = document.getElementById('demandMonthlyTotal');
    if (demandMonthly) demandMonthly.textContent = `${(hydro.monthlyDemandLiters / 1000).toFixed(1)} kL`;
    const demandAnnual = document.getElementById('demandAnnualTotal');
    if (demandAnnual) demandAnnual.textContent = `${(hydro.annualDemandLiters / 1000).toFixed(1)} kL`;
    const demandRainCov = document.getElementById('demandRainCoveragePct');
    if (demandRainCov) demandRainCov.textContent = `${hydro.annualRainCoveragePct}%`;

    // Activity breakdown
    const volFlushing = document.getElementById('volFlushing');
    if (volFlushing) volFlushing.textContent = `${Math.round(hydro.dailyDemandLiters * 0.30)} L/day`;
    const volBathing = document.getElementById('volBathing');
    if (volBathing) volBathing.textContent = `${Math.round(hydro.dailyDemandLiters * 0.35)} L/day`;
    const volWashing = document.getElementById('volWashing');
    if (volWashing) volWashing.textContent = `${Math.round(hydro.dailyDemandLiters * 0.15)} L/day`;
    const volKitchen = document.getElementById('volKitchen');
    if (volKitchen) volKitchen.textContent = `${Math.round(hydro.dailyDemandLiters * 0.12)} L/day`;
    const volGarden = document.getElementById('volGarden');
    if (volGarden) volGarden.textContent = `${Math.round(hydro.dailyDemandLiters * 0.08)} L/day`;

    const totalUsageBadge = document.getElementById('totalUsageBadge');
    if (totalUsageBadge) totalUsageBadge.textContent = `${formatNum(hydro.dailyDemandLiters)} L / Day`;

    // 8. Analytics View KPIs & Table
    updateAnalyticsView(hydro);

    // 9. Smart Alerts Updates
    updateAlertsUI();

    // 10. Report View Updates
    updateReportTable(hydro);

    // 11. Advisor Dynamic Recommendations
    updateAdvisorCards(hydro);

    // 12. Tank Simulation button labels
    const btnSimulateRain = document.getElementById('btnSimulateRainInflow');
    if (btnSimulateRain) {
      btnSimulateRain.innerHTML = `<i class="fa-solid fa-cloud-arrow-down"></i> Add Calculated Storm (+${(hydro.netHarvestLiters / 1000).toFixed(1)}k L)`;
    }
    const btnSimulateUse = document.getElementById('btnSimulateDailyUse');
    if (btnSimulateUse) {
      btnSimulateUse.innerHTML = `<i class="fa-solid fa-shower"></i> Consume 1-Day Water (-${formatNum(hydro.dailyDemandLiters)} L)`;
    }

    // 13. Dynamic Multi-Roof Yield badges & Button Labels
    updateRooftopCardYields();
    const btnMultiTank = document.getElementById('btnApplyMultiRoofToTank');
    if (btnMultiTank) {
      btnMultiTank.innerHTML = `<i class="fa-solid fa-cubes-stacked"></i> Apply Combined Multi-Roof Harvest (+${formatNum(hydro.netHarvestLiters)} L) to Tank`;
    }
    const btnCalcSave = document.getElementById('btnCalculateSave');
    if (btnCalcSave) {
      btnCalcSave.innerHTML = `<i class="fa-solid fa-arrow-down-to-bracket"></i> Calculate & Apply to Tank Storage (+${formatNum(hydro.netHarvestLiters)} L)`;
    }
  }

  function updateRooftopCardYields() {
    if (state.rooftopMode !== 'multi' || !state.rooftops) return;
    state.rooftops.forEach(roof => {
      const card = document.querySelector(`.rooftop-item-card[data-id="${roof.id}"] .ric-yield-badge span:last-child`);
      if (card) {
        card.textContent = `+${formatNum(roof.calculatedHarvest || 0)} L`;
      }
    });
  }

  function render7DayForecast(hydro) {
    const grid = document.getElementById('sevenDayForecastGrid');
    if (!grid || !state.weather.dailyForecast || state.weather.dailyForecast.length === 0) return;

    grid.innerHTML = state.weather.dailyForecast.map(df => {
      const dayRainMm = parseFloat(df.rain) || 0;
      const dayYieldL = Math.round(Math.max(0, dayRainMm - (state.firstFlush ? 1.5 : 0)) * hydro.totalArea * hydro.weightedCoeff);

      let icon = 'fa-cloud-sun-rain';
      if (dayRainMm > 40) icon = 'fa-cloud-bolt';
      else if (dayRainMm > 15) icon = 'fa-cloud-showers-heavy';
      else if (dayRainMm > 0) icon = 'fa-cloud-rain';

      return `
        <div class="forecast-day-box">
          <span class="f-day">${df.day}</span>
          <i class="fa-solid ${icon} f-icon"></i>
          <strong class="f-rain">${df.rain} mm</strong>
          <span class="f-prob">${df.prob}% rain</span>
          <span class="f-yield">+${formatNum(dayYieldL)} L</span>
        </div>
      `;
    }).join('');
  }

  function updateAlertsUI() {
    const activeAlerts = generateActiveAlerts();

    // Topbar count badge
    const badge = document.getElementById('topbarAlertCount');
    if (badge) {
      badge.textContent = activeAlerts.length;
      badge.style.display = activeAlerts.length > 0 ? 'flex' : 'none';
    }

    // Topbar flyout list
    const flyout = document.getElementById('flyoutAlertsList');
    if (flyout) {
      if (activeAlerts.length === 0) {
        flyout.innerHTML = `<div style="padding:1.5rem; text-align:center; color:var(--slate-500); font-size:0.82rem;"><i class="fa-solid fa-circle-check text-primary" style="font-size:1.6rem; margin-bottom:0.4rem; display:block;"></i>All systems normal. No active warnings.</div>`;
      } else {
        flyout.innerHTML = activeAlerts.map(a => `
          <div class="flyout-alert-item" data-id="${a.id}" data-tab="${a.actionTab}" style="cursor: pointer;" title="Go to ${a.actionLabel}">
            <i class="fa-solid ${a.icon} flyout-alert-icon ${a.severity === 'critical' ? 'text-danger' : a.severity === 'warning' ? 'text-amber' : 'text-primary'}"></i>
            <div class="flyout-alert-info">
              <strong>${escapeHTML(a.title)}</strong>
              <p>${escapeHTML(a.desc)}</p>
              <span style="font-size: 0.68rem; color: var(--water-600); font-weight: 700;">${a.actionLabel} &rarr;</span>
            </div>
            <button class="flyout-dismiss-btn" data-id="${a.id}" title="Dismiss"><i class="fa-solid fa-xmark"></i></button>
          </div>
        `).join('');

        flyout.querySelectorAll('.flyout-alert-item').forEach(item => {
          item.addEventListener('click', (e) => {
            if (e.target.closest('.flyout-dismiss-btn')) return;
            const targetTab = item.dataset.tab;
            if (targetTab) {
              const navBtn = document.querySelector(`.nav-link[data-tab="${targetTab}"]`);
              if (navBtn) navBtn.click();
              const fl = document.getElementById('alertsFlyout');
              if (fl) fl.classList.remove('open');
            }
          });
        });

        flyout.querySelectorAll('.flyout-dismiss-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            dismissAlert(btn.dataset.id);
          });
        });
      }
    }

    // Dashboard alerts stream
    const dashStream = document.getElementById('dashboardAlertsStream');
    if (dashStream) {
      if (activeAlerts.length === 0) {
        dashStream.innerHTML = `
          <div class="alert-stream-item success" style="grid-column: 1 / -1;">
            <div class="asi-icon"><i class="fa-solid fa-check"></i></div>
            <div class="asi-details">
              <strong>All Environmental & Storage Parameters Optimal</strong>
              <p>Storage reserves, rainwater catchment efficiency, and daily consumption are in balanced equilibrium.</p>
              <span class="asi-time">Live Status • Real-Time Engine</span>
            </div>
          </div>
        `;
      } else {
        dashStream.innerHTML = activeAlerts.map(a => `
          <div class="alert-stream-item ${a.severity}" data-id="${a.id}">
            <div class="asi-icon"><i class="fa-solid ${a.icon}"></i></div>
            <div class="asi-details">
              <strong>${escapeHTML(a.title)}</strong>
              <p>${escapeHTML(a.desc)}</p>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.35rem;">
                <span class="asi-time">${escapeHTML(a.time)}</span>
                <button class="btn btn-outline btn-sm asi-action-btn" data-tab="${a.actionTab}" style="padding: 0.2rem 0.55rem; font-size: 0.72rem;">${a.actionLabel} &rarr;</button>
              </div>
            </div>
            <button class="asi-dismiss-btn" data-id="${a.id}" title="Dismiss Alert"><i class="fa-solid fa-xmark"></i></button>
          </div>
        `).join('');

        dashStream.querySelectorAll('.asi-action-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            if (tab) {
              const nav = document.querySelector(`.nav-link[data-tab="${tab}"]`);
              if (nav) nav.click();
            }
          });
        });

        dashStream.querySelectorAll('.asi-dismiss-btn').forEach(btn => {
          btn.addEventListener('click', () => dismissAlert(btn.dataset.id));
        });
      }
    }

    // Dashboard Main Banner
    const banner = document.getElementById('dashboardAlertBanner');
    const bTag = document.getElementById('dashboardAlertTag');
    const bTitle = document.getElementById('alertBannerTitle');
    const bText = document.getElementById('alertBannerText');
    const bAction = document.getElementById('alertBannerAction');

    if (banner && bTag && bTitle && bText && bAction) {
      if (activeAlerts.length > 0) {
        const topAlert = activeAlerts[0];
        banner.className = `alert-banner ${topAlert.severity === 'critical' ? 'danger' : topAlert.severity === 'warning' ? 'warning' : ''}`;
        bTag.className = `alert-severity-tag ${topAlert.severity}`;
        bTag.textContent = topAlert.severity.toUpperCase();
        bTitle.textContent = topAlert.title;
        bText.textContent = topAlert.desc;
        bAction.textContent = topAlert.actionLabel;
        bAction.setAttribute('data-tab', topAlert.actionTab);
        banner.style.display = 'flex';
      } else {
        banner.className = 'alert-banner';
        bTag.className = 'alert-severity-tag info';
        bTag.textContent = 'OPTIMAL';
        bTitle.textContent = 'System Operating Efficiently';
        bText.textContent = 'Water reserves cover standard consumption thresholds. Filtration and storage buffers verified.';
        bAction.textContent = 'View Storage';
        bAction.setAttribute('data-tab', 'tank');
        banner.style.display = 'flex';
      }
    }
  }

  function dismissAlert(alertId) {
    if (!alertId) return;
    dismissedAlertIds.add(alertId);
    saveDismissedAlerts();
    updateAlertsUI();
    showToast('Alert dismissed', 'info');
  }

  function dismissAllAlerts() {
    const active = generateActiveAlerts();
    active.forEach(a => dismissedAlertIds.add(a.id));
    saveDismissedAlerts();
    updateAlertsUI();
    showToast('All alerts dismissed', 'info');
  }

  function updateAnalyticsView(hydro) {
    const aHarv = document.getElementById('analyticsTotalHarvested');
    const aCons = document.getElementById('analyticsTotalConsumed');
    const aRem = document.getElementById('analyticsNetRemaining');
    const aSav = document.getElementById('analyticsCostSavings');

    if (aHarv) aHarv.innerHTML = `${(hydro.annualHarvestLiters / 1000).toFixed(1)} <span class="metric-unit">kL</span>`;
    if (aCons) aCons.innerHTML = `${(hydro.annualDemandLiters / 1000).toFixed(1)} <span class="metric-unit">kL</span>`;
    if (aRem) aRem.innerHTML = `${(state.storedWater / 1000).toFixed(1)} <span class="metric-unit">kL</span>`;
    if (aSav) aSav.innerHTML = `₹ ${formatNum(hydro.annualFinancialSavings)} <span class="metric-unit">saved</span>`;

    // Populate Analytics Log Table
    const tbody = document.getElementById('analyticsLogTableBody');
    if (tbody) {
      const logs = generateAnalyticsHistoryLog(state.analyticsTimeframe, hydro);
      tbody.innerHTML = logs.map(l => `
        <tr style="border-bottom: 1px solid var(--slate-100); font-size: 0.82rem;">
          <td style="padding: 0.55rem 0.6rem; font-weight: 600; color: var(--slate-800);">${l.period}</td>
          <td style="padding: 0.55rem 0.6rem;">${l.rainfall} mm</td>
          <td style="padding: 0.55rem 0.6rem; color: var(--primary-700); font-weight: 700;">+${formatNum(l.harvested)} L</td>
          <td style="padding: 0.55rem 0.6rem; color: #dc2626;">-${formatNum(l.consumed)} L</td>
          <td style="padding: 0.55rem 0.6rem; font-weight: 700;">${formatNum(l.balance)} L</td>
          <td style="padding: 0.55rem 0.6rem; text-align: right; color: var(--primary-700); font-weight: 800;">₹ ${formatNum(l.savings)}</td>
        </tr>
      `).join('');
    }
  }

  function generateAnalyticsHistoryLog(timeframe, hydro) {
    const list = [];
    if (timeframe === 'daily') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
      const rainSample = [0, 15, 45, 0, 65, 20, state.rainfall];
      let runningBalance = state.storedWater;

      for (let i = days.length - 1; i >= 0; i--) {
        const r = rainSample[i];
        const harv = Math.round(Math.max(0, r - 1.5) * hydro.totalArea * hydro.weightedCoeff);
        const cons = hydro.dailyDemandLiters;
        const sav = Math.round((harv / 1000) * state.waterCostPerThousandLiters);
        list.push({
          period: days[i],
          rainfall: r,
          harvested: harv,
          consumed: cons,
          balance: runningBalance,
          savings: sav
        });
        runningBalance = Math.max(0, runningBalance - harv + cons);
      }
      return list.reverse();
    } else if (timeframe === 'weekly') {
      const weeks = ['Week 1', 'Week 2', 'Week 3', 'Current Week'];
      const rainSample = [40, 85, 30, state.rainfall * 1.5];
      let runningBalance = state.storedWater;

      for (let i = weeks.length - 1; i >= 0; i--) {
        const r = Math.round(rainSample[i]);
        const harv = Math.round(r * hydro.totalArea * hydro.weightedCoeff);
        const cons = hydro.dailyDemandLiters * 7;
        const sav = Math.round((harv / 1000) * state.waterCostPerThousandLiters);
        list.push({
          period: weeks[i],
          rainfall: r,
          harvested: harv,
          consumed: cons,
          balance: runningBalance,
          savings: sav
        });
        runningBalance = Math.max(0, runningBalance - harv + cons);
      }
      return list.reverse();
    } else {
      // Monthly
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyRainFactors = [0.01, 0.01, 0.03, 0.06, 0.12, 0.18, 0.22, 0.19, 0.11, 0.05, 0.01, 0.01];

      return months.map((m, idx) => {
        const r = Math.round(state.annualRainfall * monthlyRainFactors[idx]);
        const harv = Math.round(r * hydro.totalArea * hydro.weightedCoeff);
        const cons = hydro.dailyDemandLiters * 30;
        const sav = Math.round((harv / 1000) * state.waterCostPerThousandLiters);
        return {
          period: m,
          rainfall: r,
          harvested: harv,
          consumed: cons,
          balance: Math.min(state.tankCapacity, Math.max(2000, harv - cons + state.storedWater)),
          savings: sav
        };
      });
    }
  }

  function updateReportTable(hydro) {
    const setTxt = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    };

    setTxt('reportGeneratedDate', `Generated: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (${state.weather.city})`);
    setTxt('repAnnualPotential', `${formatNum(hydro.annualHarvestLiters)} Liters`);
    setTxt('repCostOffset', `₹ ${formatNum(hydro.annualFinancialSavings)} / yr`);
    setTxt('repAquiferRecharge', `${formatNum(Math.round(hydro.annualHarvestLiters * 0.25))} Liters`);
    setTxt('repCarbonSaved', `${hydro.co2SavedKg} kg CO₂e`);

    setTxt('repRoofArea', `${hydro.totalArea} m² (${Math.round(hydro.totalArea * 10.764)} sq.ft, ${state.rooftopMode === 'multi' ? `${state.rooftops.length} Roofs` : 'Single'})`);
    setTxt('repRunoffC', `${hydro.weightedCoeff.toFixed(2)} (${state.rooftopMode === 'multi' ? 'Weighted Composite' : state.roofName})`);
    setTxt('repRainfallR', `${state.rainfall} mm`);
    setTxt('repNetHarvest', `${formatNum(hydro.netHarvestLiters)} Liters`);
    setTxt('repStorageCap', `${formatNum(state.tankCapacity)} Liters`);

    setTxt('repOccupants', `${state.peopleCount} Residents`);
    setTxt('repPerCapita', `${state.dailyRatePerPerson} Liters/person/day`);
    setTxt('repTotalDaily', `${formatNum(hydro.dailyDemandLiters)} Liters/day`);
    setTxt('repAutonomyDays', `${hydro.coverageDays} Days`);
    setTxt('repSufficiencyPct', `${hydro.annualRainCoveragePct}%`);
  }

  // =========================================================================
  // 9. CHART.JS VISUALIZATIONS (DASHBOARD & CONSUMPTION ANALYTICS)
  // =========================================================================

  function renderAllCharts() {
    renderDashboardCharts();
    renderConsumptionAnalyticsChart();
  }

  function renderDashboardCharts() {
    const hydro = calculateHydrology();

    // Chart 1: Rainfall vs Harvest Timeline
    const rainCanvas = document.getElementById('rainfallChart');
    if (rainCanvas) {
      if (rainfallChartInstance) rainfallChartInstance.destroy();

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyRainFactors = [0.01, 0.01, 0.03, 0.06, 0.12, 0.18, 0.22, 0.19, 0.11, 0.05, 0.01, 0.01];

      const rainMonthlyMm = monthlyRainFactors.map(f => Math.round(state.annualRainfall * f));
      const harvestMonthlyKL = rainMonthlyMm.map(mm => {
        const net = Math.max(0, mm - (state.firstFlush ? 1.5 : 0)) * hydro.totalArea * hydro.weightedCoeff;
        return Number((net / 1000).toFixed(1));
      });

      rainfallChartInstance = new Chart(rainCanvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels: months,
          datasets: [
            {
              label: 'Rainfall Depth (mm)',
              data: rainMonthlyMm,
              backgroundColor: 'rgba(14, 165, 233, 0.25)',
              borderColor: 'rgba(2, 132, 199, 0.9)',
              borderWidth: 2,
              borderRadius: 6,
              yAxisID: 'yRain'
            },
            {
              label: 'Harvest Potential (kL)',
              data: harvestMonthlyKL,
              backgroundColor: 'rgba(16, 185, 129, 0.85)',
              borderColor: 'rgba(5, 150, 105, 1)',
              borderWidth: 1.5,
              borderRadius: 6,
              yAxisID: 'yHarvest'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0f172a',
              titleFont: { family: 'Inter', size: 13 },
              bodyFont: { family: 'Inter', size: 12 },
              padding: 10,
              cornerRadius: 8
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { family: 'Inter', size: 11 }, color: '#64748b' }
            },
            yRain: {
              type: 'linear',
              position: 'left',
              title: { display: true, text: 'Rainfall (mm)', color: '#0284c7', font: { size: 11, weight: 600 } },
              grid: { color: 'rgba(226, 232, 240, 0.6)' },
              ticks: { color: '#64748b', font: { size: 10 } }
            },
            yHarvest: {
              type: 'linear',
              position: 'right',
              title: { display: true, text: 'Harvest (kL)', color: '#059669', font: { size: 11, weight: 600 } },
              grid: { display: false },
              ticks: { color: '#64748b', font: { size: 10 } }
            }
          }
        }
      });
    }

    // Chart 2: Domestic Usage Doughnut
    const balanceCanvas = document.getElementById('waterBalanceChart');
    if (balanceCanvas) {
      if (waterBalanceChartInstance) waterBalanceChartInstance.destroy();

      const d = hydro.dailyDemandLiters;
      const usageCategories = [
        { label: 'Bathing & Shower', pct: 0.35, color: '#0ea5e9' },
        { label: 'Toilet Flushing', pct: 0.30, color: '#10b981' },
        { label: 'Clothes Washing', pct: 0.15, color: '#6366f1' },
        { label: 'Kitchen & Drinking', pct: 0.12, color: '#f59e0b' },
        { label: 'Garden & Cleaning', pct: 0.08, color: '#14b8a6' }
      ];

      const chartData = usageCategories.map(c => Math.round(d * c.pct));
      const chartLabels = usageCategories.map(c => c.label);
      const chartColors = usageCategories.map(c => c.color);

      waterBalanceChartInstance = new Chart(balanceCanvas.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: chartLabels,
          datasets: [{
            data: chartData,
            backgroundColor: chartColors,
            borderColor: '#ffffff',
            borderWidth: 3,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0f172a',
              callbacks: {
                label: function (context) {
                  return ` ${context.label}: ${context.raw} L/day (${usageCategories[context.dataIndex].pct * 100}%)`;
                }
              }
            }
          }
        }
      });

      const donutStats = document.getElementById('donutStatsSummary');
      if (donutStats) {
        donutStats.innerHTML = usageCategories.map(c => `
          <div class="donut-stat-item">
            <span class="donut-dot" style="background-color: ${c.color}"></span>
            <span>${c.label}</span>
            <span class="donut-stat-val">${Math.round(d * c.pct)} L</span>
          </div>
        `).join('');
      }
    }
  }

  function renderConsumptionAnalyticsChart() {
    const canvas = document.getElementById('consumptionAnalyticsChart');
    if (!canvas) return;

    if (analyticsChartInstance) analyticsChartInstance.destroy();

    const hydro = calculateHydrology();
    const timeframe = state.analyticsTimeframe;
    const logData = generateAnalyticsHistoryLog(timeframe, hydro);

    const labels = logData.map(l => l.period);
    const harvestData = logData.map(l => Math.round(l.harvested));
    const demandData = logData.map(l => Math.round(l.consumed));
    const balanceData = logData.map(l => Math.round(l.balance));

    analyticsChartInstance = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Rain Harvested (L)',
            data: harvestData,
            backgroundColor: 'rgba(16, 185, 129, 0.75)',
            borderColor: 'rgba(5, 150, 105, 1)',
            borderWidth: 1.5,
            borderRadius: 6
          },
          {
            label: 'Water Consumed (L)',
            data: demandData,
            backgroundColor: 'rgba(239, 68, 68, 0.65)',
            borderColor: 'rgba(220, 38, 38, 1)',
            borderWidth: 1.5,
            borderRadius: 6
          },
          {
            label: 'Net Storage Reserve (L)',
            data: balanceData,
            type: 'line',
            borderColor: 'rgba(2, 132, 199, 1)',
            backgroundColor: 'rgba(14, 165, 233, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: 'rgba(2, 132, 199, 1)',
            pointRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { font: { family: 'Inter', size: 12, weight: 600 }, boxWidth: 14 }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 10,
            cornerRadius: 8
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Inter', size: 11 }, color: '#64748b' }
          },
          y: {
            title: { display: true, text: 'Volume (Liters)', color: '#64748b', font: { size: 11, weight: 600 } },
            grid: { color: 'rgba(226, 232, 240, 0.6)' },
            ticks: { color: '#64748b', font: { size: 10 } }
          }
        }
      }
    });
  }

  // =========================================================================
  // 10. AI WATER ADVISOR (INTERACTIVE CHATBOT WITH LIVE WEBSITE DATA)
  // =========================================================================

  function updateAdvisorCards(hydro) {
    const shortageEl = document.getElementById('adviceShortageBody');
    if (shortageEl) {
      if (hydro.coverageDays < 5) {
        shortageEl.innerHTML = `
          <ul>
            <li><strong>Urgent Reserve Conservation:</strong> Current storage covers only <strong>${hydro.coverageDays} days</strong>. Restrict outdoor garden watering and vehicle washes immediately.</li>
            <li><strong>Low-Flow Retrofits:</strong> Tap aerators can save <strong>${Math.round(hydro.dailyDemandLiters * 0.18)} L/day</strong> without affecting comfort.</li>
            <li><strong>Schedule Municipal Backup:</strong> Refill buffer before tank drops below 10% reserve.</li>
          </ul>
        `;
      } else {
        shortageEl.innerHTML = `
          <ul>
            <li><strong>Safe Storage Runway:</strong> Your water storage gives <strong>${hydro.coverageDays} days</strong> of complete independence.</li>
            <li><strong>First-Flush Diverter:</strong> First 1.5mm is bypassing dust; maintain inspection every 30 days.</li>
            <li><strong>Sub-metering:</strong> Track seasonal consumption fluctuations to identify unseen plumbing leaks early.</li>
          </ul>
        `;
      }
    }

    const harvestEl = document.getElementById('adviceHarvestBody');
    if (harvestEl) {
      harvestEl.innerHTML = `
        <ul>
          <li><strong>Catchment Rating:</strong> Catchment area is <strong>${hydro.totalArea} m²</strong> (C = ${hydro.weightedCoeff.toFixed(2)}).</li>
          <li><strong>Weather Forecast:</strong> Next anticipated rainfall (${state.weather.rain24h} mm in ${state.weather.city}) will yield <strong>${formatNum(hydro.forecastHarvestLiters)} L</strong> net.</li>
          <li><strong>Percolation Link:</strong> Ensure overflow pit is cleared to replenish shallow borewells when tank hits 100%.</li>
        </ul>
      `;
    }

    const consEl = document.getElementById('adviceConservationBody');
    if (consEl) {
      consEl.innerHTML = `
        <ul>
          <li><strong>Dual-Flush Toilets:</strong> Replacing single-flush saves <strong>~${Math.round(hydro.dailyDemandLiters * 0.15)} L/day</strong> for your ${state.peopleCount} residents.</li>
          <li><strong>Drip Irrigation:</strong> Direct greywater or harvested overflow to plants in early morning to prevent evaporative loss.</li>
          <li><strong>Financial Payback:</strong> Your annual harvesting offset saves approximately <strong>₹${formatNum(hydro.annualFinancialSavings)}</strong> every year.</li>
        </ul>
      `;
    }
  }

  function initAdvisorChat() {
    const stream = document.getElementById('advisorStream');
    if (!stream) return;

    let history = [];
    try {
      const savedChat = localStorage.getItem(CHAT_STORAGE_KEY);
      if (savedChat) history = JSON.parse(savedChat);
    } catch (e) {
      console.warn("Could not load chat history:", e);
    }

    if (history.length === 0) {
      history = [{
        role: 'assistant',
        time: 'Just now',
        content: `Hello! I am your **RainSmart AI Water Advisor**. I am continuously monitoring your **${state.rooftops.length} rooftop catchments**, your current **${formatNum(state.storedWater)} L storage reservoir**, and the **${state.weather.rain24h} mm storm forecast in ${state.weather.city}**.\n\nAsk me anything or click a quick prompt chip above!`
      }];
    }

    renderChatStream(history);
  }

  function renderChatStream(history) {
    const stream = document.getElementById('advisorStream');
    if (!stream) return;

    stream.innerHTML = history.map(msg => {
      const isUser = msg.role === 'user';
      return `
        <div class="ai-bubble-card ${isUser ? 'user-bubble' : ''}">
          <div class="ai-card-header">
            <div class="ai-avatar" style="${isUser ? 'background: var(--water-600);' : ''}">
              <i class="fa-solid ${isUser ? 'fa-user' : 'fa-wand-magic-sparkles'}"></i>
            </div>
            <span class="ai-author">${isUser ? 'You' : 'RainSmart AI Advisor'}</span>
            <span class="ai-time">${msg.time || 'Just now'}</span>
          </div>
          <div class="ai-card-content">
            ${formatMarkdownToHTML(msg.content)}
          </div>
        </div>
      `;
    }).join('');

    stream.scrollTop = stream.scrollHeight;
  }

  async function handleAdvisorQuestion(query) {
    if (!query || query.trim() === '') return;
    const cleanQuery = query.trim();

    const stream = document.getElementById('advisorStream');
    const loading = document.getElementById('advisorLoading');
    const input = document.getElementById('advisorUserInput');
    if (input) input.value = '';

    // Load existing history
    let history = [];
    try {
      const savedChat = localStorage.getItem(CHAT_STORAGE_KEY);
      if (savedChat) history = JSON.parse(savedChat);
    } catch (e) { }

    const userMsg = {
      role: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: cleanQuery
    };
    history.push(userMsg);
    renderChatStream(history);

    if (loading) loading.style.display = 'flex';

    // Check if user has configured an external backend proxy
    const backendEndpoint = localStorage.getItem(BACKEND_ENDPOINT_STORAGE);
    let replyContent = "";

    if (backendEndpoint && backendEndpoint.startsWith('http')) {
      try {
        replyContent = await fetchBackendAIResponse(cleanQuery, backendEndpoint);
      } catch (err) {
        console.warn("Backend proxy failed, using expert hydrology rule engine:", err);
        replyContent = generateExpertRuleResponse(cleanQuery) + `\n\n*(Note: Backend endpoint unreachable; seamlessly generated by built-in Hydrology Expert Engine)*`;
      }
    } else {
      // Simulate natural realistic processing latency (350ms)
      await new Promise(r => setTimeout(r, 380));
      replyContent = generateExpertRuleResponse(cleanQuery);
    }

    if (loading) loading.style.display = 'none';

    const assistantMsg = {
      role: 'assistant',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: replyContent
    };
    history.push(assistantMsg);

    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(history));
    } catch (e) { }

    renderChatStream(history);
  }

  function generateExpertRuleResponse(q) {
    const hydro = calculateHydrology();
    const lq = q.toLowerCase();

    if (lq.includes('overflow') || lq.includes('monsoon') || lq.includes('spill')) {
      return `
### 🌧️ Monsoon Overflow Mitigation Plan
Based on your live system telemetry:
- **Current Available Headroom:** **${formatNum(hydro.remainingHeadroom)} Liters**
- **Incoming Storm Yield (${state.rainfall} mm):** **${formatNum(hydro.netHarvestLiters)} Liters**
- **Forecast Rainfall in ${state.weather.city} (${state.weather.rain24h} mm):** **${formatNum(hydro.forecastHarvestLiters)} Liters**
${hydro.overflowLiters > 0
          ? `- **Projected Overflow Risk:** **${formatNum(hydro.overflowLiters)} Liters** will overflow if not managed.`
          : `- **Status:** Safe buffer. Current tank can store the entire anticipated storm volume.`}

**Actionable Engineering Steps:**
1. **Percolation Recharge Pit:** Route the secondary 3-inch overflow PVC pipe into a graded gravel soakaway pit to recharge groundwater tables.
2. **Pre-Storm Domestic Consumption:** Use 1,500 L for laundry, car washing, and toilet cisterns before the rain to create headroom.
3. **Multi-Tank Siphon:** Link an auxiliary 5,000L polyethylene tank via an equalizer pipe.
      `;
    }

    if (lq.includes('how many days') || lq.includes('coverage') || lq.includes('duration') || lq.includes('last') || lq.includes('autonomy')) {
      return `
### ⏳ Water Autonomy & Coverage Analysis
- **Current Stored Water:** **${formatNum(state.storedWater)} Liters** (${hydro.tankFillPct}% full).
- **Daily Building Demand:** **${formatNum(hydro.dailyDemandLiters)} Liters/day** (${state.peopleCount} occupants @ ${state.dailyRatePerPerson} L/day).
- **Exact Coverage Duration:** **${hydro.coverageDays} consecutive days** off-grid.

**To extend coverage to ${(Number(hydro.coverageDays) * 1.4).toFixed(1)} days:**
- Install dual-flush toilet valves (saves ~15% or ${Math.round(hydro.dailyDemandLiters * 0.15)} L/day).
- Use low-flow aerators on bathroom taps (saves ~20% or ${Math.round(hydro.dailyDemandLiters * 0.20)} L/day).
      `;
    }

    if (lq.includes('explain') || lq.includes('formula') || lq.includes('calculation') || lq.includes('v = r')) {
      return `
### 📐 Hydrological Calculation Breakdown: V = R × A × C
Your rainwater harvest is computed using the international hydrological standard:
$$\\mathbf{Collected\\ Water\\ (L) = Rainfall\\ (mm) \\times Roof\\ Area\\ (m^2) \\times Runoff\\ Coefficient}$$

Here are your live parameters:
1. **Rainfall Depth (R) = ${state.rainfall} mm**: 1 mm over 1 m² equals 1.0 Liter of gross precipitation.
2. **Total Roof Catchment (A) = ${hydro.totalArea} m²** (${state.rooftopMode === 'multi' ? `${state.rooftops.length} distinct rooftops combined` : state.roofName}).
3. **Weighted Runoff Coefficient (C) = ${hydro.weightedCoeff.toFixed(2)}**: Accounts for thermal evaporation and surface absorption (${((1 - hydro.weightedCoeff) * 100).toFixed(0)}% losses).
4. **First-Flush Filter Deduction = ${state.firstFlush ? `${state.firstFlushDepth} mm (${formatNum(hydro.flushDivertedLiters)} L)` : '0 mm'}**: Removes dust, soot, and particulate debris.
5. **Net Harvest Volume (V) = ${formatNum(hydro.netHarvestLiters)} Liters** (${(hydro.netHarvestLiters / 1000).toFixed(2)} m³), delivering **${hydro.efficiencyPct}% catchment efficiency**.
      `;
    }

    if (lq.includes('multiple') || lq.includes('multi-roof') || lq.includes('rooftop')) {
      return `
### 🏢 Multiple Rooftop System Optimization
You currently have **${state.rooftops.length} configured rooftop surfaces**:
${state.rooftops.map(r => `- **${r.name}:** ${r.area} m² (C = ${Number(r.coeff).toFixed(2)}) → Yields **${formatNum(r.calculatedHarvest || Math.round(state.rainfall * r.area * r.coeff))} Liters**`).join('\n')}

**Key Recommendations:**
- Metal roofs produce highest quality water with lowest absorption (C = 0.90). Direct metal roof yield into your primary drinking/washing tank.
- Concrete terrace water (C = 0.80) contains more dust; run it through a sand-gravel filter before tank storage.
      `;
    }

    if (lq.includes('fixture') || lq.includes('roi') || lq.includes('conservation') || lq.includes('saving') || lq.includes('money') || lq.includes('cost')) {
      return `
### 💡 Financial Savings & Conservation Analysis
- **Annual Harvest Potential:** **${formatNum(hydro.annualHarvestLiters)} Liters** (${(hydro.annualHarvestLiters / 1000).toFixed(1)} kL).
- **Estimated Annual Financial Savings:** **₹${formatNum(hydro.annualFinancialSavings)} / year** (benchmarked against standard urban tanker rate of ₹${state.waterCostPerThousandLiters}/kL).
- **Carbon Footprint Offset:** Avoids **${hydro.co2SavedKg} kg CO₂e** in municipal booster pumping energy.

**Highest ROI Hardware Upgrades:**
1. **Low-flow Tap Aerators (Cost: ~₹250 each):** Reduces sink delivery from 12 L/min to 4 L/min. For your ${state.peopleCount} occupants, saves **${Math.round(hydro.dailyDemandLiters * 0.18)} L/day**.
2. **Dual-Flush Cisterns (Cost: ~₹1,200):** Replaces 10L single flush with 3L/6L dual buttons, saving **${Math.round(hydro.dailyDemandLiters * 0.15)} L/day**.
3. **Greywater Diverter:** Route washing machine rinse water to garden beds and toilet flushing.
      `;
    }

    if (lq.includes('drink') || lq.includes('potable') || lq.includes('purif') || lq.includes('quality') || lq.includes('safe')) {
      return `
### 🚰 Rainwater Potability & Filtration Guidelines
Rainwater collected from clean roofs is naturally soft and mineral-free, but requires filtration before human consumption:
1. **First-Flush Diverter Active:** Discards the initial 1.5mm of rain containing atmospheric soot, dust, and bird droppings.
2. **Dual-Stage Pre-filtration:** Run inflow through a 100-micron stainless steel mesh leaf catcher followed by a rapid sand-gravel filter.
3. **Storage Hygiene:** Your reservoir should be opaque and light-sealed (current simulated turbidity is **${state.sensor.turbidity} NTU**).
4. **Final Stage for Drinking:** To make it 100% potable, pass water through an Activated Carbon block + Ultraviolet (UV) disinfection unit or boil for 3 minutes.
      `;
    }

    if (lq.includes('tank size') || lq.includes('capacity') || lq.includes('sizing') || lq.includes('dimension')) {
      const recommendedCap = Math.round(hydro.dailyDemandLiters * 21); // 3 weeks of buffer
      return `
### 🛢️ Reservoir Capacity & Sizing Guide
Based on your building's current demographics:
- **Occupants:** ${state.peopleCount} Residents
- **Daily Consumption:** ${formatNum(hydro.dailyDemandLiters)} L/day
- **Current Tank Capacity:** **${formatNum(state.tankCapacity)} Liters** (${hydro.coverageDays} days autonomy).
- **Recommended Tank Size (21-Day Autonomy Buffer):** **${formatNum(recommendedCap)} Liters**.

${state.tankCapacity < recommendedCap
          ? `*Insight: Your current tank (${formatNum(state.tankCapacity)} L) provides a ${hydro.coverageDays}-day reserve. Upgrading to a ${formatNum(recommendedCap)} L tank will ensure 3 full weeks of autonomy through seasonal dry intervals.*`
          : `*Insight: Your ${formatNum(state.tankCapacity)} L tank is well-sized, comfortably exceeding the standard 2-week emergency water reserve threshold.*`}
      `;
    }

    if (lq.includes('clean') || lq.includes('maintenance') || lq.includes('wash') || lq.includes('gutter') || lq.includes('leaf')) {
      return `
### 🧹 Catchment & First-Flush Maintenance Protocol
To ensure high catchment efficiency and water clarity:
1. **Gutter Cleaning:** Remove leaves, moss, and silt from gutters at least once before monsoon onset and every 15 days during peak rains.
2. **First-Flush Chamber Reset:** Unscrew the threaded bottom cap of the first-flush pipe after every 7 rainless days to flush out accumulated sediment.
3. **Tank Sediment Purge:** Drain and scrub the tank floor once every 2 years before the first seasonal showers.
      `;
    }

    // Default intelligent hydrological diagnosis
    return `
### 💧 Smart Hydrology Diagnostic
- **Active Catchment:** ${hydro.totalArea} m² roof area with ${hydro.weightedCoeff.toFixed(2)} runoff coefficient.
- **Harvest Potential:** Current storm yields **${formatNum(hydro.netHarvestLiters)} L**, while live forecast for ${state.weather.city} indicates **${formatNum(hydro.forecastHarvestLiters)} L**.
- **Autonomy Status:** Your ${formatNum(state.storedWater)} L storage provides **${hydro.coverageDays} days** of complete off-grid water independence for ${state.peopleCount} residents.

*Tip: Check the 'Usage Analytics' tab to inspect your 7-day and 12-month water balance curves!*
    `;
  }

  async function fetchBackendAIResponse(userPrompt, endpoint) {
    const hydro = calculateHydrology();
    const payload = {
      message: userPrompt,
      telemetry: {
        roofArea: hydro.totalArea,
        roofCoeff: hydro.weightedCoeff,
        rainfall: state.rainfall,
        storedWater: state.storedWater,
        tankCapacity: state.tankCapacity,
        peopleCount: state.peopleCount,
        dailyDemand: hydro.dailyDemandLiters,
        coverageDays: hydro.coverageDays,
        city: state.weather.city,
        forecastRain: state.weather.rain24h
      }
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.reply || data.response || "No response received from backend.";
  }

  // =========================================================================
  // 11. REPORTS & CSV EXPORT GENERATOR
  // =========================================================================

  function exportWaterAuditCSV() {
    const hydro = calculateHydrology();
    const dateStr = new Date().toISOString().split('T')[0];

    let csv = `RainSmart Water Audit & Urban Hydrology Feasibility Report\n`;
    csv += `Generated Date,${dateStr}\n`;
    csv += `Location / City,${state.weather.city}\n`;
    csv += `Demo Scenario,${state.currentPreset}\n`;
    csv += `Weather Condition,${state.weather.conditionText} (${state.weather.temp} C)\n\n`;

    csv += `--- STORAGE RESERVOIR & TELEMETRY ---\n`;
    csv += `Tank Total Capacity (L),${state.tankCapacity}\n`;
    csv += `Current Stored Volume (L),${state.storedWater}\n`;
    csv += `Available Headroom Space (L),${hydro.remainingHeadroom}\n`;
    csv += `Reservoir Fill Percentage,${hydro.tankFillPct}%\n`;
    csv += `Days of Water Autonomy,${hydro.coverageDays} Days\n\n`;

    csv += `--- DEMOGRAPHIC WATER DEMAND ---\n`;
    csv += `Resident Occupants,${state.peopleCount}\n`;
    csv += `Per Capita Consumption (L/person/day),${state.dailyRatePerPerson}\n`;
    csv += `Total Daily Demand (L/day),${hydro.dailyDemandLiters}\n`;
    csv += `Monthly Demand (L/month),${hydro.monthlyDemandLiters}\n`;
    csv += `Annual Demand (L/year),${hydro.annualDemandLiters}\n\n`;

    csv += `--- ROOFTOP CATCHMENT INVENTORY ---\n`;
    csv += `Roof ID,Name,Area (m2),Runoff Coefficient (C),Calculated Harvest (L)\n`;
    if (state.rooftopMode === 'multi') {
      state.rooftops.forEach(r => {
        csv += `${r.id},"${r.name}",${r.area},${r.coeff},${r.calculatedHarvest || Math.round(state.rainfall * r.area * r.coeff)}\n`;
      });
    } else {
      csv += `rf_single,"${state.roofName}",${state.roofArea},${state.roofCoeff},${hydro.netHarvestLiters}\n`;
    }
    csv += `Total Catchment Area (m2),${hydro.totalArea}\n`;
    csv += `Weighted Runoff Coefficient,${hydro.weightedCoeff.toFixed(2)}\n`;
    csv += `First Flush Filtration Deducted (L),${hydro.flushDivertedLiters}\n`;
    csv += `Net Design Storm Harvest (L),${hydro.netHarvestLiters}\n\n`;

    csv += `--- ECONOMIC & ECOLOGICAL IMPACT ---\n`;
    csv += `Annual Rainwater Potential (L),${hydro.annualHarvestLiters}\n`;
    csv += `Annual Municipal Cost Savings (INR),${hydro.annualFinancialSavings}\n`;
    csv += `Groundwater Aquifer Recharged (L),${Math.round(hydro.annualHarvestLiters * 0.25)}\n`;
    csv += `Carbon Emissions Avoided (kg CO2e),${hydro.co2SavedKg}\n\n`;

    csv += `--- HISTORICAL WATER BALANCE LOG (${state.analyticsTimeframe.toUpperCase()}) ---\n`;
    csv += `Period,Rainfall (mm),Harvested (L),Consumed (L),Balance (L),Savings (INR)\n`;
    const logs = generateAnalyticsHistoryLog(state.analyticsTimeframe, hydro);
    logs.forEach(l => {
      csv += `${l.period},${l.rainfall},${l.harvested},${l.consumed},${l.balance},${l.savings}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `RainSmart_Water_Audit_${state.weather.city}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Water Audit CSV downloaded successfully!', 'success');
  }

  // =========================================================================
  // 12. EVENT LISTENERS & UI WIRING
  // =========================================================================

  function syncUIWithState() {
    // Preset dropdown
    const presetSelect = document.getElementById('buildingPresetSelect');
    if (presetSelect) presetSelect.value = state.currentPreset || 'residential';

    // Calculator inputs
    const calcRainRange = document.getElementById('calcRainfallRange');
    const calcRainNum = document.getElementById('calcRainfall');
    const calcRainDisp = document.getElementById('calcRainfallDisplay');
    if (calcRainRange) calcRainRange.value = state.rainfall;
    if (calcRainNum) calcRainNum.value = state.rainfall;
    if (calcRainDisp) calcRainDisp.textContent = state.rainfall;

    const calcRoofRange = document.getElementById('calcRoofAreaRange');
    const calcRoofNum = document.getElementById('calcRoofArea');
    const calcRoofDisp = document.getElementById('calcRoofAreaDisplay');
    const calcRoofSqft = document.getElementById('calcRoofSqft');
    if (calcRoofRange) calcRoofRange.value = state.roofArea;
    if (calcRoofNum) calcRoofNum.value = state.roofArea;
    if (calcRoofDisp) calcRoofDisp.textContent = state.roofArea;
    if (calcRoofSqft) calcRoofSqft.textContent = formatNum(Math.round(state.roofArea * 10.764));

    // Multi-roof rainfall input
    const multiRainInput = document.getElementById('multiRoofGlobalRain');
    if (multiRainInput) multiRainInput.value = state.rainfall;

    // Roof radio cards (Single mode)
    const roofCards = document.querySelectorAll('.roof-card');
    roofCards.forEach(card => {
      const coeff = parseFloat(card.dataset.coeff);
      const isSelected = Math.abs(coeff - state.roofCoeff) < 0.02;
      card.classList.toggle('selected', isSelected);
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = isSelected;
    });

    const coeffBadge = document.getElementById('coeffValueBadge');
    if (coeffBadge) coeffBadge.textContent = `C = ${state.roofCoeff.toFixed(2)}`;

    const firstFlushToggle = document.getElementById('calcFirstFlushToggle');
    if (firstFlushToggle) firstFlushToggle.checked = state.firstFlush;

    // Mode tabs (Single vs Multi)
    const tabSingle = document.getElementById('tabSingleRoofMode');
    const tabMulti = document.getElementById('tabMultiRoofMode');
    const secSingle = document.getElementById('singleRoofSection');
    const secMulti = document.getElementById('multiRoofSection');

    if (tabSingle && tabMulti && secSingle && secMulti) {
      const isMulti = state.rooftopMode === 'multi';
      tabSingle.classList.toggle('active', !isMulti);
      tabMulti.classList.toggle('active', isMulti);
      secSingle.style.display = isMulti ? 'none' : 'block';
      secMulti.style.display = isMulti ? 'block' : 'none';
    }

    // Tank inputs
    const tankCapInput = document.getElementById('tankCapacityInput');
    if (tankCapInput) tankCapInput.value = state.tankCapacity;

    const tankCurInput = document.getElementById('tankCurrentInput');
    if (tankCurInput) tankCurInput.value = state.storedWater;

    const capChips = document.querySelectorAll('.btn-chip');
    capChips.forEach(chip => {
      const cap = parseInt(chip.dataset.cap, 10);
      chip.classList.toggle('active', cap === state.tankCapacity);
    });

    // Demand inputs
    const demandPeopleRange = document.getElementById('demandPeopleRange');
    if (demandPeopleRange) demandPeopleRange.value = state.peopleCount;

    const demandCustomRate = document.getElementById('demandCustomPerPerson');
    if (demandCustomRate) demandCustomRate.value = state.dailyRatePerPerson;

    const rateBtns = document.querySelectorAll('.btn-rate-preset');
    rateBtns.forEach(btn => {
      const rate = parseInt(btn.dataset.rate, 10);
      btn.classList.toggle('active', rate === state.dailyRatePerPerson);
    });

    // Preset rainfall buttons in calculator
    const rainPresets = document.querySelectorAll('.btn-preset');
    rainPresets.forEach(btn => {
      const r = parseInt(btn.dataset.rain, 10);
      btn.classList.toggle('active', r === state.rainfall);
    });

    // Weather City Buttons
    const cityBtns = document.querySelectorAll('.btn-city');
    cityBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.city.toLowerCase() === state.weather.city.toLowerCase());
    });

    // Analytics Timeframe Buttons
    const tfBtns = document.querySelectorAll('.btn-timeframe');
    tfBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.timeframe === state.analyticsTimeframe);
    });

    // Backend endpoint input
    const backendInput = document.getElementById('aiBackendEndpointInput');
    const savedEndpoint = localStorage.getItem(BACKEND_ENDPOINT_STORAGE);
    const keyStatus = document.getElementById('apiKeyStatusText');
    const keyEngine = document.getElementById('aiEngineLabel');

    if (savedEndpoint && backendInput) backendInput.value = savedEndpoint;
    if (savedEndpoint && keyStatus && keyEngine) {
      keyStatus.textContent = `Connected to Secure Backend Proxy (${savedEndpoint})`;
      keyEngine.textContent = 'Backend LLM Proxy';
    } else if (keyStatus && keyEngine) {
      keyStatus.textContent = 'Using built-in Expert Rule-Based AI Engine (Local & Secure)';
      keyEngine.textContent = 'Heuristic Rules Engine';
    }

    renderRooftopsList();
  }

  function setupEventListeners() {
    // -----------------------------------------------------------------------
    // Navigation Tabs
    // -----------------------------------------------------------------------
    const navLinks = document.querySelectorAll('.nav-link, .alert-action-btn, [data-tab]');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        const tabTarget = link.getAttribute('data-tab');
        if (!tabTarget) return;

        document.querySelectorAll('.nav-link').forEach(nl => {
          nl.classList.toggle('active', nl.getAttribute('data-tab') === tabTarget);
        });

        document.querySelectorAll('.tab-pane').forEach(tp => {
          tp.classList.remove('active');
        });
        const targetView = document.getElementById(`view-${tabTarget}`);
        if (targetView) targetView.classList.add('active');

        // Titles
        const titles = {
          dashboard: { t: "System Overview", s: "AI-powered rainwater harvesting, live meteorological forecast & dynamic urban water management" },
          weather: { t: "Live Weather & Rainfall Forecast", s: "Real-time atmospheric telemetry via Open-Meteo API with automated collection modeling" },
          calculator: { t: "Rooftop Catchment Calculator", s: "Single & Multiple rooftop volume calculation using V = Rainfall × Area × Runoff Coefficient" },
          tank: { t: "Smart Tank Monitoring & IoT Telemetry", s: "Visual liquid level gauge, simulated ultrasonic sensor stream, and overflow routing" },
          demand: { t: "Water Demand & Coverage Estimator", s: "Domestic consumption analysis and off-grid water autonomy days projection" },
          analytics: { t: "Water Consumption Analytics", s: "Daily, Weekly, and Monthly water usage charts, balance curves, and municipal savings" },
          advisor: { t: "AI Water Advisor Chatbot", s: "Contextual advice driven by your live catchment, reservoir storage, and weather forecast" },
          reports: { t: "Ecological ROI & Audit Assessment", s: "Downloadable CSV audit report, printable certified assessment, and financial savings" }
        };

        const titleEl = document.getElementById('pageTitle');
        const subEl = document.getElementById('pageSubtitle');
        if (titleEl && titles[tabTarget]) titleEl.textContent = titles[tabTarget].t;
        if (subEl && titles[tabTarget]) subEl.textContent = titles[tabTarget].s;

        closeMobileSidebar();

        if (tabTarget === 'dashboard' || tabTarget === 'analytics') {
          setTimeout(renderAllCharts, 60);
        }
      });
    });

    // Mobile drawer toggles
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const closeBtn = document.getElementById('sidebarCloseBtn');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (toggleBtn) toggleBtn.addEventListener('click', openMobileSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeMobileSidebar);
    if (backdrop) backdrop.addEventListener('click', closeMobileSidebar);

    // Alerts Bell Toggle
    const bellBtn = document.getElementById('btnAlertsBell');
    const alertsFlyout = document.getElementById('alertsFlyout');
    if (bellBtn && alertsFlyout) {
      bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        alertsFlyout.classList.toggle('open');
      });
      document.addEventListener('click', (e) => {
        if (!alertsFlyout.contains(e.target) && e.target !== bellBtn) {
          alertsFlyout.classList.remove('open');
        }
      });
    }

    const btnDismissAll = document.getElementById('btnDismissAllAlerts');
    if (btnDismissAll) btnDismissAll.addEventListener('click', dismissAllAlerts);

    const btnDismissMainBanner = document.getElementById('btnDismissMainBanner');
    if (btnDismissMainBanner) {
      btnDismissMainBanner.addEventListener('click', () => {
        const active = generateActiveAlerts();
        if (active.length > 0) dismissAlert(active[0].id);
      });
    }

    const btnRefreshAlerts = document.getElementById('btnRefreshAlerts');
    if (btnRefreshAlerts) {
      btnRefreshAlerts.addEventListener('click', () => {
        dismissedAlertIds.clear();
        saveDismissedAlerts();
        updateAlertsUI();
        showToast('Refreshed smart alerts check', 'info');
      });
    }

    // -----------------------------------------------------------------------
    // Preset Scenarios Selector
    // -----------------------------------------------------------------------
    const presetSelect = document.getElementById('buildingPresetSelect');
    if (presetSelect) {
      presetSelect.addEventListener('change', (e) => {
        const selected = e.target.value;
        if (PRESETS[selected]) {
          state.currentPreset = selected;
          Object.assign(state, PRESETS[selected]);
          state.rooftops = JSON.parse(JSON.stringify(PRESETS[selected].rooftops));
          saveState();
          syncUIWithState();
          recalculateAll();
          renderAllCharts();
          showToast(`Loaded scenario: ${PRESETS[selected].name}`, 'success');
        }
      });
    }

    // -----------------------------------------------------------------------
    // Live Weather Controls
    // -----------------------------------------------------------------------
    const cityBtns = document.querySelectorAll('.btn-city');
    cityBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const city = btn.dataset.city;
        const lat = parseFloat(btn.dataset.lat);
        const lon = parseFloat(btn.dataset.lon);
        cityBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        fetchOpenMeteoWeather(lat, lon, city);
      });
    });

    const btnFetchCustom = document.getElementById('btnFetchCustomWeather');
    const customCityInput = document.getElementById('weatherCustomCity');
    if (btnFetchCustom && customCityInput) {
      btnFetchCustom.addEventListener('click', () => {
        const val = customCityInput.value.trim();
        if (!val) return;
        if (val.includes(',')) {
          const parts = val.split(',');
          const lat = parseFloat(parts[0]);
          const lon = parseFloat(parts[1]);
          if (!isNaN(lat) && !isNaN(lon)) {
            fetchOpenMeteoWeather(lat, lon, `Custom (${lat.toFixed(2)}, ${lon.toFixed(2)})`);
            return;
          }
        }
        fetchOpenMeteoWeather(12.9716, 77.5946, val);
      });
    }

    const btnToggleDemoWeather = document.getElementById('btnToggleWeatherDemo');
    if (btnToggleDemoWeather) {
      btnToggleDemoWeather.addEventListener('click', () => {
        state.weather.mode = state.weather.mode === 'live' ? 'demo' : 'live';
        btnToggleDemoWeather.textContent = state.weather.mode === 'live' ? 'Switch to Demo Mode' : 'Switch to Live API';
        fetchOpenMeteoWeather(state.weather.lat, state.weather.lon, state.weather.city);
        syncUIWithState();
      });
    }

    const btnApplyForecast = document.getElementById('btnApplyForecastRainToCalc');
    if (btnApplyForecast) {
      btnApplyForecast.addEventListener('click', () => {
        state.rainfall = state.weather.rain24h;
        saveState();
        syncUIWithState();
        recalculateAll();
        renderAllCharts();

        const calcTab = document.querySelector('.nav-link[data-tab="calculator"]');
        if (calcTab) calcTab.click();
        showToast(`Transferred ${state.weather.rain24h} mm forecast rainfall into calculator!`, 'success');
      });
    }

    // -----------------------------------------------------------------------
    // Single & Multi-Roof Mode Switchers
    // -----------------------------------------------------------------------
    const tabSingleRoof = document.getElementById('tabSingleRoofMode');
    const tabMultiRoof = document.getElementById('tabMultiRoofMode');

    if (tabSingleRoof && tabMultiRoof) {
      tabSingleRoof.addEventListener('click', () => {
        state.rooftopMode = 'single';
        saveState();
        syncUIWithState();
        recalculateAll();
        renderAllCharts();
        showToast('Switched to Single Rooftop Calculator', 'info');
      });

      tabMultiRoof.addEventListener('click', () => {
        state.rooftopMode = 'multi';
        saveState();
        syncUIWithState();
        recalculateAll();
        renderAllCharts();
        showToast('Switched to Multiple Rooftop System', 'info');
      });
    }

    const btnAddRoof = document.getElementById('btnAddRooftop');
    if (btnAddRoof) btnAddRoof.addEventListener('click', addNewRooftop);

    const multiRainInput = document.getElementById('multiRoofGlobalRain');
    if (multiRainInput) {
      multiRainInput.addEventListener('input', (e) => {
        const num = Math.max(0, parseInt(e.target.value, 10) || 0);
        state.rainfall = num;
        if (calcRainRange) calcRainRange.value = num;
        if (calcRainNum) calcRainNum.value = num;
        if (calcRainDisp) calcRainDisp.textContent = num;
        updateRainPresetButtons(num);
        saveState();
        recalculateAll();
        renderAllCharts();
      });
    }

    const btnSyncWeatherRain = document.getElementById('btnSyncWeatherRain');
    if (btnSyncWeatherRain) {
      btnSyncWeatherRain.addEventListener('click', () => {
        state.rainfall = state.weather.rain24h;
        if (multiRainInput) multiRainInput.value = state.rainfall;
        if (calcRainRange) calcRainRange.value = state.rainfall;
        if (calcRainNum) calcRainNum.value = state.rainfall;
        if (calcRainDisp) calcRainDisp.textContent = state.rainfall;
        updateRainPresetButtons(state.rainfall);
        saveState();
        recalculateAll();
        renderAllCharts();
        showToast(`Synchronized with forecast rainfall (${state.rainfall} mm)`, 'info');
      });
    }

    const btnApplyMultiToTank = document.getElementById('btnApplyMultiRoofToTank');
    if (btnApplyMultiToTank) {
      btnApplyMultiToTank.addEventListener('click', () => {
        const hydro = calculateHydrology();
        const prevLevel = state.storedWater;
        const newTotal = prevLevel + hydro.netHarvestLiters;

        if (newTotal > state.tankCapacity) {
          state.storedWater = state.tankCapacity;
          const overflow = newTotal - state.tankCapacity;
          showToast(`Combined Multi-Roof harvest added! Reservoir full (${formatNum(state.tankCapacity)} L). ${formatNum(overflow)} L directed to recharge percolation pit.`, 'warning');
        } else {
          state.storedWater = newTotal;
          showToast(`Added combined multi-roof harvest (+${formatNum(hydro.netHarvestLiters)} L)`, 'success');
        }

        saveState();
        syncUIWithState();
        recalculateAll();
        triggerInflowAnimation();
      });
    }

    // -----------------------------------------------------------------------
    // Single Roof Calculator Controls
    // -----------------------------------------------------------------------
    const calcRainRange = document.getElementById('calcRainfallRange');
    const calcRainNum = document.getElementById('calcRainfall');
    const calcRainDisp = document.getElementById('calcRainfallDisplay');

    if (calcRainRange && calcRainNum) {
      const updateRain = (val) => {
        const num = Math.max(0, parseInt(val, 10) || 0);
        state.rainfall = num;
        calcRainRange.value = num;
        calcRainNum.value = num;
        if (calcRainDisp) calcRainDisp.textContent = num;
        if (multiRainInput) multiRainInput.value = num;
        updateRainPresetButtons(num);
        saveState();
        recalculateAll();
        renderAllCharts();
      };
      calcRainRange.addEventListener('input', (e) => updateRain(e.target.value));
      calcRainNum.addEventListener('input', (e) => updateRain(e.target.value));
    }

    const calcRoofRange = document.getElementById('calcRoofAreaRange');
    const calcRoofNum = document.getElementById('calcRoofArea');
    const calcRoofDisp = document.getElementById('calcRoofAreaDisplay');
    const calcRoofSqft = document.getElementById('calcRoofSqft');

    if (calcRoofRange && calcRoofNum) {
      const updateRoof = (val) => {
        const num = Math.max(1, parseInt(val, 10) || 1);
        state.roofArea = num;
        calcRoofRange.value = num;
        calcRoofNum.value = num;
        if (calcRoofDisp) calcRoofDisp.textContent = num;
        if (calcRoofSqft) calcRoofSqft.textContent = formatNum(Math.round(num * 10.764));
        saveState();
        recalculateAll();
        renderAllCharts();
      };
      calcRoofRange.addEventListener('input', (e) => updateRoof(e.target.value));
      calcRoofNum.addEventListener('input', (e) => updateRoof(e.target.value));
    }

    // Roof Type radio cards
    const roofCards = document.querySelectorAll('.roof-card');
    roofCards.forEach(card => {
      card.addEventListener('click', () => {
        roofCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;

        state.roofCoeff = parseFloat(card.dataset.coeff);
        state.roofName = card.dataset.name;
        const coeffBadge = document.getElementById('coeffValueBadge');
        if (coeffBadge) coeffBadge.textContent = `C = ${state.roofCoeff.toFixed(2)}`;

        saveState();
        recalculateAll();
        renderAllCharts();
        showToast(`Roof material: ${state.roofName} (C = ${state.roofCoeff})`, 'info');
      });
    });

    // First Flush Toggle
    const flushToggle = document.getElementById('calcFirstFlushToggle');
    if (flushToggle) {
      flushToggle.addEventListener('change', (e) => {
        state.firstFlush = e.target.checked;
        saveState();
        recalculateAll();
        renderAllCharts();
        showToast(`First-flush filtration ${state.firstFlush ? 'activated (1.5mm deduction)' : 'bypassed'}`, 'info');
      });
    }

    // Preset Rainfall Buttons
    const rainPresets = document.querySelectorAll('.btn-preset');
    rainPresets.forEach(btn => {
      btn.addEventListener('click', () => {
        const r = parseInt(btn.dataset.rain, 10);
        state.rainfall = r;
        if (calcRainRange) calcRainRange.value = r;
        if (calcRainNum) calcRainNum.value = r;
        if (calcRainDisp) calcRainDisp.textContent = r;
        if (multiRainInput) multiRainInput.value = r;
        updateRainPresetButtons(r);
        saveState();
        recalculateAll();
        renderAllCharts();
        showToast(`Storm depth set to ${r} mm`, 'info');
      });
    });

    function updateRainPresetButtons(activeR) {
      rainPresets.forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.rain, 10) === activeR);
      });
    }

    // "Calculate & Apply to Tank" Button
    const btnCalculateSave = document.getElementById('btnCalculateSave');
    if (btnCalculateSave) {
      btnCalculateSave.addEventListener('click', () => {
        const hydro = calculateHydrology();
        const prevLevel = state.storedWater;
        const newTotal = prevLevel + hydro.netHarvestLiters;

        if (newTotal > state.tankCapacity) {
          state.storedWater = state.tankCapacity;
          const overflow = newTotal - state.tankCapacity;
          showToast(`Reservoir topped up to capacity (${formatNum(state.tankCapacity)} L). ${formatNum(overflow)} L directed to recharge pit.`, 'warning');
        } else {
          state.storedWater = newTotal;
          showToast(`Harvested +${formatNum(hydro.netHarvestLiters)} L pumped into storage reservoir!`, 'success');
        }

        saveState();
        syncUIWithState();
        recalculateAll();
        triggerInflowAnimation();
      });
    }

    // -----------------------------------------------------------------------
    // Smart Tank Monitoring Controls
    // -----------------------------------------------------------------------
    const tankCapInput = document.getElementById('tankCapacityInput');
    const btnUpdateCap = document.getElementById('btnUpdateCapacity');
    if (btnUpdateCap && tankCapInput) {
      btnUpdateCap.addEventListener('click', () => {
        const newCap = Math.max(500, parseInt(tankCapInput.value, 10) || 10000);
        state.tankCapacity = newCap;
        if (state.storedWater > newCap) state.storedWater = newCap;
        saveState();
        syncUIWithState();
        recalculateAll();
        showToast(`Tank capacity updated to ${formatNum(newCap)} Liters`, 'success');
      });
    }

    const capChips = document.querySelectorAll('.btn-chip');
    capChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const cap = parseInt(chip.dataset.cap, 10);
        state.tankCapacity = cap;
        if (state.storedWater > cap) state.storedWater = cap;
        if (tankCapInput) tankCapInput.value = cap;
        capChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        saveState();
        syncUIWithState();
        recalculateAll();
        showToast(`Tank capacity set to ${formatNum(cap)} Liters`, 'info');
      });
    });

    const tankCurInput = document.getElementById('tankCurrentInput');
    const btnSetLevel = document.getElementById('btnSetCurrentLevel');
    if (btnSetLevel && tankCurInput) {
      btnSetLevel.addEventListener('click', () => {
        let newLevel = Math.max(0, parseInt(tankCurInput.value, 10) || 0);
        if (newLevel > state.tankCapacity) {
          newLevel = state.tankCapacity;
          showToast(`Clamped level to max tank capacity (${formatNum(state.tankCapacity)} L)`, 'warning');
        } else {
          showToast(`Storage water level set to ${formatNum(newLevel)} L`, 'success');
        }
        state.storedWater = newLevel;
        saveState();
        syncUIWithState();
        recalculateAll();
      });
    }

    const btnToggleSensor = document.getElementById('btnToggleSensorStream');
    if (btnToggleSensor) {
      btnToggleSensor.addEventListener('click', () => {
        state.sensor.active = !state.sensor.active;
        const icon = document.getElementById('sensorStreamIcon');
        const text = document.getElementById('sensorStreamText');
        if (icon && text) {
          icon.className = state.sensor.active ? 'fa-solid fa-pause' : 'fa-solid fa-play';
          text.textContent = state.sensor.active ? 'Live' : 'Paused';
        }
        showToast(`Simulated IoT Sensor stream ${state.sensor.active ? 'resumed' : 'paused'}`, 'info');
      });
    }

    // Operations buttons
    const btnSimRain = document.getElementById('btnSimulateRainInflow');
    if (btnSimRain) {
      btnSimRain.addEventListener('click', () => {
        const hydro = calculateHydrology();
        const prevLevel = state.storedWater;
        const newTotal = prevLevel + hydro.netHarvestLiters;

        if (newTotal > state.tankCapacity) {
          state.storedWater = state.tankCapacity;
          const overflow = newTotal - state.tankCapacity;
          showToast(`Storm added! Tank full (${formatNum(state.tankCapacity)} L). ${formatNum(overflow)} L directed to recharge percolation pit.`, 'warning');
        } else {
          state.storedWater = newTotal;
          showToast(`Added calculated storm volume (+${formatNum(hydro.netHarvestLiters)} L)`, 'success');
        }

        saveState();
        syncUIWithState();
        recalculateAll();
        triggerInflowAnimation();
      });
    }

    const btnSimUse = document.getElementById('btnSimulateDailyUse');
    if (btnSimUse) btnSimUse.addEventListener('click', simulateDailyUsage);

    const btnTopUp = document.getElementById('btnFillTankMax');
    if (btnTopUp) {
      btnTopUp.addEventListener('click', () => {
        state.storedWater = state.tankCapacity;
        saveState();
        syncUIWithState();
        recalculateAll();
        triggerInflowAnimation();
        showToast(`Storage reservoir topped up to 100% (${formatNum(state.tankCapacity)} L)`, 'success');
      });
    }

    const btnDrain = document.getElementById('btnDrainTank');
    if (btnDrain) {
      btnDrain.addEventListener('click', () => {
        state.storedWater = 0;
        saveState();
        syncUIWithState();
        recalculateAll();
        showToast('Storage reservoir drained to 0 Liters', 'warning');
      });
    }

    // -----------------------------------------------------------------------
    // Water Demand Controls
    // -----------------------------------------------------------------------
    const peopleRange = document.getElementById('demandPeopleRange');
    const btnDecPeople = document.getElementById('btnDecreasePeople');
    const btnIncPeople = document.getElementById('btnIncreasePeople');

    const updatePeople = (val) => {
      const p = Math.max(1, Math.min(50, parseInt(val, 10) || 1));
      state.peopleCount = p;
      if (peopleRange) peopleRange.value = p;
      saveState();
      syncUIWithState();
      recalculateAll();
      renderAllCharts();
    };

    if (peopleRange) peopleRange.addEventListener('input', (e) => updatePeople(e.target.value));
    if (btnDecPeople) btnDecPeople.addEventListener('click', () => updatePeople(state.peopleCount - 1));
    if (btnIncPeople) btnIncPeople.addEventListener('click', () => updatePeople(state.peopleCount + 1));

    const rateBtns = document.querySelectorAll('.btn-rate-preset');
    const customRateInput = document.getElementById('demandCustomPerPerson');

    rateBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const rate = parseInt(btn.dataset.rate, 10);
        state.dailyRatePerPerson = rate;
        if (customRateInput) customRateInput.value = rate;
        rateBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        saveState();
        recalculateAll();
        renderAllCharts();
        showToast(`Daily consumption rate: ${rate} L/person/day`, 'info');
      });
    });

    if (customRateInput) {
      customRateInput.addEventListener('input', (e) => {
        const rate = Math.max(10, parseInt(e.target.value, 10) || 135);
        state.dailyRatePerPerson = rate;
        rateBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.rate, 10) === rate));
        saveState();
        recalculateAll();
        renderAllCharts();
      });
    }

    // -----------------------------------------------------------------------
    // Analytics Timeframe Buttons
    // -----------------------------------------------------------------------
    const tfBtns = document.querySelectorAll('.btn-timeframe');
    tfBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        state.analyticsTimeframe = btn.dataset.timeframe;
        tfBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        saveState();
        recalculateAll();
        renderConsumptionAnalyticsChart();
        showToast(`Switched analytics view to ${btn.textContent}`, 'info');
      });
    });

    const btnDownloadLog = document.getElementById('btnDownloadLogCSV');
    if (btnDownloadLog) btnDownloadLog.addEventListener('click', exportWaterAuditCSV);

    // -----------------------------------------------------------------------
    // AI Water Advisor Chat Controls
    // -----------------------------------------------------------------------
    const btnAsk = document.getElementById('btnAskAdvisor');
    const advisorInput = document.getElementById('advisorUserInput');
    if (btnAsk && advisorInput) {
      btnAsk.addEventListener('click', () => handleAdvisorQuestion(advisorInput.value));
      advisorInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAdvisorQuestion(advisorInput.value);
      });
    }

    const promptBtns = document.querySelectorAll('.btn-prompt');
    promptBtns.forEach(btn => {
      btn.addEventListener('click', () => handleAdvisorQuestion(btn.dataset.query));
    });

    const btnClearChat = document.getElementById('btnClearChatHistory');
    if (btnClearChat) {
      btnClearChat.addEventListener('click', () => {
        localStorage.removeItem(CHAT_STORAGE_KEY);
        initAdvisorChat();
        showToast('Chat history cleared', 'info');
      });
    }

    const btnSaveBackend = document.getElementById('btnSaveBackendEndpoint');
    const btnClearBackend = document.getElementById('btnClearBackendEndpoint');
    const backendInput = document.getElementById('aiBackendEndpointInput');

    if (btnSaveBackend && backendInput) {
      btnSaveBackend.addEventListener('click', () => {
        const ep = backendInput.value.trim();
        if (ep.startsWith('http')) {
          localStorage.setItem(BACKEND_ENDPOINT_STORAGE, ep);
          syncUIWithState();
          showToast('Backend AI proxy endpoint saved successfully!', 'success');
        } else {
          showToast('Please enter a valid HTTP/HTTPS endpoint URL', 'warning');
        }
      });
    }

    if (btnClearBackend && backendInput) {
      btnClearBackend.addEventListener('click', () => {
        localStorage.removeItem(BACKEND_ENDPOINT_STORAGE);
        backendInput.value = '';
        syncUIWithState();
        showToast('Switched to built-in Expert Rule-Based AI Engine', 'info');
      });
    }

    // -----------------------------------------------------------------------
    // Reports & Downloads Actions
    // -----------------------------------------------------------------------
    const btnExportCSVQuick = document.getElementById('btnExportCSVQuick');
    if (btnExportCSVQuick) btnExportCSVQuick.addEventListener('click', exportWaterAuditCSV);

    const btnDownloadAudit = document.getElementById('btnDownloadAuditCSV');
    if (btnDownloadAudit) btnDownloadAudit.addEventListener('click', exportWaterAuditCSV);

    const btnQuickSim = document.getElementById('btnQuickSimulate');
    if (btnQuickSim) btnQuickSim.addEventListener('click', simulateDailyUsage);

    const btnReset = document.getElementById('btnResetData');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (confirm('Reset RainSmart to original demonstration defaults?')) {
          resetToDefaults();
        }
      });
    }
  }

  // =========================================================================
  // 13. HELPER UTILITIES
  // =========================================================================

  function simulateDailyUsage() {
    const hydro = calculateHydrology();
    const demand = hydro.dailyDemandLiters;
    const prev = state.storedWater;

    if (prev <= 0) {
      showToast('Storage tank is empty! Cannot consume water without municipal backup.', 'danger');
      return;
    }

    const next = Math.max(0, prev - demand);
    state.storedWater = next;
    saveState();
    syncUIWithState();
    recalculateAll();

    if (next === 0) {
      showToast(`Consumed 1-Day Water (-${formatNum(demand)} L). Reservoir is now completely depleted!`, 'danger');
    } else {
      showToast(`Consumed 1-Day Water (-${formatNum(demand)} L). ${formatNum(next)} L remaining.`, 'info');
    }
  }

  function triggerInflowAnimation() {
    const pipe = document.getElementById('tankInflowPipe');
    if (pipe) {
      pipe.classList.add('active');
      setTimeout(() => pipe.classList.remove('active'), 1200);
    }
  }

  function openMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.add('open');
  }

  function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
  }

  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'warning') icon = 'fa-triangle-exclamation';
    if (type === 'danger') icon = 'fa-circle-xmark';

    toast.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span>${escapeHTML(message)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 320);
    }, 3500);
  }

  function formatNum(num) {
    return Number(num).toLocaleString('en-US');
  }

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function parseInline(str) {
    return str
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  function formatMarkdownToHTML(md) {
    if (!md) return '';
    const clean = md.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    const lines = clean.split('\n');
    let inList = false;
    const result = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
        continue;
      }

      if (line.startsWith('### ')) {
        if (inList) { result.push('</ul>'); inList = false; }
        result.push(`<h4>${parseInline(line.substring(4))}</h4>`);
        continue;
      }
      if (line.startsWith('## ')) {
        if (inList) { result.push('</ul>'); inList = false; }
        result.push(`<h3>${parseInline(line.substring(3))}</h3>`);
        continue;
      }
      if (line.startsWith('# ')) {
        if (inList) { result.push('</ul>'); inList = false; }
        result.push(`<h2>${parseInline(line.substring(2))}</h2>`);
        continue;
      }

      const bulletMatch = line.match(/^[-*]\s+(.*)$/) || line.match(/^\d+\.\s+(.*)$/);
      if (bulletMatch) {
        if (!inList) {
          result.push('<ul>');
          inList = true;
        }
        result.push(`<li>${parseInline(bulletMatch[1])}</li>`);
        continue;
      }

      if (inList) {
        result.push('</ul>');
        inList = false;
      }

      if (line.startsWith('$$') && line.endsWith('$$')) {
        const mathText = line.substring(2, line.length - 2).trim();
        result.push(`<div class="math-callout"><strong>${parseInline(mathText)}</strong></div>`);
        continue;
      }

      result.push(`<p>${parseInline(line)}</p>`);
    }

    if (inList) result.push('</ul>');

    return result.join('\n');
  }

  // =========================================================================
  // 14. APPLICATION BOOTSTRAP
  // =========================================================================

  document.addEventListener('DOMContentLoaded', () => {
    loadSavedState();
    syncUIWithState();
    setupEventListeners();
    recalculateAll();
    renderAllCharts();
    initSensorSimulation();
    initAdvisorChat();

    // Trigger Initial Live Weather Check (default Bengaluru)
    fetchOpenMeteoWeather(state.weather.lat, state.weather.lon, state.weather.city);

    console.log("💧 RainSmart AI Urban Water OS initialized with Live Weather API, Multiple Rooftops, IoT Telemetry, and Smart Alerts.");
  });

})();
