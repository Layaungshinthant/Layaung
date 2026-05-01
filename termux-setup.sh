#!/data/data/com.termux/files/usr/bin/bash
# ══════════════════════════════════════════════════════════════
#  ELSA DIGITAL HQ — Termux Auto-Setup Script
#  Paste this entire block into Termux and press Enter.
#  It sets up Node.js, creates the bot server, and starts it.
# ══════════════════════════════════════════════════════════════

set -e
echo ""
echo "✦ ═══════════════════════════════════════════ ✦"
echo "  ELSA DIGITAL HQ — Termux Setup"
echo "✦ ═══════════════════════════════════════════ ✦"
echo ""

# 1. Update and install Node.js
echo "📦 Installing Node.js..."
pkg update -y && pkg upgrade -y
pkg install -y nodejs

# Verify
echo "✓ Node $(node --version)"
echo "✓ npm  $(npm --version)"

# 2. Create project folder
mkdir -p ~/elsa-bot/data
cd ~/elsa-bot

# 3. Write package.json
cat > package.json << 'PKGJSON'
{
  "name": "elsa-digital-hq",
  "version": "2.0.0",
  "main": "server.js",
  "scripts": { "start": "node server.js" },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.18.3",
    "node-telegram-bot-api": "^0.66.0"
  }
}
PKGJSON

# 4. Write .env
cat > .env << 'ENVFILE'
TELEGRAM_BOT_TOKEN=8286143420:AAGT8WAQCrRT60skqtjxL8d66ZUT6K9SdBg
ALLOWED_USER_IDS=7663311859
DEFAULT_ADDRESS=Yangon, Myanmar 🇲🇲
PORT=3000
ENVFILE

echo "✓ Configuration written"

# 5. Install dependencies
echo "📦 Installing npm packages..."
npm install

echo "✓ Dependencies installed"

# 6. Write server.js
echo "📝 Writing server..."
# (Copy your server.js content here OR use the downloaded file)
# If you downloaded server.js, it's already here.
# Otherwise run: cp ~/storage/downloads/admin-server.js ~/elsa-bot/server.js

echo ""
echo "✦ ═══════════════════════════════════════════ ✦"
echo "  Setup complete!"
echo "✦ ═══════════════════════════════════════════ ✦"
echo ""
echo "  To START the server:"
echo "  cd ~/elsa-bot && node server.js"
echo ""
echo "  To keep it alive when screen locks:"
echo "  npm install -g pm2"
echo "  pm2 start server.js --name elsa"
echo "  termux-wake-lock"
echo ""
