import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const OAuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Extract the "code" from the URL query string
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      // Send the code to your backend
      fetch('https://rummy-server-4m92.onrender.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      })
        .then((response) => response.json())
        .then((data) => {
          console.log('Token exchange successful:', data);
          // Handle the token (e.g., save it in state or localStorage)
          navigate('/'); // Redirect to the home page or another route
        })
        .catch((error) => {
          console.error('Token exchange failed:', error);
        });
    } else {
      console.error('No authorization code found in the URL');
    }
  }, [navigate]);

  return <div>Processing Discord login...</div>;
};

export default OAuthCallback;