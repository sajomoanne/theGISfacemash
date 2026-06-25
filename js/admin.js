// Facemash Admin Panel

// DOM Elements
const loginSection = document.getElementById('login-section');
const uploadSection = document.getElementById('upload-section');
const loginForm = document.getElementById('login-form');
const uploadForm = document.getElementById('upload-form');
const logoutBtn = document.getElementById('logout-btn');
const loginError = document.getElementById('login-error');
const uploadMessage = document.getElementById('upload-message');
const uploadError = document.getElementById('upload-error');
const peopleList = document.getElementById('people-list');
const adminActionMessage = document.getElementById('admin-action-message');
const adminActionError = document.getElementById('admin-action-error');
const resetEloBtn = document.getElementById('reset-elo-btn');
const resetVotesBtn = document.getElementById('reset-votes-btn');
const deleteVotesBtn = document.getElementById('delete-votes-btn');
const deleteSessionsBtn = document.getElementById('delete-sessions-btn');

// Photo URL preview listeners
document.getElementById('photo1').addEventListener('input', (e) => showPreview(e.target.value, 'preview1'));
document.getElementById('photo2').addEventListener('input', (e) => showPreview(e.target.value, 'preview2'));
document.getElementById('photo3').addEventListener('input', (e) => showPreview(e.target.value, 'preview3'));

// Show preview thumbnail
function showPreview(url, previewId) {
    const preview = document.getElementById(previewId);
    if (url) {
        preview.innerHTML = `<img src="${url}" onerror="this.parentElement.innerHTML='✕'">`;
    } else {
        preview.innerHTML = '';
    }
}

function showAdminActionMessage(message) {
    adminActionError.classList.add('hidden');
    adminActionMessage.textContent = message;
    adminActionMessage.classList.remove('hidden');
}

function showAdminActionError(message) {
    adminActionMessage.classList.add('hidden');
    adminActionError.textContent = message;
    adminActionError.classList.remove('hidden');
}

function clearAdminActionFeedback() {
    adminActionMessage.classList.add('hidden');
    adminActionError.classList.add('hidden');
}

async function runBatchedOperation(collectionName, operationFactory, batchSize = 400) {
    let processed = 0;
    let lastDoc = null;

    while (true) {
        let query = db.collection(collectionName)
            .orderBy(firebase.firestore.FieldPath.documentId())
            .limit(batchSize);

        if (lastDoc) {
            query = query.startAfter(lastDoc);
        }

        const snapshot = await query.get();
        if (snapshot.empty) {
            break;
        }

        const batch = db.batch();
        snapshot.docs.forEach((doc) => operationFactory(batch, doc));
        await batch.commit();
        processed += snapshot.size;
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
    }

    return processed;
}

// Check auth state
auth.onAuthStateChanged((user) => {
    if (user) {
        loginSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
        clearAdminActionFeedback();
        loadPeople();
    } else {
        loginSection.classList.remove('hidden');
        uploadSection.classList.add('hidden');
    }
});

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        loginError.classList.add('hidden');
    } catch (error) {
        console.error('Login error:', error);
        loginError.textContent = 'Login failed: ' + error.message;
        loginError.classList.remove('hidden');
    }
});

// Logout
logoutBtn.addEventListener('click', async () => {
    try {
        await auth.signOut();
    } catch (error) {
        console.error('Logout error:', error);
    }
});

// Add person
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const uid = document.getElementById('uid').value.trim().toLowerCase();
    const name = document.getElementById('name').value.trim();
    const gender = document.getElementById('gender').value;
    const photo1 = document.getElementById('photo1').value.trim().toLowerCase();
    const photo2 = document.getElementById('photo2').value.trim().toLowerCase();
    const photo3 = document.getElementById('photo3').value.trim().toLowerCase();
    
    // Validate required fields
    if (!uid || !name || !gender || !photo1) {
        uploadError.textContent = 'UID, Name, Gender, and at least Photo 1 are required';
        uploadError.classList.remove('hidden');
        uploadMessage.classList.add('hidden');
        return;
    }

    if (!['male', 'female'].includes(gender)) {
        uploadError.textContent = 'Gender must be male or female';
        uploadError.classList.remove('hidden');
        uploadMessage.classList.add('hidden');
        return;
    }
    
    // Validate URL format
    const urlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i;
    if (!urlPattern.test(photo1) || (photo2 && !urlPattern.test(photo2)) || (photo3 && !urlPattern.test(photo3))) {
        uploadError.textContent = 'Photo URLs must be valid image URLs (jpg, jpeg, png, gif, webp)';
        uploadError.classList.remove('hidden');
        uploadMessage.classList.add('hidden');
        return;
    }
    
    // Validate lowercase URLs
    const photoUrls = [photo1];
    if (photo2) photoUrls.push(photo2);
    if (photo3) photoUrls.push(photo3);
    
    // Check for duplicate UID
    try {
        const existingDoc = await db.collection('people').doc(uid).get();
        if (existingDoc.exists) {
            uploadError.textContent = 'A person with this UID already exists';
            uploadError.classList.remove('hidden');
            uploadMessage.classList.add('hidden');
            return;
        }
    } catch (error) {
        console.error('Error checking duplicate UID:', error);
        uploadError.textContent = 'Failed to check for duplicate UID';
        uploadError.classList.remove('hidden');
        uploadMessage.classList.add('hidden');
        return;
    }
    
    // Generate random ID for efficient querying
    const randomId = Math.floor(Math.random() * 1000000);
    
    // Show loading state
    const submitBtn = uploadForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = 'Adding...';
    submitBtn.disabled = true;
    
    try {
        await db.collection('people').doc(uid).set({
            uid: uid,
            randomId: randomId,
            name: name,
            gender: gender,
            eloRating: 1200,
            totalVotes: 0,
            photoUrls: photoUrls
        });
        
        uploadMessage.textContent = 'Person added successfully!';
        uploadMessage.classList.remove('hidden');
        uploadError.classList.add('hidden');
        
        // Clear form and previews
        uploadForm.reset();
        document.getElementById('preview1').innerHTML = '';
        document.getElementById('preview2').innerHTML = '';
        document.getElementById('preview3').innerHTML = '';
        
        // Reload people list
        loadPeople();
    } catch (error) {
        console.error('Upload error:', error);
        uploadError.textContent = 'Failed to add person: ' + error.message;
        uploadError.classList.remove('hidden');
        uploadMessage.classList.add('hidden');
    } finally {
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
    }
});

