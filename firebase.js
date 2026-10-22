
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";

import {
  getDatabase
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAp5op8MNtF29la3i6My9OVaMV8OvnIeTA",
  authDomain: "gazex-engine-app.firebaseapp.com",
  databaseURL: "https://gazex-engine-app-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "gazex-engine-app",
  storageBucket: "gazex-engine-app.firebasestorage.app",
  messagingSenderId: "421479425534",
  appId: "1:421479425534:web:253c0267c25fbbb4c08caf"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getDatabase(app);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: "select_account"
});

const configIsPlaceholder = false;

export {
  app,
  auth,
  db,
  provider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  configIsPlaceholder
};
