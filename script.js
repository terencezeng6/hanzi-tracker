import { auth, provider, db } from './firebase-config.js';
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const STORAGE_KEY = 'hanzi-tracker-data';

// states: 0 = unlearned (default), 1 = learning (green), 2 = learned (yellow)
const STATE_CLASSES = {
  0: '',
  1: 'status-learning',
  2: 'status-learned'
};

let savedState = {};
let charBoxesMap = {};
let currentUser = null;

// Auth handlers
document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const userProfile = document.getElementById('user-profile');
  const userName = document.getElementById('user-name');

  // About modal
  const aboutBtn = document.getElementById('about-btn');
  const aboutOverlay = document.getElementById('about-overlay');
  const aboutClose = document.getElementById('about-close');

  if (aboutBtn && aboutOverlay) {
    aboutBtn.addEventListener('click', () => {
      aboutOverlay.style.display = 'flex';
      document.body.classList.add('no-scroll');
    });

    aboutClose.addEventListener('click', () => {
      aboutOverlay.style.display = 'none';
      document.body.classList.remove('no-scroll');
    });
  }

  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      try {
        await signInWithPopup(auth, provider);
      } catch (error) {
        console.error('Login failed:', error);
        alert('Login failed: ' + error.message);
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut(auth);
      } catch (error) {
        console.error('Logout failed:', error);
      }
    });
  }

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      if (loginBtn) loginBtn.style.display = 'none';
      if (userProfile) userProfile.style.display = 'flex';
      if (userName) userName.textContent = user.displayName || user.email;
      await fetchUserData();
    } else {
      currentUser = null;
      if (loginBtn) loginBtn.style.display = 'inline-flex';
      if (userProfile) userProfile.style.display = 'none';
      savedState = {}; // clear state on logout
      updateCounts();
      updateUIGrid();
    }
  });

  // Init grid
  initGrid();
});

async function fetchUserData() {
  if (!currentUser) return;
  try {
    const docRef = doc(db, "users", currentUser.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const backendData = docSnap.data();
      savedState = {};
      if (backendData.learned) {
        backendData.learned.forEach(char => savedState[char] = 1);
      }
      if (backendData.in_progress) {
        backendData.in_progress.forEach(char => savedState[char] = 2);
      }
    } else {
      savedState = {};
    }

    updateCounts();
    updateUIGrid();

    // Save to local storage mapping 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState));
  } catch (e) {
    console.error('Failed to fetch user data', e);
  }
}

async function syncStateToBackend() {
  if (!currentUser) return;

  const learned = [];
  const in_progress = [];

  for (const char in savedState) {
    if (savedState[char] === 1) learned.push(char);
    else if (savedState[char] === 2) in_progress.push(char);
  }

  try {
    const docRef = doc(db, "users", currentUser.uid);
    await setDoc(docRef, { learned, in_progress }, { merge: true });
  } catch (e) {
    console.error('Failed to sync state to backend', e);
  }
}

function updateUIGrid() {
  for (const char in charBoxesMap) {
    const box = charBoxesMap[char];
    box.className = 'char-box';
    const state = savedState[char] || 0;
    if (state > 0) {
      box.classList.add(STATE_CLASSES[state]);
    }
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }

  if (currentUser) {
    syncStateToBackend();
  }
}

function updateCounts() {
  let learnedCount = 0;
  let inProgressCount = 0;
  for (const char in savedState) {
    if (savedState[char] === 1) learnedCount++;
    else if (savedState[char] === 2) inProgressCount++;
  }
  document.getElementById('learned-count').textContent = learnedCount;
  document.getElementById('in-progress-count').textContent = inProgressCount;
}

function initGrid() {
  const gridContainer = document.getElementById('character-grid');
  gridContainer.innerHTML = '';
  const fragment = document.createDocumentFragment();
  const charBoxesArray = [];
  let isDragging = false;
  let dragStartIndex = -1;

  function highlightRange(startIdx, endIdx) {
    charBoxesArray.forEach(box => box.classList.remove('selected-range'));
    const start = Math.min(startIdx, endIdx);
    const end = Math.max(startIdx, endIdx);
    for (let i = start; i <= end; i++) {
      charBoxesArray[i].classList.add('selected-range');
    }
  }

  function clearHighlight() {
    charBoxesArray.forEach(box => box.classList.remove('selected-range'));
  }

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      clearHighlight();
    }
  });

  if (typeof window.characters !== 'undefined') {
    window.characters.forEach((char, index) => {
      const box = document.createElement('div');
      const state = savedState[char] || 0;

      box.className = 'char-box';
      if (state > 0) {
        box.classList.add(STATE_CLASSES[state]);
      }

      box.textContent = char;
      charBoxesArray.push(box);
      charBoxesMap[char] = box;

      box.addEventListener('mousedown', (e) => {
        if (e.shiftKey && e.button === 0) {
          e.preventDefault();
          isDragging = true;
          dragStartIndex = index;
          highlightRange(dragStartIndex, index);
        }
      });

      box.addEventListener('mouseenter', (e) => {
        if (isDragging) {
          highlightRange(dragStartIndex, index);
        }
      });

      box.addEventListener('mouseup', (e) => {
        if (isDragging) {
          const start = Math.min(dragStartIndex, index);
          const end = Math.max(dragStartIndex, index);
          for (let i = start; i <= end; i++) {
            let c = window.characters[i];
            let currentState = savedState[c] || 0;
            if (currentState > 0) {
              charBoxesArray[i].classList.remove(STATE_CLASSES[currentState]);
            }
            let nextState = (currentState + 1) % 3;
            savedState[c] = nextState;
            if (nextState > 0) {
              charBoxesArray[i].classList.add(STATE_CLASSES[nextState]);
            }
          }
          saveState();
          updateCounts();
          isDragging = false;
          clearHighlight();
        }
      });

      box.addEventListener('click', (e) => {
        if (!e.shiftKey) {
          let currentState = savedState[char] || 0;

          if (currentState > 0) {
            box.classList.remove(STATE_CLASSES[currentState]);
          }

          let nextState = (currentState + 1) % 3;
          savedState[char] = nextState;

          if (nextState > 0) {
            box.classList.add(STATE_CLASSES[nextState]);
          }

          saveState();
          updateCounts();
        }
      });

      fragment.appendChild(box);
    });

    gridContainer.appendChild(fragment);
    updateCounts();
  }
}
