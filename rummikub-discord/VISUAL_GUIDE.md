# 🎨 Visual Guide - What to Expect

This guide shows you what your Rummikub Discord Activity will look like!

## 🚪 Lobby Screen

When players first join, they see:

```
┌─────────────────────────────────────────────────────────┐
│                      Rummikub                           │
│          Waiting for players to join...                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📜 Quick Rules                                         │
│  • Each player starts with 14 tiles                    │
│  • First play must total at least 30 points            │
│  • Form runs or groups (minimum 3 tiles)               │
│  • Jokers can substitute any tile                      │
│  • First player to play all tiles wins!                │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Players (2/4)                                          │
│  ┌─────────────────────────────────────────────────┐  │
│  │ 👤 Player1                        ✓ Ready       │  │
│  └─────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────┐  │
│  │ 👤 Player2                        ✓ Ready       │  │
│  └─────────────────────────────────────────────────┘  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│              ┌───────────────────────┐                 │
│              │   🎮 Start Game      │                 │
│              └───────────────────────┘                 │
└─────────────────────────────────────────────────────────┘
```

**Colors:**
- Background: Dark purple/gray gradient
- Cards: White with colored text
- Buttons: Green when active, gray when disabled

## 🎮 Main Game Screen

When the game starts:

```
┌──────────────────────────────────────────────────────────────────────┐
│ Rummikub                                      It's your turn!        │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ ┌──────────────────────────────────────┐  ┌──────────────────────┐ │
│ │      GAME BOARD (Green Felt)         │  │   Time Remaining     │ │
│ │                                      │  │      02:00           │ │
│ │  [3][4][5]                          │  ├──────────────────────┤ │
│ │    red tiles                        │  │   Tiles in Pool      │ │
│ │                                      │  │        42            │ │
│ │  [7][7][7][7]                       │  ├──────────────────────┤ │
│ │  red blue yellow black              │  │  🎴 Draw Tile        │ │
│ │                                      │  │  ↩️ Undo Turn       │ │
│ │                                      │  │  ✓ End Turn         │ │
│ │  Drop tiles here to form melds      │  ├──────────────────────┤ │
│ │                                      │  │  Players             │ │
│ │                                      │  │  ┌────────────────┐ │ │
│ └──────────────────────────────────────┘  │  │👤 You (14) ⚡ │ │ │
│                                            │  ├────────────────┤ │ │
│                                            │  │👤 Player2 (12)│ │ │
│                                            │  └────────────────┘ │ │
│                                            └──────────────────────┘ │
├──────────────────────────────────────────────────────────────────────┤
│ Your Hand (14 tiles)                                                 │
│ ┌────────────────────────────────────────────────────────────────┐  │
│ │ [1] [2] [3] [5] [7] [8] [9] [10] [11] [2] [3] [4] [🃏] [13] │  │
│ │ red red red red red red red  red  red blue blue blue    black │  │
│ └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

## 🎴 Tile Appearance

Individual tiles look like playing cards:

```
┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐
│ 3   │  │ 7   │  │ 11  │  │ 5   │  │ 🃏  │
│  3  │  │  7  │  │  11 │  │  5  │  │Joker│
│   3 │  │   7 │  │   11│  │   5 │  │     │
└─────┘  └─────┘  └─────┘  └─────┘  └─────┘
  red     blue    yellow   black   purple
