/**
 * NOVA Real Stock Photography Vault & Live Resolver
 * - Zero API keys required out of the box (HTTP-200 verified Unsplash catalog + Openverse zero-key live fallback).
 * - Optional PIXABAY_API_KEY / PEXELS_API_KEY env support for live stock search on every prompt.
 * - Strictly excludes Pollinations images inside Website Generator so no free-limit banners ever appear.
 */

const VERIFIED_STOCK_VAULT = {
  motorcycle: [
    "https://images.unsplash.com/photo-1558981852-426c6c22a060?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1568772585432-0bcd9add44f5?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1698695290237-5c7be2bd52a8?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1753563827508-d7812ef3e8fa?auto=format&fit=crop&w=1200&q=80"
  ],
  car: [
    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1517448922956-1efc1c6cc09c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1514041181368-bca62cceffcd?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1559145200-30a43bab556a?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1617654112368-307921291f42?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1602200060227-32362355f793?auto=format&fit=crop&w=1200&q=80"
  ],
  fitness: [
    "https://images.unsplash.com/photo-1627483298606-cf54c61779a9?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1758875569866-62f54fdfd281?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1589365278144-c9e705f843ba?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?auto=format&fit=crop&w=1200&q=80"
  ],
  gaming: [
    "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1542751110-97427bbecf20?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1563740585252-c314f8f00f2c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1762983701995-9e75c4d5a812?auto=format&fit=crop&w=1200&q=80"
  ],
  coffee_bakery: [
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1551030173-122aabc4489c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1462917882517-e150004895fa?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1626263468007-a9e0cf83f1ac?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1593872570782-6c6e7069e67e?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1714801172470-bf71c2ac1884?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1520209268518-aec60b8bb5ca?auto=format&fit=crop&w=1200&q=80"
  ],
  restaurant: [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1579954115545-a95591f28bfc?auto=format&fit=crop&w=1200&q=80"
  ],
  hospital: [
    "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80"
  ],
  real_estate: [
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"
  ],
  ecommerce: [
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=1200&q=80"
  ],
  education: [
    "https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1505063366573-38928ae5567e?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1200&q=80"
  ],
  travel: [
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1618140052121-39fc6db33972?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1624594895779-14457ba78dcd?auto=format&fit=crop&w=1200&q=80"
  ],
  music: [
    "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1481886756534-97af88ccb438?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1535392432937-a27c36ec07b5?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80"
  ],
  finance_corporate: [
    "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80"
  ],
  photography: [
    "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1495745966610-2a67f2297e5e?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1643369283064-f9146f94c6c2?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1579454938313-bdf2ac7e870f?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1547922657-b370d1687eb1?auto=format&fit=crop&w=1200&q=80"
  ],
  pets: [
    "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1529778873920-4da4926a72c2?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1591160690555-5debfba289f0?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1561037404-61cd46aa615b?auto=format&fit=crop&w=1200&q=80"
  ],
  saas_tech: [
    "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80"
  ],
  general_studio: [
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80"
  ]
};

