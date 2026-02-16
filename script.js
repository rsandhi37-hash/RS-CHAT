// ========== CONFIGURATION ==========
const APP_PIN = "1818";
const MASTER_KEY = "REHAN_SANDHI_181";
const syms = ["%", "$", "#", "@", "!", "+", "×", "÷", "=", "?", ";", ":", "•", "~", "_", "/"];
const separator = "§";

// ========== GLOBAL VARIABLES ==========
let currentPin = "";
let isUnlocked = false;
let deferredPrompt;

// ========== SERVICE WORKER ==========
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('SW registered!'))
        .catch(err => console.log('SW failed:', err));
}

// ========== PWA INSTALL ==========
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    if (!window.matchMedia('(display-mode: standalone)').matches && !window.navigator.standalone) {
        document.getElementById('installPrompt').style.display = 'flex';
    }
});

const btnInstall = document.getElementById('btnInstall');
if(btnInstall) {
    btnInstall.addEventListener('click', async () => {
        if (!deferredPrompt) {
            alert('Browser menu se "Add to Home Screen" karein');
            return;
        }
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            deferredPrompt = null;
            location.reload();
        }
    });
}

// ========== PAGE LOAD ==========
window.addEventListener('load', () => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    
    if (isStandalone) {
        document.getElementById('installPrompt').style.display = 'none';
        document.getElementById('pinScreen').style.display = 'flex';
        renderKeypad();
    } else {
        document.getElementById('installPrompt').style.display = 'flex';
    }
});

// ========== PIN KEYPAD FUNCTIONS ==========
function renderKeypad() {
    const pad = document.getElementById('keypad');
    if (!pad) return;
    
    pad.innerHTML = "";
    const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 'DEL', 0, 'OK'];
    
    keys.forEach(value => {
        const btn = document.createElement('button');
        btn.className = 'pin-key';
        btn.textContent = value;
        
        if (value === 'DEL') btn.classList.add('del');
        if (value === 'OK') btn.classList.add('enter');
        
        btn.onclick = function() {
            if (value === 'DEL') {
                delPin();
            } else if (value === 'OK') {
                verifyPin();
            } else {
                addPin(value.toString());
            }
        };
        
        pad.appendChild(btn);
    });
}

function addPin(v) {
    if (currentPin.length < 4) {
        currentPin += v;
        updatePinDisplay();
    }
}

function delPin() {
    currentPin = currentPin.slice(0, -1);
    updatePinDisplay();
}

function updatePinDisplay() {
    const display = document.getElementById('pinDisplay');
    if (display) {
        let dots = '';
        for(let i = 0; i < currentPin.length; i++) {
            dots += '●';
        }
        let circles = '';
        for(let i = 0; i < 4 - currentPin.length; i++) {
            circles += '○';
        }
        display.textContent = dots + circles;
    }
}

function verifyPin() {
    if (currentPin === APP_PIN) {
        isUnlocked = true;
        document.getElementById('pinScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'flex';
    } else {
        alert('❌ Wrong PIN! Try again.');
        currentPin = '';
        updatePinDisplay();
    }
}

// ========== ENCRYPTION FUNCTIONS ==========
function getWeight() {
    let w = 0;
    for (let i = 0; i < MASTER_KEY.length; i++) {
        w += MASTER_KEY.charCodeAt(i);
    }
    return w;
}

function getSalt() {
    const d = new Date();
    return d.getHours() + Math.floor(d.getMinutes() / 10);
}

function handleEncrypt() {
    const textInput = document.getElementById('userInput');
    const text = textInput.value.trim();
    if (!text) {
        alert('Please type a message!');
        return;
    }
    
    const salt = getSalt();
    const weight = getWeight();
    let encrypted = '';
    
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i);
        const hex = (charCode + salt + weight).toString(16);
        const randomSym1 = syms[Math.floor(Math.random() * syms.length)];
        const randomSym2 = syms[Math.floor(Math.random() * syms.length)];
        encrypted += randomSym1 + hex + randomSym2 + separator;
    }
    
    addBubble(text, 'sent');
    textInput.value = '';
    
    navigator.clipboard.writeText(encrypted).then(() => {
        console.log('Copied to clipboard!');
    }).catch(() => {
        alert('Copy this: ' + encrypted);
    });
    
    window.open(`https://wa.me/?text=${encodeURIComponent(encrypted)}`, '_blank');
}

function handleDecrypt() {
    const inputField = document.getElementById('userInput');
    const input = inputField.value.trim();
    if (!input) {
        alert('Please paste encrypted code!');
        return;
    }
    
    const salt = getSalt();
    const weight = getWeight();
    let decrypted = '';
    
    try {
        const segments = input.split(separator);
        segments.forEach(seg => {
            const hexMatch = seg.match(/[0-9a-fA-F]+/);
            if (hexMatch) {
                const charCode = parseInt(hexMatch[0], 16) - salt - weight;
                decrypted += String.fromCharCode(charCode);
            }
        });
        
        if (decrypted) {
            addBubble(decrypted, 'received');
        } else {
            addBubble('[EMPTY MESSAGE]', 'received');
        }
    } catch (e) {
        alert('❌ Invalid encrypted code!');
    }
    
    inputField.value = '';
}

function addBubble(text, type) {
    const display = document.getElementById('display');
    const bubble = document.createElement('div');
    bubble.className = `bubble ${type}`;
    bubble.textContent = text;
    display.appendChild(bubble);
    display.scrollTop = display.scrollHeight;
}
