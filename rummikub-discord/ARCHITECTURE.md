# 🏗️ Rummikub Discord Activity - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Discord                              │
│  (Voice Channel with Activity Launcher)                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Embedded iFrame
                 │
┌────────────────▼────────────────────────────────────────────┐
│                    Client Application                        │
│                  (React + TypeScript)                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Discord SDK Integration                  │  │
│  │  • Authentication  • Participants  • Channel Info    │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                        │
│  ┌──────────────────▼───────────────────────────────────┐  │
│  │              App Component (Root)                     │  │
│  │  • Initialize Discord  • Manage game phase           │  │
│  └──────┬───────────────────────────────────────────────┘  │
│         │                                                    │
│    ┌────┴─────────────────┐                                │
│    │                      │                                 │
│  ┌─▼───────────┐  ┌──────▼────────────────────┐           │
│  │   Lobby     │  │     Game View              │           │
│  │ Component   │  │  ┌─────────────────────┐  │           │
│  │             │  │  │   GameBoard         │  │           │
│  │ • Players   │  │  │   (Drop Zone)       │  │           │
│  │ • Ready     │  │  └─────────────────────┘  │           │
│  │ • Start     │  │  ┌─────────────────────┐  │           │
│  └─────────────┘  │  │   PlayerHand        │  │           │
│                   │  │   (Your Tiles)      │  │           │
│                   │  └─────────────────────┘  │           │
│                   │  ┌─────────────────────┐  │           │
│                   │  │   PlayerList        │  │           │
│                   │  │   (All Players)     │  │           │
│                   │  └─────────────────────┘  │           │
│                   │  ┌─────────────────────┐  │           │
│                   │  │   GameControls      │  │           │
│                   │  │   (Actions)         │  │           │
│                   │  └─────────────────────┘  │           │
│                   └───────────────────────────┘           │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           State Management (Zustand Store)            │  │
│  │  • Game State  • Players  • Board  • Hand  • Pool    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Game Logic Module                        │  │
│  │  • Tile Creation  • Validation  • Sorting            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ HTTP Requests
                 │ (OAuth, Game State)
                 │
┌────────────────▼────────────────────────────────────────────┐
│                    Server Application                        │
│                  (Express + TypeScript)                      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              OAuth Token Exchange                     │  │
│  │  POST /api/token                                      │  │
│  │  • Exchanges code for access_token                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Game State Management                    │  │
│  │  POST   /api/games       - Create game               │  │
│  │  GET    /api/games/:id   - Get game state            │  │
│  │  PUT    /api/games/:id   - Update game state         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Authentication Flow
```
User Opens Activity
      │
      ▼
Discord SDK Initializes
      │
      ▼
Request Authorization Code
      │
      ▼
Send Code to Server (/api/token)
      │
      ▼
Server Exchanges with Discord API
      │
      ▼
Receive Access Token
      │
      ▼
Authenticate with Discord SDK
      │
      ▼
Get User Info & Participants
```

### 2. Game Initialization Flow
```
Participants Detected
      │
      ▼
Convert to Game Players
      │
      ▼
Create Tile Set (106 tiles)
      │
      ▼
Shuffle Tiles
      │
      ▼
Deal 14 Tiles per Player
      │
      ▼
Remaining → Pool
      │
      ▼
Initialize Game State
      │
      ▼
Show Lobby
```

### 3. Turn Flow
```
Player's Turn Begins
      │
      ├──→ Draw Tile
      │         │
      │         ▼
      │    Add to Hand
      │         │
      │         ▼
      │    End Turn
      │
      ├──→ Place Tiles on Board
      │         │
      │         ▼
      │    Validate Melds
      │         │
      │         ├──→ Valid → Update Board
      │         │
      │         └──→ Invalid → Show Error
      │
      ├──→ Undo Turn
      │         │
      │         ▼
      │    Restore Board State
      │
      └──→ End Turn
            │
            ▼
       Validate Full Board
            │
            ├──→ Valid → Next Player
            │
            └──→ Invalid → Show Error
```

## Component Hierarchy

```
App
├── useDiscordSDK (hook)
├── useGameStore (state)
│
├── Phase: LOBBY
│   └── Lobby
│       ├── Player List
│       ├── Rules Display
│       └── Start Button
│
└── Phase: PLAYING
    ├── Header
    │   ├── Game Title
    │   └── Turn Indicator
    │
    ├── Main Content (Grid Layout)
    │   ├── GameBoard (Col 1-3)
    │   │   └── TileOnBoard[]
    │   │
    │   └── Sidebar (Col 4)
    │       ├── GameControls
    │       │   ├── Timer
    │       │   ├── Pool Info
    │       │   ├── Draw Button
    │       │   ├── Undo Button
    │       │   └── End Turn Button
    │       │
    │       └── PlayerList
    │           └── PlayerCard[]
    │
    └── PlayerHand (Bottom)
        └── Tile[]
```

## State Flow (Zustand)

