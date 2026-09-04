# ASCII Aquarium

Overlay OBS **transparent** : un aquarium ASCII autonome, piloté par le chat Twitch.

A living ASCII aquarium as a transparent **OBS Browser Source**, plus a Twitch chat bot. The tank keeps swimming even when chat is quiet.

---

## OBS en 2 minutes / OBS in 2 minutes

1. `npm install` puis `npm start`
2. Dans OBS : **Sources → + → Browser**
   - URL : `http://127.0.0.1:3000/`
   - Width / Largeur : **`1920`**
   - Height / Hauteur : **`1080`**
   - Cocher **Shutdown source when not visible** : non (laissez tourner)
   - CSS personnalisé / Custom CSS :

```css
body { background-color: rgba(0, 0, 0, 0) !important; margin: 0; overflow: hidden; }
```

3. Placez la source en **plein cadre** (0, 0) — l’overlay remplit le 1920×1080, fond transparent.

**Si le bac est vide (pas de poissons) :**
- Le serveur `npm start` doit rester lancé. L’URL OBS doit être `http://127.0.0.1:3000/` — **pas** un fichier HTML local.
- Testez d’abord [http://127.0.0.1:3000/?preview=1](http://127.0.0.1:3000/?preview=1) : le HUD doit afficher `🐟 12` (ou plus), pas `🐟 0`.
- `!fish` / `!poisson` dans le chat (ou sur `/debug.html`) adopte un poisson à votre nom.
- Vous pouvez supprimer `data/aquarium.json` puis relancer pour réinitialiser le bac.

Page de test local (sans OBS) : [http://127.0.0.1:3000/?preview=1](http://127.0.0.1:3000/?preview=1) — `?preview=1` ajoute un fond océan sombre (l’overlay OBS reste transparent).  
Simulateur de chat : [http://127.0.0.1:3000/debug.html](http://127.0.0.1:3000/debug.html)

---

## Token Twitch (bot)

Sans credentials, l’aquarium **tourne quand même** (mode dry-run). Pour le chat :

1. Créez un compte bot (ou utilisez le vôtre)
2. Token IRC : [https://twitchapps.com/tmi/](https://twitchapps.com/tmi/) — connectez le compte bot, copiez `oauth:…`
3. Copiez `.env.example` → `.env` :

```
TWITCH_USERNAME=monbot
TWITCH_OAUTH_TOKEN=oauth:xxxxxxxx
TWITCH_CHANNEL=monstream
PORT=3000
```

4. Relancez `npm start`. Le bot rejoint `#monstream` et répond aux commandes.

Le bot a besoin d’être **modérateur** ou d’envoyer des messages (permis par défaut). Le token TMI ne lit que le chat IRC — pas l’API Helix.

---

## Installation

```bash
npm install
cp .env.example .env   # optionnel
npm start              # production
npm run dev            # reload
```

- Overlay : `http://127.0.0.1:3000/`
- Debug chat : `http://127.0.0.1:3000/debug.html`
- Santé : `http://127.0.0.1:3000/health`
- API : `POST /api/chat` `{ "user": "Alice", "message": "!fish" }`

Si OBS est sur une autre machine, utilisez l’IP LAN (`http://192.168.x.x:3000/`) et ouvrez le pare-feu sur `PORT`.

---

## Commandes chat (FR + EN)

| Commande | Alias | Effet |
|---|---|---|
| `!fish` | `!poisson` `!adopt` | Adopte un poisson à ton nom (1 actif, cooldown) |
| `!feed` | `!nourrir` `!miam` | Jette des granulés (rate-limit) |
| `!aquarium` | `!tank` `!bac` | État du bac |
| `!myfish` | `!monpoisson` | Ton poisson (espèce, âge, bonheur, rareté) |
| `!name <nom>` | `!nom` | Renomme |
| `!release` | `!relacher` | Relâche dans la nature |
| `!catch` | `!peche` `!pêche` | Mini-jeu : tapez le mot affiché |
| `!race` | `!course` | Course — `!go` / `!allez` pour cheer |
| `!battle @user` | `!duel` | Parade amicale (RNG + stats, pas de toxicité) |
| `!treasure` | `!tresor` `!creuser` | Pièces (cooldown) |
| `!shop` `!buy` | `!boutique` `!acheter` | Cosmétiques |
| `!decor <item>` | `!deco` | Algue, château, coffre… (coûte des 🪙) |
| `!top` | `!classement` | Riches / heureux / éleveurs (`!top happy`) |
| `!coins` | `!or` | Solde |
| `!help` | `!aide` | Liste courte |

Raretés : **Commun → Peu commun → Rare → Épique → Légendaire → Mythique** (sprites + couleurs).

Événements globaux (chat + bannière overlay) : Frénésie alimentaire, Alerte requin, Tempête de bulles, Heure dorée, pêche éclair, course.

Subs / bits : plus de nourriture, spawn rare (si le bot reçoit les events tmi).

---

## Architecture

```
overlay/     page OBS (HTML/CSS/JS) — fond transparent, rendu ASCII
src/         serveur Express + WebSocket + bot tmi.js + simulation
data/        sauvegarde JSON (poissons, viewers, pièces, décors)
```

L’état vit **côté serveur**. L’overlay est un renderer synchro ~12 FPS via `/ws`. Sans token Twitch, simulez le chat via `/debug.html` ou `POST /api/chat`.

---

## English (short)

Transparent OBS Browser Source + Twitch IRC bot. `npm start`, add Browser source `http://127.0.0.1:3000/` at **1920×1080**, paste the CSS above. Put Twitch creds in `.env` from [twitchapps.com/tmi](https://twitchapps.com/tmi/). The tank runs autonomously (fish, bubbles, day/night, breeding, events) even with nobody chatting. Persistence is `data/aquarium.json`.
