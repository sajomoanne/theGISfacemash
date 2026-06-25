

const firebaseConfig = {
  apiKey: "AIzaSyCKiS7_TVaWGQXv0HB3AMCd5-mCM5jWS5c",
  authDomain: "acoolfacemash.firebaseapp.com",
  projectId: "acoolfacemash",
  storageBucket: "acoolfacemash.firebasestorage.app",
  messagingSenderId: "244833489199",
  appId: "1:244833489199:web:e0c15aa80c546987fe51da"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();
