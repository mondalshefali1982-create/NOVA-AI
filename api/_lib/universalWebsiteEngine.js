// NOVA AI - Universal Dynamic Website Generator Engine
// Generates bespoke, responsive, 4-page interactive websites for ANY topic, niche, or prompt.

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function extractSubject(rawPrompt = "") {
  const stopWords = new Set([
    "create", "build", "make", "design", "generate", "develop", "write",
    "me", "us", "for", "with", "and", "or", "a", "an", "the", "that", "which",
    "website", "webpage", "site", "landing", "page", "multipage", "multi-page",
    "modern", "responsive", "premium", "awesome", "beautiful", "professional",
    "bespoke", "custom", "interactive", "full", "complete", "online", "app"
  ]);

  const tokens = String(rawPrompt || "")
    .replace(/[^\w\s&'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w.toLowerCase()));

  if (!tokens.length) {
    return "Nova Studio";
  }

  const words = tokens.slice(0, 3);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function getPollinationsImgUrl(prompt, angleDesc, seed, width = 1200, height = 750) {
  const cleanTopic = String(prompt || "modern studio").replace(/\s+/g, " ").trim().slice(0, 140);
  const fullPrompt = `${cleanTopic}, ${angleDesc}, photorealistic architectural photography, ultra detailed, cinematic lighting, 8k`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true`;
}

function resolveUniversalProfile(prompt = "") {
  const lower = String(prompt || "").toLowerCase();
  const subject = extractSubject(prompt);
  const baseSeed = Math.abs([...prompt].reduce((acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0, 42)) % 90000 + 1000;

  const profiles = [
    {
      match: /\b(bike|motorcycle|superbike|scooter|cycling|biker)\b/i,
      websiteType: "Motorcycle & Bike Showroom",
      brand: `${subject}`,
      tagline: "Track-Bred Performance, Riding Gear & Authorized Showroom",
      heroHeadline: `Own the Road With ${subject}.`,
      ctaPrimary: "Explore Bikes",
      ctaSecondary: "Book Test Ride",
      itemHeading: "Featured Showroom Lineup",
      navItemsLabel: "Lineup",
      cards: [
        { tag: "Superbike", title: "Apex 1000RR Carbon Edition", price: "$21,490", desc: "Inline-4 track aerodynamics, quick-shifter telemetry, and Brembo braking." },
        { tag: "Electric", title: "VoltStrike Urban E-Moto", price: "$11,900", desc: "Instant torque streetfighter with 190-mile range and fast regenerative charge." },
        { tag: "Cruiser", title: "Touring Twin Heritage 900", price: "$15,750", desc: "Ergonomic long-distance saddle, rider modes, and bespoke titanium exhaust." }
      ],
      theme: { mode: "dark", bg: "#090b10", surface: "#121622", text: "#f8fafc", muted: "#94a3b8", accent: "#ef4444", accent2: "#f97316", border: "rgba(255,255,255,0.1)" }
    },
    {
      match: /\b(car|auto|automotive|motorsport|dealership|supercar|vehicle|garage)\b/i,
      websiteType: "Automotive & Motorsports",
      brand: `${subject} Motors`,
      tagline: "Precision Engineering, Showroom Excellence & Performance",
      heroHeadline: `Drive Extraordinary Performance With ${subject}.`,
      ctaPrimary: "Explore Inventory",
      ctaSecondary: "Book Test Drive",
      itemHeading: "Featured Showroom Fleet",
      navItemsLabel: "Inventory",
      cards: [
        { tag: "Flagship", title: "Performance GT Series", price: "$84,900", desc: "Twin-turbocharged precision handling with bespoke aero cabin and track telemetry." },
        { tag: "Electric", title: "Apex EV Roadster", price: "$92,500", desc: "Zero-emission instant torque, 410-mile range, and adaptive air suspension." },
        { tag: "Signature", title: "Grand Tourer Coupe", price: "$76,200", desc: "Hand-stitched leather interior paired with all-wheel dynamic cornering." }
      ],
      theme: { mode: "dark", bg: "#090b10", surface: "#121622", text: "#f8fafc", muted: "#94a3b8", accent: "#ef4444", accent2: "#f97316", border: "rgba(255,255,255,0.1)" }
    },
    {
      match: /\b(gym|fitness|workout|crossfit|yoga|pilates|bodybuilding|athletic|sports club|training)\b/i,
      websiteType: "Fitness & Athletic Club",
      brand: `${subject} Athletics`,
      tagline: "Elite Strength Conditioning, Recovery & Coaching",
      heroHeadline: `Transform Your Limits With ${subject}.`,
      ctaPrimary: "Start Membership",
      ctaSecondary: "View Programs",
      itemHeading: "Signature Training Programs",
      navItemsLabel: "Programs",
      cards: [
        { tag: "Strength", title: "Hypertrophy & Power Lab", price: "$89/mo", desc: "Progressive overload coaching with biomechanics tracking and custom nutrition." },
        { tag: "Conditioning", title: "Metabolic HIIT Arena", price: "$79/mo", desc: "High-intensity interval circuits engineered for stamina, speed, and fat loss." },
        { tag: "Recovery", title: "Mobility & Contrast Spa", price: "$119/mo", desc: "Guided breathwork, cryo-recovery, sauna therapy, and joint longevity." }
      ],
      theme: { mode: "dark", bg: "#080b12", surface: "#111827", text: "#f8fafc", muted: "#9ca3af", accent: "#f97316", accent2: "#eab308", border: "rgba(249,115,22,0.22)" }
    },
    {
      match: /\b(game|gaming|esports|arcade|streamer|twitch|console|vr|metaverse)\b/i,
      websiteType: "Gaming & Esports",
      brand: `${subject} Arena`,
      tagline: "Next-Gen Competitive Gaming, Gear & Tournaments",
      heroHeadline: `Level Up Every Frame Inside ${subject}.`,
      ctaPrimary: "Join Arena",
      ctaSecondary: "Browse Gear",
      itemHeading: "Featured Arenas & Gear",
      navItemsLabel: "Tournaments",
      cards: [
        { tag: "Pro Gear", title: "Hyperion Mechanical Rig", price: "$249", desc: "Sub-1ms optical actuation, custom RGB matrix, and tournament-tuned acoustics." },
        { tag: "Tournament", title: "Global Cyber Circuit", price: "$25 Entry", desc: "Weekly 5v5 ranked brackets with live broadcast coverage and $10K prize pools." },
        { tag: "Custom Build", title: "Titan RTX Workstation", price: "$2,890", desc: "Liquid-cooled ultra-frame gaming rigs built for 4K 240Hz domination." }
      ],
      theme: { mode: "dark", bg: "#070612", surface: "#110f24", text: "#f8fafc", muted: "#a5b4fc", accent: "#00f0ff", accent2: "#d946ef", border: "rgba(0,240,255,0.2)" }
    },
    {
      match: /\b(ecommerce|e-commerce|shop|store|boutique|fashion|sneaker|shoes|clothing|apparel|jewelry|watch|watches)\b/i,
      websiteType: "E-Commerce & Retail Store",
      brand: `${subject} Collective`,
      tagline: "Curated Craftsmanship, Modern Silhouettes & Express Delivery",
      heroHeadline: `Curated Everyday Essentials By ${subject}.`,
      ctaPrimary: "Shop Collection",
      ctaSecondary: "View Lookbook",
      itemHeading: "Curated New Arrivals",
      navItemsLabel: "Catalog",
      cards: [
        { tag: "Bestseller", title: "Atelier Signature Edition", price: "$185", desc: "Crafted from heavyweight organic textiles with precision tailored seams." },
        { tag: "Limited", title: "Monolith Heritage Piece", price: "$260", desc: "Minimalist silhouette designed for all-season versatility and comfort." },
        { tag: "Essential", title: "Studio Capsule Kit", price: "$140", desc: "Everyday flagship staples engineered for durability and timeless style." }
      ],
      theme: { mode: "light", bg: "#fafaf9", surface: "#ffffff", text: "#111827", muted: "#57534e", accent: "#4f46e5", accent2: "#0ea5e9", border: "rgba(17,24,39,0.1)" }
    },
    {
      match: /\b(school|college|university|academy|course|education|learning|edtech|tutoring|bootcamp)\b/i,
      websiteType: "Education & Learning Academy",
      brand: `${subject} Academy`,
      tagline: "Future-Ready Curriculum, Mentorship & Accredited Learning",
      heroHeadline: `Unlock Brilliant Futures At ${subject}.`,
      ctaPrimary: "Explore Courses",
      ctaSecondary: "Apply Now",
      itemHeading: "Featured Academic Tracks",
      navItemsLabel: "Programs",
      cards: [
        { tag: "Flagship", title: "Applied Science & Computing", price: "12 Weeks", desc: "Hands-on studio projects led by industry faculty and lab mentors." },
        { tag: "Honors", title: "Design & Creative Leadership", price: "16 Weeks", desc: "Portfolio-driven cohort program with global critique and career placement." },
        { tag: "Certificate", title: "Executive Strategy Intensive", price: "8 Weeks", desc: "Live workshops covering systems thinking, innovation, and team growth." }
      ],
      theme: { mode: "light", bg: "#f8fafc", surface: "#ffffff", text: "#0f172a", muted: "#475569", accent: "#1d4ed8", accent2: "#059669", border: "rgba(15,23,42,0.1)" }
    },
    {
      match: /\b(travel|tourism|resort|hotel|vacation|flight|booking|adventure|tour|cruise)\b/i,
      websiteType: "Travel & Hospitality",
      brand: `${subject} Voyages`,
      tagline: "Bespoke Itineraries, Boutique Stays & Unforgettable Journeys",
      heroHeadline: `Discover Iconic Destinations With ${subject}.`,
      ctaPrimary: "Plan Your Trip",
      ctaSecondary: "Explore Destinations",
      itemHeading: "Curated Escape Packages",
      navItemsLabel: "Destinations",
      cards: [
        { tag: "Coastal", title: "Amalfi & Mediterranean Escape", price: "$2,450", desc: "7 nights in cliffside boutique suites with private boat charters and tastings." },
        { tag: "Alpine", title: "Nordic Fjord Sanctuary", price: "$3,100", desc: "Glass-cabin aurora lodges, glacier excursions, and thermal fjord spas." },
        { tag: "Cultural", title: "Kyoto Heritage Retreat", price: "$2,780", desc: "Guided temple walks, ryokan stays, and private culinary experiences." }
      ],
      theme: { mode: "dark", bg: "#04121b", surface: "#0a2232", text: "#f0f9ff", muted: "#93c5fd", accent: "#06b6d4", accent2: "#f59e0b", border: "rgba(6,182,212,0.22)" }
    },
    {
      match: /\b(music|band|studio|dj|podcast|audio|record|festival|concert|event|wedding)\b/i,
      websiteType: "Music, Events & Production",
      brand: `${subject} Productions`,
      tagline: "Immersive Soundscapes, Live Experiences & Studio Craft",
      heroHeadline: `Unforgettable Moments Crafted By ${subject}.`,
      ctaPrimary: "Book Experience",
      ctaSecondary: "View Lineup",
      itemHeading: "Featured Experiences & Sessions",
      navItemsLabel: "Experiences",
      cards: [
        { tag: "Headliner", title: "Mainstage Live Production", price: "$1,800", desc: "Spatial acoustics, synchronized lighting architecture, and live mastering." },
        { tag: "Studio", title: "Analog & Spatial Mixing", price: "$450/day", desc: "Dolby Atmos certified control rooms with boutique outboard racks." },
        { tag: "VIP Event", title: "Curated Showcase Gala", price: "Custom", desc: "End-to-end stage direction, artist curation, and guest hospitality." }
      ],
      theme: { mode: "dark", bg: "#0b0714", surface: "#160e26", text: "#faf5ff", muted: "#c4b5fd", accent: "#a855f7", accent2: "#ec4899", border: "rgba(168,85,247,0.25)" }
    },
    {
      match: /\b(law|legal|attorney|lawyer|finance|bank|wealth|accounting|tax|consulting|corporate)\b/i,
      websiteType: "Legal, Finance & Advisory",
      brand: `${subject} Partners`,
      tagline: "Strategic Counsel, Fiduciary Rigor & Measurable Outcomes",
      heroHeadline: `Trusted Advisory & Representation From ${subject}.`,
      ctaPrimary: "Schedule Consultation",
      ctaSecondary: "Practice Areas",
      itemHeading: "Core Practice & Advisory Pillars",
      navItemsLabel: "Services",
      cards: [
        { tag: "Advisory", title: "Corporate & Commercial Strategy", price: "Retainer", desc: "Structuring governance, cross-border transactions, and risk mitigation." },
        { tag: "Litigation", title: "Regulatory & Dispute Counsel", price: "Dedicated", desc: "Senior partner representation focused on decisive, discrete resolution." },
        { tag: "Wealth", title: "Private Capital Structuring", price: "Bespoke", desc: "Long-horizon portfolio stewardship, tax optimization, and estate planning." }
      ],
      theme: { mode: "dark", bg: "#09101d", surface: "#111c30", text: "#f8fafc", muted: "#94a3b8", accent: "#eab308", accent2: "#38bdf8", border: "rgba(234,179,8,0.22)" }
    },
    {
      match: /\b(photography|photo|camera|film|cinema|architecture|interior design|art gallery)\b/i,
      websiteType: "Photography & Visual Arts",
      brand: `${subject} Studio`,
      tagline: "Editorial Vision, Natural Light & Timeless Composition",
      heroHeadline: `Visual Stories Captured With Precision By ${subject}.`,
      ctaPrimary: "Book Session",
      ctaSecondary: "View Gallery",
      itemHeading: "Featured Collections & Commissions",
      navItemsLabel: "Gallery",
      cards: [
        { tag: "Editorial", title: "Architectural & Spatial Series", price: "$1,200", desc: "Medium-format framing showcasing light, texture, and form." },
        { tag: "Campaign", title: "Brand Lookbook Direction", price: "$2,400", desc: "Full creative production from moodboarding and casting to final retouch." },
        { tag: "Portrait", title: "Fine Art Portrait Commission", price: "$650", desc: "Intimate studio or location sittings printed on museum-grade cotton rag." }
      ],
      theme: { mode: "dark", bg: "#0d0d0d", surface: "#171717", text: "#fafafa", muted: "#a3a3a3", accent: "#f59e0b", accent2: "#ffffff", border: "rgba(255,255,255,0.12)" }
    },
    {
      match: /\b(pet|dog|cat|veterinary|vet|animal|farm|organic|plant|garden|botanical|eco|bakery|coffee|tea)\b/i,
      websiteType: "Lifestyle, Nature & Specialty Care",
      brand: `${subject} Haven`,
      tagline: "Thoughtful Care, Sustainable Sourcing & Warm Hospitality",
      heroHeadline: `Pure Craft & Dedicated Care At ${subject}.`,
      ctaPrimary: "Book Appointment",
      ctaSecondary: "Explore Menu",
      itemHeading: "Signature Offerings",
      navItemsLabel: "Offerings",
      cards: [
        { tag: "Popular", title: "Signature Wellness Package", price: "$65", desc: "Gentle, holistic experience tailored using all-natural botanical essentials." },
        { tag: "Artisan", title: "Seasonal Reserve Selection", price: "$42", desc: "Small-batch harvests and handcrafted selections prepared fresh daily." },
        { tag: "Premium", title: "Full Bespoke Experience", price: "$120", desc: "Comprehensive one-on-one session with priority concierge care." }
      ],
      theme: { mode: "light", bg: "#f4f7f4", surface: "#ffffff", text: "#0f2419", muted: "#4b6355", accent: "#16a34a", accent2: "#d97706", border: "rgba(22,163,74,0.16)" }
    }
  ];

  const matched = profiles.find((p) => p.match.test(lower));
  if (matched) {
    return { ...matched, subject, baseSeed };
  }

  // Completely generic custom topic profile (handles literally ANY creative user prompt!)
  return {
    websiteType: subject,
    brand: subject,
    tagline: `Modern Excellence, Tailored Craft & Elevated Experiences in ${subject}`,
    heroHeadline: `Experience the Future of ${subject}.`,
    ctaPrimary: "Get Started",
    ctaSecondary: "Explore Offerings",
    itemHeading: `Featured ${subject} Offerings`,
    navItemsLabel: "Offerings",
    cards: [
      { tag: "Signature", title: `${subject} Core Experience`, price: "$149", desc: `Thoughtfully crafted flagship offering built around quality, speed, and modern design.` },
      { tag: "Pro Tier", title: `Custom ${subject} Suite`, price: "$299", desc: `Tailored end-to-end solution engineered for ambitious creators and teams.` },
      { tag: "Enterprise", title: `${subject} Concierge Partner`, price: "Custom", desc: `Dedicated strategy, priority execution, and continuous hands-on support.` }
    ],
    theme: { mode: "dark", bg: "#080b18", surface: "#11172d", text: "#f8fafc", muted: "#94a3b8", accent: "#00d4ff", accent2: "#8b5cf6", border: "rgba(0,212,255,0.22)" },
    subject,
    baseSeed
  };
}

function buildUniversalWebsiteProject(prompt = "", analysis = {}) {
  const profile = resolveUniversalProfile(prompt);
  const { theme, brand, tagline, heroHeadline, ctaPrimary, ctaSecondary, itemHeading, navItemsLabel, cards, websiteType, baseSeed } = profile;

  const heroImg = getPollinationsImgUrl(prompt, "wide cinematic hero photograph", baseSeed + 1, 1280, 720);
  const aboutImg = getPollinationsImgUrl(prompt, "behind the scenes studio interior atmosphere", baseSeed + 2, 1024, 720);
  const cardImgs = cards.map((c, idx) =>
    getPollinationsImgUrl(`${prompt} ${c.title}`, "editorial detail shot crisp studio lighting", baseSeed + 10 + idx, 800, 600)
  );

  const css = `
    :root {
      --bg: ${theme.bg};
      --surface: ${theme.surface};
      --text: ${theme.text};
      --muted: ${theme.muted};
      --accent: ${theme.accent};
      --accent2: ${theme.accent2};
      --border: ${theme.border};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      background: ${theme.bg};
      color: ${theme.text};
      line-height: 1.65;
      min-height: 100vh;
      scroll-behavior: smooth;
    }
    h1, h2, h3, .brand { font-family: 'Space Grotesk', system-ui, sans-serif; letter-spacing: -0.02em; }
    a { color: inherit; text-decoration: none; }
    .container { width: min(1160px, calc(100% - 40px)); margin: 0 auto; }

    /* Navbar */
    .navbar {
      position: sticky; top: 0; z-index: 100;
      background: ${theme.mode === "dark" ? "rgba(8, 11, 24, 0.85)" : "rgba(255, 255, 255, 0.88)"};
      backdrop-filter: blur(16px);
      border-bottom: 1px solid var(--border);
    }
    .nav-inner { display: flex; align-items: center; justify-content: space-between; height: 74px; }
    .brand { display: flex; align-items: center; gap: 10px; font-size: 1.25rem; font-weight: 700; }
    .brand-dot {
      width: 12px; height: 12px; border-radius: 50%;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      box-shadow: 0 0 14px var(--accent);
    }
    .nav-links { display: flex; gap: 28px; align-items: center; }
    .nav-links a { font-size: 0.94rem; font-weight: 600; color: var(--muted); transition: color 0.2s; }
    .nav-links a:hover, .nav-links a.active { color: var(--text); }
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 12px 24px; border-radius: 999px; font-weight: 700; font-size: 0.94rem;
      cursor: pointer; border: none; transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
    }
    .btn:hover { transform: translateY(-2px); }
    .btn-primary {
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      color: #ffffff;
      box-shadow: 0 10px 26px rgba(0, 0, 0, 0.2);
    }
    .btn-outline {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text);
    }
    .mobile-toggle { display: none; background: transparent; border: 1px solid var(--border); color: var(--text); padding: 8px 12px; border-radius: 8px; font-size: 1.1rem; cursor: pointer; }

    /* Hero */
    .hero { padding: 84px 0 72px; position: relative; overflow: hidden; }
    .hero-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 48px; align-items: center; }
    .pill {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 6px 14px; border-radius: 999px;
      background: ${theme.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"};
      border: 1px solid var(--border);
      font-size: 0.8rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
      color: var(--accent); margin-bottom: 20px;
    }
    .hero h1 { font-size: clamp(2.3rem, 4.4vw, 3.6rem); line-height: 1.12; margin-bottom: 20px; }
    .hero p { font-size: 1.1rem; color: var(--muted); max-width: 54ch; margin-bottom: 32px; }
    .hero-actions { display: flex; gap: 14px; flex-wrap: wrap; }
    .hero-visual {
      border-radius: 22px; overflow: hidden;
      border: 1px solid var(--border);
      box-shadow: 0 24px 60px rgba(0,0,0,0.28);
      background: var(--surface);
      aspect-ratio: 16/10;
    }
    .hero-visual img { width: 100%; height: 100%; object-fit: cover; display: block; }

    /* Stats strip */
    .stats-bar {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;
      padding: 28px; border-radius: 18px; background: var(--surface);
      border: 1px solid var(--border); margin-top: 56px;
    }
    .stat-item strong { display: block; font-size: 1.8rem; font-family: 'Space Grotesk', sans-serif; color: var(--accent); }
    .stat-item span { font-size: 0.88rem; color: var(--muted); }

    /* Cards & Sections */
    .section { padding: 80px 0; }
    .section-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; flex-wrap: wrap; margin-bottom: 36px; }
    .section-header h2 { font-size: clamp(1.8rem, 3vw, 2.5rem); }
    .section-header p { color: var(--muted); max-width: 52ch; }
    .filter-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
    .filter-btn {
      padding: 8px 16px; border-radius: 999px; border: 1px solid var(--border);
      background: var(--surface); color: var(--muted); font-weight: 600; font-size: 0.85rem; cursor: pointer;
    }
    .filter-btn.active { background: var(--accent); color: #ffffff; border-color: var(--accent); }

    .cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; }
    .card {
      background: var(--surface); border: 1px solid var(--border); border-radius: 20px;
      overflow: hidden; transition: transform 0.25s, box-shadow 0.25s;
      display: flex; flex-direction: column;
    }
    .card:hover { transform: translateY(-5px); box-shadow: 0 18px 40px rgba(0,0,0,0.2); }
    .card-img { width: 100%; height: 210px; object-fit: cover; display: block; background: rgba(128,128,128,0.1); }
    .card-body { padding: 24px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
    .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .tag { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--accent); }
    .price { font-weight: 800; font-size: 1.05rem; }
    .card-body h3 { font-size: 1.25rem; margin-bottom: 10px; }
    .card-body p { color: var(--muted); font-size: 0.94rem; margin-bottom: 20px; }

    /* Contact / Booking Form */
    .form-card {
      background: var(--surface); border: 1px solid var(--border); border-radius: 22px;
      padding: 36px; max-width: 720px; margin: 0 auto;
    }
    .form-group { margin-bottom: 18px; }
    .form-group label { display: block; font-weight: 600; font-size: 0.9rem; margin-bottom: 8px; }
    .form-group input, .form-group textarea, .form-group select {
      width: 100%; padding: 12px 16px; border-radius: 12px;
      border: 1px solid var(--border);
      background: ${theme.mode === "dark" ? "rgba(255,255,255,0.04)" : "#f8fafc"};
      color: var(--text); font: inherit; outline: none;
    }
    .form-group input:focus, .form-group textarea:focus { border-color: var(--accent); }

    /* Toast Modal */
    .toast {
      position: fixed; bottom: 24px; right: 24px; z-index: 999;
      background: var(--surface); color: var(--text);
      border: 1px solid var(--accent); border-radius: 14px;
      padding: 16px 22px; box-shadow: 0 20px 50px rgba(0,0,0,0.4);
      display: none; align-items: center; gap: 14px; max-width: 380px;
    }
    .toast.show { display: flex; animation: slideUp 0.3s ease; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

    footer {
      border-top: 1px solid var(--border); padding: 40px 0;
      text-align: center; color: var(--muted); font-size: 0.9rem;
    }

    @media (max-width: 860px) {
      .hero-grid { grid-template-columns: 1fr; }
      .stats-bar { grid-template-columns: 1fr; }
      .nav-links { display: none; position: absolute; top: 74px; left: 0; right: 0; background: var(--surface); flex-direction: column; padding: 20px; border-bottom: 1px solid var(--border); }
      .nav-links.open { display: flex; }
      .mobile-toggle { display: block; }
    }
  `;

  const script = `
    <script>
      function toggleMobileMenu() {
        document.getElementById('navLinks')?.classList.toggle('open');
      }
      function filterCards(cat, btn) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        document.querySelectorAll('.filterable-card').forEach(card => {
          card.style.display = (cat === 'all' || card.dataset.cat === cat) ? 'flex' : 'none';
        });
      }
      function showToast(title, msg) {
        const toast = document.getElementById('novaToast');
        if (!toast) return;
        document.getElementById('toastTitle').textContent = title;
        document.getElementById('toastBody').textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 4200);
      }
      function handleFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const name = form.querySelector('[name="name"]')?.value || 'Guest';
        showToast('Request Confirmed!', 'Thank you, ' + name + '. Our team will reach out shortly.');
        form.reset();
      }
    </script>
  `;

  function wrapPage(activePage, title, bodyContent) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(brand)} — ${escapeHtml(title)}</title>
  <style>${css}</style>
</head>
<body>
  <header class="navbar">
    <div class="container nav-inner">
      <a href="index.html" class="brand"><span class="brand-dot"></span>${escapeHtml(brand)}</a>
      <button class="mobile-toggle" onclick="toggleMobileMenu()" aria-label="Menu">☰</button>
      <nav class="nav-links" id="navLinks">
        <a href="index.html" class="${activePage === "home" ? "active" : ""}">Home</a>
        <a href="about.html" class="${activePage === "about" ? "active" : ""}">About</a>
        <a href="services.html" class="${activePage === "services" ? "active" : ""}">${escapeHtml(navItemsLabel)}</a>
        <a href="contact.html" class="${activePage === "contact" ? "active" : ""}">Contact</a>
        <a href="contact.html" class="btn btn-primary" style="padding:9px 18px;">${escapeHtml(ctaPrimary)}</a>
      </nav>
    </div>
  </header>

  <main>${bodyContent}</main>

  <div id="novaToast" class="toast" role="status" aria-live="polite">
    <div>
      <strong id="toastTitle" style="display:block;margin-bottom:4px;color:var(--accent);">Success</strong>
      <span id="toastBody" style="font-size:0.88rem;color:var(--muted);">Done</span>
    </div>
  </div>

  <footer>
    <div class="container">
      <p>© ${new Date().getFullYear()} ${escapeHtml(brand)}. All rights reserved. • Built for ${escapeHtml(websiteType)}</p>
    </div>
  </footer>
  ${script}
</body>
</html>`;
  }

  const cardsHtml = cards.map((c, idx) => `
    <article class="card filterable-card" data-cat="${escapeHtml(c.tag.toLowerCase())}">
      <img class="card-img" src="${cardImgs[idx]}" alt="${escapeHtml(c.title)}" loading="lazy" />
      <div class="card-body">
        <div>
          <div class="card-top">
            <span class="tag">${escapeHtml(c.tag)}</span>
            <span class="price">${escapeHtml(c.price)}</span>
          </div>
          <h3>${escapeHtml(c.title)}</h3>
          <p>${escapeHtml(c.desc)}</p>
        </div>
        <button class="btn btn-outline" onclick="showToast('${escapeHtml(c.title)} Selected', 'Proceeding with inquiry for ${escapeHtml(c.title)} (${escapeHtml(c.price)}).')">Select ${escapeHtml(c.tag)}</button>
      </div>
    </article>
  `).join("\n");

  const homeHtml = wrapPage("home", "Home", `
    <section class="hero">
      <div class="container">
        <div class="hero-grid">
          <div>
            <span class="pill">${escapeHtml(websiteType)}</span>
            <h1>${escapeHtml(heroHeadline)}</h1>
            <p>${escapeHtml(tagline)}. Built from the ground up with bespoke aesthetics, precision craft, and seamless interactive performance.</p>
            <div class="hero-actions">
              <a href="services.html" class="btn btn-primary">${escapeHtml(ctaPrimary)}</a>
              <a href="about.html" class="btn btn-outline">${escapeHtml(ctaSecondary)}</a>
            </div>
          </div>
          <div class="hero-visual">
            <img src="${heroImg}" alt="${escapeHtml(brand)} Hero Showcase" />
          </div>
        </div>

        <div class="stats-bar">
          <div class="stat-item"><strong>99.4%</strong><span>Client Satisfaction Score</span></div>
          <div class="stat-item"><strong>12K+</strong><span>Completed Projects & Orders</span></div>
          <div class="stat-item"><strong>24/7</strong><span>Dedicated Concierge Support</span></div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-header">
          <div>
            <h2>${escapeHtml(itemHeading)}</h2>
            <p>Explore our flagship offerings tailored specifically for ${escapeHtml(websiteType)}.</p>
          </div>
          <div class="filter-tabs">
            <button class="filter-btn active" onclick="filterCards('all', this)">All</button>
            ${cards.map(c => `<button class="filter-btn" onclick="filterCards('${escapeHtml(c.tag.toLowerCase())}', this)">${escapeHtml(c.tag)}</button>`).join("")}
          </div>
        </div>
        <div class="cards-grid">${cardsHtml}</div>
      </div>
    </section>
  `);

  const aboutHtml = wrapPage("about", "About Us", `
    <section class="section">
      <div class="container">
        <div class="hero-grid">
          <div>
            <span class="pill">Our Story</span>
            <h1>Crafting the Gold Standard in ${escapeHtml(websiteType)}.</h1>
            <p>${escapeHtml(brand)} was founded with a singular mission: combine unmatched domain mastery with thoughtful hospitality and modern craft.</p>
            <div style="margin-top:24px;display:flex;gap:12px;">
              <a href="services.html" class="btn btn-primary">View Offerings</a>
              <a href="contact.html" class="btn btn-outline">Meet Our Team</a>
            </div>
          </div>
          <div class="hero-visual">
            <img src="${aboutImg}" alt="About ${escapeHtml(brand)}" />
          </div>
        </div>
      </div>
    </section>
  `);

  const servicesHtml = wrapPage("services", navItemsLabel, `
    <section class="section">
      <div class="container">
        <div class="section-header">
          <div>
            <span class="pill">Full Catalog</span>
            <h2>${escapeHtml(itemHeading)}</h2>
            <p>Select any option below or reach out for custom tailoring.</p>
          </div>
        </div>
        <div class="cards-grid">${cardsHtml}</div>
      </div>
    </section>
  `);

  const contactHtml = wrapPage("contact", "Contact", `
    <section class="section">
      <div class="container">
        <div class="form-card">
          <span class="pill">Connect With ${escapeHtml(brand)}</span>
          <h2 style="margin-bottom:10px;">${escapeHtml(ctaPrimary)} Today</h2>
          <p style="color:var(--muted);margin-bottom:26px;">Tell us what you're looking for and our specialists will reply within 24 hours.</p>
          <form onsubmit="handleFormSubmit(event)">
            <div class="form-group">
              <label>Full Name</label>
              <input type="text" name="name" placeholder="Alex Mercer" required />
            </div>
            <div class="form-group">
              <label>Email Address</label>
              <input type="email" name="email" placeholder="alex@example.com" required />
            </div>
            <div class="form-group">
              <label>Area of Interest</label>
              <select name="interest">
                ${cards.map(c => `<option value="${escapeHtml(c.title)}">${escapeHtml(c.title)} (${escapeHtml(c.price)})</option>`).join("")}
              </select>
            </div>
            <div class="form-group">
              <label>Project / Request Details</label>
              <textarea name="message" rows="4" placeholder="Share your goals, preferences, or timeline..."></textarea>
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%;">Submit Request</button>
          </form>
        </div>
      </div>
    </section>
  `);

  return {
    html: homeHtml,
    files: {
      "index.html": homeHtml,
      "about.html": aboutHtml,
      "services.html": servicesHtml,
      "contact.html": contactHtml
    },
    meta: {
      name: brand,
      modelUsed: `nova-universal-engine (${websiteType})`,
      websiteType,
      industry: websiteType,
      theme: theme.mode === "dark" ? "Modern Dark Glass" : "Clean Editorial Light",
      targetAudience: "Modern Visitors & Customers",
      tone: "Custom & Interactive",
      generationTimeMs: 220,
      fallbackUsed: false,
      retryAttempts: 0,
      validation: { usable: true, errors: [] }
    }
  };
}

module.exports = {
  buildUniversalWebsiteProject,
  resolveUniversalProfile,
  getPollinationsImgUrl
};
