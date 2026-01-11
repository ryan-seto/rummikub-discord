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
  // const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
  const setupStarted = useRef(false);

  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (setupStarted.current) return;
    setupStarted.current = true;

    async function setupDiscord() {
      try {
        const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;

        if (!clientId) {
          throw new Error('VITE_DISCORD_CLIENT_ID is not set');
        }

        const sdk = new DiscordSDK(clientId);
        setDiscordSdk(sdk);

        await sdk.ready();

        const { code } = await sdk.commands.authorize({
          client_id: clientId,
          response_type: 'code',
          state: '',
          prompt: 'none',
          scope: ['identify', 'guilds', 'guilds.members.read'],
        });

        // Use /api prefix to route through Discord's proxy
        const response = await fetch('/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Token exchange error:', errorText);
          throw new Error(`Token exchange failed (${response.status}): ${errorText}`);
        }

        const tokenData = await response.json();

        if (!tokenData.access_token) {
          throw new Error('No access token in response');
        }

        const authResult = await sdk.commands.authenticate({
          access_token: tokenData.access_token,
        });

        setAuth(authResult);

        if (authResult.user) {
          setUser(authResult.user as DiscordUser);
        }

        const channel = sdk.channelId;
        setChannelId(channel || null);

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

        setIsReady(true);
      } catch (err) {
        console.error('Error in setupDiscord:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
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