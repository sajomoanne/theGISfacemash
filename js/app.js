// Facemash Voting Interface

// Constants
const MAX_ROUNDS = 20;

// State
let deviceId = localStorage.getItem('facemash_device_id');
let currentRound = 0;
let personLeft = null;
let personRight = null;
let photoIndexLeft = 0;
let photoIndexRight = 0;
let isBusy = false;

// Initialize device ID
if (!deviceId) {
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('facemash_device_id', deviceId);
}

// DOM Elements
const loadingEl = document.getElementById('loading');
const introEl = document.getElementById('intro');
const votingAreaEl = document.getElementById('voting-area');
const completedEl = document.getElementById('completed');
const errorEl = document.getElementById('error');
const errorMessageEl = document.getElementById('error-message');
const roundBufferEl = document.getElementById('round-buffer');
const startVotingBtn = document.getElementById('start-voting-btn');
const roundCounterEl = document.getElementById('round-counter');
const photoLeftEl = document.getElementById('photo-left');
const photoRightEl = document.getElementById('photo-right');
const storySegmentsLeftEl = document.getElementById('story-segments-left');
const storySegmentsRightEl = document.getElementById('story-segments-right');
const mobileRoundQuery = window.matchMedia('(max-width: 768px)');

function updateRoundCounter() {
    const roundNumber = currentRound + 1;
    roundCounterEl.textContent = mobileRoundQuery.matches
        ? `${roundNumber}/${MAX_ROUNDS}`
        : `Round ${roundNumber} of ${MAX_ROUNDS}`;
}

mobileRoundQuery.addEventListener('change', updateRoundCounter);

// Initialize
async function init() {
    try {
        // Check if device has completed voting
        const sessionDoc = await db.collection('sessions').doc(deviceId).get();
        const isNewSession = !sessionDoc.exists;
        
        if (sessionDoc.exists) {
            const sessionData = sessionDoc.data();
            currentRound = sessionData.roundsCompleted || 0;
            
            if (currentRound >= MAX_ROUNDS) {
                showCompleted();
                return;
            }
        }

        if (isNewSession) {
            showIntro();
            return;
        }

        // Load first pair
        await loadPair(true);
        showVoting();
    } catch (error) {
        console.error('Initialization error:', error);
        if (error.code === 'permission-denied') {
            showError('Permission denied. Please check your connection.');
        } else if (error.code === 'unavailable') {
            showError('Service unavailable. Please check your internet connection.');
        } else {
            showError('Failed to initialize. Please refresh.');
        }
    }
}

async function startVoting() {
    if (isBusy) {
        return;
    }

    isBusy = true;
    startVotingBtn.disabled = true;
    showRoundBuffer('Loading first round...');

    try {
        await loadPair(true);
        showVoting();
    } catch (error) {
        console.error('Start voting error:', error);
        showError('Failed to load photos. Please refresh.');
    } finally {
        isBusy = false;
        startVotingBtn.disabled = false;
        hideRoundBuffer();
    }
}

