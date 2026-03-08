const express = require('express');
const webpush = require('web-push');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const app = express();
app.use(express.json());
app.use(express.static('__dirname'));

// ─── Data file (simple JSON database) ───────────────────────────
const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    const defaults = {
      stocks: [
        {
          id: 1, ticker: 'NEM', name: 'NEM Insurance',
          price: 31.00, zoneLow: 26, zoneHigh: 31,
          targetLow: 42, targetHigh: 48, stop: 23.50,
          rating: 'strong-buy', alertOn: true,
          thesis: "Cheapest quality insurer on the entire NGX at 4.3x PE on a business growing PAT at 72% YoY. Near-zero debt (D/E = 0.01) and 55.6% ROE make this an anomaly by any global standard. Direct beneficiary of Nigeria's Insurance Reform Act which will crush weaker undercapitalized competitors.",
          metrics: ['PE: 4.3x', 'PAT Growth: +72%', 'ROE: 55.6%', 'Debt/Equity: 0.01'],
          risks: "Naira devaluation, macro instability, competitive pressure post-recapitalization"
        },
        {
          id: 2, ticker: 'AIICO', name: 'AIICO Insurance',
          price: 4.20, zoneLow: 3.80, zoneHigh: 4.20,
          targetLow: 5.50, targetHigh: 6.00, stop: 3.40,
          rating: 'buy', alertOn: true,
          thesis: "Best quality single-digit stock on the entire NGX. Nigeria's 2nd largest insurer by assets (₦456B). Normalized PAT +54% YoY to ₦18.3B in FY2025. Trading at 7.7x PE — still undervalued given earnings trajectory. Scale advantage allows underwriting of larger policies than competitors.",
          metrics: ['PE: 7.7x', 'PAT Growth: +54%', 'Total Assets: ₦456B', 'Market Cap: ₦140.6B'],
          risks: "Rising finance/reinsurance costs, liquidity tightening, naira volatility"
        },
        {
          id: 3, ticker: 'NASCON', name: 'NASCON Allied Industries',
          price: 120.00, zoneLow: 100, zoneHigh: 118,
          targetLow: 190, targetHigh: 195, stop: 92,
          rating: 'strong-buy', alertOn: true,
          thesis: "Single most compelling consumer goods story on the NGX. PAT surged +115% FY2025 to ₦33.5B. Near-zero debt (D/E = 0.001) — a genuinely debt-free compounder. Trading ~60% below estimated fair value. Proposed 200% dividend hike to ₦6/share. 5-year earnings CAGR of 49.8%.",
          metrics: ['PAT Growth: +115%', 'ROE: 49.9-61%', 'Debt/Equity: 0.001', 'Discount to FV: ~60%'],
          risks: "Overbought short-term. Wait for pullback to ₦108. Commodity price shocks."
        },
        {
          id: 4, ticker: 'UNILEVER', name: 'Unilever Nigeria',
          price: 77.00, zoneLow: 68, zoneHigh: 77,
          targetLow: 100, targetHigh: 108, stop: 62,
          rating: 'buy', alertOn: true,
          thesis: "PAT nearly doubled +99% YoY to ₦30.7B in FY2025. Revenue +44%, gross profit +63% to ₦89.6B. Global Unilever brand provides unmatched pricing power moat. EPS grew from ₦3 to ₦5/share. Strategy: buy HALF position now, add second half on dip to ₦70-72.",
          metrics: ['PAT Growth: +99%', 'Revenue Growth: +44%', 'EPS: ₦5/share', 'Gross Profit: ₦89.6B'],
          risks: "No dividend declared FY2025. Reinvesting. FX headwinds if naira weakens."
        },
        {
          id: 5, ticker: 'CADBURY', name: 'Cadbury Nigeria',
          price: 70.75, zoneLow: 62, zoneHigh: 70,
          targetLow: 95, targetHigh: 102, stop: 57,
          rating: 'buy', alertOn: true,
          thesis: "Classic turnaround — losses reversed Q4 2025. PAT swung to ₦2.41B profit from ₦496M loss. EBITDA ₦24.32B with 14.32% margin. New female MD installed late 2025. Trading BELOW industry average valuation. Analysts flagging oversold as buying opportunity. Set limit at ₦65.",
          metrics: ['EBITDA: ₦24.32B', 'EBITDA Margin: 14.32%', 'PAT Q4: ₦2.41B', 'Valuation: Below avg'],
          risks: "Early-stage turnaround. Cocoa input cost volatility. New management execution risk."
        },
        {
          id: 6, ticker: 'LIVESTOCK', name: 'Livestock Feeds',
          price: 6.25, zoneLow: 5.50, zoneHigh: 6.25,
          targetLow: 11, targetHigh: 14, stop: 4.80,
          rating: 'buy', alertOn: true,
          thesis: "EPS hit a 13-year high in H1 2024. UAC of Nigeria parent provides corporate governance backing most micro-caps lack. 52-week high was ₦10.83, proving multi-bagger range is achievable. Nigeria protein demand growing structurally. Set limit at ₦5.75 for better fill.",
          metrics: ['EPS: 13-year high', 'Parent: UAC Nigeria', '52-wk High: ₦10.83', '2025 Return: +51.7%'],
          risks: "Thin micro-cap liquidity. Feed input cost exposure. Volatile small-cap."
        },
        {
          id: 7, ticker: 'FTNCOCOA', name: 'FTN Cocoa Processors',
          price: 4.90, zoneLow: 4.20, zoneHigh: 4.50,
          targetLow: 9, targetHigh: 12, stop: 3.80,
          rating: 'spec', alertOn: true,
          thesis: "SPECULATIVE — MAX 5-8% of portfolio. Losses narrowed 89% in H1 2025 to ₦1.1B. Global cocoa prices at multi-decade highs provide powerful revenue tailwind. 21% YTD 2026 gain shows momentum. ONLY buy on pullback to ₦4.20-4.50. Hard stop at ₦3.80, no exceptions.",
          metrics: ['Loss improvement: -89%', 'Cocoa: Decade highs', 'YTD 2026: +21%', 'Max alloc: 5-8%'],
          risks: "No dividends in 5 years. Still loss-making. Cocoa price reversal risk. Very high risk."
        }
      ],
      subscriptions: [],
      alertLog: []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaults, null, 2));
  }
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ─── Web Push Setup ──────────────────────────────────────────────
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:ngxwatchlist@example.com';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
  console.log('✅ Web Push configured');
} else {
  console.log('⚠️  VAPID keys not set — push notifications disabled. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars.');
}