const CATEGORY_MATCHERS = [
  { key: "motorcycle", pattern: /\b(motorcycle|motorcycles|motorbike|bike showroom|bikes|superbike|superbikes|ducati|harley|kawasaki|yamaha|scooter|moto|chopper|cruiser)\b/i, query: "motorcycle" },
  { key: "car", pattern: /\b(car|cars|supercar|automobile|automotive|dealership|showroom|sedan|suv|ev|electric vehicle|detailing|motorsport|porsche|ferrari|bmw)\b/i, query: "sports car" },
  { key: "coffee_bakery", pattern: /\b(coffee|espresso|cafe|cafeteria|bakery|boulangerie|patisserie|pastry|croissant|roastery|matcha|tea house|dessert|cake shop|donut)\b/i, query: "coffee shop" },
  { key: "restaurant", pattern: /\b(restaurant|bistro|diner|steakhouse|sushi|korean bbq|bbq|pizzeria|pizza|trattoria|taco|ramen|catering|fine dining|gastronomy|kitchen|food)\b/i, query: "restaurant food" },
  { key: "pets", pattern: /\b(pet|pets|dog|puppy|cat|kitten|veterinary|vet clinic|grooming|animal shelter|aquarium)\b/i, query: "dog pet" },
  { key: "hospital", pattern: /\b(hospital|clinic|medical|healthcare|doctor|dental|dentist|cardiology|pediatric|orthopedic|pharmacy|wellness clinic|therapy|telemedicine)\b/i, query: "hospital clinic" },
  { key: "real_estate", pattern: /\b(real estate|realtor|property|properties|villa|penthouse|apartment|architecture|interior design|housing|brokerage|estate)\b/i, query: "luxury architecture" },
  { key: "fitness", pattern: /\b(fitness|gym|crossfit|workout|yoga|pilates|boxing|athletic|personal trainer|bodybuilding|wellness studio|martial arts|spa)\b/i, query: "gym fitness" },
  { key: "gaming", pattern: /\b(gaming|esports|arcade|game studio|gamer|console|pc build|streaming|tournament|vr)\b/i, query: "gaming setup" },
  { key: "ecommerce", pattern: /\b(ecommerce|e-commerce|store|shop|fashion|apparel|sneaker|shoes|streetwear|jewelry|watches|handbag|boutique|retail|cosmetics|skincare|merch)\b/i, query: "fashion store" },
  { key: "education", pattern: /\b(education|university|school|college|academy|bootcamp|tutoring|course|learning|edtech|library|student|scholarship)\b/i, query: "university library" },
  { key: "travel", pattern: /\b(travel|resort|hotel|vacation|tourism|beach|airline|safari|cruise|tour agency|mountain lodge|adventure|booking)\b/i, query: "tropical resort" },
  { key: "music", pattern: /\b(music|concert|festival|dj|guitar|record label|band|sound studio|audio|vinyl|orchestra|podcaster|nightclub)\b/i, query: "music concert" },
  { key: "photography", pattern: /\b(photography|photographer|camera|portrait studio|videography|wedding film|cinema|gallery|portfolio)\b/i, query: "camera photography" },
  { key: "finance_corporate", pattern: /\b(finance|bank|fintech|accounting|tax|wealth|law firm|attorney|legal|consulting|corporate|agency|venture|insurance)\b/i, query: "modern office" },
  { key: "saas_tech", pattern: /\b(saas|ai|software|startup|cloud|cybersecurity|analytics|developer|tech|automation|robotics|platform|app)\b/i, query: "software dashboard" }
];

function classifyStockCategory(prompt = "", websiteType = "", items = []) {
  const haystack = [
    String(prompt || ""),
    String(websiteType || ""),
    ...(Array.isArray(items) ? items.map((it) => `${it?.title || ""} ${it?.tag || ""}`) : [])
  ].join(" ");

  for (const matcher of CATEGORY_MATCHERS) {
    if (matcher.pattern.test(haystack)) {
      return { category: matcher.key, matchedSpecific: true, defaultQuery: matcher.query };
    }
  }
  return { category: "general_studio", matchedSpecific: false, defaultQuery: "" };
}

function buildCompactSearchQuery(prompt = "", fallbackQuery = "") {
  if (fallbackQuery) return fallbackQuery;
  const cleaned = String(prompt || "")
    .replace(/\b(create|build|generate|make|design|a|an|the|website|site|web app|landing page|page|for|with|about|modern|premium|professional|responsive)\b/gi, " ")
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter((w) => w.length > 2).slice(0, 2);
  return words.join(" ") || "modern studio";
}

function buildSyncVaultSlots(category = "general_studio", seed = 101) {
  const list = VERIFIED_STOCK_VAULT[category] || VERIFIED_STOCK_VAULT.general_studio;
  const offset = Math.abs(Math.floor(Number(seed) || 0)) % list.length;
  const rotated = [...list.slice(offset), ...list.slice(0, offset)];
  while (rotated.length < 5) {
    rotated.push(VERIFIED_STOCK_VAULT.general_studio[rotated.length % VERIFIED_STOCK_VAULT.general_studio.length]);
  }
  return {
    heroImg: rotated[0],
    aboutImg: rotated[1],
    cardImgs: [rotated[2], rotated[3], rotated[4]],
    fallbackImg: list[0]
  };
}

