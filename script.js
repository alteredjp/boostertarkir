window.addEventListener("load", () => {
  const UI = {
    btnLoad: document.getElementById("btnLoad"),
    btnOpen: document.getElementById("btnOpen"),
    btnNext: document.getElementById("btnNext"),
    btnToLand: document.getElementById("btnToLand"),
    btnAll: document.getElementById("btnAll"),
    btnAuto: document.getElementById("btnAuto"),
    btnSound: document.getElementById("btnSound"),
    btnLog: document.getElementById("btnLog"),
    btnVault: document.getElementById("btnVault"),
    btnBinder: document.getElementById("btnBinder"),
    btnWipeCache: document.getElementById("btnWipeCache"),
    btnResetAll: document.getElementById("btnResetAll"),

    statusDot: document.getElementById("statusDot"),
    statusText: document.getElementById("statusText"),
    summary: document.getElementById("summary"),

    boosterCostFixed: document.getElementById("boosterCostFixed"),
    packMoney: document.getElementById("packMoney"),
    packValue: document.getElementById("packValue"),
    boosterCostLabel: document.getElementById("boosterCostLabel"),
    packProfit: document.getElementById("packProfit"),

    cardGrid: document.getElementById("cardGrid"),
    logPanel: document.getElementById("logPanel"),
    packLog: document.getElementById("packLog"),
    revealCount: document.getElementById("revealCount"),
    revealTotal: document.getElementById("revealTotal"),

    vaultPanel: document.getElementById("vaultPanel"),
    vaultStats: document.getElementById("vaultStats"),
    vaultList: document.getElementById("vaultList"),
    btnVaultClear: document.getElementById("btnVaultClear"),

    binderPanel: document.getElementById("binderPanel"),
    binderStats: document.getElementById("binderStats"),
    binderGrid: document.getElementById("binderGrid"),

    boosterStats: document.getElementById("boosterStats"),
    statMarketPrice: document.getElementById("statMarketPrice"),
    statEV: document.getElementById("statEV"),
    statMedian: document.getElementById("statMedian"),

    mainStats: document.getElementById("mainStats"),
    mainTotal: document.getElementById("mainTotal"),
    mainCompared: document.getElementById("mainCompared"),
    mainRM: document.getElementById("mainRM"),
    mainFoils: document.getElementById("mainFoils"),

    qualityBarWrap: document.getElementById("qualityBarWrap"),
    qualityFill: document.getElementById("qualityFill"),
    qualityLabel: document.getElementById("qualityLabel"),
    qualityHint: document.getElementById("qualityHint"),

    stickyStats: document.getElementById("stickyStats"),
    stickyTotal: document.getElementById("stickyTotal"),
    stickyCompared: document.getElementById("stickyCompared"),
	
    stickyMythic: document.getElementById("stickyMythic"),
    stickyRare: document.getElementById("stickyRare"),
    stickyFoilUnc: document.getElementById("stickyFoilUnc"),
    stickyFoilCom: document.getElementById("stickyFoilCom"),
	
    stickyQuality: document.getElementById("stickyQuality"),

    modal: document.getElementById("modal"),
    modalImg: document.getElementById("modalImg"),
    modalFx: document.getElementById("modalFx"),
    modalTitle: document.getElementById("modalTitle"),
    modalMana: document.getElementById("modalMana"),
    modalLine: document.getElementById("modalLine"),
    modalOracle: document.getElementById("modalOracle"),
    modalPT: document.getElementById("modalPT"),
    modalLoyalty: document.getElementById("modalLoyalty"),
    modalPrice: document.getElementById("modalPrice"),
    modalSlot: document.getElementById("modalSlot"),
    btnModalClose: document.getElementById("btnModalClose"),
  };
  
  // --- Set identity (MTGJSON) ---
  // Scryfall continua sendo a fonte da carta. MTGJSON vira a fonte da identidade do set.
  let SETLIST = null; // { [setCodeLower]: { name, keyruneCode } }

  function getCurrentSetCode() {
    return String(window.SET_CODE || "tdm").toLowerCase();
  }

  (async () => {
    try {
      SETLIST = await loadMtgjsonSetList();
      applySetIdentityToUI(getCurrentSetCode());
      applyKeyruneToStickyCounts(getCurrentSetCode());
    } catch (e) {
      console.warn("MTGJSON SetList: não foi possível carregar.", e);
    }
  })();


  /* =========================
     STORAGE
  ========================= */
  const COLLECTION_KEY = "nyx_collection_v3";
  const VAULT_KEY = "nyx_vault_v1";
  const SMALL_CACHE_KEY = "nyx_tdm_cache_small_v6";
  const BINDER_KEY = "nyx_binder_tdm_v1";
  const PACK_STATS_KEY = "nyx_pack_stats_v1";

  /* =========================
     STATE
  ========================= */
  let pools = null;
  let tokenPool = [];
  let allFallback = [];

  let currentPack = [];
  let revealedCount = 0;

  let autoMode = false;
  let autoTimer = null;

  let soundOn = true;
  let audioCtx = null;

  // binder
  let binderIndex = null; // Map<number, cardObj>
  let binderMax = 0;

  // set symbols (Keyrune)
  // (não guardamos SVGs nem URLs por carta — o set symbol vem do Keyrune)

  // pack distribution stats
  let packStats = null;

// =========================
// v5.2 — Set Identity (MTGJSON + Keyrune)
// =========================
// Fonte da verdade para "qual símbolo usar": MTGJSON SetList (keyruneCode).
// Render do símbolo: Keyrune (<i class="ss ss-<code> ss-rare"></i> etc.).
const MTGJSON_SETLIST_KEY = "nyx_mtgjson_setlist_v1";
const MTGJSON_SETLIST_URL = "https://mtgjson.com/api/v5/SetList.json";

async function loadMtgjsonSetList() {
  // 1) cache
  try {
    const cached = localStorage.getItem(MTGJSON_SETLIST_KEY);
    if (cached) return JSON.parse(cached);
  } catch (e) {}

  // 2) fetch
  const res = await fetch(MTGJSON_SETLIST_URL);
  if (!res.ok) throw new Error("Falha ao buscar SetList no MTGJSON.");
  const data = await res.json();

  const map = {};
  for (const s of (data?.data || [])) {
    if (!s?.code) continue;
    const code = String(s.code).toLowerCase();
    map[code] = {
      name: s.name || code.toUpperCase(),
      keyruneCode: (s.keyruneCode || code).toLowerCase(),
    };
  }

  // 3) salva cache
  try {
    localStorage.setItem(MTGJSON_SETLIST_KEY, JSON.stringify(map));
  } catch (e) {}

  return map;
}

function getKeyruneCodeFromSet(setCode) {
  const code = String(setCode || "").toLowerCase();
  return (SETLIST?.[code]?.keyruneCode || code || "").toLowerCase();
}

function applySetIdentityToUI(setCode) {
  const code = String(setCode || "").toLowerCase();
  const name = SETLIST?.[code]?.name;
  const el = document.getElementById("uiSetName");
  if (el && name) el.textContent = name;
}

function rarityToKeyruneClass(rarity) {
  const r = String(rarity || "common").toLowerCase();
  if (r === "mythic") return "ss-mythic";
  if (r === "rare") return "ss-rare";
  if (r === "uncommon") return "ss-uncommon";
  return "ss-common";
}

function applyKeyruneToStickyCounts(setCode) {
  const keyrune = getKeyruneCodeFromSet(setCode);
  if (!keyrune) return;

  const icons = document.querySelectorAll('[data-role="stickySetSymbol"]');
  icons.forEach((el) => {
    const r = el.getAttribute("data-rarity") || "common";
    el.className = `ss ss-${keyrune} ss-fw ${rarityToKeyruneClass(r)} setSymbol`;
  });
}

  /* =========================
     HELPERS
  ========================= */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const IS_COARSE = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  const REDUCED_MOTION = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;


  function setStatus(kind, text) {
    if (UI.statusDot) UI.statusDot.className = "dot " + (kind || "");
    if (UI.statusText) UI.statusText.textContent = text;
  }
  function safeJsonParse(s) {
    try { return JSON.parse(s); } catch { return null; }
  }
  function money(n) {
    if (!isFinite(n)) return "$0.00";
    return "$" + n.toFixed(2);
  }
  function parsePrice(p) {
    const n = parseFloat(p);
    return isFinite(n) ? n : 0;
  }
  function getBoosterCost() {
    const raw = (UI.boosterCostFixed?.textContent || "0").trim();
    const n = parseFloat(raw);
    return isFinite(n) ? n : 0;
  }
  function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
  function randInt(max) { return Math.floor(Math.random() * max); }
  function pickOne(arr) { return arr && arr.length ? arr[randInt(arr.length)] : null; }
  function weightedChoice(options) {
    let total = 0;
    for (const o of options) total += o.w;
    let r = Math.random() * total;
    for (const o of options) {
      r -= o.w;
      if (r <= 0) return o.v;
    }
    return options[options.length - 1].v;
  }
  async function fetchAllPages(url) {
    const out = [];
    let next = url;
    while (next) {
      const res = await fetch(next);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      out.push(...(data.data || []));
      next = data.has_more ? data.next_page : null;
      if (next) await new Promise((r) => setTimeout(r, 90));
    }
    return out;
  }

  /* =========================
     NORMALIZE + UTILS
  ========================= */
  function normalize(c) {
    const facesRaw = Array.isArray(c.card_faces) ? c.card_faces : [];
    const faces = facesRaw.map((f) => ({
      name: f.name || "",
      mana_cost: f.mana_cost || "",
      oracle_text: f.oracle_text || "",
      type_line: f.type_line || "",
      power: f.power || "",
      toughness: f.toughness || "",
      loyalty: f.loyalty || "",
      image: f.image_uris?.normal || "",
    }));

    const face0 = faces[0] || null;

    const mana_cost =
      c.mana_cost != null && c.mana_cost !== ""
        ? c.mana_cost
        : face0?.mana_cost || "";
    const oracle_text =
      c.oracle_text != null && c.oracle_text !== ""
        ? c.oracle_text
        : face0?.oracle_text || "";
    const type_line =
      c.type_line != null && c.type_line !== ""
        ? c.type_line
        : face0?.type_line || "";
    const power = c.power ?? face0?.power ?? "";
    const toughness = c.toughness ?? face0?.toughness ?? "";
    const loyalty = c.loyalty ?? face0?.loyalty ?? "";

    let img = null;
    if (c.image_uris && c.image_uris.normal) img = c.image_uris.normal;
    else if (face0?.image) img = face0.image;

    return {
      id: c.id,
      name: c.name,
      set: c.set,
      rarity: c.rarity || "",
      type_line,
      mana_cost,
      oracle_text,
      power,
      toughness,
      loyalty,
      finishes: c.finishes || [],
      frame_effects: c.frame_effects || [],
      border_color: c.border_color || "",
      full_art: !!c.full_art,
      promo_types: c.promo_types || [],
      layout: c.layout || "",
      collector_number: c.collector_number || "",
      image: img,
      faces,
      prices: c.prices || {},
    };
  }

  function hasFinish(c, f) { return (c.finishes || []).includes(f); }
  function hasFrame(c, e) { return (c.frame_effects || []).includes(e); }
  function isBorderless(c) { return c.border_color === "borderless"; }
  function isBasicLand(c) { return (c.type_line || "").includes("Basic Land"); }
  function isLand(c) { return (c.type_line || "").includes("Land"); }
  function isSerialized(c) { return (c.promo_types || []).includes("serialized"); }

  function numCN(cn) {
    const m = String(cn).match(/\d+/);
    return m ? parseInt(m[0], 10) : 0;
  }
  function inRangeCN(c, a, b) {
    const n = numCN(c.collector_number);
    return n >= a && n <= b;
  }

  function rarityClass(r) {
    if (r === "common") return "rarity-common";
    if (r === "uncommon") return "rarity-uncommon";
    if (r === "rare") return "rarity-rare";
    if (r === "mythic") return "rarity-mythic";
    return "rarity-common";
  }

  function rarityColorVar(r) {
    if (r === "mythic") return "var(--r-mythic)";
    if (r === "rare") return "var(--r-rare)";
    if (r === "uncommon") return "var(--r-uncommon)";
    return "var(--r-common)";
  }

  /* =========================
     COLLECTION
  ========================= */
  function getCollection() {
    return safeJsonParse(localStorage.getItem(COLLECTION_KEY)) || {};
  }
  function setCollection(o) {
    localStorage.setItem(COLLECTION_KEY, JSON.stringify(o));
  }
  function getCountForKey(key) {
    const col = getCollection();
    return col[key]?.count || 0;
  }
    function addToCollectionCard(card, finish) {
    if (!card) return;
    const col = getCollection();
    const key = `${card.set}:${card.id}`;

    if (!col[key]) {
      col[key] = {
      name: card.name,
      set: card.set,
      rarity: card.rarity,
      count: 0,
      collector_number: card.collector_number || "",
      image: card.image || "",

      // ✅ novos campos: “eu tenho esta carta em foil/halo?”
      foilCount: 0,
      haloCount: 0,
      };
    }

    col[key].count++;

    if (finish === "foil") col[key].foilCount = (col[key].foilCount || 0) + 1;
    if (finish === "halofoil") col[key].haloCount = (col[key].haloCount || 0) + 1;

    setCollection(col);
  }

  /* =========================
     VAULT
  ========================= */
  function getVault() {
    return safeJsonParse(localStorage.getItem(VAULT_KEY)) || [];
  }
  function setVault(v) {
    localStorage.setItem(VAULT_KEY, JSON.stringify(v));
  }

  function refreshVaultUI() {
    if (!UI.vaultStats || !UI.vaultList) return;

    const vault = getVault();
    const totalSpent = vault.reduce((a, p) => a + (p.boosterCost || 0), 0);
    const totalValue = vault.reduce((a, p) => a + (p.packValue || 0), 0);
    const profit = totalValue - totalSpent;

    UI.vaultStats.textContent = `Boosters: ${vault.length} • Gasto: ${money(totalSpent)} • Valor: ${money(totalValue)} • Resultado: ${money(profit)}`;
    UI.vaultList.innerHTML = "";

    vault.slice().reverse().slice(0, 80).forEach((p) => {
      const row = document.createElement("div");
      row.className = "row";
      const dt = new Date(p.openedAt).toLocaleString();
      const title = `${dt} • ${money(p.packValue)} (custo ${money(p.boosterCost)})`;
      const sub = (p.hits || []).slice(0, 4).join(" • ");
      row.innerHTML = `
        <div class="name">
          ${escapeHtml(title)}
          <div style="color:#9aa0a6;font-weight:800;font-size:12px;margin-top:4px">${escapeHtml(sub || "—")}</div>
        </div>
        <div class="count">${money((p.packValue || 0) - (p.boosterCost || 0))}</div>
      `;
      UI.vaultList.appendChild(row);
    });
  }

  /* =========================
     CACHE (cards pools)
  ========================= */
  function saveSmallCache(obj) {
    try {
      localStorage.setItem(SMALL_CACHE_KEY, JSON.stringify({ createdAt: Date.now(), ...obj }));
    } catch {}
  }
  function loadSmallCache() {
    const cached = safeJsonParse(localStorage.getItem(SMALL_CACHE_KEY));
    if (!cached || !cached.createdAt) return null;
    const ageH = (Date.now() - cached.createdAt) / (1000 * 60 * 60);
    if (ageH > 24) return null;
    return cached;
  }

  /* =========================
     SOUND
  ========================= */
  function ensureAudio() {
    if (!soundOn) return null;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    return audioCtx;
  }
  function playTone(freq, durMs, type = "sine", gain = 0.18) {
    const ctx = ensureAudio();
    if (!ctx) return;

    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;

    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + durMs / 1000);

    o.connect(g);
    g.connect(ctx.destination);
    o.start(now);
    o.stop(now + durMs / 1000 + 0.02);
  }

  function playCoin() {
    playTone(1200, 45, "triangle", 0.14);
    setTimeout(() => playTone(900, 55, "triangle", 0.11), 25);
  }
  function playFlipSoft() {
    playTone(220, 45, "triangle", 0.05);
    setTimeout(() => playTone(330, 55, "triangle", 0.045), 15);
  }
  function playRare() {
    playTone(880, 140, "triangle", 0.22);
    setTimeout(() => playTone(1320, 150, "triangle", 0.18), 70);
  }
  function playMythic() {
    playTone(1046.5, 180, "sawtooth", 0.26);
    setTimeout(() => playTone(1568.0, 210, "sawtooth", 0.22), 60);
    setTimeout(() => playTone(2093.0, 240, "triangle", 0.18), 120);
  }
  function playHalo() {
    playTone(988, 170, "triangle", 0.28);
    setTimeout(() => playTone(1318.5, 200, "triangle", 0.24), 60);
  }

  // (Set symbols agora são Keyrune + MTGJSON. Não cacheamos SVG por set.)

  /* =========================
     FOIL / TILT TRACKING
  ========================= */
  function attachFoilTilt(el, options = {}) {
  const maxTilt = options.maxTilt ?? 10;
  const inner = options.innerSelector ? el.querySelector(options.innerSelector) : null;

  // v4.1: no touch, tilt contínuo é caro — então vira "tap tilt"
  const mode = options.mode || (IS_COARSE ? "tap" : "hover");

  const applyFromEvent = (ev) => {
    const rect = el.getBoundingClientRect();
    const mx = ((ev.clientX - rect.left) / rect.width) * 100;
    const my = ((ev.clientY - rect.top) / rect.height) * 100;

    const dx = (mx - 50) / 50;
    const dy = (my - 50) / 50;

    const ry = clamp(dx * maxTilt, -maxTilt, maxTilt);
    const rx = clamp(-dy * maxTilt, -maxTilt, maxTilt);

    el.style.setProperty("--mx", clamp(mx, 0, 100).toFixed(2) + "%");
    el.style.setProperty("--my", clamp(my, 0, 100).toFixed(2) + "%");

    // compat Arcane-style (glare/shine usam pointer-x/y)
    el.style.setProperty("--pointer-x", clamp(mx, 0, 100).toFixed(2) + "%");
    el.style.setProperty("--pointer-y", clamp(my, 0, 100).toFixed(2) + "%");

    el.style.setProperty("--rx", rx.toFixed(2) + "deg");
    el.style.setProperty("--ry", ry.toFixed(2) + "deg");

    if (inner) {
      inner.style.setProperty("--rx", rx.toFixed(2) + "deg");
      inner.style.setProperty("--ry", ry.toFixed(2) + "deg");
    }
  };

  const reset = () => {
    el.style.setProperty("--mx", "50%");
    el.style.setProperty("--my", "50%");

    // compat Arcane-style
    el.style.setProperty("--pointer-x", "50%");
    el.style.setProperty("--pointer-y", "50%");
   
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    if (inner) {
      inner.style.setProperty("--rx", "0deg");
      inner.style.setProperty("--ry", "0deg");
    }
  };

  // evita duplicar listeners se a função for chamada de novo no mesmo elemento
  if (el.dataset.tiltAttached === "1") return;
  el.dataset.tiltAttached = "1";

  if (REDUCED_MOTION) {
    reset();
    return;
  }

  if (mode === "hover") {
    el.addEventListener("pointermove", applyFromEvent, { passive: true });
    el.addEventListener("pointerleave", reset, { passive: true });
    reset();
    return;
  }

  // mode === "tap" (touch)
  // aplica um tilt breve no toque e volta ao centro
  let tapTimer = null;

  el.addEventListener("pointerdown", (ev) => {
    // só reage a toque/pen no modo tap
    if (ev.pointerType === "mouse") return;
    applyFromEvent(ev);
    clearTimeout(tapTimer);
    tapTimer = setTimeout(reset, 180);
  }, { passive: true });

  el.addEventListener("pointerleave", reset, { passive: true });
  reset();
}

     /* =========================
     POOLS
  ========================= */
  function buildPools(tdmRaw, tdcRaw, spgRaw) {
    const tdm = tdmRaw.map(normalize);
    const tdc = tdcRaw.map(normalize);
    const spg = spgRaw.map(normalize);

    const tfCommons = tdm.filter((c) => c.rarity === "common" && !isBasicLand(c) && hasFinish(c, "foil"));
    const tfUncommons = tdm.filter((c) => c.rarity === "uncommon" && hasFinish(c, "foil"));

    let draconicCU = tdm.filter(
      (c) =>
        (c.rarity === "common" || c.rarity === "uncommon") &&
        hasFrame(c, "showcase") &&
        !hasFrame(c, "ghostfire") &&
        !isBorderless(c) &&
        !isBasicLand(c)
    );
    if (draconicCU.length === 0) {
      draconicCU = tdm.filter(
        (c) =>
          (c.rarity === "common" || c.rarity === "uncommon") &&
          !isBorderless(c) &&
          !isBasicLand(c)
      );
    }
    const draconicCUFoil = draconicCU.filter((c) => hasFinish(c, "foil"));

    const presence = tdm.filter((c) => isBasicLand(c) && c.full_art && inRangeCN(c, 272, 276));
    const eye = tdm.filter((c) => isBasicLand(c) && c.full_art && inRangeCN(c, 287, 291));

    const tfRaresMain = tdm.filter((c) => c.rarity === "rare" && hasFinish(c, "foil") && !isBorderless(c));
    const tfMythicsMain = tdm.filter((c) => c.rarity === "mythic" && hasFinish(c, "foil") && !isBorderless(c));

    const commanderBorderlessMythicLegends = tdc.filter(
      (c) =>
        c.rarity === "mythic" &&
        isBorderless(c) &&
        (c.type_line || "").includes("Legendary")
    );
    const commanderExtendedArtRares = tdc.filter(
      (c) =>
        c.rarity === "rare" &&
        (hasFrame(c, "extendedart") || isBorderless(c))
    );

    const ghostfire = tdm.filter((c) => hasFrame(c, "ghostfire"));
    const ghostfireTF = ghostfire.filter((c) => hasFinish(c, "foil"));
    const ghostfireHalo = ghostfire.filter((c) => hasFinish(c, "halofoil"));

    const reversibleBorderless = tdm.filter((c) => isBorderless(c) && (c.layout || "").includes("reversible"));
    const reversibleRare = reversibleBorderless.filter((c) => c.rarity === "rare");
    const reversibleMythic = reversibleBorderless.filter((c) => c.rarity === "mythic");

    const borderlessClanLike = tdm.filter((c) => isBorderless(c) && !isBasicLand(c) && !(c.layout || "").includes("reversible"));
    const clanRare = borderlessClanLike.filter((c) => c.rarity === "rare");
    const clanMythic = borderlessClanLike.filter((c) => c.rarity === "mythic");

    const storyRares = tdm.filter(
      (c) =>
        c.rarity === "rare" &&
        isBorderless(c) &&
        ((c.type_line || "").includes("Saga") ||
          (c.type_line || "").includes("Siege") ||
          isLand(c))
    );
    const elspethBorderless = tdm.filter(
      (c) =>
        c.rarity === "mythic" &&
        isBorderless(c) &&
        c.name.toLowerCase().includes("elspeth")
    );

    const dragonscaleFetch = spg.filter((c) => inRangeCN(c, 114, 118));
    const spgTraditionalFoil = spg.filter((c) => hasFinish(c, "foil") && !inRangeCN(c, 114, 118));

    const serialized = tdm.filter((c) => isSerialized(c));

    return {
      tdmAll: tdm,
      tfCommons,
      tfUncommons,
      draconicCU,
      draconicCUFoil,
      presence,
      eye,
      tfRaresMain,
      tfMythicsMain,
      commanderBorderlessMythicLegends,
      commanderExtendedArtRares,
      ghostfireTF,
      ghostfireHalo,
      reversibleRare,
      reversibleMythic,
      clanRare,
      clanMythic,
      storyRares,
      elspethBorderless,
      spgTraditionalFoil,
      dragonscaleFetch,
      serialized,
    };
  }

  function safePickFromPools(poolList) {
    for (const p of poolList) {
      const card = pickOne(p);
      if (card) return card;
    }
    return pickOne(allFallback) || null;
  }

  function pickBoosterFunNonFoil() {
    const cat = weightedChoice([
      { v: "clan_rare", w: 51.5 },
      { v: "clan_mythic", w: 8.2 },
      { v: "story_rare", w: 21.5 },
      { v: "elspeth", w: 0.7 },
      { v: "rev_rare", w: 6.4 },
      { v: "rev_mythic", w: 0.7 },
      { v: "fallback", w: 11.0 },
    ]);

    if (cat === "clan_rare") return safePickFromPools([pools.clanRare, pools.tfRaresMain]);
    if (cat === "clan_mythic") return safePickFromPools([pools.clanMythic, pools.tfMythicsMain]);
    if (cat === "story_rare") return safePickFromPools([pools.storyRares, pools.clanRare]);
    if (cat === "elspeth") return safePickFromPools([pools.elspethBorderless, pools.clanMythic]);
    if (cat === "rev_rare") return safePickFromPools([pools.reversibleRare, pools.clanRare]);
    if (cat === "rev_mythic") return safePickFromPools([pools.reversibleMythic, pools.clanMythic]);
    return safePickFromPools([pools.clanRare, pools.tfRaresMain, pools.tfUncommons]);
  }

  function pickBoosterFunFoilSpecial() {
    const cat = weightedChoice([
      { v: "clan", w: 49.5 },
      { v: "story", w: 18.4 },
      { v: "reversible", w: 5.9 },
      { v: "ghostfire_tf", w: 9.0 },
      { v: "ghostfire_halo", w: 1.0 },
      { v: "spg", w: 6.0 },
      { v: "dragonscale", w: 1.0 },
      { v: "serialized", w: 0.8 },
      { v: "fallback", w: 8.4 },
    ]);

    if (cat === "clan") return safePickFromPools([pools.clanRare, pools.clanMythic, pools.tfRaresMain]);
    if (cat === "story") return safePickFromPools([pools.storyRares, pools.clanRare]);
    if (cat === "reversible") return safePickFromPools([pools.reversibleRare, pools.reversibleMythic, pools.clanRare]);
    if (cat === "ghostfire_tf") return safePickFromPools([pools.ghostfireTF, pools.clanRare]);
    if (cat === "ghostfire_halo") return safePickFromPools([pools.ghostfireHalo, pools.ghostfireTF, pools.clanMythic]);
    if (cat === "spg") return safePickFromPools([pools.spgTraditionalFoil, pools.tfRaresMain]);
    if (cat === "dragonscale") return safePickFromPools([pools.dragonscaleFetch, pools.spgTraditionalFoil]);
    if (cat === "serialized") return safePickFromPools([pools.serialized, pools.clanMythic]);
    return safePickFromPools([pools.clanRare, pools.tfRaresMain, pools.tfUncommons]);
  }

  function makeEntry(slotLabel, card, flags = {}) {
    const finish = flags.finish || null; // "foil" | "halofoil" | null
    const kind = flags.kind || "card";   // "card" | "token"
    return {
      kind,
      slot: slotLabel,
      card: card || null,
      finish,
      revealed: false,
      flipped: false,
      isNew: false,
      isDup: false,
      price: 0,
    };
  }

  function pickEntryPrice(e) {
    if (!e.card || !e.card.prices) return 0;
    const p = e.card.prices;
    const useFoil = e.finish === "foil" || e.finish === "halofoil";
    const val = useFoil ? (p.usd_foil || p.usd || "0") : (p.usd || "0");
    return parsePrice(val);
  }

  function generateCollectorPack() {
    const entries = [];

    for (let i = 0; i < 4; i++)
      entries.push(makeEntry("TF Common/Dual", safePickFromPools([pools.tfCommons]), { finish: "foil" }));

    for (let i = 0; i < 3; i++)
      entries.push(makeEntry("TF Uncommon", safePickFromPools([pools.tfUncommons]), { finish: "foil" }));

    {
      const first = weightedChoice([
        { v: "common", w: 54.6 },
        { v: "uncommon", w: 45.4 },
      ]);
      const second = first === "common" ? "uncommon" : "common";
      let pool = pools.draconicCU.filter((x) => x.rarity === first);
      if (!pool.length) pool = pools.draconicCU.filter((x) => x.rarity === second);
      entries.push(makeEntry("Draconic Frame", safePickFromPools([pool, pools.draconicCU])));
    }

    {
      const first = weightedChoice([
        { v: "common", w: 54.6 },
        { v: "uncommon", w: 45.4 },
      ]);
      const second = first === "common" ? "uncommon" : "common";
      let pool = pools.draconicCUFoil.filter((x) => x.rarity === first);
      if (!pool.length) pool = pools.draconicCUFoil.filter((x) => x.rarity === second);
      entries.push(
        makeEntry("Draconic Frame", safePickFromPools([pool, pools.draconicCUFoil, pools.draconicCU]), { finish: "foil" })
      );
    }

    {
      const landType = weightedChoice([
        { v: "eye_nf", w: 16.7 },
        { v: "eye_tf", w: 8.3 },
        { v: "presence_tf", w: 75.0 },
      ]);
      let c = null, finish = null;
      if (landType === "eye_nf") { c = safePickFromPools([pools.eye]); finish = null; }
      if (landType === "eye_tf") { c = safePickFromPools([pools.eye.filter((x) => hasFinish(x, "foil")), pools.eye]); finish = "foil"; }
      if (landType === "presence_tf") { c = safePickFromPools([pools.presence.filter((x) => hasFinish(x, "foil")), pools.presence]); finish = "foil"; }
      entries.push(makeEntry("Basic Land (Booster Fun)", c, { finish }));
    }

    {
      const which = weightedChoice([
        { v: "rare", w: 85.7 },
        { v: "mythic", w: 14.3 },
      ]);
      const c =
        which === "rare"
          ? safePickFromPools([pools.tfRaresMain])
          : safePickFromPools([pools.tfMythicsMain, pools.tfRaresMain]);
      entries.push(makeEntry("Main Rare/Mythic", c, { finish: "foil" }));
    }

    {
      const which = weightedChoice([
        { v: "mythic", w: 11.1 },
        { v: "rare", w: 88.9 },
      ]);
      const c =
        which === "mythic"
          ? safePickFromPools([pools.commanderBorderlessMythicLegends, pools.commanderExtendedArtRares])
          : safePickFromPools([pools.commanderExtendedArtRares, pools.commanderBorderlessMythicLegends]);
      entries.push(makeEntry("Commander", c));
    }

    for (let i = 0; i < 2; i++) entries.push(makeEntry("Booster Fun", pickBoosterFunNonFoil()));

    {
      const c = pickBoosterFunFoilSpecial();
      const hasHalo = c && hasFinish(c, "halofoil");
      const finish = hasHalo && Math.random() < 0.18 ? "halofoil" : "foil";
      entries.push(makeEntry("Booster Fun (Special)", c, { finish }));
    }

    {
      const t = pickOne(tokenPool);
      entries.push(makeEntry("Token Foil (+1)", t, { kind: "token", finish: "foil" }));
    }

    return entries;
  }

  /* =========================
     LOG
  ========================= */
  function appendLogLine(text) {
    if (!UI.packLog) return;
    const li = document.createElement("li");
    li.textContent = text;
    UI.packLog.appendChild(li);
  }

  /* =========================
     MODAL
  ========================= */
  function openModalFor(entry) {
    if (!entry || !entry.card) return;

    // title + mana
    UI.modalTitle.textContent = entry.card.name || "—";
    UI.modalMana.textContent = entry.card.mana_cost || "";

    // type line with set/rarity/cn
    const setCode = (entry.card.set || "").toUpperCase();
    UI.modalLine.textContent = `${setCode} • ${entry.card.rarity || "—"} • #${entry.card.collector_number || "?"} • ${entry.card.type_line || "—"}`;

    // oracle
    UI.modalOracle.textContent = entry.card.oracle_text || "—";

    // PT / loyalty
    const hasPT = (entry.card.power && entry.card.toughness);
    UI.modalPT.textContent = hasPT ? `P/T: ${entry.card.power}/${entry.card.toughness}` : `P/T: —`;
    UI.modalLoyalty.textContent = entry.card.loyalty ? `Loyalty: ${entry.card.loyalty}` : `Loyalty: —`;

    // price
    const price = entry.price || pickEntryPrice(entry);
    UI.modalPrice.textContent = `Preço: ${money(price)}`;

    // slot line
    const treatment =
      entry.finish === "halofoil" ? "HALO" :
      entry.finish === "foil" ? "FOIL" : "NF";
    UI.modalSlot.textContent = `Slot: ${entry.slot} • ${treatment}`;

    // image
    UI.modalImg.src = entry.card.image || "";

    // foil fx on modal
    UI.modalFx.className = "modalFx";
    if (entry.finish === "foil" || entry.finish === "halofoil") {
      UI.modalFx.classList.add("foilFx");
      if (entry.finish === "halofoil") UI.modalFx.classList.add("haloFx");
      UI.modalFx.style.setProperty("--mx", "50%");
      UI.modalFx.style.setProperty("--my", "50%");
    }

    UI.modal.classList.remove("hidden");
    
    // Tilt/3D no modal (imagem)
const wrap = UI.modalImg?.closest(".modalImgWrap");
if (wrap) {
  wrap.style.setProperty("--rx", "0deg");
  wrap.style.setProperty("--ry", "0deg");
  wrap.style.setProperty("--mx", "50%");
  wrap.style.setProperty("--my", "50%");

  // v4.1: hover no desktop, tap no mobile
  attachFoilTilt(wrap, { maxTilt: 10, mode: IS_COARSE ? "tap" : "hover" });
}

  }

  function closeModal() {
    UI.modal.classList.add("hidden");
    UI.modalImg.removeAttribute("src");
    UI.modalFx.className = "modalFx";
  }

  UI.btnModalClose?.addEventListener("click", closeModal);
  UI.modal?.addEventListener("click", (e) => {
    if (e.target.classList.contains("modalBackdrop")) closeModal();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && UI.modal && !UI.modal.classList.contains("hidden")) closeModal();
  });

  UI.modal?.addEventListener("pointermove", (ev) => {
    if (!UI.modal || UI.modal.classList.contains("hidden")) return;
    if (!UI.modalFx) return;
    if (!UI.modalFx.classList.contains("foilFx") && !UI.modalFx.classList.contains("haloFx")) return;

    const rect = UI.modalImg.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 100;
    const y = ((ev.clientY - rect.top) / rect.height) * 100;
    UI.modalFx.style.setProperty("--mx", clamp(x, 0, 100).toFixed(2) + "%");
    UI.modalFx.style.setProperty("--my", clamp(y, 0, 100).toFixed(2) + "%");
  });

  /* =========================
     META LINE (set icon + name + price + treatment)
  ========================= */
