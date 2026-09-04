const tank = document.getElementById("tank");
const banner = document.getElementById("banner");
const eventBar = document.getElementById("event-bar");
const last = document.getElementById("last");
const counts = document.getElementById("counts");
const phaseEl = document.getElementById("phase");
const modeEl = document.getElementById("mode");
const app = document.getElementById("app");
const catchEl = document.getElementById("catch");
const hud = document.getElementById("hud");

const COLORS = new Set([
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "mythic",
  "bubble",
  "sand",
  "weed",
  "coral",
  "rock",
  "chest",
  "castle",
  "food",
  "shark",
  "crab",
  "foam",
  "glass",
  "ray",
  "label",
  "label-owned",
]);

let wsOk = false;
let fittedKey = "";

function emptyGrid(w, h) {
  const ch = Array.from({ length: h }, () => Array.from({ length: w }, () => " "));
  const col = Array.from({ length: h }, () => Array.from({ length: w }, () => "foam"));
  return { ch, col };
}

function blit(grid, d) {
  const lines = d.lines || [];
  for (let ly = 0; ly < lines.length; ly++) {
    const line = lines[ly];
    const gy = d.y + ly;
    if (gy < 0 || gy >= grid.ch.length) continue;
    for (let lx = 0; lx < line.length; lx++) {
      const c = line[lx];
      if (c === undefined) continue;
      const gx = d.x + lx;
      if (gx < 0 || gx >= grid.ch[0].length) continue;
      if (c !== " " || d.color === "sand" || d.color === "foam") {
        grid.ch[gy][gx] = c;
        grid.col[gy][gx] = COLORS.has(d.color) ? d.color : "foam";
      }
    }
  }
  if (d.label) {
    const ly = d.y - 1;
    if (ly >= 0 && ly < grid.ch.length) {
      const start = Math.max(0, d.x);
      const label = String(d.label).slice(0, 10);
      const cls = d.owned ? "label-owned" : "label";
      for (let i = 0; i < label.length; i++) {
        const gx = start + i;
        if (gx >= grid.ch[0].length) break;
        if (grid.ch[ly][gx] === " ") {
          grid.ch[ly][gx] = label[i];
          grid.col[ly][gx] = cls;
        }
      }
    }
  }
}

function toHtml(grid) {
  const parts = [];
  for (let y = 0; y < grid.ch.length; y++) {
    let prev = null;
    let buf = "";
    const flush = () => {
      if (!buf) return;
      const cls = prev || "foam";
      parts.push(`<span class="${cls}">${esc(buf)}</span>`);
      buf = "";
    };
    for (let x = 0; x < grid.ch[y].length; x++) {
      const cls = grid.col[y][x];
      const c = grid.ch[y][x];
      if (cls !== prev) {
        flush();
        prev = cls;
      }
      buf += c;
    }
    flush();
    parts.push("\n");
  }
  return parts.join("");
}

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fitTank(cols, rows) {
  if (!cols || !rows) return;
  const hudH = (hud?.offsetHeight || 48) + (eventBar?.hidden ? 0 : eventBar.offsetHeight || 0) + 28;
  const availW = Math.max(200, (window.innerWidth || 1920) - 44);
  const availH = Math.max(200, (window.innerHeight || 1080) - hudH);
  const probe = document.createElement("pre");
  probe.style.cssText =
    "position:absolute;left:-9999px;top:0;margin:0;visibility:hidden;white-space:pre;font-family:\"IBM Plex Mono\",ui-monospace,monospace;letter-spacing:inherit;line-height:1.08;";
  const line = "M".repeat(cols);
  probe.textContent = Array.from({ length: rows }, () => line).join("\n");
  probe.style.fontSize = "10px";
  document.body.appendChild(probe);
  const rw = probe.offsetWidth / 10;
  const rh = probe.offsetHeight / 10;
  probe.remove();
  if (!rw || !rh) return;
  const size = Math.max(12, Math.min(availW / rw, availH / rh));
  tank.style.fontSize = `${size}px`;
}

function paint(snap) {
  if (!snap) return;
  app.className = snap.phase || "day";
  counts.textContent = `${snap.hud.fish}  ·  ${snap.hud.food}`;
  phaseEl.textContent = snap.hud.phaseLabel;
  modeEl.textContent = snap.hud.twitch;
  modeEl.classList.toggle("live", snap.hud.twitch === "live");
  last.textContent = snap.hud.lastAction || "";

  const eventText = snap.banner || snap.hud.event || (snap.race?.lead ? `Course · ${snap.race.lead}` : "");
  banner.textContent = eventText;
  eventBar.hidden = !eventText;

  const grid = emptyGrid(snap.w, snap.h);
  const draws = (snap.drawables || []).slice().sort((a, b) => a.z - b.z);
  for (const d of draws) blit(grid, d);
  tank.innerHTML = toHtml(grid);

  const key = `${snap.w}x${snap.h}@${window.innerWidth}x${window.innerHeight}@${eventBar.hidden}`;
  if (key !== fittedKey) {
    fitTank(snap.w, snap.h);
    fittedKey = key;
  }

  if (snap.catchWord) {
    catchEl.hidden = false;
    catchEl.textContent = snap.catchWord;
  } else {
    catchEl.hidden = true;
  }
}

async function pullHttp() {
  try {
    const res = await fetch("/api/state", { cache: "no-store" });
    const data = await res.json();
    if (data && data.snapshot) paint(data.snapshot);
  } catch {
    /* overlay stays on last frame */
  }
}

function connect() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${proto}://${location.host}/ws`);
  ws.onopen = () => {
    wsOk = true;
  };
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.type === "state") paint(msg.data);
    } catch {
      /* ignore */
    }
  };
  ws.onclose = () => {
    wsOk = false;
    setTimeout(connect, 1000);
  };
  ws.onerror = () => ws.close();
}

pullHttp();
connect();
setInterval(() => {
  if (!wsOk) pullHttp();
}, 1500);

window.addEventListener("resize", () => {
  fittedKey = "";
});

if (new URLSearchParams(location.search).has("preview")) {
  document.body.classList.add("preview");
}
