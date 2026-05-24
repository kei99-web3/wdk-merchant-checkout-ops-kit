(function runCheckoutDemo() {
  const { PAYMENT_STATES, MockWdkAdapter, evaluateReleaseLock, makeId, makeTimestamp } = window.WdkDemo;

  const demoData = {
    merchant: {
      name: "North Pier Outfitters",
      storeId: "merchant_demo_001",
      settlementAsset: "USDt",
      network: "Mock EVM",
      releasePolicy: "Release fulfillment only after confirmed payment and reconciliation match."
    },
    cart: [
      { sku: "NPO-JKT-01", name: "Stormshell Field Jacket", quantity: 1, unitPrice: 128 },
      { sku: "NPO-PCK-02", name: "Dry Pack Insert", quantity: 2, unitPrice: 16 }
    ],
    fees: {
      shipping: 12,
      tax: 13.6
    }
  };

  const stateOrder = [
    PAYMENT_STATES.CREATED,
    PAYMENT_STATES.AWAITING_WALLET,
    PAYMENT_STATES.BROADCAST_PENDING,
    PAYMENT_STATES.CONFIRMING,
    PAYMENT_STATES.CONFIRMED
  ];

  const mappingSteps = [
    "getAccount",
    "quotePayment",
    "requestUserApproval",
    "submitPayment",
    "watchConfirmation",
    "releaseLock"
  ];

  const dom = {
    cartLines: document.getElementById("cart-lines"),
    cartTotals: document.getElementById("cart-totals"),
    assetSelect: document.getElementById("asset-select"),
    networkSelect: document.getElementById("network-select"),
    createIntent: document.getElementById("create-intent"),
    resetDemo: document.getElementById("reset-demo"),
    selectAccount: document.getElementById("select-account"),
    quotePayment: document.getElementById("quote-payment"),
    approvePayment: document.getElementById("approve-payment"),
    simulateConfirm: document.getElementById("simulate-confirm"),
    simulateUnderpay: document.getElementById("simulate-underpay"),
    simulateOverpay: document.getElementById("simulate-overpay"),
    simulateDuplicate: document.getElementById("simulate-duplicate"),
    expireIntent: document.getElementById("expire-intent"),
    failPayment: document.getElementById("fail-payment"),
    intentId: document.getElementById("intent-id"),
    paymentState: document.getElementById("payment-state"),
    stateStrip: document.getElementById("state-strip"),
    accountLabel: document.getElementById("account-label"),
    accountMeta: document.getElementById("account-meta"),
    quoteAmount: document.getElementById("quote-amount"),
    quoteMeta: document.getElementById("quote-meta"),
    approvalState: document.getElementById("approval-state"),
    approvalMeta: document.getElementById("approval-meta"),
    reconciliationState: document.getElementById("reconciliation-state"),
    reconciliationMeta: document.getElementById("reconciliation-meta"),
    fulfillmentState: document.getElementById("fulfillment-state"),
    fulfillmentMeta: document.getElementById("fulfillment-meta"),
    releasePill: document.getElementById("release-pill"),
    riskState: document.getElementById("risk-state"),
    riskMeta: document.getElementById("risk-meta"),
    orderRows: document.getElementById("order-rows"),
    receiptList: document.getElementById("receipt-list"),
    traceList: document.getElementById("trace-list"),
    mappingCount: document.getElementById("mapping-count"),
    apiPanel: document.getElementById("api-panel"),
    apiJson: document.getElementById("api-json"),
    toggleApi: document.getElementById("toggle-api")
  };

  const app = {
    adapter: new MockWdkAdapter(),
    intent: null,
    account: null,
    quote: null,
    approval: null,
    payment: null,
    confirmation: null,
    releaseLocked: true,
    reconciliation: "pending",
    risk: "No signal",
    events: []
  };

  function formatMoney(value) {
    return `${value.toFixed(2)} USDt`;
  }

  function cartSubtotal() {
    return demoData.cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }

  function cartTotal() {
    return cartSubtotal() + demoData.fees.shipping + demoData.fees.tax;
  }

  function addEvent(label, detail) {
    app.events.unshift({
      label,
      detail,
      at: makeTimestamp()
    });
    if (app.events.length > 10) {
      app.events.pop();
    }
  }

  function createIntent() {
    const amount = Number(cartTotal().toFixed(2));
    app.adapter = new MockWdkAdapter({
      asset: dom.assetSelect.value,
      chain: dom.networkSelect.value
    });
    app.intent = {
      intentId: makeId("intent"),
      orderId: makeId("order"),
      merchantId: demoData.merchant.storeId,
      amount,
      asset: dom.assetSelect.value,
      network: dom.networkSelect.value,
      state: PAYMENT_STATES.CREATED,
      createdAt: makeTimestamp(),
      expiresAt: makeTimestamp(15 * 60 * 1000),
      idempotencyKey: makeId("idem")
    };
    app.account = null;
    app.quote = null;
    app.approval = null;
    app.payment = null;
    app.confirmation = null;
    app.releaseLocked = true;
    app.reconciliation = "pending";
    app.risk = "No signal";
    addEvent("payment_intent.created", "Local mock intent created.");
    render();
  }

  function selectAccount() {
    if (!app.intent) return;
    app.adapter.createWalletSession();
    app.account = app.adapter.getAccount(app.intent.network, 0);
    app.intent.state = PAYMENT_STATES.AWAITING_WALLET;
    addEvent("wdk.account.selected", "Mock account mapped to embedded wallet step.");
    render();
  }

  function quotePayment() {
    if (!app.intent || !app.account) return;
    app.quote = app.adapter.quotePayment(app.intent);
    addEvent("wdk.quote.created", "Mock quote created for checkout amount.");
    render();
  }

  function approvePayment() {
    if (!app.quote) return;
    app.approval = app.adapter.requestUserApproval(app.quote);
    app.payment = app.adapter.submitPayment(app.approval, app.quote);
    app.intent.state = PAYMENT_STATES.BROADCAST_PENDING;
    addEvent("wdk.payment.submitted", "Real broadcast disabled; mock hash generated.");
    render();
  }

  function setTerminalState(status, detail) {
    if (!app.intent) return;
    app.intent.state = status;
    app.confirmation = {
      paymentHash: app.payment ? app.payment.paymentHash : "none",
      status,
      confirmations: status === PAYMENT_STATES.CONFIRMED ? 3 : 0,
      observedAt: makeTimestamp()
    };
    app.reconciliation = status === PAYMENT_STATES.CONFIRMED ? "matched" : status;
    app.releaseLocked = evaluateReleaseLock(status, app.reconciliation).locked;
    app.risk = detail;
    addEvent(`payment.${status}`, detail);
    render();
  }

  function simulateConfirmation() {
    if (!app.payment) return;
    app.intent.state = PAYMENT_STATES.CONFIRMING;
    app.confirmation = app.adapter.watchConfirmation(app.payment, PAYMENT_STATES.CONFIRMED);
    app.intent.state = PAYMENT_STATES.CONFIRMED;
    app.reconciliation = "matched";
    app.releaseLocked = evaluateReleaseLock(app.intent.state, app.reconciliation).locked;
    app.risk = "Ready to release";
    app.adapter.traceStep("releaseLock", "Fulfillment lock opens after confirmation and reconciliation pass.");
    addEvent("release.unlocked", "Payment matched order total; fulfillment can be released.");
    render();
  }

  function resetDemo() {
    app.adapter = new MockWdkAdapter();
    app.intent = null;
    app.account = null;
    app.quote = null;
    app.approval = null;
    app.payment = null;
    app.confirmation = null;
    app.releaseLocked = true;
    app.reconciliation = "pending";
    app.risk = "No signal";
    app.events = [];
    render();
  }

  function getCompletedMappings() {
    const traceSteps = new Set(app.adapter.trace.map((event) => event.step));
    return mappingSteps.filter((step) => traceSteps.has(step));
  }

  function apiSnapshot() {
    return {
      "POST /payment-intents": {
        request: {
          orderId: app.intent ? app.intent.orderId : "order_placeholder",
          amount: cartTotal(),
          asset: dom.assetSelect.value,
          network: dom.networkSelect.value,
          idempotencyKey: app.intent ? app.intent.idempotencyKey : "idem_placeholder"
        },
        response: app.intent || { status: "not_created" }
      },
      "POST /payment-intents/{id}/quote": {
        response: app.quote || { status: "quote_pending" }
      },
      "GET /payment-intents/{id}/status": {
        response: {
          state: app.intent ? app.intent.state : "idle",
          confirmation: app.confirmation,
          releaseLocked: app.releaseLocked
        }
      },
      "POST /orders/{id}/release-check": {
        response: {
          reconciliation: app.reconciliation,
          releaseAllowed: !app.releaseLocked,
          risk: app.risk
        }
      }
    };
  }

  function renderCart() {
    dom.cartLines.innerHTML = demoData.cart.map((item) => `
      <tr>
        <td><strong>${item.name}</strong><br><span>${item.sku}</span></td>
        <td>${item.quantity}</td>
        <td>${formatMoney(item.unitPrice * item.quantity)}</td>
      </tr>
    `).join("");

    dom.cartTotals.innerHTML = `
      <div class="total-line"><span>Subtotal</span><strong>${formatMoney(cartSubtotal())}</strong></div>
      <div class="total-line"><span>Shipping</span><strong>${formatMoney(demoData.fees.shipping)}</strong></div>
      <div class="total-line"><span>Tax</span><strong>${formatMoney(demoData.fees.tax)}</strong></div>
      <div class="total-line final"><span>Total</span><strong>${formatMoney(cartTotal())}</strong></div>
    `;
  }

  function renderStateStrip() {
    const currentIndex = app.intent ? stateOrder.indexOf(app.intent.state) : -1;
    const terminalBad = app.intent && !stateOrder.includes(app.intent.state);
    dom.stateStrip.innerHTML = stateOrder.map((state, index) => {
      const className = index < currentIndex
        ? "complete"
        : index === currentIndex
          ? "active"
          : "";
      return `
        <div class="state-step ${className}">
          <strong>${state}</strong>
          <span>${index < currentIndex ? "complete" : index === currentIndex ? "current" : "waiting"}</span>
        </div>
      `;
    }).join("") + (terminalBad ? `
      <div class="state-step blocked">
        <strong>${app.intent.state}</strong>
        <span>release locked</span>
      </div>
    ` : "");
  }

  function renderSummary() {
    dom.intentId.textContent = app.intent ? app.intent.intentId : "No intent";
    dom.paymentState.textContent = app.intent ? app.intent.state : "idle";
    dom.accountLabel.textContent = app.account ? app.account.label : "Not selected";
    dom.accountMeta.textContent = app.account ? `${app.account.chain} / ${app.account.addressPreview}` : "Mock WDK session pending";
    dom.quoteAmount.textContent = app.quote ? formatMoney(app.quote.amount + app.quote.feeEstimate) : "-";
    dom.quoteMeta.textContent = app.quote ? `${app.quote.asset} on ${app.quote.network}` : "No quote";
    dom.approvalState.textContent = app.approval ? "Approved" : "Waiting";
    dom.approvalMeta.textContent = app.approval ? app.approval.approvalId : "No signing occurs";
    dom.reconciliationState.textContent = app.reconciliation;
    dom.reconciliationMeta.textContent = app.intent ? `Order ${app.intent.orderId}` : "No payment intent";
    dom.fulfillmentState.textContent = app.releaseLocked ? "Locked" : "Release";
    dom.fulfillmentState.className = app.releaseLocked ? "release-blocked" : "release-ready";
    dom.fulfillmentMeta.textContent = app.releaseLocked ? "Confirmation and reconciliation required" : "Payment matched order total";
    dom.releasePill.textContent = app.releaseLocked ? "Locked" : "Unlocked";
    dom.releasePill.className = app.releaseLocked ? "pill block" : "pill ok";
    dom.riskState.textContent = app.risk;
    dom.riskMeta.textContent = app.intent ? "Local-only risk signal" : "Mock-only checks";
  }

  function renderControls() {
    const hasIntent = Boolean(app.intent);
    const hasAccount = Boolean(app.account);
    const hasQuote = Boolean(app.quote);
    const hasPayment = Boolean(app.payment);
    const isTerminal = app.intent && [
      PAYMENT_STATES.CONFIRMED,
      PAYMENT_STATES.EXPIRED,
      PAYMENT_STATES.FAILED,
      PAYMENT_STATES.UNDERPAID,
      PAYMENT_STATES.OVERPAID,
      PAYMENT_STATES.DUPLICATE
    ].includes(app.intent.state);

    dom.createIntent.disabled = hasIntent && !isTerminal;
    dom.selectAccount.disabled = !hasIntent || hasAccount || isTerminal;
    dom.quotePayment.disabled = !hasAccount || hasQuote || isTerminal;
    dom.approvePayment.disabled = !hasQuote || hasPayment || isTerminal;
    dom.simulateConfirm.disabled = !hasPayment || isTerminal;
    dom.simulateUnderpay.disabled = !hasPayment || isTerminal;
    dom.simulateOverpay.disabled = !hasPayment || isTerminal;
    dom.simulateDuplicate.disabled = !hasPayment || isTerminal;
    dom.expireIntent.disabled = !hasIntent || isTerminal;
    dom.failPayment.disabled = !hasIntent || isTerminal;
  }

  function renderOrders() {
    const releaseText = app.releaseLocked ? "Locked" : "Release allowed";
    const releaseClass = app.releaseLocked ? "release-blocked" : "release-ready";
    dom.orderRows.innerHTML = `
      <tr>
        <td><strong>${app.intent ? app.intent.orderId : "No order"}</strong><br><span>${demoData.merchant.name}</span></td>
        <td>${app.intent ? app.intent.state : "idle"}<br><span>${app.intent ? formatMoney(app.intent.amount) : "-"}</span></td>
        <td><strong class="${releaseClass}">${releaseText}</strong><br><span>${app.reconciliation}</span></td>
      </tr>
    `;
  }

  function renderReceipt() {
    const rows = app.intent ? [
      ["Receipt", app.confirmation ? `receipt_${app.intent.intentId.slice(-8)}` : "pending"],
      ["Order", app.intent.orderId],
      ["Amount", formatMoney(app.intent.amount)],
      ["Asset / network", `${app.intent.asset} / ${app.intent.network}`],
      ["Payment", app.payment ? app.payment.paymentHash : "not submitted"],
      ["State", app.intent.state],
      ["Release", app.releaseLocked ? "locked" : "unlocked"]
    ] : [["Receipt", "No payment intent"]];

    dom.receiptList.innerHTML = rows.map(([key, value]) => `
      <div class="receipt-item">
        <strong>${key}</strong>
        <span>${value}</span>
      </div>
    `).join("");
  }

  function renderTrace() {
    const completed = getCompletedMappings();
    dom.mappingCount.textContent = `${completed.length} / ${mappingSteps.length}`;
    dom.mappingCount.className = completed.length === mappingSteps.length ? "pill ok" : "pill warn";

    const traceRows = mappingSteps.map((step) => {
      const event = app.adapter.trace.find((item) => item.step === step);
      return {
        step,
        detail: event ? event.detail : "waiting",
        complete: Boolean(event)
      };
    });

    dom.traceList.innerHTML = traceRows.map((item) => `
      <div class="trace-item">
        <strong>${item.complete ? "ok" : "-"} ${item.step}</strong>
        <span>${item.detail}</span>
      </div>
    `).join("");
  }

  function renderApi() {
    dom.apiJson.textContent = JSON.stringify(apiSnapshot(), null, 2);
  }

  function render() {
    renderCart();
    renderStateStrip();
    renderSummary();
    renderControls();
    renderOrders();
    renderReceipt();
    renderTrace();
    renderApi();
  }

  dom.createIntent.addEventListener("click", createIntent);
  dom.resetDemo.addEventListener("click", resetDemo);
  dom.selectAccount.addEventListener("click", selectAccount);
  dom.quotePayment.addEventListener("click", quotePayment);
  dom.approvePayment.addEventListener("click", approvePayment);
  dom.simulateConfirm.addEventListener("click", simulateConfirmation);
  dom.simulateUnderpay.addEventListener("click", () => setTerminalState(PAYMENT_STATES.UNDERPAID, "Paid amount is lower than order total."));
  dom.simulateOverpay.addEventListener("click", () => setTerminalState(PAYMENT_STATES.OVERPAID, "Paid amount exceeds order total; manual review required."));
  dom.simulateDuplicate.addEventListener("click", () => setTerminalState(PAYMENT_STATES.DUPLICATE, "Duplicate payment hash detected; release remains locked."));
  dom.expireIntent.addEventListener("click", () => setTerminalState(PAYMENT_STATES.EXPIRED, "Payment intent expired before confirmation."));
  dom.failPayment.addEventListener("click", () => setTerminalState(PAYMENT_STATES.FAILED, "Payment failed or buyer cancelled."));
  dom.toggleApi.addEventListener("click", () => {
    dom.apiPanel.hidden = !dom.apiPanel.hidden;
    dom.toggleApi.textContent = dom.apiPanel.hidden ? "Show JSON" : "Hide JSON";
  });

  render();
})();
