const http = require('http');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');

function solveMathCaptcha(html) {
    const match = html.match(/What is (\d+) \+ (\d+) = \?/);
    if (match) {
        return parseInt(match[1]) + parseInt(match[2]);
    }
    return null;
}

function httpRequest(method, urlPath, cookie = null, postData = null, followRedirects = true, redirectCount = 0, debug = false) {
    return new Promise((resolve, reject) => {
        if (debug) {
            console.log(`   → ${method} ${urlPath} ${cookie ? `(Cookie: ${cookie.substring(0, 10)}...)` : '(No cookie)'}`);
        }

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
            if (debug) {
                console.log(`   → POST data: ${body}`);
            }
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

            if (debug) {
                console.log(`   ← Status: ${res.statusCode}`);
            }

            if (res.headers['set-cookie']) {
                const cookieMatch = res.headers['set-cookie'][0].match(/PHPSESSID=([^;]+)/);
                if (cookieMatch) {
                    currentCookie = cookieMatch[1];
                    if (debug) {
                        console.log(`   ← New cookie: ${currentCookie.substring(0, 10)}...`);
                    }
                }
            }

            if (res.headers['location'] && debug) {
                console.log(`   ← Redirect to: ${res.headers['location']}`);
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

                    return httpRequest('GET', newPath, currentCookie, null, followRedirects, redirectCount + 1, debug)
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
            console.log(`   ✗ Request error: ${err.message}`);
            reject(err);
        });

        if (body) {
            req.write(body);
        }

        req.end();
    });
}

function updateEnvFile(cookie) {
    const envPath = path.join(__dirname, '.env');
    let envContent = '';

    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    }

    const lines = envContent.split('\n').filter(line => line.trim() !== '');
    let found = false;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('SESSION_COOKIE=')) {
            lines[i] = `SESSION_COOKIE=${cookie}`;
            found = true;
            break;
        }
    }

    if (!found) {
        lines.push(`SESSION_COOKIE=${cookie}`);
    }

    fs.writeFileSync(envPath, lines.join('\n') + '\n');
}

(async () => {
    try {
        console.log('→ Fetching login page...');
        const loginPage = await httpRequest('GET', '/ints/signin');

        const captchaAnswer = solveMathCaptcha(loginPage.body);

        if (!captchaAnswer) {
            console.log('✗ Failed to extract captcha');
            console.log('\n=== Debug Info ===');
            console.log('Status:', loginPage.statusCode);
            console.log('URL:', loginPage.urlPath);
            console.log('Body preview:', loginPage.body.substring(0, 500));
            return;
        }

        console.log(`→ Captcha: ${captchaAnswer}`);
        console.log('→ Logging in...');

        const loginResult = await httpRequest('POST', '/ints/signin', loginPage.cookie, {
            username: 'kstotp',
            password: '11223344@',
            capt: captchaAnswer.toString()
        });

        if (loginResult.body.includes('Dashboard') || loginResult.body.includes('SMSDashboard') || loginResult.body.includes('kstotp')) {
            console.log('✓ Login successful');
            updateEnvFile(loginResult.cookie);
            console.log('✓ Session saved to .env');
        } else if (loginResult.body.includes('Captcha Verification Failed')) {
            console.log('✗ Captcha verification failed');
            console.log('\n=== Debug Info ===');
            console.log('Status:', loginResult.statusCode);
            console.log('URL:', loginResult.urlPath);
            console.log('Cookie:', loginResult.cookie);
            console.log('Body preview:', loginResult.body.substring(0, 800));
        } else if (loginResult.body.includes('Invalid')) {
            console.log('✗ Invalid credentials');
            console.log('\n=== Debug Info ===');
            console.log('Status:', loginResult.statusCode);
            console.log('URL:', loginResult.urlPath);
            console.log('Body preview:', loginResult.body.substring(0, 500));
        } else if (loginResult.statusCode === 404) {
            console.log('✗ 404 Error - Wrong URL');
            console.log('\n=== Debug Info ===');
            console.log('URL:', loginResult.urlPath);
            console.log('Body:', loginResult.body);
        } else {
            console.log('✗ Login failed - Unknown error');
            console.log('\n=== Debug Info ===');
            console.log('Status:', loginResult.statusCode);
            console.log('URL:', loginResult.urlPath);
            console.log('Cookie:', loginResult.cookie);
            console.log('Body preview:', loginResult.body.substring(0, 800));
        }

    } catch (error) {
        console.error('✗ Fatal error:', error.message);
        console.error('Stack trace:', error.stack);
    }
})();