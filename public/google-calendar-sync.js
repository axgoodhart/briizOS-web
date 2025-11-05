// Google Calendar Sync Module for BriizOS
// Uses Google Sign In for persistent authentication and Calendar API for syncing

class GoogleCalendarSync {
  constructor() {
    this.CLIENT_ID = '719807847926-5rm0pn32uq7fc40f5gguk3ba7gq6o7on.apps.googleusercontent.com';
    this.API_KEY = 'AIzaSyCZv3shl71TyKd3BmKLgSZRFumy9XnjBrQ';
    this.DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
    this.SCOPES = 'https://www.googleapis.com/auth/calendar.events';

    this.tokenClient = null;
    this.accessToken = null;
    this.gapiInited = false;
    this.currentUser = null;

    // Check for stored session
    this.checkStoredSession();
  }

  // Check for previously stored session
  checkStoredSession() {
    const storedUser = localStorage.getItem('gcal_user');
    const authTime = localStorage.getItem('gcal_auth_time');

    if (storedUser && authTime) {
      // Check if auth is less than 30 days old
      const authAge = Date.now() - parseInt(authTime);
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;

      if (authAge < thirtyDays) {
        try {
          this.currentUser = JSON.parse(storedUser);
          console.log('Restored session for:', this.currentUser.email);
        } catch (e) {
          console.error('Failed to restore session:', e);
          this.clearStoredSession();
        }
      } else {
        // Session too old, clear it
        this.clearStoredSession();
      }
    }
  }

  // Clear stored session
  clearStoredSession() {
    localStorage.removeItem('gcal_user');
    localStorage.removeItem('gcal_auth_time');
    this.currentUser = null;
  }

  // Initialize the Google API client library
  async init() {
    try {
      // Load the Google API client library
      await this.loadGoogleAPIs();

      // Initialize GAPI
      await this.initializeGapiClient();

      // Initialize Google Sign In (handles persistent authentication)
      this.initializeGoogleSignIn();

      // Initialize token client for API access
      this.initializeTokenClient();

      // If we have a stored user session, update the UI immediately
      if (this.currentUser) {
        this.updateUIState(true);
        // Don't automatically request token - wait for user to click sync
        // This prevents any popups when the page loads
        console.log('Session restored, sync button ready');
      }

      console.log('Google Calendar Sync initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Calendar Sync:', error);
      this.showSyncStatus('Failed to initialize Google Calendar. Check console for details.', 'error');
      throw error;
    }
  }

  // Load required Google libraries
  loadGoogleAPIs() {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.gapi && window.google) {
        resolve();
        return;
      }

      let gapiLoaded = !!window.gapi;
      let gisLoaded = !!window.google;

      const checkLoaded = () => {
        if (gapiLoaded && gisLoaded) {
          resolve();
        }
      };

      // Load GAPI client library
      if (!window.gapi) {
        const gapiScript = document.createElement('script');
        gapiScript.src = 'https://apis.google.com/js/api.js';
        gapiScript.onload = () => {
          gapiLoaded = true;
          checkLoaded();
        };
        gapiScript.onerror = () => reject(new Error('Failed to load GAPI library'));
        document.body.appendChild(gapiScript);
      } else {
        gapiLoaded = true;
      }

      // Load Google Identity Services library
      if (!window.google) {
        const gisScript = document.createElement('script');
        gisScript.src = 'https://accounts.google.com/gsi/client';
        gisScript.onload = () => {
          gisLoaded = true;
          checkLoaded();
        };
        gisScript.onerror = () => reject(new Error('Failed to load GIS library'));
        document.body.appendChild(gisScript);
      } else {
        gisLoaded = true;
      }

