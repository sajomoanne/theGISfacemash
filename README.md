# Facemash

A secure, scalable facemash-style voting website using HTML/CSS/JS with Firebase backend.

## Features

- **Mobile-first design**: Responsive layout with top/bottom split on mobile, side-by-side on desktop
- **Single photo display**: Shows one large photo per person with Instagram-style story segments
- **Client-side Elo rating**: Secure Elo calculations on client with Firestore security rules
- **Firebase Authentication**: Admin-only access to photo management
- **Truly random pairings**: Two separate queries with retry logic
- **Efficient querying**: Random ID-based queries read only 2 docs per vote
- **Fixed round limits**: Users vote for 20 rounds per device
- **Strict security rules**: Firestore rules with field validation
- **Free photo hosting**: GitHub Pages for images
- **Device tracking**: Track voting sessions per device
- **Manual results release**: Admin controls when leaderboard goes live
- **Image preloading**: Photos load before voting area appears

## Setup Instructions

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing one
3. Enable **Firestore Database** in test mode
4. Enable **Authentication** → Sign-in method → Email/Password
5. Create an admin account in Authentication
6. Copy your Firebase config from Project Settings

### 2. Configure Firebase

Edit `js/firebase.js` and replace with your Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

### 3. Update Security Rules

Edit `firestore.rules` and replace `ADMIN_UID_HERE` with your admin UID (get from Firebase Console → Authentication):

```javascript
allow write: if request.auth != null && request.auth.uid == 'YOUR_ADMIN_UID';
```

Deploy the rules:
```bash
firebase deploy --only firestore:rules
```

### 4. Install Firebase CLI

```bash
npm install -g firebase-tools
```

Login:
```bash
firebase login
```

### 5. Deploy Firestore Rules

Deploy the security rules:
```bash
firebase deploy --only firestore:rules
```

### 6. Initialize Settings

In Firebase Console → Firestore Database, create a document in the `settings` collection:

- **Collection**: `settings`
- **Document ID**: `config`
- **Fields**:
  - `resultsReleased`: `false` (boolean)
  - `maxRounds`: `20` (number)

### 7. Photo Hosting (GitHub Pages)

1. Create a `photos` folder in your GitHub repository
2. Upload photos with lowercase filenames (e.g., `person1-1.jpg`, `person1-2.jpg`)
3. Enable GitHub Pages for your repository
4. Use GitHub Pages URLs in the admin panel (e.g., `https://username.github.io/repo/photos/person1-1.jpg`)

**Important**: GitHub Pages is case-sensitive. Always use lowercase filenames.

### 8. Add People via Admin Panel

1. Open `admin.html` in your browser
2. Login with your admin credentials
3. For each person:
   - Enter their UID (unique identifier)
   - Enter their name
   - Enter 1-3 GitHub Pages photo URLs (lowercase)
   - Click "Add Person"

### 9. Test the Voting Interface

1. Open `index.html` in your browser
2. You should see two people side-by-side with their photos
3. Click on a person to vote
4. After 20 rounds, you'll see the completion message

### 10. Release Results

When ready to show results:

1. Go to Firebase Console → Firestore Database
2. Edit the `settings/config` document
3. Change `resultsReleased` to `true`
4. Open `results.html` to view the leaderboard

## Project Structure

```
/Users/ojas/My Work/GIS_facemash/
├── index.html          # Main voting interface
├── admin.html          # Firebase Auth-protected photo URL entry
├── results.html        # Leaderboard (hidden until release)
├── css/
│   └── style.css       # Mobile-first responsive styles
├── js/
│   ├── app.js          # Main voting logic with client-side Elo
│   ├── firebase.js     # Firebase configuration
│   ├── admin.js        # Admin upload logic with Auth
│   └── results.js      # Results page logic
├── firestore.rules     # Firestore security rules
├── firestore.indexes.json # Firestore indexes
└── README.md           # This file
```

## Security Features

- **Client-side Elo with Security Rules**: Elo calculations on client with Firestore rules restricting updates to eloRating/totalVotes fields only
- **Security Rules**: Strict validation on vote documents (exact fields, server timestamp)
- **Firebase Auth**: Admin-only access to photo uploads and settings
- **Device Tracking**: Prevents unlimited voting from same device

## Elo Rating Algorithm

Uses the standard Elo formula:
```
Expected score: E_A = 1 / (1 + 10^((R_B - R_A) / 400))
New rating: R_A' = R_A + K * (S_A - E_A)
Where K = 32, S_A = 1 for win, 0 for loss
```

## Troubleshooting

**Photos not loading**: Ensure GitHub Pages URLs are correct and lowercase filenames match exactly.

**Voting not working**: Check Firestore security rules are deployed and Cloud Functions are running.

**Admin login failing**: Verify Email/Password auth is enabled in Firebase Console and admin account exists.

**Results not showing**: Check that `settings/config` document exists with `resultsReleased: true`.

## License

MIT
