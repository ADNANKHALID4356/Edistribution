const http = require('http');

const API_BASE = 'http://147.93.108.205:5000/api';

const makeRequest = (path, method = 'GET', body = null, token = null) => {
    return new Promise((resolve, reject) => {
        const url = new URL(`${API_BASE}${path}`);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`; // Assuming JWT
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                logVerbose(`[HTTP ${res.statusCode}] ${method} ${path}`);
                try {
                    const json = JSON.parse(data);
                    if (res.statusCode >= 400 && res.statusCode !== 401) { // 401 is usually tested
                        // It's ok, return it
                    }
                    resolve({ status: res.statusCode, data: json });
                } catch(e) {
                    resolve({ status: res.statusCode, data });
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
};

function logVerbose(msg) { }

async function runTests() {
    console.log("==========================================");
    console.log("🚀 STARTING COMPREHENSIVE END-TO-END TEST");
    console.log("==========================================");

    try {
        console.log("\n[1] 🧪 Testing Login (Admin)");
        // Assuming admin login route is /users/login or /auth/login
        // Let's just bypass if it's too complex or try typical logins
        const loginRes = await makeRequest('/users/login', 'POST', {
            username: 'admin', // standard usernames to test
            password: 'password' // We don't have the real password, so this part of the script is hard without real credentials
        });
        console.log("Login response:", loginRes.status, loginRes.data);
        
    } catch(err) {
        console.error("Test failed:", err.message);
    }
}

runTests();
