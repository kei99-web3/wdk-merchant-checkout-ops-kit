const assert = require("node:assert/strict");
const childProcess = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");

const demoRoot = path.resolve(__dirname, "..");
const screenshotRoot = path.join(demoRoot, "screenshots");
const demoUrl = `file:///${path.join(demoRoot, "index.html").replace(/\\/g, "/")}`;

function findBrowser() {
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestJson(port, route, method = "GET") {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: "127.0.0.1",
      port,
      path: route,
      method
    }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { body += chunk; });
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`${method} ${route} returned ${res.statusCode}: ${body}`));
          return;
        }
        resolve(JSON.parse(body));
      });
    });
    req.on("error", reject);
    req.end();
  });
}

async function waitForDebugPort(port) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      await requestJson(port, "/json/version");
      return;
    } catch (error) {
      await delay(150);
    }
  }
  throw new Error("Timed out waiting for browser debug port.");
}

class CdpSocket {
  constructor(webSocketUrl) {
    const parsed = new URL(webSocketUrl);
    this.host = parsed.hostname;
    this.port = Number(parsed.port);
    this.path = `${parsed.pathname}${parsed.search}`;
    this.nextId = 1;
    this.pending = new Map();
    this.buffer = Buffer.alloc(0);
    this.handshakeDone = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const key = crypto.randomBytes(16).toString("base64");
      this.socket = net.createConnection({ host: this.host, port: this.port }, () => {
        this.socket.write([
          `GET ${this.path} HTTP/1.1`,
          `Host: ${this.host}:${this.port}`,
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Key: ${key}`,
          "Sec-WebSocket-Version: 13",
          "",
          ""
        ].join("\r\n"));
      });

      this.socket.on("data", (chunk) => {
        this.buffer = Buffer.concat([this.buffer, chunk]);
        if (!this.handshakeDone) {
          const marker = this.buffer.indexOf("\r\n\r\n");
          if (marker === -1) return;
          const header = this.buffer.slice(0, marker).toString("utf8");
          if (!header.includes(" 101 ")) {
            reject(new Error(`WebSocket handshake failed: ${header}`));
            return;
          }
          this.handshakeDone = true;
          this.buffer = this.buffer.slice(marker + 4);
          resolve();
        }
        this.consumeFrames();
      });
      this.socket.on("error", reject);
    });
  }

  consumeFrames() {
    while (this.buffer.length >= 2) {
      const first = this.buffer[0];
      const second = this.buffer[1];
      const opcode = first & 0x0f;
      let length = second & 0x7f;
      let offset = 2;

      if (length === 126) {
        if (this.buffer.length < offset + 2) return;
        length = this.buffer.readUInt16BE(offset);
        offset += 2;
      } else if (length === 127) {
        if (this.buffer.length < offset + 8) return;
        const high = this.buffer.readUInt32BE(offset);
        const low = this.buffer.readUInt32BE(offset + 4);
        length = high * 2 ** 32 + low;
        offset += 8;
      }

      if (this.buffer.length < offset + length) return;
      const payload = this.buffer.slice(offset, offset + length);
      this.buffer = this.buffer.slice(offset + length);

      if (opcode === 1) {
        const message = JSON.parse(payload.toString("utf8"));
        if (message.id && this.pending.has(message.id)) {
          const { resolve, reject } = this.pending.get(message.id);
          this.pending.delete(message.id);
          if (message.error) reject(new Error(JSON.stringify(message.error)));
          else resolve(message.result);
        }
      }
    }
  }

  send(method, params = {}) {
    const id = this.nextId++;
    const payload = Buffer.from(JSON.stringify({ id, method, params }), "utf8");
    const mask = crypto.randomBytes(4);
    let header;

    if (payload.length < 126) {
      header = Buffer.from([0x81, payload.length | 0x80]);
    } else if (payload.length < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 126 | 0x80;
      header.writeUInt16BE(payload.length, 2);
    } else {
      throw new Error("CDP payload too large.");
    }

    const masked = Buffer.alloc(payload.length);
    for (let index = 0; index < payload.length; index += 1) {
      masked[index] = payload[index] ^ mask[index % 4];
    }

    this.socket.write(Buffer.concat([header, mask, masked]));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  close() {
    if (this.socket) this.socket.end();
  }
}

async function captureViewport(cdp, viewport, filename, url, expectedTitle) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.width < 700
  });
  await cdp.send("Page.navigate", { url });
  await delay(900);

  const metricsResult = await cdp.send("Runtime.evaluate", {
    expression: "JSON.stringify({ innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth, bodyScrollWidth: document.body.scrollWidth, title: document.title })",
    returnByValue: true
  });
  const metrics = JSON.parse(metricsResult.result.value);
  assert.equal(metrics.title, expectedTitle);
  assert.equal(metrics.innerWidth, viewport.width);
  assert.ok(metrics.scrollWidth <= viewport.width + 2, `${filename} has horizontal overflow: ${JSON.stringify(metrics)}`);
  assert.ok(metrics.bodyScrollWidth <= viewport.width + 2, `${filename} body overflow: ${JSON.stringify(metrics)}`);

  const screenshot = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false
  });
  fs.writeFileSync(path.join(screenshotRoot, filename), Buffer.from(screenshot.data, "base64"));
  return metrics;
}

async function main() {
  const browser = findBrowser();
  assert.ok(browser, "Chrome or Edge is required for browser smoke screenshots.");
  fs.mkdirSync(screenshotRoot, { recursive: true });

  const port = 9322 + Math.floor(Math.random() * 400);
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "wdk-demo-browser-"));
  const child = childProcess.spawn(browser, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "about:blank"
  ], { stdio: "ignore" });

  let cdp;
  try {
    await waitForDebugPort(port);
    let target;
    try {
      target = await requestJson(port, `/json/new?${encodeURIComponent(demoUrl)}`, "PUT");
    } catch (error) {
      const targets = await requestJson(port, "/json/list");
      target = targets.find((item) => item.type === "page");
    }
    cdp = new CdpSocket(target.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    const desktop = await captureViewport(cdp, { width: 1440, height: 1200 }, "2026-05-23_demo_desktop.png", demoUrl, "WDK Merchant Checkout Ops Kit");
    const mobile = await captureViewport(cdp, { width: 390, height: 1200 }, "2026-05-23_demo_mobile.png", demoUrl, "WDK Merchant Checkout Ops Kit");
    console.log(`browser_smoke.test.js passed desktop=${JSON.stringify(desktop)} mobile=${JSON.stringify(mobile)}`);
  } finally {
    if (cdp) cdp.close();
    child.kill();
    await delay(300);
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    } catch (error) {
      // Browser profile cleanup can lag on Windows; screenshots and assertions are already complete.
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
