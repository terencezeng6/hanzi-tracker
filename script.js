const STORAGE_KEY = 'hanzi-tracker-data';

// states: 0 = unlearned (default), 1 = learning (green), 2 = learned (yellow)
const STATE_CLASSES = {
  0: '',
  1: 'status-learning',
  2: 'status-learned'
};

document.addEventListener('DOMContentLoaded', () => {
  const gridContainer = document.getElementById('character-grid');

  // load saved state
  let savedState = {};
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) Object.assign(savedState, JSON.parse(data));
  } catch (e) {
    console.error('Failed to load from localStorage', e);
  }

  // create grid items
  const fragment = document.createDocumentFragment();
  const charBoxes = [];
  let isDragging = false;
  let dragStartIndex = -1;

  function highlightRange(startIdx, endIdx) {
    charBoxes.forEach(box => box.classList.remove('selected-range'));
    const start = Math.min(startIdx, endIdx);
    const end = Math.max(startIdx, endIdx);
    for (let i = start; i <= end; i++) {
      charBoxes[i].classList.add('selected-range');
    }
  }

  function clearHighlight() {
    charBoxes.forEach(box => box.classList.remove('selected-range'));
  }

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      clearHighlight();
    }
  });

  characters.forEach((char, index) => {
    const box = document.createElement('div');
    const state = savedState[char] || 0;

    box.className = 'char-box';
    if (state > 0) {
      box.classList.add(STATE_CLASSES[state]);
    }

    // explicitly set the background to off-white if unlearned, per specs (though CSS handles this via default variable)
    box.textContent = char;
    charBoxes.push(box);

    box.addEventListener('mousedown', (e) => {
      if (e.shiftKey && e.button === 0) {
        e.preventDefault(); // prevent text selection
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
            charBoxes[i].classList.remove(STATE_CLASSES[currentState]);
          }
          let nextState = (currentState + 1) % 3;
          savedState[c] = nextState;
          if (nextState > 0) {
            charBoxes[i].classList.add(STATE_CLASSES[nextState]);
          }
        }
        saveState(savedState);
        updateCounts(savedState);
        isDragging = false;
        clearHighlight();
      }
    });

    box.addEventListener('click', (e) => {
      if (!e.shiftKey) {
        // rotate state: 0 -> 1 -> 2 -> 0
        let currentState = savedState[char] || 0;

        // remove current state class
        if (currentState > 0) {
          box.classList.remove(STATE_CLASSES[currentState]);
        }

        let nextState = (currentState + 1) % 3;
        savedState[char] = nextState;

        // add new state class
        if (nextState > 0) {
          box.classList.add(STATE_CLASSES[nextState]);
        }

        // save state
        saveState(savedState);
        updateCounts(savedState);
      }
    });

    fragment.appendChild(box);
  });

  gridContainer.appendChild(fragment);
  updateCounts(savedState);
});

function saveState(stateObj) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateObj));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}

function updateCounts(savedState) {
  let learnedCount = 0;
  let inProgressCount = 0;
  for (const char in savedState) {
    if (savedState[char] === 1) learnedCount++;
    else if (savedState[char] === 2) inProgressCount++;
  }
  document.getElementById('learned-count').textContent = learnedCount;
  document.getElementById('in-progress-count').textContent = inProgressCount;
}
