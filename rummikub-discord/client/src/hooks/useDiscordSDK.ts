import { useState, useEffect, useRef } from 'react';
import { DiscordSDK } from '@discord/embedded-app-sdk';
import { DiscordUser, DiscordParticipant } from '../types/game';

interface UseDiscordSDKReturn {
  discordSdk: DiscordSDK | null;
  auth: any;
  user: DiscordUser | null;
  channelId: string | null;
  participants: DiscordParticipant[];
  isReady: boolean;
  error: string | null;
}

export function useDiscordSDK(): UseDiscordSDKReturn {
  const [discordSdk, setDiscordSdk] = useState<DiscordSDK | null>(null);
  const [auth, setAuth] = useState<any>(null);
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<DiscordParticipant[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const setupStarted = useRef(false);  // ADD THIS LINE

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (setupStarted.current) return;  // ADD THIS CHECK
    setupStarted.current = true;        // ADD THIS LINE

    async function setupDiscord() {
      try {
        console.log('Step 1: Getting client ID from env');
        const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
        
        if (!clientId) {
          throw new Error('VITE_DISCORD_CLIENT_ID is not set');
        }
        console.log('Step 1: Client ID found:', clientId);

        console.log('Step 2: Initializing Discord SDK');
        const sdk = new DiscordSDK(clientId);
        setDiscordSdk(sdk);

        console.log('Step 3: Waiting for SDK ready');
        await sdk.ready();
        console.log('Step 3: SDK is ready!');

        console.log('Step 4: Authorizing with Discord');
        const { code } = await sdk.commands.authorize({
          client_id: clientId,
          response_type: 'code',
          state: '',
          prompt: 'none',
          scope: [
            'identify',
            'guilds',
            'guilds.members.read',
          ],
        });
        console.log('Step 4: Got authorization code');

        console.log('Step 5: Exchanging code for token');
        const response = await fetch('/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        console.log('Step 5: Token response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Step 5 FAILED: Token exchange error:', errorText);
          throw new Error(`Token exchange failed (${response.status}): ${errorText}`);
        }

        const tokenData = await response.json();
        console.log('Step 5: Got token data');

        if (!tokenData.access_token) {
          throw new Error('No access token in response');
        }

        console.log('Step 6: Authenticating with access token');
        const authResult = await sdk.commands.authenticate({
          access_token: tokenData.access_token,
        });
        console.log('Step 6: Authentication successful!');

        setAuth(authResult);
        
        if (authResult.user) {
          setUser(authResult.user as DiscordUser);
          console.log('Got user:', authResult.user);
        }

        const channel = sdk.channelId;
        setChannelId(channel || null);
        console.log('Got channel ID:', channel);

        // Subscribe to participant updates
        sdk.subscribe('ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE', (data) => {
          if (data.participants) {
            const participantList = data.participants.map((p: any) => ({
              id: p.id,
              username: p.username,
              avatar: p.avatar,
            }));
            setParticipants(participantList);
          }
        });

        // Get initial participants
        const instanceParticipants = await sdk.commands.getInstanceConnectedParticipants();
        if (instanceParticipants.participants) {
          const participantList = instanceParticipants.participants.map((p: any) => ({
            id: p.id,
            username: p.username,
            avatar: p.avatar,
          }));
          setParticipants(participantList);
        }

        console.log('SUCCESS: All setup complete!');
        setIsReady(true);
      } catch (err) {
        console.error('FATAL ERROR in setupDiscord:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Error message:', errorMessage);
        setError(errorMessage);
      }
    }

    setupDiscord();
  }, []);

  return {
    discordSdk,
    auth,
    user,
    channelId,
    participants,
    isReady,
    error,
  };
}