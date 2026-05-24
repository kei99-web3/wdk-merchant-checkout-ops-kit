import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import WDK from "@tetherto/wdk";
import WalletManagerEvm from "@tetherto/wdk-wallet-evm";

const DEFAULT_PROVIDER_URL = "https://sepolia.drpc.org";
const DEFAULT_CHAIN_ID = 11155111;
const CHAIN = "ethereum";

function weiToEthString(value) {
  const wei = BigInt(value);
  const whole = wei / 10n ** 18n;
  const fraction = (wei % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function redactProvider(url) {
  try {
    const parsed = new URL(url);
    if (parsed.search) parsed.search = "?redacted=true";
    if (parsed.password) parsed.password = "redacted";
    if (parsed.username) parsed.username = "redacted";
    return parsed.toString();
  } catch {
    return "custom-provider";
  }
}

function getConfig() {
  const envMnemonic = process.env.WDK_PHASE2_MNEMONIC?.trim();
  return {
    providerUrl: process.env.WDK_PHASE2_PROVIDER_URL || DEFAULT_PROVIDER_URL,
    chainId: Number(process.env.WDK_PHASE2_CHAIN_ID || DEFAULT_CHAIN_ID),
    allowBroadcast: process.env.WDK_PHASE2_ENABLE_TESTNET_BROADCAST === "true",
    recipient: process.env.WDK_PHASE2_RECIPIENT || "self",
    valueWei: BigInt(process.env.WDK_PHASE2_VALUE_WEI || "0"),
    seedPhrase: envMnemonic || WDK.getRandomSeedPhrase(),
    seedHandling: envMnemonic
      ? "mnemonic_loaded_from_WDK_PHASE2_MNEMONIC_not_logged_not_written"
      : "ephemeral_generated_in_memory_not_logged_not_written",
    reusableAddressMode: Boolean(envMnemonic)
  };
}

function writeResult(result) {
  const outDir = path.resolve("..", "deliverables");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "2026-05-24_wdk_phase2_testnet_result.json");
  fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return outPath;
}

async function main() {
  const config = getConfig();
  let wallet;

  const result = {
    generatedAt: new Date().toISOString(),
    mode: "real_wdk_phase2_testnet",
    chain: CHAIN,
    chainId: config.chainId,
    provider: redactProvider(config.providerUrl),
    seedHandling: config.seedHandling,
    reusableAddressMode: config.reusableAddressMode,
    broadcastRequested: config.allowBroadcast,
    broadcastAttempted: false,
    broadcastSkippedReason: null,
    address: null,
    balanceWei: null,
    balanceEth: null,
    quoteFeeWei: null,
    quoteFeeEth: null,
    transactionHash: null,
    errors: []
  };

  try {
    wallet = new WDK(config.seedPhrase).registerWallet(CHAIN, WalletManagerEvm, {
      provider: config.providerUrl,
      chainId: config.chainId,
      transferMaxFee: 10n ** 16n
    });

    const account = await wallet.getAccount(CHAIN, 0);
    const address = await account.getAddress();
    result.address = address;

    const balance = await account.getBalance();
    result.balanceWei = balance.toString();
    result.balanceEth = weiToEthString(balance);

    const recipient = config.recipient === "self" ? address : config.recipient;
    const tx = { to: recipient, value: config.valueWei };

    try {
      const quote = await account.quoteSendTransaction(tx);
      result.quoteFeeWei = quote.fee.toString();
      result.quoteFeeEth = weiToEthString(quote.fee);

      if (!config.allowBroadcast) {
        result.broadcastSkippedReason = "WDK_PHASE2_ENABLE_TESTNET_BROADCAST is not true";
      } else if (balance <= quote.fee + config.valueWei) {
        result.broadcastSkippedReason = "insufficient testnet balance for value plus estimated fee";
      } else {
        result.broadcastAttempted = true;
        const sent = await account.sendTransaction(tx);
        result.transactionHash = sent.hash;
      }
    } catch (error) {
      result.errors.push(`quote_or_broadcast: ${error.message}`);
      if (!result.broadcastSkippedReason) {
        result.broadcastSkippedReason = "quote failed, broadcast not attempted";
      }
    }
  } finally {
    if (wallet && typeof wallet.dispose === "function") {
      wallet.dispose();
    }
  }

  const outPath = writeResult(result);
  console.log(JSON.stringify({
    mode: result.mode,
    chainId: result.chainId,
    seedHandling: result.seedHandling,
    reusableAddressMode: result.reusableAddressMode,
    address: result.address,
    balanceEth: result.balanceEth,
    quoteFeeEth: result.quoteFeeEth,
    broadcastAttempted: result.broadcastAttempted,
    transactionHash: result.transactionHash,
    broadcastSkippedReason: result.broadcastSkippedReason,
    resultPath: outPath
  }, null, 2));
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
