// ═══════════════════════════════════════════════════════════════════════════
// AUTO-LOGIN MODULE
// Handles automatic session renewal when cookie expires
// ═══════════════════════════════════════════════════════════════════════════

import http from 'http';
import https from 'https'; // Added for potential HTTPS requests
import querystring from 'querystring';
import { URL } from 'url'; // Added for URL parsing in resolveRedirect
import { CONFIG } from '../config.js';
import { updateEnvVariable } from './env.js';

// Current session cookie (in-memory)
let currentSessionCookie = null;

// Login credentials
const LOGIN_CREDENTIALS = {
    username: CONFIG.loginUsername,
    password: CONFIG.loginPassword
};

/**
 * Resolve and validate redirect URL
 * @param {string} location - Redirect location header
 * @param {string} currentPath - Current request path
 * @param {string} baseUrl - Base URL of the service (defaulting to config or inferred)
 * @returns {string} New resolved path
 * @throws {Error} If cross-domain redirect or invalid URL
 */
function resolveRedirect(location, currentPath, baseUrl = 'http://185.2.83.39') {
    if (!location) throw new Error('Empty redirect location');

    // Handle absolute URLs
    if (location.startsWith('http://') || location.startsWith('https://')) {
        const urlObj = new URL(location);
        const expectedHost = new URL(baseUrl).hostname;

        if (urlObj.hostname !== expectedHost) {
            throw new Error(`Cross-domain redirects not allowed: ${urlObj.hostname}`);
        }

        return urlObj.pathname + urlObj.search;
    }

    // Handle relative paths
    if (location === './') {
        return '/ints/';
    }

    if (location.startsWith('./')) {
        return '/ints/' + location.substring(2);
    }

    if (location.startsWith('/')) {
        return location;
    }

    // Relative to current directory
    const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
    return currentDir + location;
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
                    let newPath;

                    try {
                        newPath = resolveRedirect(location, urlPath);
                    } catch (err) {
                        console.error(`❌ [AUTH] Redirect error: ${err.message}`);
                        return reject(err);
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
 * Perform login and get new session cookie
 * @param {number} attempt - Current attempt number
 * @returns {Promise<string|null>} Session cookie or null on failure
 */
export async function login(attempt = 1) {
    const MAX_ATTEMPTS = 3;

    if (attempt > MAX_ATTEMPTS) {
        console.error('❌ [AUTH] Max login attempts reached');
        return null;
    }

    try {
        console.log(`🔐 [AUTH] Attempting to login (Attempt ${attempt}/${MAX_ATTEMPTS})...`);

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
            updateEnvVariable('SESSION_COOKIE', `PHPSESSID=${loginResult.cookie}`);
            console.log('✅ [AUTH] Session saved to .env');

            return currentSessionCookie;
        }

        if (loginResult.body.includes('Captcha Verification Failed')) {
            console.error('❌ [AUTH] Captcha verification failed, retrying...');
            // Retry with incremented attempt counter
            return await login(attempt + 1);
        }

        console.error('❌ [AUTH] Login failed - Unknown response');
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

    // No valid session
    return null;
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

