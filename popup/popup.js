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
        // (Simplified rendering logic for search results)
        const playerFallback = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect fill="%23171C1F" width="40" height="40"/><g fill="none" stroke="%236B7280" stroke-width="1.5" transform="translate(10,8)"><circle cx="10" cy="6" r="5"/><path d="M0 22v-2a8 8 0 0 1 8-8h4a8 8 0 0 1 8 8v2"/></g></svg>';

        if (results && results.length > 0) {
          playersList.innerHTML = results.map(p => `
                  <div class="player-card" data-id="${p.id}">
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

    document.querySelectorAll('.player-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        this.showPlayerDetails(id);
      });
    });
  }

  filterPlayers(query) {
    // Local filter deprecated in favor of API search for simplicity in this step, 
    // but can be re-added for filtering favorites.
  }

  async showPlayerDetails(playerId) {
    const detailView = document.getElementById('playerDetail');
    const content = document.getElementById('detailContent');
    const player = this.state.players.find(p => p.id == playerId);

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
                <span class="heatmap-label">Sezonluk Isı Haritası (Simüle Edilmiş)</span>
                <canvas id="playerHeatmap" class="heatmap-canvas"></canvas>
            </div>

            <!-- Scout Notes Section -->
            <div class="scout-notes-section" style="margin-top: 20px;">
                <div class="section-header" style="justify-content: space-between;">
                    <h3 style="font-size: 14px; margin: 0;">Scout Notları</h3>
                    <button id="exportBtn" class="action-btn" style="font-size: 11px; padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); cursor: pointer;">
                        📥 Excel'e Aktar
                    </button>
                </div>
                <textarea id="scoutNoteInput" placeholder="Oyuncu hakkında notlar al... (Otomatik kaydedilir)" 
                    style="width: 100%; height: 100px; background: var(--bg-card); border: 1px solid var(--border-color); 
                           border-radius: 12px 12px 12px 0; color: var(--text-primary); padding: 12px; 
                           font-family: inherit; resize: vertical; margin-top: 8px;"></textarea>
                <div id="saveStatus" style="font-size: 10px; color: var(--text-muted); text-align: right; margin-top: 4px; height: 14px;"></div>
            </div>
        `;

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

      // Export to Excel Listener
      document.getElementById('exportBtn').addEventListener('click', () => {
        this.exportToExcel(player);
      });

      // Draw Heatmap
      this.renderHeatmap('playerHeatmap');

    } catch (e) {
      content.innerHTML = `<div style="color:red">Veri alınamadı: ${e.message}</div>`;
    }
  }

  exportToExcel(player) {
    const note = document.getElementById('scoutNoteInput').value || '';
    // Create CSV content with BOM for Excel UTF-8 support
    const bom = "\uFEFF";
    const csvContent = `${bom}Oyuncu Adı;Takım;Rating;Gol;Asist;Notlar\n` +
      `${player.name};${player.team};${player.rating};-;-;"${note.replace(/"/g, '""')}"`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${player.name}_scout_raporu.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  renderHeatmap(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Resize canvas to match display size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Generate dummy heatmap data for demo if no real match ID is available yet
    // In real implementation, we pass the API response here
    const points = [];
    for (let i = 0; i < 100; i++) {
      points.push({
        x: Math.random() * width,
        y: Math.random() * height,
        value: Math.random()
      });
    }

    // Simple Heatmap Drawing Logic
    points.forEach(p => {
      ctx.beginPath();
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 25);
      gradient.addColorStop(0, `rgba(255, 60, 0, ${p.value * 0.4})`); // Core color
      gradient.addColorStop(1, 'rgba(255, 60, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.arc(p.x, p.y, 25, 0, Math.PI * 2);
      ctx.fill();
    });

    // Add pitch lines (Basic representation)
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();

    // Center line
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);

    // Center circle
    ctx.moveTo(width / 2 + 20, height / 2);
    ctx.arc(width / 2, height / 2, 20, 0, Math.PI * 2);

    ctx.stroke();
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