// ─── Price fetching (Yahoo Finance) ────────────────────────────
async function fetchNGXPrice(ticker) {
  try {
    // Try Yahoo Finance with .LG suffix for NGX stocks
    const symbols = [`${ticker}.LG`, `${ticker}.LA`];
    for (const sym of symbols) {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const json = await res.json();
        const price = json?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (price && price > 0) {
          console.log(`✅ ${ticker} (${sym}): ₦${price}`);
          return price;
        }
      } catch (e) { /* try next */ }
    }
    console.log(`⚠️  Could not fetch live price for ${ticker} — using stored price`);
    return null;
  } catch (e) {
    console.log(`⚠️  Price fetch error for ${ticker}:`, e.message);
    return null;
  }
}

// ─── Check all stocks & fire alerts ────────────────────────────
async function checkPricesAndAlert() {
  console.log('\n🔍 Checking NGX prices...', new Date().toISOString());
  const data = loadData();
  let updated = false;

  for (const stock of data.stocks) {
    if (!stock.alertOn) continue;

    const livePrice = await fetchNGXPrice(stock.ticker);
    if (livePrice) {
      stock.price = livePrice;
      updated = true;
    }

    const inZone = stock.price >= stock.zoneLow && stock.price <= stock.zoneHigh;
    const belowZone = stock.price < stock.zoneLow;

    if (inZone) {
      const upside = (((stock.targetLow / stock.price) - 1) * 100).toFixed(0);
      const payload = JSON.stringify({
        title: `🚨 BUY ZONE: ${stock.ticker}`,
        body: `₦${stock.price.toFixed(2)} is in your buy zone (₦${stock.zoneLow}–₦${stock.zoneHigh})\nTarget: ₦${stock.targetLow}–${stock.targetHigh} (+${upside}% upside)\nStop-loss: ₦${stock.stop}`,
        thesis: stock.thesis,
        ticker: stock.ticker,
        name: stock.name,
        url: `https://www.tradingview.com/chart/?symbol=NSENG%3A${stock.ticker}`
      });

      // Send to all subscribers
      for (const sub of data.subscriptions) {
        try {
          await webpush.sendNotification(sub, payload);
          console.log(`📲 Alert sent: ${stock.ticker} to ${sub.endpoint.slice(-20)}`);
        } catch (e) {
          if (e.statusCode === 410) {
            // Subscription expired — remove it
            data.subscriptions = data.subscriptions.filter(s => s.endpoint !== sub.endpoint);
          }
          console.log(`⚠️  Push failed for ${stock.ticker}:`, e.message);
        }
      }

      // Log the alert
      data.alertLog.unshift({
        timestamp: new Date().toISOString(),
        ticker: stock.ticker,
        price: stock.price,
        type: 'IN_ZONE'
      });
    } else if (belowZone) {
      console.log(`📉 ${stock.ticker}: ₦${stock.price} — below zone (₦${stock.zoneLow}), watching`);
    } else {
      console.log(`📈 ${stock.ticker}: ₦${stock.price} — above zone (₦${stock.zoneHigh}), waiting`);
    }
  }

  // Keep only last 50 log entries
  data.alertLog = data.alertLog.slice(0, 50);
  if (updated) saveData(data);
}

