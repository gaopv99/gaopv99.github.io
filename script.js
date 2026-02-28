// Game Data
const gameData = {
    swords: ["fist", "longsword", "claymore", "royal sword", "sandshard", "inferno sword", "icebringer sword", "dragofeng", "emberheart sword"],
    mobs: ["snail", "pig", "turtle", "caveman", "spider", "mammoth", "viperbloom", "warlock", "spartan", "reaper", "angel", "cowboy", "ghost", "totem sentinel", "mummy", "blightleap", "bonepicker", "oculon", "magmaton", "knobble", "puffcap", "winxy", "shellthorn"],
    staffs: ["winterbolt staff", "flame staff", "lightning staff", "aqua staff", "inferno staff", "nature staff", "elixir staff"],
    multiplicatives: ["", "k", "m", "b", "t"],
    mobHealths: [10, 800, 2778, 4500, 12500, 75000, 125000, 100000, 312000, 833000, 1667000, 16667000, 75000000, 312000000, 714000000, 2778000000, 35714000000, 111000000000, 667000000000, 2000000000000, 15714000000000, 66000000000000, 1333000000000000],
    strMultiplicatives: [1, 1000, 1000000, 1000000000, 1000000000000],
    staffMultiplicatives: [0.15, 0.17, 0.2, 0.23, 0.3, 0.35, 2.5],
    swordMultiplicatives: [0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 1.2, 0.7],
    expDrops: [10, 40, 100, 250, 400, 1000, 1750, 3250, 5500, 14000, 30000, 50000, 110000, 250000, 500000, 750000, 1500000, 3250000, 7000000, 12000000, 24000000, 100000000, 50000000]
};

// DOM Elements
const mobSelect = document.getElementById('mob');
const strengthInput = document.getElementById('strength');
const multiplierSelect = document.getElementById('multiplier');
const weaponSelect = document.getElementById('weapon');
const potionsInput = document.getElementById('potions');
const doubleSPCheckbox = document.getElementById('doubleSP');
const isStaffCheckbox = document.getElementById('isStaff');
const calculateBtn = document.getElementById('calculateBtn');
const resultsDiv = document.getElementById('results');
const resultText = document.getElementById('resultText');
const killCountSpan = document.getElementById('killCount');
const timeNeededSpan = document.getElementById('timeNeeded');

// Auto-detect staff based on weapon selection
weaponSelect.addEventListener('change', function() {
    const weapon = this.value;
    const isStaff = gameData.staffs.includes(weapon);
    isStaffCheckbox.checked = isStaff;
});

