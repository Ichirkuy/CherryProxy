// Proxy setup: Scramjet rewrites pages in the browser, libcurl carries the traffic over Wisp to server.js.
// libcurl rather than Epoxy: Epoxy's HTTP/2 client rejects YouTube's responses (PROTOCOL_ERROR).

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
    await connection.setTransport("/libcurl/index.mjs", [{ wisp: wispUrl }]);
    await waitForLibcurl();
  })();
  return proxyReady;
}

// libcurl loads its WebAssembly engine in the background after setTransport, and requests made
// before that finishes fail. Probe with a tiny request until it stops saying "wasm not loaded".
async function waitForLibcurl() {
  const client = new BareMux.BareClient();
  for (let i = 0; i < 40; i++) {
    try {
      await client.fetch(location.origin + "/favicon-probe", { method: "HEAD" });
      return;
    } catch (err) {
      if (!String(err).includes("wasm not loaded")) return; // engine is up; this was some other error
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
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
