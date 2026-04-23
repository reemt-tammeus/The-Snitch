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
async function startApp(category) {
    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error("Netzwerkantwort war nicht ok.");
        const data = await response.json();
        
        state.category = category;
        state.rawPool = [];

        // Mix-Mode ohne Backshift
        if (category === "Mix-Mode") {
            Object.entries(data).forEach(([key, arr]) => {
                if (Array.isArray(arr) && key !== "Backshift of Time") {
                    state.rawPool = state.rawPool.concat(arr);
                }
            });
        } else {
            if (data[category]) {
                state.rawPool = data[category];
            } else if (category === "Orders / Requests" && data["Commands"]) {
                state.rawPool = data["Commands"];
            } else if (category === "Orders / Requests" && data["Orders and Requests"]) {
                state.rawPool = data["Orders and Requests"];
            } else {
                state.rawPool = data["Statements"] || []; 
            }
        }
        
        if (!state.rawPool || state.rawPool.length === 0) {
            alert(`Fehler: Keine Daten für "${category}" in der data.json gefunden!`);
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
        console.error("Fehler beim Starten:", e);
        alert("Fehler beim Laden der data.json! Nutzt du den Live-Server in VS Code?");
    }
}

function prepareQueue() {
    state.activeQueue = [...state.rawPool].sort(() => Math.random() - 0.5);
}

function loadNext() {
    if (state.blockCounter >= state.blockLimit || state.activeQueue.length === 0) {
        AppDirector.changeScreen('continue');
        return;
    }

    state.locked = false;
    state.userInput = "";
    document.getElementById('feedback-flash').classList.add('hidden');
    
    state.currentTask = state.activeQueue[state.blockCounter % state.activeQueue.length];
    
    renderDisplay();
    renderKeyboard();
}

function renderDisplay() {
    const display = document.getElementById('text-display');
    const task = state.currentTask;

    // Lückentext für Backshift
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
        // HINTS
        let hintHTML = "";
        if (task.hint) {
            hintHTML = `<div style="color: #888; font-family: monospace; letter-spacing: 1.5px; font-size: 1.2rem; margin-bottom: 5px;">${task.hint}</div>`;
        }

        // WARM-UP HINWEIS
        let instructionHTML = "";
        if (state.category === "Statements - Warm-Up-Mode") {
            instructionHTML = `<div style="font-size: 0.85rem; color: #ffc107; margin-top: 12px; font-weight: normal; font-style: italic;">
                ⚠️ Write the complete text, including given words.
            </div>`;
        }

        display.innerHTML = `
            <div style="font-style: italic; color: #aaa; margin-bottom: 10px;">"${task.direct}"</div>
            <div style="font-weight: bold; color: var(--orange); margin-bottom: 10px;">${task.prefix} ...</div>
            ${hintHTML}
            <div id="answer-input-display" style="font-size: 1.2rem; min-height: 1.5em; border-bottom: 1px solid #fff; padding-bottom: 4px;">
                ${state.userInput}<span class="cursor">|</span>
            </div>
            ${instructionHTML}
        `;
    }
}

// PERFEKTES QWERTY KEYBOARD
function renderKeyboard() {
    const zone = document.getElementById('input-controls');
    zone.innerHTML = ""; 
    
    const kbContainer = document.createElement('div');
    kbContainer.id = "keyboard";
    
    const rows = [
        ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
        ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
        ['z', 'x', 'c', 'v', 'b', 'n', 'm', "'", 'check']
    ];
    
    rows.forEach((row, index) => {
        const rowDiv = document.createElement('div');
        rowDiv.className = `kb-row row-${index + 1}`;
        
        row.forEach(key => {
            const btn = document.createElement('button');
            if (key === 'check') {
                btn.innerHTML = "↵";
                btn.className = "kb-key kb-check";
                btn.onclick = () => checkAnswer();
            } else {
                btn.textContent = key.toUpperCase();
                btn.className = "kb-key";
                btn.onclick = () => handleInput(key);
            }
            rowDiv.appendChild(btn);
        });
        kbContainer.appendChild(rowDiv);
    });

    const actionRow = document.createElement('div');
    actionRow.className = "kb-row row-4";
    
    const spaceBtn = document.createElement('button');
    spaceBtn.innerHTML = "SPACE";
    spaceBtn.className = "kb-key kb-space";
    spaceBtn.onclick = () => handleInput(" ");

    const backBtn = document.createElement('button');
    backBtn.innerHTML = "⌫";
    backBtn.className = "kb-key kb-backspace";
    backBtn.onclick = () => handleInput("backspace");
    
    actionRow.appendChild(spaceBtn);
    actionRow.appendChild(backBtn);
    
    kbContainer.appendChild(actionRow);
    zone.appendChild(kbContainer);
}

// HARDWARE KEYBOARD SUPPORT
window.addEventListener('keydown', (e) => {
    if (state.locked || !document.querySelector('[data-screen="playing"]').classList.contains('active')) return;
    
    if (e.key === "Backspace") {
        handleInput("backspace");
    } else if (e.key === "Enter") {
        checkAnswer();
    } else if (e.key.length === 1 && /[a-zA-Z' ]/.test(e.key)) {
        handleInput(e.key.toLowerCase());
    }
});

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
    
    const isCorrect = correctAnswers.some(a => 
        a.toLowerCase().trim() === state.userInput.toLowerCase().trim()
    );

    if (isCorrect) {
        state.streak++;
        state.blockCounter++;
        
        // GRÜNES LEUCHTEN
        const glassBox = document.getElementById('playing-glass-box');
        glassBox.classList.add('glow-green');
        
        setTimeout(() => {
            glassBox.classList.remove('glow-green');
            loadNext();
        }, 1200);
    } else {
        state.lives--;
        state.streak = 0;
        showFlash(`FALSCH! Richtig: ${correctAnswers[0]}`, "flash-red");
        
        if (state.lives <= 0) {
            setTimeout(() => {
                document.getElementById('game-over-screen').classList.remove('hidden');
                setTimeout(() => location.reload(), 3000);
            }, 2500); // Mehr Zeit vorm Tod
        } else {
            setTimeout(loadNext, 4000); // 4 Sekunden zum Fehler lesen
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

// MENÜ START MIT FADE-IN
document.addEventListener('DOMContentLoaded', () => {
    const menuGrid = document.getElementById('menu-grid');
    menuGrid.innerHTML = ""; 

    // Die 3 Sekunden Animation
    const menuBox = document.querySelector('[data-screen="menu"] .glass-box');
    if (menuBox) {
        menuBox.classList.add('startup-fade');
        setTimeout(() => menuBox.classList.remove('startup-fade'), 3100); // WICHTIG: Auf 3100 erhöht!
    }

    const categories = [
        "Backshift of Time",
        "Statements - Warm-Up-Mode",
        "Statements - Test-Prep-Mode",
        "Questions",
        "Orders / Requests",
        "Mix-Mode"
    ];
    
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.textContent = cat;
        btn.onclick = () => startApp(cat);
        menuGrid.appendChild(btn);
    });
});