async function queryPixabayPhotos(query, timeoutMs = 2200) {
  const apiKey = (process.env.PIXABAY_API_KEY || "").trim();
  if (!apiKey) return [];
  const url = `https://pixabay.com/api/?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=10&safesearch=true`;
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.hits || [])
    .map((h) => h.largeImageURL || h.webformatURL)
    .filter((u) => typeof u === "string" && u.startsWith("https://"));
}

async function queryPexelsPhotos(query, timeoutMs = 2200) {
  const apiKey = (process.env.PEXELS_API_KEY || "").trim();
  if (!apiKey) return [];
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&per_page=10`;
  const res = await fetch(url, {
    headers: { Authorization: apiKey },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.photos || [])
    .map((p) => p.src?.large2x || p.src?.large || p.src?.medium)
    .filter((u) => typeof u === "string" && u.startsWith("https://"));
}

async function queryOpenversePhotos(query, timeoutMs = 2200) {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&license_type=all&page_size=12`;
  const res = await fetch(url, {
    headers: { "User-Agent": "NOVA-AI-Website-Builder/1.0" },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.results || [])
    .filter((item) => {
      const imgUrl = String(item?.url || "");
      if (!imgUrl.startsWith("https://")) return false;
      if (/\.svg(\?|$)|logo|icon|badge|avatar/i.test(imgUrl)) return false;
      if (!/\.(jpe?g|png|webp)(\?|$)/i.test(imgUrl)) return false;
      if (Number(item?.width || 0) > 0 && Number(item.width) < 500) return false;
      return true;
    })
    .map((item) => item.url);
}

/**
 * Resolves 5 unique real stock photographs (hero, about, card1, card2, card3) plus safe fallback URL.
 * Zero API key required; supports optional PIXABAY_API_KEY / PEXELS_API_KEY when present.
 */
async function resolveWebsitePhotos({ prompt = "", blueprint = {}, timeoutMs = 2200 } = {}) {
  const { category, matchedSpecific, defaultQuery } = classifyStockCategory(
    prompt,
    blueprint?.websiteType,
    blueprint?.items
  );
  const seed = blueprint?.baseSeed || prompt.length * 17;
  const vaultSlots = buildSyncVaultSlots(category, seed);
  const query = buildCompactSearchQuery(prompt, defaultQuery);

  let liveUrls = [];
  let source = "verified-unsplash-vault";

  try {
    if ((process.env.PIXABAY_API_KEY || "").trim()) {
      liveUrls = await queryPixabayPhotos(query, timeoutMs);
      if (liveUrls.length >= 3) source = "pixabay-live";
    } else if ((process.env.PEXELS_API_KEY || "").trim()) {
      liveUrls = await queryPexelsPhotos(query, timeoutMs);
      if (liveUrls.length >= 3) source = "pexels-live";
    } else if (!matchedSpecific) {
      // Custom/unusual niche outside the 16 curated vaults: attempt Openverse live zero-key search within tight time cap
      liveUrls = await queryOpenversePhotos(query, timeoutMs);
      if (liveUrls.length >= 1) source = "openverse-live";
    }
  } catch {
    // Gracefully fall back to curated verified Unsplash photography without stalling website generation
    liveUrls = [];
  }

  const deduped = [];
  const seen = new Set();
  const pushUnique = (u) => {
    if (typeof u === "string" && u.startsWith("https://") && !u.includes("pollinations") && !seen.has(u)) {
      seen.add(u);
      deduped.push(u);
    }
  };

  for (const u of liveUrls) pushUnique(u);
  pushUnique(vaultSlots.heroImg);
  pushUnique(vaultSlots.aboutImg);
  for (const u of vaultSlots.cardImgs) pushUnique(u);
  for (const u of VERIFIED_STOCK_VAULT.general_studio) pushUnique(u);

  return {
    category,
    source,
    heroImg: deduped[0] || vaultSlots.heroImg,
    aboutImg: deduped[1] || vaultSlots.aboutImg,
    cardImgs: [
      deduped[2] || vaultSlots.cardImgs[0],
      deduped[3] || vaultSlots.cardImgs[1],
      deduped[4] || vaultSlots.cardImgs[2]
    ],
    fallbackImg: vaultSlots.fallbackImg
  };
}

module.exports = {
  VERIFIED_STOCK_VAULT,
  classifyStockCategory,
  buildSyncVaultSlots,
  resolveWebsitePhotos
};
