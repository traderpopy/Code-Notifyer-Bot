# Code Notifyer Bot

A robust, enterprise-grade Telegram bot designed for real-time OTP monitoring and broadcasting. Features autonomous session management, intelligent platform detection, and remote administration capabilities.

## ✨ Key Features

- **Real-time Monitoring**: High-frequency polling ensures instant OTP delivery.
- **Autonomous Authentication**: Self-healing session management with auto-login and captcha solving.
- **Intelligent Detection**: Automatically identifies source platforms (Telegram, Facebook, WhatsApp).
- **Remote Administration**: Configure credentials and API endpoints directly via Telegram.
- **Privacy First**: Smart phone number masking and secure credential storage.
- **Group Management**: Dedicated subscription system for team coordination.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+) or [Bun](https://bun.sh/)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/code-notifyer-bot.git
    cd code-notifyer-bot
    ```

2.  **Install dependencies**
    ```bash
    bun install
    # or
    npm install
    ```

3.  **Configuration**
    Copy the environment template and fill in your details:
    ```bash
    cp .env.example .env
    ```
    
    *Minimal setup required in `.env`:*
    ```ini
    TELEGRAM_BOT_TOKEN=your_bot_token
    ADMIN_ID=your_telegram_id
    API_URL=http://your-api-url.com
    LOGIN_USERNAME=your_username
    LOGIN_PASSWORD=your_password
    ```

4.  **Start the Bot**
    ```bash
    bun start
    # or
    npm start
    ```

## 🎮 Usage

### User Commands

| Command | Description |
|:---|:---|
| `/subscribe` | Activates OTP notifications for the current group. |
| `/stats` | Displays system status and subscriber metrics. |

### Admin Commands

| Command | Description |
|:---|:---|
| `/config` | Opens the interactive configuration panel (Private Chat only). |

*> Note: The `/config` command is restricted to the user defined in `ADMIN_ID`.*

## ⚙️ Advanced Configuration

The bot is fully configurable via the `.env` file. Key parameters include:

- **Polling Interval**: Adjust `POLL_INTERVAL` for frequency control.
- **Retry Strategy**: Configure `MAX_RETRIES` and `RETRY_DELAY` for network resilience.
- **Logging**: Set `LOG_LEVEL` (INFO/DEBUG) and enable/disable file logging.

## 🛠️ Technology Stack

- **Runtime**: Node.js / Bun
- **Framework**: Telegraf
- **State Management**: JSON-based persistence
- **Security**: Environment variable isolation, automated session handling

## 📄 License

This project is licensed under the MIT License.
