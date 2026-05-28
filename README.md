# WDK Merchant Checkout Ops Kit

Reference implementation for the Tether Developer Grants "WDK in eCommerce" bounty.

This package demonstrates an ecommerce checkout operations flow around:

- payment intent creation
- embedded wallet account selection
- payment quote and buyer approval
- transaction submit boundary
- confirmation watcher simulation
- merchant reconciliation and fulfillment release lock
- phone-first storefront operator checks
- optional real-WDK Sepolia proof path

For the submission story, see `SUBMISSION_BRIEF.md`.

## Design Principle

The project treats WDK adoption as an operator workflow, not just a developer integration. A small shop or in-person merchant should be able to check a payment from a smartphone, see three simple evidence cards (payment status, order match, and receipt evidence), and hand over goods only when all three are OK. The interface intentionally avoids exposing staff to wallet internals, RPC details, or block explorer interpretation during normal use.

## Current Status

This repository is prepared for public review and grant evaluation. It has not been submitted to Tether, connected to mainnet, or connected to any production wallet, API key, or Tether account.

The browser demo uses `MockWdkAdapter`. The real WDK boundary in `real_wdk_adapter.mjs` is lazy-loaded and approval-gated.

Phase 2 testnet evidence is available as a separate script path. A Sepolia self-send using real WDK was broadcast and confirmed:

- transaction hash: `0xf386adfa61f78b69d96d82ba9c8a551268e12648c6fd487efc98c49e32af6ec4`
- receipt status: `0x1`
- explorer: <https://sepolia.etherscan.io/tx/0xf386adfa61f78b69d96d82ba9c8a551268e12648c6fd487efc98c49e32af6ec4>

## Run Locally

Open the demo directly in a browser:

- `index.html`

No server is required for the demo.

## Test Locally

Install dependencies for the safe real-WDK import preflight:

```powershell
$env:NODE_OPTIONS='--use-system-ca'
corepack pnpm install --ignore-scripts
```

Plain `npm install` and `npm ci` hit an npm CLI "Exit handler never called" failure on this Windows environment during the 2026-05-24 check, while pnpm completed successfully.

```powershell
node tests/state_machine.test.js
node tests/offline_guard.test.js
node tests/real_wdk_boundary.test.js
node tests/wdk_import_preflight.test.mjs
node tests/browser_smoke.test.js
```

## Phase 2 Testnet

`scripts/wdk_phase2_testnet.mjs` uses real WDK on Sepolia by default. It generates an ephemeral test seed in memory, derives an EVM address, checks balance, estimates a self-send fee, and writes a sanitized JSON result. It never prints or writes the seed phrase.

For a reusable funded test address, set a test-only mnemonic in local `WDK_PHASE2_MNEMONIC`. Do not paste that value into chat, docs, commits, screenshots, or logs. When the variable is absent, the script uses a fresh ephemeral seed.

```powershell
$env:NODE_OPTIONS='--use-system-ca'
corepack pnpm install --ignore-scripts
node scripts/wdk_phase2_testnet.mjs
```

Optional environment variables:

- `WDK_PHASE2_PROVIDER_URL`: EVM RPC URL, defaults to public Sepolia dRPC.
- `WDK_PHASE2_CHAIN_ID`: defaults to `11155111`.
- `WDK_PHASE2_MNEMONIC`: optional test-only mnemonic for reusing a funded Sepolia address; never logged or written.
- `WDK_PHASE2_ENABLE_TESTNET_BROADCAST`: set to `true` to allow testnet broadcast.
- `WDK_PHASE2_RECIPIENT`: recipient address, defaults to `self`.
- `WDK_PHASE2_VALUE_WEI`: native value to send, defaults to `0`.

Broadcast is skipped if the account has insufficient testnet balance for value plus estimated fee.

## Real WDK Boundary

The package records WDK dependencies in `package.json`:

- `@tetherto/wdk`
- `@tetherto/wdk-wallet-evm`

Real activation is intentionally blocked until all of these are explicitly approved:

- wallet handling
- mnemonic or seed source handling
- provider/RPC selection
- testnet or mainnet selection
- transaction signing
- transaction broadcasting
- dependency audit review

`tests/wdk_import_preflight.test.mjs` is the first safe real-WDK check. It imports the official WDK packages and verifies the exposed SDK shapes, but it does not generate a seed phrase, create/import a wallet, connect to RPC, use testnet/mainnet, sign, or broadcast.

## Public Release Notes

License: Apache-2.0.

This project is intentionally scoped as a reference kit and testnet proof, not a production payment processor. Do not use the Phase 2 script with mainnet funds or production mnemonics.
