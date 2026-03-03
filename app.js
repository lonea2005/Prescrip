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

// Prescript configuration (loaded from prescripts.json)
let prescriptConfig = null;

// DOM elements
const timerDisplay = document.getElementById('timerDisplay');
const phaseText = document.getElementById('phaseText');
const doneBtn = document.getElementById('doneBtn');
const failBtn = document.getElementById('failBtn');
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

    // Load prescript configuration
    await loadPrescriptConfig();

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

// Load prescript config from prescripts.json
async function loadPrescriptConfig() {
    try {
        const response = await fetch('prescripts.json');
        prescriptConfig = await response.json();
    } catch (e) {
        console.error('Failed to load prescripts.json, using default', e);
        prescriptConfig = {
            prescripts: [
                {
                    "id": 1,
                    "weight": 4,
                    "template": "在{XXX}獲取{OO}分",
                    "variables": {
                        "XXX": { "type": "list", "options": ["控制部", "情報部", "培訓部", "安保部"] },
                        "OO": { "type": "range", "min": 3, "max": 7 }
                    }
                }
            ]
        };
    }
}

// Return a random integer between min and max (inclusive)
function randomInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate random prescript using weighted selection from config
function generatePreScript() {
    const prescripts = prescriptConfig && prescriptConfig.prescripts;
    if (!prescripts || prescripts.length === 0) {
        return '在情報部獲取5分';
    }

    // Weighted random selection
    const totalWeight = prescripts.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;
    let selected = null;
    for (const prescript of prescripts) {
        random -= prescript.weight;
        if (random <= 0) {
            selected = prescript;
            break;
        }
    }
    if (!selected) {
        selected = prescripts[0];
    }

    // Template variable substitution
    let text = selected.template;
    if (selected.variables) {
        for (const [key, def] of Object.entries(selected.variables)) {
            let value;
            if (def.type === 'list') {
                value = def.options[Math.floor(Math.random() * def.options.length)];
            } else if (def.type === 'range') {
                value = randomInRange(def.min, def.max);
            }
            text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }
    }

    return text;
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
        // Ensure prescript exists
        if (!state.prescript) {
            state.prescript = generatePreScript();
            saveState();
        }
        phaseText.textContent = state.prescript;
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