// Calculate button click
calculateBtn.addEventListener('click', function() {
    // Get input values
    const mob = mobSelect.value;
    const strInitial = parseFloat(strengthInput.value) || 0;
    const strBonus = multiplierSelect.value;
    const weapon = weaponSelect.value;
    const potions = parseInt(potionsInput.value) || 0;
    const doubleSP = doubleSPCheckbox.checked;
    const isStaff = isStaffCheckbox.checked;

    // Validate
    if (strInitial <= 0) {
        alert('Please enter your current strength/magic points!');
        return;
    }

    // Calculate
    const results = calculateSP(mob, strInitial, strBonus, weapon, potions, doubleSP, isStaff);

    // Find next mob name
    const mobIndex = gameData.mobs.indexOf(mob);
    const nextMob = mobIndex + 1 < gameData.mobs.length ? gameData.mobs[mobIndex + 1] : "the final boss";

    // Display results based on whether they can one-shot current mob
    if (!results.canOneShotCurrent) {
        resultText.textContent = `You can't one-shot this mob. Try farming another one first until you have ${formatNumber(results.spNeededForCurrent)} more skill points.`;
        killCountSpan.textContent = 'N/A';
        timeNeededSpan.textContent = 'N/A';
    } else {
        const spNeededText = formatNumber(results.spNeededForNext);
        resultText.textContent = `To one-shot ${capitalize(nextMob)} (requires ${spNeededText} SP), you must kill ${formatNumber(results.killCount)} ${capitalize(mob)}s which will take roughly ${formatTime(results.minutes)}.`;
        killCountSpan.textContent = formatNumber(results.killCount);
        timeNeededSpan.textContent = formatNumber(results.minutes);
    }
    
    resultsDiv.classList.remove('hidden');
    
    // Scroll to results
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

function calculateSP(mob, strInitial, strBonus, weapon, potions, doubleSP, isStaff) {
    let strFinal = 0;
    let weaponMulti = 0;
    let expDrop = 0;
    let nextMobHealth = 0;
    let KPM = 0;
    let minutes = 0;
    let killCount = 0;
    let potionMinutesLeft = potions * 30;

    // Find str bonus multiplier
    const multIndex = gameData.multiplicatives.indexOf(strBonus);
    if (multIndex !== -1) {
        strFinal = strInitial * gameData.strMultiplicatives[multIndex];
    } else {
        strFinal = strInitial;
    }

    // Find weapon details
    if (isStaff) {
        KPM = 52;
        const staffIndex = gameData.staffs.indexOf(weapon);
        if (staffIndex !== -1) {
            weaponMulti = gameData.staffMultiplicatives[staffIndex];
        }
    } else {
        KPM = 42;
        const swordIndex = gameData.swords.indexOf(weapon);
        if (swordIndex !== -1) {
            weaponMulti = gameData.swordMultiplicatives[swordIndex];
        }
    }

    // Find mob details
    const mobIndex = gameData.mobs.indexOf(mob);
    if (mobIndex === -1) {
        return { canOneShotCurrent: false, spNeededForCurrent: 0 };
    }

    // Check if player can one-shot the CURRENT mob
    const currentMobHealth = gameData.mobHealths[mobIndex];
    const currentDamage = strFinal * weaponMulti;
    
    if (currentDamage < currentMobHealth) {
        // Cannot one-shot current mob
        const spNeeded = Math.ceil((currentMobHealth / weaponMulti) - strFinal);
        return { 
            canOneShotCurrent: false,
            spNeededForCurrent: spNeeded
        };
    }

    // Player can one-shot current mob, now calculate for NEXT mob
    if (mobIndex + 1 >= gameData.mobs.length) {
        // Already at final mob
        return { 
            canOneShotCurrent: true,
            minutes: 0,
            killCount: 0,
            spNeededForNext: 0
        };
    }

    nextMobHealth = gameData.mobHealths[mobIndex + 1];
    expDrop = doubleSP ? gameData.expDrops[mobIndex] * 2 : gameData.expDrops[mobIndex];
    
    // Calculate SP needed for next mob
    const targetStr = nextMobHealth / weaponMulti;
    const spNeededForNext = Math.ceil(targetStr);

    // Calculate kills and time needed
    const baseExpPerMinute = expDrop * KPM;

    // Safety check
    if (baseExpPerMinute <= 0 || weaponMulti <= 0) {
        return { 
            canOneShotCurrent: true,
            minutes: 0, 
            killCount: 0,
            spNeededForNext: spNeededForNext
        };
    }

    // Calculate using math instead of loop
    const strNeeded = targetStr - strFinal;

    if (strNeeded <= 0) {
        // Already can one-shot next mob
        return { 
            canOneShotCurrent: true,
            minutes: 0, 
            killCount: 0,
            spNeededForNext: spNeededForNext
        };
    }

    // Calculate with potions first (2x exp)
    const potionExp = Math.min(potionMinutesLeft * baseExpPerMinute * 2, strNeeded);
    const potionMinutesUsed = Math.ceil(potionExp / (baseExpPerMinute * 2));
    const remaining = strNeeded - potionExp;

    // Then normal exp
    const normalMinutes = remaining > 0 ? Math.ceil(remaining / baseExpPerMinute) : 0;

    minutes = potionMinutesUsed + normalMinutes;
    killCount = minutes * KPM;

    return { 
        canOneShotCurrent: true,
        minutes, 
        killCount,
        spNeededForNext: spNeededForNext
    };
}

// Helper functions
function capitalize(str) {
    return str.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

function formatNumber(num) {
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(1) + 'B';
    } else if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
}

function formatTime(minutes) {
    if (minutes >= 1440) {
        const days = Math.floor(minutes / 1440);
        const hours = Math.floor((minutes % 1440) / 60);
        return `${days} day${days > 1 ? 's' : ''} ${hours} hr${hours > 1 ? 's' : ''}`;
    } else if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours} hr${hours > 1 ? 's' : ''} ${mins} min`;
    }
    return `${minutes} minutes`;
}