function finishToLabel(finish) {
  const f = String(finish || "nonfoil").toLowerCase();

  // Labels “humanos” (e já preparados pro laboratório FF)
  if (f === "surgefoil" || f === "surge") return "SURGE";
  if (f === "halofoil" || f === "halo") return "HALO";
  if (f === "etched" || f === "etchedfoil") return "ETCHED";
  if (f === "gilded") return "GILDED";
  if (f === "foil") return "FOIL";
  if (f === "nonfoil" || f === "nf") return "NF";

  // fallback genérico (não quebra se vier algo novo do Scryfall)
  return f.toUpperCase();
}

function finishToClass(finish) {
  const f = String(finish || "nonfoil").toLowerCase();
  if (f.includes("surge")) return "finish-surge";
  if (f.includes("halo")) return "finish-halo";
  if (f.includes("etched")) return "finish-etched";
  if (f.includes("gilded")) return "finish-gilded";
  if (f === "foil") return "finish-foil";
  return "finish-nf";
}

function ensureMetaLine(cardEl, entry) {
  const old = cardEl.querySelector(".cardMetaLine");
  if (old) old.remove();

  const setCode = entry.card?.set || "";
  const r = entry.card?.rarity || "common";
  const keyrune = getKeyruneCodeFromSet(setCode);

  // símbolo real do set (Keyrune), com raridade embutida pela classe
  const icon = document.createElement("i");
  icon.className = `ss ss-${keyrune} ss-fw ${rarityToKeyruneClass(r)} setSymbol`;
  icon.title = setCode ? setCode.toUpperCase() : "";

  const name = document.createElement("span");
  name.className = "cardName";
  name.textContent = entry.card?.name || "—";
  name.title = "Abrir preview";
  name.addEventListener("click", (ev) => {
    ev.stopPropagation();
    openModalFor(entry);
  });

  // badge de tratamento (SURGE / FOIL / etc)
  const finishLabel = finishToLabel(entry.finish);
  const badge = document.createElement("span");
  badge.className = `finishBadge ${finishToClass(entry.finish)}`;
  badge.textContent = finishLabel;
  badge.title = finishLabel;

  // preço separado (fica mais “catálogo”)
  const price = document.createElement("span");
  price.className = "cardPrice";
  price.textContent = money(entry.price || 0);

  const right = document.createElement("span");
  right.className = "metaRight";
  right.appendChild(badge);
  right.appendChild(price);

  const line = document.createElement("div");
  line.className = "cardMetaLine";
  line.appendChild(icon);
  line.appendChild(name);
  line.appendChild(right);

  cardEl.appendChild(line);
}

  /* =========================
     STATS
  ========================= */
  function getRevealedTotals() {
    let total = 0;
    let rares = 0;
    let mythics = 0;
    let foils = 0;
    let halos = 0;

    for (const e of currentPack) {
      if (!e.revealed) continue;
      total += e.price || 0;

      const r = e.card?.rarity;
      if (r === "rare") rares++;
      if (r === "mythic") mythics++;

      if (e.finish === "foil") foils++;
      if (e.finish === "halofoil") halos++;
    }

    return { total, rares, mythics, foils, halos };
  }

  function percentileForValue(value) {
    if (!packStats || !Array.isArray(packStats.pcts) || packStats.pcts.length < 2) return null;
    let lo = 0, hi = 100;
    while (lo < hi) {
      const mid = Math.floor((lo + hi + 1) / 2);
      if (packStats.pcts[mid] <= value) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }
  function qualityTier(p) {
  if (p < 10) return "Terrible";
  if (p < 30) return "Bad";
  if (p < 55) return "Mid";
  if (p < 80) return "Good";
  return "Amazing";
}


  function updateStatsUI() {
    const cost = getBoosterCost();
    const { total, rares, mythics, foils, halos } = getRevealedTotals();

    if (UI.packValue) UI.packValue.textContent = money(total);
    if (UI.boosterCostLabel) UI.boosterCostLabel.textContent = money(cost);
    if (UI.packProfit) UI.packProfit.textContent = money(total - cost);
    UI.packMoney?.classList.remove("hidden");

    UI.boosterStats?.classList.remove("hidden");
    UI.mainStats?.classList.remove("hidden");
    UI.qualityBarWrap?.classList.remove("hidden");
    UI.stickyStats?.classList.remove("hidden");

    if (UI.statMarketPrice) UI.statMarketPrice.textContent = money(cost);
    if (packStats) {
      UI.statEV.textContent = money(packStats.ev || 0);
      UI.statMedian.textContent = money(packStats.median || 0);
    } else {
      UI.statEV.textContent = "—";
      UI.statMedian.textContent = "—";
    }

    UI.mainTotal.textContent = money(total);
    UI.mainRM.textContent = `${rares} / ${mythics}`;
    UI.mainFoils.textContent = `${foils} / ${halos}`;

    let compared = "—";
    if (packStats && isFinite(packStats.ev)) {
      const delta = total - packStats.ev;
      const pct = packStats.ev > 0 ? (delta / packStats.ev) * 100 : 0;
      const sign = delta >= 0 ? "+" : "";
      compared = `${sign}${money(delta)} (${sign}${pct.toFixed(0)}%)`;
    }
    UI.mainCompared.textContent = compared;

    let qText = "—";
    let qPct = 0;
    if (packStats) {
      const p = percentileForValue(total);
      if (p != null) {
const tier = qualityTier(p);

qText = `${tier} • ${p}º pct`;
qPct = clamp(p, 0, 100);

UI.qualityFill.style.width = qPct + "%";
UI.qualityLabel.textContent = qText;
UI.qualityHint.textContent = `Seu total atual está acima de ${p}% dos boosters simulados.`;

// sticky: Arcane style (só o texto)
UI.stickyQuality.textContent = tier;

      } else {
        UI.qualityFill.style.width = "0%";
        UI.qualityLabel.textContent = "—";
        UI.qualityHint.textContent = "—";
      }
    } else {
      UI.qualityFill.style.width = "0%";
      UI.qualityLabel.textContent = "Calculando…";
      UI.qualityHint.textContent = "Gerando distribuição (EV/Mediana/Percentis)…";
    }

// Total
UI.stickyTotal.textContent = money(total);

// vs EV (cor dinâmica)
UI.stickyCompared.textContent = compared;
const evValue = packStats?.ev ?? null;

UI.stickyCompared.classList.toggle("positive", evValue != null && total >= evValue);
UI.stickyCompared.classList.toggle("negative", evValue != null && total < evValue);


// Mythics / Rares
UI.stickyMythic.textContent = mythics;
UI.stickyRare.textContent = rares;

// Foils (commons + uncommons)
UI.stickyFoilUnc.textContent = foils;
UI.stickyFoilCom.textContent = halos;

// Qualidade do booster
// stickyQuality já foi setado como tier lá em cima quando packStats existe
if (!packStats) UI.stickyQuality.textContent = "…";

  }

  /* =========================
     PACK DISTRIBUTION (EV / Median / Percentiles)
  ========================= */
  function loadPackStatsCache() {
    const cached = safeJsonParse(localStorage.getItem(PACK_STATS_KEY));
    if (!cached || !cached.createdAt || !cached.pcts) return null;
    const ageH = (Date.now() - cached.createdAt) / (1000 * 60 * 60);
    if (ageH > 24) return null;
    return cached;
  }
  function savePackStatsCache(stats) {
    try {
      localStorage.setItem(PACK_STATS_KEY, JSON.stringify({ createdAt: Date.now(), ...stats }));
    } catch {}
  }
  function percentileArray(sortedValues) {
    const pcts = [];
    const n = sortedValues.length;
    for (let p = 0; p <= 100; p++) {
      const idx = Math.floor((p / 100) * (n - 1));
      pcts.push(sortedValues[idx]);
    }
    return pcts;
  }

  async function computePackStats(samples = 1600) {
    const values = [];
    let sum = 0;

    for (let i = 0; i < samples; i++) {
      const pack = generateCollectorPack();
      let total = 0;
      for (const e of pack) {
        e.price = pickEntryPrice(e);
        total += e.price || 0;
      }
      values.push(total);
      sum += total;

      if (i % 120 === 0) {
        UI.qualityLabel.textContent = `Calculando… ${Math.floor((i / samples) * 100)}%`;
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    values.sort((a, b) => a - b);
    const ev = sum / samples;
    const median = values[Math.floor(values.length / 2)];
    const pcts = percentileArray(values);

    const out = { ev, median, pcts, samples };
    packStats = out;
    savePackStatsCache(out);
    updateStatsUI();
    setStatus("ok", "Distribuição calculada (EV/Mediana/Qualidade).");
  }

  async function ensurePackStats() {
    const cached = loadPackStatsCache();
    if (cached) {
      packStats = cached;
      updateStatsUI();
      return;
    }
    packStats = null;
    updateStatsUI();
    await computePackStats(1600);
  }

  /* =========================
     RENDER / REVEAL (com flip de reveal)
  ========================= */
  function clearOpeningUI() {
    UI.cardGrid.innerHTML = "";
    UI.packLog.innerHTML = "";
    UI.revealCount.textContent = "0";
    UI.revealTotal.textContent = "0";
    revealedCount = 0;

    UI.packMoney.classList.add("hidden");
    UI.boosterStats?.classList.add("hidden");
    UI.mainStats?.classList.add("hidden");
    UI.qualityBarWrap?.classList.add("hidden");
    UI.stickyStats?.classList.add("hidden");
  }

  function renderFacedown(entries) {
    UI.revealTotal.textContent = String(entries.length);
    UI.revealCount.textContent = "0";
    revealedCount = 0;
    UI.cardGrid.innerHTML = "";

    entries.forEach((e, idx) => {
      const card = document.createElement("div");
      card.className = "card facedown"; // 👈 começa mostrando o verso
      card.dataset.index = String(idx);

      card.innerHTML = `
        <div class="cardInner">
          <div class="cardFace cardBack"></div>
          <div class="cardFace cardFront">
            <img alt="" loading="lazy"/>
            <div class="cardFx"></div>
            <div class="cardGlare"></div>
          </div>
        </div>
      `;

      // tilt/foil tracking
      attachFoilTilt(card, { innerSelector: ".cardInner", maxTilt: 12 });

      card.addEventListener("click", (ev) => {
        if (ev.target.closest(".cardMetaLine")) return; // nome abre preview
        const i = parseInt(card.dataset.index, 10);
        const entry = currentPack[i];
        if (!entry) return;

        if (!entry.revealed) {
          revealAtIndex(i); // revelação vira a carta
        } else {
          // flip manual (dual-face)
          card.classList.toggle("flipped");
          entry.flipped = card.classList.contains("flipped");
        }
      });

      UI.cardGrid.appendChild(card);
    });
  }

  function revealAtIndex(i) {
    const entry = currentPack[i];
    if (!entry || entry.revealed) return;

    entry.revealed = true;

    if (entry.card) {
      const key = `${entry.card.set}:${entry.card.id}`;
      const before = getCountForKey(key);
      entry.isNew = before === 0;
      entry.isDup = before > 0;
      entry.price = pickEntryPrice(entry);
    }

    const cardEl = UI.cardGrid.querySelector(`.card[data-index="${i}"]`);
    if (cardEl) {
      const img = cardEl.querySelector("img");
      const backFace = cardEl.querySelector(".cardBack");

      cardEl.classList.add("revealed");
      cardEl.classList.remove("rarity-common", "rarity-uncommon", "rarity-rare", "rarity-mythic", "rarity-token");
	  
	  // limpa classes de finish (pra não “vazar” visual entre cartas)
      cardEl.classList.remove(
      "foil",
      "halo",
      "surge",
      "etched",
      "gilded"
     );


      if (entry.kind === "token") cardEl.classList.add("rarity-token");
      else cardEl.classList.add(rarityClass(entry.card?.rarity));

      const f = String(entry.finish || "nonfoil").toLowerCase();
      if (f === "foil") cardEl.classList.add("foil");
      if (f.includes("halo")) cardEl.classList.add("halo");
      if (f.includes("surge")) cardEl.classList.add("surge");
      if (f.includes("etched")) cardEl.classList.add("etched");
      if (f.includes("gilded")) cardEl.classList.add("gilded");


      if (entry.isNew) cardEl.classList.add("newCard");
      if (entry.isDup) cardEl.classList.add("dupCard");

      // front image
      if (img) {
        if (entry.card && entry.card.image) img.src = entry.card.image;
        else img.removeAttribute("src");
      }

      // dual-face: face 2 no "verso" quando existir
      const face2img = entry.card?.faces?.[1]?.image;
      if (face2img && backFace) {
        backFace.style.backgroundImage = `url("${face2img}")`;
        backFace.style.backgroundSize = "cover";
        backFace.style.backgroundPosition = "center";
      } else if (backFace) {
        // se não for dual-face, mantém o back padrão do CSS (Magic back)
        backFace.style.removeProperty("background-image");
        backFace.style.removeProperty("background-size");
        backFace.style.removeProperty("background-position");
      }

      // 👇 REVEAL COM FLIP: sai do "facedown" e mostra a frente
      cardEl.classList.remove("facedown");
      cardEl.classList.add("revealFlip");
      // pequena limpeza depois da animação
      setTimeout(() => cardEl.classList.remove("revealFlip"), 2450);

      // som: flip soft + raridade (HALO prior)
      if (soundOn) playFlipSoft();
      const r = entry.card?.rarity || "";
      if (entry.finish === "halofoil") {
        if (soundOn) playHalo();
      } else if (r === "mythic") {
        if (soundOn) playMythic();
      } else if (r === "rare") {
        if (soundOn) playRare();
      } else {
        if (soundOn) playCoin();
      }

      ensureMetaLine(cardEl, entry);
    }

    // log + collection progress
    if (entry.card) {
      const finishIcon = entry.finish === "foil" ? "💿" : entry.finish === "halofoil" ? "✨" : "";
      const nd = entry.isNew ? "🆕" : "🔁";
      appendLogLine(`${entry.slot}: ${entry.card.name} (${entry.card.set.toUpperCase()} • ${entry.card.rarity || "—"}) ${finishIcon} ${nd} • ${money(entry.price)}`);
      addToCollectionCard(entry.card, entry.finish);
    } else {
      appendLogLine(`${entry.slot}: ⚠️ (sem carta)`);
    }

    revealedCount = currentPack.reduce((a, e) => a + (e.revealed ? 1 : 0), 0);
    UI.revealCount.textContent = String(revealedCount);

    refreshBinderUI();
    updateStatsUI();

    if (revealedCount >= currentPack.length) {
      stopAuto();
      UI.btnNext.disabled = true;
      UI.btnToLand.disabled = true;
      UI.btnAll.disabled = true;
      finalizeVault();
      UI.summary.textContent = "Tudo revelado.";
    } else {
      UI.btnNext.disabled = false;
      UI.btnToLand.disabled = false;
      UI.btnAll.disabled = false;
    }
  }

  function nextUnrevealedIndex() {
    for (let i = 0; i < currentPack.length; i++) {
      if (!currentPack[i].revealed) return i;
    }
    return -1;
  }

  function revealNext() {
    const i = nextUnrevealedIndex();
    if (i === -1) return true;
    revealAtIndex(i);
    return nextUnrevealedIndex() === -1;
  }

  function revealUntilLand() {
    stopAuto();
    for (let i = 0; i < currentPack.length; i++) {
      if (!currentPack[i].revealed) revealAtIndex(i);
      if (currentPack[i].slot && String(currentPack[i].slot).startsWith("Basic Land")) break;
    }
  }

  async function revealAll() {
    stopAuto();
    UI.btnNext.disabled = true;
    UI.btnToLand.disabled = true;
    UI.btnAll.disabled = true;

    for (let i = 0; i < currentPack.length; i++) {
      if (!currentPack[i].revealed) {
        revealAtIndex(i);
        await new Promise((r) => setTimeout(r, 40));
      }
    }
  }

  /* =========================
     VAULT FINALIZE
  ========================= */
  function finalizeVault() {
    const boosterCost = getBoosterCost();
    const total = currentPack.reduce((a, e) => a + ((e.revealed ? e.price : 0) || 0), 0);
    const profit = total - boosterCost;

    const hits = currentPack
      .filter((e) => e.card && e.revealed)
      .filter((e) => e.card.rarity === "mythic" || e.finish === "halofoil" || (e.price || 0) >= 10)
      .slice(0, 10)
      .map((e) => `${e.card.name}${e.finish ? " (" + e.finish + ")" : ""}`);

    const vault = getVault();
    vault.push({
      openedAt: new Date().toISOString(),
      boosterCost,
      packValue: total,
      profit,
      hits,
      cards: currentPack
        .filter((e) => e.card && e.revealed)
        .map((e) => ({
          name: e.card.name,
          set: e.card.set,
          cn: e.card.collector_number,
          rarity: e.card.rarity,
          finish: e.finish || "nf",
          price: e.price || 0,
        })),
    });

    setVault(vault);
    refreshVaultUI();
  }

  /* =========================
     BINDER
  ========================= */
  function buildBinderIndexFromTDM() {
    if (!pools?.tdmAll) return;

    const m = new Map();
    let max = 0;

    for (const c of pools.tdmAll) {
      const n = numCN(c.collector_number);
      if (!n) continue;

      const prev = m.get(n);
      if (!prev) m.set(n, c);
      else {
        const score = (x) => (x.image ? 2 : 0) + (x.full_art ? 1 : 0) + (x.rarity === "mythic" ? 0.2 : 0);
        if (score(c) > score(prev)) m.set(n, c);
      }
      if (n > max) max = n;
    }

    binderIndex = m;
    binderMax = max;

    try {
      const compact = {
        createdAt: Date.now(),
        max: binderMax,
        cards: Array.from(m.entries()).map(([n, c]) => ({
          n,
          id: c.id,
          name: c.name,
          rarity: c.rarity,
          set: c.set,
          cn: c.collector_number,
          image: c.image || "",
          finishes: c.finishes || [],
        })),
      };
      localStorage.setItem(BINDER_KEY, JSON.stringify(compact));
    } catch {}
  }

  function loadBinderCache() {
    const cached = safeJsonParse(localStorage.getItem(BINDER_KEY));
    if (!cached || !cached.createdAt) return false;
    const ageH = (Date.now() - cached.createdAt) / (1000 * 60 * 60);
    if (ageH > 168) return false;

    binderMax = cached.max || 0;
    binderIndex = new Map();
    for (const it of cached.cards || []) {
      binderIndex.set(it.n, {
        id: it.id,
        name: it.name,
        rarity: it.rarity,
        set: it.set,
        collector_number: it.cn,
        image: it.image,
        finishes: it.finishes || [],
        prices: {}, // não precisamos de preço no binder por enquanto
      });
    }
    return binderMax > 0;
  }

  function refreshBinderUI() {
    if (!binderIndex || !binderMax || !UI.binderGrid || !UI.binderStats) return;

    const col = getCollection();
    const countByCN = new Map();
    const foilByCN = new Map();
    const haloByCN = new Map();
    for (const key in col) {
      const e = col[key];
      if (!e || e.set !== "tdm") continue;
      const n = numCN(e.collector_number);
      if (!n) continue;
      countByCN.set(n, (countByCN.get(n) || 0) + e.count);
      if ((e.foilCount || 0) > 0) foilByCN.set(n, true);
      if ((e.haloCount || 0) > 0) haloByCN.set(n, true);
    }

    let owned = 0;
    for (let n = 1; n <= binderMax; n++) if (countByCN.get(n)) owned++;

    UI.binderStats.textContent = `TDM: ${owned}/${binderMax} slots desbloqueados`;

    if (UI.binderPanel?.classList.contains("hidden")) return;

    UI.binderGrid.innerHTML = "";

    for (let n = 1; n <= binderMax; n++) {
      const c = binderIndex.get(n);
      const cnt = countByCN.get(n) || 0;

      const slotExists = !!c;
      const unlocked = cnt > 0 && slotExists;

      const cell = document.createElement("div");
      cell.className = "binderCell " + (unlocked ? "owned" : "missing");
      if (!unlocked) cell.classList.add("noCard"); // não clicável + escurece via CSS
      cell.dataset.rarity = c?.rarity || "common";

      const thumb = document.createElement("div");
      thumb.className = "binderThumb";

      if (slotExists && c.image) {
        const img = document.createElement("img");
        img.src = c.image;
        img.alt = c.name;
        img.loading = "lazy";
        thumb.appendChild(img);

        // tilt/foil vars no binder também
        attachFoilTilt(cell, { maxTilt: 10 });
        if (foilByCN.get(n) || haloByCN.get(n)) {
        cell.classList.add("foilEligible");
        }
        
      } else {
        thumb.innerHTML = `<div class="binderEmpty">#${String(n).padStart(3, "0")}</div>`;
      }

      cell.innerHTML = `
        <div class="binderMeta">
          <span class="binderNum">#${String(n).padStart(3, "0")}</span>
          <span class="binderCount">${unlocked ? "x" + cnt : "—"}</span>
        </div>
      `;
      cell.prepend(thumb);

      if (unlocked) {
        cell.classList.remove("noCard");
        cell.addEventListener("click", () => {
          const fakeEntry = {
            slot: `Binder #${String(n).padStart(3, "0")}`,
            card: c,
            finish: (haloByCN.get(n) ? "halofoil" : (foilByCN.get(n) ? "foil" : null)),
            isNew: false,
            isDup: cnt > 1,
            price: 0,
          };
          openModalFor(fakeEntry);
        });
      }

      UI.binderGrid.appendChild(cell);
    }
  }

  /* =========================
     DATA LOAD
  ========================= */
  UI.btnLoad?.addEventListener("click", async () => {
    try {
      setStatus("load", "Carregando do Scryfall…");
      UI.btnLoad.disabled = true;

      const binderOk = loadBinderCache();
      await ensureSetIcons();

      const cached = loadSmallCache();
      if (cached && cached.pools) {
        pools = cached.pools;
        tokenPool = cached.tokenPool || [];
        allFallback = cached.allFallback || [];

        if (!binderOk) buildBinderIndexFromTDM();

        setStatus("ok", "Carregado do cache. Pronto 😈");
        enableAfterLoad();
        UI.btnLoad.disabled = false;

        refreshVaultUI();
        refreshBinderUI();

        await ensurePackStats();
        return;
      }

      const tdmUrl = "https://api.scryfall.com/cards/search?order=set&q=set:tdm&unique=prints";
      const tdcUrl = "https://api.scryfall.com/cards/search?order=set&q=set:tdc&unique=prints";
      const spgUrl = "https://api.scryfall.com/cards/search?order=set&q=set:spg&unique=prints";
      const ttdmUrl = "https://api.scryfall.com/cards/search?order=set&q=set:ttdm&unique=prints";

      const [tdm, tdc, spg, ttdm] = await Promise.all([
        fetchAllPages(tdmUrl),
        fetchAllPages(tdcUrl),
        fetchAllPages(spgUrl),
        fetchAllPages(ttdmUrl),
      ]);

      pools = buildPools(tdm, tdc, spg);
      tokenPool = ttdm.map(normalize).filter((x) => x.image);

      allFallback = [
        ...pools.clanRare,
        ...pools.clanMythic,
        ...pools.tfRaresMain,
        ...pools.tfMythicsMain,
        ...pools.tfUncommons,
        ...pools.tfCommons,
        ...pools.storyRares,
        ...pools.reversibleRare,
        ...pools.reversibleMythic,
        ...pools.ghostfireTF,
        ...pools.spgTraditionalFoil,
      ].filter(Boolean);

      buildBinderIndexFromTDM();
      saveSmallCache({ pools, tokenPool, allFallback });

      setStatus("ok", "Carregado. Abre o Collector 😈");
      enableAfterLoad();
      UI.btnLoad.disabled = false;

      refreshVaultUI();
      refreshBinderUI();

      await ensurePackStats();
    } catch (err) {
      console.error(err);
      setStatus("bad", "Erro ao carregar. Abre o console e cola a primeira linha do erro aqui.");
      UI.btnLoad.disabled = false;
    }
  });

  function enableAfterLoad() {
    UI.btnOpen.disabled = false;
    UI.btnAuto.disabled = false;
    UI.btnAll.disabled = false;
    UI.btnLog.disabled = false;
    UI.btnVault.disabled = false;
    UI.btnBinder.disabled = false;
  }

  /* =========================
     OPEN PACK
  ========================= */
  UI.btnOpen?.addEventListener("click", () => {
    if (!pools) {
      setStatus("bad", "Clique em “Carregar cartas” primeiro.");
      return;
    }
    if (!tokenPool.length) {
      setStatus("bad", "Tokens (TTDM) não carregaram.");
      return;
    }

    stopAuto();
    clearOpeningUI();

    currentPack = generateCollectorPack();
    renderFacedown(currentPack);

    UI.btnNext.disabled = false;
    UI.btnToLand.disabled = false;
    UI.btnAll.disabled = false;

    UI.summary.textContent = "Pack preparado. Revela na ordem que você quiser.";
    setStatus("ok", "Clique no verso pra revelar (flip). Depois, clique na revelada pra virar.");

    updateStatsUI();
  });

  UI.btnNext?.addEventListener("click", () => revealNext());
  UI.btnToLand?.addEventListener("click", revealUntilLand);
  UI.btnAll?.addEventListener("click", revealAll);

  /* =========================
     AUTO
  ========================= */
  function stopAuto() {
    autoMode = false;
    if (UI.btnAuto) UI.btnAuto.textContent = "Auto: OFF";
    if (autoTimer) clearTimeout(autoTimer);
    autoTimer = null;
  }

  function setAuto(on) {
    autoMode = on;
    if (UI.btnAuto) UI.btnAuto.textContent = on ? "Auto: ON" : "Auto: OFF";
    if (!on) return;

    const tick = () => {
      if (!autoMode) return;
      const done = revealNext();
      if (done) {
        stopAuto();
        return;
      }
      autoTimer = setTimeout(tick, 520);
    };
    autoTimer = setTimeout(tick, 220);
  }

  UI.btnAuto?.addEventListener("click", () => {
    if (!currentPack.length) {
      setStatus("bad", "Abra um pack primeiro.");
      return;
    }
    setAuto(!autoMode);
  });

  UI.btnSound?.addEventListener("click", () => {
    soundOn = !soundOn;
    UI.btnSound.textContent = soundOn ? "Som: ON" : "Som: OFF";
    if (soundOn) ensureAudio();
  });

  /* =========================
     PANELS
  ========================= */
  UI.btnLog?.addEventListener("click", () => UI.logPanel.classList.toggle("hidden"));

  UI.btnVault?.addEventListener("click", () => {
    UI.vaultPanel.classList.toggle("hidden");
    refreshVaultUI();
  });

  UI.btnBinder?.addEventListener("click", () => {
    UI.binderPanel.classList.toggle("hidden");
    refreshBinderUI();
  });

  UI.btnVaultClear?.addEventListener("click", () => {
    if (!confirm("Limpar todo o Vault?")) return;
    localStorage.removeItem(VAULT_KEY);
    refreshVaultUI();
    setStatus("ok", "Vault limpo.");
  });

  UI.btnWipeCache?.addEventListener("click", () => {
    localStorage.removeItem(SMALL_CACHE_KEY);
    localStorage.removeItem(BINDER_KEY);
    localStorage.removeItem(MTGJSON_SETLIST_KEY);
    localStorage.removeItem(PACK_STATS_KEY);
    setStatus("", "Cache limpo. Clique em “Carregar cartas”.");
  });

  /* =========================
     RESET TOTAL (coleção + binder progress + vault)
  ========================= */
  UI.btnResetAll?.addEventListener("click", () => {
    const ok = confirm("RESET TOTAL: apagar coleção/progresso do Binder e Vault?\n\nIsso não apaga o cache do Scryfall.");
    if (!ok) return;

    localStorage.removeItem(COLLECTION_KEY);
    localStorage.removeItem(VAULT_KEY);

    stopAuto();
    currentPack = [];
    revealedCount = 0;
    clearOpeningUI();

    refreshVaultUI();
    refreshBinderUI();

    setStatus("ok", "Reset total feito. Começo limpo. 😈");
    UI.summary.textContent = "—";
  });

  /* =========================
     BOOT
  ========================= */
  setStatus("", "Clique em “Carregar cartas”.");
  refreshVaultUI();
  refreshBinderUI();
});