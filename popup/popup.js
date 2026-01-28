// SofaScout - Main Popup Script

class SofaScoutApp {
  constructor() {
    this.state = {
      activeTab: 'dashboard',
      players: [],
      matches: [],
      notifications: [],
      settings: {}
    };
    this.init();
  }

  async init() {
    await this.loadSettings();
    await this.syncData();
    this.renderTabs();
    this.bindEvents();
  }

  async loadSettings() {
    const stored = await chrome.storage.local.get(['settings']);
    if (stored.settings) {
      this.state.settings = stored.settings;
    } else {
      this.loadDefaults();
    }
  }

  loadDefaults() {
    this.state.settings = {
      lineupNotification: true,
      matchStartNotification: true,
      goalNotification: true,
      ratingNotification: false,
      startingNotification: true
    };
  }

  async syncData() {
    // Show loading state if needed
    try {
      const response = await chrome.runtime.sendMessage({ action: 'syncFavorites' });

      if (response.error === 'auth_required') {
        this.state.authRequired = true;
        this.state.players = [];
      } else if (response.success && response.data) {
        this.state.authRequired = false;
        // Process favorites - filtering for players
        // Note: Actual API structure needs to be inspected. 
        // Assuming response.data.favorites contains mixed entities
        this.state.players = (response.data.favoriteSportsPersons || response.data.favorites || [])
          .filter(f => f.type === 'player' || f.entity?.type === 'player')
          .map(f => {
            const p = f.entity || f;
            return {
              id: p.id,
              name: p.name,
              team: p.team?.name || 'Unknown',
              rating: p.rating || '-' // Rating might need separate fetch
            };
          });

        await chrome.storage.local.set({ players: this.state.players });
      }
    } catch (e) {
      console.error('Sync failed', e);
      // Fallback to local cache
      const local = await chrome.storage.local.get(['players']);
      this.state.players = local.players || [];
    }
  }

