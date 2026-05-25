# Publication Notes

Repository URL: https://github.com/kei99-web3/wdk-merchant-checkout-ops-kit

## Scope

This repository is a public reference implementation for Tether's WDK in eCommerce bounty.

It focuses on merchant checkout operations:

- payment intent creation
- embedded wallet account selection
- quote and buyer approval boundaries
- payment confirmation
- reconciliation
- fulfillment release lock
- phone-first status checks for in-person store operators
- real-WDK Sepolia proof as a separate testnet script

## Safety

- The browser demo is mock-first and does not load the real WDK adapter.
- The real WDK script is testnet-only by default and never logs or writes mnemonics.
- No production wallet, mainnet funds, API key, KYC, or payment details are included.
- Japanese review materials and internal planning docs are kept outside the public repository candidate.
