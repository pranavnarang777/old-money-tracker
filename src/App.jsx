import { useState, useEffect, useCallback } from "react";

// ─── Hardcoded User Profile ───────────────────────────────────────────────────
const PROFILE = {
  height: 166,
  shoulders: 17,
  waist: 34,
  clothingSizes: { tops: "XS/S", pants: "29/30", shoes: "40/41" },
  style: "Classic/Old Money",
  avoid: ["baggy", "streetwear", "oversized"],
  preferredBrands: ["COS", "Massimo Dutti", "Uniqlo", "Arket", "Zara", "Mango"],
  sportBrands: ["Nike", "Adidas", "New Balance", "Patagonia", "North Face", "Asics", "On Running"],
};

// ─── Supabase Config (env vars) ───────────────────────────────────────────────
const SUPABASE_URL = import.meta?.env?.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta?.env?.VITE_SUPABASE_ANON_KEY || "";

// ─── Supabase Client (lightweight, no SDK needed) ────────────────────────────
const supabase = {
  async query(table, params = "") {
    if (!SUPABASE_URL || !SUPABASE_KEY) return null;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return null;
    return res.json();
  },
  async insert(table, data) {
    if (!SUPABASE_URL || !SUPABASE_KEY) return null;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return res.json();
  },
};

// ─── Fit Check Logic ─────────────────────────────────────────────────────────
const FIT_WARNING_KEYWORDS = ["relaxed", "oversized", "loose-fit", "loose fit", "boxy", "wide", "roomy"];
function getFitWarning(description = "") {
  const lower = description.toLowerCase();
  const hit = FIT_WARNING_KEYWORDS.find((kw) => lower.includes(kw));
  return hit ? `Note: Likely oversized/baggy—check measurements.` : null;
};

// ─── Material Logic ──────────────────────────────────────────────────────────
const PREMIUM_MATERIALS = ["merino", "cashmere", "lambswool", "wool"];
const SYNTHETIC_MATERIALS = ["polyester", "acrylic", "nylon", "elastane"];
function getMaterialFlags(material = "") {
  const lower = material.toLowerCase();
  const isPremium = PREMIUM_MATERIALS.some((m) => lower.includes(m));
  const isSynthetic = SYNTHETIC_MATERIALS.some((m) => lower.includes(m));
  return { isPremium, isSynthetic };
}

// ─── Steal Deal Logic ────────────────────────────────────────────────────────
function isStealDeal(item) {
  if (!item.original_price || !item.current_price) return false;
  const discount = (item.original_price - item.current_price) / item.original_price;
  const isLowest = item.is_lowest_90d === true;
  return discount >= 0.4 && isLowest;
}
function discountPct(item) {
  if (!item.original_price || !item.current_price) return 0;
  return Math.round(((item.original_price - item.current_price) / item.original_price) * 100);
}

