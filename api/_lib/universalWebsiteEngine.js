// NOVA AI - Universal Dynamic Website Architect & Compiler
// Compiles AI Blueprint JSON (from Gemini/OpenRouter) OR dynamic local profiles
// into fast, interactive, 4-page responsive websites for ANY topic or industry.

const { classifyStockCategory, buildSyncVaultSlots } = require("./stockPhotos");

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getContrastTextColor(hex = "#00d4ff") {
  const clean = String(hex || "").replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return "#ffffff";
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.65 ? "#090b10" : "#ffffff";
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

  return tokens.slice(0, 3).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function resolveRealPhotoSlots(prompt = "", bp = {}, resolvedPhotos = null) {
  if (resolvedPhotos && resolvedPhotos.heroImg && resolvedPhotos.aboutImg && Array.isArray(resolvedPhotos.cardImgs)) {
    return resolvedPhotos;
  }
  const { category } = classifyStockCategory(prompt, bp.websiteType, bp.items);
  return buildSyncVaultSlots(category, bp.baseSeed);
}

function resolveUniversalProfile(prompt = "") {
  const lower = String(prompt || "").toLowerCase();
  const subject = extractSubject(prompt);
  const baseSeed = Math.abs([...prompt].reduce((acc, ch) => ((acc << 5) - acc + ch.charCodeAt(0)) | 0, 42)) % 90000 + 1000;

  const profiles = [
    {
      match: /\b(bike|motorcycle|superbike|scooter|cycling|biker)\b/i,
      websiteType: "Motorcycle & Bike Showroom",
      brand: subject,
      tagline: "Track-Bred Performance, Custom Builds & Authorized Dealership",
      heroHeadline: `Own the Road With ${subject}.`,
      ctaPrimary: "Explore Bikes",
      ctaSecondary: "Book Test Ride",
      itemsHeading: "Featured Showroom Lineup",
      navServicesLabel: "Lineup",
      cards: [
        { tag: "Superbike", title: "Apex 1000RR Carbon Edition", price: "$21,490", desc: "Inline-4 track aerodynamics, quick-shifter telemetry, and Brembo braking." },
        { tag: "Electric", title: "VoltStrike Urban E-Moto", price: "$11,900", desc: "Instant torque streetfighter with 190-mile range and fast regenerative charge." },
        { tag: "Cruiser", title: "Touring Twin Heritage 900", price: "$15,750", desc: "Ergonomic long-distance saddle, rider modes, and bespoke titanium exhaust." }
      ],
      theme: { mode: "dark", bg: "#090b10", surface: "#121622", text: "#f8fafc", muted: "#94a3b8", accent: "#ef4444", accent2: "#f97316" }
    },
    {
      match: /\b(car|auto|automotive|motorsport|dealership|supercar|vehicle|garage)\b/i,
      websiteType: "Automotive & Motorsports",
      brand: `${subject} Motors`,
      tagline: "Precision Engineering, Showroom Excellence & Performance",
      heroHeadline: `Drive Extraordinary Performance With ${subject}.`,
      ctaPrimary: "Explore Inventory",
      ctaSecondary: "Book Test Drive",
      itemsHeading: "Featured Showroom Fleet",
      navServicesLabel: "Inventory",
      cards: [
        { tag: "Flagship", title: "Performance GT Series", price: "$84,900", desc: "Twin-turbocharged precision handling with bespoke aero cabin and track telemetry." },
        { tag: "Electric", title: "Apex EV Roadster", price: "$92,500", desc: "Zero-emission instant torque, 410-mile range, and adaptive air suspension." },
        { tag: "Signature", title: "Grand Tourer Coupe", price: "$76,200", desc: "Hand-stitched leather interior paired with all-wheel dynamic cornering." }
      ],
      theme: { mode: "dark", bg: "#090b10", surface: "#121622", text: "#f8fafc", muted: "#94a3b8", accent: "#ef4444", accent2: "#f97316" }
    },
    {
      match: /\b(gym|fitness|workout|crossfit|yoga|pilates|bodybuilding|athletic|sports club|training)\b/i,
      websiteType: "Fitness & Athletic Club",
      brand: `${subject} Athletics`,
      tagline: "Elite Strength Conditioning, Recovery & Coaching",
      heroHeadline: `Transform Your Limits With ${subject}.`,
      ctaPrimary: "Start Membership",
      ctaSecondary: "View Programs",
      itemsHeading: "Signature Training Programs",
      navServicesLabel: "Programs",
      cards: [
        { tag: "Strength", title: "Hypertrophy & Power Lab", price: "$89/mo", desc: "Progressive overload coaching with biomechanics tracking and custom nutrition." },
        { tag: "Conditioning", title: "Metabolic HIIT Arena", price: "$79/mo", desc: "High-intensity interval circuits engineered for stamina, speed, and fat loss." },
        { tag: "Recovery", title: "Mobility & Contrast Spa", price: "$119/mo", desc: "Guided breathwork, cryo-recovery, sauna therapy, and joint longevity." }
      ],
      theme: { mode: "dark", bg: "#080b12", surface: "#111827", text: "#f8fafc", muted: "#9ca3af", accent: "#f97316", accent2: "#eab308" }
    },
    {
      match: /\b(game|gaming|esports|arcade|streamer|twitch|console|vr|metaverse)\b/i,
      websiteType: "Gaming & Esports",
      brand: `${subject} Arena`,
      tagline: "Next-Gen Competitive Gaming, Gear & Tournaments",
      heroHeadline: `Level Up Every Frame Inside ${subject}.`,
      ctaPrimary: "Join Arena",
      ctaSecondary: "Browse Gear",
      itemsHeading: "Featured Arenas & Gear",
      navServicesLabel: "Tournaments",
      cards: [
        { tag: "Pro Gear", title: "Hyperion Mechanical Rig", price: "$249", desc: "Sub-1ms optical actuation, custom RGB matrix, and tournament-tuned acoustics." },
        { tag: "Tournament", title: "Global Cyber Circuit", price: "$25 Entry", desc: "Weekly 5v5 ranked brackets with live broadcast coverage and $10K prize pools." },
        { tag: "Custom Build", title: "Titan RTX Workstation", price: "$2,890", desc: "Liquid-cooled ultra-frame gaming rigs built for 4K 240Hz domination." }
      ],
      theme: { mode: "dark", bg: "#070612", surface: "#110f24", text: "#f8fafc", muted: "#a5b4fc", accent: "#00d4ff", accent2: "#d946ef" }
    },
    {
      match: /\b(ecommerce|e-commerce|shop|store|boutique|fashion|sneaker|shoes|clothing|apparel|jewelry|watch|watches)\b/i,
      websiteType: "E-Commerce & Retail Store",
      brand: `${subject} Collective`,
      tagline: "Curated Craftsmanship, Modern Silhouettes & Express Delivery",
      heroHeadline: `Curated Everyday Essentials By ${subject}.`,
      ctaPrimary: "Shop Collection",
      ctaSecondary: "View Lookbook",
      itemsHeading: "Curated New Arrivals",
      navServicesLabel: "Catalog",
      cards: [
        { tag: "Bestseller", title: "Atelier Signature Edition", price: "$185", desc: "Crafted from heavyweight organic textiles with precision tailored seams." },
        { tag: "Limited", title: "Monolith Heritage Piece", price: "$260", desc: "Minimalist silhouette designed for all-season versatility and comfort." },
        { tag: "Essential", title: "Studio Capsule Kit", price: "$140", desc: "Everyday flagship staples engineered for durability and timeless style." }
      ],
      theme: { mode: "light", bg: "#fafaf9", surface: "#ffffff", text: "#111827", muted: "#57534e", accent: "#4f46e5", accent2: "#0ea5e9" }
    },
    {
      match: /\b(school|college|university|academy|course|education|learning|edtech|tutoring|bootcamp)\b/i,
      websiteType: "Education & Learning Academy",
      brand: `${subject} Academy`,
      tagline: "Future-Ready Curriculum, Mentorship & Accredited Learning",
      heroHeadline: `Unlock Brilliant Futures At ${subject}.`,
      ctaPrimary: "Explore Courses",
      ctaSecondary: "Apply Now",
      itemsHeading: "Featured Academic Tracks",
      navServicesLabel: "Programs",
      cards: [
        { tag: "Flagship", title: "Applied Science & Computing", price: "12 Weeks", desc: "Hands-on studio projects led by industry faculty and lab mentors." },
        { tag: "Honors", title: "Design & Creative Leadership", price: "16 Weeks", desc: "Portfolio-driven cohort program with global critique and career placement." },
        { tag: "Certificate", title: "Executive Strategy Intensive", price: "8 Weeks", desc: "Live workshops covering systems thinking, innovation, and team growth." }
      ],
      theme: { mode: "light", bg: "#f8fafc", surface: "#ffffff", text: "#0f172a", muted: "#475569", accent: "#1d4ed8", accent2: "#059669" }
    },
    {
      match: /\b(travel|tourism|resort|hotel|vacation|flight|booking|adventure|tour|cruise)\b/i,
      websiteType: "Travel & Hospitality",
      brand: `${subject} Voyages`,
      tagline: "Bespoke Itineraries, Boutique Stays & Unforgettable Journeys",
      heroHeadline: `Discover Iconic Destinations With ${subject}.`,
      ctaPrimary: "Plan Your Trip",
      ctaSecondary: "Explore Destinations",
      itemsHeading: "Curated Escape Packages",
      navServicesLabel: "Destinations",
      cards: [
        { tag: "Coastal", title: "Amalfi & Mediterranean Escape", price: "$2,450", desc: "7 nights in cliffside boutique suites with private boat charters and tastings." },
        { tag: "Alpine", title: "Nordic Fjord Sanctuary", price: "$3,100", desc: "Glass-cabin aurora lodges, glacier excursions, and thermal fjord spas." },
        { tag: "Cultural", title: "Kyoto Heritage Retreat", price: "$2,780", desc: "Guided temple walks, ryokan stays, and private culinary experiences." }
      ],
      theme: { mode: "dark", bg: "#04121b", surface: "#0a2232", text: "#f0f9ff", muted: "#93c5fd", accent: "#06b6d4", accent2: "#f59e0b" }
    },
    {
      match: /\b(music|band|studio|dj|podcast|audio|record|festival|concert|event|wedding)\b/i,
      websiteType: "Music, Events & Production",
      brand: `${subject} Productions`,
      tagline: "Immersive Soundscapes, Live Experiences & Studio Craft",
      heroHeadline: `Unforgettable Moments Crafted By ${subject}.`,
      ctaPrimary: "Book Experience",
      ctaSecondary: "View Lineup",
      itemsHeading: "Featured Experiences & Sessions",
      navServicesLabel: "Experiences",
      cards: [
        { tag: "Headliner", title: "Mainstage Live Production", price: "$1,800", desc: "Spatial acoustics, synchronized lighting architecture, and live mastering." },
        { tag: "Studio", title: "Analog & Spatial Mixing", price: "$450/day", desc: "Dolby Atmos certified control rooms with boutique outboard racks." },
        { tag: "VIP Event", title: "Curated Showcase Gala", price: "Custom", desc: "End-to-end stage direction, artist curation, and guest hospitality." }
      ],
      theme: { mode: "dark", bg: "#0b0714", surface: "#160e26", text: "#faf5ff", muted: "#c4b5fd", accent: "#a855f7", accent2: "#ec4899" }
    },
    {
      match: /\b(law|legal|attorney|lawyer|finance|bank|wealth|accounting|tax|consulting|corporate)\b/i,
      websiteType: "Legal, Finance & Advisory",
      brand: `${subject} Partners`,
      tagline: "Strategic Counsel, Fiduciary Rigor & Measurable Outcomes",
      heroHeadline: `Trusted Advisory & Representation From ${subject}.`,
      ctaPrimary: "Schedule Consultation",
      ctaSecondary: "Practice Areas",
      itemsHeading: "Core Practice & Advisory Pillars",
      navServicesLabel: "Services",
      cards: [
        { tag: "Advisory", title: "Corporate & Commercial Strategy", price: "Retainer", desc: "Structuring governance, cross-border transactions, and risk mitigation." },
        { tag: "Litigation", title: "Regulatory & Dispute Counsel", price: "Dedicated", desc: "Senior partner representation focused on decisive, discrete resolution." },
        { tag: "Wealth", title: "Private Capital Structuring", price: "Bespoke", desc: "Long-horizon portfolio stewardship, tax optimization, and estate planning." }
      ],
      theme: { mode: "dark", bg: "#09101d", surface: "#111c30", text: "#f8fafc", muted: "#94a3b8", accent: "#eab308", accent2: "#38bdf8" }
    },
    {
      match: /\b(photography|photo|camera|film|cinema|architecture|interior design|art gallery)\b/i,
      websiteType: "Photography & Visual Arts",
      brand: `${subject} Studio`,
      tagline: "Editorial Vision, Natural Light & Timeless Composition",
      heroHeadline: `Visual Stories Captured With Precision By ${subject}.`,
      ctaPrimary: "Book Session",
      ctaSecondary: "View Gallery",
      itemsHeading: "Featured Collections & Commissions",
      navServicesLabel: "Gallery",
      cards: [
        { tag: "Editorial", title: "Architectural & Spatial Series", price: "$1,200", desc: "Medium-format framing showcasing light, texture, and form." },
        { tag: "Campaign", title: "Brand Lookbook Direction", price: "$2,400", desc: "Full creative production from moodboarding and casting to final retouch." },
        { tag: "Portrait", title: "Fine Art Portrait Commission", price: "$650", desc: "Intimate studio or location sittings printed on museum-grade cotton rag." }
      ],
      theme: { mode: "dark", bg: "#0d0d0d", surface: "#171717", text: "#fafafa", muted: "#a3a3a3", accent: "#f59e0b", accent2: "#ef4444" }
    },
    {
      match: /\b(pet|dog|cat|veterinary|vet|animal|farm|organic|plant|garden|botanical|eco|bakery|coffee|tea)\b/i,
      websiteType: "Lifestyle, Nature & Specialty Care",
      brand: `${subject} Haven`,
      tagline: "Thoughtful Care, Sustainable Sourcing & Warm Hospitality",
      heroHeadline: `Pure Craft & Dedicated Care At ${subject}.`,
      ctaPrimary: "Book Appointment",
      ctaSecondary: "Explore Offerings",
      itemsHeading: "Signature Offerings",
      navServicesLabel: "Offerings",
      cards: [
        { tag: "Popular", title: "Signature Wellness Package", price: "$65", desc: "Gentle, holistic experience tailored using all-natural botanical essentials." },
        { tag: "Artisan", title: "Seasonal Reserve Selection", price: "$42", desc: "Small-batch harvests and handcrafted selections prepared fresh daily." },
        { tag: "Premium", title: "Full Bespoke Experience", price: "$120", desc: "Comprehensive one-on-one session with priority concierge care." }
      ],
      theme: { mode: "light", bg: "#f4f7f4", surface: "#ffffff", text: "#0f2419", muted: "#4b6355", accent: "#16a34a", accent2: "#d97706" }
    }
  ];

  const matched = profiles.find((p) => p.match.test(lower));
  if (matched) {
    return {
      brand: matched.brand,
      websiteType: matched.websiteType,
      tagline: matched.tagline,
      heroHeadline: matched.heroHeadline,
      heroSubheadline: `${matched.tagline}. Built with bespoke aesthetics, responsive design, and seamless interactive flows.`,
      ctaPrimary: matched.ctaPrimary,
      ctaSecondary: matched.ctaSecondary,
      navServicesLabel: matched.navServicesLabel,
      itemsHeading: matched.itemsHeading,
      aboutTitle: `Crafting the Gold Standard in ${matched.websiteType}.`,
      aboutStory: `${matched.brand} was founded with a singular mission: combine unmatched domain mastery with thoughtful hospitality and modern craft.`,
      theme: matched.theme,
      items: matched.cards.map((c) => ({
        tag: c.tag,
        title: c.title,
        price: c.price,
        description: c.desc,
        imageKeywords: `${prompt} ${c.title} commercial photography`
      })),
      faq: [
        { q: `How do I get started with ${matched.brand}?`, a: `Simply click "${matched.ctaPrimary}" or use the Contact page to submit your inquiry in seconds.` },
        { q: "Are custom requests and consultations available?", a: `Yes! Our specialists customize every ${matched.websiteType.toLowerCase()} plan to fit your exact goals.` }
      ],
      baseSeed
    };
  }

  return {
    brand: subject,
    websiteType: subject,
    tagline: `Modern Excellence, Tailored Craft & Elevated Experiences in ${subject}`,
    heroHeadline: `Experience the Future of ${subject}.`,
    heroSubheadline: `Built around craft, performance, and intuitive elegance tailored uniquely for ${subject}.`,
    ctaPrimary: "Get Started",
    ctaSecondary: "Explore Offerings",
    navServicesLabel: "Offerings",
    itemsHeading: `Featured ${subject} Offerings`,
    aboutTitle: `Pioneering Craft & Innovation in ${subject}.`,
    aboutStory: `${subject} combines deep expertise with attentive service to deliver remarkable results every day.`,
    theme: { mode: "dark", bg: "#080b18", surface: "#11172d", text: "#f8fafc", muted: "#94a3b8", accent: "#00d4ff", accent2: "#8b5cf6" },
    items: [
      { tag: "Signature", title: `${subject} Core Experience`, price: "$149", description: "Flagship solution crafted for performance, clarity, and lasting quality.", imageKeywords: `${prompt} flagship photography` },
      { tag: "Pro Tier", title: `Custom ${subject} Suite`, price: "$299", description: "Tailored end-to-end offering built for demanding projects and teams.", imageKeywords: `${prompt} modern studio detail` },
      { tag: "Enterprise", title: `${subject} Concierge Partner`, price: "Custom", description: "Dedicated strategy, priority execution, and continuous hands-on support.", imageKeywords: `${prompt} executive workspace` }
    ],
    faq: [
      { q: `What makes ${subject} unique?`, a: `Every experience is tailored from first principles around quality, transparency, and speed.` },
      { q: "How quickly can I book or order?", a: `You can submit any request directly through our interactive Contact page with instant confirmation.` }
    ],
    baseSeed
  };
}

function normalizeBlueprint(rawBlueprint = {}, rawPrompt = "") {
  const fallback = resolveUniversalProfile(rawPrompt);
  const b = rawBlueprint && typeof rawBlueprint === "object" ? rawBlueprint : {};
  const rawTheme = b.theme && typeof b.theme === "object" ? b.theme : {};
  const isLight = rawTheme.mode === "light";

  const theme = {
    mode: isLight ? "light" : (rawTheme.mode || fallback.theme.mode || "dark"),
    bg: rawTheme.bg || fallback.theme.bg,
    surface: rawTheme.surface || fallback.theme.surface,
    text: rawTheme.text || fallback.theme.text,
    muted: rawTheme.muted || fallback.theme.muted,
    accent: rawTheme.accent || fallback.theme.accent,
    accent2: rawTheme.accent2 || fallback.theme.accent2,
    border: isLight ? "rgba(15, 23, 42, 0.1)" : "rgba(255, 255, 255, 0.12)"
  };

  const items = Array.isArray(b.items) && b.items.length >= 2
    ? b.items.slice(0, 6).map((item, idx) => ({
        tag: String(item.tag || `Series ${idx + 1}`),
        title: String(item.title || `Featured Offering ${idx + 1}`),
        price: String(item.price || "Contact"),
        description: String(item.description || item.desc || "Precision crafted experience with dedicated concierge support."),
        imageKeywords: String(item.imageKeywords || `${rawPrompt} ${item.title || ""}`)
      }))
    : fallback.items;

  const stats = Array.isArray(b.stats) && b.stats.length >= 3
    ? b.stats.slice(0, 3)
    : [
        { value: "99.4%", label: "Client Satisfaction Score" },
        { value: "12K+", label: "Completed Orders & Visits" },
        { value: "24/7", label: "Dedicated Concierge Support" }
      ];

  const faq = Array.isArray(b.faq) && b.faq.length >= 2 ? b.faq.slice(0, 4) : fallback.faq;

  return {
    brand: String(b.brand || fallback.brand),
    websiteType: String(b.websiteType || fallback.websiteType),
    tagline: String(b.tagline || fallback.tagline),
    heroHeadline: String(b.heroHeadline || fallback.heroHeadline),
    heroSubheadline: String(b.heroSubheadline || fallback.heroSubheadline),
    ctaPrimary: String(b.ctaPrimary || fallback.ctaPrimary),
    ctaSecondary: String(b.ctaSecondary || fallback.ctaSecondary),
    navServicesLabel: String(b.navServicesLabel || fallback.navServicesLabel),
    itemsHeading: String(b.itemsHeading || fallback.itemsHeading),
    aboutTitle: String(b.aboutTitle || fallback.aboutTitle),
    aboutStory: String(b.aboutStory || fallback.aboutStory),
    heroImageKeywords: String(b.heroImageKeywords || `${rawPrompt} wide cinematic hero photograph`),
    aboutImageKeywords: String(b.aboutImageKeywords || `${rawPrompt} interior workshop studio atmosphere`),
    theme,
    stats,
    items,
    faq,
    baseSeed: fallback.baseSeed
  };
}

function compileBlueprintToWebsiteProject(rawBlueprint = {}, rawPrompt = "", metaOverrides = {}) {
  const bp = normalizeBlueprint(rawBlueprint, rawPrompt);
  const { theme, brand, websiteType, tagline, heroHeadline, heroSubheadline, ctaPrimary, ctaSecondary, navServicesLabel, itemsHeading, aboutTitle, aboutStory, heroImageKeywords, aboutImageKeywords, stats, items, faq, baseSeed } = bp;

  const btnTextColor = getContrastTextColor(theme.accent);
  const photoSlots = resolveRealPhotoSlots(rawPrompt, bp, metaOverrides.resolvedPhotos);
  const heroImg = photoSlots.heroImg;
  const aboutImg = photoSlots.aboutImg;
  const fallbackImg = photoSlots.fallbackImg || heroImg;
  const cardImgs = items.map((_, idx) =>
    (photoSlots.cardImgs && photoSlots.cardImgs[idx % photoSlots.cardImgs.length]) || fallbackImg
  );

  const uniqueTags = [...new Set(items.map((i) => i.tag.toLowerCase()))];

  const css = `
    :root {
      --bg: ${theme.bg};
      --surface: ${theme.surface};
      --text: ${theme.text};
      --muted: ${theme.muted};
      --accent: ${theme.accent};
      --accent2: ${theme.accent2};
      --btn-text: ${btnTextColor};
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
    h1, h2, h3, .brand { font-family: 'Space Grotesk', 'Inter', system-ui, sans-serif; letter-spacing: -0.02em; }
    a { color: inherit; text-decoration: none; }
    .container { width: min(1160px, calc(100% - 40px)); margin: 0 auto; }

    /* Navbar */
    .navbar {
      position: sticky; top: 0; z-index: 100;
      background: ${theme.mode === "dark" ? "rgba(8, 11, 24, 0.88)" : "rgba(255, 255, 255, 0.9)"};
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
      color: var(--btn-text);
      box-shadow: 0 10px 26px rgba(0, 0, 0, 0.22);
    }
    .btn-outline {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text);
    }
    .mobile-toggle { display: none; background: transparent; border: 1px solid var(--border); color: var(--text); padding: 8px 12px; border-radius: 8px; font-size: 1.1rem; cursor: pointer; }

    /* Hero */
    .hero { padding: 76px 0 64px; position: relative; overflow: hidden; }
    .hero-grid { display: grid; grid-template-columns: 1.08fr 0.92fr; gap: 44px; align-items: center; }
    .pill {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 6px 14px; border-radius: 999px;
      background: ${theme.mode === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"};
      border: 1px solid var(--border);
      font-size: 0.8rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
      color: var(--accent); margin-bottom: 18px;
    }
    .hero h1 { font-size: clamp(2.15rem, 4.2vw, 3.45rem); line-height: 1.12; margin-bottom: 18px; }
    .hero p { font-size: 1.06rem; color: var(--muted); max-width: 54ch; margin-bottom: 30px; }
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
      padding: 26px; border-radius: 18px; background: var(--surface);
      border: 1px solid var(--border); margin-top: 52px;
    }
    .stat-item strong { display: block; font-size: 1.8rem; font-family: 'Space Grotesk', sans-serif; color: var(--accent); }
    .stat-item span { font-size: 0.88rem; color: var(--muted); }

    /* Cards & Sections */
    .section { padding: 72px 0; }
    .section-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; flex-wrap: wrap; margin-bottom: 34px; }
    .section-header h2 { font-size: clamp(1.75rem, 3vw, 2.4rem); }
    .section-header p { color: var(--muted); max-width: 52ch; }
    .filter-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
    .filter-btn {
      padding: 8px 16px; border-radius: 999px; border: 1px solid var(--border);
      background: var(--surface); color: var(--muted); font-weight: 600; font-size: 0.85rem; cursor: pointer;
    }
    .filter-btn.active { background: var(--accent); color: var(--btn-text); border-color: var(--accent); }

    .cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 24px; }
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

    /* FAQ Accordion */
    .faq-list { display: grid; gap: 14px; max-width: 820px; margin: 0 auto; }
    .faq-item {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 14px; padding: 18px 22px; cursor: pointer;
    }
    .faq-q { display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 1.02rem; }
    .faq-a { color: var(--muted); font-size: 0.94rem; margin-top: 10px; display: none; }
    .faq-item.open .faq-a { display: block; }

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
      border-top: 1px solid var(--border); padding: 36px 0;
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
        <a href="services.html" class="${activePage === "services" ? "active" : ""}">${escapeHtml(navServicesLabel)}</a>
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
      <p>© ${new Date().getFullYear()} ${escapeHtml(brand)}. All rights reserved. • ${escapeHtml(websiteType)}</p>
    </div>
  </footer>
  ${script}
  ${routerScript}
</body>
</html>`;
  }

  const cardsHtml = items.map((c, idx) => `
    <article class="card filterable-card" data-cat="${escapeHtml(c.tag.toLowerCase())}">
      <img class="card-img" src="${cardImgs[idx]}" alt="${escapeHtml(c.title)}" loading="lazy" onerror="this.onerror=null;this.src='${fallbackImg}';" />
      <div class="card-body">
        <div>
          <div class="card-top">
            <span class="tag">${escapeHtml(c.tag)}</span>
            <span class="price">${escapeHtml(c.price)}</span>
          </div>
          <h3>${escapeHtml(c.title)}</h3>
          <p>${escapeHtml(c.description)}</p>
        </div>
        <button class="btn btn-outline" onclick="showToast('${escapeHtml(c.title)} Selected', 'Proceeding with inquiry for ${escapeHtml(c.title)} (${escapeHtml(c.price)}).')">Select ${escapeHtml(c.tag)}</button>
      </div>
    </article>
  `).join("\n");

  const faqHtml = faq.map((f, idx) => `
    <div class="faq-item ${idx === 0 ? "open" : ""}" onclick="this.classList.toggle('open')">
      <div class="faq-q"><span>${escapeHtml(f.q)}</span><span style="color:var(--accent);">+</span></div>
      <div class="faq-a">${escapeHtml(f.a)}</div>
    </div>
  `).join("\n");

  const homeHtml = wrapPage("home", "Home", `
    <section class="hero">
      <div class="container">
        <div class="hero-grid">
          <div>
            <span class="pill">${escapeHtml(websiteType)}</span>
            <h1>${escapeHtml(heroHeadline)}</h1>
            <p>${escapeHtml(heroSubheadline)}</p>
            <div class="hero-actions">
              <a href="services.html" class="btn btn-primary">${escapeHtml(ctaPrimary)}</a>
              <a href="contact.html" class="btn btn-outline">${escapeHtml(ctaSecondary)}</a>
            </div>
          </div>
          <div class="hero-visual">
            <img src="${heroImg}" alt="${escapeHtml(brand)} Hero Showcase" onerror="this.onerror=null;this.src='${fallbackImg}';" />
          </div>
        </div>

        <div class="stats-bar">
          ${stats.map(s => `<div class="stat-item"><strong>${escapeHtml(s.value)}</strong><span>${escapeHtml(s.label)}</span></div>`).join("")}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-header">
          <div>
            <h2>${escapeHtml(itemsHeading)}</h2>
            <p>${escapeHtml(tagline)}</p>
          </div>
          <div class="filter-tabs">
            <button class="filter-btn active" onclick="filterCards('all', this)">All</button>
            ${uniqueTags.map(t => `<button class="filter-btn" onclick="filterCards('${escapeHtml(t)}', this)">${escapeHtml(t.toUpperCase())}</button>`).join("")}
          </div>
        </div>
        <div class="cards-grid">${cardsHtml}</div>
      </div>
    </section>

    <section class="section" style="padding-top:20px;">
      <div class="container">
        <div class="section-header" style="justify-content:center;text-align:center;">
          <div>
            <h2>Frequently Asked Questions</h2>
            <p>Everything you need to know about ${escapeHtml(brand)}.</p>
          </div>
        </div>
        <div class="faq-list">${faqHtml}</div>
      </div>
    </section>
  `);

  const aboutHtml = wrapPage("about", "About Us", `
    <section class="section">
      <div class="container">
        <div class="hero-grid">
          <div>
            <span class="pill">Our Story</span>
            <h1>${escapeHtml(aboutTitle)}</h1>
            <p>${escapeHtml(aboutStory)}</p>
            <div style="margin-top:24px;display:flex;gap:12px;">
              <a href="services.html" class="btn btn-primary">Explore ${escapeHtml(navServicesLabel)}</a>
              <a href="contact.html" class="btn btn-outline">Contact Team</a>
            </div>
          </div>
          <div class="hero-visual">
            <img src="${aboutImg}" alt="About ${escapeHtml(brand)}" onerror="this.onerror=null;this.src='${fallbackImg}';" />
          </div>
        </div>
      </div>
    </section>
  `);

  const servicesHtml = wrapPage("services", navServicesLabel, `
    <section class="section">
      <div class="container">
        <div class="section-header">
          <div>
            <span class="pill">Full Lineup</span>
            <h2>${escapeHtml(itemsHeading)}</h2>
            <p>Explore every option below or request a bespoke package.</p>
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
          <p style="color:var(--muted);margin-bottom:26px;">Tell us what you're looking for and our specialists will reply promptly.</p>
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
                ${items.map(c => `<option value="${escapeHtml(c.title)}">${escapeHtml(c.title)} (${escapeHtml(c.price)})</option>`).join("")}
              </select>
            </div>
            <div class="form-group">
              <label>Message / Inquiry Details</label>
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
      modelUsed: metaOverrides.modelUsed || `nova-universal-architect (${websiteType})`,
      websiteType,
      industry: websiteType,
      theme: theme.mode === "dark" ? "Modern Dark Glass" : "Clean Editorial Light",
      targetAudience: "Modern Visitors & Customers",
      tone: "Custom & Interactive",
      generationTimeMs: metaOverrides.generationTimeMs || 180,
      fallbackUsed: Boolean(metaOverrides.fallbackUsed),
      retryAttempts: 0,
      validation: { usable: true, errors: [] }
    }
  };
}

function buildUniversalWebsiteProject(prompt = "", analysis = {}) {
  const profile = resolveUniversalProfile(prompt);
  return compileBlueprintToWebsiteProject(profile, prompt);
}

module.exports = {
  buildUniversalWebsiteProject,
  compileBlueprintToWebsiteProject,
  resolveUniversalProfile
};
