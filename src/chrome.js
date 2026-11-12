// Japanese Village chrome: quiet-by-default controls, hand-drawn ema rail.
// UI layer only - the scene, creatures and sound engine live in main.js and
// are owned by other lanes; this module only rearranges and dresses the DOM
// those files already create (ids, handlers and storage keys unchanged).

const PIN_KEY = "jv-chrome-pin";
const TOP_ZONE = 96;
const BOTTOM_ZONE = 150;
const RETIRE_MS = 2600;

const stroke = (d, extra = "") =>
  `<path d="${d}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const icon = (body) =>
  `<svg class="ink-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;

// Sumi-e strokes for the six landscapes.
const PLACE_ICONS = {
  // torii gate
  Shrine: icon(
    stroke("M4 6.4 C 9 5.2, 15 5.4, 20 6.2") +
      stroke("M5.4 9.6 C 10 8.6, 14.4 8.7, 18.8 9.5") +
      stroke("M7.2 9.8 C 7.1 13.4, 7.2 17, 7 20.4") +
      stroke("M16.8 9.7 C 16.9 13.3, 16.8 17, 17 20.3"),
  ),
  // rice terrace rows
  Rice: icon(
    stroke("M3.4 7.2 C 8 6.4, 15 6.6, 20.6 7") +
      stroke("M3.2 12.2 C 8.4 11.3, 14.8 11.5, 20.8 12") +
      stroke("M3.5 17.2 C 8.2 16.3, 15.2 16.5, 20.4 17") +
      stroke("M8 4.4 C 8.2 6, 8.1 7.2, 8 8.6 M 12.2 4.2 C 12.3 5.8, 12.2 7, 12.2 8.4 M 16.4 4.5 C 16.5 6, 16.4 7.2, 16.4 8.5", 'stroke-width="1.8"'),
  ),
  // bamboo stalk and leaves
  Bamboo: icon(
    stroke("M9.5 20.4 C 9.4 14.6, 9.6 8.8, 9.4 3.6") +
      stroke("M8.4 8.4 C 9.2 8.5, 10 8.5, 10.7 8.4 M 8.5 13.6 C 9.3 13.7, 10.1 13.7, 10.8 13.6", 'stroke-width="1.8"') +
      stroke("M13.8 6.4 C 15.8 5, 17.6 4.6, 19.6 4.8 C 18.4 6.6, 16.4 7.2, 13.8 6.4 Z", "fill='currentColor'") +
      stroke("M13.6 11.2 C 15.4 10.4, 17.2 10.4, 19 11 C 17.6 12.2, 15.4 12.2, 13.6 11.2 Z", "fill='currentColor'"),
  ),
  // sakura blossom
  Sakura: icon(
    stroke("M12 10.4 C 10.6 7.6, 10.6 5.2, 12 3.6 C 13.4 5.2, 13.4 7.6, 12 10.4 Z") +
      stroke("M13.2 11.6 C 15.8 10.4, 18.2 10.4, 19.8 11.6 C 18.6 13.2, 16 13.2, 13.2 11.6 Z") +
      stroke("M12.4 13.4 C 14.2 15.8, 14.6 18.2, 13.6 20 C 11.8 19.2, 11.2 16.6, 12.4 13.4 Z") +
      stroke("M10.6 12.8 C 8.2 14.6, 5.8 15, 4.2 14 C 5.2 12.2, 7.8 11.6, 10.6 12.8 Z") +
      stroke("M10.8 10.8 C 8.6 9.2, 7.6 6.8, 8.2 5 C 10.2 5.4, 11.4 7.6, 10.8 10.8 Z"),
  ),
  // snow lantern (yukimi-doro)
  Snow: icon(
    stroke("M5.4 6.8 C 8 4.6, 16 4.6, 18.6 6.8 C 16.4 8.4, 14 9, 12 9 C 10 9, 7.4 8.4, 5.4 6.8 Z") +
      stroke("M9.6 9.4 C 9.5 11, 9.5 12, 9.6 13 L 14.4 13 C 14.5 12, 14.5 11, 14.4 9.4") +
      stroke("M11 13.2 C 11 15.4, 10.9 17.4, 11 19.4 M 13 13.2 C 13 15.4, 13.1 17.4, 13 19.4", 'stroke-width="2"') +
      stroke("M8.2 20.2 C 10.4 19.6, 13.6 19.6, 15.8 20.2"),
  ),
  // tea bowl with steam
  Tea: icon(
    stroke("M5.6 12.6 C 6 17, 8.6 19.4, 12 19.4 C 15.4 19.4, 18 17, 18.4 12.6 C 14.4 13.4, 9.6 13.4, 5.6 12.6 Z") +
      stroke("M9.4 8.6 C 9 7.4, 9.8 6.6, 9.4 5.4 M 13.4 9 C 13 7.8, 13.8 7, 13.4 5.8", 'stroke-width="2"') +
      stroke("M9.6 21 C 11 20.7, 13 20.7, 14.4 21", 'stroke-width="2"'),
  ),
};

