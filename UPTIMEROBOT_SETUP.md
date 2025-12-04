# UptimeRobot Setup Guide

This guide will help you configure UptimeRobot to keep your free Render instance alive by pinging it regularly.

## Why You Need This

Render's free tier spins down your server after 15 minutes of inactivity. UptimeRobot will ping your server every 5 minutes to keep it awake.

## Setup Steps

### 1. Create a UptimeRobot Account

1. Go to [https://uptimerobot.com/](https://uptimerobot.com/)
2. Sign up for a free account (no credit card required)
3. Verify your email

### 2. Add a New Monitor

1. Click **"+ Add New Monitor"** button
2. Configure the monitor:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** `Rummikub Discord Server`
   - **URL:** `https://your-render-url.onrender.com/api/health`
     - Replace `your-render-url.onrender.com` with your actual Render URL
   - **Monitoring Interval:** 5 minutes (free tier default)
3. Click **"Create Monitor"**

### 3. Verify It's Working

After setting up the monitor:

1. Wait 5 minutes for the first ping
2. Check your Render logs for this message:
   ```
   💓 UptimeRobot health check ping
   ```
3. Visit your server URL directly in a browser to see the status page
4. Check `/api/health` endpoint to see server stats

## Monitor Details

### Endpoints Available

1. **Root (`/`)**: Pretty status page with uptime and active games
2. **Health (`/api/health`)**: JSON endpoint that returns:
   ```json
   {
     "status": "ok",
     "timestamp": "2025-12-04T22:00:00.000Z",
     "uptime": 3600,
     "activeGames": 2
   }
   ```

### What to Monitor

- UptimeRobot will check your `/api/health` endpoint every 5 minutes
- If the server responds with status 200, it's considered "up"
- If it fails to respond, you'll get an alert (optional, configure in UptimeRobot settings)

## Free Tier Limits

- **Monitors:** Up to 50 monitors
- **Interval:** 5 minutes (can't go lower on free tier)
- **Alert Contacts:** 1 email alert contact

This is perfect for keeping your Render instance alive!

## Troubleshooting

### Server Still Spinning Down

- **Check UptimeRobot Dashboard:** Ensure the monitor shows "Up" status
- **Verify URL:** Make sure the URL matches your Render deployment exactly
- **Check Render Logs:** Look for the `💓 UptimeRobot health check ping` message

### Getting Too Many Alerts

- UptimeRobot will email you when your server goes down
- This is normal during Render deployments (your server restarts)
- You can disable email alerts in UptimeRobot settings if they're annoying

## Additional Tips

1. **Monitor Multiple Endpoints:** You can add monitors for both `/` and `/api/health` if you want redundancy
2. **Status Page:** Create a public status page in UptimeRobot to share your server's uptime
3. **Integration:** Connect UptimeRobot to Discord/Slack for deployment notifications (paid feature)

## Expected Behavior

- **Before UptimeRobot:** Server spins down after 15 minutes of inactivity, takes 30-60 seconds to wake up
- **After UptimeRobot:** Server stays active 24/7, responds instantly to requests

## Cost

**Free Forever** ✅
- UptimeRobot free tier is sufficient for this use case
- No need to upgrade to paid tiers