// Load a random pair of people
async function loadPair(throwOnError = false) {
    try {
        // Update loading message
        loadingEl.querySelector('p').textContent = 'Loading photos...';
        
        // Generate a random number
        const randomNum1 = Math.random() * 1000000;

        // Query for first person
        const query1 = db.collection('people')
            .where('randomId', '>=', randomNum1)
            .limit(1);
        
        const snapshot1 = await query1.get();
        
        if (snapshot1.empty) {
            // Try with a lower random number
            const retryQuery1 = db.collection('people')
                .where('randomId', '>=', 0)
                .limit(1);
            const retrySnapshot1 = await retryQuery1.get();
            
            if (retrySnapshot1.empty) {
                throw new Error('No people found in database. Please add people via the admin panel.');
            }
            
            personLeft = retrySnapshot1.docs[0].data();
            personLeft.id = retrySnapshot1.docs[0].id;
        } else {
            personLeft = snapshot1.docs[0].data();
            personLeft.id = snapshot1.docs[0].id;
        }

        if (!['male', 'female'].includes(personLeft.gender)) {
            throw new Error('Selected person is missing a valid gender. Please update existing people in the admin panel.');
        }

        // Query same-gender candidates without requiring a composite index.
        const snapshot2 = await db.collection('people')
            .where('gender', '==', personLeft.gender)
            .get();

        const sameGenderCandidates = snapshot2.docs
            .map((doc) => {
                const candidate = doc.data();
                candidate.id = doc.id;
                return candidate;
            })
            .filter((candidate) => candidate.id !== personLeft.id);

        personRight = sameGenderCandidates[Math.floor(Math.random() * sameGenderCandidates.length)] || null;

        if (!personRight) {
            throw new Error(`Could not find two different ${personLeft.gender} people. Please add or update more people via the admin panel.`);
        }

        // Store in state
        photoIndexLeft = 0;
        photoIndexRight = 0;

        // Preload images before showing
        await preloadImages(personLeft.photoUrls, personRight.photoUrls);

        // Display photos
        displayPhoto(photoLeftEl, personLeft.photoUrls[0]);
        displayPhoto(photoRightEl, personRight.photoUrls[0]);
        displayStorySegments(storySegmentsLeftEl, personLeft.photoUrls, 0);
        displayStorySegments(storySegmentsRightEl, personRight.photoUrls, 0);

        // Update round counter
        updateRoundCounter();

    } catch (error) {
        console.error('Error loading pair:', error);
        if (throwOnError) {
            throw error;
        }
        if (error.message.includes('No people found') || error.message.includes('Could not find two different')) {
            showError(error.message);
        } else {
            showError('Failed to load photos. Please refresh.');
        }
    }
}

// Preload images
function preloadImages(urlsLeft, urlsRight) {
    return new Promise((resolve, reject) => {
        const images = [];
        const allUrls = [...urlsLeft, ...urlsRight];
        let loaded = 0;

        allUrls.forEach(url => {
            const img = new Image();
            img.onload = () => {
                loaded++;
                if (loaded === allUrls.length) resolve();
            };
            img.onerror = () => {
                loaded++;
                if (loaded === allUrls.length) resolve();
            };
            img.src = url;
            images.push(img);
        });

        if (allUrls.length === 0) resolve();
    });
}

// Display single photo
function displayPhoto(imgElement, url) {
    imgElement.src = url;
    imgElement.onerror = () => {
        imgElement.style.display = 'none';
    };
    imgElement.style.display = 'block';
}

// Display story segments
function displayStorySegments(container, photoUrls, currentIndex) {
    container.innerHTML = '';
    photoUrls.forEach((_, index) => {
        const segment = document.createElement('div');
        segment.className = 'story-segment';
        if (index === currentIndex) {
            segment.classList.add('active');
        }
        container.appendChild(segment);
    });
}

// Navigate carousel
function navigateCarousel(side, direction) {
    if (isBusy) {
        return;
    }

    if (side === 'left' && personLeft && personLeft.photoUrls) {
        photoIndexLeft = (photoIndexLeft + direction + personLeft.photoUrls.length) % personLeft.photoUrls.length;
        displayPhoto(photoLeftEl, personLeft.photoUrls[photoIndexLeft]);
        displayStorySegments(storySegmentsLeftEl, personLeft.photoUrls, photoIndexLeft);
    } else if (side === 'right' && personRight && personRight.photoUrls) {
        photoIndexRight = (photoIndexRight + direction + personRight.photoUrls.length) % personRight.photoUrls.length;
        displayPhoto(photoRightEl, personRight.photoUrls[photoIndexRight]);
        displayStorySegments(storySegmentsRightEl, personRight.photoUrls, photoIndexRight);
    }
}
// Calculate Elo rating
function calculateElo(winnerRating, loserRating) {
    const K = 32;
    const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));
    
    const newWinnerRating = winnerRating + K * (1 - expectedWinner);
    const newLoserRating = loserRating + K * (0 - expectedLoser);
    
    return {
        newWinnerRating,
        newLoserRating
    };
}

