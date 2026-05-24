const assert = require("node:assert/strict");
const {
  MockWdkAdapter,
  RealWdkAdapter,
  PAYMENT_STATES,
  evaluateReleaseLock
} = require("../mock_wdk_adapter.js");

function makeIntent() {
  return {
    intentId: "intent_test",
    orderId: "order_test",
    amount: 173.6,
    asset: "USDt",
    network: "Mock EVM",
    expiresAt: "2099-01-01T00:00:00.000Z",
    state: PAYMENT_STATES.CREATED
  };
}

function testMappingHappyPath() {
  const adapter = new MockWdkAdapter();
  const intent = makeIntent();
  const session = adapter.createWalletSession();
  const account = adapter.getAccount(intent.network, 0);
  const quote = adapter.quotePayment(intent);
  const approval = adapter.requestUserApproval(quote);
  const payment = adapter.submitPayment(approval, quote);
  const confirmation = adapter.watchConfirmation(payment, PAYMENT_STATES.CONFIRMED);
  adapter.traceStep("releaseLock", "Fulfillment lock opens after confirmation and reconciliation pass.");

  assert.equal(session.mode, "mock_only");
  assert.equal(account.addressPreview, "mock:buyer-account");
  assert.equal(quote.amount, intent.amount);
  assert.equal(approval.approved, true);
  assert.equal(payment.disabledRealBroadcast, true);
  assert.equal(confirmation.status, PAYMENT_STATES.CONFIRMED);

  const steps = new Set(adapter.trace.map((event) => event.step));
  for (const step of ["getAccount", "quotePayment", "requestUserApproval", "submitPayment", "watchConfirmation", "releaseLock"]) {
    assert.equal(steps.has(step), true, `missing mapping step: ${step}`);
  }
}

function testApprovalGate() {
  assert.throws(() => new RealWdkAdapter(), /approval-gated/i);
}

function testTerminalStates() {
  assert.equal(PAYMENT_STATES.UNDERPAID, "underpaid");
  assert.equal(PAYMENT_STATES.DUPLICATE, "duplicate");
  assert.equal(PAYMENT_STATES.EXPIRED, "expired");
}

function testReleaseLockPolicy() {
  assert.deepEqual(evaluateReleaseLock(PAYMENT_STATES.CONFIRMED, "matched"), {
    releaseAllowed: true,
    locked: false,
    reason: "confirmed payment and reconciliation matched"
  });
  assert.equal(evaluateReleaseLock(PAYMENT_STATES.CONFIRMED, "underpaid").locked, true);
  assert.equal(evaluateReleaseLock(PAYMENT_STATES.UNDERPAID, "matched").locked, true);
  assert.equal(evaluateReleaseLock(PAYMENT_STATES.DUPLICATE, "duplicate").releaseAllowed, false);
}

testMappingHappyPath();
testApprovalGate();
testTerminalStates();
testReleaseLockPolicy();

console.log("state_machine.test.js passed");
