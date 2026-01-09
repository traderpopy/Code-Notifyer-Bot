// ═══════════════════════════════════════════════════════════════════════════
// AUTO-LOGIN MODULE
// Handles automatic session renewal when cookie expires
// ═══════════════════════════════════════════════════════════════════════════

import http from 'http';
import querystring from 'querystring';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CONFIG } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Login credentials
const LOGIN_CREDENTIALS = {
    username: CONFIG.loginUsername,
    password: CONFIG.loginPassword
};

// Current session cookie (in-memory)
let currentSessionCookie = null;

/**
 * Solve the math captcha from login page HTML
 */
function solveMathCaptcha(html) {
    const match = html.match(/What is (\d+) \+ (\d+) = \?/);
    if (match) {
        return parseInt(match[1]) + parseInt(match[2]);
    }
    return null;
}

/**
 * Make HTTP request with redirect handling
 */
function httpRequest(method, urlPath, cookie = null, postData = null, followRedirects = true, redirectCount = 0) {
    return new Promise((resolve, reject) => {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
            'Referer': 'http://185.2.83.39/ints/signin'
        };

        if (cookie) {
            headers['Cookie'] = `PHPSESSID=${cookie}`;
        }

        let body = '';
        if (postData) {
            body = querystring.stringify(postData);
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            headers['Content-Length'] = Buffer.byteLength(body);
        }

        const options = {
            hostname: '185.2.83.39',
            port: 80,
            path: urlPath,
            method: method,
            headers: headers
        };

        const req = http.request(options, (res) => {
            let responseBody = '';
            let currentCookie = cookie;

            if (res.headers['set-cookie']) {
                const cookieMatch = res.headers['set-cookie'][0].match(/PHPSESSID=([^;]+)/);
                if (cookieMatch) {
                    currentCookie = cookieMatch[1];
                }
            }

            res.on('data', (chunk) => {
                responseBody += chunk;
            });

            res.on('end', () => {
                if (followRedirects && (res.statusCode === 301 || res.statusCode === 302)) {
                    if (redirectCount > 5) {
                        return reject(new Error('Too many redirects'));
                    }

                    const location = res.headers['location'];
                    let newPath = location;

                    if (!location.startsWith('http')) {
                        if (location === './') {
                            newPath = '/ints/';
                        } else if (location.startsWith('./')) {
                            newPath = '/ints/' + location.substring(2);
                        } else if (location.startsWith('/')) {
                            newPath = location;
                        } else {
                            const currentDir = urlPath.substring(0, urlPath.lastIndexOf('/') + 1);
                            newPath = currentDir + location;
                        }
                    }

                    return httpRequest('GET', newPath, currentCookie, null, followRedirects, redirectCount + 1)
                        .then(resolve)
                        .catch(reject);
                }

                resolve({
                    body: responseBody,
                    cookie: currentCookie,
                    statusCode: res.statusCode,
                    urlPath: urlPath
                });
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (body) {
            req.write(body);
        }

        req.end();
    });
}

/**
 * Update .env file with new session cookie
 */
function updateEnvFile(cookie) {
    const envPath = path.join(__dirname, '..', '.env');
    let envContent = '';

    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    }

    const lines = envContent.split('\n').filter(line => line.trim() !== '');
    let found = false;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('SESSION_COOKIE=')) {
            lines[i] = `SESSION_COOKIE=PHPSESSID=${cookie}`;
            found = true;
            break;
        }
    }

    if (!found) {
        lines.push(`SESSION_COOKIE=PHPSESSID=${cookie}`);
    }

    fs.writeFileSync(envPath, lines.join('\n') + '\n');
}

/**
 * Perform login and get new session cookie
 * @returns {Promise<string|null>} Session cookie or null on failure
 */
export async function login() {
    try {
        console.log('🔐 [AUTH] Attempting to login...');

        // Step 1: Get login page and cookie
        const loginPage = await httpRequest('GET', '/ints/signin');

        // Step 2: Solve captcha
        const captchaAnswer = solveMathCaptcha(loginPage.body);

        if (!captchaAnswer) {
            console.error('❌ [AUTH] Failed to extract captcha');
            return null;
        }

        console.log(`🔐 [AUTH] Captcha solved: ${captchaAnswer}`);

        // Step 3: Submit login
        const loginResult = await httpRequest('POST', '/ints/signin', loginPage.cookie, {
            username: LOGIN_CREDENTIALS.username,
            password: LOGIN_CREDENTIALS.password,
            capt: captchaAnswer.toString()
        });

        // Step 4: Check result
        if (loginResult.body.includes('Dashboard') ||
            loginResult.body.includes('SMSDashboard') ||
            loginResult.body.includes('kstotp')) {

            console.log('✅ [AUTH] Login successful!');

            // Update in-memory cookie
            currentSessionCookie = `PHPSESSID=${loginResult.cookie}`;

            // Save to .env file
            updateEnvFile(loginResult.cookie);
            console.log('✅ [AUTH] Session saved to .env');

            return currentSessionCookie;
        }

        if (loginResult.body.includes('Captcha Verification Failed')) {
            console.error('❌ [AUTH] Captcha verification failed, retrying...');
            // Retry once
            return await login();
        }

        console.error('❌ [AUTH] Login failed - Unknown error');
        return null;

    } catch (error) {
        console.error('❌ [AUTH] Login error:', error.message);
        return null;
    }
}

/**
 * Get current session cookie (from memory or .env)
 * @returns {string} Session cookie
 */
export function getSessionCookie() {
    if (currentSessionCookie) {
        return currentSessionCookie;
    }

    // Try to load from environment
    if (process.env.SESSION_COOKIE) {
        currentSessionCookie = process.env.SESSION_COOKIE;
        return currentSessionCookie;
    }

    // Fallback to config default
    return 'PHPSESSID=89mjqe96d845np2mtd1l1m0cb4';
}

/**
 * Refresh session - called when API detects expired session
 * @returns {Promise<string|null>} New session cookie or null
 */
export async function refreshSession() {
    console.log('🔄 [AUTH] Session expired, refreshing...');
    return await login();
}

/**
 * Check if response indicates expired session
 * @param {Response|Object} response - Fetch response or parsed data
 * @param {string} responseText - Raw response text (optional)
 * @returns {boolean}
 */
export function isSessionExpired(response, responseText = '') {
    // Check HTTP status
    if (response.status === 401 || response.status === 403) {
        return true;
    }

    // Check if redirected to login page
    if (response.redirected && response.url && response.url.includes('signin')) {
        return true;
    }

    // If response text exists, check if it looks like valid API data
    if (responseText) {
        // Try to parse as JSON - if it has 'aaData', it's a valid response
        try {
            const data = JSON.parse(responseText);
            if (data && (data.aaData !== undefined || data.iTotalRecords !== undefined)) {
                // This is valid API data, not expired
                return false;
            }
        } catch (e) {
            // Not JSON - might be HTML login page
        }

        // Check response body for login page indicators (HTML response)
        const lowerText = responseText.toLowerCase();

        // If it contains HTML form elements for login, session is expired
        if ((lowerText.includes('<form') && lowerText.includes('signin')) ||
            (lowerText.includes('<form') && lowerText.includes('password')) ||
            lowerText.includes('session expired') ||
            lowerText.includes('please login') ||
            lowerText.includes('<!doctype html')) {
            return true;
        }
    }

    // Empty response could mean session issue
    if (responseText === '') {
        return true;
    }

    return false;
}

