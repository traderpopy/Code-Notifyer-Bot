import { CONFIG } from '../config.js';
import { getSessionCookie, refreshSession, isSessionExpired } from './auth.js';

function formatDateForApi(date, isStart = false) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    if (isStart) {
        return `${year}-${month}-${day} 00:00:00`;
    }
    return `${year}-${month}-${day} 23:59:59`;
}

/**
 * Build API URL with all required parameters
 * @param {Date} startDate - Start date for query
 * @param {Date} endDate - End date for query
 * @returns {string} Complete API URL
 */
function buildApiUrl(startDate, endDate) {
    const params = new URLSearchParams({
        fdate1: formatDateForApi(startDate, true),
        fdate2: formatDateForApi(endDate, false),
        frange: '',
        fnum: '',
        fcli: '',
        fgdate: '',
        fgmonth: '',
        fgrange: '',
        fgnumber: '',
        fgcli: '',
        fg: '0',
        sEcho: '1',
        iColumns: '7',
        sColumns: ',,,,,,',
        iDisplayStart: '0',
        iDisplayLength: '100',
        mDataProp_0: '0',
        sSearch_0: '',
        bRegex_0: 'false',
        bSearchable_0: 'true',
        bSortable_0: 'true',
        mDataProp_1: '1',
        sSearch_1: '',
        bRegex_1: 'false',
        bSearchable_1: 'true',
        bSortable_1: 'true',
        mDataProp_2: '2',
        sSearch_2: '',
        bRegex_2: 'false',
        bSearchable_2: 'true',
        bSortable_2: 'true',
        mDataProp_3: '3',
        sSearch_3: '',
        bRegex_3: 'false',
        bSearchable_3: 'true',
        bSortable_3: 'true',
        mDataProp_4: '4',
        sSearch_4: '',
        bRegex_4: 'false',
        bSearchable_4: 'true',
        bSortable_4: 'true',
        mDataProp_5: '5',
        sSearch_5: '',
        bRegex_5: 'false',
        bSearchable_5: 'true',
        bSortable_5: 'true',
        mDataProp_6: '6',
        sSearch_6: '',
        bRegex_6: 'false',
        bSearchable_6: 'true',
        bSortable_6: 'true',
        sSearch: '',
        bRegex: 'false',
        iSortCol_0: '0',
        sSortDir_0: 'desc',
        iSortingCols: '1',
        _: Date.now().toString()
    });

    return `${CONFIG.apiUrl}?${params.toString()}`;
}

function parseMessages(response) {
    if (!response || !response.aaData || !Array.isArray(response.aaData)) {
        return [];
    }

    return response.aaData
        .filter(row => {
            if (!Array.isArray(row) || row.length < 5) return false;
            if (typeof row[0] !== 'string' || !row[0].match(/^\d{4}-\d{2}-\d{2}/)) return false;
            if (typeof row[4] !== 'string') return false;
            return true;
        })
        .map(row => ({
            timestamp: row[0],
            country: row[1],
            phone: row[2],
            sender: row[3],
            message: row[4],
            symbol: row[5],
            id: row[6]
        }));
}

/**
 * Fetch messages from SMS API with session auto-renewal
 * @param {number} retryCount - Current retry attempt
 * @param {boolean} isRetryAfterRefresh - Whether this is a retry after session refresh
 * @returns {Promise<Array>} Array of message objects
 */
export async function fetchMessages(retryCount = 0, isRetryAfterRefresh = false) {
    const now = new Date();
    const startDate = new Date(now.getTime() - CONFIG.fetchWindowMinutes * 60 * 1000);

    const url = buildApiUrl(startDate, now);

    // Get current session cookie (from memory or env)
    const sessionCookie = getSessionCookie();

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
                'Connection': 'keep-alive',
                'Cookie': sessionCookie,
                'Referer': 'http://185.2.83.39/ints/client/SMSCDRStats',
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        // Get response text to check for session expiry
        const responseText = await response.text();

        // Check if session expired
        if (isSessionExpired(response, responseText)) {
            console.warn('⚠️ [API] Session expired detected!');

            // Only try to refresh once to avoid infinite loop
            if (!isRetryAfterRefresh) {
                const newCookie = await refreshSession();

                if (newCookie) {
                    console.log('🔄 [API] Retrying with new session...');
                    return fetchMessages(0, true);
                } else {
                    console.error('❌ [API] Failed to refresh session');
                    return [];
                }
            } else {
                console.error('❌ [API] Session still expired after refresh');
                return [];
            }
        }

        // Parse JSON from response text
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('❌ [API] Failed to parse JSON response');

            // This might be a session issue, try to refresh
            if (!isRetryAfterRefresh) {
                console.warn('⚠️ [API] Invalid JSON - might be session issue, refreshing...');
                const newCookie = await refreshSession();

                if (newCookie) {
                    return fetchMessages(0, true);
                }
            }
            return [];
        }

        if (CONFIG.logLevel === 'DEBUG') {
            console.log('🔍 Raw API Response:', JSON.stringify(data, null, 2).substring(0, 500));
        }

        return parseMessages(data);

    } catch (error) {
        console.error(`❌ API fetch error (attempt ${retryCount + 1}):`, error.message);

        // Check if it's a network error that might be session-related
        if (error.message.includes('401') || error.message.includes('403')) {
            if (!isRetryAfterRefresh) {
                console.warn('⚠️ [API] Auth error detected, refreshing session...');
                const newCookie = await refreshSession();

                if (newCookie) {
                    return fetchMessages(0, true);
                }
            }
        }

        if (retryCount < CONFIG.maxRetries - 1) {
            console.log(`🔄 Retrying in ${CONFIG.retryDelay / 1000}s...`);
            await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
            return fetchMessages(retryCount + 1, isRetryAfterRefresh);
        }

        console.error('❌ Max retries reached, returning empty array');
        return [];
    }
}
