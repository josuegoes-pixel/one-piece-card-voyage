// ============================================================
// CLOUD CONFIG — Firebase + Cloudinary
// ============================================================
// SETUP:
// 1. Copy this file as cloud-config.js
// 2. Fill in your Firebase and Cloudinary credentials below
// 3. Cloudinary Dashboard → Settings → Upload → Add upload preset
//    Preset name: "one_piece_unsigned", Signing Mode: "Unsigned"
// 4. Firebase Console → Firestore → Rules:
//    allow read, write: if true;  (para dev, restringir em prod)
// ============================================================

// Firebase
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
firebase.initializeApp(firebaseConfig);
const cloudDb = firebase.firestore();

// Cloudinary
const CLOUDINARY = {
  cloudName: "YOUR_CLOUD_NAME",
  apiKey: "YOUR_API_KEY",
  uploadPreset: "one_piece_unsigned"
};
