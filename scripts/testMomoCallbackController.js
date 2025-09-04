// Lightweight test runner that mocks dependencies via require cache BEFORE loading the controller

function setMock(modulePath, exports) {
    const resolved = require.resolve(modulePath);
    require.cache[resolved] = {
        id: resolved,
        filename: resolved,
        loaded: true,
        exports
    };
}

function unsetMock(modulePath) {
    const resolved = require.resolve(modulePath);
    delete require.cache[resolved];
}

// Shared call trackers
const Calls = {
    sendText: [],
    userFinds: [],
    prFinds: [],
    momoHandle: []
};

function resetCalls() {
    Calls.sendText.length = 0;
    Calls.userFinds.length = 0;
    Calls.prFinds.length = 0;
    Calls.momoHandle.length = 0;
}

function installSuccessMocks(referenceId, messengerIdFromPR) {
    // Mock messengerService
    setMock('../services/messengerService', {
        sendText: async (psid, text) => {
            Calls.sendText.push({ psid, text });
            return { ok: true };
        }
    });

    // Mock models
    setMock('../models/paymentRequest', {
        findOne: async (query) => {
            Calls.prFinds.push(query);
            if (query && query.referenceId === referenceId) {
                return { referenceId, messengerId: messengerIdFromPR };
            }
            return null;
        }
    });

    setMock('../models/user', {
        findOne: async (query) => {
            Calls.userFinds.push(query);
            if (query && query['paymentSession.reference'] === referenceId) {
                return null;
            }
            if (query && query.messengerId === messengerIdFromPR) {
                return {
                    messengerId: messengerIdFromPR,
                    subscription: {
                        planType: 'weekly',
                        amount: 3000,
                        status: 'active',
                        expiryDate: new Date(Date.now() + 7 * 24 * 3600 * 1000)
                    }
                };
            }
            return null;
        }
    });

    // Mock momoService class so momoController's new MomoService() uses this
    class MockMomoService {
        async handlePaymentCallback(normalized) {
            Calls.momoHandle.push(normalized);
            return { success: true, status: 'SUCCESSFUL', reference: referenceId };
        }
        getServiceInfo() { return {}; }
        diagnose() { return {}; }
    }
    setMock('../services/momoService', MockMomoService);
}

function installFailureMocks(referenceId, messengerIdFromPR) {
    // messengerService
    setMock('../services/messengerService', {
        sendText: async (psid, text) => {
            Calls.sendText.push({ psid, text });
            return { ok: true };
        }
    });

    // PaymentRequest maps referenceId → messengerId
    setMock('../models/paymentRequest', {
        findOne: async (query) => {
            Calls.prFinds.push(query);
            if (query && query.referenceId === referenceId) {
                return { referenceId, messengerId: messengerIdFromPR };
            }
            return null;
        }
    });

    // User not found in any path
    setMock('../models/user', {
        findOne: async (query) => {
            Calls.userFinds.push(query);
            return null;
        }
    });

    // Mock momoService → FAILED
    class MockMomoService {
        async handlePaymentCallback(normalized) {
            Calls.momoHandle.push(normalized);
            return { success: true, status: 'FAILED', reference: referenceId };
        }
        getServiceInfo() { return {}; }
        diagnose() { return {}; }
    }
    setMock('../services/momoService', MockMomoService);
}

function clearMocks() {
    unsetMock('../services/messengerService');
    unsetMock('../models/paymentRequest');
    unsetMock('../models/user');
    unsetMock('../services/momoService');
}

function createMockRes() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(payload) { this.body = payload; return this; }
    };
}

async function runSuccessfulCallbackTest() {
    console.log('--- SUCCESSFUL CALLBACK TEST ---');

    const referenceId = 'ref-success-123';
    const messengerIdFromPR = 'PSID_SUCCESS_001';

    resetCalls();
    installSuccessMocks(referenceId, messengerIdFromPR);

    // Load controller AFTER mocks so it picks up our mocked modules
    const momoController = require('../controllers/momoController');

    const req = {
        body: { status: 'SUCCESSFUL', externalId: 'ext-xyz' },
        headers: { 'x-reference-id': referenceId },
        ip: '127.0.0.1',
        get: () => 'test-agent'
    };
    const res = createMockRes();

    await momoController.handlePaymentCallback(req, res);

    const sent = Calls.sendText.find(s => s.psid === messengerIdFromPR);
    const ok = res.statusCode === 200 && !!sent && /Payment successful/i.test(sent.text);
    console.log('Assertions:', {
        acknowledged200: res.statusCode === 200,
        sentToMappedMessengerId: !!(sent && sent.psid === messengerIdFromPR),
        richMessageIncludesPlan: !!(sent && /Plan Details|Plan:/i.test(sent.text)),
        result: ok ? 'PASS' : 'FAIL'
    });

    // Clear controller and mocks for next test
    delete require.cache[require.resolve('../controllers/momoController')];
    clearMocks();

    return ok;
}

async function runFailedCallbackTest() {
    console.log('--- FAILED CALLBACK TEST ---');

    const referenceId = 'ref-fail-456';
    const messengerIdFromPR = 'PSID_FAIL_002';

    resetCalls();
    installFailureMocks(referenceId, messengerIdFromPR);
    const momoController = require('../controllers/momoController');

    const req = {
        body: { status: 'FAILED', reason: 'Payer timeout', externalId: 'ext-abc' },
        headers: { 'x-reference-id': referenceId },
        ip: '127.0.0.1',
        get: () => 'test-agent'
    };
    const res = createMockRes();

    await momoController.handlePaymentCallback(req, res);

    const sent = Calls.sendText.find(s => s.psid === messengerIdFromPR);
    const ok = res.statusCode === 200 && !!sent && /Payment failed/i.test(sent.text);
    console.log('Assertions:', {
        acknowledged200: res.statusCode === 200,
        sentToMappedMessengerId: !!(sent && sent.psid === messengerIdFromPR),
        failureMessageIncluded: !!(sent && /Payment failed/i.test(sent.text)),
        result: ok ? 'PASS' : 'FAIL'
    });

    delete require.cache[require.resolve('../controllers/momoController')];
    clearMocks();

    return ok;
}

(async () => {
    try {
        const ok1 = await runSuccessfulCallbackTest();
        const ok2 = await runFailedCallbackTest();
        const allOk = ok1 && ok2;
        console.log('\nOverall:', allOk ? 'PASS' : 'FAIL');
        process.exit(allOk ? 0 : 1);
    } catch (e) {
        console.error('Test runner error:', e);
        process.exit(1);
    }
})();