      checkLoaded();
    });
  }

  // Initialize GAPI client
  async initializeGapiClient() {
    return new Promise((resolve, reject) => {
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            apiKey: this.API_KEY,
            discoveryDocs: [this.DISCOVERY_DOC],
          });
          this.gapiInited = true;
          resolve();
        } catch (error) {
          console.error('Error initializing GAPI client:', error);
          reject(error);
        }
      });
    });
  }

  // Initialize Google Sign In (this handles persistent authentication)
  initializeGoogleSignIn() {
    // Initialize Google Sign In
    window.google.accounts.id.initialize({
      client_id: this.CLIENT_ID,
      callback: (response) => this.handleSignInResponse(response),
      auto_select: true, // Automatically sign in if user is already authenticated
      cancel_on_tap_outside: false,
      itp_support: true // Important for Safari/Firefox cross-site cookie support
    });

    // Render the sign-in button
    const authButton = document.getElementById('google-auth-btn');
    if (authButton) {
      // Clear existing content
      authButton.innerHTML = '';

      // Render Google's sign-in button
      window.google.accounts.id.renderButton(
        authButton,
        {
          theme: 'outline',
          size: 'medium',
          text: 'signin_with',
          shape: 'pill',
          logo_alignment: 'left'
        }
      );
    }

    // Only try automatic sign-in if we don't already have a stored session
    // This prevents the popup from appearing when we're already logged in
    if (!this.currentUser) {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed()) {
          const reason = notification.getNotDisplayedReason();
          console.log('Auto sign-in not available:', reason);
        } else if (notification.isDisplayed()) {
          console.log('One Tap prompt displayed');
        } else if (notification.isSkippedMoment()) {
          console.log('One Tap prompt skipped');
        }
      });
    } else {
      console.log('Already have stored session, skipping prompt');
    }
  }

  // Handle sign-in response
  handleSignInResponse(response) {
    if (response.credential) {
      // Decode the JWT to get user info
      const payload = this.parseJwt(response.credential);
      this.currentUser = {
        email: payload.email,
        name: payload.name,
        picture: payload.picture
      };

      // Store user info in localStorage for persistence
      localStorage.setItem('gcal_user', JSON.stringify(this.currentUser));
      localStorage.setItem('gcal_auth_time', Date.now().toString());

      console.log('User signed in:', this.currentUser.email);
      this.showSyncStatus(`Signed in as ${this.currentUser.email}`, 'success');

      // Update UI to show sync button
      this.updateUIState(true);

      // Now we need to get an access token for API calls
      // The sign-in gives us authentication, but we need authorization for Calendar API
      this.requestAccessToken();
    }
  }

  // Parse JWT token
  parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  }

  // Initialize token client for API access
  initializeTokenClient() {
    this.tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: this.CLIENT_ID,
      scope: this.SCOPES,
      callback: (response) => {
        if (response.error) {
          console.error('Token error:', response);
          return;
        }
        this.accessToken = response.access_token;
        console.log('Got access token for Calendar API');
      },
    });
  }

  // Request access token for API calls
  async requestAccessToken() {
    return new Promise((resolve, reject) => {
      if (!this.tokenClient) {
        reject(new Error('Token client not initialized'));
        return;
      }

      // Configure callback
      this.tokenClient.callback = (response) => {
        if (response.error) {
          reject(response.error);
        } else {
          this.accessToken = response.access_token;
          resolve(response.access_token);
        }
      };

      // Request token with minimal prompting
      // Use prompt: '' to only show consent screen if absolutely necessary
      // This won't show a sign-in prompt since we're already authenticated
      this.tokenClient.requestAccessToken({ prompt: '' });
    });
  }

  // Sign out
  signOut() {
    // Revoke the access token
    if (this.accessToken) {
      window.google.accounts.oauth2.revoke(this.accessToken, () => {
        console.log('Access token revoked');
      });
      this.accessToken = null;
    }

    // Sign out from Google
    window.google.accounts.id.disableAutoSelect();

    // Clear stored session
    this.clearStoredSession();

    // Update UI
    this.updateUIState(false);

    // Reload to clear everything
    this.showSyncStatus('Signed out. Refreshing page...', 'info');
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  }

  // Update UI based on authentication state
  updateUIState(isSignedIn) {
    const syncButton = document.getElementById('google-calendar-sync-btn');
    const authContainer = document.getElementById('google-auth-btn');

    if (syncButton) {
      syncButton.style.display = (isSignedIn || this.currentUser) ? 'inline-block' : 'none';
    }

    // If signed in, replace Google button with sign out button
    if ((isSignedIn || this.currentUser) && authContainer) {
      authContainer.innerHTML = `
        <button onclick="window.googleCalendarSync.signOut()"
                style="padding: 8px 16px; background: rgba(0, 255, 204, 0.1);
                       border: 1px solid #00ffcc; color: #00ffcc; border-radius: 20px;
                       font-family: 'Chillax', 'Josefin Sans', sans-serif; cursor: pointer;">
          Sign Out (${this.currentUser?.email || ''})
        </button>
      `;
    }
  }

  // Convert BriizOS event to Google Calendar event format
  convertToGoogleEvent(briizEvent) {
    // Parse the date and time
    let startDateTime, endDateTime;

    if (briizEvent.startTime && briizEvent.endTime) {
      // If we have specific times
      const date = briizEvent.scheduledDate || briizEvent.dateValue || new Date().toISOString().split('T')[0];
      startDateTime = `${date}T${briizEvent.startTime}:00`;
      endDateTime = `${date}T${briizEvent.endTime}:00`;
    } else {
      // Default to all-day event or 1-hour event
      const date = briizEvent.scheduledDate || briizEvent.dateValue || new Date().toISOString().split('T')[0];
      if (briizEvent.allDay) {
        // All-day event
        return {
          summary: briizEvent.name || 'Untitled Event',
          description: briizEvent.content || briizEvent.description || '',
          start: { date: date },
          end: { date: date },
          reminders: {
            useDefault: true
          }
        };
      } else {
        // Default 1-hour event at 9 AM
        startDateTime = `${date}T09:00:00`;
        endDateTime = `${date}T10:00:00`;
      }
    }

    return {
      summary: briizEvent.name || 'Untitled Event',
      description: briizEvent.content || briizEvent.description || '',
      start: {
        dateTime: startDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 10 }
        ]
      }
    };
  }

  // Sync a single event to Google Calendar
  async syncEventToGoogle(briizEvent) {
    if (!this.accessToken) {
      // Try to get access token
      try {
        await this.requestAccessToken();
      } catch (error) {
        throw new Error('Not authenticated with Google Calendar');
      }
    }

    try {
      const googleEvent = this.convertToGoogleEvent(briizEvent);

      // Check if event already has a Google Calendar ID
      if (briizEvent.googleCalendarId) {
        // Update existing event
        const response = await window.gapi.client.calendar.events.update({
          calendarId: 'primary',
          eventId: briizEvent.googleCalendarId,
          resource: googleEvent
        });
        console.log('Updated event in Google Calendar:', response);
        return response.result;
      } else {
        // Create new event
        const response = await window.gapi.client.calendar.events.insert({
          calendarId: 'primary',
          resource: googleEvent
        });
        console.log('Created event in Google Calendar:', response);

        // Store the Google Calendar event ID in the BriizOS event
        briizEvent.googleCalendarId = response.result.id;

        // Save the updated event back to BriizOS storage
        if (window.persistence && window.persistence.saveEvent) {
          await window.persistence.saveEvent(briizEvent);
        }

        return response.result;
      }
    } catch (error) {
      console.error('Error syncing event to Google Calendar:', error);
      throw error;
    }
  }

  // Sync all events to Google Calendar
  async syncAllEvents() {
    if (!this.currentUser) {
      this.showSyncStatus('Please sign in to Google Calendar first', 'error');
      return;
    }

    try {
      // Make sure we have an access token
      if (!this.accessToken) {
        await this.requestAccessToken();
      }

      this.showSyncStatus('Syncing events to Google Calendar...', 'info');

      // Get all events from BriizOS
      let events = [];

      // Get events from the state
      if (window.state && window.state.events) {
        events = events.concat(window.state.events);
      }

      // Get events from the organizer (type: 'event')
      if (window.OrganizerStore && window.OrganizerStore.items) {
        const organizerEvents = window.OrganizerStore.items.filter(item =>
          item.type === 'event' && !item.completedAt
        );
        events = events.concat(organizerEvents);
      }

      // Filter out duplicates and invalid events
      const uniqueEvents = events.filter((event, index, self) =>
        event && event.name &&
        index === self.findIndex(e => e && e.id === event.id)
      );

      if (uniqueEvents.length === 0) {
        this.showSyncStatus('No events to sync', 'warning');
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      // Sync each event
      for (const event of uniqueEvents) {
        try {
          await this.syncEventToGoogle(event);
          successCount++;
        } catch (error) {
          console.error(`Failed to sync event "${event.name}":`, error);
          errorCount++;
        }
      }

      // Show results
      if (errorCount === 0) {
        this.showSyncStatus(`Successfully synced ${successCount} event(s) to Google Calendar`, 'success');
      } else {
        this.showSyncStatus(`Synced ${successCount} event(s), ${errorCount} failed`, 'warning');
      }

    } catch (error) {
      console.error('Error during sync:', error);
      this.showSyncStatus('Failed to sync events', 'error');
    }
  }

  // Show sync status message
  showSyncStatus(message, type = 'info') {
    // Create or update status element
    let statusEl = document.getElementById('google-sync-status');
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.id = 'google-sync-status';
      statusEl.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: 'Chillax', 'Josefin Sans', sans-serif;
        font-size: 14px;
        z-index: 100000;
        transition: all 0.3s ease;
        opacity: 0;
      `;
      document.body.appendChild(statusEl);
    }

    // Set colors based on type
    const colors = {
      info: 'rgba(0, 255, 204, 0.2)',
      success: 'rgba(0, 255, 0, 0.2)',
      warning: 'rgba(255, 255, 0, 0.2)',
      error: 'rgba(255, 0, 0, 0.2)'
    };

    const borderColors = {
      info: '#00ffcc',
      success: '#00ff00',
      warning: '#ffff00',
      error: '#ff0000'
    };

    statusEl.style.background = colors[type] || colors.info;
    statusEl.style.border = `1px solid ${borderColors[type] || borderColors.info}`;
    statusEl.style.color = '#ffffff';
    statusEl.textContent = message;
    statusEl.style.opacity = '1';

    // Auto-hide after 5 seconds
    setTimeout(() => {
      statusEl.style.opacity = '0';
    }, 5000);
  }

  // Create UI controls for Google Calendar sync
  createUIControls() {
    // Check if controls already exist
    if (document.getElementById('google-calendar-controls')) {
      return;
    }

    // Create container for Google Calendar controls
    const controlsContainer = document.createElement('div');
    controlsContainer.id = 'google-calendar-controls';
    controlsContainer.style.cssText = `
      position: fixed;
      top: 0px;
      right: 0px;
      z-index: 10000;
      display: flex;
      flex-direction: row;
      gap: 10px;
    `;

    // Container for Google Sign-In button
    const authContainer = document.createElement('div');
    authContainer.id = 'google-auth-btn';
    controlsContainer.appendChild(authContainer);

    // Create sync button (hidden by default)
    const syncButton = document.createElement('button');
    syncButton.id = 'google-calendar-sync-btn';
    syncButton.textContent = 'Sync to Google Calendar';
    syncButton.style.cssText = `
      padding: 8px 16px;
      background: rgba(0, 255, 204, 0.1);
      border: 1px solid #00ffcc;
      color: #00ffcc;
      border-radius: 20px;
      font-family: 'Chillax', 'Josefin Sans', sans-serif;
      cursor: pointer;
      transition: all 0.3s ease;
      display: none;
    `;
    syncButton.addEventListener('click', () => this.syncAllEvents());
    syncButton.addEventListener('mouseenter', () => {
      syncButton.style.background = 'rgba(0, 255, 204, 0.2)';
    });
    syncButton.addEventListener('mouseleave', () => {
      syncButton.style.background = 'rgba(0, 255, 204, 0.1)';
    });
const settingsmodal = document.getElementById('settingsmodal');
    controlsContainer.appendChild(syncButton);
    settingsmodal.appendChild(controlsContainer);
  }
}

// Initialize Google Calendar Sync when the page loads
const googleCalendarSync = new GoogleCalendarSync();

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async () => {
    googleCalendarSync.createUIControls();
    try {
      await googleCalendarSync.init();
    } catch (error) {
      console.error('Failed to initialize Google Calendar Sync:', error);
    }
  });
} else {
  // DOM is already ready
  googleCalendarSync.createUIControls();
  googleCalendarSync.init().catch(error => {
    console.error('Failed to initialize Google Calendar Sync:', error);
  });
}

// Export for global access
window.googleCalendarSync = googleCalendarSync;