// Proxy setup: Scramjet rewrites pages in the browser, Epoxy carries the traffic over Wisp to server.js

const { ScramjetController } = $scramjetLoadController();

const scramjet = new ScramjetController({
  prefix: "/scramjet/",
  files: {
    wasm: "/scram/scramjet.wasm.wasm",
    all: "/scram/scramjet.all.js",
    sync: "/scram/scramjet.sync.js",
  },
});

let proxyReady = null;

// Runs once; every later call reuses the same promise
function initProxy() {
  proxyReady ??= (async () => {
    if (!("serviceWorker" in navigator)) {
      throw new Error("This browser doesn't support service workers (needed for the proxy).");
    }
    await scramjet.init();
    await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    const wispUrl = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/wisp/`;
    const connection = new BareMux.BareMuxConnection("/baremux/worker.js");
    await connection.setTransport("/epoxy/index.mjs", [{ wisp: wispUrl }]);
  })();
  return proxyReady;
}

// Turns what the user typed into a URL: a real address, a bare domain, or a web search
function toUrl(input) {
  const text = input.trim();
  if (/^https?:\/\//i.test(text)) return text;
  if (!/\s/.test(text) && /^[\w-]+(\.[\w-]+)+(:\d+)?(\/.*)?$/.test(text)) return "https://" + text;
  // Bing, not DuckDuckGo: DuckDuckGo never answers requests from Render's servers
  return "https://www.bing.com/search?q=" + encodeURIComponent(text);
}

// Start loading the proxy in the background so the first search is fast
initProxy().catch((err) => console.error("Proxy setup failed:", err));
