const tank = document.getElementById("tank");
const banner = document.getElementById("banner");
const last = document.getElementById("last");
const counts = document.getElementById("counts");
const phaseEl = document.getElementById("phase");
const modeEl = document.getElementById("mode");
const app = document.getElementById("app");
const catchEl = document.getElementById("catch");

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
  "label",
]);

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
      for (let i = 0; i < label.length; i++) {
        const gx = start + i;
        if (gx >= grid.ch[0].length) break;
        if (grid.ch[ly][gx] === " ") {
          grid.ch[ly][gx] = label[i];
          grid.col[ly][gx] = "label";
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

function paint(snap) {
  if (!snap) return;
  app.className = snap.phase || "day";
  counts.textContent = `🐟 ${snap.hud.fish} · * ${snap.hud.food}`;
  phaseEl.textContent = snap.hud.phaseLabel;
  modeEl.textContent = snap.hud.twitch;
  modeEl.classList.toggle("live", snap.hud.twitch === "live");
  banner.textContent = snap.banner || snap.hud.event || "";
  last.textContent = snap.hud.lastAction || "";

  const grid = emptyGrid(snap.w, snap.h);
  const draws = (snap.drawables || []).slice().sort((a, b) => a.z - b.z);
  for (const d of draws) blit(grid, d);
  tank.innerHTML = toHtml(grid);

  if (snap.catchWord) {
    catchEl.hidden = false;
    catchEl.textContent = snap.catchWord;
  } else {
    catchEl.hidden = true;
  }
}

function connect() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${proto}://${location.host}/ws`);
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.type === "state") paint(msg.data);
    } catch {
      /* ignore */
    }
  };
  ws.onclose = () => setTimeout(connect, 1000);
  ws.onerror = () => ws.close();
}

connect();

if (new URLSearchParams(location.search).has("preview")) {
  document.body.classList.add("preview");
}
