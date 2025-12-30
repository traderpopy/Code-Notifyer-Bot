// BACKUP - Original Message Format (v1)
// Created: 2025-12-30
// Purpose: Backup of original Telegram notification format for rollback

// ------------------------------------------------------------------
// ORIGINAL FORMAT FUNCTION (from modules/telegram.js lines 94-103)
// ------------------------------------------------------------------

function formatNotification(data) {
    return `✅  <b>Telegram OTP Received!</b>

<b>OTP Code:</b> <code>${data.otp}</code>
<b>Number:</b> ${data.flag} <code>${data.phone}</code>
<b>Time:</b> ${data.timestamp}

<b>Message:</b>
<pre>${escapeHtml(data.rawMessage)}</pre>`;
}

// ------------------------------------------------------------------
// EXAMPLE OUTPUT:
// ------------------------------------------------------------------
/*
✅  Telegram OTP Received!

OTP Code: 85191
Number: 🇪🇨 +593986899877
Time: 2025-12-30 09:48:47

Message:
Telegram code 85191

You can also tap on this link to log in
httpstmelogin85191

O2P2zjBpJ
*/

// ------------------------------------------------------------------
// DATA STRUCTURE EXPECTED:
// ------------------------------------------------------------------
/*
{
    otp: string,       // The extracted OTP code (e.g., "85191")
    phone: string,     // Formatted phone number (e.g., "+593986899877")
    flag: string,      // Country flag emoji (e.g., "🇪🇨")
    timestamp: string, // ISO timestamp (e.g., "2025-12-30 09:48:47")
    rawMessage: string // Original message text
}
*/

// Helper function used
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
