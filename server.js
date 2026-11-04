// CherryProxy server: serves the site and runs the Wisp backend the proxy fetches pages through.
// Start with: npm start

import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import express from "express";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import scramjetPkg from "@mercuryworkshop/scramjet/path";
import baremuxPkg from "@mercuryworkshop/bare-mux/node";

const { scramjetPath } = scramjetPkg;
const { baremuxPath } = baremuxPkg;
const fromHere = (path) => fileURLToPath(new URL(path, import.meta.url));
// epoxy-transport doesn't export its path helper, so point at its dist folder directly
const epoxyPath = fromHere("./node_modules/@mercuryworkshop/epoxy-transport/dist/");

const PORT = Number(process.env.PORT) || 8080;
const publicDir = fromHere("./public/");

// Wisp: never let the proxy reach this machine or its local network
logging.set_level(logging.WARN);
Object.assign(wisp.options, {
  allow_private_ips: false,
  allow_loopback_ips: false,
});

const app = express();
app.use(express.static(publicDir));
app.use("/scram/", express.static(scramjetPath));
app.use("/baremux/", express.static(baremuxPath));
app.use("/epoxy/", express.static(epoxyPath));
app.use((req, res) => res.status(404).send("Not found"));

const server = createServer(app);

// The proxy's traffic arrives as a WebSocket on /wisp/
server.on("upgrade", (req, socket, head) => {
  if (req.url.endsWith("/wisp/")) wisp.routeRequest(req, socket, head);
  else socket.end();
});

server.listen(PORT, () => {
  console.log(`CherryProxy running at http://localhost:${PORT}`);
});
