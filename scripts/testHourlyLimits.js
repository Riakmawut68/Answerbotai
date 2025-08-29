// Simple test driver to exercise per-user hourly limits via webhook
// Run: node scripts/testHourlyLimits.js

const axios = require('axios');

const BASE = process.env.TEST_BASE || 'http://localhost:3000';
const PAGE_ID = 'PAGE_TEST_1';
const USER_ID = process.env.TEST_USER_ID || 'USER_LIMIT_TEST_1';

async function post(payload) {
    const url = `${BASE}/webhook`;
    const res = await axios.post(url, payload, { timeout: 10000 });
    return res.status;
}

function message(mid, text) {
    return {
        object: 'page',
        entry: [
            {
                messaging: [
                    {
                        sender: { id: USER_ID },
                        recipient: { id: PAGE_ID },
                        message: { mid, text }
                    }
                ]
            }
        ]
    };
}

function postback(payload) {
    return {
        object: 'page',
        entry: [
            {
                messaging: [
                    {
                        sender: { id: USER_ID },
                        recipient: { id: PAGE_ID },
                        postback: { payload }
                    }
                ]
            }
        ]
    };
}

async function run() {
    console.log('Starting hourly limit test for user:', USER_ID);

    // Fresh user onboarding: hi → welcome, I_AGREE, phone, then 3 AI questions
    await post(message('m1', 'Hi'));
    await new Promise(r => setTimeout(r, 300));
    await post(postback('I_AGREE'));
    await new Promise(r => setTimeout(r, 300));
    await post(message('m2', '0922950783'));

    // Send 3 questions (should be allowed in freemium)
    await new Promise(r => setTimeout(r, 300));
    await post(message('m3', 'Q1?'));
    await new Promise(r => setTimeout(r, 300));
    await post(message('m4', 'Q2?'));
    await new Promise(r => setTimeout(r, 300));
    await post(message('m5', 'Q3?'));

    // 4th within hour should trigger AI/hour limit
    await new Promise(r => setTimeout(r, 300));
    await post(message('m6', 'Q4?'));

    console.log('Sent 4th question; check logs for AI RATE LIMITED and USER METRICS for', USER_ID);
}

run().catch(err => {
    console.error('Test failed:', err.message);
    process.exit(1);
});


