const STORAGE_KEY = 'hanzi-tracker-data';

// states: 0 = unlearned (default), 1 = learning (green), 2 = learned (yellow)
const STATE_CLASSES = {
  0: '',
  1: 'status-learning',
  2: 'status-learned'
};

let savedState = {};
let charBoxesMap = {};
let authToken = null;

// Auth handlers
window.handleCredentialResponse = async (response) => {
  console.log("Encoded JWT ID token: " + response.credential);
  try {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token: response.credential })
    });
    
    if (res.ok) {
      const data = await res.json();
      authToken = response.credential;
      
      document.querySelector('.g_id_signin').style.display = 'none';
      document.getElementById('user-profile').style.display = 'flex';
      document.getElementById('user-name').textContent = data.user.name;
      
      await fetchUserData();
    } else {
      const errorData = await res.json();
      console.error('Login failed:', errorData);
      alert('Login failed: ' + (errorData.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error during login:', error);
    alert('Communication error with the server. Are you running the backend server? Check the console for details.');
  }
};

async function fetchUserData() {
  if (!authToken) return;
  try {
    const res = await fetch('/api/user/data', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (res.ok) {
      const backendData = await res.json();
      
      // Reset savedState
      savedState = {};
      if (backendData.learned) {
        backendData.learned.forEach(char => savedState[char] = 1);
      }
      if (backendData.in_progress) {
        backendData.in_progress.forEach(char => savedState[char] = 2);
      }
      
      updateCounts();
      updateUIGrid();
      
      // Save merged state to local storage just in case
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState));
    }
  } catch (e) {
    console.error('Failed to fetch user data', e);
  }
}

async function syncStateToBackend() {
  if (!authToken) return;
  
  const learned = [];
  const in_progress = [];
  
  for (const char in savedState) {
    if (savedState[char] === 1) learned.push(char);
    else if (savedState[char] === 2) in_progress.push(char);
  }
  
  try {
    await fetch('/api/user/data', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ learned, in_progress })
    });
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
  
  // also sync to backend if logged in
  if (authToken) {
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

document.addEventListener('DOMContentLoaded', () => {
  const gridContainer = document.getElementById('character-grid');

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) Object.assign(savedState, JSON.parse(data));
  } catch (e) {
    console.error('Failed to load from localStorage', e);
  }
  
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      authToken = null;
      document.querySelector('.g_id_signin').style.display = 'block';
      document.getElementById('user-profile').style.display = 'none';
      
      // Clear state when logged out to avoid mixing sessions
      savedState = {};
      
      // Restore from local storage? If we have non-logged in state, it might be overwritten.
      // Better to just start fresh if we implemented user states.
      updateCounts();
      updateUIGrid();
    });
  }

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

  // `characters` is imported via characters.js
  characters.forEach((char, index) => {
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
          let c = characters[i];
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
});