// Load people list
async function loadPeople() {
    try {
        const snapshot = await db.collection('people').get();
        
        peopleList.innerHTML = '';
        
        snapshot.forEach(doc => {
            const person = doc.data();
            const item = document.createElement('div');
            item.className = 'person-card-item';
            
            const photosHtml = person.photoUrls.map(url => 
                `<img src="${url}" alt="${person.name}" onerror="this.style.display='none'">`
            ).join('');
            
            item.innerHTML = `
                <div class="person-card-header">
	                    <div class="person-card-info">
	                        <div class="person-card-name">${person.name}</div>
	                        <div class="person-card-uid">${person.uid}</div>
	                        <div class="person-card-gender">${person.gender || 'No gender set'}</div>
	                    </div>
                    <button class="delete-btn" onclick="deletePerson('${doc.id}')">Delete</button>
                </div>
                <div class="person-card-stats">
                    <span>Elo: ${Math.round(person.eloRating)}</span>
                    <span>Votes: ${person.totalVotes}</span>
                </div>
                <div class="person-card-photos">${photosHtml}</div>
            `;
            peopleList.appendChild(item);
        });
    } catch (error) {
        console.error('Error loading people:', error);
    }
}

async function resetAllEloRatings() {
    if (!confirm('Reset every person to Elo 1200?')) {
        return;
    }

    resetEloBtn.disabled = true;

    try {
        const updated = await runBatchedOperation('people', (batch, doc) => {
            batch.update(doc.ref, { eloRating: 1200 });
        });

        if (updated === 0) {
            showAdminActionMessage('No people found to reset.');
            return;
        }

        await loadPeople();
        showAdminActionMessage(`Reset Elo for ${updated} people.`);
    } catch (error) {
        console.error('Error resetting Elo ratings:', error);
        showAdminActionError('Failed to reset Elo ratings: ' + error.message);
    } finally {
        resetEloBtn.disabled = false;
    }
}

async function resetAllVoteCounts() {
    if (!confirm('Reset every person\'s vote count to 0?')) {
        return;
    }

    resetVotesBtn.disabled = true;

    try {
        const updated = await runBatchedOperation('people', (batch, doc) => {
            batch.update(doc.ref, { totalVotes: 0 });
        });

        if (updated === 0) {
            showAdminActionMessage('No people found to reset.');
            return;
        }

        await loadPeople();
        showAdminActionMessage(`Reset vote counts for ${updated} people.`);
    } catch (error) {
        console.error('Error resetting vote counts:', error);
        showAdminActionError('Failed to reset vote counts: ' + error.message);
    } finally {
        resetVotesBtn.disabled = false;
    }
}

async function deleteAllVotes() {
    if (!confirm('Delete all vote records? This cannot be undone.')) {
        return;
    }

    deleteVotesBtn.disabled = true;

    try {
        const deleted = await runBatchedOperation('votes', (batch, doc) => {
            batch.delete(doc.ref);
        });

        showAdminActionMessage(`Deleted ${deleted} vote records.`);
    } catch (error) {
        console.error('Error deleting votes:', error);
        showAdminActionError('Failed to delete votes: ' + error.message);
    } finally {
        deleteVotesBtn.disabled = false;
    }
}

async function deleteAllSessions() {
    if (!confirm('Delete all session records? This cannot be undone.')) {
        return;
    }

    deleteSessionsBtn.disabled = true;

    try {
        const deleted = await runBatchedOperation('sessions', (batch, doc) => {
            batch.delete(doc.ref);
        });

        showAdminActionMessage(`Deleted ${deleted} session records.`);
    } catch (error) {
        console.error('Error deleting sessions:', error);
        showAdminActionError('Failed to delete sessions: ' + error.message);
    } finally {
        deleteSessionsBtn.disabled = false;
    }
}

// Delete person
async function deletePerson(personId) {
    if (!confirm('Are you sure you want to delete this person?')) {
        return;
    }
    
    try {
        await db.collection('people').doc(personId).delete();
        loadPeople();
    } catch (error) {
        console.error('Error deleting person:', error);
        alert('Failed to delete person: ' + error.message);
    }
}

resetEloBtn.addEventListener('click', resetAllEloRatings);
resetVotesBtn.addEventListener('click', resetAllVoteCounts);
deleteVotesBtn.addEventListener('click', deleteAllVotes);
deleteSessionsBtn.addEventListener('click', deleteAllSessions);
