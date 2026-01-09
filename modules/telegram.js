import { Telegraf, Markup } from 'telegraf';
import { CONFIG } from '../config.js';
import { updateEnvVariable } from './env.js';
import {
    loadSubscribers,
    addGroup,
    removeGroup,
    getAllChatIds,
    getStats
} from './subscribers.js';
import { detectPlatform, getPlatformInfo, isKnownPlatform } from './platform.js';
import { maskPhoneNumber } from './phone.js';

let bot = null;
const userState = new Map(); // Store user state for interactive config

// Quick action button URLs
const BUTTON_LINKS = {
    backup: 'https://t.me/tg_account_method',
    number: 'https://t.me/number_panel_kst'
};

export function initTelegram() {
    if (!CONFIG.botToken || CONFIG.botToken === 'YOUR_BOT_TOKEN') {
        console.error('❌ Telegram bot token not configured!');
        return false;
    }

    bot = new Telegraf(CONFIG.botToken);

    loadSubscribers();

    // /subscribe command - GROUPS ONLY
    bot.command('subscribe', (ctx) => {
        const chat = ctx.chat;

        if (chat.type === 'private') {
            // Individual users not allowed
            ctx.reply('⚠️ This bot only works in groups.\n\nPlease add me to a group and use /subscribe there.');
            return;
        }

        // Groups and supergroups
        const isNew = addGroup(chat.id, chat.title);
        if (isNew) {
            ctx.reply('✅ This group is now subscribed to OTP notifications!');
        } else {
            ctx.reply('👋 This group is already subscribed!');
        }
    });

    bot.command('stats', (ctx) => {
        const stats = getStats();
        ctx.reply(`📊 <b>Bot Statistics</b>\n\n👥 Groups: ${stats.groups}\n📬 Total subscribers: ${stats.total}`, { parse_mode: 'HTML' });
    });

    // ADMIN CONFIGURATION COMMAND
    bot.command('config', (ctx) => {
        if (CONFIG.adminId && String(ctx.from.id) !== String(CONFIG.adminId)) {
            return; // Ignore non-admins if ADMIN_ID is set
        }

        ctx.reply('⚙️ <b>Bot Configuration</b>\n\nSelect a setting to change:', {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('👤 Set Username', 'config_username')],
                [Markup.button.callback('🔑 Set Password', 'config_password')],
                [Markup.button.callback('🌐 Set API URL', 'config_api_url')],
                [Markup.button.callback('❌ Cancel', 'config_cancel')]
            ])
        });
    });

    // Handle config buttons
    bot.action('config_username', (ctx) => {
        if (CONFIG.adminId && String(ctx.from.id) !== String(CONFIG.adminId)) return;
        userState.set(ctx.from.id, 'WAITING_USERNAME');
        ctx.editMessageText('👤 <b>Set Username</b>\n\nPlease reply with the new username:', { parse_mode: 'HTML' });
    });

    bot.action('config_password', (ctx) => {
        if (CONFIG.adminId && String(ctx.from.id) !== String(CONFIG.adminId)) return;
        userState.set(ctx.from.id, 'WAITING_PASSWORD');
        ctx.editMessageText('🔑 <b>Set Password</b>\n\nPlease reply with the new password:', { parse_mode: 'HTML' });
    });

    bot.action('config_api_url', (ctx) => {
        if (CONFIG.adminId && String(ctx.from.id) !== String(CONFIG.adminId)) return;
        userState.set(ctx.from.id, 'WAITING_API_URL');
        ctx.editMessageText('🌐 <b>Set API URL</b>\n\nPlease reply with the new base URL (e.g., http://1.2.3.4):', { parse_mode: 'HTML' });
    });

    bot.action('config_cancel', (ctx) => {
        if (CONFIG.adminId && String(ctx.from.id) !== String(CONFIG.adminId)) return;
        userState.delete(ctx.from.id);
        ctx.editMessageText('⚙️ Configuration cancelled.');
    });

    // Handle text input for config
    bot.on('text', (ctx, next) => {
        const userId = ctx.from.id;
        if (!userState.has(userId)) {
            return next();
        }

        const state = userState.get(userId);
        const text = ctx.message.text.trim();

        if (state === 'WAITING_USERNAME') {
            updateEnvVariable('LOGIN_USERNAME', text);
            CONFIG.loginUsername = text; // Update memory
            ctx.reply(`✅ Username updated to: <code>${text}</code>`, { parse_mode: 'HTML' });
            userState.delete(userId);
        } else if (state === 'WAITING_PASSWORD') {
            updateEnvVariable('LOGIN_PASSWORD', text);
            CONFIG.loginPassword = text; // Update memory
            ctx.reply('✅ Password updated successfully!', { parse_mode: 'HTML' });
            userState.delete(userId);
        } else if (state === 'WAITING_API_URL') {
            updateEnvVariable('API_URL', text);
            // Need to update CONFIG.apiUrl logic as well
            let url = text.replace(/\/$/, '');
            if (!url.includes('.php')) {
                CONFIG.apiUrl = `${url}/ints/client/res/data_smscdr.php`;
            } else {
                CONFIG.apiUrl = url;
            }
            ctx.reply(`✅ API URL updated to: <code>${text}</code>`, { parse_mode: 'HTML' });
            userState.delete(userId);
        }
    });

    bot.on('my_chat_member', (ctx) => {
        const chat = ctx.chat;
        const newStatus = ctx.update.my_chat_member.new_chat_member.status;

        if (chat.type === 'group' || chat.type === 'supergroup') {
            if (newStatus === 'member' || newStatus === 'administrator') {
                addGroup(chat.id, chat.title);
            } else if (newStatus === 'left' || newStatus === 'kicked') {
                removeGroup(chat.id);
            }
        }
    });

    bot.launch({ dropPendingUpdates: true }).catch(err => {
        if (err.response?.error_code === 409) {
            console.error('\n❌ ERROR: Another bot instance is already running!');
            console.error('   Please stop the other instance first.\n');
            process.exit(1);
        }
        console.error('❌ Bot launch error:', err.message);
    });

    bot.catch((err) => {
        if (err.response?.error_code === 409) {
            console.error('\n⚠️ Conflict detected - another instance may be running');
            return;
        }
        console.error('❌ Bot error:', err.message);
    });

    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));

    console.log('✅ Telegram bot initialized (Telegraf) - Listening for /subscribe (groups only)');
    return true;
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Format notification for KNOWN platforms (Telegram, Facebook, WhatsApp)
 * Shows header with hashtags and copy button for OTP
 */