```

**Tile Features:**
- Cream/beige background (like real tiles)
- Colored numbers (red, blue, yellow, black)
- Slight shadow for depth
- Rounded corners
- Hover effect (slightly scales up)
- Smooth animations when moving

## 🎨 Color Palette

```
Game Board:
- Background: Forest green (#2C5F2D)
- Lighter green: #397D3B
- Grid lines: White with low opacity

Tile Colors:
- Red: #E53E3E (vibrant)
- Blue: #3182CE (bright)
- Yellow: #ECC94B (warm)
- Black: #2D3748 (dark gray)

Player Hand Rack:
- Background: Brown wood (#8B4513)
- Darker brown: Amber-900

UI Elements:
- Background: Gray-900 to Slate-800 gradient
- Cards: Gray-800
- Buttons: 
  - Active: Green-600
  - Disabled: Gray-600
  - Warning: Yellow-600
  - Danger: Red-600

Accents:
- Current turn: Green with yellow pulse
- Hover effects: Scale + shadow
- Selected: Blue ring
```

## 📱 Responsive Design

### Desktop View (Recommended)
```
┌─────────────────────────────────────────────────┐
│ Header                                          │
├──────────────────────────┬──────────────────────┤
│                         │                      │
│    GAME BOARD           │    SIDEBAR          │
│    (Large)              │    - Controls       │
│                         │    - Players        │
│                         │                      │
└──────────────────────────┴──────────────────────┘
│         YOUR HAND (Tiles spread out)           │
└─────────────────────────────────────────────────┘
```

### Mobile View
```
┌───────────────────┐
│     Header        │
├───────────────────┤
│   Controls        │
├───────────────────┤
│   Game Board      │
│   (Scrollable)    │
├───────────────────┤
│   Player List     │
├───────────────────┤
│   Your Hand       │
│   (Scrollable)    │
└───────────────────┘
```

## ✨ Animations

### Tile Animations
- **Pickup**: Tile scales up slightly (1.05x)
- **Drag**: Slight rotation, shadow follows cursor
- **Drop**: Scale bounce effect (1.1x → 1.0x)
- **Invalid**: Shake animation + red border flash

### Turn Transition
- **Your Turn**: 
  - Green pulse on your player card
  - "Your turn!" notification
  - Controls fade in
  
- **Other's Turn**:
  - Gray out controls
  - "Waiting..." message
  - Their player card pulses

### Timer
- **Normal (120-30s)**: White text, steady
- **Warning (30-10s)**: Yellow text, slight pulse
- **Critical (<10s)**: Red text, fast pulse, beep sound

## 🎯 Interactive Elements

### Drag and Drop
```
1. Hover over tile → Cursor changes to grab hand
2. Click and hold → Tile lifts (shadow appears)
3. Drag over board → Board highlights drop zone
4. Release → Tile snaps to grid position
5. Success → Tile animates into place
```

### Buttons
```
Draw Tile Button:
┌──────────────────┐
│  🎴 Draw Tile   │  ← Blue, glows on hover
└──────────────────┘

End Turn Button:
┌──────────────────┐
│  ✓ End Turn     │  ← Green, scales on hover
└──────────────────┘

Undo Button:
┌──────────────────┐
│  ↩️ Undo Turn   │  ← Yellow, fades in/out
└──────────────────┘
```

### Player Cards
```
Current Turn:
┌─────────────────────────────┐
│ 👤 PlayerName    │ ⚡ Turn  │  ← Green background, pulsing
│    14 tiles      │          │     Yellow indicator
└─────────────────────────────┘

Waiting:
┌─────────────────────────────┐
│ 👤 PlayerName                │  ← Gray background
│    12 tiles      ✓ Initial   │
└─────────────────────────────┘
```

## 🎬 Animation Showcase

### Tile Flip (When Drawing)
```
Frame 1: ─┐     Frame 2: ▐│▌     Frame 3: ┌─
         │                             │
         └─                           ─┘
```

### Victory Animation
```
┌─────────────────────────────────┐
│                                 │
│        🎉 YOU WIN! 🎉         │
│                                 │
│    Confetti falling everywhere  │
│    Tiles celebrating            │
│                                 │
└─────────────────────────────────┘
```

## 💡 User Feedback

### Visual Indicators
- ✅ Valid meld: Green checkmark appears
- ❌ Invalid: Red X with shake
- 🎴 Drew tile: Tile flips animation
- ⏱️ Time running out: Red pulsing timer
- 🎯 Your turn: Green glow around controls
- 👥 Player joined: Notification slide-in
- 👋 Player left: Fade out animation

### Hover States
```
Normal Tile:         Hover Tile:
┌─────┐              ┌─────┐
│  5  │              │  5  │  ← Slightly larger
│     │    →         │     │     Shadow increases
└─────┘              └─────┘     Cursor: grab
```

## 📊 Status Indicators

### Turn Progress
```
┌────────────────────────────────────┐
│ Turn: 1/4  ○ ○ ● ○                │
│ Time: ██████░░░░ 1:23              │
└────────────────────────────────────┘
```

### Game Phase
```
Lobby:    🚪 Waiting for players...
Playing:  🎮 Game in progress
Ended:    🏆 Player wins!
```

## 🎨 Theme Customization

The Tailwind config allows easy theme changes:

```javascript
// Change game board color
boardColor: '#2C5F2D'  // Current green
         →  '#1e3a5f'  // Try blue!

// Change tile background
tileColor: '#F5F5DC'   // Current beige
        →  '#FFFFFF'   // Try white!

// Add your brand colors
brand: {
  primary: '#yourColor',
  secondary: '#yourOtherColor',
}
```

## 📐 Layout Dimensions

### Tiles
- Width: 48px (mobile) / 56px (desktop)
- Height: 64px (mobile) / 80px (desktop)
- Gap: 8px
- Border: 2px

### Board
- Min height: 400px
- Padding: 24px
- Grid: 60px × 90px cells

### Hand
- Height: ~120px
- Max 2 rows
- Horizontal scroll if needed

## 🎭 Sample Gameplay Flow

```
1. Lobby Screen
   ↓ (All players ready)
   
2. Game Board appears
   ↓ (Tiles dealt)
   
3. Your turn begins
   ↓ (Timer starts)
   
4. Place tiles or draw
   ↓ (Make your move)
   
5. Click "End Turn"
   ↓ (Validates board)
   
6. Next player's turn
   ↓ (Repeat 3-5)
   
7. Someone plays last tile
   ↓
   
8. Victory screen! 🎉
```

---

**This visual guide helps you understand what your finished product will look like!**

**The actual implementation uses smooth animations, beautiful gradients, and professional UI polish! 🎨**
