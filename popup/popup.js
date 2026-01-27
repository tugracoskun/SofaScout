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

    dashboard.innerHTML = `
      <div class="section-header">
        <h2>Hızlı Bakış</h2>
        <span class="live-indicator"><span class="pulse"></span> Canlı</span>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon players">👤</div>
          <span class="stat-value">${this.state.players.length}</span>
          <span class="stat-label">Takip</span>
        </div>
        <div class="stat-card">
          <div class="stat-icon matches">⚽</div>
          <span class="stat-value">5</span>
          <span class="stat-label">Maç</span>
        </div>
        <div class="stat-card">
          <div class="stat-icon alerts">🔔</div>
          <span class="stat-value">3</span>
          <span class="stat-label">Uyarı</span>
        </div>
      </div>
      
      <div class="activity-section">
        <h3>Son Aktiviteler</h3>
        <div class="activity-list">
          <div class="activity-item">
            <div class="activity-icon lineup">📋</div>
            <div class="activity-info">
              <span class="activity-title">Kadro Açıklandı</span>
              <span class="activity-desc">Fenerbahçe vs Galatasaray</span>
              <span class="activity-time">5 dakika önce</span>
            </div>
          </div>
          <div class="activity-item">
            <div class="activity-icon goal">⚽</div>
            <div class="activity-info">
              <span class="activity-title">Gol Atıldı</span>
              <span class="activity-desc">Arda Güler - 34'</span>
              <span class="activity-time">12 dakika önce</span>
            </div>
          </div>
          <div class="activity-item">
            <div class="activity-icon stat">📊</div>
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

    const playersHTML = this.state.players.map(p => `
      <div class="player-card" data-id="${p.id}">
        <div class="player-avatar">
          <img src="https://api.sofascore.app/api/v1/player/${p.id}/image" alt="${p.name}" 
               onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 40 40%22><rect fill=%22%23171C1F%22 width=%2240%22 height=%2240%22/><text x=%2220%22 y=%2228%22 text-anchor=%22middle%22 fill=%22%23fff%22 font-size=%2218%22>👤</text></svg>'">
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
        <span>🔍</span>
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
