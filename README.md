# 📱 Telegram OTP Monitor Bot

Monitors an SMS API for OTP codes and broadcasts them to Telegram subscribers.

## ✨ Features

- ⚡ **Real-time** - Polls every 5 seconds
- 🔄 **Smart tracking** - Only sends NEW OTPs (newer than bot start)
- 👥 **Multi-subscriber** - Broadcasts to all /subscribe users + groups
- 🌍 **Auto flags** - Detects country from phone number
- 🚫 **No duplicates** - Timestamp-based tracking

## 🚀 Quick Start

### 1. Install

```bash
npm install
```

### 2. Configure

Edit `config.js`:

```javascript
botToken: 'YOUR_BOT_TOKEN',  // From @BotFather
sessionCookie: 'PHPSESSID=xxx',  // From browser
```

### 3. Run

```bash
npm start
```

## 📲 Usage

### Subscribe
- Users: Send `/subscribe` to the bot
- Groups: Add bot to group, send `/subscribe`

### Commands
| Command | Description |
|---------|-------------|
| `/subscribe` | Subscribe to notifications |
| `/stats` | View subscriber count |

## 📤 Message Format

```
✅  Telegram OTP Received!

OTP Code: 744745
Number: 🇪🇨 +593989503579
Time: 2025-12-30 07:36:41

Message:
Telegram code 744745...
```

## ⚙️ Configuration

```javascript
{
  pollInterval: 5000,      // 5 seconds
  logLevel: 'DEBUG',       // DEBUG, INFO, WARN, ERROR
  enableFileLogging: true,
  logDir: './logs'
}
```

## 📁 Files

```
├── bot.js              # Main bot
├── config.js           # Settings
├── state.json          # Last seen timestamp
├── subscribers.json    # Users/groups
├── logs/               # Log files
└── modules/
    ├── api.js          # API fetching
    ├── telegram.js     # Telegram bot
    ├── subscribers.js  # Subscriber mgmt
    ├── phone.js        # Phone formatting
    ├── otp.js          # OTP extraction
    └── logger.js       # Logging
```

## 📝 License

MIT
