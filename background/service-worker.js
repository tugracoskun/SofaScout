// SofaScout - Background Service Worker

// Alarm intervals
const ALARMS = {
    CHECK_MATCHES: 'checkMatches',
    CHECK_LINEUPS: 'checkLineups'
};

// Initialize alarms on install
chrome.runtime.onInstalled.addListener(() => {
    console.log('SofaScout installed');

    // Set up periodic checks
    chrome.alarms.create(ALARMS.CHECK_MATCHES, { periodInMinutes: 1 });
    chrome.alarms.create(ALARMS.CHECK_LINEUPS, { periodInMinutes: 5 });

    // Initialize storage
    chrome.storage.local.get(['settings'], (result) => {
        if (!result.settings) {
            chrome.storage.local.set({
                settings: {
                    lineupNotification: true,
                    matchStartNotification: true,
                    goalNotification: true,
                    ratingNotification: false,
                    startingNotification: true
                },
                players: [],
                matches: [],
                notifications: []
            });
        }
    });
});

// Handle alarms
chrome.alarms.onAlarm.addListener((alarm) => {
    switch (alarm.name) {
        case ALARMS.CHECK_MATCHES:
            checkLiveMatches();
            break;
        case ALARMS.CHECK_LINEUPS:
            checkLineups();
            break;
    }
});

// Check live matches for followed players
async function checkLiveMatches() {
    try {
        const { players, settings } = await chrome.storage.local.get(['players', 'settings']);
        if (!players || players.length === 0) return;

        // Get live matches
        const response = await fetch('https://api.sofascore.com/api/v1/sport/football/events/live');
        const data = await response.json();

        if (!data.events) return;

        for (const event of data.events) {
            // Check if any followed player is in this match
            await checkEventForPlayers(event, players, settings);
        }
    } catch (error) {
        console.error('Error checking live matches:', error);
    }
}

// Check event for followed players
async function checkEventForPlayers(event, players, settings) {
    try {
        const lineupResponse = await fetch(
            `https://api.sofascore.com/api/v1/event/${event.id}/lineups`
        );
        const lineupData = await lineupResponse.json();

        if (!lineupData.home || !lineupData.away) return;

        const allPlayers = [
            ...(lineupData.home.players || []),
            ...(lineupData.away.players || [])
        ];

        for (const player of players) {
            const found = allPlayers.find(p => p.player?.id === player.id);
            if (found && settings.startingNotification) {
                // Check if already notified
                const notified = await isAlreadyNotified(event.id, player.id, 'starting');
                if (!notified) {
                    sendNotification({
                        title: `${player.name} İlk 11'de!`,
                        message: `${event.homeTeam.name} vs ${event.awayTeam.name}`,
                        type: 'starting'
                    });
                    await markAsNotified(event.id, player.id, 'starting');
                }
            }
        }
    } catch (error) {
        console.error('Error checking event:', error);
    }
}

// Check for lineup announcements
async function checkLineups() {
    try {
        const { matches, settings } = await chrome.storage.local.get(['matches', 'settings']);
        if (!matches || !settings.lineupNotification) return;

        for (const match of matches) {
            try {
                const response = await fetch(
                    `https://api.sofascore.com/api/v1/event/${match.id}/lineups`
                );
                const data = await response.json();

                if (data.confirmed && !match.lineupNotified) {
                    sendNotification({
                        title: 'Kadro Açıklandı!',
                        message: `${match.homeTeam} vs ${match.awayTeam}`,
                        type: 'lineup'
                    });

                    // Mark as notified
                    match.lineupNotified = true;
                    await chrome.storage.local.set({ matches });
                }
            } catch (e) {
                console.error('Lineup check error:', e);
            }
        }
    } catch (error) {
        console.error('Error checking lineups:', error);
    }
}

// Send notification
function sendNotification({ title, message, type }) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: '../icons/icon128.png',
        title: title,
        message: message,
        priority: 2
    });
}