// Handle vote
async function vote(side) {
    if (isBusy) {
        return;
    }

    isBusy = true;

    try {
        const winner = side === 'left' ? personLeft : personRight;
        const loser = side === 'left' ? personRight : personLeft;

        // Add visual feedback
        const winnerCard = document.getElementById(`person-${side}`);
        const loserCard = document.getElementById(`person-${side === 'left' ? 'right' : 'left'}`);
        
        winnerCard.classList.add('winner');
        loserCard.classList.add('loser');

        // Calculate new Elo ratings
        const { newWinnerRating, newLoserRating } = calculateElo(
            winner.eloRating || 1200,
            loser.eloRating || 1200
        );

        // Update both people's ratings in Firestore
        await db.collection('people').doc(winner.id).update({
            eloRating: newWinnerRating,
            totalVotes: (winner.totalVotes || 0) + 1
        });

        await db.collection('people').doc(loser.id).update({
            eloRating: newLoserRating,
            totalVotes: (loser.totalVotes || 0) + 1
        });

        // Create vote document
        await db.collection('votes').add({
            winnerUid: winner.id,
            loserUid: loser.id,
            deviceId: deviceId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update session
        currentRound++;
        await db.collection('sessions').doc(deviceId).set({
            deviceId: deviceId,
            roundsCompleted: currentRound,
            startedAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastVoteAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Wait for animation to complete
        await new Promise(resolve => setTimeout(resolve, 800));

        // Remove winner/loser classes
        winnerCard.classList.remove('winner');
        loserCard.classList.remove('loser');

        // Check if completed
        if (currentRound >= MAX_ROUNDS) {
            showCompleted();
        } else {
            // Load next pair
            showRoundBuffer();
            await loadPair(true);
            hideRoundBuffer();
        }
    } catch (error) {
        console.error('Vote error:', error);
        // Remove winner/loser classes on error
        document.getElementById('person-left').classList.remove('winner', 'loser');
        document.getElementById('person-right').classList.remove('winner', 'loser');
        if (error.code === 'permission-denied') {
            showError('Permission denied. Your vote could not be recorded.');
        } else if (error.code === 'unavailable') {
            showError('Service unavailable. Please check your internet connection and try again.');
        } else {
            showError('Failed to submit vote. Please try again.');
        }
    } finally {
        isBusy = false;
        hideRoundBuffer();
    }
}

// UI Helpers
function showVoting() {
    loadingEl.classList.add('hidden');
    introEl.classList.add('hidden');
    votingAreaEl.classList.remove('hidden');
    completedEl.classList.add('hidden');
    errorEl.classList.add('hidden');
}

function showIntro() {
    loadingEl.classList.add('hidden');
    introEl.classList.remove('hidden');
    votingAreaEl.classList.add('hidden');
    completedEl.classList.add('hidden');
    errorEl.classList.add('hidden');
}

function showCompleted() {
    loadingEl.classList.add('hidden');
    introEl.classList.add('hidden');
    votingAreaEl.classList.add('hidden');
    completedEl.classList.remove('hidden');
    errorEl.classList.add('hidden');
}

function showError(message) {
    loadingEl.classList.add('hidden');
    introEl.classList.add('hidden');
    votingAreaEl.classList.add('hidden');
    completedEl.classList.add('hidden');
    errorEl.classList.remove('hidden');
    errorMessageEl.textContent = message;
}

function showRoundBuffer(message = 'Loading next round...') {
    roundBufferEl.querySelector('p').textContent = message;
    roundBufferEl.classList.remove('hidden');
}

function hideRoundBuffer() {
    roundBufferEl.classList.add('hidden');
}

// Event Listeners
// Carousel navigation buttons
document.querySelectorAll('.carousel-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const direction = e.currentTarget.dataset.direction === 'next' ? 1 : -1;
        const side = e.currentTarget.dataset.side;
        navigateCarousel(side, direction);
    });
});

// Make person cards clickable
document.getElementById('person-left').addEventListener('click', () => vote('left'));
document.getElementById('person-right').addEventListener('click', () => vote('right'));
startVotingBtn.addEventListener('click', startVoting);

// Start
init();
