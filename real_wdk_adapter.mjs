export const WDK_PACKAGES = Object.freeze({
  core: "@tetherto/wdk",
  evmWallet: "@tetherto/wdk-wallet-evm"
});

export const WDK_APPROVAL_GATES = Object.freeze([
  "application_scope",
  "wallet_handling",
  "mnemonic_storage",
  "provider_rpc",
  "testnet_or_mainnet",
  "transaction_signing",
  "broadcasting",
  "audit_review"
]);

export function createRealWdkReadinessReport(options = {}) {
  const missing = [];
  if (!options.approved) missing.push("user_approval");
  if (!options.mnemonic) missing.push("approved_mnemonic_or_seed_source");
  if (!options.providerUrl) missing.push("approved_provider_rpc");
  if (!options.chain) missing.push("approved_chain");

  return {
    mode: "approval_gated",
    ready: missing.length === 0,
    missing,
    blockedActions: [
      "wallet creation or import",
      "provider/RPC connection",
      "testnet or mainnet access",
      "transaction signing",
      "transaction broadcast"
    ]
  };
}

export async function loadWdkModules() {
  const [{ default: WDK }, { default: WalletManagerEvm }] = await Promise.all([
    import(WDK_PACKAGES.core),
    import(WDK_PACKAGES.evmWallet)
  ]);
  return { WDK, WalletManagerEvm };
}

export class ApprovalGatedWdkAdapter {
  static async create(options = {}) {
    const readiness = createRealWdkReadinessReport(options);
    if (!readiness.ready) {
      throw new Error(`Real WDK adapter is approval-gated. Missing: ${readiness.missing.join(", ")}`);
    }
    const modules = await loadWdkModules();
    return new ApprovalGatedWdkAdapter(options, modules);
  }

  constructor(options = {}, modules = {}) {
    const readiness = createRealWdkReadinessReport(options);
    if (!readiness.ready) {
      throw new Error(`Real WDK adapter is approval-gated. Missing: ${readiness.missing.join(", ")}`);
    }

    const { WDK, WalletManagerEvm } = modules;
    if (!WDK || !WalletManagerEvm) {
      throw new Error("Use ApprovalGatedWdkAdapter.create() so WDK modules load only after approval gates pass.");
    }

    const { mnemonic, providerUrl, chain } = options;

    this.chain = chain;
    this.wdk = new WDK(mnemonic).registerWallet(chain, WalletManagerEvm, {
      provider: providerUrl
    });
  }

  getAccount(index = 0) {
    return this.wdk.getAccount(this.chain, index);
  }
}

export default ApprovalGatedWdkAdapter;
