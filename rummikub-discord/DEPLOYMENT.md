# 🚀 Deployment Checklist

Use this checklist to deploy your Rummikub Discord Activity to production!

## Pre-Deployment Checklist

### ✅ Development Complete
- [ ] Game works in local development
- [ ] All features tested with multiple players
- [ ] No console errors
- [ ] Responsive design works on mobile
- [ ] All TypeScript errors resolved

### ✅ Code Quality
- [ ] Code is commented where necessary
- [ ] No debug console.logs left in production code
- [ ] Environment variables are properly configured
- [ ] .env files are in .gitignore

### ✅ Discord Application Setup
- [ ] Activity is enabled in Discord Developer Portal
- [ ] OAuth redirect URLs are configured
- [ ] Activity name and description are set
- [ ] Activity icon/banner uploaded (optional but recommended)

## Deployment Steps

### Step 1: Choose a Hosting Platform

**Recommended Options:**

**Option A: Railway** (Easiest)
- ✅ Supports monorepos
- ✅ Free tier available
- ✅ Automatic HTTPS
- ✅ Easy environment variables

**Option B: Render**
- ✅ Free tier for web services
- ✅ Automatic deployments from Git
- ✅ Built-in HTTPS

**Option C: Vercel + Railway**
- ✅ Vercel for client (best frontend hosting)
- ✅ Railway/Render for server
- ✅ Requires CORS configuration

### Step 2: Prepare for Deployment

#### Client Build
```bash
cd client
npm run build
# Creates a 'dist' folder with production files
```

#### Server Preparation
```bash
cd server
npm run build
# Compiles TypeScript to JavaScript in 'dist' folder
```

### Step 3: Deploy to Railway (Recommended)

#### A. Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub
3. Create a new project

#### B. Deploy Server
```bash
# From the server directory
railway login
railway init
railway up

# Set environment variables in Railway dashboard:
# - VITE_DISCORD_CLIENT_ID
# - DISCORD_CLIENT_SECRET
# - PORT (usually 3001)
```

#### C. Deploy Client
```bash
# From the client directory
railway login
railway init
railway up

# Set environment variable:
# - VITE_DISCORD_CLIENT_ID

# Update vite.config.ts to point to your server URL
```

#### D. Link Services
In Railway dashboard:
1. Note your server URL
2. Update client's API proxy in `vite.config.ts`
3. Redeploy client

### Step 4: Update Discord Application

1. Go to Discord Developer Portal
2. Navigate to your application
3. Go to "Activities" tab
4. Under "URL Mappings":
   - Remove localhost URL
   - Add your production URL (e.g., `https://your-app.railway.app`)
   - Target path: `/`
5. Click "Save Changes"

### Step 5: Test in Production

- [ ] Open Discord
- [ ] Join a voice channel
- [ ] Launch your activity
- [ ] Test with multiple users
- [ ] Check all game features work
- [ ] Verify no console errors

## Post-Deployment

### Monitoring
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Monitor server logs
- [ ] Check Discord Developer Portal for errors

### Updates
```bash
# To deploy updates:
git push origin main
# Railway will auto-deploy if connected to Git
```

### Scaling Considerations
- [ ] Monitor player count
- [ ] Check server response times
- [ ] Consider adding database for persistence
- [ ] Plan for WebSocket implementation

## Environment Variables Reference

### Client (.env)
```
VITE_DISCORD_CLIENT_ID=your_application_id
```

### Server (.env)
```
VITE_DISCORD_CLIENT_ID=your_application_id
DISCORD_CLIENT_SECRET=your_client_secret
PORT=3001
NODE_ENV=production
```

## Common Deployment Issues

### Issue: "Activity not loading"
**Solutions:**
- [ ] Check URL mapping in Discord matches exactly
- [ ] Verify HTTPS is working
- [ ] Check server is running and accessible
- [ ] Look at browser console for errors

### Issue: "Authentication failed"
**Solutions:**
- [ ] Verify Client ID is correct
- [ ] Check Client Secret is set in server
- [ ] Ensure OAuth redirect URLs include production domain
- [ ] Check server logs for detailed errors

