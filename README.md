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

- `@mercuryworkshop/libcurl-transport` is pinned to 1.5.2: version 2 doesn't work with bare-mux 2. (Epoxy was dropped because its HTTP/2 client can't load YouTube.)
- Searches use Bing because DuckDuckGo doesn't answer requests from Render's servers.
- YouTube pages load, but video playback asks to "confirm you're not a bot": YouTube blocks data-center traffic.
- The proxy needs HTTPS when hosted (service workers only run on `https://` or `localhost`).
