import React from 'react';

const DiscordLogin = () => {
  const handleLogin = () => {
    const clientId = '1432451260484943933'; // Replace with your client ID
    const redirectUri = encodeURIComponent('https://rummikub-discord.vercel.app/oauth2/callback');
    const scope = 'identify';
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;

    // Redirect the user to Discord's authorization page
    window.location.href = discordAuthUrl;
  };

  return (
    <button onClick={handleLogin}>
      Log in with Discord
    </button>
  );
};

export default DiscordLogin;