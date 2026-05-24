# WDK Mapping Evidence

The demo must prove where WDK fits without touching wallet, RPC, API, testnet, or funds.

| Mapping Test | Demo Evidence | Approval Boundary |
| --- | --- | --- |
| Account selection | `MockWdkAdapter.getAccount()` maps to embedded wallet account selection. | Real wallet/account connection requires approval. |
| Quote | `quotePayment()` maps amount, asset, network, fee, and expiry. | Real provider/API quote requires approval. |
| Approval | `requestUserApproval()` simulates buyer consent. | Real signing requires approval. |
| Submit | `submitPayment()` creates a mock hash and marks real broadcast disabled. | Real transaction/testnet/mainnet requires approval. |
| Confirm | `watchConfirmation()` maps to status watcher and receipt generation. | Real chain watcher/RPC requires approval. |
| Release | `evaluateReleaseLock()` opens fulfillment only after `confirmed` payment and `matched` reconciliation. | Real fulfillment integration requires approval. |

Passing all six mapping tests is required before any application discussion.

## Real WDK Boundary Added

`package.json` includes `@tetherto/wdk` and `@tetherto/wdk-wallet-evm` at pinned beta versions. `real_wdk_adapter.mjs` lazy-loads the real packages only after approval checks pass and defines an approval-gated adapter boundary, but the browser demo does not load it.

`wdk_integration_plan.json` documents which production actor owns each step:

- EC system: order creates the payment intent input automatically.
- Buyer + WDK: account selection and wallet approval/submission.
- WDK or payment service: quote generation.
- AI recommendation + human merchant operator: final release decision.

`tests/real_wdk_boundary.test.js` verifies that this boundary stays lazy-loaded, approval-gated, and disconnected from the browser demo.

This is the furthest safe local integration step before user approval because real WDK initialization requires mnemonic/seed handling and provider/RPC configuration, and the normal next steps can lead to wallet, testnet, and transaction behavior. The current npm audit also reports moderate transitive dependency findings that should be reviewed before any real activation.