const ICON_RESET = icon(
  stroke("M19.2 12.2 C 19.1 16.2, 15.9 19.3, 11.9 19.2 C 8 19.1, 5 16, 5.1 12 C 5.2 8.1, 8.4 5, 12.3 5.1 C 14.7 5.2, 16.8 6.3, 18.1 8.1") +
    stroke("M18.4 4.4 C 18.5 6, 18.4 7.4, 18.2 8.9 C 16.6 8.5, 15.2 8.2, 13.7 8"),
);
const ICON_PIN = (pinned) =>
  icon(
    pinned
      ? `<path d="M13.8 3.4 C 15.8 6, 17.8 8, 20.6 10.2 C 17.4 11, 15.4 12, 13.4 13.4 C 12.8 15.4, 12.6 17.4, 12.8 19.6 C 10.8 17.6, 8.6 15.8, 6.6 14 C 8.6 13.4, 10.4 12.8, 12 11.8 C 12.8 9.2, 13.4 6.4, 13.8 3.4 Z" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`
      : `<path d="M13.8 3.4 C 15.8 6, 17.8 8, 20.6 10.2 C 17.4 11, 15.4 12, 13.4 13.4 C 12.8 15.4, 12.6 17.4, 12.8 19.6 C 10.8 17.6, 8.6 15.8, 6.6 14 C 8.6 13.4, 10.4 12.8, 12 11.8 C 12.8 9.2, 13.4 6.4, 13.8 3.4 Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>`,
  );
const CHOCHIN = `<svg class="ink-chochin" viewBox="0 0 36 66" aria-hidden="true" focusable="false">
  <path d="M18 1.5 C 18 4, 18 5.5, 18 7.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M12.5 8.5 C 15.5 7.4, 20.5 7.4, 23.5 8.5 L 23 11.5 C 19.5 10.6, 16.5 10.6, 13 11.5 Z" fill="currentColor"/>
  <path d="M10.5 13.5 C 6.5 21, 6.5 31, 10.5 38.5 C 15 41.5, 21 41.5, 25.5 38.5 C 29.5 31, 29.5 21, 25.5 13.5 C 21 11, 15 11, 10.5 13.5 Z" fill="#c73e2c" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M14 12.2 C 12 20, 12 30, 14 39.6 M 18 11.4 C 17 20, 17 30, 18 40.4 M 22 12.2 C 24 20, 24 30, 22 39.6" fill="none" stroke="#f6f1e2" stroke-width="1.6" stroke-linecap="round"/>
  <path d="M12 42.5 C 15.5 44, 20.5 44, 24 42.5 L 23.4 46 C 20 47.4, 16 47.4, 12.6 46 Z" fill="currentColor"/>
  <path d="M18 48 C 18 52, 18 54.5, 18 57" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <circle cx="18" cy="60" r="2.4" fill="currentColor"/>
</svg>`;