// ─── Cron: Check prices every 30 min on NGX trading days ────────
// NGX hours: Mon-Fri 10:00-14:30 WAT (UTC+1) = 09:00-13:30 UTC
// Run every 30 min during NGX hours
cron.schedule('*/30 9-13 * * 1-5', () => {
  checkPricesAndAlert();
}, { timezone: 'UTC' });

// Also check at NGX close (13:31 UTC = 14:31 WAT)
cron.schedule('31 13 * * 1-5', () => {
  checkPricesAndAlert();
}, { timezone: 'UTC' });

console.log('⏰ Price check cron scheduled: Every 30min during NGX hours (Mon-Fri 10:00-14:30 WAT)');

// ─── API Routes ──────────────────────────────────────────────────

// Get all stocks
app.get('/api/stocks', (req, res) => {
  const data = loadData();
  res.json(data.stocks);
});

// Add stock
app.post('/api/stocks', (req, res) => {
  const data = loadData();
  const stock = { ...req.body, id: Date.now(), alertOn: true };
  data.stocks.push(stock);
  saveData(data);
  res.json(stock);
});

// Update stock
app.put('/api/stocks/:id', (req, res) => {
  const data = loadData();
  const idx = data.stocks.findIndex(s => s.id == req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data.stocks[idx] = { ...data.stocks[idx], ...req.body };
  saveData(data);
  res.json(data.stocks[idx]);
});

// Delete stock
app.delete('/api/stocks/:id', (req, res) => {
  const data = loadData();
  data.stocks = data.stocks.filter(s => s.id != req.params.id);
  saveData(data);
  res.json({ success: true });
});

// Toggle alert
app.patch('/api/stocks/:id/alert', (req, res) => {
  const data = loadData();
  const stock = data.stocks.find(s => s.id == req.params.id);
  if (!stock) return res.status(404).json({ error: 'Not found' });
  stock.alertOn = !stock.alertOn;
  saveData(data);
  res.json({ alertOn: stock.alertOn });
});

// Save push subscription
app.post('/api/subscribe', (req, res) => {
  const data = loadData();
  const sub = req.body;
  const exists = data.subscriptions.find(s => s.endpoint === sub.endpoint);
  if (!exists) {
    data.subscriptions.push(sub);
    saveData(data);
    console.log('📱 New push subscription saved');
  }
  res.json({ success: true });
});

// Get VAPID public key
app.get('/api/vapid-public-key', (req, res) => {
  res.json({ key: VAPID_PUBLIC || null });
});

// Manual price check trigger
app.post('/api/check-now', async (req, res) => {
  checkPricesAndAlert();
  res.json({ message: 'Price check triggered' });
});

// Alert log
app.get('/api/alert-log', (req, res) => {
  const data = loadData();
  res.json(data.alertLog || []);
});

// ─── Start server ────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 NGX Watchlist running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🌍 Deploy to: https://render.com (free)\n`);
});
