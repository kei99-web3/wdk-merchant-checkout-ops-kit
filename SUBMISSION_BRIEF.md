# Submission Brief

Status: public repository published, Tether application not submitted
License: Apache-2.0
Repository: https://github.com/kei99-web3/wdk-merchant-checkout-ops-kit

## Bounty Fit

Target bounty: Tether Developer Grants, WDK in eCommerce.

The bounty asks for a reference implementation showing how WDK can support ecommerce checkout flows, payment confirmations, and embedded wallet experiences.

This project focuses on the merchant operations gap behind those words: not just a crypto checkout button, but a flow that helps a merchant move safely from order billing to wallet approval, payment confirmation, reconciliation, and fulfillment release. It is also designed with in-person storefront use in mind: a staff member should be able to check status from a smartphone and make a simple release/hold decision without understanding wallet internals.

## Core Differentiator

Not just a crypto checkout button, but a merchant operations reference kit for payment confirmation, reconciliation, and fulfillment release.

The project puts the merchant-side operating problem first: after a buyer approves a payment, the merchant still needs evidence, confirmation, reconciliation, anomaly handling, and a safe release decision before fulfilling the order.

A secondary design principle is phone-first usability for real stores. The intended operator is not necessarily a crypto-native developer; it may be a cashier, store owner, or support staff member who checks three concrete evidence cards: payment status, order ID/amount match, and receipt evidence. Goods are handed over only when all three are OK.

## WDK Mapping

| Ecommerce flow | Demo behavior | WDK boundary |
| --- | --- | --- |
| Order billing | Creates a payment intent from cart/order data | Before WDK; creates the input to wallet payment |
| Embedded wallet selection | Selects a mock buyer account | `getAccount` |
| Payment quote | Shows amount, asset, network, fee, expiry | Quote/fee/payment-service boundary |
| Buyer approval | Simulates consent without signing | User approval/signing boundary |
| Submit payment | Creates a disabled mock transaction hash | Transaction submit boundary |
| Confirmation | Simulates watcher updates and receipt evidence | Confirmation/indexer/RPC boundary |
| Fulfillment release | Unlocks only when payment is confirmed and reconciliation is matched | Merchant order release decision |

## What Is Real WDK Now?

The current package includes official WDK dependencies:

- `@tetherto/wdk`
- `@tetherto/wdk-wallet-evm`

The safe preflight test `tests/wdk_import_preflight.test.mjs` imports those packages and verifies their exposed SDK shapes. It does not generate a seed phrase, create or import a wallet, connect to RPC, use testnet/mainnet, sign, or broadcast.

On this Windows environment, `npm install` and `npm ci` failed with an npm CLI "Exit handler never called" issue. Dependency installation succeeded with:

```powershell
$env:NODE_OPTIONS='--use-system-ca'
corepack pnpm install --ignore-scripts
```

That is now the preferred local preflight install path for this candidate.

The real activation boundary is isolated in `real_wdk_adapter.mjs` and remains blocked until the user explicitly approves wallet handling, mnemonic/seed source handling, provider/RPC selection, chain selection, signing, broadcasting, and dependency audit review.

## Why Mock-First?

Mock-first is a deliberate safety choice for the application stage:

- no accidental seed phrase handling
- no API key or RPC provider custody
- no testnet/mainnet side effects
- no transaction signing or broadcasting
- no ambiguity about what is demonstrable now versus what requires scope agreement

This makes the browser demo a safe Phase 1 reference implementation. Phase 2 has also been proven separately with a real WDK Sepolia script, while keeping the public browser demo free of wallet custody and production network side effects.

## Verification

The local and candidate packages should pass:

```powershell
node tests/state_machine.test.js
node tests/offline_guard.test.js
node tests/real_wdk_boundary.test.js
node tests/wdk_import_preflight.test.mjs
node tests/browser_smoke.test.js
```

## Known Risk

The initial audit found a moderate transitive `ws` advisory through:

`@tetherto/wdk-wallet-evm -> ethers -> ws`

The candidate now uses pnpm with an override to `ws@8.20.1`. `corepack pnpm audit --prod --json` reports 0 vulnerabilities after the override.

The browser demo still uses `MockWdkAdapter` and does not load the real WDK adapter.

## Real WDK Phase 2 Evidence

With user approval, a guarded Sepolia script was added:

`scripts/wdk_phase2_testnet.mjs`

It uses real WDK to generate an ephemeral in-memory seed, derive an EVM address, connect to Sepolia RPC, read the native balance, estimate a self-send fee, and optionally broadcast only if the generated test address has enough testnet ETH.

For a reusable funded test address, the same script can also read a test-only mnemonic from the local `WDK_PHASE2_MNEMONIC` environment variable. The mnemonic is never logged, written to JSON, written to HTML, or committed. If the variable is absent, the script falls back to a fresh ephemeral seed.

Current run result:

- chain: Sepolia, chainId `11155111`
- seed handling: local env test mnemonic, not logged, not written
- address generated: yes
- balance checked: yes
- fee estimated: yes
- broadcast requested: yes
- broadcast attempted: yes
- transaction hash: `0xf386adfa61f78b69d96d82ba9c8a551268e12648c6fd487efc98c49e32af6ec4`
- receipt status: `0x1` success
- receipt block: `10910510`

This proves real WDK integration beyond static import while still avoiding real funds and secret persistence.

Follow-up faucet check:

- a no-login Sepolia PoW faucet candidate was reachable
- the faucet configuration requires a custom CAPTCHA before starting a claim session
- Codex did not attempt to bypass or automate the CAPTCHA
- after user-completed manual funding, a Sepolia self-send transaction hash was obtained and confirmed

See `deliverables/2026-05-24_wdk_phase2_faucet_and_broadcast_readiness.html`.

## Open Decisions Before Submission

- user full name and email
- relevant experience wording
- whether to publish a public repository
- repository owner/name
- whether to include the Japanese demo in the public repository
- Tether terms acceptance
- KYC/payment details tolerance after acceptance
- whether to include the Phase 2 transaction hash in the submission materials