// Check if already notified
async function isAlreadyNotified(eventId, playerId, type) {
    const { notifications = [] } = await chrome.storage.local.get(['notifications']);
    return notifications.some(n =>
        n.eventId === eventId &&
        n.playerId === playerId &&
        n.type === type
    );
}

// Mark as notified
async function markAsNotified(eventId, playerId, type) {
    const { notifications = [] } = await chrome.storage.local.get(['notifications']);
    notifications.push({ eventId, playerId, type, timestamp: Date.now() });

    // Keep only last 100 notifications
    const trimmed = notifications.slice(-100);
    await chrome.storage.local.set({ notifications: trimmed });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'getPlayerStats':
            getPlayerStats(request.playerId).then(sendResponse);
            return true;
        case 'getMatchDetails':
            getMatchDetails(request.matchId).then(sendResponse);
            return true;
        case 'getHeatmap':
            getPlayerHeatmap(request.playerId, request.matchId).then(sendResponse);
            return true;
        case 'searchPlayer':
            searchPlayer(request.query).then(sendResponse);
            return true;
        case 'syncFavorites':
            syncUserFavorites().then(sendResponse);
            return true;
        case 'getSeasonHeatmap':
            getSeasonHeatmap(request.playerId).then(sendResponse);
            return true;
        case 'getPlayerTournaments':
            getPlayerTournaments(request.playerId).then(sendResponse);
            return true;
        case 'getTournamentHeatmap':
            getTournamentHeatmap(request.playerId, request.tournamentId, request.seasonId).then(sendResponse);
            return true;
    }
});

// Sync user favorites from SofaScore
async function syncUserFavorites() {
    try {
        // Fetch managed favorites (teams, players)
        const response = await fetch('https://api.sofascore.com/api/v1/user/favorites/managed');

        if (response.status === 401 || response.status === 403) {
            return { error: 'auth_required' };
        }

        const data = await response.json();

        // Filter only players (sport.id = 1 is football, but categorization might differ)
        // Adjust filtering logic based on actual API response structure
        // For now, assuming the response contains a flat list or category based list

        return { success: true, data: data };
    } catch (error) {
        console.error('Error syncing favorites:', error);
        return { error: 'network_error' };
    }
}

// Search players
async function searchPlayer(query) {
    if (!query || query.length < 2) return [];

    try {
        const response = await fetch(
            `https://api.sofascore.com/api/v1/search/all?q=${encodeURIComponent(query)}&page=0`
        );
        const data = await response.json();

        // Filter for sports persons (players) only
        const players = data.results
            .filter(r => r.type === 'player' || r.entity?.type === 'player')
            .map(r => r.entity || r);

        return players;
    } catch (error) {
        console.error('Error searching players:', error);
        return [];
    }
}

// Get player statistics
async function getPlayerStats(playerId) {
    try {
        const response = await fetch(
            `https://api.sofascore.com/api/v1/player/${playerId}/statistics/seasons`
        );
        return await response.json();
    } catch (error) {
        console.error('Error fetching player stats:', error);
        return null;
    }
}

// Get match details
async function getMatchDetails(matchId) {
    try {
        const response = await fetch(
            `https://api.sofascore.com/api/v1/event/${matchId}`
        );
        return await response.json();
    } catch (error) {
        console.error('Error fetching match details:', error);
        return null;
    }
}

// Get player heatmap data for a specific match
async function getPlayerHeatmap(playerId, matchId) {
    try {
        const response = await fetch(
            `https://api.sofascore.com/api/v1/event/${matchId}/player/${playerId}/heatmap`
        );
        return await response.json();
    } catch (error) {
        console.error('Error fetching heatmap:', error);
        return null;
    }
}

