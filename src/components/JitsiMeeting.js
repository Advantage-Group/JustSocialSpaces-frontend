import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import './JitsiMeeting.css';

const JitsiMeeting = ({ spaceData, onClose }) => {
  const { state, showNotification } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isInviting, setIsInviting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= 768;
  });
  
  const jitsiContainerRef = useRef(null);
  const apiRef = useRef(null);

  // Track viewport for mobile behavior (no drag, full-screen overlay)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Fetch fresh space data and join space when component mounts
  useEffect(() => {
    const joinSpace = async () => {
      const token = localStorage.getItem('token');
      
      // Check if user is logged in
      if (!token || !state.user) {
        console.error('❌ No token or user not logged in');
        showNotification('Please login to join spaces', 'error');
        onClose();
        return;
      }

      // Verify user is registered by checking token
      try {
        const verifyRes = await fetch('http://localhost:5000/api/auth/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!verifyRes.ok) {
          console.error('❌ User verification failed');
          showNotification('Please register to join spaces', 'error');
          onClose();
          return;
        }

        // CRITICAL: Fetch fresh space data from API to ensure correct jitsiRoomName
        let freshSpaceData = spaceData;
        if (spaceData?.id) {
          console.log('🔄 Fetching fresh space data for spaceId:', spaceData.id);
          try {
            const spaceRes = await fetch(`http://localhost:5000/api/spaces/${spaceData.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (spaceRes.ok) {
              const spaceDataResponse = await spaceRes.json();
              freshSpaceData = spaceDataResponse.space;
              console.log('✅ Fresh space data fetched:', {
                spaceId: freshSpaceData.id,
                jitsiRoomName: freshSpaceData.jitsiRoomName,
                jitsiDomain: freshSpaceData.jitsiDomain,
                status: freshSpaceData.status
              });
            } else {
              console.warn('⚠️ Failed to fetch fresh space data, using provided data');
            }
          } catch (fetchError) {
            console.error('❌ Error fetching fresh space data:', fetchError);
            console.warn('⚠️ Using provided space data as fallback');
          }
        }

        // Check if space is still live before joining
        if (freshSpaceData?.status === 'ended') {
          console.error('❌ Space has ended');
          showNotification('This space has ended', 'error');
          onClose();
          return;
        }

        // Validate critical Jitsi connection data
        if (!freshSpaceData?.jitsiRoomName) {
          console.error('❌ Missing jitsiRoomName in space data:', freshSpaceData);
          showNotification('Invalid space configuration. Please try again.', 'error');
          onClose();
          return;
        }

        console.log('🎧 JOINER Preparing to join Space:', {
          spaceId: freshSpaceData.id,
          roomName: freshSpaceData.jitsiRoomName,
          domain: freshSpaceData.jitsiDomain || process.env.REACT_APP_JITSI_DOMAIN || 'meet.jit.si',
          userId: state.user?.id,
          userName: state.user?.name
        });

        // Join the space via API
        if (freshSpaceData?.id) {
          const joinRes = await fetch(`http://localhost:5000/api/spaces/${freshSpaceData.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              action: 'join',
              listenerCount: (freshSpaceData?.listenerCount || 0) + 1
            })
          });

          if (!joinRes.ok) {
            const errorData = await joinRes.json();
            console.error('❌ Failed to join space via API:', errorData);
            showNotification(errorData.error || 'Failed to join space', 'error');
            // Still allow joining if it's just a duplicate join
            if (joinRes.status !== 400) {
              onClose();
              return;
            }
          } else {
            // Successfully joined
            console.log('✅ Successfully joined space via API:', freshSpaceData.id);
          }
        }

        // Update spaceData with fresh data for Jitsi initialization
        if (freshSpaceData !== spaceData) {
          // Trigger re-initialization with fresh data
          // This will be handled by the Jitsi initialization effect
          console.log('🔄 Space data updated, will re-initialize Jitsi');
        }
      } catch (error) {
        console.error('❌ Error joining space:', error);
        showNotification('Failed to join space. Please try again.', 'error');
        onClose();
      }
    };

    if (spaceData) {
      joinSpace();
    }
  }, [spaceData, state.user, onClose, showNotification]);

  // Load Jitsi Meet External API script
  useEffect(() => {
    if (typeof window.JitsiMeetExternalAPI !== 'undefined') {
      return; // Already loaded
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="external_api.js"]');
    if (existingScript) {
      return; // Script already exists
    }

    const envDomain = process.env.REACT_APP_JITSI_DOMAIN;
    const preferredDomain =
      envDomain ||
      spaceData?.jitsiDomain ||
      'meet.jit.si';

    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const domainToUse = envDomain
      ? preferredDomain
      : (isLocalhost ? 'meet.jit.si' : preferredDomain);

    console.log('Loading Jitsi Meet External API from:', domainToUse);

    const script = document.createElement('script');
    script.src = `https://${domainToUse}/external_api.js`;
    script.async = true;
    script.onload = () => {
      console.log('Jitsi Meet External API loaded successfully');
    };
    script.onerror = () => {
      console.error('Failed to load Jitsi Meet External API from:', domainToUse);
      setLoadError(`Failed to load Jitsi Meet API from ${domainToUse}. Please check your network connection.`);
      setIsLoading(false);
    };
    document.head.appendChild(script);

    return () => {
      // Don't remove script on cleanup to avoid reloading
    };
  }, [spaceData]);

  // Initialize Jitsi Meet API
  useEffect(() => {
    if (!spaceData || !jitsiContainerRef.current || apiRef.current) return;

    // Fetch fresh space data before initializing Jitsi
    const initializeJitsi = async () => {
      const token = localStorage.getItem('token');
      let currentSpaceData = spaceData;

      // Fetch fresh space data to ensure correct jitsiRoomName
      if (spaceData?.id && token) {
        try {
          console.log('🔄 Fetching latest space data for Jitsi initialization...');
          const spaceRes = await fetch(`http://localhost:5000/api/spaces/${spaceData.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (spaceRes.ok) {
            const spaceDataResponse = await spaceRes.json();
            currentSpaceData = spaceDataResponse.space;
            console.log('✅ Latest space data fetched for Jitsi:', {
              spaceId: currentSpaceData.id,
              jitsiRoomName: currentSpaceData.jitsiRoomName,
              jitsiDomain: currentSpaceData.jitsiDomain
            });
          } else {
            console.warn('⚠️ Failed to fetch latest space data, using provided data');
          }
        } catch (fetchError) {
          console.error('❌ Error fetching latest space data:', fetchError);
          console.warn('⚠️ Using provided space data as fallback');
        }
      }

      // CRITICAL: Use exact room name from database
      const roomName = currentSpaceData?.jitsiRoomName;
      if (!roomName) {
        console.error('❌ CRITICAL: Missing jitsiRoomName in space data:', currentSpaceData);
        setLoadError('Invalid space configuration. Missing room name.');
        setIsLoading(false);
        return;
      }

      // CRITICAL: Use exact domain from database or env, ensure consistency
      const envDomain = process.env.REACT_APP_JITSI_DOMAIN;
      const spaceDomain = currentSpaceData?.jitsiDomain;
      
      // Priority: env variable > space data > default
      const domainToUse = envDomain || spaceDomain || 'meet.jit.si';

      // Log connection details for debugging
      const isHost = currentSpaceData?.host?.id === state.user?.id || 
                     currentSpaceData?.hostId === state.user?.id;
      
      console.log(isHost ? '🏠 HOST' : '🎧 JOINER', 'Initializing Jitsi:', {
        spaceId: currentSpaceData?.id,
        roomName: roomName,
        domain: domainToUse,
        userId: state.user?.id,
        userName: state.user?.name,
        envDomain: envDomain,
        spaceDomain: spaceDomain
      });

      const userDisplayName = state.user?.name || state.user?.displayName || 'User';
      const userEmail = state.user?.email || '';

      // Jitsi configuration options - MUST BE IDENTICAL FOR HOST AND JOINERS
      const options = {
        roomName: roomName, // CRITICAL: Must be exact same for all users
        parentNode: jitsiContainerRef.current,
        configOverwrite: {
          prejoinPageEnabled: false, // CRITICAL: Disable prejoin for seamless joining
          startWithAudioMuted: true,
          startWithVideoMuted: true,
          enableWelcomePage: false,
          enableClosePage: false,
          disableDeepLinking: true,
          disableInviteFunctions: true,
          enableNoAudioDetection: false,
          enableNoisyMicDetection: false,
          enableLayerSuspension: true,
          channelLastN: -1, // Unlimited participants
          p2p: {
            enabled: false, // Disable P2P to ensure all users connect through server
          },
          analytics: {
            disabled: true
          },
          disableThirdPartyRequests: false,
          enableInsecureRoomNameWarning: false,
          enableDisplayNameInStats: false,
          enableEmailInStats: false,
          enableLobbyChat: false,
          enableChat: true,
          enableTCC: true,
          // Connection settings
          iceServers: [
            {
              urls: 'stun:stun.l.google.com:19302'
            }
          ],
          enableRemb: true,
          enableTcc: true,
          useStunTurn: true,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_ALWAYS_VISIBLE: true,
          SHOW_JITSI_WATERMARK: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_POWERED_BY: false,
          DISABLE_DOMINANT_SPEAKER_INDICATOR: false,
          DISABLE_FOCUS_INDICATOR: false,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
          DISABLE_PRESENCE_STATUS: false,
          DISABLE_RINGING: false,
          AUDIO_LEVEL_PRIMARY_COLOR: 'rgba(255,255,255,0.4)',
          AUDIO_LEVEL_SECONDARY_COLOR: 'rgba(255,255,255,0.2)',
          INITIAL_TOOLBAR_TIMEOUT: 20000,
          TOOLBAR_TIMEOUT: 4000,
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'chat', 'settings', 'raisehand',
            'videoquality', 'filmstrip', 'feedback', 'stats', 'shortcuts',
            'tileview', 'videobackgroundblur', 'download', 'help', 'mute-everyone', 'security'
          ],
        },
        userInfo: {
          displayName: userDisplayName,
          email: userEmail,
        },
        jwt: null, // Add JWT if your Jitsi server requires it
      };

      try {
        console.log('🔧 Jitsi configuration:', {
          domain: domainToUse,
          roomName: roomName,
          userDisplayName: userDisplayName
        });
        
        if (!jitsiContainerRef.current) {
          console.error('❌ Jitsi container ref is null');
          setLoadError('Jitsi container not ready. Please try again.');
          setIsLoading(false);
          return;
        }
        
        const api = new window.JitsiMeetExternalAPI(domainToUse, options);
        if (!api) {
          throw new Error('Failed to create JitsiMeetExternalAPI instance');
        }
        apiRef.current = api;
        console.log('✅ Jitsi API instance created successfully');

      // Event: Conference joined successfully
      api.on('videoConferenceJoined', (event) => {
        console.log('✅ Successfully joined Jitsi conference:', {
          roomName: roomName,
          domain: domainToUse,
          event: event
        });
        setIsConnected(true);
        setIsLoading(false);
        setLoadError(null);
        
        // Update participant count
        try {
          const participants = api.getNumberOfParticipants();
          setParticipantCount(participants + 1); // +1 for self
          console.log('👥 Current participant count:', participants + 1);
        } catch (error) {
          console.error('Error getting participant count:', error);
        }
      });

      // Event: Participant joined
      api.on('participantJoined', (event) => {
        console.log('👤 Participant joined:', event);
        try {
          const participants = api.getNumberOfParticipants();
          setParticipantCount(participants + 1);
          console.log('👥 Updated participant count:', participants + 1);
        } catch (error) {
          console.error('Error updating participant count:', error);
        }
      });

      // Event: Participant left
      api.on('participantLeft', (event) => {
        console.log('👋 Participant left:', event);
        try {
          const participants = api.getNumberOfParticipants();
          setParticipantCount(Math.max(1, participants + 1));
          console.log('👥 Updated participant count:', participants + 1);
        } catch (error) {
          console.error('Error updating participant count:', error);
        }
      });

      // Event: Conference left
      api.on('videoConferenceLeft', (event) => {
        console.log('🚪 Left Jitsi conference:', event);
        setIsConnected(false);
      });

      // Event: Connection failed - CRITICAL for debugging disconnections
      api.on('connectionFailed', (event) => {
        console.error('❌ Jitsi connection failed:', {
          roomName: roomName,
          domain: domainToUse,
          event: event
        });
        setLoadError('Connection failed. Please check your network and try again.');
        setIsLoading(false);
        setIsConnected(false);
        showNotification('Failed to connect to the meeting. Please try again.', 'error');
      });

      // Event: Error occurred - CRITICAL for catching all errors
      api.on('errorOccurred', (error) => {
        console.error('🚨 Jitsi error occurred:', {
          roomName: roomName,
          domain: domainToUse,
          error: error,
          errorType: error?.error,
          errorMessage: error?.message
        });
        
        // Handle different error types
        if (error.error === 'connection.ERROR' || error.error === 'connection.DISCONNECTED') {
          setLoadError('Connection error. You have been disconnected. Please check your network connection.');
          setIsLoading(false);
          setIsConnected(false);
          showNotification('Connection lost. Please try rejoining.', 'error');
        } else if (error.error === 'conference.ERROR') {
          setLoadError('Conference error. Please try again.');
          setIsLoading(false);
          setIsConnected(false);
        }
      });

      // Event: Ready to close
      api.on('readyToClose', () => {
        console.log('⚠️ Jitsi ready to close');
        if (apiRef.current) {
          apiRef.current.dispose();
          apiRef.current = null;
        }
      });

      // Additional event: Endpoint text message (for debugging)
      api.on('endpointTextMessageReceived', (event) => {
        console.log('💬 Endpoint text message received:', event);
      });

      // Additional event: Participant role changed
      api.on('participantRoleChanged', (event) => {
        console.log('👑 Participant role changed:', event);
      });

      // Event: Audio/video status changes
      api.on('audioMuteStatusChanged', (event) => {
        console.log('Audio mute status changed:', event);
      });

      api.on('videoMuteStatusChanged', (event) => {
        console.log('Video mute status changed:', event);
      });

      // Event: Display name change
      api.on('displayNameChange', (event) => {
        console.log('Display name changed:', event);
      });

      // Event: Incoming message
      api.on('incomingMessage', (event) => {
        console.log('Incoming message:', event);
      });

      // Event: Outgoing message
      api.on('outgoingMessage', (event) => {
        console.log('Outgoing message:', event);
      });

        // Set loading to false after a timeout (in case events don't fire)
        const loadingTimeout = setTimeout(() => {
          console.warn('⚠️ Jitsi loading timeout - checking connection status');
          if (apiRef.current) {
            try {
              const participants = apiRef.current.getNumberOfParticipants();
              console.log('👥 Current participants:', participants);
              setIsLoading(false);
            } catch (error) {
              console.error('❌ Error checking participants:', error);
              setIsLoading(false);
            }
          } else {
            setIsLoading(false);
          }
        }, 15000);
      } catch (error) {
        console.error('❌ Error initializing Jitsi Meet API:', {
          error: error,
          message: error.message,
          stack: error.stack,
          roomName: roomName,
          domain: domainToUse
        });
        setLoadError('Failed to initialize meeting. Please refresh and try again.');
        setIsLoading(false);
      }
    };

    // Wait for JitsiMeetExternalAPI to be available
    const checkAPI = setInterval(() => {
      if (typeof window.JitsiMeetExternalAPI !== 'undefined') {
        clearInterval(checkAPI);
        clearTimeout(timeout);
        initializeJitsi();
      }
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(checkAPI);
      if (typeof window.JitsiMeetExternalAPI === 'undefined') {
        console.error('❌ JitsiMeetExternalAPI is not loaded after 15 seconds');
        setLoadError('Jitsi Meet API failed to load. Please refresh the page.');
        setIsLoading(false);
      }
    }, 15000); // Increased timeout to 15 seconds

    return () => {
      clearTimeout(timeout);
      clearInterval(checkAPI);
      if (apiRef.current) {
        try {
          apiRef.current.dispose();
          apiRef.current = null;
        } catch (error) {
          console.error('Error disposing Jitsi API:', error);
        }
      }
    };
  }, [spaceData, state.user]);

  const leaveSpace = async () => {
    // Dispose Jitsi API first
    if (apiRef.current) {
      try {
        apiRef.current.executeCommand('hangup');
        apiRef.current.dispose();
        apiRef.current = null;
      } catch (error) {
        console.error('Error disposing Jitsi API:', error);
      }
    }

    // Leave space via API
    const token = localStorage.getItem('token');
    if (token && spaceData?.id) {
      try {
        await fetch(`http://localhost:5000/api/spaces/${spaceData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            action: 'leave',
            listenerCount: Math.max(0, (spaceData?.listenerCount || 1) - 1)
          })
        });
      } catch (error) {
        console.error('Error leaving space:', error);
      }
    }
    onClose();
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const handleMouseMove = (e) => {
      setPosition({
        x: e.clientX - offsetX,
        y: e.clientY - offsetY
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Check if current user is the host
  const isHost = spaceData?.host?.id === state.user?.id || 
                 spaceData?.hostId === state.user?.id;

  // Search users for invitation
  const searchUsers = async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(
        `http://localhost:5000/api/auth/search-users?q=${encodeURIComponent(query.trim())}&limit=10`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    searchUsers(value);
  };

  // Toggle user selection for invitation
  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u._id === user._id);
      if (isSelected) {
        return prev.filter(u => u._id !== user._id);
      } else {
        return [...prev, user];
      }
    });
  };

  // Invite users (host only)
  const handleInviteUsers = async () => {
    if (selectedUsers.length === 0) {
      showNotification('Please select at least one user to invite', 'error');
      return;
    }

    setIsInviting(true);
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(
        `http://localhost:5000/api/spaces/${spaceData.id}/invite`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            userIds: selectedUsers.map(u => u._id)
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.invitedCount > 0) {
          showNotification(
            `Invitations sent to ${data.invitedCount} user(s)`,
            'success'
          );
          setSelectedUsers([]);
          setSearchQuery('');
          setSearchResults([]);
          setShowInviteModal(false);
        } else {
          // No invitations were sent
          const errorMsg = data.errors && data.errors.length > 0 
            ? `Failed to send invitations: ${data.errors.map(e => e.error).join(', ')}`
            : 'No invitations were sent';
          showNotification(errorMsg, 'error');
        }
      } else {
        const errorData = await response.json();
        console.error('Invitation error:', errorData);
        const errorMsg = errorData.errors && errorData.errors.length > 0
          ? `${errorData.error || 'Failed to send invitations'}: ${errorData.errors.map(e => e.error).join(', ')}`
          : errorData.error || 'Failed to send invitations';
        showNotification(errorMsg, 'error');
      }
    } catch (error) {
      console.error('Error inviting users:', error);
      showNotification('Failed to send invitations. Please try again.', 'error');
    } finally {
      setIsInviting(false);
    }
  };

  // Request to join space (non-host)
  const handleRequestJoin = async () => {
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(
        `http://localhost:5000/api/spaces/${spaceData.id}/request-join`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        showNotification('Join request sent to the host', 'success');
        setShowInviteModal(false);
      } else {
        const errorData = await response.json();
        showNotification(errorData.error || 'Failed to send join request', 'error');
      }
    } catch (error) {
      console.error('Error requesting to join:', error);
      showNotification('Failed to send join request. Please try again.', 'error');
    }
  };

  return (
    <div 
      className="jitsi-meeting-overlay" 
      style={
        isMobile
          ? undefined
          : {
              top: `${position.y}px`,
              left: `${position.x}px`,
              right: 'auto',
            }
      }
    >
      <div className="jitsi-meeting-container">
        {/* Space Header */}
        <div
          className="space-header"
          onMouseDown={isMobile ? undefined : handleMouseDown}
          style={isMobile ? undefined : { cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <div className="space-info">
            <div className="space-title-section">
              <h2 className="space-title">{spaceData?.title || 'Untitled Space'}</h2>
              <div className="space-host">
                {spaceData?.host && (
                  <>
                    <img 
                      src={spaceData.host.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(spaceData.host.name)}`}
                      alt={spaceData.host.name}
                      className="host-avatar"
                    />
                    <span className="host-name">{spaceData.host.name}</span>
                  </>
                )}
                <span className="host-badge">Host</span>
              </div>
            </div>
            <div className="space-stats">
              <span className="live-indicator">🔴 LIVE</span>
              <span className="participant-count">
                {isConnected ? participantCount : (spaceData?.listenerCount || spaceData?.participants?.length || 1)} listening
              </span>
            </div>
          </div>
          <button className="close-space-btn" onClick={leaveSpace} title="Close Space">
            <svg viewBox="0 0 24 24">
              <path d="M18.36 6.64c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0L12 10.18 7.05 5.23c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41L10.18 12l-4.95 4.95c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L12 13.82l4.95 4.95c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L13.82 12l4.95-4.95z"/>
            </svg>
          </button>
        </div>

        {/* Jitsi Meeting Container */}
        <div className="jitsi-container">
          {isLoading && (
            <div className="jitsi-loading">
              <div className="loading-spinner"></div>
              <p>Joining Space...</p>
            </div>
          )}
          {loadError ? (
            <div className="jitsi-error">
              <p>{loadError}</p>
              <div className="error-actions">
                <button 
                  onClick={() => {
                    console.log('🔄 Retrying Jitsi connection...');
                    setLoadError(null);
                    setIsLoading(true);
                    if (apiRef.current) {
                      try {
                        apiRef.current.dispose();
                      } catch (error) {
                        console.error('Error disposing API:', error);
                      }
                      apiRef.current = null;
                    }
                    // Force re-initialization by clearing container
                    if (jitsiContainerRef.current) {
                      jitsiContainerRef.current.innerHTML = '';
                    }
                    // Small delay to ensure cleanup completes
                    setTimeout(() => {
                      // Trigger re-render by updating a state
                      setIsLoading(true);
                    }, 100);
                  }}
                  className="retry-btn"
                >
                  Retry Connection
                </button>
                <button 
                  onClick={() => {
                    console.log('🔄 Reloading page...');
                    window.location.reload();
                  }}
                  className="retry-btn secondary"
                >
                  Reload Page
                </button>
              </div>
              <div className="error-details">
                <p className="error-hint">
                  If the problem persists, check:
                </p>
                <ul>
                  <li>Your internet connection</li>
                  <li>Browser console for detailed error messages</li>
                  <li>That the Space is still live</li>
                </ul>
              </div>
            </div>
          ) : (
            <div 
              ref={jitsiContainerRef} 
              className="jitsi-iframe"
              style={{ width: '100%', height: '100%', minHeight: '400px' }}
            />
          )}
        </div>

        {/* Space Controls */}
        <div className="space-controls">
          <div className="control-buttons">
            <button 
              className="control-btn people-btn" 
              onClick={() => setShowInviteModal(true)} 
              title={isHost ? "Invite users" : "Request to join"}
            >
              <svg viewBox="0 0 24 24">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
              {participantCount > 0 && (
                <span className="participant-badge">{participantCount}</span>
              )}
            </button>
            <button className="control-btn leave-btn" onClick={leaveSpace} title="Leave Space">
              <svg viewBox="0 0 24 24">
                <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Invitation Modal */}
        {showInviteModal && (
          <div className="invite-modal-overlay" onClick={() => setShowInviteModal(false)}>
            <div className="invite-modal" onClick={(e) => e.stopPropagation()}>
              <div className="invite-modal-header">
                <h3>{isHost ? 'Invite Users' : 'Request to Join'}</h3>
                <button className="close-invite-btn" onClick={() => setShowInviteModal(false)}>
                  <svg viewBox="0 0 24 24">
                    <path d="M18.36 6.64c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0L12 10.18 7.05 5.23c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41L10.18 12l-4.95 4.95c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L12 13.82l4.95 4.95c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L13.82 12l4.95-4.95z"/>
                  </svg>
                </button>
              </div>

              {isHost ? (
                <>
                  <div className="invite-search">
                    <input
                      type="text"
                      placeholder="Search users to invite..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      className="invite-search-input"
                    />
                  </div>

                  {selectedUsers.length > 0 && (
                    <div className="selected-users">
                      <div className="selected-users-label">Selected ({selectedUsers.length}):</div>
                      <div className="selected-users-list">
                        {selectedUsers.map(user => (
                          <div key={user._id} className="selected-user-tag">
                            <span>{user.name || user.displayName || 'User'}</span>
                            <button onClick={() => toggleUserSelection(user)}>×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="invite-results">
                    {isSearching && <div className="invite-loading">Searching...</div>}
                    {!isSearching && searchResults.length === 0 && searchQuery.trim().length >= 2 && (
                      <div className="invite-no-results">No users found</div>
                    )}
                    {!isSearching && searchQuery.trim().length < 2 && (
                      <div className="invite-hint">Type at least 2 characters to search</div>
                    )}
                    {!isSearching && searchResults.length > 0 && (
                      <div className="invite-users-list">
                        {searchResults.map(user => {
                          const isSelected = selectedUsers.some(u => u._id === user._id);
                          return (
                            <div
                              key={user._id}
                              className={`invite-user-item ${isSelected ? 'selected' : ''}`}
                              onClick={() => toggleUserSelection(user)}
                            >
                              <img
                                src={user.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}`}
                                alt={user.name || 'User'}
                                className="invite-user-avatar"
                              />
                              <div className="invite-user-info">
                                <div className="invite-user-name">{user.name || user.displayName || 'User'}</div>
                                <div className="invite-user-email">{user.email}</div>
                              </div>
                              {isSelected && (
                                <div className="invite-checkmark">✓</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="invite-modal-actions">
                    <button
                      className="invite-cancel-btn"
                      onClick={() => {
                        setShowInviteModal(false);
                        setSelectedUsers([]);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className="invite-send-btn"
                      onClick={handleInviteUsers}
                      disabled={selectedUsers.length === 0 || isInviting}
                    >
                      {isInviting ? 'Sending...' : `Invite ${selectedUsers.length > 0 ? `(${selectedUsers.length})` : ''}`}
                    </button>
                  </div>
                </>
              ) : (
                <div className="request-join-content">
                  <p>Send a request to the host to join this space?</p>
                  <div className="request-join-actions">
                    <button
                      className="invite-cancel-btn"
                      onClick={() => setShowInviteModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="invite-send-btn"
                      onClick={handleRequestJoin}
                    >
                      Send Request
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JitsiMeeting;