### Issue: "CORS errors"
**Solutions:**
- [ ] Update CORS configuration in server
- [ ] Ensure client and server are on same domain or CORS is properly configured
- [ ] Check proxy settings in vite.config.ts

### Issue: "Build fails"
**Solutions:**
- [ ] Run `npm install` to ensure dependencies are installed
- [ ] Fix any TypeScript errors
- [ ] Check Node.js version matches requirements
- [ ] Look at build logs for specific errors

## Alternative Deployment Platforms

### Vercel (Client Only)
```bash
cd client
npm install -g vercel
vercel
# Follow prompts, set environment variables in Vercel dashboard
```

### Heroku
```bash
# Install Heroku CLI
heroku login
heroku create your-app-name

# Deploy server
cd server
git push heroku main

# Set environment variables
heroku config:set VITE_DISCORD_CLIENT_ID=xxx
heroku config:set DISCORD_CLIENT_SECRET=xxx
```

### DigitalOcean App Platform
1. Connect your GitHub repository
2. Configure build and run commands
3. Set environment variables
4. Deploy

## Performance Optimization

### Before Going Live
- [ ] Enable production mode
- [ ] Minimize bundle size
- [ ] Enable gzip compression
- [ ] Optimize images if any
- [ ] Test loading times

### After Launch
- [ ] Monitor server load
- [ ] Check memory usage
- [ ] Analyze bundle size
- [ ] Set up CDN if needed

## Security Checklist

- [ ] All secrets in environment variables
- [ ] No API keys in client code
- [ ] HTTPS enabled
- [ ] CORS properly configured
- [ ] Rate limiting on API endpoints
- [ ] Input validation on all endpoints

## Marketing Your Activity

### Discord Developer Portal
- [ ] Add activity name
- [ ] Write clear description
- [ ] Upload activity icon (512x512 recommended)
- [ ] Add screenshots
- [ ] Set appropriate age rating

### Getting Users
- [ ] Share in Discord servers you're in
- [ ] Post on Discord Developer server
- [ ] Share on social media
- [ ] Create a support server
- [ ] Document how to use it

## Maintenance

### Regular Tasks
- [ ] Monitor error logs weekly
- [ ] Update dependencies monthly
- [ ] Check Discord SDK updates
- [ ] Backup any important data
- [ ] Test after Discord updates

### User Feedback
- [ ] Set up feedback channel
- [ ] Track feature requests
- [ ] Monitor bug reports
- [ ] Plan updates based on usage

## Advanced Features to Add Later

### Phase 2
- [ ] WebSocket for real-time sync
- [ ] Database for game persistence
- [ ] Player statistics
- [ ] Leaderboards

### Phase 3
- [ ] AI opponents
- [ ] Tournament mode
- [ ] Replay system
- [ ] Custom game modes

### Phase 4
- [ ] Spectator mode
- [ ] In-game shop (if monetizing)
- [ ] Achievements
- [ ] Social features

## Success Metrics

Track these to measure success:
- [ ] Daily active users
- [ ] Average game length
- [ ] Completion rate
- [ ] User retention
- [ ] Server uptime
- [ ] Average response time

## Getting Help

If you run into issues:
1. Check the ARCHITECTURE.md for system understanding
2. Review the LEARNING_GUIDE.md for code explanations
3. Look at server logs for errors
4. Check Discord Developer Portal for activity logs
5. Visit Discord Developer server (#activities-dev-help)

---

## 🎉 Launch Day Checklist

**The moment of truth!**

- [ ] All features tested ✅
- [ ] Production environment ready ✅
- [ ] Discord application configured ✅
- [ ] Monitoring set up ✅
- [ ] Friends ready to test ✅
- [ ] Documentation complete ✅
- [ ] Excitement level: MAXIMUM ✅

**You're ready to launch! 🚀**

Remember: It doesn't have to be perfect on day 1. You can always iterate and improve based on user feedback!

---

**Good luck with your deployment! 🎴**