  bindEvents() {
    // Tab navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.switchTab(e.target.dataset.tab || e.target.closest('.nav-tab').dataset.tab);
      });
    });

    // Settings button
    document.getElementById('settingsBtn')?.addEventListener('click', () => {
      this.switchTab('notifications');
    });

    // Focus Mode toggle
    const focusModeBtn = document.getElementById('focusModeBtn');
    if (focusModeBtn) {
      // Load initial state (backwards compatible)
      chrome.storage.local.get(['focusModeEnabled', 'scoutModeEnabled'], (result) => {
        if (result.focusModeEnabled || result.scoutModeEnabled) {
          focusModeBtn.classList.add('active');
        }
      });

      // Toggle on click
      focusModeBtn.addEventListener('click', async () => {
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab && tab.url?.includes('sofascore.com')) {
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'toggleFocusMode' });
            focusModeBtn.classList.toggle('active', response?.enabled);
          } else {
            // Not on SofaScore, toggle storage directly
            const result = await chrome.storage.local.get(['focusModeEnabled', 'scoutModeEnabled']);
            const newState = !(result.focusModeEnabled || result.scoutModeEnabled);
            await chrome.storage.local.set({ focusModeEnabled: newState, scoutModeEnabled: newState });
            focusModeBtn.classList.toggle('active', newState);
            this.showToast(newState ? 'Focus Mode active - go to SofaScore' : 'Focus Mode disabled');
          }
        } catch (e) {
          console.error('Focus mode toggle error:', e);
        }
      });
    }

    // Listen for Focus Mode changes from content script
    chrome.runtime.onMessage.addListener((request) => {
      if (request.action === 'focusModeChanged' || request.action === 'scoutModeChanged') {
        const btn = document.getElementById('focusModeBtn');
        if (btn) {
          btn.classList.toggle('active', request.enabled);
        }
      }
    });
  }

  showToast(message) {
    // Remove existing toast
    document.querySelector('.popup-toast')?.remove();

    const toast = document.createElement('div');
    toast.className = 'popup-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 60px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--bg-card);
      color: var(--text-primary);
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 12px;
      border: 1px solid var(--accent-primary);
      z-index: 1000;
      animation: fadeIn 0.2s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 2500);
  }

  switchTab(tabId) {
    this.state.activeTab = tabId;

    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');
    document.getElementById(tabId)?.classList.add('active');

    this.renderTabContent(tabId);
  }

  renderTabs() {
    this.renderDashboard();
    this.renderPlayers();
    this.renderMatches();
    this.renderNotifications();
  }

  renderTabContent(tabId) {
    switch (tabId) {
      case 'dashboard': this.renderDashboard(); break;
      case 'players': this.renderPlayers(); break;
      case 'matches': this.renderMatches(); break;
      case 'notifications': this.renderNotifications(); break;
    }
  }

  renderDashboard() {
    const dashboard = document.getElementById('dashboard');
    if (!dashboard) return;

    if (this.state.authRequired) {
      dashboard.innerHTML = `
            <div class="auth-warning" style="text-align: center; padding: 20px; color: var(--text-secondary);">
                <p>Verileri görebilmek için SofaScore'a giriş yapmalısın.</p>
                <a href="https://www.sofascore.com/user/login" target="_blank" style="color: var(--accent-primary); text-decoration: none; font-weight: 600; margin-top: 10px; display: inline-block;">Giriş Yap</a>
            </div>
        `;
      return;
    }

    const icons = {
      player: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      match: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>',
      alert: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
      lineup: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11H3M9 17H3M9 5H3M17 11H21M17 17H21M17 5H21M12 2v20"/></svg>',
      goal: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>',
      stat: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>'
    };

    dashboard.innerHTML = `
      <div class="section-header">
        <h2>Hızlı Bakış</h2>
        <span class="live-indicator"><span class="pulse"></span> Canlı</span>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon players">${icons.player}</div>
          <span class="stat-value">${this.state.players.length}</span>
          <span class="stat-label">Takip</span>
        </div>
        <div class="stat-card">
          <div class="stat-icon matches">${icons.match}</div>
          <span class="stat-value">0</span>
          <span class="stat-label">Maç</span>
        </div>
        <div class="stat-card">
          <div class="stat-icon alerts">${icons.alert}</div>
          <span class="stat-value">0</span>
          <span class="stat-label">Uyarı</span>
        </div>
      </div>
    `;
    // Activity section can be populated dynamically later
  }

  renderPlayers() {
    const container = document.getElementById('players');
    if (!container) return;

    if (this.state.authRequired) {
      container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">Lütfen giriş yapın.</div>';
      return;
    }

    const searchIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    const playerFallback = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect fill="%23171C1F" width="40" height="40"/><g fill="none" stroke="%236B7280" stroke-width="1.5" transform="translate(10,8)"><circle cx="10" cy="6" r="5"/><path d="M0 22v-2a8 8 0 0 1 8-8h4a8 8 0 0 1 8 8v2"/></g></svg>';

    const playersHTML = this.state.players.length > 0 ? this.state.players.map(p => `
      <div class="player-card" data-id="${p.id}">
        <div class="player-avatar">
          <img src="https://api.sofascore.app/api/v1/player/${p.id}/image" alt="${p.name}" 
               onerror="this.src='data:image/svg+xml,${encodeURIComponent(playerFallback)}'">
        </div>
        <div class="player-info">
          <span class="player-name">${p.name}</span>
          <span class="player-team">${p.team}</span>
        </div>
        <div class="player-rating">${p.rating}</div>
      </div>
    `).join('') : '<div style="padding: 20px; text-align: center; color: var(--text-muted);">Takip edilen oyuncu yok.</div>';

    container.innerHTML = `
      <div class="section-header">
        <h2>Takip Edilen Oyuncular</h2>
        <button class="add-btn" id="addPlayerBtn">+</button>
      </div>
      <div class="search-box">
        <span class="search-icon">${searchIcon}</span>
        <input type="text" placeholder="Oyuncu ara..." id="playerSearch">
      </div>
      <div class="players-list" id="playersList">${playersHTML}</div>
    `;

    this.bindPlayerEvents();
  }

  bindPlayerEvents() {
    const searchInput = document.getElementById('playerSearch');
    const playersList = document.getElementById('playersList');

    // Debounce search
    let timeout;
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(timeout);
      const query = e.target.value;

      timeout = setTimeout(async () => {
        if (query.length < 3) {
          this.renderPlayers(); // Reset to favorites if search is cleared
          return;
        }

        // Search via API
        const results = await chrome.runtime.sendMessage({ action: 'searchPlayer', query });
        // Render search results
        const playerFallback = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect fill="%23171C1F" width="40" height="40"/><g fill="none" stroke="%236B7280" stroke-width="1.5" transform="translate(10,8)"><circle cx="10" cy="6" r="5"/><path d="M0 22v-2a8 8 0 0 1 8-8h4a8 8 0 0 1 8 8v2"/></g></svg>';

        if (results && results.length > 0) {
          // Store search results in state for later access
          this.state.searchResults = results.map(p => ({
            id: p.id,
            name: p.name,
            team: p.team?.name || 'Unknown',
            rating: '-'
          }));

          playersList.innerHTML = results.map(p => `
                  <div class="player-card" data-id="${p.id}" data-name="${p.name}" data-team="${p.team?.name || 'Unknown'}">
                    <div class="player-avatar">
                      <img src="https://api.sofascore.app/api/v1/player/${p.id}/image" alt="${p.name}" 
                           onerror="this.src='data:image/svg+xml,${encodeURIComponent(playerFallback)}'">
                    </div>
                    <div class="player-info">
                      <span class="player-name">${p.name}</span>
                      <span class="player-team">${p.team?.name || 'Unknown'}</span>
                    </div>
                  </div>
                `).join('');
        } else {
          playersList.innerHTML = '<div style="padding: 10px; text-align: center; color: var(--text-muted);">Sonuç bulunamadı</div>';
        }
      }, 500);
    });

    // Use Event Delegation for Player Clicks (Handles both initial and dynamic items)
    playersList?.addEventListener('click', (e) => {
      const card = e.target.closest('.player-card');
      if (card) {
        const id = card.dataset.id;
        const name = card.dataset.name || card.querySelector('.player-name')?.textContent;
        const team = card.dataset.team || card.querySelector('.player-team')?.textContent;
        this.showPlayerDetails(id, name, team);
      }
    });
  }

  filterPlayers(query) {
    // Local filter deprecated in favor of API search
  }

  async showPlayerDetails(playerId, playerName, playerTeam) {
    const detailView = document.getElementById('playerDetail');
    const content = document.getElementById('detailContent');

    // Try to find player from favorites or search results, or use passed parameters
    let player = this.state.players.find(p => p.id == playerId);
    if (!player && this.state.searchResults) {
      player = this.state.searchResults.find(p => p.id == playerId);
    }
    if (!player && playerName) {
      player = { id: playerId, name: playerName, team: playerTeam || 'Unknown', rating: '-' };
    }

    if (!detailView || !content || !player) return;

    // Show view
    detailView.style.display = 'flex';
    content.innerHTML = '<div style="padding:20px; text-align:center;">Analiz ediliyor...</div>';

    // Fetch Data (Stats + Heatmap)
    try {
      // Mock match ID logic - ideally select a specific recent match
      // For now, we will try to fetch stats for the last match or season stats directly
      // Currently service worker supports getPlayerStats (season) and getHeatmap (needs matchID)
      // Let's first show Basic Info + Season Stats

      const stats = await chrome.runtime.sendMessage({ action: 'getPlayerStats', playerId });

      // Render Layout
      content.innerHTML = `
            <div class="player-header-card" style="display: flex; gap: 12px; align-items: center; margin-bottom: 20px;">
                <img src="https://api.sofascore.app/api/v1/player/${player.id}/image" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; background: #333;">
                <div>
                    <h2 style="font-size: 18px; margin-bottom: 4px;">${player.name}</h2>
                    <span style="color: var(--text-secondary); font-size: 13px;">${player.team}</span>
                    <div style="margin-top: 6px;">
                        <span class="player-rating">${player.rating || '-'}</span>
                    </div>
                </div>
            </div>
            
            <div class="stats-grid">
                 <div class="stat-card">
                    <span class="stat-value">${stats?.statistics?.goals || 0}</span>
                    <span class="stat-label">Gol</span>
                 </div>
                 <div class="stat-card">
                    <span class="stat-value">${stats?.statistics?.assists || 0}</span>
                    <span class="stat-label">Asist</span>
                 </div>
                 <div class="stat-card">
                    <span class="stat-value">${stats?.statistics?.minutesPlayed || 0}'</span>
                    <span class="stat-label">Süre</span>
                 </div>
            </div>

            <div class="heatmap-container">
                <div class="tournament-selector">
                    <span class="tournament-selector-label">Isı Haritası</span>
                    <select id="tournamentSelect" class="tournament-select">
                        <option value="">Yükleniyor...</option>
                    </select>
                </div>
                <div id="heatmapLoading" class="skeleton skeleton-heatmap"></div>
                <canvas id="playerHeatmap" class="heatmap-canvas" style="display:none;"></canvas>
            </div>

            <!-- Scout Notes Section -->
            <div class="scout-notes-section" style="margin-top: 20px;">
                <div class="section-header" style="justify-content: space-between;">
                    <h3 style="font-size: 14px; margin: 0;">Scout Notları</h3>
                    <button id="downloadHeatmapBtn" class="action-btn" style="font-size: 11px; padding: 4px 8px; border-radius: 4px; border: 1px solid var(--accent-primary); background: var(--bg-card); color: var(--accent-primary); cursor: pointer;">
                        📷 Heatmap İndir
                    </button>
                </div>
                <textarea id="scoutNoteInput" placeholder="Oyuncu hakkında notlar al... (Otomatik kaydedilir)" 
                    style="width: 100%; height: 100px; background: var(--bg-card); border: 1px solid var(--border-color); 
                           border-radius: 12px 12px 12px 0; color: var(--text-primary); padding: 12px; 
                           font-family: inherit; resize: vertical; margin-top: 8px;"></textarea>
                <div id="saveStatus" style="font-size: 10px; color: var(--text-muted); text-align: right; margin-top: 4px; height: 14px;"></div>
            </div>
        `;

      // Store player reference for heatmap methods
      this.currentPlayer = player;

      // Load saved note
      const noteKey = `note_${player.id}`;
      chrome.storage.local.get([noteKey], (result) => {
        const noteInput = document.getElementById('scoutNoteInput');
        if (noteInput && result[noteKey]) {
          noteInput.value = result[noteKey];
        }
      });

      // Go Back Listener
      document.getElementById('backToPlayers').onclick = () => {
        detailView.style.display = 'none';
      };

      // Auto-save Note Listener
      const noteInput = document.getElementById('scoutNoteInput');
      const statusDiv = document.getElementById('saveStatus');
      let saveTimeout;

      noteInput.addEventListener('input', () => {
        statusDiv.textContent = 'Yazılıyor...';
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          const note = noteInput.value;
          chrome.storage.local.set({ [noteKey]: note }, () => {
            statusDiv.textContent = 'Kaydedildi ✓';
            setTimeout(() => { statusDiv.textContent = ''; }, 2000);
          });
        }, 1000);
      });

      // Download Heatmap as PNG Listener
      document.getElementById('downloadHeatmapBtn').addEventListener('click', () => {
        this.downloadHeatmapAsPNG(player);
      });

      // Load tournaments for dropdown
      const tournamentsData = await chrome.runtime.sendMessage({ action: 'getPlayerTournaments', playerId: player.id });
      const select = document.getElementById('tournamentSelect');

      if (tournamentsData.tournaments && tournamentsData.tournaments.length > 0) {
        // Clear loading text
        select.innerHTML = '';

        tournamentsData.tournaments.forEach((t, index) => {
          const option = document.createElement('option');
          option.value = JSON.stringify({ id: t.id, seasonId: t.seasonId });
          option.textContent = t.name;
          if (index === 0) option.selected = true; // İlk turnuva varsayılan
          select.appendChild(option);
        });

        // Tournament change listener
        select.addEventListener('change', async () => {
          await this.loadTournamentHeatmap(player.id, select.value);
        });

        // Load first tournament's heatmap
        await this.loadTournamentHeatmap(player.id, select.value);
      } else {
        select.innerHTML = '<option value="">Turnuva bulunamadı</option>';
        document.getElementById('heatmapLoading').style.display = 'none';
      }

    } catch (e) {
      content.innerHTML = `<div style="color:red">Veri alınamadı: ${e.message}</div>`;
    }
  }

  async loadTournamentHeatmap(playerId, value) {
    const loadingEl = document.getElementById('heatmapLoading');
    const canvasEl = document.getElementById('playerHeatmap');

    // Show loading
    loadingEl.style.display = 'block';
    canvasEl.style.display = 'none';

    let heatmapData;

    // Fetch specific tournament heatmap
    const { id, seasonId } = JSON.parse(value);
    heatmapData = await chrome.runtime.sendMessage({
      action: 'getTournamentHeatmap',
      playerId,
      tournamentId: id,
      seasonId
    });

    // Hide loading, show canvas
    loadingEl.style.display = 'none';
    canvasEl.style.display = 'block';

    if (heatmapData.success) {
      if (heatmapData.type === 'svg' && heatmapData.svg) {
        // Render SVG heatmap directly
        this.renderSvgHeatmap('playerHeatmap', heatmapData.svg);
      } else if (heatmapData.heatmap && heatmapData.heatmap.length > 0) {
        // Render point-based heatmap
        this.renderHeatmap('playerHeatmap', heatmapData.heatmap);
      } else {
        this.renderHeatmap('playerHeatmap', null);
      }
    } else {
      this.renderHeatmap('playerHeatmap', null);
    }
  }

  renderSvgHeatmap(canvasId, svgContent) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const containerWidth = canvas.offsetWidth;
    canvas.width = containerWidth;
    canvas.height = Math.round(containerWidth * (149 / 238));

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Draw pitch background first
    ctx.fillStyle = '#446C46';
    ctx.fillRect(0, 0, width, height);

    // Load and draw SVG
    const img = new Image();
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
    };

    img.onerror = () => {
      console.log('SVG load failed, falling back to empty pitch');
      URL.revokeObjectURL(url);
    };

    img.src = url;
  }

  downloadHeatmapAsPNG(player) {
    const canvas = document.getElementById('playerHeatmap');
    if (!canvas) return;

    // Create a higher quality version for download
    const downloadCanvas = document.createElement('canvas');
    const scale = 2; // 2x resolution for HD quality
    downloadCanvas.width = canvas.width * scale;
    downloadCanvas.height = canvas.height * scale;

    const ctx = downloadCanvas.getContext('2d');
    ctx.scale(scale, scale);

    // Draw pitch background (same as renderHeatmap)
    ctx.fillStyle = '#1a472a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Copy original heatmap
    ctx.drawImage(canvas, 0, 0);

    // Add player name watermark
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 14px Poppins, sans-serif';
    ctx.fillText(`${player.name} - Isı Haritası`, 10, canvas.height - 10);

    // Convert to PNG and download
    const dataUrl = downloadCanvas.toDataURL('image/png', 1.0);
    const link = document.createElement('a');
    link.download = `${player.name}_heatmap.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  renderHeatmap(canvasId, heatmapData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Set canvas size (SofaScore pitch ratio 238:149)
    const containerWidth = canvas.offsetWidth;
    canvas.width = containerWidth;
    canvas.height = Math.round(containerWidth * (149 / 238));

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Draw pitch background
    ctx.fillStyle = '#446C46';
    ctx.fillRect(0, 0, width, height);

    // SofaScore SVG pitch (embedded as data URL)
    const pitchSVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 238 149">
      <g fill="rgba(0,0,0,0.4)" fill-rule="evenodd">
        <ellipse cx="28.175" cy="74.5" rx="1.75" ry="1.753"/>
        <ellipse cx="209.825" cy="74.5" rx="1.75" ry="1.753"/>
        <path d="M0 0v149h238V0H0zm119.656 76.121a1.72 1.72 0 0 0 1.094-1.621 1.72 1.72 0 0 0-1.094-1.621V57.628c8.969.35 16.188 7.757 16.188 16.872 0 9.071-7.219 16.521-16.188 16.872v-15.25zM1.312 1.315h3.632a4.577 4.577 0 0 1-3.631 3.637V1.315zm0 54.56h12.032v37.25H1.313v-37.25zm0 38.565h13.344V54.56H1.312V32.65h40.032v83.659H1.312V94.44zm0 53.245v-3.637a4.577 4.577 0 0 1 3.632 3.637H1.313zM118.344 72.88a1.72 1.72 0 0 0-1.094 1.621 1.72 1.72 0 0 0 1.094 1.621v15.251c-8.969-.35-16.188-7.757-16.188-16.872 0-9.071 7.219-16.521 16.188-16.872v15.25zm0-16.566c-9.713.35-17.5 8.37-17.5 18.187 0 9.816 7.787 17.836 17.5 18.187v54.998H6.256c-.394-2.541-2.406-4.601-4.944-4.952v-25.067h41.344V86.157c4.244-2.542 6.825-6.968 6.825-11.657 0-4.69-2.581-9.115-6.825-11.657v-31.51H1.313V6.268c2.537-.35 4.593-2.41 4.943-4.952h112.088v54.998zM42.656 84.58V64.421c3.456 2.366 5.513 6.091 5.513 10.079 0 3.988-2.1 7.713-5.513 10.08zm194.031 63.106h-3.63a4.577 4.577 0 0 1 3.63-3.637v3.637zm0-54.56h-12.03v-37.25h12.03v37.25zm0-38.565h-13.343v39.88h13.344v21.911h-40.032V32.65h40.031V54.56zm0-23.226h-41.343v31.509c-4.244 2.542-6.825 6.968-6.825 11.657 0 4.69 2.581 9.115 6.825 11.657v31.51h41.344v25.066c-2.538.395-4.594 2.41-4.944 4.952H119.656V92.687c9.713-.35 17.5-8.37 17.5-18.187 0-9.816-7.787-17.836-17.5-18.187V1.315h112.088c.393 2.541 2.406 4.601 4.944 4.952v25.067zM195.344 64.42v20.158c-3.457-2.366-5.513-6.091-5.513-10.079 0-3.988 2.056-7.713 5.513-10.08zm41.344-59.469a4.577 4.577 0 0 1-3.632-3.637h3.631v3.637z"/>
      </g>
    </svg>`;

    const img = new Image();
    const svgBlob = new Blob([pitchSVG], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      // Draw SVG pitch lines
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      // Draw heatmap on top
      this.drawHeatmapPoints(ctx, width, height, heatmapData);
    };

    img.onerror = () => {
      // Fallback: draw simple pitch and heatmap
      this.drawSimplePitch(ctx, width, height);
      this.drawHeatmapPoints(ctx, width, height, heatmapData);
    };

    img.src = url;
  }

  drawSimplePitch(ctx, width, height) {
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(5, 5, width - 10, height - 10);
    ctx.beginPath();
    ctx.moveTo(width / 2, 5);
    ctx.lineTo(width / 2, height - 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, height * 0.15, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawHeatmapPoints(ctx, width, height, heatmapData) {
    if (!heatmapData || !Array.isArray(heatmapData) || heatmapData.length === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '12px Poppins, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Veri yok', width / 2, height / 2);
      return;
    }

    // Find max count for normalization
    const maxCount = Math.max(...heatmapData.map(p => p.count || 1));

    // Sort by count (low to high) to build up layers
    const sortedData = [...heatmapData].sort((a, b) => (a.count || 1) - (b.count || 1));

    // Reduced blur to keeps shapes but soften edges
    ctx.filter = 'blur(4px)';
    ctx.globalCompositeOperation = 'source-over';

    sortedData.forEach(point => {
      const x = (point.x / 100) * width;
      const y = height - (point.y / 100) * height;
      const count = point.count || 1;

      const intensity = Math.min(count / Math.max(maxCount, 2), 1);

      ctx.beginPath();
      // Reduced radius so low-intensity points don't spread too much
      // High intensity points get significantly larger to create the "hot" centers
      const radius = 12 + (intensity * 12);

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

      // SofaScore Colors: Vibrant Yellow (#FFD700) -> Red (#FF0000)
      if (intensity < 0.35) {
        // Low intensity (Yellow/Gold) - Reduced spread via tighter gradient
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0.45)');
        gradient.addColorStop(0.7, 'rgba(255, 215, 0, 0.1)'); // Fades out earlier
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
      } else if (intensity < 0.65) {
        // Medium intensity (Orange)
        gradient.addColorStop(0, 'rgba(255, 140, 0, 0.65)');
        gradient.addColorStop(1, 'rgba(255, 140, 0, 0)');
      } else {
        // High intensity (Red)
        gradient.addColorStop(0, 'rgba(255, 40, 0, 0.75)');
        gradient.addColorStop(1, 'rgba(255, 40, 0, 0)');
      }

      ctx.fillStyle = gradient;
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Reset filter and blend mode
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
  }

  renderMatches() {
    const container = document.getElementById('matches');
    if (!container) return;

    container.innerHTML = `
      <div class="section-header">
        <h2>Takip Edilen Maçlar</h2>
        <button class="add-btn" id="addMatchBtn">+</button>
      </div>
      <div class="matches-list">
        <div class="match-card live">
          <div class="match-status">
            <span class="live-badge">CANLI</span>
            <span class="match-minute">67'</span>
          </div>
          <div class="match-teams">
            <div class="team home">
              <img src="https://api.sofascore.app/api/v1/team/2672/image" alt="FB">
              <span>Fenerbahçe</span>
            </div>
            <div class="match-score">2 - 1</div>
            <div class="team away">
              <span>Galatasaray</span>
              <img src="https://api.sofascore.app/api/v1/team/3061/image" alt="GS">
            </div>
          </div>
        </div>
        <div class="match-card upcoming">
          <div class="match-status">
            <span class="upcoming-badge">YAKLAŞAN</span>
            <span class="match-time">21:00</span>
          </div>
          <div class="match-teams">
            <div class="team home">
              <img src="https://api.sofascore.app/api/v1/team/2829/image" alt="RM">
              <span>Real Madrid</span>
            </div>
            <div class="match-vs">vs</div>
            <div class="team away">
              <span>Barcelona</span>
              <img src="https://api.sofascore.app/api/v1/team/2817/image" alt="FCB">
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderNotifications() {
    const container = document.getElementById('notifications');
    if (!container) return;

    const settings = this.state.settings;

    container.innerHTML = `
      <div class="section-header">
        <h2>Bildirim Ayarları</h2>
      </div>
      <div class="notification-settings">
        <div class="setting-group">
          <h3>Genel Bildirimler</h3>
          ${this.createSettingItem('lineupNotification', 'Kadro Açıklamaları', 'Maç kadroları açıklandığında bildir', settings.lineupNotification)}
          ${this.createSettingItem('matchStartNotification', 'Maç Başlangıcı', '15 dk önce hatırlat', settings.matchStartNotification)}
          ${this.createSettingItem('goalNotification', 'Gol Bildirimleri', 'Takip edilen oyuncu gol atınca', settings.goalNotification)}
        </div>
        <div class="setting-group">
          <h3>Oyuncu Bildirimleri</h3>
          ${this.createSettingItem('ratingNotification', 'Rating Güncellemesi', 'Maç sonu değerlendirmesi', settings.ratingNotification)}
          ${this.createSettingItem('startingNotification', 'İlk 11 Bildirimi', 'Oyuncu ilk 11\'de yer alınca', settings.startingNotification)}
        </div>
      </div>
    `;

    this.bindSettingsEvents();
  }

  createSettingItem(id, title, desc, checked) {
    return `
      <div class="setting-item">
        <div class="setting-info">
          <span class="setting-title">${title}</span>
          <span class="setting-desc">${desc}</span>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" ${checked ? 'checked' : ''} data-setting="${id}">
          <span class="toggle-slider"></span>
        </label>
      </div>
    `;
  }

  bindSettingsEvents() {
    document.querySelectorAll('[data-setting]').forEach(input => {
      input.addEventListener('change', (e) => {
        const key = e.target.dataset.setting;
        this.state.settings[key] = e.target.checked;
        this.saveState();
      });
    });
  }

  async saveState() {
    try {
      await chrome.storage.local.set({
        players: this.state.players,
        matches: this.state.matches,
        settings: this.state.settings
      });
    } catch (e) {
      console.log('Could not save to storage');
    }
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  window.scoutApp = new SofaScoutApp();
});