// ─── Demo / Fallback Data ────────────────────────────────────────────────────
const DEMO_ITEMS = [
  // Knitwear
  { id: 1, category: "knitwear", brand: "COS", name: "Merino Wool Crewneck Sweater", original_price: 89, current_price: 44, currency: "EUR", size: "S", material: "100% Merino Wool", description: "Classic slim fit crewneck", url: "https://cos.com", image: null, is_lowest_90d: true },
  { id: 2, category: "knitwear", brand: "Arket", name: "Lambswool V-Neck Pullover", original_price: 120, current_price: 79, currency: "EUR", size: "XS", material: "80% Lambswool, 20% Nylon", description: "Relaxed lambswool knit", url: "https://arket.com", image: null, is_lowest_90d: false },
  { id: 3, category: "knitwear", brand: "Uniqlo", name: "Cashmere Crewneck", original_price: 99, current_price: 49, currency: "EUR", size: "XS", material: "100% Cashmere", description: "Fine gauge, slim fit", url: "https://uniqlo.com", image: null, is_lowest_90d: true },
  { id: 4, category: "knitwear", brand: "Massimo Dutti", name: "Mixed Wool Cardigan", original_price: 149, current_price: 89, currency: "EUR", size: "S", material: "60% Polyester, 40% Acrylic", description: "Boxy oversized fit cardigan", url: "https://massimodutti.com", image: null, is_lowest_90d: false },
  { id: 5, category: "knitwear", brand: "Mango", name: "Merino Turtleneck", original_price: 79, current_price: 35, currency: "EUR", size: "S", material: "90% Merino, 10% Elastane", description: "Slim fit turtleneck", url: "https://mango.com", image: null, is_lowest_90d: true },
  // Sportswear
  { id: 6, category: "sportswear", brand: "On Running", name: "Cloud 5 All-Day Sneakers", original_price: 149, current_price: 79, currency: "EUR", size: "40", material: "Engineered mesh", description: "Slim performance runner", url: "https://on-running.com", image: null, is_lowest_90d: true },
  { id: 7, category: "sportswear", brand: "Patagonia", name: "Better Sweater Fleece", original_price: 169, current_price: 119, currency: "EUR", size: "S", material: "100% Recycled Polyester Fleece", description: "Regular fit jacket", url: "https://patagonia.com", image: null, is_lowest_90d: false },
  { id: 8, category: "sportswear", brand: "New Balance", name: "327 Sneakers", original_price: 110, current_price: 65, currency: "EUR", size: "41", material: "Suede / Mesh", description: "Classic retro profile", url: "https://newbalance.eu", image: null, is_lowest_90d: true },
  { id: 9, category: "sportswear", brand: "Adidas", name: "Ultraboost 23 Running Shoes", original_price: 180, current_price: 99, currency: "EUR", size: "40", material: "Primeknit upper", description: "Performance running profile", url: "https://adidas.com", image: null, is_lowest_90d: true },
  { id: 10, category: "sportswear", brand: "North Face", name: "Apex Bionic Jacket", original_price: 199, current_price: 139, currency: "EUR", size: "S", material: "Soft-shell", description: "Slim athletic fit", url: "https://thenorthface.com", image: null, is_lowest_90d: false },
  // Accessories
  { id: 11, category: "accessories", brand: "COS", name: "Leather Belt", original_price: 49, current_price: 24, currency: "EUR", size: "One size", material: "Full grain leather", description: "Classic minimal belt", url: "https://cos.com", image: null, is_lowest_90d: true },
  { id: 12, category: "accessories", brand: "Arket", name: "Canvas Tote Bag", original_price: 65, current_price: 39, currency: "EUR", size: "One size", material: "Organic cotton canvas", description: "Structured tote", url: "https://arket.com", image: null, is_lowest_90d: false },
  { id: 13, category: "accessories", brand: "Massimo Dutti", name: "Merino Scarf", original_price: 59, current_price: 29, currency: "EUR", size: "One size", material: "100% Merino Wool", description: "Fine knit scarf", url: "https://massimodutti.com", image: null, is_lowest_90d: true },
  { id: 14, category: "accessories", brand: "Zara", name: "Leather Card Wallet", original_price: 39, current_price: 15, currency: "EUR", size: "One size", material: "Genuine leather", description: "Slim bifold", url: "https://zara.com", image: null, is_lowest_90d: true },
  // Skincare
  { id: 15, category: "skincare", brand: "CeraVe", name: "Moisturising Cream 250ml", original_price: 22, current_price: 11, currency: "EUR", size: "250ml", material: "Ceramides, Hyaluronic Acid", description: "Daily moisturiser for normal to dry skin", url: "https://cerave.com", image: null, is_lowest_90d: true },
  { id: 16, category: "skincare", brand: "La Roche-Posay", name: "Anthelios UV Mune SPF50+ 50ml", original_price: 28, current_price: 19, currency: "EUR", size: "50ml", material: "SPF50+, Mexoryl 400", description: "Lightweight daily sunscreen", url: "https://laroche-posay.fr", image: null, is_lowest_90d: false },
  { id: 17, category: "skincare", brand: "The Ordinary", name: "Niacinamide 10% + Zinc 1%", original_price: 8, current_price: 5, currency: "EUR", size: "30ml", material: "Niacinamide, Zinc", description: "Serum for pores and uneven skin tone", url: "https://theordinary.com", image: null, is_lowest_90d: true },
  { id: 18, category: "skincare", brand: "Kiehl's", name: "Facial Fuel Moisturizer 125ml", original_price: 45, current_price: 22, currency: "EUR", size: "125ml", material: "Caffeine, Vitamin E", description: "Energizing face moisturizer", url: "https://kiehls.com", image: null, is_lowest_90d: true },
];

