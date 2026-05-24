# Release Manifest

Generated: 2026-05-24 JST
Status: public repository candidate, not submitted to Tether

## Included

| Path | Purpose | Release posture |
| --- | --- | --- |
| `index.html` | English local demo | Candidate |
| `styles.css` | Demo styling | Candidate |
| `app.js` | Mock checkout UI logic | Candidate |
| `mock_wdk_adapter.js` | Mock WDK mapping adapter | Candidate |
| `real_wdk_adapter.mjs` | Approval-gated real WDK boundary | Candidate after audit review |
| `wdk_integration_plan.json` | Activation gates and flow ownership | Candidate |
| `package.json` / `pnpm-lock.yaml` / `pnpm-workspace.yaml` | Dependency pins and audited override | Candidate |
| `LICENSE` | Apache-2.0 license selected by user | Candidate |
| `tests/` | Local verification suite | Candidate |
| `scripts/wdk_phase2_testnet.mjs` | Real WDK Sepolia preflight and guarded broadcast script | Candidate |
| `docs/` | Architecture, integration, security, submission-support docs | Candidate, review before public |
| `screenshots/` | Browser smoke evidence | Candidate |

## Excluded

- parent workspace root files
- `.company/`
- tickets and internal operating state
- Japanese local review materials, archived under the parent project deliverables folder
- private/user identity fields
- API keys, wallet seeds, RPC endpoints, tokens, credentials
- any Tether application submission data not approved by the user

## Known Pre-Release Holds

- No grant application has been submitted.
- No Tether terms have been accepted.
- No mainnet, production wallet, API key, KYC, or payment workflow has been started.
- Real WDK Sepolia proof is included as testnet evidence only.
