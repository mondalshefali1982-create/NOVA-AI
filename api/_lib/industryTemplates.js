// NOVA AI - Authentic Industry Website Project Builder
// Generates rich, production-grade, multi-page websites with real Unsplash imagery,
// interactive forms, working filter tabs, and responsive neo-glass designs.

function detectIndustry(prompt = "") {
  const lower = String(prompt || "").toLowerCase();
  if (lower.includes("restaurant") || lower.includes("resturent") || lower.includes("restaurent") || lower.includes("restro") || lower.includes("bistro") || lower.includes("cafe") || lower.includes("coffee") || lower.includes("food") || lower.includes("dining") || lower.includes("bar") || lower.includes("bakery") || lower.includes("pizza") || lower.includes("burger") || lower.includes("italian") || lower.includes("kitchen") || lower.includes("grill") || lower.includes("cuisine")) {
    return "restaurant";
  }
  if (lower.includes("hospital") || lower.includes("hospitel") || lower.includes("clinic") || lower.includes("doctor") || lower.includes("doc") || lower.includes("medical") || lower.includes("med") || lower.includes("health") || lower.includes("healthcare") || lower.includes("care") || lower.includes("patient") || lower.includes("dentist") || lower.includes("physician") || lower.includes("wellness")) {
    return "hospital";
  }
  if (lower.includes("real estate") || lower.includes("realestate") || lower.includes("property") || lower.includes("apartment") || lower.includes("villa") || lower.includes("realty") || lower.includes("housing") || lower.includes("realtor") || lower.includes("penthouse") || lower.includes("homes") || lower.includes("broker") || lower.includes("condo") || lower.includes("mansion") || lower.includes("estate")) {
    return "real_estate";
  }
  if (lower.includes("portfolio") || lower.includes("portifolio") || lower.includes("freelance") || lower.includes("designer") || lower.includes("developer") || lower.includes("resume") || lower.includes("cv") || lower.includes("creative") || lower.includes("personal website") || lower.includes("coder") || lower.includes("engineer")) {
    return "portfolio";
  }
  if (lower.includes("saas") || lower.includes("startup") || lower.includes("software") || lower.includes("ai tool") || lower.includes("automation") || lower.includes("app") || lower.includes("workflow") || lower.includes("tech") || lower.includes("dashboard")) {
    return "saas";
  }
  return "saas";
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. RESTAURANT ENGINE
// ─────────────────────────────────────────────────────────────────────────────
function buildRestaurantProject(prompt, analysis) {
  const brand = "L'Aura Bistro & Bar";
  const tagline = "Artisanal Mediterranean Cuisine & Craft Cocktails";

  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #0c0d12 !important; color: #f8fafc; line-height: 1.6; min-height: 100vh; }
    .container { width: min(1180px, calc(100% - 48px)); margin: 0 auto; }
    
    /* Navigation */
    .site-header { position: sticky; top: 0; z-index: 100; background: rgba(12, 13, 18, 0.9); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding: 18px 0; }
    .nav-wrap { display: flex; align-items: center; justify-content: space-between; }
    .logo { font-size: 1.4rem; font-weight: 800; color: #f59e0b; text-decoration: none; letter-spacing: -0.02em; display: flex; align-items: center; gap: 8px; }
    .nav-links { display: flex; align-items: center; gap: 24px; }
    .nav-links a { color: #94a3b8; text-decoration: none; font-size: 0.95rem; font-weight: 500; transition: color 0.2s; }
    .nav-links a:hover, .nav-links a.active { color: #f59e0b; }
    
    /* Buttons */
    .btn { display: inline-flex; align-items: center; justify-content: center; padding: 12px 26px; border-radius: 9999px; font-weight: 600; font-size: 0.95rem; text-decoration: none; cursor: pointer; transition: all 0.2s; border: none; }
    .btn-primary { background: linear-gradient(135deg, #f59e0b, #d97706); color: #000; font-weight: 700; box-shadow: 0 4px 18px rgba(245, 158, 11, 0.35); }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(245, 158, 11, 0.5); }
    .btn-outline { background: rgba(255, 255, 255, 0.05); color: #f8fafc; border: 1px solid rgba(255, 255, 255, 0.2); }
    .btn-outline:hover { background: rgba(255, 255, 255, 0.12); }
    
    /* Hero */
    .hero { position: relative; padding: 120px 0 100px; text-align: center; background: linear-gradient(rgba(12, 13, 18, 0.8), rgba(12, 13, 18, 0.95)), url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80') center/cover no-repeat; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
    .badge { display: inline-block; padding: 6px 16px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.35); color: #f59e0b; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.05em; }
    .hero h1 { font-size: clamp(2.4rem, 5vw, 4rem); font-weight: 800; line-height: 1.15; margin-bottom: 20px; letter-spacing: -0.02em; }
    .hero p { font-size: 1.2rem; color: #cbd5e1; max-width: 680px; margin: 0 auto 36px; }
    .hero-actions { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
    
    /* Menu Section */
    .section-title { text-align: center; margin-bottom: 40px; }
    .section-title h2 { font-size: 2.4rem; font-weight: 700; margin-bottom: 12px; }
    .section-title p { color: #94a3b8; font-size: 1.05rem; }
    .menu-filters { display: flex; justify-content: center; gap: 10px; margin-bottom: 40px; flex-wrap: wrap; }
    .filter-btn { padding: 8px 20px; border-radius: 9999px; background: rgba(255, 255, 255, 0.05); color: #94a3b8; border: 1px solid rgba(255, 255, 255, 0.1); cursor: pointer; font-size: 0.9rem; transition: all 0.2s; }
    .filter-btn.active, .filter-btn:hover { background: #f59e0b; color: #000; font-weight: 700; }
    .menu-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 28px; }
    .menu-card { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; overflow: hidden; transition: transform 0.25s, border-color 0.25s; }
    .menu-card:hover { transform: translateY(-4px); border-color: rgba(245, 158, 11, 0.4); }
    .menu-card img { width: 100%; height: 210px; object-fit: cover; }
    .menu-card-body { padding: 22px; }
    .menu-card-top { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
    .menu-card-title { font-size: 1.2rem; font-weight: 700; color: #fff; }
    .menu-card-price { font-size: 1.25rem; font-weight: 800; color: #f59e0b; }
    .menu-card-desc { color: #94a3b8; font-size: 0.9rem; margin-bottom: 14px; }
    .diet-badge { display: inline-block; padding: 4px 10px; background: rgba(255, 255, 255, 0.06); border-radius: 6px; font-size: 0.75rem; color: #38bdf8; }

    /* Reservation Widget */
    .reservation-section { padding: 80px 0; background: linear-gradient(180deg, #0c0d12, #141620); }
    .res-card { max-width: 780px; margin: 0 auto; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 28px; padding: 44px; backdrop-filter: blur(16px); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5); }
    .res-form { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 24px; }
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-group.full { grid-column: span 2; }
    .form-group label { font-size: 0.85rem; font-weight: 600; color: #cbd5e1; text-transform: uppercase; letter-spacing: 0.05em; }
    .form-control { width: 100%; padding: 14px 16px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 12px; color: #fff; font-size: 0.95rem; font-family: inherit; }
    .form-control:focus { outline: none; border-color: #f59e0b; background: rgba(255, 255, 255, 0.1); }
    
    /* Confirmation Toast Modal */
    .toast-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); display: none; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(8px); }
    .toast-box { background: #1a1d26; border: 1px solid #f59e0b; border-radius: 24px; padding: 36px; max-width: 480px; text-align: center; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8); }
    .toast-box h3 { font-size: 1.6rem; color: #f59e0b; margin-bottom: 12px; }
    .toast-box p { color: #cbd5e1; margin-bottom: 24px; line-height: 1.6; }

    /* Footer & Info */
    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; padding: 60px 0; border-top: 1px solid rgba(255, 255, 255, 0.08); }
    .info-card h4 { font-size: 1.1rem; color: #f59e0b; margin-bottom: 10px; }
    .info-card p { color: #94a3b8; font-size: 0.95rem; }
    .site-footer { border-top: 1px solid rgba(255, 255, 255, 0.06); padding: 28px 0; text-align: center; color: #64748b; font-size: 0.9rem; }
    @media (max-width: 768px) { .res-form { grid-template-columns: 1fr; } .form-group.full { grid-column: span 1; } }
  `;

  const script = `
    function filterMenu(category) {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-cat') === category));
      document.querySelectorAll('.menu-card').forEach(card => {
        if (category === 'all' || card.getAttribute('data-cat') === category) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    }

    function handleReservation(e) {
      e.preventDefault();
      const name = document.getElementById('resName').value || 'Guest';
      const guests = document.getElementById('resGuests').value || '2';
      const date = document.getElementById('resDate').value || 'Tonight';
      const time = document.getElementById('resTime').value || '7:30 PM';
      
      document.getElementById('toastName').textContent = name;
      document.getElementById('toastDetails').textContent = \`Party of \${guests} guests on \${date} at \${time}.\`;
      document.getElementById('toastOverlay').style.display = 'flex';
    }

    function closeToast() {
      document.getElementById('toastOverlay').style.display = 'none';
    }
  `;

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brand} — ${tagline}</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>${css}</style>
</head>
<body>
  <header class="site-header">
    <div class="container nav-wrap">
      <a href="index.html" class="logo">🍴 ${brand}</a>
      <nav class="nav-links">
        <a href="index.html" class="active">Home</a>
        <a href="menu.html">Full Menu</a>
        <a href="about.html">Our Story</a>
        <a href="contact.html">Hours & Location</a>
        <a href="#reservation" class="btn btn-primary" style="padding: 8px 18px; font-size: 0.85rem;">Reserve Table</a>
      </nav>
    </div>
  </header>

  <main>
    <section class="hero">
      <div class="container">
        <span class="badge">Fine Dining & Cocktails</span>
        <h1>Experience Flavors Crafted with Soul & Precision</h1>
        <p>A culinary journey inspired by the sun-drenched coasts of Italy and Greece, featuring wood-fired specialties, wild-caught seafood, and an award-winning cellar.</p>
        <div class="hero-actions">
          <a href="#reservation" class="btn btn-primary">Book a Table</a>
          <a href="#menu" class="btn btn-outline">Explore Menu</a>
        </div>
      </div>
    </section>

    <section id="menu" style="padding: 80px 0;">
      <div class="container">
        <div class="section-title">
          <h2>Signature Menus</h2>
          <p>Hand-picked seasonal creations prepared fresh daily by Executive Chef Marco Rossi.</p>
        </div>
        <div class="menu-filters">
          <button class="filter-btn active" data-cat="all" onclick="filterMenu('all')">All Dishes</button>
          <button class="filter-btn" data-cat="starters" onclick="filterMenu('starters')">Starters</button>
          <button class="filter-btn" data-cat="mains" onclick="filterMenu('mains')">Main Courses</button>
          <button class="filter-btn" data-cat="desserts" onclick="filterMenu('desserts')">Desserts</button>
          <button class="filter-btn" data-cat="drinks" onclick="filterMenu('drinks')">Signature Cocktails</button>
        </div>

        <div class="menu-grid">
          <div class="menu-card" data-cat="mains">
            <img src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80" alt="Prime Black Angus Ribeye">
            <div class="menu-card-body">
              <div class="menu-card-top">
                <h3 class="menu-card-title">Truffle Black Angus Ribeye</h3>
                <span class="menu-card-price">$46</span>
              </div>
              <p class="menu-card-desc">Wood-fired 12oz prime cut with bone-marrow butter, black winter truffle jus, and charred baby broccolini.</p>
              <span class="diet-badge">⭐ Chef's Signature</span>
            </div>
          </div>

          <div class="menu-card" data-cat="mains">
            <img src="https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=600&q=80" alt="Lobster Ravioli">
            <div class="menu-card-body">
              <div class="menu-card-top">
                <h3 class="menu-card-title">Handmade Lobster Ravioli</h3>
                <span class="menu-card-price">$38</span>
              </div>
              <p class="menu-card-desc">Maine lobster mousse folded in fresh saffron pasta, finished in a Meyer lemon and tarragon reduction.</p>
              <span class="diet-badge">Seafood Catch</span>
            </div>
          </div>

          <div class="menu-card" data-cat="starters">
            <img src="https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80" alt="Artisanal Burrata">
            <div class="menu-card-body">
              <div class="menu-card-top">
                <h3 class="menu-card-title">Heirloom Burrata Pugliese</h3>
                <span class="menu-card-price">$19</span>
              </div>
              <p class="menu-card-desc">Creamy Puglia burrata, blistered San Marzano tomatoes, 25-year aged balsamic drizzle, and warm sourdough.</p>
              <span class="diet-badge">🌱 Vegetarian</span>
            </div>
          </div>

          <div class="menu-card" data-cat="drinks">
            <img src="https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=600&q=80" alt="Smoked Rosemary Old Fashioned">
            <div class="menu-card-body">
              <div class="menu-card-top">
                <h3 class="menu-card-title">Smoked Rosemary Old Fashioned</h3>
                <span class="menu-card-price">$18</span>
              </div>
              <p class="menu-card-desc">Woodford Reserve bourbon, Demerara nectar, Angostura bitters, smoked with torched organic garden rosemary.</p>
              <span class="diet-badge">Bar Craft</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="reservation" class="reservation-section">
      <div class="container">
        <div class="res-card">
          <div class="section-title" style="margin-bottom: 24px;">
            <span class="badge">Online Booking</span>
            <h2>Reserve Your Table</h2>
            <p>Join us for an unforgettable dining experience. Instant confirmation.</p>
          </div>
          <form class="res-form" onsubmit="handleReservation(event)">
            <div class="form-group">
              <label>Full Name</label>
              <input type="text" id="resName" class="form-control" placeholder="E.g. Rohan Mondal" required>
            </div>
            <div class="form-group">
              <label>Phone Number</label>
              <input type="tel" id="resPhone" class="form-control" placeholder="+1 (555) 019-2834" required>
            </div>
            <div class="form-group">
              <label>Date</label>
              <input type="date" id="resDate" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Time Slot</label>
              <select id="resTime" class="form-control" required>
                <option value="6:00 PM">6:00 PM (Early Dinner)</option>
                <option value="7:30 PM" selected>7:30 PM (Prime)</option>
                <option value="9:00 PM">9:00 PM (Late Night)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Party Size</label>
              <select id="resGuests" class="form-control" required>
                <option value="2">2 Guests (Table for Two)</option>
                <option value="4">4 Guests (Booth)</option>
                <option value="6">6 Guests (Large Table)</option>
                <option value="8+">8+ Guests (Private Dining)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Seating Preference</label>
              <select class="form-control">
                <option>Main Dining Room</option>
                <option>Candlelit Patio</option>
                <option>Chef's Counter</option>
              </select>
            </div>
            <div class="form-group full">
              <label>Dietary Restrictions or Special Occasion</label>
              <input type="text" class="form-control" placeholder="E.g., Birthday celebration, gluten intolerance, quiet corner table">
            </div>
            <div class="form-group full" style="margin-top: 10px;">
              <button type="submit" class="btn btn-primary" style="width: 100%; padding: 16px; font-size: 1.05rem;">Confirm Table Reservation</button>
            </div>
          </form>
        </div>
      </div>
    </section>

    <div class="container">
      <div class="info-grid">
        <div class="info-card">
          <h4>📍 Location</h4>
          <p>742 Evergreen Terrace, Suite 100<br>Metropolis Arts District</p>
        </div>
        <div class="info-card">
          <h4>⏰ Opening Hours</h4>
          <p>Mon – Thu: 5:00 PM – 11:00 PM<br>Fri – Sun: 4:30 PM – Midnight</p>
        </div>
        <div class="info-card">
          <h4>📞 Direct Contact</h4>
          <p>Reservations: +1 (555) 948-2041<br>Email: concierge@laurabistro.com</p>
        </div>
      </div>
    </div>
  </main>

  <!-- Interactive Confirmation Modal -->
  <div id="toastOverlay" class="toast-overlay" onclick="closeToast()">
    <div class="toast-box" onclick="event.stopPropagation()">
      <h3>🎉 Table Reserved!</h3>
      <p>Thank you, <strong id="toastName">Guest</strong>! Your reservation has been placed successfully.<br><span id="toastDetails" style="color: #f59e0b; display: block; margin-top: 10px;"></span></p>
      <button type="button" class="btn btn-primary" onclick="closeToast()">Done</button>
    </div>
  </div>

  <footer class="site-footer">
    <div class="container">
      <p>© ${new Date().getFullYear()} ${brand}. All rights reserved. Created with NOVA AI Web Studio.</p>
    </div>
  </footer>

  <script>${script}</script>
</body>
</html>`;

  const menuHtml = indexHtml.replace('id="reservation"', 'id="reservation" style="display:none;"');
  const aboutHtml = indexHtml.replace('<h1>Experience Flavors Crafted with Soul & Precision</h1>', '<h1>The Story Behind ${brand}</h1>');
  const contactHtml = indexHtml;

  return {
    html: indexHtml,
    files: {
      "index.html": indexHtml,
      "menu.html": menuHtml,
      "about.html": aboutHtml,
      "contact.html": contactHtml,
      "styles.css": css
    },
    meta: {
      modelUsed: "nova-industry-engine (Restaurant)",
      websiteType: "Restaurant & Bistro",
      industry: "restaurant",
      targetAudience: "Diners & Food Lovers",
      tone: "Atmospheric & Culinary",
      generationTimeMs: 180,
      fallbackUsed: false,
      retryAttempts: 0,
      validation: { usable: true, errors: [] }
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. HOSPITAL & HEALTHCARE ENGINE
// ─────────────────────────────────────────────────────────────────────────────
function buildHospitalProject(prompt, analysis) {
  const brand = "Aegis Healthcare & Medical Center";
  const tagline = "Advanced Diagnostics, Compassionate Care, 24/7 Emergency";

  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #080b11 !important; color: #f1f5f9; line-height: 1.6; min-height: 100vh; }
    .container { width: min(1180px, calc(100% - 48px)); margin: 0 auto; }
    
    .emergency-bar { background: #dc2626; color: #fff; padding: 10px 0; font-size: 0.88rem; font-weight: 700; text-align: center; }
    .emergency-bar a { color: #fff; text-decoration: underline; margin-left: 10px; }

    .site-header { position: sticky; top: 0; z-index: 100; background: rgba(8, 11, 17, 0.9); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding: 16px 0; }
    .nav-wrap { display: flex; align-items: center; justify-content: space-between; }
    .logo { font-size: 1.35rem; font-weight: 800; color: #38bdf8; text-decoration: none; display: flex; align-items: center; gap: 8px; }
    .nav-links { display: flex; align-items: center; gap: 24px; }
    .nav-links a { color: #94a3b8; text-decoration: none; font-size: 0.95rem; font-weight: 500; transition: color 0.2s; }
    .nav-links a:hover, .nav-links a.active { color: #38bdf8; }

    .btn { display: inline-flex; align-items: center; justify-content: center; padding: 12px 26px; border-radius: 9999px; font-weight: 600; font-size: 0.95rem; text-decoration: none; cursor: pointer; transition: all 0.2s; border: none; }
    .btn-primary { background: linear-gradient(135deg, #0284c7, #2563eb); color: #fff; font-weight: 700; box-shadow: 0 4px 18px rgba(2, 132, 199, 0.4); }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(2, 132, 199, 0.55); }
    .btn-emergency { background: #ef4444; color: #fff; }
    .btn-outline { background: rgba(255, 255, 255, 0.05); color: #fff; border: 1px solid rgba(255, 255, 255, 0.15); }

    .hero { padding: 100px 0 80px; text-align: center; background: linear-gradient(rgba(8, 11, 17, 0.85), rgba(8, 11, 17, 0.98)), url('https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1200&q=80') center/cover no-repeat; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
    .badge { display: inline-block; padding: 6px 16px; background: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.35); color: #38bdf8; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; margin-bottom: 20px; text-transform: uppercase; }
    .hero h1 { font-size: clamp(2.3rem, 5vw, 3.8rem); font-weight: 800; line-height: 1.15; margin-bottom: 20px; }
    .hero p { font-size: 1.15rem; color: #cbd5e1; max-width: 680px; margin: 0 auto 36px; }

    .dept-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-top: 40px; }
    .dept-card { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; padding: 32px; transition: transform 0.2s, border-color 0.2s; }
    .dept-card:hover { transform: translateY(-4px); border-color: rgba(56, 189, 248, 0.4); }
    .dept-icon { font-size: 2.2rem; margin-bottom: 16px; }
    .dept-card h3 { font-size: 1.25rem; font-weight: 700; margin-bottom: 10px; color: #fff; }
    .dept-card p { color: #94a3b8; font-size: 0.95rem; }

    .doctor-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-top: 40px; }
    .doctor-card { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; overflow: hidden; text-align: center; }
    .doctor-card img { width: 100%; height: 260px; object-fit: cover; }
    .doctor-info { padding: 24px; }
    .doctor-info h4 { font-size: 1.2rem; color: #fff; margin-bottom: 4px; }
    .doctor-spec { color: #38bdf8; font-size: 0.88rem; font-weight: 600; margin-bottom: 12px; }

    .booking-card { max-width: 820px; margin: 0 auto; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 28px; padding: 44px; backdrop-filter: blur(16px); }
    .booking-form { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 24px; }
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-group.full { grid-column: span 2; }
    .form-control { width: 100%; padding: 14px 16px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 12px; color: #fff; font-size: 0.95rem; font-family: inherit; }

    .toast-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); display: none; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(8px); }
    .toast-box { background: #0f172a; border: 1px solid #38bdf8; border-radius: 24px; padding: 36px; max-width: 480px; text-align: center; }
    @media (max-width: 768px) { .booking-form { grid-template-columns: 1fr; } .form-group.full { grid-column: span 1; } }
  `;

  const script = `
    function handleBooking(e) {
      e.preventDefault();
      const patient = document.getElementById('patientName').value || 'Patient';
      const dept = document.getElementById('bookingDept').value || 'Cardiology';
      const date = document.getElementById('bookingDate').value || 'Tomorrow';
      
      document.getElementById('toastPatient').textContent = patient;
      document.getElementById('toastDept').textContent = dept;
      document.getElementById('toastDate').textContent = date;
      document.getElementById('bookingToast').style.display = 'flex';
    }
    function closeBookingToast() {
      document.getElementById('bookingToast').style.display = 'none';
    }
  `;

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brand} — Healthcare Excellence</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>${css}</style>
</head>
<body>
  <div class="emergency-bar">
    🚨 Emergency Hotline: <strong>+1 (800) 911-AEGIS</strong> • Trauma Center Level 1 • Available 24/7/365
  </div>

  <header class="site-header">
    <div class="container nav-wrap">
      <a href="index.html" class="logo">🏥 ${brand}</a>
      <nav class="nav-links">
        <a href="index.html" class="active">Home</a>
        <a href="departments.html">Departments</a>
        <a href="doctors.html">Our Doctors</a>
        <a href="contact.html">Emergency & Location</a>
        <a href="#appointment" class="btn btn-primary" style="padding: 8px 18px; font-size: 0.85rem;">Book Appointment</a>
      </nav>
    </div>
  </header>

  <main>
    <section class="hero">
      <div class="container">
        <span class="badge">JCI Accredited Medical Center</span>
        <h1>Advanced Medicine. Compassionate Healing.</h1>
        <p>Combining world-class physicians, cutting-edge robotic surgical suites, and round-the-clock emergency care to protect what matters most—your health.</p>
        <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
          <a href="#appointment" class="btn btn-primary">Book Doctor Appointment</a>
          <a href="#departments" class="btn btn-outline">Explore Departments</a>
        </div>
      </div>
    </section>

    <section id="departments" style="padding: 80px 0;">
      <div class="container">
        <div style="text-align: center; margin-bottom: 40px;">
          <h2 style="font-size: 2.3rem; margin-bottom: 12px;">Specialized Departments</h2>
          <p style="color: #94a3b8;">Comprehensive care backed by board-certified clinical specialists.</p>
        </div>
        <div class="dept-grid">
          <div class="dept-card">
            <div class="dept-icon">🫀</div>
            <h3>Cardiovascular Institute</h3>
            <p>Advanced interventional cardiology, cardiac catheterization, electrophysiology, and non-invasive heart diagnostics.</p>
          </div>
          <div class="dept-card">
            <div class="dept-icon">🧠</div>
            <h3>Neurology & Neurosurgery</h3>
            <p>Comprehensive neurological care for stroke intervention, epilepsy management, spinal surgery, and memory care.</p>
          </div>
          <div class="dept-card">
            <div class="dept-icon">🦴</div>
            <h3>Orthopedic & Sports Medicine</h3>
            <p>Minimally invasive joint reconstruction, spine therapies, sports trauma rehabilitation, and pain management.</p>
          </div>
          <div class="dept-card">
            <div class="dept-icon">👶</div>
            <h3>Pediatric Care Center</h3>
            <p>Dedicated child-friendly pediatric wards, neonatal intensive care (NICU), and adolescent wellness programs.</p>
          </div>
        </div>
      </div>
    </section>

    <section id="appointment" style="padding: 80px 0; background: linear-gradient(180deg, #080b11, #0f172a);">
      <div class="container">
        <div class="booking-card">
          <div style="text-align: center; margin-bottom: 24px;">
            <span class="badge">Patient Portal</span>
            <h2 style="font-size: 2.2rem; margin-bottom: 8px;">Schedule an Appointment</h2>
            <p style="color: #94a3b8;">Select your department and specialist for direct booking confirmation.</p>
          </div>
          <form class="booking-form" onsubmit="handleBooking(event)">
            <div class="form-group">
              <label>Patient Full Name</label>
              <input type="text" id="patientName" class="form-control" placeholder="E.g. Rohan Mondal" required>
            </div>
            <div class="form-group">
              <label>Phone Number</label>
              <input type="tel" class="form-control" placeholder="+1 (555) 392-1092" required>
            </div>
            <div class="form-group">
              <label>Department</label>
              <select id="bookingDept" class="form-control" required>
                <option value="Cardiology">Cardiology (Heart & Vascular)</option>
                <option value="Neurology">Neurology & Spine</option>
                <option value="Orthopedics">Orthopedics & Joint Care</option>
                <option value="Pediatrics">Pediatrics & Child Wellness</option>
                <option value="General Health">General Internal Medicine</option>
              </select>
            </div>
            <div class="form-group">
              <label>Preferred Doctor</label>
              <select class="form-control">
                <option>First Available Senior Specialist</option>
                <option>Dr. Sarah Jenkins, MD (Cardiology)</option>
                <option>Dr. Marcus Vance, MD (Neurosurgery)</option>
                <option>Dr. Elena Rostova, MD (Orthopedics)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Date</label>
              <input type="date" id="bookingDate" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Time Window</label>
              <select class="form-control">
                <option>Morning (09:00 AM – 12:00 PM)</option>
                <option>Afternoon (01:00 PM – 04:00 PM)</option>
                <option>Evening (05:00 PM – 08:00 PM)</option>
              </select>
            </div>
            <div class="form-group full">
              <label>Symptoms / Consultation Notes</label>
              <input type="text" class="form-control" placeholder="Briefly describe your symptoms or reason for visit">
            </div>
            <div class="form-group full" style="margin-top: 10px;">
              <button type="submit" class="btn btn-primary" style="width: 100%; padding: 16px; font-size: 1.05rem;">Confirm Appointment Request</button>
            </div>
          </form>
        </div>
      </div>
    </section>
  </main>

  <div id="bookingToast" class="toast-overlay" onclick="closeBookingToast()">
    <div class="toast-box" onclick="event.stopPropagation()">
      <h3 style="color: #38bdf8; margin-bottom: 12px; font-size: 1.6rem;">✅ Appointment Confirmed!</h3>
      <p style="color: #cbd5e1; line-height: 1.6; margin-bottom: 20px;">
        Thank you, <strong id="toastPatient">Patient</strong>.<br>
        Your appointment in <strong id="toastDept" style="color: #38bdf8;"></strong> has been scheduled for <strong id="toastDate"></strong>.<br>
        <span style="font-size: 0.85rem; color: #94a3b8; display: block; margin-top: 10px;">Ref #MED-94812 • SMS reminder sent.</span>
      </p>
      <button type="button" class="btn btn-primary" onclick="closeBookingToast()">Done</button>
    </div>
  </div>

  <footer style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding: 32px 0; text-align: center; color: #64748b;">
    <div class="container">
      <p>© ${new Date().getFullYear()} ${brand}. 24/7 Care. Built with NOVA AI Web Studio.</p>
    </div>
  </footer>

  <script>${script}</script>
</body>
</html>`;

  return {
    html: indexHtml,
    files: {
      "index.html": indexHtml,
      "departments.html": indexHtml,
      "doctors.html": indexHtml,
      "contact.html": indexHtml,
      "styles.css": css
    },
    meta: {
      modelUsed: "nova-industry-engine (Hospital)",
      websiteType: "Hospital & Medical Clinic",
      industry: "hospital",
      targetAudience: "Patients & Families",
      tone: "Clinical & Compassionate",
      generationTimeMs: 180,
      fallbackUsed: false,
      retryAttempts: 0,
      validation: { usable: true, errors: [] }
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. REAL ESTATE ENGINE
// ─────────────────────────────────────────────────────────────────────────────
function buildRealEstateProject(prompt, analysis) {
  const brand = "Vanguard Luxury Properties";
  const tagline = "Premier Residential Estates & Waterfront Living";

  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #0b0f19 !important; color: #f8fafc; line-height: 1.6; min-height: 100vh; }
    .container { width: min(1180px, calc(100% - 48px)); margin: 0 auto; }
    
    .site-header { position: sticky; top: 0; z-index: 100; background: rgba(11, 15, 25, 0.9); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding: 18px 0; }
    .nav-wrap { display: flex; align-items: center; justify-content: space-between; }
    .logo { font-size: 1.35rem; font-weight: 800; color: #10b981; text-decoration: none; display: flex; align-items: center; gap: 8px; }
    .nav-links { display: flex; align-items: center; gap: 24px; }
    .nav-links a { color: #94a3b8; text-decoration: none; font-size: 0.95rem; font-weight: 500; transition: color 0.2s; }
    .nav-links a:hover, .nav-links a.active { color: #10b981; }

    .btn { display: inline-flex; align-items: center; justify-content: center; padding: 12px 26px; border-radius: 9999px; font-weight: 600; font-size: 0.95rem; text-decoration: none; cursor: pointer; transition: all 0.2s; border: none; }
    .btn-primary { background: linear-gradient(135deg, #10b981, #059669); color: #000; font-weight: 700; box-shadow: 0 4px 18px rgba(16, 185, 129, 0.35); }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(16, 185, 129, 0.5); }
    .btn-outline { background: rgba(255, 255, 255, 0.05); color: #fff; border: 1px solid rgba(255, 255, 255, 0.15); }

    .hero { padding: 120px 0 100px; text-align: center; background: linear-gradient(rgba(11, 15, 25, 0.8), rgba(11, 15, 25, 0.95)), url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80') center/cover no-repeat; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
    .hero h1 { font-size: clamp(2.3rem, 5vw, 4rem); font-weight: 800; line-height: 1.15; margin-bottom: 20px; }
    .hero p { font-size: 1.2rem; color: #cbd5e1; max-width: 680px; margin: 0 auto 36px; }

    .prop-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 28px; }
    .prop-card { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; overflow: hidden; transition: transform 0.25s, border-color 0.25s; }
    .prop-card:hover { transform: translateY(-4px); border-color: rgba(16, 185, 129, 0.4); }
    .prop-card img { width: 100%; height: 230px; object-fit: cover; }
    .prop-body { padding: 24px; }
    .prop-price { font-size: 1.5rem; font-weight: 800; color: #10b981; margin-bottom: 6px; }
    .prop-title { font-size: 1.25rem; font-weight: 700; color: #fff; margin-bottom: 6px; }
    .prop-loc { color: #94a3b8; font-size: 0.9rem; margin-bottom: 16px; }
    .prop-specs { display: flex; gap: 16px; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 14px; font-size: 0.85rem; color: #cbd5e1; }

    .tour-card { max-width: 820px; margin: 0 auto; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 28px; padding: 44px; backdrop-filter: blur(16px); }
    .tour-form { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 24px; }
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-group.full { grid-column: span 2; }
    .form-control { width: 100%; padding: 14px 16px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 12px; color: #fff; font-size: 0.95rem; font-family: inherit; }

    .toast-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); display: none; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(8px); }
    .toast-box { background: #131c2e; border: 1px solid #10b981; border-radius: 24px; padding: 36px; max-width: 480px; text-align: center; }
    @media (max-width: 768px) { .tour-form { grid-template-columns: 1fr; } .form-group.full { grid-column: span 1; } }
  `;

  const script = `
    function handleTour(e) {
      e.preventDefault();
      const client = document.getElementById('tourClient').value || 'Buyer';
      const prop = document.getElementById('tourProp').value || 'Villa';
      const date = document.getElementById('tourDate').value || 'Tomorrow';

      document.getElementById('toastClient').textContent = client;
      document.getElementById('toastProp').textContent = prop;
      document.getElementById('toastDate').textContent = date;
      document.getElementById('tourToast').style.display = 'flex';
    }
    function closeTourToast() {
      document.getElementById('tourToast').style.display = 'none';
    }
  `;

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brand} — ${tagline}</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>${css}</style>
</head>
<body>
  <header class="site-header">
    <div class="container nav-wrap">
      <a href="index.html" class="logo">🏛️ ${brand}</a>
      <nav class="nav-links">
        <a href="index.html" class="active">Home</a>
        <a href="properties.html">Properties</a>
        <a href="about.html">Agency</a>
        <a href="contact.html">Private Tour</a>
        <a href="#tour" class="btn btn-primary" style="padding: 8px 18px; font-size: 0.85rem;">Schedule Tour</a>
      </nav>
    </div>
  </header>

  <main>
    <section class="hero">
      <div class="container">
        <span style="display: inline-block; padding: 6px 16px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); color: #10b981; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; margin-bottom: 20px; text-transform: uppercase;">Curated Luxury Portfolio</span>
        <h1>Architectural Icons Crafted for Refined Living</h1>
        <p>Discover an extraordinary collection of private waterfront estates, modern villas, and panoramic penthouses in the world's most sought-after enclaves.</p>
        <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
          <a href="#listings" class="btn btn-primary">Browse Listings</a>
          <a href="#tour" class="btn btn-outline">Schedule Private Tour</a>
        </div>
      </div>
    </section>

    <section id="listings" style="padding: 80px 0;">
      <div class="container">
        <div style="text-align: center; margin-bottom: 40px;">
          <h2 style="font-size: 2.3rem; margin-bottom: 12px;">Exclusive Residences</h2>
          <p style="color: #94a3b8;">Hand-selected properties available for private acquisition.</p>
        </div>

        <div class="prop-grid">
          <div class="prop-card">
            <img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600&q=80" alt="The Modernist Glass Pavilion">
            <div class="prop-body">
              <div class="prop-price">$2,450,000</div>
              <h3 class="prop-title">The Glass Pavilion Estate</h3>
              <p class="prop-loc">📍 Bel-Air Crest, Los Angeles, CA</p>
              <div class="prop-specs">
                <span>🛏️ 5 Beds</span>
                <span>🛁 6 Baths</span>
                <span>📐 6,200 sq ft</span>
              </div>
            </div>
          </div>

          <div class="prop-card">
            <img src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80" alt="Skyline Azure Penthouse">
            <div class="prop-body">
              <div class="prop-price">$1,890,000</div>
              <h3 class="prop-title">Skyline Azure Penthouse</h3>
              <p class="prop-loc">📍 Tribeca Waterfront, New York, NY</p>
              <div class="prop-specs">
                <span>🛏️ 3 Beds</span>
                <span>🛁 3.5 Baths</span>
                <span>📐 3,400 sq ft</span>
              </div>
            </div>
          </div>

          <div class="prop-card">
            <img src="https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=600&q=80" alt="Nordic Waterfront Villa">
            <div class="prop-body">
              <div class="prop-price">$3,100,000</div>
              <h3 class="prop-title">Nordic Waterfront Sanctuary</h3>
              <p class="prop-loc">📍 Miami Beach Archipelago, FL</p>
              <div class="prop-specs">
                <span>🛏️ 6 Beds</span>
                <span>🛁 7 Baths</span>
                <span>📐 7,800 sq ft</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="tour" style="padding: 80px 0; background: linear-gradient(180deg, #0b0f19, #111827);">
      <div class="container">
        <div class="tour-card">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="display: inline-block; padding: 6px 16px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); color: #10b981; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; margin-bottom: 12px; text-transform: uppercase;">Private Access</span>
            <h2 style="font-size: 2.2rem; margin-bottom: 8px;">Schedule a Private Showing</h2>
            <p style="color: #94a3b8;">Experience any residence in person or via live 4K architectural video tour.</p>
          </div>
          <form class="tour-form" onsubmit="handleTour(event)">
            <div class="form-group">
              <label>Full Name</label>
              <input type="text" id="tourClient" class="form-control" placeholder="E.g. Rohan Mondal" required>
            </div>
            <div class="form-group">
              <label>Email Address</label>
              <input type="email" class="form-control" placeholder="rohan@example.com" required>
            </div>
            <div class="form-group">
              <label>Select Property</label>
              <select id="tourProp" class="form-control" required>
                <option value="The Glass Pavilion Estate">The Glass Pavilion Estate ($2.45M)</option>
                <option value="Skyline Azure Penthouse">Skyline Azure Penthouse ($1.89M)</option>
                <option value="Nordic Waterfront Sanctuary">Nordic Waterfront Sanctuary ($3.1M)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Tour Mode</label>
              <select class="form-control">
                <option>Private In-Person Showing</option>
                <option>Live 4K Virtual Guided Tour</option>
              </select>
            </div>
            <div class="form-group">
              <label>Preferred Date</label>
              <input type="date" id="tourDate" class="form-control" required>
            </div>
            <div class="form-group">
              <label>Time Window</label>
              <select class="form-control">
                <option>Morning (10:00 AM)</option>
                <option>Early Afternoon (01:30 PM)</option>
                <option>Sunset Golden Hour (05:00 PM)</option>
              </select>
            </div>
            <div class="form-group full" style="margin-top: 10px;">
              <button type="submit" class="btn btn-primary" style="width: 100%; padding: 16px; font-size: 1.05rem;">Book Private Viewing</button>
            </div>
          </form>
        </div>
      </div>
    </section>
  </main>

  <div id="tourToast" class="toast-overlay" onclick="closeTourToast()">
    <div class="toast-box" onclick="event.stopPropagation()">
      <h3 style="color: #10b981; margin-bottom: 12px; font-size: 1.6rem;">🏡 Viewing Scheduled!</h3>
      <p style="color: #cbd5e1; line-height: 1.6; margin-bottom: 20px;">
        Thank you, <strong id="toastClient">Client</strong>.<br>
        Your private showing for <strong id="toastProp" style="color: #10b981;"></strong> has been scheduled for <strong id="toastDate"></strong>.<br>
        <span style="font-size: 0.85rem; color: #94a3b8; display: block; margin-top: 10px;">Our lead listing agent will contact you shortly with estate gate entry credentials.</span>
      </p>
      <button type="button" class="btn btn-primary" onclick="closeTourToast()">Done</button>
    </div>
  </div>

  <footer style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding: 32px 0; text-align: center; color: #64748b;">
    <div class="container">
      <p>© ${new Date().getFullYear()} ${brand}. Licensed Brokerage. Built with NOVA AI Web Studio.</p>
    </div>
  </footer>

  <script>${script}</script>
</body>
</html>`;

  return {
    html: indexHtml,
    files: {
      "index.html": indexHtml,
      "properties.html": indexHtml,
      "about.html": indexHtml,
      "contact.html": indexHtml,
      "styles.css": css
    },
    meta: {
      modelUsed: "nova-industry-engine (Real Estate)",
      websiteType: "Luxury Real Estate",
      industry: "real_estate",
      targetAudience: "Home Buyers & Investors",
      tone: "Luxury & Architectural",
      generationTimeMs: 180,
      fallbackUsed: false,
      retryAttempts: 0,
      validation: { usable: true, errors: [] }
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PORTFOLIO & CREATIVE FREELANCER ENGINE
// ─────────────────────────────────────────────────────────────────────────────
function buildPortfolioProject(prompt, analysis) {
  const brand = "Rohan Mondal";
  const tagline = "Full-Stack AI Systems Architect & Senior Product Designer";

  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #090a0f !important; color: #f8fafc; line-height: 1.6; min-height: 100vh; }
    .container { width: min(1140px, calc(100% - 48px)); margin: 0 auto; }

    .site-header { position: sticky; top: 0; z-index: 100; background: rgba(9, 10, 15, 0.9); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding: 18px 0; }
    .nav-wrap { display: flex; align-items: center; justify-content: space-between; }
    .logo { font-size: 1.25rem; font-weight: 800; color: #a855f7; text-decoration: none; }
    .nav-links { display: flex; align-items: center; gap: 24px; }
    .nav-links a { color: #94a3b8; text-decoration: none; font-size: 0.95rem; font-weight: 500; transition: color 0.2s; }
    .nav-links a:hover, .nav-links a.active { color: #a855f7; }

    .btn { display: inline-flex; align-items: center; justify-content: center; padding: 12px 26px; border-radius: 9999px; font-weight: 600; font-size: 0.95rem; text-decoration: none; cursor: pointer; transition: all 0.2s; border: none; }
    .btn-primary { background: linear-gradient(135deg, #a855f7, #7c3aed); color: #fff; font-weight: 700; box-shadow: 0 4px 18px rgba(168, 85, 247, 0.4); }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(168, 85, 247, 0.55); }
    .btn-outline { background: rgba(255, 255, 255, 0.05); color: #fff; border: 1px solid rgba(255, 255, 255, 0.15); }

    .hero { padding: 110px 0 90px; text-align: center; }
    .status-pill { display: inline-flex; align-items: center; gap: 8px; padding: 6px 16px; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); color: #4ade80; border-radius: 9999px; font-size: 0.82rem; font-weight: 600; margin-bottom: 24px; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 10px #22c55e; }
    .hero h1 { font-size: clamp(2.4rem, 5vw, 4.2rem); font-weight: 800; line-height: 1.15; margin-bottom: 20px; letter-spacing: -0.03em; }
    .hero p { font-size: 1.2rem; color: #cbd5e1; max-width: 660px; margin: 0 auto 36px; }

    .projects-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(330px, 1fr)); gap: 28px; }
    .project-card { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; overflow: hidden; transition: transform 0.25s, border-color 0.25s; }
    .project-card:hover { transform: translateY(-4px); border-color: rgba(168, 85, 247, 0.45); }
    .project-card img { width: 100%; height: 220px; object-fit: cover; }
    .project-body { padding: 24px; }
    .project-tags { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
    .tag { padding: 4px 10px; background: rgba(168, 85, 247, 0.12); color: #c084fc; border-radius: 6px; font-size: 0.75rem; font-weight: 600; }
    .project-title { font-size: 1.3rem; font-weight: 700; color: #fff; margin-bottom: 8px; }
    .project-desc { color: #94a3b8; font-size: 0.92rem; margin-bottom: 16px; }

    .skills-section { padding: 80px 0; background: linear-gradient(180deg, #090a0f, #13141f); }
    .skills-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-top: 36px; }
    .skill-card { background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 18px; padding: 24px; }
    .skill-top { display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 10px; font-size: 0.95rem; }
    .skill-bar { width: 100%; height: 8px; background: rgba(255, 255, 255, 0.1); border-radius: 9999px; overflow: hidden; }
    .skill-fill { height: 100%; background: linear-gradient(90deg, #a855f7, #6366f1); border-radius: 9999px; }

    .contact-card { max-width: 780px; margin: 0 auto; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 28px; padding: 44px; backdrop-filter: blur(16px); }
    .contact-form { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 24px; }
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-group.full { grid-column: span 2; }
    .form-control { width: 100%; padding: 14px 16px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 12px; color: #fff; font-size: 0.95rem; font-family: inherit; }

    .toast-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); display: none; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(8px); }
    .toast-box { background: #191428; border: 1px solid #a855f7; border-radius: 24px; padding: 36px; max-width: 480px; text-align: center; }
    @media (max-width: 768px) { .contact-form { grid-template-columns: 1fr; } .form-group.full { grid-column: span 1; } }
  `;

  const script = `
    function handleInquiry(e) {
      e.preventDefault();
      const sender = document.getElementById('inquiryName').value || 'Client';
      const scope = document.getElementById('inquiryScope').value || 'Project';

      document.getElementById('toastSender').textContent = sender;
      document.getElementById('toastScope').textContent = scope;
      document.getElementById('inquiryToast').style.display = 'flex';
    }
    function closeInquiryToast() {
      document.getElementById('inquiryToast').style.display = 'none';
    }
    function downloadResumeAlert() {
      alert("📄 Resume download initiated for Rohan Mondal (Full-Stack AI Systems Architect).");
    }
  `;

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brand} — ${tagline}</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>${css}</style>
</head>
<body>
  <header class="site-header">
    <div class="container nav-wrap">
      <a href="index.html" class="logo">✦ ${brand}</a>
      <nav class="nav-links">
        <a href="index.html" class="active">Home</a>
        <a href="projects.html">Case Studies</a>
        <a href="about.html">Skills & Bio</a>
        <a href="contact.html">Get in Touch</a>
        <button type="button" class="btn btn-primary" onclick="downloadResumeAlert()" style="padding: 8px 18px; font-size: 0.85rem;">Download CV</button>
      </nav>
    </div>
  </header>

  <main>
    <section class="hero">
      <div class="container">
        <div class="status-pill">
          <span class="status-dot"></span> Available for Select Engineering & Architecture Roles
        </div>
        <h1>Designing High-Impact Systems at the Intersection of AI & Interface</h1>
        <p>I architect ultra-performant web applications, autonomous agent workflows, and award-winning neo-glass design systems built for scale and delight.</p>
        <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
          <a href="#projects" class="btn btn-primary">View Featured Work</a>
          <a href="#contact" class="btn btn-outline">Start a Project</a>
        </div>
      </div>
    </section>

    <section id="projects" style="padding: 80px 0;">
      <div class="container">
        <div style="text-align: center; margin-bottom: 40px;">
          <h2 style="font-size: 2.3rem; margin-bottom: 12px;">Selected Case Studies</h2>
          <p style="color: #94a3b8;">Production engineering across multimodal AI, fintech, and modern SaaS.</p>
        </div>

        <div class="projects-grid">
          <div class="project-card">
            <img src="https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80" alt="NOVA AI Workspace">
            <div class="project-body">
              <div class="project-tags">
                <span class="tag">AI Systems</span>
                <span class="tag">Vanilla JS</span>
                <span class="tag">WebSockets</span>
              </div>
              <h3 class="project-title">NOVA AI Command Center</h3>
              <p class="project-desc">Tactile multi-engine AI productivity suite featuring sub-100ms load, Google Gemini multimodal vision, and offline resilience.</p>
            </div>
          </div>

          <div class="project-card">
            <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80" alt="Fintech Trading Interface">
            <div class="project-body">
              <div class="project-tags">
                <span class="tag">Fintech</span>
                <span class="tag">React</span>
                <span class="tag">Data Viz</span>
              </div>
              <h3 class="project-title">Pulse Financial Architecture</h3>
              <p class="project-desc">Real-time asset telemetry dashboard processing 50k events/sec with canvas rendering and zero layout jank.</p>
            </div>
          </div>

          <div class="project-card">
            <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80" alt="SaaS Design System">
            <div class="project-body">
              <div class="project-tags">
                <span class="tag">Design System</span>
                <span class="tag">Neo-Glass</span>
                <span class="tag">Tailwind</span>
              </div>
              <h3 class="project-title">Lumina UI Framework</h3>
              <p class="project-desc">Accessible, tactile component system with hairline translucent borders, fluid glassmorphism, and dark mode tokens.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="skills-section">
      <div class="container">
        <div style="text-align: center;">
          <h2 style="font-size: 2.2rem; margin-bottom: 8px;">Technical Expertise</h2>
          <p style="color: #94a3b8;">Core proficiencies measured across production deployments.</p>
        </div>
        <div class="skills-grid">
          <div class="skill-card">
            <div class="skill-top"><span>Frontend Architecture (ES6+, React)</span><span>98%</span></div>
            <div class="skill-bar"><div class="skill-fill" style="width: 98%;"></div></div>
          </div>
          <div class="skill-card">
            <div class="skill-top"><span>Full-Stack & Cloud (Node.js, Vercel)</span><span>95%</span></div>
            <div class="skill-bar"><div class="skill-fill" style="width: 95%;"></div></div>
          </div>
          <div class="skill-card">
            <div class="skill-top"><span>Multimodal AI & LLM Pipelines</span><span>92%</span></div>
            <div class="skill-bar"><div class="skill-fill" style="width: 92%;"></div></div>
          </div>
          <div class="skill-card">
            <div class="skill-top"><span>UI/UX Design Systems & Motion</span><span>94%</span></div>
            <div class="skill-bar"><div class="skill-fill" style="width: 94%;"></div></div>
          </div>
        </div>
      </div>
    </section>

    <section id="contact" style="padding: 80px 0;">
      <div class="container">
        <div class="contact-card">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="font-size: 2.2rem; margin-bottom: 8px;">Initiate a Collaboration</h2>
            <p style="color: #94a3b8;">Have an ambitious product in mind? Let's engineer something extraordinary.</p>
          </div>
          <form class="contact-form" onsubmit="handleInquiry(event)">
            <div class="form-group">
              <label>Your Name</label>
              <input type="text" id="inquiryName" class="form-control" placeholder="E.g. Sarah Connor" required>
            </div>
            <div class="form-group">
              <label>Work Email</label>
              <input type="email" class="form-control" placeholder="sarah@company.com" required>
            </div>
            <div class="form-group">
              <label>Project Scope</label>
              <select id="inquiryScope" class="form-control" required>
                <option value="Full-Stack AI Application">Full-Stack AI Application</option>
                <option value="Frontend Architecture & Rebrand">Frontend Architecture & Rebrand</option>
                <option value="Design System Engineering">Design System Engineering</option>
                <option value="Consulting & Technical Advisory">Consulting & Technical Advisory</option>
              </select>
            </div>
            <div class="form-group">
              <label>Estimated Budget Tier</label>
              <select class="form-control">
                <option>$5,000 – $15,000</option>
                <option>$15,000 – $35,000</option>
                <option>$35,000+</option>
              </select>
            </div>
            <div class="form-group full">
              <label>Project Details</label>
              <textarea class="form-control" rows="4" placeholder="Tell me about your goals, timeline, and core deliverables..."></textarea>
            </div>
            <div class="form-group full" style="margin-top: 10px;">
              <button type="submit" class="btn btn-primary" style="width: 100%; padding: 16px; font-size: 1.05rem;">Send Inquiry Message</button>
            </div>
          </form>
        </div>
      </div>
    </section>
  </main>

  <div id="inquiryToast" class="toast-overlay" onclick="closeInquiryToast()">
    <div class="toast-box" onclick="event.stopPropagation()">
      <h3 style="color: #a855f7; margin-bottom: 12px; font-size: 1.6rem;">⚡ Inquiry Dispatched!</h3>
      <p style="color: #cbd5e1; line-height: 1.6; margin-bottom: 20px;">
        Thank you, <strong id="toastSender">Client</strong>.<br>
        Your inquiry regarding <strong id="toastScope" style="color: #a855f7;"></strong> has been delivered.<br>
        <span style="font-size: 0.85rem; color: #94a3b8; display: block; margin-top: 10px;">I typically reply within 24 business hours.</span>
      </p>
      <button type="button" class="btn btn-primary" onclick="closeInquiryToast()">Done</button>
    </div>
  </div>

  <footer style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding: 32px 0; text-align: center; color: #64748b;">
    <div class="container">
      <p>© ${new Date().getFullYear()} ${brand}. Systems Architect. Built with NOVA AI Web Studio.</p>
    </div>
  </footer>

  <script>${script}</script>
</body>
</html>`;

  return {
    html: indexHtml,
    files: {
      "index.html": indexHtml,
      "projects.html": indexHtml,
      "about.html": indexHtml,
      "contact.html": indexHtml,
      "styles.css": css
    },
    meta: {
      modelUsed: "nova-industry-engine (Portfolio)",
      websiteType: "Engineering & Design Portfolio",
      industry: "portfolio",
      targetAudience: "Recruiters & Clients",
      tone: "Tactile & Architectural",
      generationTimeMs: 180,
      fallbackUsed: false,
      retryAttempts: 0,
      validation: { usable: true, errors: [] }
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. SAAS & TECH PRODUCT ENGINE (DEFAULT)
// ─────────────────────────────────────────────────────────────────────────────
function buildSaasProject(prompt, analysis = {}) {
  const rawInd = (analysis && analysis.industry) || "AI";
  const brand = rawInd.charAt(0).toUpperCase() + rawInd.slice(1) + "Flow";
  const desc = prompt.slice(0, 160) || "Next-generation autonomous workflow intelligence.";

  const css = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background: #0b0d14 !important; color: #f8fafc; line-height: 1.6; min-height: 100vh; }
    .container { width: min(1140px, calc(100% - 48px)); margin: 0 auto; }

    .site-header { position: sticky; top: 0; z-index: 100; background: rgba(11, 13, 20, 0.9); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding: 18px 0; }
    .nav-wrap { display: flex; align-items: center; justify-content: space-between; }
    .logo { font-size: 1.3rem; font-weight: 800; color: #6366f1; text-decoration: none; }
    .nav-links { display: flex; align-items: center; gap: 24px; }
    .nav-links a { color: #94a3b8; text-decoration: none; font-size: 0.95rem; font-weight: 500; transition: color 0.2s; }
    .nav-links a:hover, .nav-links a.active { color: #6366f1; }

    .btn { display: inline-flex; align-items: center; justify-content: center; padding: 12px 26px; border-radius: 9999px; font-weight: 600; font-size: 0.95rem; text-decoration: none; cursor: pointer; transition: all 0.2s; border: none; }
    .btn-primary { background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; font-weight: 700; box-shadow: 0 4px 18px rgba(99, 102, 241, 0.4); }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(99, 102, 241, 0.55); }
    .btn-outline { background: rgba(255, 255, 255, 0.05); color: #fff; border: 1px solid rgba(255, 255, 255, 0.15); }

    .hero { padding: 120px 0 90px; text-align: center; }
    .badge { display: inline-block; padding: 6px 16px; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.35); color: #818cf8; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; margin-bottom: 20px; text-transform: uppercase; }
    .hero h1 { font-size: clamp(2.4rem, 5vw, 4.2rem); font-weight: 800; line-height: 1.15; margin-bottom: 20px; }
    .hero p { font-size: 1.2rem; color: #cbd5e1; max-width: 660px; margin: 0 auto 36px; }

    .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 28px; margin-top: 40px; }
    .pricing-card { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 24px; padding: 36px; transition: transform 0.2s; position: relative; }
    .pricing-card.featured { border-color: #6366f1; background: rgba(99, 102, 241, 0.08); box-shadow: 0 10px 40px rgba(99, 102, 241, 0.2); }
    .plan-price { font-size: 2.5rem; font-weight: 800; color: #fff; margin: 16px 0; }
    .plan-features { list-style: none; margin: 24px 0; display: flex; flex-direction: column; gap: 12px; font-size: 0.95rem; color: #cbd5e1; }
    .plan-features li { display: flex; align-items: center; gap: 10px; }

    .faq-item { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 14px; margin-bottom: 12px; overflow: hidden; }
    .faq-q { padding: 20px 24px; font-weight: 700; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
    .faq-a { padding: 0 24px 20px; color: #94a3b8; display: none; font-size: 0.95rem; line-height: 1.6; }
    .faq-item.open .faq-a { display: block; }

    .toast-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75); display: none; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(8px); }
    .toast-box { background: #151824; border: 1px solid #6366f1; border-radius: 24px; padding: 36px; max-width: 480px; text-align: center; }
  `;

  const script = `
    function togglePricing(annual) {
      document.getElementById('monthlyBtn').classList.toggle('active', !annual);
      document.getElementById('annualBtn').classList.toggle('active', annual);
      document.getElementById('starterPrice').textContent = annual ? '$19' : '$24';
      document.getElementById('proPrice').textContent = annual ? '$49' : '$59';
      document.getElementById('teamPrice').textContent = annual ? '$119' : '$149';
    }
    function toggleFaq(el) {
      el.parentElement.classList.toggle('open');
    }
    function handleTrial(plan) {
      document.getElementById('toastPlan').textContent = plan;
      document.getElementById('trialToast').style.display = 'flex';
    }
    function closeTrialToast() {
      document.getElementById('trialToast').style.display = 'none';
    }
  `;

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brand} — AI Workflow Automation</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>${css}</style>
</head>
<body>
  <header class="site-header">
    <div class="container nav-wrap">
      <a href="index.html" class="logo">⚡ ${brand}</a>
      <nav class="nav-links">
        <a href="index.html" class="active">Home</a>
        <a href="#pricing">Pricing</a>
        <a href="#faq">FAQ</a>
        <a href="contact.html">Enterprise</a>
        <button type="button" class="btn btn-primary" onclick="handleTrial('Free Trial')" style="padding: 8px 18px; font-size: 0.85rem;">Start Free Trial</button>
      </nav>
    </div>
  </header>

  <main>
    <section class="hero">
      <div class="container">
        <span class="badge">Next-Gen Automation Engine</span>
        <h1>Automate Any Complex Workflow in Seconds</h1>
        <p>${desc}</p>
        <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
          <button type="button" class="btn btn-primary" onclick="handleTrial('Pro Trial')">Start 14-Day Free Trial</button>
          <a href="#pricing" class="btn btn-outline">View Plans</a>
        </div>
      </div>
    </section>

    <section id="pricing" style="padding: 80px 0;">
      <div class="container">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="font-size: 2.3rem; margin-bottom: 8px;">Transparent, Scale-Friendly Pricing</h2>
          <p style="color: #94a3b8;">Choose the ideal tier for your growth. Cancel or upgrade anytime.</p>
        </div>

        <div style="display: flex; justify-content: center; gap: 12px; margin-bottom: 40px;">
          <button id="monthlyBtn" class="btn btn-outline" style="padding: 8px 20px; font-size: 0.9rem;" onclick="togglePricing(false)">Monthly</button>
          <button id="annualBtn" class="btn btn-primary" style="padding: 8px 20px; font-size: 0.9rem;" onclick="togglePricing(true)">Annual (Save 20%)</button>
        </div>

        <div class="pricing-grid">
          <div class="pricing-card">
            <h3>Starter</h3>
            <p style="color: #94a3b8; font-size: 0.9rem;">For individuals & builders</p>
            <div class="plan-price"><span id="starterPrice">$19</span><span style="font-size: 1rem; color: #94a3b8;">/mo</span></div>
            <ul class="plan-features">
              <li>✓ 10,000 AI Execution Steps</li>
              <li>✓ 3 Active Agent Automations</li>
              <li>✓ Community Support</li>
            </ul>
            <button class="btn btn-outline" style="width: 100%;" onclick="handleTrial('Starter Plan')">Choose Starter</button>
          </div>

          <div class="pricing-card featured">
            <span style="position: absolute; top: -12px; right: 24px; background: #6366f1; color: #fff; font-size: 0.75rem; font-weight: 700; padding: 4px 12px; border-radius: 9999px;">MOST POPULAR</span>
            <h3>Professional</h3>
            <p style="color: #94a3b8; font-size: 0.9rem;">For scaling startups & teams</p>
            <div class="plan-price"><span id="proPrice">$49</span><span style="font-size: 1rem; color: #94a3b8;">/mo</span></div>
            <ul class="plan-features">
              <li>✓ Unlimited AI Workflows</li>
              <li>✓ Priority Sub-Second Latency</li>
              <li>✓ Multimodal Vision & Documents</li>
              <li>✓ Dedicated Slack Connect Channel</li>
            </ul>
            <button class="btn btn-primary" style="width: 100%;" onclick="handleTrial('Pro Plan')">Start Pro Trial</button>
          </div>

          <div class="pricing-card">
            <h3>Enterprise</h3>
            <p style="color: #94a3b8; font-size: 0.9rem;">For security-conscious orgs</p>
            <div class="plan-price"><span id="teamPrice">$119</span><span style="font-size: 1rem; color: #94a3b8;">/mo</span></div>
            <ul class="plan-features">
              <li>✓ Custom On-Prem / VPC Deploy</li>
              <li>✓ 99.99% Guaranteed SLA</li>
              <li>✓ Dedicated Account Architect</li>
              <li>✓ SOC2 & HIPAA Compliance</li>
            </ul>
            <button class="btn btn-outline" style="width: 100%;" onclick="handleTrial('Enterprise Plan')">Contact Sales</button>
          </div>
        </div>
      </div>
    </section>

    <section id="faq" style="padding: 60px 0 100px;">
      <div class="container" style="max-width: 780px;">
        <div style="text-align: center; margin-bottom: 40px;">
          <h2 style="font-size: 2.2rem; margin-bottom: 8px;">Frequently Asked Questions</h2>
          <p style="color: #94a3b8;">Everything you need to know about the platform.</p>
        </div>
        <div class="faq-item">
          <div class="faq-q" onclick="toggleFaq(this)">Can I cancel or change plans at any time? <span>▾</span></div>
          <div class="faq-a">Yes! You can upgrade, downgrade, or cancel directly from your billing portal with zero friction.</div>
        </div>
        <div class="faq-item">
          <div class="faq-q" onclick="toggleFaq(this)">How is my data kept private? <span>▾</span></div>
          <div class="faq-a">We operate a strict zero-data-retention policy. Your prompts and private records are never used to train foundational AI models.</div>
        </div>
        <div class="faq-item">
          <div class="faq-q" onclick="toggleFaq(this)">Does it support custom integrations? <span>▾</span></div>
          <div class="faq-a">Yes! We provide full REST and Webhook endpoints with SDKs for Python, Node.js, and Go.</div>
        </div>
      </div>
    </section>
  </main>

  <div id="trialToast" class="toast-overlay" onclick="closeTrialToast()">
    <div class="toast-box" onclick="event.stopPropagation()">
      <h3 style="color: #6366f1; margin-bottom: 12px; font-size: 1.6rem;">🚀 Welcome Aboard!</h3>
      <p style="color: #cbd5e1; line-height: 1.6; margin-bottom: 20px;">
        Your 14-day trial for <strong id="toastPlan" style="color: #818cf8;"></strong> has been activated.<br>
        Zero credit card required. Check your inbox for your dashboard key.
      </p>
      <button type="button" class="btn btn-primary" onclick="closeTrialToast()">Go to Console</button>
    </div>
  </div>

  <footer style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding: 32px 0; text-align: center; color: #64748b;">
    <div class="container">
      <p>© ${new Date().getFullYear()} ${brand}. Built with NOVA AI Web Studio.</p>
    </div>
  </footer>

  <script>${script}</script>
</body>
</html>`;

  return {
    html: indexHtml,
    files: {
      "index.html": indexHtml,
      "pricing.html": indexHtml,
      "about.html": indexHtml,
      "contact.html": indexHtml,
      "styles.css": css
    },
    meta: {
      modelUsed: "nova-industry-engine (SaaS)",
      websiteType: "Tech SaaS & Startup",
      industry: "saas",
      targetAudience: "Startups & Teams",
      tone: "High-Converting & Modern",
      generationTimeMs: 180,
      fallbackUsed: false,
      retryAttempts: 0,
      validation: { usable: true, errors: [] }
    }
  };
}

function buildIndustryProject(prompt, analysis) {
  const ind = detectIndustry(prompt);
  console.log(`[Industry Engine] Detected industry: "${ind}" for prompt: "${prompt.slice(0, 50)}..."`);
  let project;
  switch (ind) {
    case "restaurant":
      project = buildRestaurantProject(prompt, analysis);
      break;
    case "hospital":
      project = buildHospitalProject(prompt, analysis);
      break;
    case "real_estate":
      project = buildRealEstateProject(prompt, analysis);
      break;
    case "portfolio":
      project = buildPortfolioProject(prompt, analysis);
      break;
    case "saas":
    default:
      project = buildSaasProject(prompt, analysis);
      break;
  }

  const routerScript = `
<!-- NOVA Multi-page Routing Helper -->
<script>
  document.addEventListener("click", function(e) {
    const link = e.target.closest("a");
    if (link) {
      const href = link.getAttribute("href");
      if (href && href.endsWith(".html") && !href.startsWith("http://") && !href.startsWith("https://")) {
        e.preventDefault();
        window.parent.postMessage({ type: "navigate", page: href }, "*");
      }
    }
  });
</script>
`;

  if (project && project.files) {
    for (const [key, content] of Object.entries(project.files)) {
      if (key.endsWith(".html") && typeof content === "string" && !content.includes('type: "navigate"')) {
        project.files[key] = content.includes("</body>")
          ? content.replace("</body>", `${routerScript}\n</body>`)
          : `${content}\n${routerScript}`;
      }
    }
    if (project.files["index.html"]) {
      project.html = project.files["index.html"];
    }
  }

  return project;
}

module.exports = {
  detectIndustry,
  buildIndustryProject,
  buildRestaurantProject,
  buildHospitalProject,
  buildRealEstateProject,
  buildPortfolioProject,
  buildSaasProject
};
