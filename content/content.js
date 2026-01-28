// SofaScore Scout Pro - Content Script
// İnjected into SofaScore pages

(function () {
    'use strict';

    // Configuration
    const CONFIG = {
        selectors: {
            playerCard: '[class*="PlayerCard"]',
            matchEvent: '[class*="EventCellContent"]',
            favoriteButton: '[data-testid="favorite-button"]'
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        console.log('SofaScore Scout Pro content script loaded');

        // Add custom styles
        injectStyles();

        // Observe DOM changes
        observeDOM();

        // Add quick action buttons
        addQuickActions();
    }

    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
      .scout-pro-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 6px 12px;
        background: linear-gradient(135deg, #00D4AA 0%, #00B894 100%);
        color: #000;
        border: none;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        margin-left: 8px;
      }
      
      .scout-pro-btn:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(0, 212, 170, 0.3);
      }
      
      .scout-pro-badge {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 8px;
        height: 8px;
        background: #00D4AA;
        border-radius: 50%;
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      .scout-pro-tooltip {
        position: absolute;
        background: #171C1F;
        color: #fff;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 12px;
        z-index: 10000;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      }
    `;
        document.head.appendChild(style);
    }

    function observeDOM() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    checkForNewElements(mutation.addedNodes);
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function checkForNewElements(nodes) {
        nodes.forEach((node) => {
            if (node.nodeType !== Node.ELEMENT_NODE) return;

            // Check player cards
            if (node.matches?.(CONFIG.selectors.playerCard)) {
                enhancePlayerCard(node);
            }

            // Check match events
            if (node.matches?.(CONFIG.selectors.matchEvent)) {
                enhanceMatchEvent(node);
            }
        });
    }

    function addQuickActions() {
        // Add track button to player pages
        const playerHeader = document.querySelector('[class*="PlayerHeader"]');
        if (playerHeader && !playerHeader.querySelector('.scout-pro-btn')) {
            const btn = createTrackButton();
            playerHeader.appendChild(btn);
        }
    }

    function createTrackButton() {
        const btn = document.createElement('button');
        btn.className = 'scout-pro-btn';
        btn.innerHTML = '📍 Scout Pro';
        btn.addEventListener('click', handleTrackClick);
        return btn;
    }

    async function handleTrackClick(e) {
        e.preventDefault();
        e.stopPropagation();

        // Get player info from page
        const playerInfo = extractPlayerInfo();
        if (!playerInfo) return;

        // Send to extension
        try {
            await chrome.runtime.sendMessage({
                action: 'addPlayer',
                player: playerInfo
            });

            showTooltip(e.target, 'Oyuncu takibe eklendi!');
        } catch (error) {
            console.error('Error adding player:', error);
        }
    }

    function extractPlayerInfo() {
        const url = window.location.href;
        const playerIdMatch = url.match(/player\/(\d+)/);
        if (!playerIdMatch) return null;

        const nameElement = document.querySelector('[class*="PlayerHeader"] h2');
        const teamElement = document.querySelector('[class*="PlayerTeam"]');

        return {
            id: parseInt(playerIdMatch[1]),
            name: nameElement?.textContent || 'Unknown',
            team: teamElement?.textContent || 'Unknown',
            rating: 0
        };
    }

    function enhancePlayerCard(card) {
        // Add scout indicator if player is tracked
        chrome.storage.local.get(['players'], (result) => {
            const players = result.players || [];
            const playerId = extractPlayerIdFromCard(card);

            if (players.some(p => p.id === playerId)) {
                const badge = document.createElement('div');
                badge.className = 'scout-pro-badge';
                card.style.position = 'relative';
                card.appendChild(badge);
            }
        });
    }

    function enhanceMatchEvent(event) {
        // Could add match tracking quick button here
    }

    function extractPlayerIdFromCard(card) {
        const link = card.querySelector('a[href*="/player/"]');
        if (!link) return null;
        const match = link.href.match(/player\/(\d+)/);
        return match ? parseInt(match[1]) : null;
    }

    function showTooltip(element, message) {
        const tooltip = document.createElement('div');
        tooltip.className = 'scout-pro-tooltip';
        tooltip.textContent = message;

        const rect = element.getBoundingClientRect();
        tooltip.style.top = `${rect.bottom + 8}px`;
        tooltip.style.left = `${rect.left}px`;

        document.body.appendChild(tooltip);

        setTimeout(() => tooltip.remove(), 2000);
    }

    // =========================================
    // SCOUT MODE - Professional Interface
    // =========================================
    
    let scoutModeEnabled = false;

    function initScoutMode() {
        // Load saved state
        chrome.storage.local.get(['scoutModeEnabled'], (result) => {
            scoutModeEnabled = result.scoutModeEnabled || false;
            if (scoutModeEnabled) {
                enableScoutMode();
            }
        });

        // Create Scout Mode UI elements
        createScoutModeUI();

        // Listen for messages from popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'toggleScoutMode') {
                toggleScoutMode();
                sendResponse({ enabled: scoutModeEnabled });
            } else if (request.action === 'getScoutModeStatus') {
                sendResponse({ enabled: scoutModeEnabled });
            }
            return true;
        });
    }

    function createScoutModeUI() {
        // Scout Mode Toggle Button (floating)
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'scout-mode-toggle';
        toggleBtn.innerHTML = '🎯';
        toggleBtn.title = 'Scout Modu';
        toggleBtn.addEventListener('click', toggleScoutMode);
        document.body.appendChild(toggleBtn);

        // Scout Mode Banner
        const banner = document.createElement('div');
        banner.className = 'scout-mode-banner';
        banner.innerHTML = `
            <span>🎯</span>
            <span>SCOUT MODU AKTİF</span>
            <span style="opacity: 0.7">• Reklamlar gizlendi • Bahis oranları kaldırıldı • Veri odaklı görünüm</span>
        `;
        document.body.appendChild(banner);

        // Scout Mode Status Pill
        const statusPill = document.createElement('div');
        statusPill.className = 'scout-mode-status';
        statusPill.innerHTML = '🎯 Scout Mode';
        document.body.appendChild(statusPill);
    }

    function toggleScoutMode() {
        scoutModeEnabled = !scoutModeEnabled;
        
        if (scoutModeEnabled) {
            enableScoutMode();
        } else {
            disableScoutMode();
        }

        // Save state
        chrome.storage.local.set({ scoutModeEnabled });

        // Notify popup
        chrome.runtime.sendMessage({ 
            action: 'scoutModeChanged', 
            enabled: scoutModeEnabled 
        }).catch(() => {});

        // Show feedback toast
        showScoutModeToast(scoutModeEnabled ? 'Scout Modu Aktif' : 'Scout Modu Kapalı');
    }

    function enableScoutMode() {
        document.body.classList.add('scout-mode');
        
        const toggleBtn = document.querySelector('.scout-mode-toggle');
        if (toggleBtn) {
            toggleBtn.classList.add('active');
        }

        // Additional DOM cleanup for stubborn elements
        cleanupDOM();

        console.log('🎯 Scout Mode: ENABLED');
    }

    function disableScoutMode() {
        document.body.classList.remove('scout-mode');
        
        const toggleBtn = document.querySelector('.scout-mode-toggle');
        if (toggleBtn) {
            toggleBtn.classList.remove('active');
        }

        console.log('🎯 Scout Mode: DISABLED');
    }

    function cleanupDOM() {
        // Aggressive cleanup of known ad/betting elements
        const selectorsToRemove = [
            // Common ad patterns
            '[class*="GoogleAd"]',
            '[class*="AdSlot"]',
            '[class*="adUnit"]',
            '[id*="div-gpt-ad"]',
            // Betting elements
            '[class*="OddsCompare"]',
            '[class*="BettingOdds"]',
            '[class*="odds-"]',
            // Social/noise
            '[class*="SocialProof"]',
            '[class*="FanVote"]',
            '[class*="WhoWillWin"]',
            '[class*="Prediction"]',
            // Promotions
            '[class*="PromoCard"]',
            '[class*="PromoBanner"]'
        ];

        selectorsToRemove.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(el => {
                    el.style.display = 'none';
                });
            } catch (e) {
                // Ignore invalid selectors
            }
        });

        // Remove betting-related links
        document.querySelectorAll('a').forEach(link => {
            const href = link.href || '';
            if (href.includes('bet365') || 
                href.includes('1xbet') || 
                href.includes('betway') ||
                href.includes('unibet') ||
                href.includes('bwin')) {
                link.style.display = 'none';
            }
        });
    }

    function showScoutModeToast(message) {
        // Remove existing toast
        const existingToast = document.querySelector('.scout-mode-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = 'scout-pro-toast scout-mode-toast success';
        toast.innerHTML = `
            <span style="margin-right: 8px;">🎯</span>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Remove after delay
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }

    // Initialize Scout Mode
    initScoutMode();

    // Re-run cleanup periodically for dynamically loaded content
    setInterval(() => {
        if (scoutModeEnabled) {
            cleanupDOM();
        }
    }, 3000);

})();
