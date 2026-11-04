# 🌸 CherryProxy

A games site with a built-in web proxy (Scramjet + Wisp).

## Run it locally

```bash
npm install --ignore-scripts
npm start
```

Then open http://localhost:8080.

## Adding games

Add an entry to `public/games.json`:

```json
{
  "id": "my-game",
  "title": "My Game",
  "category": "Arcade",
  "icon": "🎮",
  "thumbnail": "images/my-game.png",
  "iframe": "<iframe src=\"https://example.com/game\"></iframe>"
}
```

## Notes

- `@mercuryworkshop/epoxy-transport` is pinned to 2.1.29: version 3 doesn't work with bare-mux 2 and breaks every proxied page.
- The proxy needs HTTPS when hosted (service workers only run on `https://` or `localhost`).
