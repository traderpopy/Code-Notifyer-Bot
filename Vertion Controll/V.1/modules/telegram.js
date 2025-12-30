import { Telegraf } from 'telegraf';
import { CONFIG } from '../config.js';
import {
    loadSubscribers,
    addUser,
    addGroup,
    removeGroup,
    getAllChatIds,
    getStats
} from './subscribers.js';

let bot = null;

export function initTelegram() {
    if (!CONFIG.botToken || CONFIG.botToken === 'YOUR_BOT_TOKEN') {
        console.error('❌ Telegram bot token not configured!');
        return false;
    }

    bot = new Telegraf(CONFIG.botToken);

    loadSubscribers();

    bot.command('subscribe', (ctx) => {
        const chat = ctx.chat;

        if (chat.type === 'private') {
            const isNew = addUser(chat.id, ctx.from.username, ctx.from.first_name);
            if (isNew) {
                ctx.reply('✅ You are now subscribed to OTP notifications!\n\nYou will receive all new OTP codes automatically.');
            } else {
                ctx.reply('👋 You are already subscribed!\n\nYou will continue receiving OTP notifications.');
            }
        } else {
            const isNew = addGroup(chat.id, chat.title);
            if (isNew) {
                ctx.reply('✅ This group is now subscribed to OTP notifications!');
            } else {
                ctx.reply('👋 This group is already subscribed!');
            }
        }
    });

    bot.command('stats', (ctx) => {
        const stats = getStats();
        ctx.reply(`📊 <b>Bot Statistics</b>\n\n👤 Users: ${stats.users}\n👥 Groups: ${stats.groups}\n📬 Total subscribers: ${stats.total}`, { parse_mode: 'HTML' });
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

    console.log('✅ Telegram bot initialized (Telegraf) - Listening for /subscribe');
    return true;
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function formatNotification(data) {
    return `✅  <b>Telegram OTP Received!</b>

<b>OTP Code:</b> <code>${data.otp}</code>
<b>Number:</b> ${data.flag} <code>${data.phone}</code>
<b>Time:</b> ${data.timestamp}

<b>Message:</b>
<pre>${escapeHtml(data.rawMessage)}</pre>`;
}

export async function sendOtpNotification(data, retryCount = 0) {
    if (!bot) {
        console.error('❌ Telegram bot not initialized');
        return false;
    }

    const message = formatNotification(data);
    const chatIds = getAllChatIds();

    if (chatIds.length === 0) {
        console.warn('⚠️ No subscribers yet. Add users/groups with /start');
        return false;
    }

    let successCount = 0;
    let failCount = 0;

    for (const chatId of chatIds) {
        try {
            await bot.telegram.sendMessage(chatId, message, {
                parse_mode: 'HTML',
                disable_web_page_preview: true
            });
            successCount++;
        } catch (error) {
            failCount++;
            console.error(`❌ Failed to send to ${chatId}:`, error.message);
        }
    }

    console.log(`📤 Sent OTP ${data.otp}: ${successCount} success, ${failCount} failed`);
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
👤 Users: ${stats.users} | 👥 Groups: ${stats.groups}

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
