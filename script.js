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

  characters.forEach(char => {
    const box = document.createElement('div');
    const state = savedState[char] || 0;

    box.className = 'char-box';
    if (state > 0) {
      box.classList.add(STATE_CLASSES[state]);
    }

    // explicitly set the background to off-white if unlearned, per specs (though CSS handles this via default variable)
    box.textContent = char;

    box.addEventListener('click', () => {
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
    });

    fragment.appendChild(box);
  });

  gridContainer.appendChild(fragment);
});

function saveState(stateObj) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateObj));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}
