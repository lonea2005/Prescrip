// App state
const WORKING_PHASE = 'working';
const REST_PHASE = 'rest';
const WORKING_DURATION = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
const REST_DURATION = 16 * 60 * 60 * 1000; // 16 hours in milliseconds

let state = {
    phase: WORKING_PHASE,
    endTime: null,
    timerInterval: null,
    score: 100,
    prescript: null
};

// DOM elements
const timerDisplay = document.getElementById('timerDisplay');
const phaseText = document.getElementById('phaseText');
const doneBtn = document.getElementById('doneBtn');
const failBtn = document.getElementById('failBtn');
const buttonContainer = document.querySelector('.button-container');
const scoreDisplay = document.getElementById('scoreDisplay');

// Initialize app
function init() {
    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed:', err));
    }
    
    // Load saved state or start fresh
    loadState();
    
    // Set up event listeners
    doneBtn.addEventListener('click', handleDone);
    failBtn.addEventListener('click', handleFail);
    
    // Start timer update loop
    updateTimer();
    updateScore();
    state.timerInterval = setInterval(updateTimer, 1000);
}

// Generate random prescript
function generatePreScript() {
    const number = Math.floor(Math.random() * 5) + 3; // Random 3-7
    const parts = ['A', 'B', 'C'];
    const part = parts[Math.floor(Math.random() * parts.length)];
    return `Get ${number} points from ${part}`;
}

// Load state from localStorage
function loadState() {
    const savedState = localStorage.getItem('timerState');
    
    if (savedState) {
        const parsed = JSON.parse(savedState);
        state.phase = parsed.phase;
        state.endTime = parsed.endTime;
        state.score = parsed.score !== undefined ? parsed.score : 100;
        state.prescript = parsed.prescript || null;
        
        // Check if timer has expired while app was closed
        if (state.endTime && Date.now() >= state.endTime) {
            handleTimerExpired();
        }
    } else {
        // First time opening app - start working phase
        state.score = 100;
        startPhase(WORKING_PHASE);
    }
    
    updateUI();
}

// Save state to localStorage
function saveState() {
    localStorage.setItem('timerState', JSON.stringify({
        phase: state.phase,
        endTime: state.endTime,
        score: state.score,
        prescript: state.prescript
    }));
}

// Update score display
function updateScore() {
    scoreDisplay.textContent = state.score;
}

// Start a new phase
function startPhase(phase) {
    state.phase = phase;
    
    if (phase === WORKING_PHASE) {
        state.endTime = Date.now() + WORKING_DURATION;
        state.prescript = generatePreScript();
    } else {
        state.endTime = Date.now() + REST_DURATION;
    }
    
    saveState();
    updateUI();
}

// Update timer display
function updateTimer() {
    const now = Date.now();
    const remaining = state.endTime - now;
    
    if (remaining <= 0) {
        handleTimerExpired();
        return;
    }
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    
    timerDisplay.textContent = 
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Update UI based on current phase
function updateUI() {
    if (state.phase === WORKING_PHASE) {
        phaseText.textContent = state.prescript || generatePreScript();
        phaseText.style.color = '#2196F3';
        buttonContainer.style.display = 'flex';
    } else {
        phaseText.textContent = 'Rest';
        phaseText.style.color = '#4CAF50';
        buttonContainer.style.display = 'none';
    }
    updateScore();
}

// Handle Done button press
function handleDone() {
    if (state.phase === WORKING_PHASE) {
        state.score += 10;
        updateScore();
        saveState();
        startPhase(REST_PHASE);
    }
}

// Handle Fail button press
function handleFail() {
    if (state.phase === WORKING_PHASE) {
        state.score -= 30;
        updateScore();
        saveState();
        startPhase(REST_PHASE);
    }
}

// Handle timer expiration
function handleTimerExpired() {
    if (state.phase === WORKING_PHASE) {
        startPhase(REST_PHASE);
    } else {
        startPhase(WORKING_PHASE);
    }
}

// Handle visibility change (app going to background)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        saveState();
    } else {
        // App came back to foreground - check if timer expired
        if (state.endTime && Date.now() >= state.endTime) {
            handleTimerExpired();
        }
        updateTimer();
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    saveState();
});

// Start the app
init();