function formatKnownPlatformNotification(data) {
    const { flag, countryCode, platformInfo, maskedPhone } = data;
    const countryShort = countryCode || 'XX';

    return `${flag} #${countryShort} #${platformInfo.short} ${maskedPhone}

<b>developed by <a href="https://t.me/Cryptoistaken">Cryptoistaken</a></b>`;
}

/**
 * Format notification for UNKNOWN platforms
 * Shows full message content without copy button
 */
function formatUnknownPlatformNotification(data) {
    const { flag, countryCode, maskedPhone, rawMessage } = data;
    const countryShort = countryCode || 'XX';

    return `${flag} #${countryShort} Others ${maskedPhone}

<b>Message:</b>
<pre>${escapeHtml(rawMessage)}</pre>

<b>developed by <a href="https://t.me/Cryptoistaken">Cryptoistaken</a></b>`;
}

/**
 * Create inline keyboard for known platforms
 * - CopyTextButton for OTP code (copies to clipboard)
 * - Number and Backup links (swapped order)
 */
function createKnownPlatformKeyboard(otp) {
    return Markup.inlineKeyboard([
        // CopyTextButton - copies OTP to clipboard when clicked
        [{ text: otp, copy_text: { text: otp } }],
        [
            Markup.button.url('♻️ Number', BUTTON_LINKS.number),
            Markup.button.url('‼️ Backup', BUTTON_LINKS.backup)
        ]
    ]);
}

/**
 * Create inline keyboard for unknown platforms
 * - Only Number and Backup links (no copy button)
 */
function createUnknownPlatformKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.url('♻️ Number', BUTTON_LINKS.number),
            Markup.button.url('‼️ Backup', BUTTON_LINKS.backup)
        ]
    ]);
}

export async function sendOtpNotification(data, retryCount = 0) {
    if (!bot) {
        console.error('❌ Telegram bot not initialized');
        return false;
    }

    // Detect platform from raw message
    const platformKey = detectPlatform(data.rawMessage);
    const platformInfo = getPlatformInfo(platformKey);
    const isKnown = isKnownPlatform(platformKey);

    // Mask the phone number
    const maskedPhone = maskPhoneNumber(data.phone);

    // Prepare notification data
    const notificationData = {
        ...data,
        platformInfo,
        maskedPhone
    };

    // Format message based on platform type
    const message = isKnown
        ? formatKnownPlatformNotification(notificationData)
        : formatUnknownPlatformNotification(notificationData);

    // Create appropriate keyboard
    const keyboard = isKnown
        ? createKnownPlatformKeyboard(data.otp)
        : createUnknownPlatformKeyboard();

    const chatIds = getAllChatIds();

    if (chatIds.length === 0) {
        console.warn('⚠️ No subscribers yet. Add this bot to groups and use /subscribe');
        return false;
    }

    let successCount = 0;
    let failCount = 0;

    for (const chatId of chatIds) {
        try {
            await bot.telegram.sendMessage(chatId, message, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                ...keyboard
            });
            successCount++;
        } catch (error) {
            failCount++;
            console.error(`❌ Failed to send to ${chatId}:`, error.message);
        }
    }

    console.log(`📤 Sent OTP ${data.otp} [${platformInfo.short}]: ${successCount} success, ${failCount} failed`);
    return successCount > 0;
}

export async function sendStartupNotification(skippedCount) {
    if (!bot) return;

    const stats = getStats();
    const message = `🤖 <b>OTP Monitor Bot Started</b>

⏰ Time: ${new Date().toISOString()}
📊 Existing messages skipped: ${skippedCount}
🔄 Polling interval: ${CONFIG.pollInterval / 1000}s
⏳ Max OTP age: ${CONFIG.maxMessageAge}s
👥 Groups: ${stats.groups}

<i>Monitoring for new OTPs...</i>`;

    const chatIds = getAllChatIds();

    for (const chatId of chatIds) {
        try {
            await bot.telegram.sendMessage(chatId, message, { parse_mode: 'HTML' });
        } catch (error) {
            console.warn(`⚠️ Failed to send startup to ${chatId}`);
        }
    }
}
