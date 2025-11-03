# 🔧 Troubleshooting Guide

Common issues and how to fix them!

## 🚨 Installation Issues

### "npm install" fails

**Problem:** Dependencies won't install

**Solutions:**
```bash
# Try clearing npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json
npm install

# Try using a different Node version
nvm install 18
nvm use 18
npm install

# Check npm version
npm --version  # Should be 8.0.0 or higher
```

### TypeScript errors after installation

**Problem:** Red squiggly lines everywhere

**Solution:**
```bash
# Restart your IDE/editor
# VS Code: CMD+Shift+P → "Reload Window"

# Make sure TypeScript is installed
npm install -g typescript

# Check tsconfig.json exists
ls tsconfig.json
```

## 🎮 Discord Integration Issues

### "Discord SDK not initialized"

**Problem:** Activity won't load in Discord

**Checklist:**
- [ ] `.env` file exists with `VITE_DISCORD_CLIENT_ID`
- [ ] Client ID is correct (no spaces, quotes)
- [ ] Activity is enabled in Discord Developer Portal
- [ ] URL mapping matches your tunnel URL exactly

**How to verify:**
```bash
# Check .env file exists
cat client/.env

# Should see:
# VITE_DISCORD_CLIENT_ID=your_actual_id_here

# Make sure there's no trailing whitespace!
```

### "Failed to authorize"

**Problem:** OAuth flow fails

**Solutions:**

1. **Check Client ID:**
```javascript
// In client/.env
VITE_DISCORD_CLIENT_ID=1234567890  // Should be numbers only, no quotes
```

2. **Check Developer Portal:**
   - Go to your application
   - OAuth2 tab
   - Make sure redirect URLs include `http://localhost:5173`

3. **Check browser console:**
   - Press F12 in Discord
   - Look for specific error messages

### "Failed to exchange token"

**Problem:** Server can't get access token

**Solutions:**

1. **Check server .env:**
```bash
# server/.env should have BOTH:
VITE_DISCORD_CLIENT_ID=your_id
DISCORD_CLIENT_SECRET=your_secret  # This is different from client ID!
```

2. **Verify Client Secret:**
   - Discord Developer Portal
   - OAuth2 tab
   - Client Secret (click "Reset Secret" if needed)

3. **Check server is running:**
```bash
# Should see:
🚀 Rummikub server running on port 3001
```

### Activity doesn't appear in Discord

**Problem:** Can't find your activity in the launcher

**Solutions:**

1. **Check Activity is enabled:**
   - Discord Developer Portal
   - Activities tab
   - Toggle should be ON (green)

2. **Verify URL Mapping:**
   - Should exactly match your Cloudflare tunnel URL
   - Include `https://`
   - No trailing slash
   - Example: `https://abc-def.trycloudflare.com`

3. **Test URL directly:**
   - Copy your tunnel URL
   - Paste in regular browser
   - Should see your app load

4. **Restart Discord:**
   - Completely quit Discord
   - Reopen and try again

## 🌐 Cloudflare Tunnel Issues

### Tunnel keeps disconnecting

**Problem:** Tunnel URL stops working

**Solution:**
```bash
# Free tunnels disconnect after inactivity
# Just restart it:
cloudflared tunnel --url http://localhost:5173

# For stable tunnel, create a named tunnel:
cloudflared tunnel create rummikub
cloudflared tunnel route dns rummikub rummikub.example.com
cloudflared tunnel run rummikub
```

### "This site can't be reached"

**Problem:** Tunnel URL returns error

**Checklist:**
- [ ] Client dev server is running (`npm run dev`)
- [ ] Cloudflare tunnel is running
- [ ] Port 5173 is correct
- [ ] No firewall blocking the tunnel

**Test:**
```bash
# Check if client is running on 5173
curl http://localhost:5173

# Should return HTML, not connection refused
```

### Tunnel URL changed

**Problem:** Previous URL no longer works

**Solution:**
```bash
# Free tunnels get new URLs each time
# Update Discord Developer Portal with new URL:
# 1. Copy new tunnel URL
# 2. Go to Activities → URL Mappings
# 3. Update URL
# 4. Click Save
```

## 💻 Development Server Issues

### Client won't start

**Problem:** `npm run dev` fails

**Solutions:**

1. **Port already in use:**
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Or use different port in vite.config.ts:
server: {
  port: 5174,  // Change this
}
```

2. **Module not found:**
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

3. **Vite errors:**
```bash
# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

### Server won't start

**Problem:** `npm run dev` fails in server folder

**Solutions:**

1. **Port 3001 in use:**
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

2. **Environment variables missing:**
```bash
# Check .env exists
ls server/.env

# Should contain both Discord credentials
```

3. **TypeScript errors:**
```bash
# Install dependencies
cd server
npm install

# Check tsconfig.json exists
ls tsconfig.json
```

### Hot reload not working

**Problem:** Changes don't appear in browser

**Solutions:**
```bash
# Hard refresh: CMD+Shift+R (Mac) or CTRL+Shift+R (Windows)

# Or clear cache:
# DevTools → Network tab → Disable cache checkbox

# Restart dev server:
# CTRL+C to stop
# npm run dev to start
```

## 🎴 Game Logic Issues

### Tiles won't drag

**Problem:** Drag and drop not working

**Solutions:**

1. **Check react-dnd installed:**
```bash
cd client
npm list react-dnd react-dnd-html5-backend
# Should show both packages
```

2. **DndProvider missing:**
```typescript
// App.tsx should have:
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

<DndProvider backend={HTML5Backend}>
  {/* components */}
</DndProvider>
```

