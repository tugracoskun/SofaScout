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

        // Check if we're on a profile page and add import button
        if (window.location.href.includes('/user/profile/')) {
            addProfileImportButton();
        }

        // Re-check on URL change (SPA navigation)
        let lastUrl = location.href;
        new MutationObserver(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                if (location.href.includes('/user/profile/')) {
                    setTimeout(addProfileImportButton, 1500);
                }
            }
        }).observe(document, { subtree: true, childList: true });
    }

    function addProfileImportButton() {
        // Don't add if already exists
        if (document.querySelector('.scout-import-btn')) return;
        if (document.querySelector('.scout-floating-import')) return;

        console.log('SofaScout: Looking for Athletes section...');

        // Wait for page to load
        setTimeout(() => {
            // Find "Athletes" text by walking through all elements
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_TEXT,
                null,
                false
            );

            let athletesNode = null;
            while (walker.nextNode()) {
                const text = walker.currentNode.textContent.trim().toLowerCase();
                if (text === 'athletes' || text === 'oyuncular') {
                    athletesNode = walker.currentNode.parentElement;
                    console.log('SofaScout: Found Athletes element:', athletesNode);
                    break;
                }
            }

            if (athletesNode) {
                // Create import button (just icon)
                const importBtn = document.createElement('button');
                importBtn.className = 'scout-import-btn';
                importBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                `;
                importBtn.title = 'SofaScout\'a Aktar';
                importBtn.addEventListener('click', importFavoritesToScout);

                // Insert button right after the Athletes text
                athletesNode.style.display = 'inline-flex';
                athletesNode.style.alignItems = 'center';
                athletesNode.style.gap = '8px';
                athletesNode.appendChild(importBtn);
                console.log('SofaScout: Import button added');
                return;
            }

            // Fallback: add floating button
            console.log('SofaScout: Athletes not found, checking for player links...');
            const playerLinks = document.querySelectorAll('a[href*="/player/"]');
            console.log('SofaScout: Found', playerLinks.length, 'player links');
            if (playerLinks.length > 0) {
                addFloatingImportButton();
            }
        }, 2000);
    }

    function addFloatingImportButton() {
        if (document.querySelector('.scout-floating-import')) return;

        const btn = document.createElement('button');
        btn.className = 'scout-floating-import';
        btn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            SofaScout'a Aktar
        `;
        btn.title = 'Bu sayfadaki oyuncuları SofaScout\'a aktar';
        btn.addEventListener('click', importFavoritesToScout);
        document.body.appendChild(btn);
    }

    async function importFavoritesToScout() {
        const btn = document.querySelector('.scout-import-btn') || document.querySelector('.scout-floating-import');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span>Aktarılıyor...</span>';
        }

        // Find all player links on the page
        const players = [];
        document.querySelectorAll('a[href*="/player/"]').forEach(link => {
            const href = link.getAttribute('href');
            const match = href.match(/\/player\/([^/]+)\/(\d+)/);
            if (match) {
                const name = link.textContent?.trim() || match[1].replace(/-/g, ' ');
                const id = parseInt(match[2]);
                if (id && name.length > 1 && name.length < 50 && !players.find(p => p.id === id)) {
                    players.push({
                        id,
                        name,
                        team: 'Bilinmiyor',
                        rating: '-'
                    });
                }
            }
        });

        console.log('Found players to import:', players);

        if (players.length === 0) {
            showImportToast('Bu sayfada oyuncu bulunamadı!', 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    <span>SofaScout'a Aktar</span>
                `;
            }
            return;
        }

        // Save to storage
        try {
            const { players: existing = [] } = await chrome.storage.local.get(['players']);
            console.log('SofaScout: Existing players in storage:', existing.length);

            const existingIds = new Set(existing.map(p => p.id));
            const newPlayers = players.filter(p => !existingIds.has(p.id));
            console.log('SofaScout: New players to add:', newPlayers.length, newPlayers);

            const updatedPlayers = [...existing, ...newPlayers];
            console.log('SofaScout: Total players after merge:', updatedPlayers.length);

            await chrome.storage.local.set({ players: updatedPlayers });
            console.log('SofaScout: Storage updated successfully');

            // Verify save
            const verify = await chrome.storage.local.get(['players']);
            console.log('SofaScout: Verification - players in storage:', verify.players?.length);

            showImportToast(`✓ ${newPlayers.length} yeni oyuncu eklendi! (Toplam: ${updatedPlayers.length})`, 'success');
        } catch (e) {
            console.error('SofaScout: Storage error:', e);
            showImportToast('Hata: ' + e.message, 'error');
        }

        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>SofaScout'a Aktar</span>
            `;
        }
    }

    function showImportToast(message, type = 'info') {
        const existing = document.querySelector('.scout-import-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `scout-import-toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
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
    let lastUrl = window.location.href;

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

        // Watch for SPA URL changes (SofaScore is a SPA)
        setInterval(() => {
            if (lastUrl !== window.location.href) {
                lastUrl = window.location.href;
                onUrlChange();
            }
        }, 500);
    }

    function onUrlChange() {
        if (!focusModeEnabled) return;

        const isMatchPage = window.location.href.includes('/match/');
        const hasFullFocusMode = document.body.classList.contains('focus-mode');
        const hasMinimalFocusMode = document.body.classList.contains('focus-mode-minimal');

        if (isMatchPage && hasFullFocusMode) {
            // Navigated TO a match page - switch to minimal mode
            document.body.classList.remove('focus-mode');
            document.body.classList.add('focus-mode-minimal');
            console.log('🎯 Focus Mode: Switched to minimal (match page detected)');
        } else if (!isMatchPage && hasMinimalFocusMode) {
            // Navigated AWAY from match page - switch to full mode
            document.body.classList.remove('focus-mode-minimal');
            document.body.classList.add('focus-mode');
            cleanupDOM();
            hideOddsToggle();
            hideAppPromo();
            console.log('🎯 Focus Mode: Switched to full (left match page)');
        }
    }

    function createFocusModeUI() {
        // Corner Toggle Button (bottom-right) with tooltip
        const cornerPanel = document.createElement('div');
        cornerPanel.className = 'focus-mode-corner';
        cornerPanel.innerHTML = `
            <span class="corner-tooltip">Focus Mode</span>
            <button class="corner-toggle" title="Focus Mode">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <line x1="4" y1="6" x2="20" y2="6"></line>
                    <line x1="6" y1="12" x2="18" y2="12"></line>
                    <line x1="8" y1="18" x2="16" y2="18"></line>
                </svg>
            </button>
        `;

        const toggleBtn = cornerPanel.querySelector('.corner-toggle');
        toggleBtn.addEventListener('click', toggleFocusMode);
        document.body.appendChild(cornerPanel);
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
        // Check if we're on a match detail page FIRST
        const isMatchPage = window.location.href.includes('/match/');

        // Update corner panel
        const cornerPanel = document.querySelector('.focus-mode-corner');
        if (cornerPanel) {
            cornerPanel.classList.add('active');
        }

        if (isMatchPage) {
            // On match pages, DON'T add focus-mode class (CSS breaks the page)
            document.body.classList.add('focus-mode-minimal');
            console.log('🎯 Focus Mode: ENABLED (Match page - no CSS hiding)');
            return; // Exit early
        }

        // On other pages, add full focus-mode class
        document.body.classList.add('focus-mode');

        cleanupDOM();
        hideOddsToggle();
        hideAppPromo();

        // Keep trying to hide elements for dynamically loaded content
        const cleanupInterval = setInterval(() => {
            const stillNotMatchPage = !window.location.href.includes('/match/');

            if (document.body.classList.contains('focus-mode') && stillNotMatchPage) {
                hideOddsToggle();
                hideAppPromo();
            } else {
                clearInterval(cleanupInterval);
            }
        }, 2000);

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
            // Skip if we're on a match detail page (URL contains /match/)
            const isMatchPage = window.location.href.includes('/match/');

            document.querySelectorAll('.card-component').forEach(card => {
                // Don't hide cards that are part of match content
                if (isMatchPage) {
                    // On match pages, only hide cards that DEFINITELY are promos
                    const hasAdBanner = card.querySelector('img[src*="ad-block-banners"]');
                    const hasQRCode = card.querySelector('img[alt="QR code"]');

                    if (hasAdBanner || hasQRCode) {
                        card.style.display = 'none';
                    }
                } else {
                    // On other pages, use broader detection
                    const hasAdBanner = card.querySelector('img[src*="ad-block-banners"]');
                    const hasQR = card.querySelector('img[alt*="QR"], img[src*="qr-code"]');
                    const hasExclusively = card.textContent?.includes('Exclusively in the Sofascore');

                    if (hasAdBanner || hasQR || hasExclusively) {
                        card.style.display = 'none';
                    }
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
        document.body.classList.remove('focus-mode-minimal');

        // Update corner panel
        const cornerPanel = document.querySelector('.focus-mode-corner');
        if (cornerPanel) {
            cornerPanel.classList.remove('active');
        }

        console.log('🎯 Focus Mode: DISABLED - Reloading page...');
        setTimeout(() => {
            window.location.reload();
        }, 300);
    }

    function cleanupDOM() {
        if (!focusModeEnabled) return;

        // Skip aggressive cleanup on match detail pages
        const isMatchPage = window.location.href.includes('/match/');

        const selectorsToRemove = [
            // Ads - always safe to remove
            '[class*="GoogleAd"]', '[class*="AdSlot"]', '[class*="AdContainer"]', '[id*="div-gpt-ad"]',
            // Featured Odds Section
            '[class*="FeaturedOdds"]', '[class*="featuredOdds"]', '[class*="OddsWidget"]', '[class*="OddsSection"]',
            '[class*="OddsPanel"]', '[class*="oddsPanel"]', '[class*="BettingWidget"]',
            // Odds Toggle
            '[class*="OddsToggle"]', '[class*="oddsToggle"]', '[class*="OddsSwitch"]',
            // Vote/Poll widgets
            '[class*="FanVote"]', '[class*="MatchVote"]', '[class*="WhoWillWin"]', '[class*="PredictWinner"]',
            // Promotions
            '[class*="PromoCard"]', '[class*="PromoBanner"]'
        ];

        selectorsToRemove.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(el => {
                    el.style.display = 'none';
                });
            } catch (e) { }
        });

        // Hide betting links
        document.querySelectorAll('a').forEach(link => {
            const href = link.href || '';
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

})();
