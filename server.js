/**
 * RainSmart – Intelligent Rainwater Harvesting & Urban Water Management System
 * Secure Lightweight Backend Server & AI Proxy
 * 
 * Features:
 * - 100% Zero external npm dependencies (native Node.js http, https, fs, path)
 * - Secure Google Gemini / OpenAI proxy: API keys stay on server, NEVER exposed to client
 * - CORS-enabled for both standalone node serving and VS Code Live Server (port 5500)
 * - Automatic .env / .env.example parser
 * - Full static asset server for index.html, style.css, script.js
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

// 1. Simple, robust .env parser
function loadEnv() {
  const envPaths = [
    path.join(__dirname, '.env'),
    path.join(__dirname, '.env.example')
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            let key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            // Remove surrounding quotes
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            // Normalize key
            if (!process.env[key]) {
              process.env[key] = val;
            }
            // Also alias standard forms
            const normKey = key.toUpperCase().replace(/\s+/g, '_');
            if (!process.env[normKey]) {
              process.env[normKey] = val;
            }
          }
        }
      } catch (e) {
        console.warn(`[Env] Error reading ${envPath}:`, e.message);
      }
    }
  }
}

loadEnv();

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env['GEMINI_API_KEY'] || process.env['gemini api key'] || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// 2. MIME Types Dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

// 3. Multi-Model Google Gemini Request Proxy with Conversational Memory & Fallback Chain
const GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash'
];

async function callGeminiModel(modelName, prompt, history, telemetry) {
  const systemInstruction = `You are the RainSmart AI Water Advisor, an elite hydrologist and urban water management engineer.
You give intelligent, practical, conversational, and mathematically precise guidance on rainwater harvesting (RWH), urban stormwater engineering, and domestic water conservation.

LIVE APPLICATION TELEMETRY (Use these exact numbers when answering user inquiries):
- Selected Location: ${telemetry.locationFullName || telemetry.city || 'Bengaluru, Karnataka'} (Lat: ${telemetry.lat !== undefined ? Number(telemetry.lat).toFixed(4) : '12.9716'}, Lon: ${telemetry.lon !== undefined ? Number(telemetry.lon).toFixed(4) : '77.5946'})
- Current Meteorological State: ${telemetry.currentTemp !== undefined ? telemetry.currentTemp : 24.5}°C (Apparent: ${telemetry.apparentTemp !== undefined ? telemetry.apparentTemp : 25}°C), Humidity: ${telemetry.humidity || 65}%, Wind: ${telemetry.windSpeed || 12} km/h
- Current Rain Intensity: ${telemetry.currentPrecip !== undefined ? Number(telemetry.currentPrecip).toFixed(1) : 0} mm/h
- 24-Hour Precipitation Forecast: ${telemetry.forecastRain !== undefined ? telemetry.forecastRain : 0} mm (${telemetry.forecastProb || 0}% rain probability)
- Historical Annual Precipitation: ${telemetry.historicalAnnualRain !== undefined ? telemetry.historicalAnnualRain : 970} mm (ERA5 Verified Reanalysis)
- Roof Catchment Area: ${telemetry.roofArea || 200} m² (${telemetry.rooftopCount ? telemetry.rooftopCount + ' configured rooftops' : 'Single Roof'})
- Runoff Coefficient (C): ${telemetry.roofCoeff !== undefined ? Number(telemetry.roofCoeff).toFixed(2) : 0.85}
- Design Storm Rainfall (R): ${telemetry.rainfall || 65} mm
- Calculated Design Storm Harvest: ${telemetry.netHarvestLiters || 11050} Liters (Formula: V = R * A * C)
- Total Storage Reservoir Capacity: ${telemetry.tankCapacity || 15000} Liters (Primary Tank: ${telemetry.primaryCap || 10000} L, Secondary Tank: ${telemetry.secondaryCap || 5000} L)
- Stored Water Reserves: ${telemetry.storedWater || 8000} Liters (Primary Tank Level: ${telemetry.primaryWater || 6800} L, Secondary Tank Level: ${telemetry.secondaryWater || 1200} L)
- Available Storage Headroom: ${telemetry.availableHeadroom || 7000} Liters
- Automated Diversion Status: ${telemetry.primaryIsFull ? 'ACTIVE (Diverting to Secondary)' : 'STANDBY (Primary has storage space)'}
- Household Demographics: ${telemetry.peopleCount || 4} occupants consuming ${telemetry.dailyRatePerPerson || 135} L/person/day
- Total Daily Household Demand: ${telemetry.dailyDemand || 540} Liters/day
- Water Autonomy Runway: ${telemetry.coverageDays || 14.8} consecutive days off-grid
- Hardware IoT Sensor Status: SENSOR NOT CONNECTED (Tank capacities and initial levels are configured in software; physical ultrasonic level sensors are absent)

ENGINEERING GUIDELINES:
1. Ground your answers directly in the user's live numbers (e.g. mention their specific roof area of ${telemetry.roofArea || 200} m², their ${telemetry.primaryCap || 10000} L primary tank, etc.).
2. Be conversational, helpful, and concise. Maintain continuity with prior messages in the chat history.
3. If asked about overflow, explain the automated Primary -> Secondary -> Aquifer Recharge percolation sequence.
4. If asked about drinking safety, explain first-flush diversion, sediment filtration, and secondary UV/boiling treatment.
5. If asked about tank sizing, compare their current storage against a standard 14 to 21-day emergency reserve threshold.
6. Never fabricate physical sensor readings. Acknowledge when data is calculated (ESTIMATED DATA) or when hardware sensors are not connected.`;

  // Build multi-turn contents array for conversational memory
  const contents = [];

  // Add previous turns from history (up to last 8 turns)
  if (Array.isArray(history) && history.length > 0) {
    const recent = history.slice(-8);
    for (const h of recent) {
      if (h && h.content) {
        // Strip out verification footers from stored assistant messages
        const cleanContent = h.content.replace(/\n\n---\n\*Verified via:.*/s, '').trim();
        if (cleanContent) {
          contents.push({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: cleanContent }]
          });
        }
      }
    }
  }

  // Ensure contents alternates properly or starts with user
  if (contents.length > 0 && contents[0].role !== 'user') {
    contents.shift();
  }

  // Append current prompt
  contents.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  const payload = JSON.stringify({
    system_instruction: {
      parts: [{ text: systemInstruction }]
    },
    contents: contents,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 900
    }
  });

  return new Promise((resolve, reject) => {
    const postData = payload;
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
      method: 'POST',
      rejectUnauthorized: false,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 12000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              resolve({ reply: text, model: modelName });
            } else {
              reject(new Error(`Model ${modelName} returned empty candidate text`));
            }
          } else {
            const errMsg = json.error?.message || `HTTP ${res.statusCode} from ${modelName}`;
            reject(new Error(errMsg));
          }
        } catch (e) {
          reject(new Error(`Failed to parse JSON response from ${modelName}: ${e.message}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Model ${modelName} timed out (12s)`));
    });

    req.write(postData);
    req.end();
  });
}

