// Facemash Results Page

// DOM Elements
const loadingEl = document.getElementById('loading');
const notReleasedEl = document.getElementById('not-released');
const leaderboardEl = document.getElementById('leaderboard');
const errorEl = document.getElementById('error');
const errorMessageEl = document.getElementById('error-message');
const rankingsEl = document.getElementById('rankings');

// Initialize
async function init() {
    try {
        // Check if results are released
        const settingsDoc = await db.collection('settings').doc('config').get();
        
        if (!settingsDoc.exists) {
            showError('Settings not configured. Please contact the administrator.');
            return;
        }
        
        if (!settingsDoc.data().resultsReleased) {
            showNotReleased();
            return;
        }

        // Load rankings
        const snapshot = await db.collection('people')
            .orderBy('eloRating', 'desc')
            .get();
        
        if (snapshot.empty) {
            showError('No results available yet');
            return;
        }

        // Display rankings
        displayRankings(snapshot);
        showLeaderboard();
    } catch (error) {
        console.error('Results error:', error);
        if (error.code === 'permission-denied') {
            showError('Permission denied. Please check your connection.');
        } else if (error.code === 'unavailable') {
            showError('Service unavailable. Please check your internet connection.');
        } else {
            showError('Failed to load results. Please refresh.');
        }
    }
}

// Display rankings
function displayRankings(snapshot) {
    rankingsEl.innerHTML = '';
    
    let rank = 1;
    snapshot.forEach(doc => {
        const person = doc.data();
        
        const item = document.createElement('div');
        item.className = 'rank-item';
        
        const photosHtml = person.photoUrls.map(url => 
            `<img src="${url}" alt="${person.name}">`
        ).join('');
        
        item.innerHTML = `
            <div class="rank-number">#${rank}</div>
            <div class="rank-info">
                <div class="rank-name">${person.name}</div>
                <div class="rank-stats">
                    Elo: ${Math.round(person.eloRating)} | Votes: ${person.totalVotes}
                </div>
            </div>
            <div class="rank-photos">${photosHtml}</div>
        `;
        
        rankingsEl.appendChild(item);
        rank++;
    });
}

// UI Helpers
function showLeaderboard() {
    loadingEl.classList.add('hidden');
    notReleasedEl.classList.add('hidden');
    leaderboardEl.classList.remove('hidden');
    errorEl.classList.add('hidden');
}

function showNotReleased() {
    loadingEl.classList.add('hidden');
    notReleasedEl.classList.remove('hidden');
    leaderboardEl.classList.add('hidden');
    errorEl.classList.add('hidden');
}

function showError(message) {
    loadingEl.classList.add('hidden');
    notReleasedEl.classList.add('hidden');
    leaderboardEl.classList.add('hidden');
    errorEl.classList.remove('hidden');
    errorMessageEl.textContent = message;
}

// Start
init();
