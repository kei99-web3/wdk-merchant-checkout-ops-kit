import assert from "node:assert/strict";
import { createRealWdkReadinessReport, WDK_PACKAGES } from "../real_wdk_adapter.mjs";

async function testOfficialPackagesImport() {
  const [{ default: WDK }, { default: WalletManagerEvm }] = await Promise.all([
    import(WDK_PACKAGES.core),
    import(WDK_PACKAGES.evmWallet)
  ]);

  assert.equal(typeof WDK, "function");
  assert.equal(typeof WalletManagerEvm, "function");
  assert.equal(typeof WDK.getRandomSeedPhrase, "function");
}

function testNoActivationInputsProvided() {
  const readiness = createRealWdkReadinessReport({});
  assert.equal(readiness.mode, "approval_gated");
  assert.equal(readiness.ready, false);
  assert.deepEqual(readiness.missing, [
    "user_approval",
    "approved_mnemonic_or_seed_source",
    "approved_provider_rpc",
    "approved_chain"
  ]);
  assert.ok(readiness.blockedActions.includes("transaction broadcast"));
}

await testOfficialPackagesImport();
testNoActivationInputsProvided();

console.log("wdk_import_preflight.test.mjs passed");
