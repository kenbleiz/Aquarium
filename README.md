# Arc — Stream → Content Engine

Dépose une VOD MP4. Arc analyse **en parallèle** la vidéo, l’audio, la transcription, les réactions, les scènes, le chat Twitch/YouTube et le contexte de jeu. Il ne cherche pas le cri le plus fort : il reconstitue une **histoire** qu’un inconnu peut comprendre.

> contexte → tension → événement → réaction → conclusion

Objectif : **4 h de VOD → 10 à 30 contenus potentiels en quelques minutes.** Le streamer choisit ensuite ce qu’il publie.

## Ce que chaque clip contient

- découpe intelligente (début / fin calés sur l’arc, pas sur le pic)
- sous-titres dynamiques
- recadrage vertical 9:16 (TikTok, Shorts, Reels)
- zooms / punch-in sur l’événement et la réaction
- titre, description, hashtags, miniature
- **score de potentiel viral** (pénalise les cris isolés)

## Lancer

```bash
npm install
cp .env.example .env.local   # optionnel, pour l’enrichissement IA
npm run dev
```

Ouvre [http://127.0.0.1:3000](http://127.0.0.1:3000).

- **Session démo 4h03** — ranked night Valorant, 10 histoires, 4 cris écartés (sans upload)
- **Extrait réel 90s** — génère une VOD de test, lance ffmpeg, rend de vrais clips 9:16
- **Ta VOD** — MP4 + chat JSON/TXT optionnel + SRT/VTT optionnel

## Chat

Formats acceptés :

- JSON Twitch Downloader (`comments[].content_offset_seconds`)
- `{ "messages": [{ "t": 12.5, "user": "kai", "text": "POG" }] }`
- Logs `[0:01:02] kai: 1v3 POG`

## IA (optionnel)

Sans clé, le moteur d’arcs et les métadonnées heuristiques suffisent. Avec `AI_GATEWAY_API_KEY` (Vercel AI Gateway), les titres / descriptions passent par `google/gemini-3.8-flash`.

## Tests

```bash
npm test
```

Le test central vérifie qu’un clutch promo complet **bat** un cri de 8 secondes sans contexte.

## Architecture

```
src/lib/engine/     arcs, score viral, parsers chat/SRT (pur TypeScript)
src/lib/media/      ffmpeg : probe, énergie audio, scènes, rendu 9:16
src/lib/pipeline.ts orchestration d’une session
src/app/            studio Next.js
data/sessions/      VOD, chat, clips rendus (gitignored)
```

FFmpeg et ffprobe doivent être dans le PATH.
