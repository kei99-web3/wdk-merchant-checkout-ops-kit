const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const demoRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(demoRoot, relativePath), "utf8");
}

function testPackagePins() {
  const packageJson = JSON.parse(read("package.json"));
  assert.equal(packageJson.dependencies["@tetherto/wdk"], "1.0.0-beta.9");
  assert.equal(packageJson.dependencies["@tetherto/wdk-wallet-evm"], "1.0.0-beta.12");
  assert.equal(packageJson.scripts["test:wdk-boundary"], "node tests/real_wdk_boundary.test.js");
}

function testAdapterIsApprovalGated() {
  const adapter = read("real_wdk_adapter.mjs");
  assert.match(adapter, /WDK_APPROVAL_GATES/);
  assert.match(adapter, /createRealWdkReadinessReport/);
  assert.match(adapter, /loadWdkModules/);
  assert.match(adapter, /ApprovalGatedWdkAdapter\.create/);
  assert.match(adapter, /approval-gated/i);
  assert.match(adapter, /approved_provider_rpc/);
  assert.match(adapter, /approved_mnemonic_or_seed_source/);
  assert.doesNotMatch(adapter, /^import\s+WDK/m);
  assert.doesNotMatch(adapter, /https?:\/\//i);
}

function testBrowserDoesNotLoadRealAdapter() {
  assert.doesNotMatch(read("index.html"), /real_wdk_adapter\.mjs/);
}

function testIntegrationPlanDocumentsOwners() {
  const plan = JSON.parse(read("wdk_integration_plan.json"));
  assert.equal(plan.activationStatus, "blocked_until_explicit_user_approval");
  assert.equal(plan.packageBoundary.browserLoaded, false);
  assert.equal(plan.productionFlowMapping.length, 5);
  assert.deepEqual(
    plan.productionFlowMapping.map((item) => item.productionOwner),
    [
      "EC system",
      "buyer + WDK",
      "WDK or payment service",
      "buyer + WDK",
      "AI recommendation + human merchant operator"
    ]
  );
}

testPackagePins();
testAdapterIsApprovalGated();
testBrowserDoesNotLoadRealAdapter();
testIntegrationPlanDocumentsOwners();

console.log("real_wdk_boundary.test.js passed");