3. **Mobile device:**
   - HTML5 backend doesn't work on mobile
   - Need touch backend for mobile support

### "Invalid meld" always showing

**Problem:** Can't complete turn, validation failing

**Debug:**
```typescript
// Add console.log in game/logic.ts:
export function validateMeld(tiles: Tile[]): ValidatedMeld {
  console.log('Validating meld:', tiles);
  // ... rest of function
}
```

**Common causes:**
- Not enough tiles (need 3 minimum)
- Run: tiles not consecutive
- Run: tiles not same color
- Group: tiles not same number
- Group: duplicate colors

### Tiles disappear after placement

**Problem:** Tiles placed on board vanish

**Solution:**
```typescript
// Check store is updating correctly
// Add to gameStore.ts:
placeTile: (tile, position, setId) => {
  console.log('Placing tile:', tile, 'at', position);
  // ... rest of function
}
```

## 🎨 UI/Styling Issues

### Tailwind classes not working

**Problem:** Styles not applying

**Solutions:**

1. **Check Tailwind is configured:**
```bash
# These files should exist:
ls client/tailwind.config.js
ls client/postcss.config.js
```

2. **Verify CSS import:**
```typescript
// client/src/main.tsx should have:
import './index.css'
```

3. **Rebuild:**
```bash
# Stop dev server (CTRL+C)
# Delete node_modules/.vite
rm -rf node_modules/.vite
# Restart
npm run dev
```

### Custom colors not working

**Problem:** `text-rummikub-red` etc. not working

**Solution:**
```javascript
// Check tailwind.config.js has:
theme: {
  extend: {
    colors: {
      rummikub: {
        red: '#E53E3E',
        // ... etc
      }
    }
  }
}
```

### Layout broken on mobile

**Problem:** UI doesn't fit on small screens

**Debug:**
```bash
# Test responsive design:
# DevTools → Device toolbar (CMD+Shift+M)
# Try different screen sizes
```

## 🔐 Authentication Errors

### "Token expired"

**Problem:** Auth token no longer valid

**Solution:**
```bash
# Refresh the page
# Discord will re-authenticate automatically
```

### "Invalid OAuth state"

**Problem:** OAuth flow validation fails

**Solution:**
```bash
# Clear browser cache and cookies
# Try again
```

## 📦 Build Issues

### `npm run build` fails

**Problem:** Production build won't complete

**Solutions:**

1. **TypeScript errors:**
```bash
# Check for type errors
npm run build

# Fix all TypeScript errors shown
# Common: missing types, unused variables
```

2. **Out of memory:**
```bash
# Increase Node memory
NODE_OPTIONS=--max_old_space_size=4096 npm run build
```

3. **Path issues:**
```bash
# Make sure imports use relative paths
# Good: import { Tile } from './types/game'
# Bad:  import { Tile } from 'types/game'
```

## 🐛 Common TypeScript Errors

### "Cannot find module"

**Error:** `Cannot find module './components/Tile'`

**Solution:**
```typescript
// Add .tsx extension:
import { Tile } from './components/Tile.tsx'

// Or fix tsconfig.json:
"moduleResolution": "bundler",
"allowImportingTsExtensions": true
```

### "Type 'X' is not assignable to type 'Y'"

**Solution:**
```typescript
// Add proper type annotations:
const tiles: Tile[] = [];  // Specify type

// Or fix the type definition:
interface MyComponent {
  tiles: Tile[];  // Make sure this matches
}
```

### "Object is possibly 'null'"

**Solution:**
```typescript
// Use optional chaining:
player?.username

// Or add null check:
if (player) {
  console.log(player.username);
}

// Or use non-null assertion (if you're sure):
player!.username
```

## 🔍 Debugging Tips

### Enable detailed logging

```typescript
// Add to App.tsx:
useEffect(() => {
  console.log('Game state:', useGameStore.getState());
}, []);
```

### Check network requests

```bash
# Open DevTools (F12)
# Network tab
# Look for failed requests
# Check request/response details
```

### React DevTools

```bash
# Install React DevTools browser extension
# Inspect component props and state
# Track re-renders
```

### Discord DevTools

```bash
# In Discord app, press CTRL+Shift+I
# Console tab shows Discord SDK logs
# Network tab shows Discord API calls
```

## 📞 Getting Help

### Still stuck?

1. **Check logs:**
   - Client: Browser console (F12)
   - Server: Terminal where server is running
   - Discord: Discord console (CTRL+Shift+I in Discord)

2. **Search for error:**
   - Copy exact error message
   - Search on Google/Stack Overflow
   - Check Discord Developer Docs

3. **Ask for help:**
   - Discord Developer server (#activities-dev-help)
   - GitHub Issues
   - Stack Overflow with tag `discord-activity`

### What to include when asking:

```
**Problem:** [Brief description]

**Error message:** [Copy full error]

**What I've tried:** [List solutions attempted]

**Environment:**
- Node version: [run `node --version`]
- npm version: [run `npm --version`]
- OS: [Windows/Mac/Linux]

**Code snippet:** [Relevant code if applicable]
```

## 🎯 Prevention

### Avoid common issues:

1. **Always use environment variables for secrets**
2. **Keep dependencies updated** (but test first!)
3. **Commit working code often**
4. **Test in Discord frequently**
5. **Read error messages carefully**

### Development best practices:

```bash
# Before making changes:
git commit -m "Working version"

# Test each feature:
# 1. Does it work locally?
# 2. Does it work in Discord?
# 3. Does it work with multiple players?
```

---

**Remember: Most issues are simple fixes! Stay calm and debug systematically. 🔧**
