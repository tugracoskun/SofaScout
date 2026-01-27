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
    await this.loadState();
    this.renderTabs();
    this.bindEvents();
  }

  async loadState() {
    // Load from chrome storage
    try {
      const stored = await chrome.storage.local.get(['players', 'matches', 'settings']);
      this.state = { ...this.state, ...stored };
    } catch (e) {
      console.log('Storage not available, using defaults');
      this.loadDefaults();
    }
  }

  loadDefaults() {
    this.state.players = [
      { id: 990722, name: 'Arda Güler', team: 'Real Madrid', rating: 8.2 },
      { id: 934235, name: 'Kenan Yıldız', team: 'Juventus', rating: 7.8 },
      { id: 796495, name: 'Ferdi Kadıoğlu', team: 'Brighton', rating: 7.5 }
    ];
    this.state.settings = {
      lineupNotification: true,
      matchStartNotification: true,
      goalNotification: true,
      ratingNotification: false,
      startingNotification: true
    };
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
          <span class="stat-value">5</span>
          <span class="stat-label">Maç</span>
        </div>
        <div class="stat-card">
          <div class="stat-icon alerts">${icons.alert}</div>
          <span class="stat-value">3</span>
          <span class="stat-label">Uyarı</span>
        </div>
      </div>
      
      <div class="activity-section">
        <h3>Son Aktiviteler</h3>
        <div class="activity-list">
          <div class="activity-item">
            <div class="activity-icon lineup">${icons.lineup}</div>
            <div class="activity-info">
              <span class="activity-title">Kadro Açıklandı</span>
              <span class="activity-desc">Fenerbahçe vs Galatasaray</span>
              <span class="activity-time">5 dakika önce</span>
            </div>
          </div>
          <div class="activity-item">
            <div class="activity-icon goal">${icons.goal}</div>
            <div class="activity-info">
              <span class="activity-title">Gol Atıldı</span>
              <span class="activity-desc">Arda Güler - 34'</span>
              <span class="activity-time">12 dakika önce</span>
            </div>
          </div>
          <div class="activity-item">
            <div class="activity-icon stat">${icons.stat}</div>
            <div class="activity-info">
              <span class="activity-title">Rating Güncellendi</span>
              <span class="activity-desc">Kenan Yıldız - 7.8</span>
              <span class="activity-time">23 dakika önce</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderPlayers() {
    const container = document.getElementById('players');
    if (!container) return;

    const searchIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    const playerFallback = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect fill="%23171C1F" width="40" height="40"/><g fill="none" stroke="%236B7280" stroke-width="1.5" transform="translate(10,8)"><circle cx="10" cy="6" r="5"/><path d="M0 22v-2a8 8 0 0 1 8-8h4a8 8 0 0 1 8 8v2"/></g></svg>';

    const playersHTML = this.state.players.map(p => `
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
    `).join('');

    container.innerHTML = `
      <div class="section-header">
        <h2>Takip Edilen Oyuncular</h2>
        <button class="add-btn" id="addPlayerBtn">+</button>
      </div>
      <div class="search-box">
        <span class="search-icon">${searchIcon}</span>
        <input type="text" placeholder="Oyuncu ara..." id="playerSearch">
      </div>
      <div class="players-list">${playersHTML}</div>
    `;

    this.bindPlayerEvents();
  }

  bindPlayerEvents() {
    document.getElementById('playerSearch')?.addEventListener('input', (e) => {
      this.filterPlayers(e.target.value);
    });

    document.querySelectorAll('.player-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        this.showPlayerDetails(id);
      });
    });
  }

  filterPlayers(query) {
    const cards = document.querySelectorAll('.player-card');
    cards.forEach(card => {
      const name = card.querySelector('.player-name').textContent.toLowerCase();
      card.style.display = name.includes(query.toLowerCase()) ? 'flex' : 'none';
    });
  }

  showPlayerDetails(playerId) {
    console.log('Show player details:', playerId);
    // TODO: Open player detail modal or navigate to SofaScore
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
