let state = { 
    rawPool: [], 
    activeQueue: [], 
    blockCounter: 0, 
    blockLimit: 10,
    lives: 3, 
    maxLives: 3, 
    streak: 0, 
    locked: false,
    category: "",
    currentTask: null,
    userInput: ""
};

const AppDirector = {
    changeScreen(screen) {
        document.querySelectorAll('.blueprint-screen').forEach(s => s.classList.remove('active'));
        const target = document.querySelector(`[data-screen="${screen}"]`);
        if (target) target.classList.add('active');
        
        document.getElementById('stats-bar').classList.toggle('hidden', screen === 'menu');
        document.getElementById('thumb-zone').classList.toggle('hidden', screen !== 'playing');
    },
    goBack() { 
        state.streak = 0; 
        this.changeScreen('menu'); 
    },
    continueGame() { 
        state.blockCounter = 0; 
        state.lives = state.maxLives; 
        updateStats(); 
        this.changeScreen('playing'); 
        loadNext(); 
    }
};

// INITIALISIERUNG & KATEGORIE-WAHL
async function startApp(category, level = 1) {
    try {
        const response = await fetch('data.json');
        const data = await response.json();
        
        // Pädagogische Firewall: Filtern nach Level
        state.category = category;
        state.rawPool = data[category].filter(item => item.level <= level);
        
        if (state.rawPool.length === 0) {
            alert("Keine Aufgaben für dieses Level gefunden!");
            return;
        }

        state.lives = state.maxLives;
        state.streak = 0;
        state.blockCounter = 0;
        updateStats();
        
        prepareQueue();
        AppDirector.changeScreen('playing');
        loadNext();
    } catch (e) {
        console.error("Fehler beim Laden der JSON:", e);
    }
}

function prepareQueue() {
    // Fisher-Yates Shuffle
    state.activeQueue = [...state.rawPool].sort(() => Math.random() - 0.5);
}

function loadNext() {
    if (state.blockCounter >= state.blockLimit) {
        AppDirector.changeScreen('continue');
        return;
    }

    state.locked = false;
    state.userInput = "";
    document.getElementById('feedback-flash').classList.add('hidden');
    
    // Nimm das nächste Item (und rotiere die Queue)
    state.currentTask = state.activeQueue[state.blockCounter % state.activeQueue.length];
    
    renderDisplay();
    renderKeyboard();
}

function renderDisplay() {
    const display = document.getElementById('text-display');
    const task = state.currentTask;

    // Spezial-Logik für Backshift (Lückentext)
    if (state.category === "Backshift of Time" && task.suffix) {
        display.innerHTML = `
            <div style="font-style: italic; color: #aaa; margin-bottom: 10px;">"${task.direct}"</div>
            <div style="font-size: 1.2rem;">
                ${task.prefix} 
                <span id="answer-input-display" style="color: var(--orange); border-bottom: 2px dashed var(--orange); min-width: 60px; display: inline-block; padding: 0 5px;">
                    ${state.userInput || "____"}
                </span> 
                ${task.suffix}
            </div>
        `;
    } else {
        // Standard-Anzeige für Statements/Fragen
        display.innerHTML = `
            <div style="font-style: italic; color: #aaa; margin-bottom: 10px;">"${task.direct}"</div>
            <div style="font-weight: bold; color: var(--orange); margin-bottom: 10px;">${task.prefix} ...</div>
            <div id="answer-input-display" style="font-size: 1.2rem; min-height: 1.5em;">
                ${state.userInput}<span class="cursor">|</span>
            </div>
        `;
    }
}

// ON-SCREEN KEYBOARD LOGIK
function renderKeyboard() {
    const zone = document.getElementById('input-controls');
    zone.innerHTML = ""; // Clear
    
    const keys = "ABCDEFGHIJKLMNOPQRSTUVWXYZ' ".split("");
    const kbContainer = document.createElement('div');
    kbContainer.id = "keyboard";
    
    keys.forEach(key => {
        const btn = document.createElement('button');
        btn.textContent = key;
        btn.onclick = () => handleInput(key.toLowerCase());
        kbContainer.appendChild(btn);
    });

    const actionRow = document.createElement('div');
    actionRow.className = "action-row";
    
    const backBtn = document.createElement('button');
    backBtn.innerHTML = "⌫";
    backBtn.onclick = () => handleInput("backspace");
    
    const enterBtn = document.createElement('button');
    enterBtn.innerHTML = "CHECK ➔";
    enterBtn.className = "enter-btn";
    enterBtn.onclick = () => checkAnswer();
    
    actionRow.appendChild(backBtn);
    actionRow.appendChild(enterBtn);
    
    zone.appendChild(kbContainer);
    zone.appendChild(actionRow);
}

function handleInput(key) {
    if (state.locked) return;
    
    if (key === "backspace") {
        state.userInput = state.userInput.slice(0, -1);
    } else {
        state.userInput += key;
    }
    renderDisplay();
}

function checkAnswer() {
    if (state.locked || state.userInput.trim() === "") return;
    state.locked = true;

    const task = state.currentTask;
    const correctAnswers = Array.isArray(task.answer) ? task.answer : [task.answer];
    
    // Einfache Normalisierung für den Vergleich
    const isCorrect = correctAnswers.some(a => 
        a.toLowerCase().trim() === state.userInput.toLowerCase().trim()
    );

    if (isCorrect) {
        state.streak++;
        state.blockCounter++;
        showFlash("RICHTIG!", "flash-green");
        setTimeout(loadNext, 1200);
    } else {
        state.lives--;
        state.streak = 0;
        showFlash(`FALSCH! Richtig: ${correctAnswers[0]}`, "flash-red");
        
        if (state.lives <= 0) {
            setTimeout(() => {
                document.getElementById('game-over-screen').classList.remove('hidden');
                setTimeout(() => location.reload(), 3000);
            }, 1500);
        } else {
            setTimeout(loadNext, 2500);
        }
    }
    updateStats();
}

function updateStats() { 
    document.getElementById('lives').textContent = "❤️".repeat(state.lives); 
    document.getElementById('streak-count').textContent = state.streak;
}

function showFlash(m, c) {
    const f = document.getElementById('feedback-flash');
    f.innerText = m; 
    f.className = c; 
    f.classList.remove('hidden');
}

// Menü-Buttons beim Start generieren
document.addEventListener('DOMContentLoaded', () => {
    const menuGrid = document.getElementById('menu-grid');
    const categories = ["Backshift of Time", "Statements", "Questions", "Commands"];
    
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.textContent = cat;
        btn.onclick = () => startApp(cat);
        menuGrid.appendChild(btn);
    });
});