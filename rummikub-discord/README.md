# 🎴 Rummikub Discord Activity

A fully functional Rummikub game built as a Discord Activity using React, TypeScript, and the Discord Embedded App SDK.

## 🌟 Features

- ✅ Full Rummikub gameplay with all official rules
- ✅ 2-4 players support
- ✅ Drag-and-drop tile placement
- ✅ Real-time multiplayer through Discord
- ✅ Initial 30-point meld requirement
- ✅ Run and group validation
- ✅ Joker support
- ✅ Turn timer (120 seconds)
- ✅ Undo functionality
- ✅ Beautiful, responsive UI with animations
- ✅ Mobile-friendly design

## 📋 Prerequisites

- Node.js 18+ and npm
- A Discord account
- Discord Developer Application (instructions below)

## 🚀 Setup Instructions

### Step 1: Create a Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name (e.g., "Rummikub")
3. Go to the "General Information" tab and note your **Application ID** (Client ID)
4. Go to the "OAuth2" tab and note your **Client Secret**
5. In the "OAuth2" tab, add these redirect URLs:
   - `http://localhost:5173`
   - Your production URL (when deploying)

### Step 2: Enable Activities

1. In your Discord Application, go to the "Activities" tab
2. Toggle "Enable Activities" to ON
3. Under "URL Mappings", add:
   - For local development: Your Cloudflare Tunnel URL (see Step 5)
   - For production: Your deployed URL

### Step 3: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd rummikub-discord

# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

### Step 4: Configure Environment Variables

**Client (.env file):**
```bash
cd client
cp .env.example .env
# Edit .env and add your Discord Client ID
```

**Server (.env file):**
```bash
cd server
cp .env.example .env
# Edit .env and add your Discord Client ID and Client Secret
```

### Step 5: Local Development with Cloudflare Tunnel

Discord Activities need to be served over HTTPS. Use Cloudflare Tunnel for local development:

```bash
# Install Cloudflare Tunnel
npm install -g cloudflared

# Start the client (in one terminal)
cd client
npm run dev

# Start the server (in another terminal)
cd server
npm run dev

# Create a tunnel to your client (in a third terminal)
cloudflared tunnel --url http://localhost:5173
```

The tunnel will provide a URL like `https://xyz.trycloudflare.com`. Add this to your Discord Application's Activity URL Mappings.

### Step 6: Test in Discord

1. Open Discord (desktop app or web)
2. Join a voice channel
3. Click the "Activities" button (rocket icon)
4. Your Rummikub activity should appear
5. Click it to launch the game!

## 🎮 How to Play

### Game Setup
- 2-4 players can join
- Each player receives 14 random tiles
- The remaining tiles form the draw pool

### Your First Turn
- Your first play must have tiles totaling at least 30 points
- You can play multiple melds to reach 30 points
- A meld is either:
  - **Run**: 3+ consecutive numbers of the same color (e.g., 3-4-5 red)
  - **Group**: 3-4 tiles of the same number in different colors (e.g., 7 red, 7 blue, 7 yellow)

### Subsequent Turns
On your turn, you can:
1. **Place tiles**: Drag tiles from your hand to the board to form new melds or extend existing ones
2. **Rearrange tiles**: Move tiles around to create new valid combinations
3. **Draw a tile**: If you can't (or don't want to) play, draw a tile and end your turn
4. **End turn**: When you're done playing, click "End Turn"

### Special Rules
- Jokers can substitute for any tile
- All melds on the board must be valid when you end your turn
- Use "Undo Turn" to reset the board to the start of your turn
- You have 120 seconds per turn

### Winning
The first player to play all their tiles wins!

## 🏗️ Project Structure

```
rummikub-discord/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── Tile.tsx      # Individual tile component
│   │   │   ├── GameBoard.tsx # Main game board
│   │   │   ├── PlayerHand.tsx# Player's tile rack
│   │   │   ├── PlayerList.tsx# Player roster
│   │   │   ├── GameControls.tsx
│   │   │   └── Lobby.tsx     # Pre-game lobby
│   │   ├── game/             # Game logic
│   │   │   └── logic.ts      # Validation, rules, tile creation
│   │   ├── hooks/            # Custom React hooks
│   │   │   └── useDiscordSDK.ts
│   │   ├── store/            # State management
│   │   │   └── gameStore.ts  # Zustand store
│   │   ├── types/            # TypeScript types
│   │   │   └── game.ts
│   │   ├── App.tsx           # Main app component
│   │   └── main.tsx          # Entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
└── server/                    # Express backend
    ├── src/
    │   └── server.ts         # API and OAuth handling
    └── package.json
```

## 🛠️ Technologies Used

### Frontend
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool
- **Tailwind CSS**: Styling
- **Zustand**: State management
- **React DnD**: Drag and drop functionality
- **@discord/embedded-app-sdk**: Discord integration

### Backend
- **Node.js**: Runtime
- **Express**: Web framework
- **TypeScript**: Type safety

## 🚢 Deployment

### Deploy to Production

1. **Build the client:**
```bash
cd client
npm run build
```

2. **Deploy both client and server** to a hosting platform:
   - **Recommended**: Railway, Render, or Heroku
   - Make sure to set environment variables
   - Serve the client's `dist` folder as static files
   - Ensure the server runs on the same domain (or configure CORS)

3. **Update Discord Application:**
   - Go to Discord Developer Portal
   - Update the Activity URL Mapping to your production URL
   - Make sure OAuth redirect URLs include your production domain

### Hosting Recommendations

**Railway** (Easiest):
- Supports monorepos
- Free tier available
- Automatic HTTPS
- Easy environment variable management

**Render**:
- Free tier for web services
- Automatic deployments from Git
- Built-in HTTPS

**Vercel/Netlify** (Client) + **Railway/Render** (Server):
- Deploy client to Vercel/Netlify
- Deploy server separately
- Update CORS settings

## 🐛 Troubleshooting

### "Discord SDK not initialized"
- Make sure your Client ID is correct in the .env file
- Verify the Activity is enabled in Discord Developer Portal
- Check that the URL mapping matches your tunnel/production URL

### "Failed to exchange token"
- Verify your Client Secret is correct
- Make sure the server is running
- Check that OAuth redirect URLs are configured

### Tiles not dragging
- Ensure react-dnd and react-dnd-html5-backend are installed
- Check browser console for errors
- Make sure you're not in a mobile browser (use touch events instead)

### Game not loading in Discord
- Verify the Activity URL mapping is correct
- Make sure you're accessing via HTTPS
- Check Discord Developer Portal for any errors
- Try refreshing Discord or restarting the activity

## 📝 Future Enhancements

- [ ] Real-time multiplayer with WebSockets
- [ ] Game replay and history
- [ ] Custom themes
- [ ] Sound effects and music
- [ ] Achievements and statistics
- [ ] AI opponents for solo play
- [ ] Tournament mode
- [ ] Spectator mode
- [ ] Chat integration

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Discord for the Embedded App SDK
- The Rummikub game for the original rules
- All the open-source libraries that made this possible

## 📞 Support

If you encounter any issues or have questions:
1. Check the troubleshooting section above
2. Open an issue on GitHub
3. Join our Discord server (link TBD)

---

**Happy Gaming! 🎮**
