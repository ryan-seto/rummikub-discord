# 🚀 Quick Start Guide

This guide will get you up and running with Rummikub Discord Activity in 10 minutes!

## ⚡ Fast Track Setup

### 1. Discord Application Setup (3 minutes)

1. Go to https://discord.com/developers/applications
2. Click "New Application" → Name it "Rummikub"
3. Copy your **Application ID** (you'll need this!) // 1432451260484943933
4. Go to "OAuth2" tab → Copy your **Client Secret** // sgpdtnH0tYSCKPMtAv7gJrZg1DM1ZPk1
5. Go to "Activities" tab → Toggle "Enable Activities" ON

### 2. Install Dependencies (2 minutes)

```bash
# In the client folder
cd client
npm install

# In the server folder
cd ../server
npm install
```

### 3. Configure Environment (1 minute)

**Client (.env):**
```bash
cd client
cp .env.example .env
# Edit .env and paste your Application ID
VITE_DISCORD_CLIENT_ID=your_application_id_here
```

**Server (.env):**
```bash
cd ../server
cp .env.example .env
# Edit .env and paste both credentials
VITE_DISCORD_CLIENT_ID=your_application_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
```

### 4. Start Development Servers (1 minute)

Open **TWO** terminal windows:

**Terminal 1 - Client:**
```bash
cd client
npm run dev
```

**Terminal 2 - Server:**
```bash
cd server
npm run dev
```

### 5. Create Cloudflare Tunnel (2 minutes)

Open a **THIRD** terminal:

```bash
# Install cloudflared (first time only)
npm install -g cloudflared

# Create tunnel
cloudflared tunnel --url http://localhost:5173
```

Copy the URL it gives you (like `https://abc-def.trycloudflare.com`)

### 6. Add URL to Discord (1 minute)

1. Go back to Discord Developer Portal
2. Your Application → "Activities" tab
3. Under "URL Mappings" → Click "Add URL Mapping"
4. Paste your Cloudflare tunnel URL
5. Set Target: `/` (root path)
6. Click Save

### 7. Test in Discord! 🎉

1. Open Discord
2. Join any voice channel
3. Click the Activities button (🚀 rocket icon)
4. Look for your "Rummikub" activity
5. Click it and start playing!

## 🎮 First Game Tips

- You need at least 2 players to start
- Your first play must total 30+ points
- Drag tiles to the board to play them
- Click "Draw Tile" if you can't play
- Use "Undo Turn" if you make a mistake

## ❗ Common Issues

**"Activity not showing in Discord"**
- Make sure all 3 terminals are running (client, server, tunnel)
- Verify the URL mapping in Discord matches your tunnel URL exactly
- Try refreshing Discord or restarting the activity

**"Failed to authenticate"**
- Double-check your Client ID and Client Secret are correct
- Make sure there are no extra spaces in your .env files

**"Server connection error"**
- Verify the server is running on port 3001
- Check that the Vite proxy is configured correctly

## 📚 Next Steps

- Read the full README.md for detailed documentation
- Customize the game with your own styling
- Deploy to production when ready
- Add more features!

## 🆘 Need Help?

Check the main README.md for:
- Detailed troubleshooting
- Deployment instructions
- Architecture explanation
- Contributing guidelines

---

**Happy Gaming! 🎴**
