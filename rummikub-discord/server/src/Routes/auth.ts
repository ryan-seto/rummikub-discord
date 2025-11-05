import express from 'express';

const router = express.Router();

// Type definition for the Discord response
interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
}

interface DiscordUserResponse {
  user: DiscordUser;
  // Add other properties if needed
}

// Type guard to validate the shape of the Discord response
function isDiscordUserResponse(obj: any): obj is DiscordUserResponse {
  return obj && typeof obj === 'object' && 'user' in obj;
}

router.get('/discord', async (req, res) => {
  const ticket = req.query.discord_proxy_ticket as string | null;

  if (!ticket) {
    return res.status(400).json({ error: 'Missing proxy ticket' });
  }

  try {
    // Node 22+ has built-in fetch
    const response = await fetch(
      `https://discord.com/api/v10/oauth2/authorize?ticket=${ticket}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.DISCORD_BOT_TOKEN}`
        }
      }
    );

    if (!response.ok) {
      return res.status(401).json({ error: 'Invalid Discord proxy ticket' });
    }

    const rawData = await response.json();

    if (!isDiscordUserResponse(rawData)) {
      return res.status(500).json({ error: 'Malformed Discord response' });
    }

    const data: DiscordUserResponse = rawData;

    // Send back only the user info to the frontend
    res.json({ user: data.user });
  } catch (err) {
    console.error('Error validating Discord ticket:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
