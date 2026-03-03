// App state
const TIMER_DURATION = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

let state = {
    endTime: null,
    timerInterval: null,
    score: 100,
    prescript: null
};

// Loaded prescript definitions from prescripts.json
let prescriptDefs = null;

// DOM elements
const timerDisplay = document.getElementById('timerDisplay');
const phaseText = document.getElementById('phaseText');
const doneBtn = document.getElementById('doneBtn');
const failBtn = document.getElementById('failBtn');
const rerollBtn = document.getElementById('rerollBtn');
const resetBtn = document.getElementById('resetBtn');
const buttonContainer = document.querySelector('.button-container');
const scoreDisplay = document.getElementById('scoreDisplay');

// Initialize app
async function init() {
    // Register service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed:', err));
    }

    // Load prescript definitions
    try {
        const res = await fetch('prescripts.json');
        const data = await res.json();
        prescriptDefs = data.prescripts;
    } catch (e) {
        console.warn('Failed to load prescripts.json, using fallback:', e);
    }

    // Load saved state or start fresh
    loadState();
    
    // Set up event listeners
    doneBtn.addEventListener('click', handleDone);
    failBtn.addEventListener('click', handleFail);
    rerollBtn.addEventListener('click', handleReroll);
    resetBtn.addEventListener('click', handleReset);
    
    // Start timer update loop
    updateTimer();
    updateScore();
    state.timerInterval = setInterval(updateTimer, 1000);
}

// Generate random prescript using loaded definitions
function generatePreScript() {
    if (!prescriptDefs || prescriptDefs.length === 0) {
        return '在情報部獲取5分';
    }

    // Weighted random selection
    const totalWeight = prescriptDefs.reduce((sum, p) => sum + p.weight, 0);
    let rand = Math.random() * totalWeight;
    let selected = prescriptDefs[prescriptDefs.length - 1];
    let cumulative = 0;
    for (const p of prescriptDefs) {
        cumulative += p.weight;
        if (rand < cumulative) {
            selected = p;
            break;
        }
    }

    // Process template variables
    let text = selected.template;
    if (selected.variables) {
        for (const [key, def] of Object.entries(selected.variables)) {
            let value;
            if (def.type === 'range') {
                value = Math.floor(Math.random() * (def.max - def.min + 1)) + def.min;
            } else if (def.type === 'choice') {
                value = def.values[Math.floor(Math.random() * def.values.length)];
            }
            text = text.replaceAll(`{${key}}`, value);
        }
    }
    return text;
}

// Load state from localStorage
function loadState() {
    const savedState = localStorage.getItem('timerState');
    
    if (savedState) {
        const parsed = JSON.parse(savedState);
        state.endTime = parsed.endTime;
        state.score = parsed.score !== undefined ? parsed.score : 100;
        state.prescript = parsed.prescript || null;
        
        // Check if timer has expired while app was closed (possibly multiple times)
        if (state.endTime && Date.now() >= state.endTime) {
            handleTimerExpiredOffline();
        }
    } else {
        // First time opening app - start fresh
        state.score = 100;
        startNewRound();
    }
    
    updateUI();
}

// Save state to localStorage
function saveState() {
    localStorage.setItem('timerState', JSON.stringify({
        endTime: state.endTime,
        score: state.score,
        prescript: state.prescript
    }));
}

// Update score display
function updateScore() {
    scoreDisplay.textContent = state.score;
}

// Start a new round (new instruction, reset timer)
function startNewRound() {
    state.endTime = Date.now() + TIMER_DURATION;
    state.prescript = generatePreScript();
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

// Update UI based on current state
function updateUI() {
    // Ensure prescript exists
    if (!state.prescript) {
        state.prescript = generatePreScript();
        saveState();
    }
    phaseText.textContent = state.prescript;
    phaseText.style.color = '#2196F3';
    buttonContainer.style.display = 'flex';
    updateScore();
}

// Handle Done button press
function handleDone() {
    state.score += 10;
    updateScore();
    startNewRound();
}

// Handle Fail button press
function handleFail() {
    state.score -= 10;
    updateScore();
    startNewRound();
}

// Handle Reroll button press
function handleReroll() {
    state.score -= 5;
    state.prescript = generatePreScript();
    updateScore();
    saveState();
    updateUI();
}

// Handle Reset button press
function handleReset() {
    state.score = 100;
    startNewRound();
}

// Handle timer expiration (while app is open)
function handleTimerExpired() {
    state.score -= 10;
    updateScore();
    startNewRound();
}

// Handle timer expiration while offline (could be multiple cycles)
function handleTimerExpiredOffline() {
    const now = Date.now();
    const timeSinceExpiration = now - state.endTime;
    
    // Calculate how many complete 12-hour cycles have passed since expiration
    // At minimum 1 cycle (the initial expiration), plus any additional full cycles
    const expiredCycles = 1 + Math.floor(timeSinceExpiration / TIMER_DURATION);
    
    // Deduct 10 points per expired cycle
    state.score -= 10 * expiredCycles;
    
    // Start a new round with fresh timer
    startNewRound();
}

// Handle visibility change (app going to background)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        saveState();
    } else {
        // App came back to foreground - check if timer expired
        if (state.endTime && Date.now() >= state.endTime) {
            handleTimerExpiredOffline();
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