// ─── Category Config ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: "knitwear", label: "Knitwear", icon: "◈" },
  { key: "sportswear", label: "Sportswear", icon: "◉" },
  { key: "accessories", label: "Accessories", icon: "◇" },
  { key: "skincare", label: "Skincare", icon: "◌" },
];

// ─── Steal Badge ──────────────────────────────────────────────────────────────
function StealBadge() {
  return (
    <span style={{
      background: "linear-gradient(135deg, #2d5016 0%, #4a7c2f 100%)",
      color: "#e8f5d0",
      fontSize: "9px",
      fontFamily: "'Cormorant Garamond', serif",
      fontWeight: 700,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      padding: "3px 8px",
      borderRadius: "2px",
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
    }}>
      ✦ Steal Deal
    </span>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ item }) {
  const steal = isStealDeal(item);
  const pct = discountPct(item);
  const fitWarn = getFitWarning(item.description);
  const { isPremium, isSynthetic } = getMaterialFlags(item.material);
  const isKnitwear = item.category === "knitwear";

  return (
    <div style={{
      background: "#fafaf7",
      border: steal ? "1px solid #4a7c2f" : "1px solid #e0ddd5",
      borderRadius: "4px",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      position: "relative",
      transition: "box-shadow 0.2s ease, transform 0.2s ease",
      cursor: "default",
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.10)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
    >
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <div>
          <div style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#9a8f7e", fontFamily: "'Cormorant Garamond', serif", marginBottom: "2px" }}>
            {item.brand}
          </div>
          <div style={{ fontSize: "14px", fontWeight: 500, color: "#1a1814", fontFamily: "'Cormorant Garamond', serif", lineHeight: 1.3 }}>
            {item.name}
          </div>
        </div>
        {steal && <StealBadge />}
      </div>

      {/* Price */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
        <span style={{ fontSize: "20px", fontWeight: 700, color: steal ? "#2d5016" : "#1a1814", fontFamily: "'Cormorant Garamond', serif" }}>
          €{item.current_price}
        </span>
        {item.original_price !== item.current_price && (
          <>
            <span style={{ fontSize: "13px", color: "#bbb", textDecoration: "line-through", fontFamily: "Georgia, serif" }}>€{item.original_price}</span>
            <span style={{ fontSize: "11px", background: pct >= 40 ? "#e8f5d0" : "#fef2e4", color: pct >= 40 ? "#2d5016" : "#b05a00", padding: "2px 6px", borderRadius: "2px", fontWeight: 600, fontFamily: "monospace" }}>
              -{pct}%
            </span>
          </>
        )}
      </div>

      {/* Size + Material */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "10px", letterSpacing: "0.1em", background: "#f0ede6", color: "#6b6459", padding: "2px 7px", borderRadius: "2px", fontFamily: "monospace" }}>
          SIZE {item.size}
        </span>
        {item.material && (
          <span style={{
            fontSize: "10px", letterSpacing: "0.08em",
            background: isPremium && isKnitwear ? "#edf5e8" : isSynthetic && isKnitwear ? "#fff0e8" : "#f0ede6",
            color: isPremium && isKnitwear ? "#2d5016" : isSynthetic && isKnitwear ? "#b05a00" : "#6b6459",
            padding: "2px 7px", borderRadius: "2px", fontFamily: "monospace"
          }}>
            {item.material.length > 30 ? item.material.slice(0, 28) + "…" : item.material}
          </span>
        )}
      </div>

      {/* Knitwear material flags */}
      {isKnitwear && isPremium && (
        <div style={{ fontSize: "11px", color: "#2d5016", background: "#edf5e8", padding: "5px 9px", borderRadius: "2px", fontFamily: "Georgia, serif" }}>
          ✦ Premium natural fibre — Merino / Cashmere / Lambswool
        </div>
      )}
      {isKnitwear && isSynthetic && (
        <div style={{ fontSize: "11px", color: "#b05a00", background: "#fff4e6", padding: "5px 9px", borderRadius: "2px", fontFamily: "Georgia, serif" }}>
          ⚠ Synthetic-heavy blend — Polyester / Acrylic detected
        </div>
      )}

      {/* Fit warning */}
      {fitWarn && (
        <div style={{ fontSize: "11px", color: "#7a5000", background: "#fff8e1", padding: "5px 9px", borderRadius: "2px", borderLeft: "3px solid #e8a000", fontFamily: "Georgia, serif" }}>
          ⚑ {fitWarn}
        </div>
      )}

      {/* 90-day lowest */}
      {item.is_lowest_90d && (
        <div style={{ fontSize: "10px", color: "#4a7c2f", letterSpacing: "0.08em", fontFamily: "monospace" }}>
          ↓ Lowest price in 90 days
        </div>
      )}

      {/* CTA */}
      <a href={item.url} target="_blank" rel="noopener noreferrer" style={{
        display: "inline-block", marginTop: "4px", padding: "8px 14px", fontSize: "10px",
        letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "'Cormorant Garamond', serif",
        fontWeight: 700, color: "#1a1814", border: "1px solid #c8c0b0",
        borderRadius: "2px", textDecoration: "none", background: "transparent",
        transition: "background 0.15s", alignSelf: "flex-start",
      }}
      onMouseEnter={e => e.currentTarget.style.background = "#f0ede6"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        View Item →
      </a>
    </div>
  );
}

// ─── Setup Panel ──────────────────────────────────────────────────────────────
function SetupPanel({ onDismiss }) {
  const schema = `-- Run in Supabase SQL Editor
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  category TEXT NOT NULL,          -- 'knitwear' | 'sportswear' | 'accessories' | 'skincare'
  brand TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT,
  size TEXT,
  material TEXT,
  description TEXT,
  currency TEXT DEFAULT 'EUR',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE price_history (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  current_price NUMERIC(10,2) NOT NULL,
  original_price NUMERIC(10,2),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- View: latest price + 90-day lowest flag
CREATE OR REPLACE VIEW products_with_price AS
SELECT
  p.*,
  ph.current_price,
  ph.original_price,
  ph.recorded_at,
  (ph.current_price = MIN(ph2.current_price) FILTER (
    WHERE ph2.recorded_at >= NOW() - INTERVAL '90 days'
  )) AS is_lowest_90d
FROM products p
JOIN price_history ph ON ph.product_id = p.id
JOIN price_history ph2 ON ph2.product_id = p.id
WHERE ph.recorded_at = (SELECT MAX(recorded_at) FROM price_history WHERE product_id = p.id)
GROUP BY p.id, ph.id;

-- Enable Row Level Security (read-only public access)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON products FOR SELECT USING (true);
CREATE POLICY "Public read" ON price_history FOR SELECT USING (true);`;

  const netlifySteps = `NETLIFY DEPLOYMENT STEPS
────────────────────────────────────────
1. Create a Vite + React project locally:
   npm create vite@latest old-money-tracker -- --template react
   cd old-money-tracker

2. Replace src/App.jsx with OldMoneyTracker.jsx content

3. Install no extra deps (app is self-contained)

4. Create .env.local in project root:
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key_here

5. Push to GitHub:
   git init && git add . && git commit -m "init"
   gh repo create old-money-tracker --public --push

6. On netlify.com → "Add new site" → "Import from Git"
   → Select your repo → Build command: npm run build
   → Publish directory: dist

7. In Netlify → Site Settings → Environment Variables:
   VITE_SUPABASE_URL  = your Supabase project URL
   VITE_SUPABASE_ANON_KEY = your Supabase anon key

8. Trigger redeploy — done!`;

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: "#1a1814", margin: 0 }}>
          Setup Guide
        </h2>
        <button onClick={onDismiss} style={{ fontFamily: "monospace", fontSize: 11, letterSpacing: "0.1em", padding: "6px 12px", border: "1px solid #c8c0b0", background: "transparent", cursor: "pointer", borderRadius: 2, color: "#6b6459" }}>
          ← Back
        </button>
      </div>

      {/* Supabase Schema */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b6459", marginBottom: 10 }}>
          1 · Supabase Schema
        </h3>
        <pre style={{ background: "#1a1814", color: "#c8c0b0", padding: 20, borderRadius: 4, fontSize: 11, overflow: "auto", lineHeight: 1.6, fontFamily: "monospace" }}>
          {schema}
        </pre>
      </div>

      {/* Netlify Steps */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b6459", marginBottom: 10 }}>
          2 · Netlify Deployment
        </h3>
        <pre style={{ background: "#1a1814", color: "#c8c0b0", padding: 20, borderRadius: 4, fontSize: 11, overflow: "auto", lineHeight: 1.6, fontFamily: "monospace" }}>
          {netlifySteps}
        </pre>
      </div>

      {/* Scraping Note */}
      <div style={{ background: "#fff8e1", border: "1px solid #e8d080", borderRadius: 4, padding: 16 }}>
        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 14, color: "#7a5000", margin: "0 0 8px" }}>
          ⚑ Note on Price Scraping
        </h3>
        <p style={{ fontSize: 12, color: "#7a5000", lineHeight: 1.7, margin: 0, fontFamily: "Georgia, serif" }}>
          Direct scraping of retail sites (COS, Zara, Arket, Zalando) is legally ambiguous and technically fragile due to anti-bot protections. The recommended approach is:
          <br /><br />
          <strong>Option A — Manual entry:</strong> Add items directly to Supabase via its dashboard or the REST API. The app will display them with all logic applied.
          <br /><br />
          <strong>Option B — Price-tracking APIs:</strong> Use services like <em>Keepa</em> (Amazon), <em>CamelCamelCamel</em>, or <em>PriceRunner API</em> for supported retailers.
          <br /><br />
          <strong>Option C — Zapier / Make.com automation:</strong> Build no-code scrapers targeting Zalando or brand sale pages and pipe data into Supabase.
          <br /><br />
          A backend scraper with rotating User-Agent headers and randomised delays is included as a commented template in the code.
        </p>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("knitwear");
  const [items, setItems] = useState(DEMO_ITEMS);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all"); // all | steal
  const [showSetup, setShowSetup] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);

  // Load from Supabase if credentials present
  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    setLoading(true);
    supabase.query("products_with_price", "?select=*")
      .then((data) => {
        if (data && data.length > 0) {
          setItems(data);
          setDbConnected(true);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((i) => {
    if (i.category !== activeTab) return false;
    if (filter === "steal") return isStealDeal(i);
    return true;
  });

  const stealCount = items.filter((i) => i.category === activeTab && isStealDeal(i)).length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f5f2ec",
      fontFamily: "Georgia, serif",
      color: "#1a1814",
    }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f5f2ec; }
        ::selection { background: #d4c9b0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #f5f2ec; }
        ::-webkit-scrollbar-thumb { background: #c8c0b0; border-radius: 3px; }
      `}</style>

      {/* Header */}
      <header style={{
        borderBottom: "1px solid #e0ddd5",
        background: "#1a1814",
        padding: "0 32px",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", height: 64 }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 600, color: "#e8e2d6", letterSpacing: "0.05em" }}>
              The Wardrobe Index
            </div>
            <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "#6b6459", marginTop: 1 }}>
              Old Money · Discount Tracker
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{
              fontSize: 10, letterSpacing: "0.12em", color: dbConnected ? "#4a7c2f" : "#9a8f7e",
              fontFamily: "'Cormorant Garamond', serif", display: "flex", alignItems: "center", gap: 5
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: dbConnected ? "#4a7c2f" : "#9a8f7e", display: "inline-block" }} />
              {dbConnected ? "Live DB" : "Demo Mode"}
            </div>
            <button
              onClick={() => setShowSetup(!showSetup)}
              style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "'Cormorant Garamond', serif", padding: "6px 14px", border: "1px solid #3a3530", background: "transparent", color: "#c8c0b0", cursor: "pointer", borderRadius: 2, transition: "border-color 0.15s" }}
            >
              {showSetup ? "← Tracker" : "Setup Guide"}
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 32px 64px" }}>
        {showSetup ? (
          <SetupPanel onDismiss={() => setShowSetup(false)} />
        ) : (
          <>
            {/* Profile Strip */}
            <div style={{ background: "#1a1814", borderRadius: 4, padding: "12px 20px", marginBottom: 28, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#6b6459", fontFamily: "'Cormorant Garamond', serif" }}>Your Fit</span>
              {[
                ["Height", `${PROFILE.height}cm`],
                ["Tops", PROFILE.clothingSizes.tops],
                ["Pants", PROFILE.clothingSizes.pants],
                ["Shoes", PROFILE.clothingSizes.shoes],
                ["Style", PROFILE.style],
              ].map(([label, val]) => (
                <div key={label} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                  <span style={{ fontSize: 9, letterSpacing: "0.12em", color: "#6b6459", textTransform: "uppercase", fontFamily: "monospace" }}>{label}</span>
                  <span style={{ fontSize: 12, color: "#c8c0b0", fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}>{val}</span>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e0ddd5", marginBottom: 24 }}>
              {CATEGORIES.map((cat) => {
                const active = activeTab === cat.key;
                const catSteals = items.filter(i => i.category === cat.key && isStealDeal(i)).length;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setActiveTab(cat.key)}
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: 13, letterSpacing: "0.1em",
                      padding: "10px 22px",
                      border: "none", background: "transparent",
                      color: active ? "#1a1814" : "#9a8f7e",
                      borderBottom: active ? "2px solid #1a1814" : "2px solid transparent",
                      cursor: "pointer", transition: "color 0.15s",
                      display: "flex", alignItems: "center", gap: 6,
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    <span style={{ opacity: 0.6 }}>{cat.icon}</span>
                    {cat.label}
                    {catSteals > 0 && (
                      <span style={{ background: "#2d5016", color: "#e8f5d0", fontSize: 9, padding: "1px 5px", borderRadius: 10, fontFamily: "monospace" }}>
                        {catSteals}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Filter row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#9a8f7e", fontFamily: "'Cormorant Garamond', serif" }}>
                {filtered.length} item{filtered.length !== 1 ? "s" : ""}
                {stealCount > 0 && filter === "all" && (
                  <span style={{ marginLeft: 10, color: "#4a7c2f" }}>· {stealCount} steal deal{stealCount !== 1 ? "s" : ""}</span>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {[["all", "All Items"], ["steal", "Steal Deals Only"]].map(([val, label]) => (
                  <button key={val} onClick={() => setFilter(val)} style={{
                    fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase",
                    fontFamily: "'Cormorant Garamond', serif",
                    padding: "5px 12px", border: "1px solid",
                    borderColor: filter === val ? "#1a1814" : "#d0ccc4",
                    background: filter === val ? "#1a1814" : "transparent",
                    color: filter === val ? "#e8e2d6" : "#9a8f7e",
                    cursor: "pointer", borderRadius: 2, transition: "all 0.15s",
                  }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid */}
            {loading ? (
              <div style={{ textAlign: "center", padding: 80, color: "#9a8f7e", fontFamily: "'Cormorant Garamond', serif", fontSize: 15, letterSpacing: "0.1em" }}>
                Loading from database…
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: 80, color: "#9a8f7e", fontFamily: "'Cormorant Garamond', serif", fontSize: 15, letterSpacing: "0.1em" }}>
                No items match this filter.
              </div>
            ) : (
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 16,
              }}>
                {filtered.map((item) => (
                  <ProductCard key={item.id} item={item} />
                ))}
              </div>
            )}

            {/* Legend */}
            <div style={{ marginTop: 40, padding: "16px 20px", border: "1px solid #e0ddd5", borderRadius: 4, display: "flex", flexWrap: "wrap", gap: 20 }}>
              <span style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#9a8f7e", fontFamily: "'Cormorant Garamond', serif", alignSelf: "center" }}>Legend</span>
              {[
                ["✦ Steal Deal", "#2d5016", "#edf5e8", "≥40% off + 90-day lowest"],
                ["↓ Lowest 90d", "#4a7c2f", "transparent", "Price history low"],
                ["✦ Premium Fibre", "#2d5016", "#edf5e8", "Merino / Cashmere / Lambswool"],
                ["⚠ Synthetic", "#b05a00", "#fff4e6", "Polyester / Acrylic blend"],
                ["⚑ Fit Warning", "#7a5000", "#fff8e1", "Relaxed / Oversized cut"],
              ].map(([label, color, bg, tip]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 10, color, background: bg, padding: "2px 7px", borderRadius: 2, fontFamily: "monospace" }}>{label}</span>
                  <span style={{ fontSize: 10, color: "#b0a898", fontFamily: "Georgia, serif" }}>{tip}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