// Get player's COMBINED season heatmap (all tournaments merged)
async function getSeasonHeatmap(playerId) {
    try {
        // First, get player's statistics to find all active tournaments/seasons
        const statsResponse = await fetch(
            `https://api.sofascore.com/api/v1/player/${playerId}/statistics/seasons`
        );
        const statsData = await statsResponse.json();

        if (!statsData.uniqueTournamentSeasons || statsData.uniqueTournamentSeasons.length === 0) {
            return { error: 'no_seasons' };
        }

        // Collect all heatmap points from all tournaments
        let allPoints = [];
        let tournamentNames = [];

        // Fetch heatmaps from all tournaments (limit to first 5 for performance)
        const tournaments = statsData.uniqueTournamentSeasons.slice(0, 5);

        for (const tournament of tournaments) {
            const tournamentId = tournament.uniqueTournament.id;
            const seasonId = tournament.seasons[0].id;

            try {
                const heatmapResponse = await fetch(
                    `https://api.sofascore.com/api/v1/player/${playerId}/unique-tournament/${tournamentId}/season/${seasonId}/heatmap/overall`
                );

                if (heatmapResponse.ok) {
                    const heatmapData = await heatmapResponse.json();

                    // Extract points
                    let points = null;
                    if (Array.isArray(heatmapData)) {
                        points = heatmapData;
                    } else if (heatmapData.heatmap && Array.isArray(heatmapData.heatmap)) {
                        points = heatmapData.heatmap;
                    } else if (heatmapData.heatmapPoints && Array.isArray(heatmapData.heatmapPoints)) {
                        points = heatmapData.heatmapPoints;
                    } else if (heatmapData.points && Array.isArray(heatmapData.points)) {
                        points = heatmapData.points;
                    }

                    if (points && points.length > 0) {
                        allPoints = allPoints.concat(points);
                        tournamentNames.push(tournament.uniqueTournament.name);
                    }
                }
            } catch (e) {
                console.log(`Failed to fetch heatmap for ${tournament.uniqueTournament.name}:`, e);
            }
        }

        console.log('Total merged heatmap points:', allPoints.length, 'from', tournamentNames.length, 'tournaments');

        if (allPoints.length === 0) {
            return { error: 'no_heatmap_data' };
        }

        return {
            success: true,
            heatmap: allPoints,
            tournament: 'Sezon Toplamı', // Combined season
            season: tournamentNames.join(', ') || 'Tüm Turnuvalar'
        };
    } catch (error) {
        console.error('Error fetching season heatmap:', error);
        return { error: 'network_error' };
    }
}

// Get player's available tournaments for dropdown
async function getPlayerTournaments(playerId) {
    try {
        const response = await fetch(
            `https://api.sofascore.com/api/v1/player/${playerId}/statistics/seasons`
        );
        const data = await response.json();

        if (!data.uniqueTournamentSeasons) {
            return { tournaments: [] };
        }

        const tournaments = data.uniqueTournamentSeasons.map(t => ({
            id: t.uniqueTournament.id,
            name: t.uniqueTournament.name,
            seasonId: t.seasons[0].id,
            seasonName: t.seasons[0].name
        }));

        return { tournaments };
    } catch (error) {
        console.error('Error fetching tournaments:', error);
        return { tournaments: [] };
    }
}

// Get heatmap for a specific tournament
async function getTournamentHeatmap(playerId, tournamentId, seasonId) {
    try {
        const response = await fetch(
            `https://api.sofascore.com/api/v1/player/${playerId}/unique-tournament/${tournamentId}/season/${seasonId}/heatmap/overall`
        );

        if (!response.ok) {
            return { error: 'not_found' };
        }

        const data = await response.json();

        // Extract points
        let points = null;
        if (Array.isArray(data)) {
            points = data;
        } else if (data.heatmap && Array.isArray(data.heatmap)) {
            points = data.heatmap;
        } else if (data.heatmapPoints) {
            points = data.heatmapPoints;
        } else if (data.points) {
            points = data.points;
        }

        return { success: true, heatmap: points };
    } catch (error) {
        console.error('Error fetching tournament heatmap:', error);
        return { error: 'network_error' };
    }
}