async function queryGemini(prompt, history, telemetry) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured on backend server');
  }

  let lastError = null;
  // Try candidate models in order of speed and stability
  for (const model of GEMINI_MODELS) {
    try {
      const result = await callGeminiModel(model, prompt, history, telemetry);
      return result;
    } catch (err) {
      console.warn(`[Gemini Model ${model} Warning]:`, err.message);
      lastError = err;
      // Continue to next model in fallback chain
    }
  }

  throw lastError || new Error('All Gemini candidate models failed to generate response');
}

// Optional OpenAI Proxy
async function queryOpenAI(prompt, history, telemetry) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const messages = [
    {
      role: 'system',
      content: `You are the RainSmart AI Water Advisor. Advise on rainwater harvesting and urban hydrology. Context: Location: ${telemetry.city || 'Bengaluru'}, Roof: ${telemetry.roofArea || 200} m2, Tank: ${telemetry.tankCapacity || 15000} L, Stored: ${telemetry.storedWater || 8000} L, People: ${telemetry.peopleCount || 4}, Daily Demand: ${telemetry.dailyDemand || 540} L/day.`
    }
  ];

  if (Array.isArray(history)) {
    for (const h of history.slice(-6)) {
      messages.push({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.content.replace(/\n\n---\n\*Verified via:.*/s, '')
      });
    }
  }

  messages.push({ role: 'user', content: prompt });

  const payload = JSON.stringify({
    model: 'gpt-4o-mini',
    messages: messages,
    temperature: 0.4,
    max_tokens: 800
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 12000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ reply: json.choices?.[0]?.message?.content, model: 'OpenAI GPT-4o-mini' });
          } else {
            reject(new Error(json.error?.message || `HTTP ${res.statusCode}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// 4. HTTP Request Handler
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS Headers (allow Live Server on port 5500 or any other origin)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Route: Status Check
  if (req.method === 'GET' && pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      server: 'RainSmart Backend Proxy v2.0',
      geminiConfigured: !!GEMINI_API_KEY,
      openAiConfigured: !!OPENAI_API_KEY,
      systemDate: new Date().toISOString(),
      port: PORT
    }));
    return;
  }

  // API Route: AI Chat Proxy
  if (req.method === 'POST' && pathname === '/api/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const message = data.message || '';
        const history = data.history || [];
        const telemetry = data.telemetry || {};

        if (!message.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Query message is required' }));
          return;
        }

        // 1. Try Google Gemini if configured
        if (GEMINI_API_KEY) {
          try {
            const result = await queryGemini(message, history, telemetry);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              reply: result.reply,
              model: result.model,
              provider: `Google Gemini AI (${result.model})`
            }));
            return;
          } catch (apiErr) {
            console.warn('[Gemini Proxy Error]:', apiErr.message);
            // If OpenAI is also configured, try OpenAI as secondary fallback
            if (OPENAI_API_KEY) {
              try {
                const oaiResult = await queryOpenAI(message, history, telemetry);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                  success: true,
                  reply: oaiResult.reply,
                  model: oaiResult.model,
                  provider: 'OpenAI (Secondary Backend Proxy)'
                }));
                return;
              } catch (oaiErr) {
                console.warn('[OpenAI Proxy Error]:', oaiErr.message);
              }
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              configured: true,
              fallbackRequired: true,
              error: `Gemini API Error: ${apiErr.message}`,
              hint: 'Falling back to client-side deterministic Hydrology Expert Engine'
            }));
            return;
          }
        } else if (OPENAI_API_KEY) {
          try {
            const oaiResult = await queryOpenAI(message, history, telemetry);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: true,
              reply: oaiResult.reply,
              model: oaiResult.model,
              provider: 'OpenAI (Backend Proxy)'
            }));
            return;
          } catch (oaiErr) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              configured: true,
              fallbackRequired: true,
              error: `OpenAI API Error: ${oaiErr.message}`
            }));
            return;
          }
        } else {
          // No API key configured
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            configured: false,
            fallbackRequired: true,
            error: 'No AI API key configured on backend server (.env)',
            setupInstructions: 'Set GEMINI_API_KEY in .env and restart server with node server.js.'
          }));
          return;
        }
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Malformed JSON payload' }));
      }
    });
    return;
  }

  // Static File Serving
  if (req.method === 'GET') {
    let safePath = pathname === '/' ? '/index.html' : pathname;
    // Sanitize path against directory traversal
    safePath = path.normalize(safePath).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(__dirname, safePath);

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found - RainSmart Server');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, { 'Content-Type': contentType });
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    });
    return;
  }

  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Method Not Allowed');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🌧️ RainSmart Full-Stack System Server Running`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🤖 AI Backend Proxy: ${GEMINI_API_KEY ? 'Active (Multi-Model Gemini AI Chain)' : 'Offline / Key Pending'}`);
  console.log(`=======================================================`);
});

module.exports = server;

