# 📱 Telegram OTP Monitor Bot

Monitors an SMS API for OTP codes and broadcasts them to Telegram groups with platform detection and auto-session renewal.

## ✨ Features

- ⚡ **Real-time polling** - Checks every 5 seconds
- 🔐 **Auto session renewal** - Automatically re-logs when session expires
- 🏷️ **Platform detection** - Identifies Telegram, Facebook, WhatsApp OTPs
- 📋 **Copy button** - One-tap copy OTP code to clipboard
- 🌍 **Auto country flags** - Detects country from phone number
- 🔒 **Masked numbers** - Shows `+5939XXXXX539` format
- 👥 **Groups only** - `/subscribe` works in groups only

## 🚀 Quick Start

### 1. Install

```bash
bun install
```

### 2. Configure

Create `.env` file:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
SESSION_COOKIE=PHPSESSID=your_session
```

Or edit `config.js` directly.

### 3. Run

```bash
bun start
```

## 📲 Usage

### Subscribe
- Add bot to a group and send `/subscribe`
- Individual users are not supported

### Commands
| Command | Description |
|---------|-------------|
| `/subscribe` | Subscribe group to notifications |
| `/stats` | View subscriber count |

## 📤 Message Format

**Known Platform (Telegram/Facebook/WhatsApp):**
```
🇪🇨 #EC #TG +5939XXXXX539

[📋 744745]  ← Copy button

[♻️ Number] [‼️ Backup]  ← Quick links
```

**Unknown Platform:**
```
🇪🇨 #EC Unknown +5939XXXXX539

Message:
Your verification code is 123456...
```

## ⚙️ Configuration

```javascript
{
  pollInterval: 5000,      // 5 seconds
  maxMessageAge: 290,      // Skip old messages
  logLevel: 'DEBUG',       // DEBUG, INFO, WARN, ERROR
}
```

## 📁 Project Structure

```
├── bot.js              # Main entry point
├── config.js           # Settings
├── .env                # Environment variables
├── state.json          # Last seen timestamp
├── subscribers.json    # Subscribed groups
└── modules/
    ├── api.js          # API fetching + auto-retry
    ├── auth.js         # Auto-login on session expire
    ├── telegram.js     # Telegram bot + notifications
    ├── platform.js     # Platform detection (TG/FB/WA)
    ├── phone.js        # Phone formatting + masking
    ├── otp.js          # OTP extraction
    ├── subscribers.js  # Subscriber management
    ├── state.js        # State persistence
    └── logger.js       # Console logging
```

## 🔐 Auto Session Renewal

When the session cookie expires:
1. Bot detects API failure
2. Auto-fetches login page
3. Solves math captcha
4. Submits login form
5. Saves new cookie to `.env`
6. Retries API request

## 📝 License

MIT