```
┌─────────────────────────────────────────────┐
│           Game Store (Zustand)              │
├─────────────────────────────────────────────┤
│  State:                                     │
│  • phase: GamePhase                         │
│  • players: Player[]                        │
│  • currentPlayerIndex: number               │
│  • board: TileOnBoard[]                     │
│  • pool: Tile[]                             │
│  • myHand: PlayerHand                       │
│  • myPlayerId: string | null                │
│  • turnStartBoard: TileOnBoard[]            │
│  • turnTimeRemaining: number                │
├─────────────────────────────────────────────┤
│  Actions:                                   │
│  • initializeGame(players)                  │
│  • startGame()                              │
│  • drawTile()                               │
│  • placeTile(tile, position, setId)         │
│  • endTurn()                                │
│  • undoTurn()                               │
│  • setMyPlayerId(id)                        │
│  • addPlayer(player)                        │
│  • removePlayer(playerId)                   │
│  • updateGameState(newState)                │
└─────────────────────────────────────────────┘
         │                    ▲
         │ Dispatch Action    │ Subscribe
         ▼                    │
┌─────────────────────────────────────────────┐
│           React Components                  │
│  • Read state via hooks                     │
│  • Call actions on user interaction         │
│  • Automatically re-render on changes       │
└─────────────────────────────────────────────┘
```

## File Structure

```
rummikub-discord/
│
├── client/                          # Frontend Application
│   ├── src/
│   │   ├── components/             # React Components
│   │   │   ├── Tile.tsx           # 🎴 Individual tile
│   │   │   ├── GameBoard.tsx      # 📋 Main board
│   │   │   ├── PlayerHand.tsx     # 🤲 Player's rack
│   │   │   ├── PlayerList.tsx     # 👥 Player roster
│   │   │   ├── GameControls.tsx   # 🎮 Action buttons
│   │   │   └── Lobby.tsx          # 🚪 Pre-game screen
│   │   │
│   │   ├── game/                  # Game Logic (Pure Functions)
│   │   │   └── logic.ts           # ✅ Rules & validation
│   │   │
│   │   ├── hooks/                 # Custom React Hooks
│   │   │   └── useDiscordSDK.ts   # 🎮 Discord integration
│   │   │
│   │   ├── store/                 # State Management
│   │   │   └── gameStore.ts       # 🗄️ Zustand store
│   │   │
│   │   ├── types/                 # TypeScript Definitions
│   │   │   └── game.ts            # 📝 All game types
│   │   │
│   │   ├── App.tsx                # 🏠 Root component
│   │   ├── main.tsx               # 🚀 Entry point
│   │   └── index.css              # 🎨 Global styles
│   │
│   ├── index.html                 # HTML template
│   ├── package.json               # Dependencies
│   ├── vite.config.ts            # Vite configuration
│   ├── tailwind.config.js        # Tailwind setup
│   └── tsconfig.json             # TypeScript config
│
├── server/                         # Backend Application
│   ├── src/
│   │   └── server.ts              # 🔐 Express server + OAuth
│   ├── package.json
│   └── tsconfig.json
│
├── README.md                       # 📚 Full documentation
├── QUICKSTART.md                   # ⚡ Quick setup guide
├── LEARNING_GUIDE.md               # 🎓 TypeScript tutorial
├── ARCHITECTURE.md                 # 🏗️ This file
└── .gitignore                      # Git ignore rules
```

## Technology Stack

### Frontend
- **React 18**: Component-based UI
- **TypeScript**: Type safety
- **Vite**: Fast build tool & dev server
- **Tailwind CSS**: Utility-first styling
- **Zustand**: Lightweight state management
- **React DnD**: Drag and drop library
- **Discord Embedded SDK**: Discord integration

### Backend
- **Node.js**: JavaScript runtime
- **Express**: Web framework
- **TypeScript**: Type safety

### Development Tools
- **Cloudflare Tunnel**: HTTPS for local dev
- **npm**: Package manager

## Key Design Decisions

### Why Zustand?
- Simpler than Redux
- No boilerplate
- TypeScript friendly
- Perfect for game state

### Why React DnD?
- Smooth drag and drop
- Touch support
- Flexible API
- Good TypeScript support

### Why Tailwind?
- Fast development
- Consistent design
- Easy responsive design
- Small bundle size

### Why Vite?
- Lightning fast HMR
- Modern ES modules
- Great TypeScript support
- Simple configuration

## Performance Considerations

1. **Tile Rendering**: Each tile is memoized
2. **State Updates**: Only changed components re-render
3. **Drag Performance**: HTML5 backend is optimized
4. **Bundle Size**: Tree-shaking removes unused code

## Security Considerations

1. **OAuth Flow**: Secure token exchange
2. **Client Secret**: Never exposed to client
3. **Environment Variables**: Sensitive data in .env
4. **HTTPS**: Required by Discord

## Scalability Path

### Current (MVP)
- In-memory game state
- Single server instance
- HTTP polling (if needed)

### Next Level
- Add WebSocket for real-time updates
- Add Redis for session storage
- Implement proper game rooms

### Production Scale
- Database (PostgreSQL/MongoDB)
- Message queue (RabbitMQ/Redis)
- Load balancing
- Horizontal scaling
- Monitoring and logging

---

**Understanding this architecture will help you build any Discord Activity! 🚀**
