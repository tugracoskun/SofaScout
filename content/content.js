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
    // FOCUS MODE - Premium Scouting Interface
    // =========================================

    let focusModeEnabled = false;

    function initFocusMode() {
        // Load saved state (backwards compatible with scoutModeEnabled)
        chrome.storage.local.get(['focusModeEnabled', 'scoutModeEnabled'], (result) => {
            focusModeEnabled = result.focusModeEnabled || result.scoutModeEnabled || false;
            if (focusModeEnabled) {
                enableFocusMode();
            }
        });

        // Create Focus Mode UI elements
        createFocusModeUI();

        // Listen for messages from popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'toggleScoutMode' || request.action === 'toggleFocusMode') {
                toggleFocusMode();
                sendResponse({ enabled: focusModeEnabled });
            } else if (request.action === 'getScoutModeStatus' || request.action === 'getFocusModeStatus') {
                sendResponse({ enabled: focusModeEnabled });
            }
            return true;
        });
    }

    function createFocusModeUI() {
        // Focus Mode Toggle Button (floating)
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'focus-mode-toggle';
        toggleBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>
        `;
        toggleBtn.title = 'Focus Mode';
        toggleBtn.addEventListener('click', toggleFocusMode);
        document.body.appendChild(toggleBtn);

        // Focus Mode Banner
        const banner = document.createElement('div');
        banner.className = 'focus-mode-banner';
        banner.innerHTML = `
            <span class="status-pill">Focus Mode Active</span>
            <div class="info-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                Ads hidden
            </div>
            <div class="info-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                Distractions removed
            </div>
            <div class="info-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                Pure data view
            </div>
        `;
        document.body.appendChild(banner);
    }

    function toggleFocusMode() {
        focusModeEnabled = !focusModeEnabled;

        if (focusModeEnabled) {
            enableFocusMode();
        } else {
            disableFocusMode();
        }

        // Save state
        chrome.storage.local.set({ focusModeEnabled, scoutModeEnabled: focusModeEnabled });

        // Notify popup
        chrome.runtime.sendMessage({
            action: 'focusModeChanged',
            enabled: focusModeEnabled
        }).catch(() => { });

        // Show feedback toast
        showFocusModeToast(focusModeEnabled ? 'Focus Mode Enabled' : 'Focus Mode Disabled');
    }

    function enableFocusMode() {
        document.body.classList.add('focus-mode');

        const toggleBtn = document.querySelector('.focus-mode-toggle');
        if (toggleBtn) {
            toggleBtn.classList.add('active');
        }

        // Additional DOM cleanup for stubborn elements
        cleanupDOM();

        // Hide Odds toggle specifically
        hideOddsToggle();

        // Hide App promo sidebar
        hideAppPromo();

        // Keep trying to hide elements for dynamically loaded content
        const cleanupInterval = setInterval(() => {
            if (document.body.classList.contains('focus-mode')) {
                hideOddsToggle();
                hideAppPromo();
                cleanupDOM();
            } else {
                clearInterval(cleanupInterval);
            }
        }, 1500);

        console.log('🎯 Focus Mode: ENABLED');
    }

    function hideOddsToggle() {
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function (node) {
                    if (node.textContent.trim() === 'Odds') {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_REJECT;
                }
            }
        );

        let textNode;
        while (textNode = walker.nextNode()) {
            let element = textNode.parentElement;
            if (element) {
                for (let i = 0; i < 4 && element; i++) {
                    const hasSwitch = element.querySelector('input[role="switch"], [class*="slider"], [class*="switch"]');
                    const parentHasSwitch = element.parentElement?.querySelector('input[role="switch"], [class*="slider"], [class*="switch"]');

                    if (hasSwitch || parentHasSwitch) {
                        const parent = element.parentElement;
                        if (parent) {
                            Array.from(parent.children).forEach(child => {
                                const childText = child.textContent?.trim();
                                const childClass = (child.className || '').toLowerCase();

                                if (childText === 'Odds' ||
                                    childClass.includes('toggle') ||
                                    childClass.includes('slider') ||
                                    childClass.includes('switch') ||
                                    child.querySelector('input[role="switch"]')) {
                                    child.style.display = 'none';
                                }
                            });
                        }
                        break;
                    }
                    element = element.parentElement;
                }
            }
        }
    }

    function hideAppPromo() {
        try {
            document.querySelectorAll('.card-component').forEach(card => {
                const hasAdBanner = card.querySelector('img[src*="ad-block-banners"]');
                const hasQR = card.querySelector('img[alt*="QR"], img[src*="qr-code"]');
                const hasExclusively = card.textContent?.includes('Exclusively in the Sofascore');

                if (hasAdBanner || hasQR || hasExclusively) {
                    card.style.display = 'none';
                }
            });

            const promoSelectors = [
                '[class*="AppPromo"]',
                '[class*="appPromo"]',
                '[class*="DownloadApp"]',
                '[class*="MobileApp"]',
                '[class*="SidebarPromo"]'
            ];

            promoSelectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                    el.style.display = 'none';
                });
            });
        } catch (e) { }
    }

    function disableFocusMode() {
        document.body.classList.remove('focus-mode');

        const toggleBtn = document.querySelector('.focus-mode-toggle');
        if (toggleBtn) {
            toggleBtn.classList.remove('active');
        }

        console.log('🎯 Focus Mode: DISABLED - Reloading page...');
        setTimeout(() => {
            window.location.reload();
        }, 300);
    }

    function cleanupDOM() {
        if (!focusModeEnabled) return;

        const selectorsToRemove = [
            '[class*="GoogleAd"]', '[class*="AdSlot"]', '[class*="AdContainer"]', '[id*="div-gpt-ad"]',
            '[class*="FeaturedOdds"]', '[class*="featuredOdds"]', '[class*="OddsWidget"]', '[class*="OddsSection"]',
            '[class*="OddsPanel"]', '[class*="oddsPanel"]', '[class*="BettingWidget"]',
            '[class*="OddsToggle"]', '[class*="oddsToggle"]', '[class*="OddsSwitch"]',
            '[class*="FanVote"]', '[class*="MatchVote"]', '[class*="WhoWillWin"]', '[class*="PredictWinner"]',
            '[class*="PromoCard"]', '[class*="PromoBanner"]',
            '[class*="Comments"]', '[class*="SocialShare"]', '[class*="ShareButtons"]'
        ];

        selectorsToRemove.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(el => {
                    el.style.display = 'none';
                });
            } catch (e) { }
        });

        // Hide Odds link in match pages specifically
        document.querySelectorAll('a').forEach(link => {
            const href = link.href || '';
            const text = link.textContent || '';
            if (href.includes('bet365') || href.includes('1xbet') || href.includes('betway') ||
                href.includes('unibet') || href.includes('bwin') || href.includes('betfair')) {
                link.style.display = 'none';
            }
        });
    }

    function showFocusModeToast(message) {
        const existingToast = document.querySelector('.focus-mode-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = 'focus-mode-toast';
        toast.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }

    // Initialize Focus Mode
    initFocusMode();

    // Periodic cleanup
    setInterval(() => {
        if (focusModeEnabled) {
            cleanupDOM();
        }
    }, 2500);

})();
