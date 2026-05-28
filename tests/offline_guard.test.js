const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const demoRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(demoRoot, relativePath), "utf8");
}

function assertNoExternalBehavior(relativePath) {
  const content = read(relativePath);
  const blockedPatterns = [
    /fetch\s*\(/,
    /XMLHttpRequest/,
    /WebSocket/,
    /navigator\.serviceWorker/,
    /walletconnect/i,
    /https?:\/\//i,
    /apiKey/i,
    /API_KEY/,
    /PRIVATE KEY/i,
    /BEGIN [A-Z ]*KEY/,
    /seed phrase/i,
    /sk-[A-Za-z0-9]{8,}/
  ];

  for (const pattern of blockedPatterns) {
    assert.equal(pattern.test(content), false, `${relativePath} matched blocked pattern ${pattern}`);
  }
}

function testRequiredFilesExist() {
  for (const relativePath of [
    "index.html",
    "styles.css",
    "app.js",
    "mock_wdk_adapter.js",
    "demo_data.json",
    "api_contracts.md",
    "reconciliation_model.md",
    "fulfillment_states.md",
    "wdk_mapping.md",
    "README.md",
    "package.json",
    "real_wdk_adapter.mjs",
    "wdk_integration_plan.json",
    "tests/real_wdk_boundary.test.js"
  ]) {
    assert.equal(fs.existsSync(path.join(demoRoot, relativePath)), true, `missing ${relativePath}`);
  }
}

function testIndexUsesLocalAssetsOnly() {
  const html = read("index.html");
  assert.match(html, /<link rel="stylesheet" href="styles\.css">/);
  assert.match(html, /<script src="mock_wdk_adapter\.js"><\/script>/);
  assert.match(html, /<script src="app\.js"><\/script>/);
  assert.doesNotMatch(html, /<script[^>]+src=["']https?:\/\//i);
  assert.doesNotMatch(html, /<link[^>]+href=["']https?:\/\//i);
  assert.doesNotMatch(html, /real_wdk_adapter\.mjs/);
}

function testRequiredUiHooks() {
  const html = read("index.html");
  for (const id of [
    "create-intent",
    "select-account",
    "quote-payment",
    "approve-payment",
    "simulate-confirm",
    "simulate-underpay",
    "simulate-overpay",
    "simulate-duplicate",
    "expire-intent",
    "fail-payment",
    "evidence-payment",
    "evidence-match",
    "evidence-receipt",
    "release-pill",
    "mapping-count",
    "api-json"
  ]) {
    assert.match(html, new RegExp(`id="${id}"`), `missing UI id ${id}`);
  }
}

function testMockOnlyLabels() {
  const html = read("index.html");
  assert.match(html, /Mock WDK/);
  assert.match(html, /No wallet \/ no testnet \/ no transaction/);
  assert.match(html, /Mock API contract/);
}

function testNoExternalBehavior() {
  for (const relativePath of ["index.html", "app.js", "mock_wdk_adapter.js"]) {
    assertNoExternalBehavior(relativePath);
  }
}

function testWdkDependencyBoundary() {
  const packageJson = JSON.parse(read("package.json"));
  assert.equal(packageJson.dependencies["@tetherto/wdk"], "1.0.0-beta.9");
  assert.equal(packageJson.dependencies["@tetherto/wdk-wallet-evm"], "1.0.0-beta.12");

  const realAdapter = read("real_wdk_adapter.mjs");
  assert.match(realAdapter, /@tetherto\/wdk/);
  assert.match(realAdapter, /@tetherto\/wdk-wallet-evm/);
  assert.match(realAdapter, /approval-gated/i);
  assert.match(realAdapter, /loadWdkModules/);
  assert.match(realAdapter, /providerUrl/);
  assert.doesNotMatch(realAdapter, /^import\s+WDK/m);
  assert.doesNotMatch(realAdapter, /https?:\/\//i);

  const plan = JSON.parse(read("wdk_integration_plan.json"));
  assert.equal(plan.activationStatus, "blocked_until_explicit_user_approval");
  assert.equal(plan.packageBoundary.browserLoaded, false);
}

testRequiredFilesExist();
testIndexUsesLocalAssetsOnly();
testRequiredUiHooks();
testMockOnlyLabels();
testNoExternalBehavior();
testWdkDependencyBoundary();

console.log("offline_guard.test.js passed");