function bootChrome() {
  const places = document.querySelector("nav.places");
  const resetBtn = document.getElementById("reset-view");
  const soundBtn = document.getElementById("sound");
  const chunks = document.getElementById("chunks");
  if (!places || !resetBtn || !soundBtn) {
    // main.js has not built the UI yet; try again shortly
    return setTimeout(bootChrome, 120);
  }

  // ema plaques: each place gets its sumi-e mark, label kept
  for (const btn of places.querySelectorAll("[data-place]")) {
    const name = btn.textContent.trim();
    const mark = PLACE_ICONS[name];
    if (mark && !btn.querySelector(".ink-icon")) {
      btn.innerHTML = `${mark}<span>${name}</span>`;
    }
  }
  // track the active plaque from the HUD's biome line (scene owns the truth)
  const biomeLabel = document.getElementById("biome");
  const order = ["Shrine", "Rice", "Bamboo", "Sakura", "Snow", "Tea"];
  const biomeWords = [/Shrine|Cedar/i, /Rice/i, /Bamboo/i, /Sakura/i, /Snow/i, /Tea|Firefly/i];
  const syncActive = () => {
    const text = biomeLabel?.textContent || "";
    const idx = biomeWords.findIndex((re) => re.test(text));
    places.querySelectorAll("[data-place]").forEach((b, i) =>
      b.setAttribute("data-active", String(i === idx)),
    );
  };
  if (biomeLabel) {
    new MutationObserver(syncActive).observe(biomeLabel, { childList: true });
    syncActive();
  }

  // tools strip: reset, sound, pin - chips above the rail
  const tools = document.createElement("div");
  tools.className = "tools";
  resetBtn.classList.add("ink-chip");
  resetBtn.setAttribute("aria-label", "Reset view");
  resetBtn.innerHTML = ICON_RESET;
  soundBtn.classList.add("ink-chip");
  const pinBtn = document.createElement("button");
  pinBtn.id = "pin-controls";
  pinBtn.className = "ink-chip";
  tools.append(resetBtn, soundBtn, pinBtn);
  document.body.appendChild(tools);

  // the meta line (streaming count + key hints) lives in the woken chrome
  if (chunks) {
    chunks.classList.add("meta-line");
    document.body.appendChild(chunks);
  }

  // the chochin hint tab
  const hint = document.createElement("button");
  hint.className = "chrome-hint";
  hint.setAttribute("aria-label", "Show controls");
  hint.innerHTML = CHOCHIN;
  document.body.appendChild(hint);

  // quiet-by-default state machine (same contract as Appalachian/Tangier)
  let pinned = false;
  try {
    pinned = localStorage.getItem(PIN_KEY) === "1";
  } catch {
    /* storage unavailable */
  }
  let chrome = true; // greets on entry, then retires
  let focusWithin = false;
  let retireTimer = null;

  const render = () => {
    const on = chrome || pinned;
    document.body.dataset.chrome = on ? "on" : "off";
    pinBtn.setAttribute("aria-pressed", String(pinned));
    pinBtn.innerHTML = ICON_PIN(pinned);
    pinBtn.setAttribute(
      "aria-label",
      pinned ? "Let controls retire" : "Keep controls visible",
    );
    pinBtn.title = pinned ? "Let controls retire" : "Keep controls visible";
  };
  const retireSoon = () => {
    clearTimeout(retireTimer);
    retireTimer = setTimeout(() => {
      if (!focusWithin) {
        chrome = false;
        render();
      }
    }, RETIRE_MS);
  };
  const wake = () => {
    chrome = true;
    render();
    retireSoon();
  };

  hint.addEventListener("click", wake);
  pinBtn.addEventListener("click", () => {
    pinned = !pinned;
    try {
      pinned
        ? localStorage.setItem(PIN_KEY, "1")
        : localStorage.removeItem(PIN_KEY);
    } catch {
      /* storage unavailable */
    }
    if (pinned) chrome = true;
    render();
  });
  document.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    if (e.clientY < TOP_ZONE || e.clientY > window.innerHeight - BOTTOM_ZONE)
      wake();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      focusWithin = false;
      chrome = false;
      render();
    }
  });
  document.addEventListener("focusin", (e) => {
    if (
      tools.contains(e.target) ||
      places.contains(e.target) ||
      hint.contains(e.target)
    ) {
      focusWithin = true;
      clearTimeout(retireTimer);
      chrome = true;
      render();
    }
  });
  document.addEventListener("focusout", (e) => {
    if (
      !tools.contains(e.relatedTarget) &&
      !places.contains(e.relatedTarget) &&
      !hint.contains(e.relatedTarget)
    ) {
      focusWithin = false;
      retireSoon();
    }
  });

  render();
  retireSoon(); // entry greeting retires on its own
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootChrome);
} else {
  bootChrome();
}
