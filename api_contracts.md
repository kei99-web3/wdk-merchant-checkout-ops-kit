# Mock API Contracts

These contracts are local documentation only. No endpoint is hosted or called.

## POST /payment-intents

Creates a local payment intent for checkout.

```json
{
  "orderId": "order_demo",
  "amount": 173.6,
  "asset": "USDt",
  "network": "Mock EVM",
  "idempotencyKey": "idem_demo"
}
```

## POST /payment-intents/{id}/quote

Returns a mock quote that maps to the embedded wallet step.

```json
{
  "quoteId": "quote_demo",
  "amount": 173.6,
  "asset": "USDt",
  "network": "Mock EVM",
  "feeEstimate": 0.08,
  "expiresAt": "mock_timestamp"
}
```

## GET /payment-intents/{id}/status

Returns the mock payment state and confirmation evidence.

```json
{
  "state": "confirmed",
  "confirmations": 3,
  "releaseLocked": false
}
```

## POST /orders/{id}/release-check

Returns whether merchant fulfillment can be released.

```json
{
  "reconciliation": "matched",
  "releaseAllowed": true,
  "risk": "Ready to release"
}
```
