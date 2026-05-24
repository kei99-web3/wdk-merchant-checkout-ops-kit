# Reconciliation Model

The merchant release lock stays closed unless these checks pass:

- payment intent exists
- buyer approval was simulated
- payment submit boundary was reached
- confirmation state is `confirmed`
- paid amount matches order total
- duplicate/expired/failed/underpaid states are absent

The model is intentionally local-only. It demonstrates how an ecommerce merchant can reason about fulfillment without understanding blockchain internals.
