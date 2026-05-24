(function attachMockWdkAdapter(globalScope) {
  const PAYMENT_STATES = Object.freeze({
    CREATED: "created",
    AWAITING_WALLET: "awaiting_wallet",
    BROADCAST_PENDING: "broadcast_pending",
    CONFIRMING: "confirming",
    CONFIRMED: "confirmed",
    EXPIRED: "expired",
    FAILED: "failed",
    UNDERPAID: "underpaid",
    OVERPAID: "overpaid",
    DUPLICATE: "duplicate"
  });

  function makeTimestamp(offsetMs = 0) {
    return new Date(Date.now() + offsetMs).toISOString();
  }

  function makeId(prefix) {
    return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`;
  }

  function evaluateReleaseLock(paymentStatus, reconciliationStatus) {
    const releaseAllowed = paymentStatus === PAYMENT_STATES.CONFIRMED && reconciliationStatus === "matched";
    return {
      releaseAllowed,
      locked: !releaseAllowed,
      reason: releaseAllowed
        ? "confirmed payment and reconciliation matched"
        : "confirmation and reconciliation match required"
    };
  }

  class MockWdkAdapter {
    constructor(options = {}) {
      this.chain = options.chain || "mock-evm";
      this.asset = options.asset || "USDt";
      this.accountLabel = options.accountLabel || "Mock buyer account";
      this.trace = [];
    }

    traceStep(step, detail) {
      const event = {
        step,
        detail,
        at: makeTimestamp()
      };
      this.trace.push(event);
      return event;
    }

    createWalletSession() {
      const session = {
        sessionId: makeId("wdk_session"),
        mode: "mock_only",
        chain: this.chain,
        asset: this.asset
      };
      this.traceStep("createWalletSession", "Mock wallet session created without wallet connection.");
      return session;
    }

    getAccount(chain = this.chain, index = 0) {
      const account = {
        label: this.accountLabel,
        chain,
        accountIndex: index,
        addressPreview: "mock:buyer-account",
        custody: "self-custodial-placeholder"
      };
      this.traceStep("getAccount", "Account selection maps to the embedded wallet step.");
      return account;
    }

    quotePayment(paymentIntent) {
      const quote = {
        quoteId: makeId("quote"),
        intentId: paymentIntent.intentId,
        amount: paymentIntent.amount,
        asset: paymentIntent.asset,
        network: paymentIntent.network,
        feeEstimate: 0.08,
        expiresAt: paymentIntent.expiresAt
      };
      this.traceStep("quotePayment", "Quote maps checkout amount, asset, network, fee, and expiry.");
      return quote;
    }

    requestUserApproval(quote) {
      const approval = {
        approvalId: makeId("approval"),
        quoteId: quote.quoteId,
        approved: true,
        signer: "mock-buyer"
      };
      this.traceStep("requestUserApproval", "Buyer consent is simulated without signing.");
      return approval;
    }

    submitPayment(approval, quote) {
      const payment = {
        paymentHash: makeId("mock_tx"),
        approvalId: approval.approvalId,
        quoteId: quote.quoteId,
        status: PAYMENT_STATES.BROADCAST_PENDING,
        disabledRealBroadcast: true
      };
      this.traceStep("submitPayment", "Submit maps to a disabled payment broadcast boundary.");
      return payment;
    }

    watchConfirmation(payment, outcome = "confirmed") {
      const confirmation = {
        paymentHash: payment.paymentHash,
        status: outcome,
        confirmations: outcome === "confirmed" ? 3 : 0,
        observedAt: makeTimestamp()
      };
      this.traceStep("watchConfirmation", "Confirmation watcher updates receipt and release-lock evidence.");
      return confirmation;
    }

    resetTrace() {
      this.trace = [];
    }
  }

  class RealWdkAdapter {
    constructor() {
      throw new Error("RealWdkAdapter is approval-gated. Wallet, API, RPC, testnet, and transactions are disabled.");
    }
  }

  const api = {
    PAYMENT_STATES,
    MockWdkAdapter,
    RealWdkAdapter,
    evaluateReleaseLock,
    makeId,
    makeTimestamp
  };

  globalScope.WdkDemo = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
