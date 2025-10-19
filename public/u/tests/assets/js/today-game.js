// today-game.js - INTP - 지식의 연구소 (The Knowledge Laboratory)

// --- Utility Functions ---
function getDailySeed() {
    const today = new Date();
    return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
}

function mulberry32(seed) {
    return function() {
        seed |= 0;
        seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) | 0;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

function getRandomValue(base, variance) {
    const min = base - variance;
    const max = base + variance;
    return Math.floor(currentRandFn() * (max - min + 1)) + min;
}

function getEulReParticle(word) {
    if (!word || word.length === 0) return "를";
    const lastChar = word[word.length - 1];
    const uni = lastChar.charCodeAt(0);
    if (uni < 0xAC00 || uni > 0xD7A3) return "를";
    return (uni - 0xAC00) % 28 > 0 ? "을" : "를";
}

function getWaGwaParticle(word) {
    if (!word || word.length === 0) return "와";
    const lastChar = word[word.length - 1];
    const uni = lastChar.charCodeAt(0);
    if (uni < 0xAC00 || uni > 0xD7A3) return "와";
    return (uni - 0xAC00) % 28 > 0 ? "과" : "와";
}

// --- Game State Management ---
let gameState = {};
let currentRandFn = null;

function resetGameState() {
    gameState = {
        day: 1,
        logic: 50,
        knowledge: 50,
        efficiency: 50,
        innovation: 50,
        concentration: 50,
        actionPoints: 10,
        maxActionPoints: 10,
        resources: { computing_power: 10, materials: 10, energy: 5, quantum_bits: 0 },
        researchers: [
            { id: "turing", name: "튜링", personality: "분석적인", skill: "물리학", cooperation: 70 },
            { id: "curie", name: "퀴리", personality: "탐구적인", skill: "화학", cooperation: 60 }
        ],
        maxResearchers: 5,
        currentScenarioId: "intro",
        lastPlayedDate: new Date().toISOString().slice(0, 10),
        manualDayAdvances: 0,
        dailyEventTriggered: false,
        dailyBonus: { researchSuccess: 0 },
        dailyActions: { explored: false, debated: false, heldSymposium: [], minigamePlayed: false },
        research_facilities: {
            dataArchive: { built: false, durability: 100, name: "데이터 아카이브", description: "방대한 데이터를 저장하고 처리합니다.", effect_description: "연산력 자동 생성 및 지식 보너스." },
            fabricationRoom: { built: false, durability: 100, name: "제작실", description: "이론을 실제 프로토타입으로 만듭니다.", effect_description: "재료 생성 및 효율 향상." },
            centralControl: { built: false, durability: 100, name: "중앙 통제실", description: "연구소의 모든 활동을 총괄합니다.", effect_description: "새로운 연구원 영입 및 혁신 강화." },
            theoryLibrary: { built: false, durability: 100, name: "이론 라이브러리", description: "세상의 모든 이론과 지식을 모아놓은 곳입니다.", effect_description: "과거 기록을 통해 스탯 및 자원 획득." },
            advancedLab: { built: false, durability: 100, name: "고등 연구실", description: "차세대 기술을 연구하고 개발합니다.", effect_description: "양자 비트 획득 및 고급 연구 잠금 해제." }
        },
        labLevel: 0,
        minigameState: {}
    };
    currentRandFn = mulberry32(getDailySeed() + gameState.day);
}

function saveGameState() {
    localStorage.setItem('intpLabGame', JSON.stringify(gameState));
}

function loadGameState() {
    const savedState = localStorage.getItem('intpLabGame');
    const today = new Date().toISOString().slice(0, 10);
    if (savedState) {
        let loaded = JSON.parse(savedState);
        if (!loaded.dailyBonus) loaded.dailyBonus = { researchSuccess: 0 };
        if (!loaded.research_facilities) {
            loaded.research_facilities = {
                dataArchive: { built: false, durability: 100, name: "데이터 아카이브" },
                fabricationRoom: { built: false, durability: 100, name: "제작실" },
                centralControl: { built: false, durability: 100, name: "중앙 통제실" },
                theoryLibrary: { built: false, durability: 100, name: "이론 라이브러리" },
                advancedLab: { built: false, durability: 100, name: "고등 연구실" }
            };
        }
        Object.assign(gameState, loaded);

        currentRandFn = mulberry32(getDailySeed() + gameState.day);

        if (gameState.lastPlayedDate !== today) {
            gameState.day += 1;
            gameState.lastPlayedDate = today;
            gameState.manualDayAdvances = 0;
            gameState.dailyEventTriggered = false;
            processDailyEvents();
        }
    } else {
        resetGameState();
        processDailyEvents();
    }
    renderAll();
}

function updateState(changes, displayMessage = null) {
    Object.keys(changes).forEach(key => {
        if (typeof changes[key] === 'object' && changes[key] !== null && !Array.isArray(changes[key])) {
            gameState[key] = { ...gameState[key], ...changes[key] };
        } else {
            gameState[key] = changes[key];
        }
    });
    saveGameState();
    renderAll(displayMessage);
}

// --- UI Rendering ---
function updateGameDisplay(text) {
    const gameArea = document.getElementById('gameArea');
    if(gameArea && text) gameArea.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;
}

function renderStats() {
    const statsDiv = document.getElementById('gameStats');
    if (!statsDiv) return;
    const researcherListHtml = gameState.researchers.map(r => `<li>${r.name} (${r.skill}) - 협력도: ${r.cooperation}</li>`).join('');
    statsDiv.innerHTML = `
        <p><b>${gameState.day}일차 연구</b></p>
        <p><b>행동력:</b> ${gameState.actionPoints}/${gameState.maxActionPoints}</p>
        <p><b>논리:</b> ${gameState.logic} | <b>지식:</b> ${gameState.knowledge} | <b>효율:</b> ${gameState.efficiency} | <b>혁신:</b> ${gameState.innovation} | <b>집중:</b> ${gameState.concentration}</p>
        <p><b>자원:</b> 연산력 ${gameState.resources.computing_power}, 재료 ${gameState.resources.materials}, 에너지 ${gameState.resources.energy}, 양자 비트 ${gameState.resources.quantum_bits || 0}</p>
        <p><b>연구소 레벨:</b> ${gameState.labLevel}</p>
        <p><b>소속 연구원 (${gameState.researchers.length}/${gameState.maxResearchers}):</b></p>
        <ul>${researcherListHtml}</ul>
        <p><b>연구 시설:</b></p>
        <ul>${Object.values(gameState.research_facilities).filter(f => f.built).map(f => `<li>${f.name} (내구성: ${f.durability})</li>`).join('') || '없음'}</ul>
    `;
    const manualDayCounter = document.getElementById('manualDayCounter');
    if(manualDayCounter) manualDayCounter.innerText = gameState.manualDayAdvances;
}

function renderChoices(choices) {
    const choicesDiv = document.getElementById('gameChoices');
    if (!choicesDiv) return;
    let dynamicChoices = [];

    if (gameState.currentScenarioId === 'intro') {
        dynamicChoices = gameScenarios.intro.choices;
    } else if (gameState.currentScenarioId === 'action_facility_management') {
        dynamicChoices = [];
        if (!gameState.research_facilities.dataArchive.built) dynamicChoices.push({ text: "데이터 아카이브 구축 (재료 50, 에너지 20)", action: "build_dataArchive" });
        if (!gameState.research_facilities.fabricationRoom.built) dynamicChoices.push({ text: "제작실 구축 (에너지 30, 재료 30)", action: "build_fabricationRoom" });
        if (!gameState.research_facilities.centralControl.built) dynamicChoices.push({ text: "중앙 통제실 건설 (재료 100, 에너지 50)", action: "build_centralControl" });
        if (!gameState.research_facilities.theoryLibrary.built) dynamicChoices.push({ text: "이론 라이브러리 구축 (에너지 80, 재료 40)", action: "build_theoryLibrary" });
        if (gameState.research_facilities.fabricationRoom.built && !gameState.research_facilities.advancedLab.built) {
            dynamicChoices.push({ text: "고등 연구실 도입 (에너지 150, 양자 비트 5)", action: "build_advancedLab" });
        }
        Object.keys(gameState.research_facilities).forEach(key => {
            const facility = gameState.research_facilities[key];
            if (facility.built && facility.durability < 100) {
                dynamicChoices.push({ text: `${facility.name} 유지보수 (에너지 10, 재료 10)`, action: "maintain_facility", params: { facility: key } });
            }
        });
        dynamicChoices.push({ text: "취소", action: "return_to_intro" });
    } else {
        dynamicChoices = choices ? [...choices] : [];
    }

    choicesDiv.innerHTML = dynamicChoices.map(choice => `<button class="choice-btn" data-action="${choice.action}" data-params='${JSON.stringify(choice.params || {})}' >${choice.text}</button>`).join('');
    choicesDiv.querySelectorAll('.choice-btn').forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.action;
            if (gameActions[action]) {
                gameActions[action](JSON.parse(button.dataset.params || '{}'));
            }
        });
    });
}

function renderAll(customDisplayMessage = null) {
    const desc = document.getElementById('gameDescription');
    if (desc) desc.style.display = 'none';
    renderStats();
    
    if (!gameState.currentScenarioId.startsWith('minigame_')) {
        const scenario = gameScenarios[gameState.currentScenarioId] || gameScenarios.intro;
        updateGameDisplay(customDisplayMessage || scenario.text);
        renderChoices(scenario.choices);
    }
}

// --- Game Data (INTP Themed) ---
const gameScenarios = {
    "intro": { text: "오늘은 무엇을 연구하시겠습니까?", choices: [
        { text: "탐사", action: "explore" },
        { text: "연구원과 토론", action: "debate_with_researchers" },
        { text: "심포지엄 개최", action: "hold_symposium" },
        { text: "자원 생성", action: "show_resource_gathering_options" },
        { text: "연구 시설 관리", action: "show_facility_management_options" },
        { text: "사색의 시간", action: "show_contemplation_options" },
        { text: "오늘의 논리 퍼즐", action: "play_minigame" }
    ]},
    "action_resource_gathering": { 
        text: "어떤 자원을 생성하시겠습니까?",
        choices: [
            { text: "연산력 확보", action: "gather_computing_power" },
            { text: "재료 합성", action: "synthesize_materials" },
            { text: "에너지 변환", action: "convert_energy" },
            { text: "취소", action: "return_to_intro" }
        ]
    },
    "action_facility_management": { text: "어떤 연구 시설을 관리하시겠습니까?", choices: [] },
    "contemplation_menu": {
        text: "어떤 사색에 잠기시겠습니까?",
        choices: [
            { text: "알고리즘 실행 (행동력 1 소모)", action: "run_algorithm" },
            { text: "레거시 코드 디버깅 (행동력 1 소모)", action: "debug_legacy_code" },
            { text: "취소", action: "return_to_intro" }
        ]
    },
    // Game Over Scenarios
    "game_over_logic": { text: "치명적인 논리 오류로 연구가 미궁에 빠졌습니다. 연구소는 무기한 폐쇄됩니다.", choices: [], final: true },
    "game_over_knowledge": { text: "지식의 한계에 부딪혔습니다. 더 이상 새로운 이론을 만들 수 없습니다.", choices: [], final: true },
    "game_over_efficiency": { text: "비효율적인 시스템이 연구소를 마비시켰습니다. 모든 것이 정지했습니다.", choices: [], final: true },
    "game_over_resources": { text: "연구 자원이 모두 고갈되어 더 이상 연구소를 운영할 수 없습니다.", choices: [], final: true },
};

const exploreOutcomes = [
    { weight: 30, condition: (gs) => gs.knowledge > 60, effect: (gs) => { const v = getRandomValue(10, 5); return { changes: { innovation: gs.innovation + v }, message: `미지의 영역을 탐사하여 새로운 혁신을 발견했습니다! (+${v} 혁신)` }; } },
    { weight: 25, condition: () => true, effect: (gs) => { const v = getRandomValue(5, 2); return { changes: { concentration: gs.concentration + v }, message: `탐사에 몰두하여 집중력이 향상되었습니다. (+${v} 집중)` }; } },
    { weight: 20, condition: () => true, effect: (gs) => { const v = getRandomValue(5, 2); return { changes: { resources: { ...gs.resources, materials: gs.resources.materials - v } }, message: `탐사 중 장비가 고장나 재료를 잃었습니다. (-${v} 재료)` }; } },
    { weight: 15, condition: (gs) => gs.knowledge < 40, effect: (gs) => { const v = getRandomValue(5, 2); return { changes: { logic: gs.logic - v }, message: `잘못된 지식으로 탐사 경로 설정에 실패했습니다. (-${v} 논리)` }; } },
];

const debateOutcomes = [
    { weight: 40, condition: (gs, researcher) => researcher.cooperation < 80, effect: (gs, researcher) => { const v = getRandomValue(10, 5); const updated = gs.researchers.map(r => r.id === researcher.id ? { ...r, cooperation: Math.min(100, r.cooperation + v) } : r); return { changes: { researchers: updated }, message: `${researcher.name}${getWaGwaParticle(researcher.name)}의 날카로운 토론으로 협력도가 상승했습니다. (+${v} 협력도)` }; } },
    { weight: 30, condition: () => true, effect: (gs, researcher) => { const v = getRandomValue(5, 2); return { changes: { knowledge: gs.knowledge + v }, message: `${researcher.name}에게서 새로운 지식을 습득했습니다. (+${v} 지식)` }; } },
    { weight: 20, condition: (gs) => gs.logic < 40, effect: (gs, researcher) => { const v = getRandomValue(10, 3); const updated = gs.researchers.map(r => r.id === researcher.id ? { ...r, cooperation: Math.max(0, r.cooperation - v) } : r); return { changes: { researchers: updated }, message: `당신의 논리가 부족하여 ${researcher.name}이(가) 당신을 무시합니다. (-${v} 협력도)` }; } },
];

const symposiumOutcomes = [
    { weight: 40, condition: (gs) => gs.knowledge > 60, effect: (gs) => { const v = getRandomValue(10, 3); return { changes: { innovation: gs.innovation + v }, message: `성공적인 심포지엄으로 연구소의 혁신이 가속화됩니다. (+${v} 혁신)` }; } },
    { weight: 30, condition: () => true, effect: (gs) => { const v = getRandomValue(10, 3); return { changes: { efficiency: gs.efficiency + v }, message: `심포지엄을 통해 비효율적인 프로세스를 개선했습니다. (+${v} 효율)` }; } },
    { weight: 20, condition: (gs) => gs.logic < 40, effect: (gs) => { const v = getRandomValue(10, 4); return { changes: { concentration: gs.concentration - v }, message: `논리적 허점으로 인해 심포지엄이 길어져 집중력을 잃었습니다. (-${v} 집중)` }; } },
];

const minigames = [
    {
        name: "논리 회로 퍼즐",
        description: "주어진 입출력에 맞게 논리 게이트를 연결하여 올바른 회로를 완성하세요.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 0, stage: 1, problem: { inputs: [true, false], output: true, gates: ['AND', 'OR', 'NOT'] } };
            minigames[0].render(gameArea, choicesDiv);
        },
        render: (gameArea, choicesDiv) => {
            const state = gameState.minigameState;
            gameArea.innerHTML = `<p><b>입력:</b> ${state.problem.inputs.join(', ')}</p><p><b>출력:</b> ${state.problem.output}</p><p>회로를 완성하세요:</p><div id="circuit-builder"></div>`;
            choicesDiv.innerHTML = state.problem.gates.map(gate => `<button class="choice-btn">${gate}</button>`).join('');
            choicesDiv.querySelectorAll('.choice-btn').forEach(button => button.addEventListener('click', () => minigames[0].processAction('select_gate', button.innerText)));
        },
        processAction: (actionType, value) => {
            // Simplified logic for placeholder
            if (actionType === 'select_gate') {
                gameState.minigameState.score += 50;
                minigames[0].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[0].name, gameState.minigameState.score);
            updateState({ logic: gameState.logic + rewards.logic, knowledge: gameState.knowledge + rewards.knowledge, currentScenarioId: 'intro' }, rewards.message);
        }
    },
];

function calculateMinigameReward(minigameName, score) {
    let rewards = { logic: 0, knowledge: 0, message: "" };
    if (score >= 50) { rewards.logic = 15; rewards.knowledge = 10; rewards.message = `완벽한 회로입니다! (+15 논리, +10 지식)`; } 
    else { rewards.logic = 5; rewards.message = `회로를 완성했습니다. (+5 논리)`; }
    return rewards;
}

function spendActionPoint() {
    if (gameState.actionPoints <= 0) { updateGameDisplay("행동력이 부족합니다."); return false; }
    updateState({ actionPoints: gameState.actionPoints - 1 });
    return true;
}

const gameActions = {
    explore: () => {
        if (!spendActionPoint()) return;
        const possibleOutcomes = exploreOutcomes.filter(o => !o.condition || o.condition(gameState));
        const totalWeight = possibleOutcomes.reduce((sum, o) => sum + o.weight, 0);
        const rand = currentRandFn() * totalWeight;
        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(o => (cumulativeWeight += o.weight) >= rand) || possibleOutcomes[0];
        const result = chosenOutcome.effect(gameState);
        updateState(result.changes, result.message);
    },
    debate_with_researchers: () => {
        if (!spendActionPoint()) return;
        const researcher = gameState.researchers[Math.floor(currentRandFn() * gameState.researchers.length)];
        const possibleOutcomes = debateOutcomes.filter(o => !o.condition || o.condition(gameState, researcher));
        const totalWeight = possibleOutcomes.reduce((sum, o) => sum + o.weight, 0);
        const rand = currentRandFn() * totalWeight;
        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(o => (cumulativeWeight += o.weight) >= rand) || possibleOutcomes[0];
        const result = chosenOutcome.effect(gameState, researcher);
        updateState(result.changes, result.message);
    },
    hold_symposium: () => {
        if (!spendActionPoint()) return;
        const possibleOutcomes = symposiumOutcomes.filter(o => !o.condition || o.condition(gameState));
        const totalWeight = possibleOutcomes.reduce((sum, o) => sum + o.weight, 0);
        const rand = currentRandFn() * totalWeight;
        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(o => (cumulativeWeight += o.weight) >= rand) || possibleOutcomes[0];
        const result = chosenOutcome.effect(gameState);
        updateState(result.changes, result.message);
    },
    show_resource_gathering_options: () => updateState({ currentScenarioId: 'action_resource_gathering' }),
    show_facility_management_options: () => updateState({ currentScenarioId: 'action_facility_management' }),
    show_contemplation_options: () => updateState({ currentScenarioId: 'contemplation_menu' }),
    gather_computing_power: () => {
        if (!spendActionPoint()) return;
        const gain = getRandomValue(10, 4);
        updateState({ resources: { ...gameState.resources, computing_power: gameState.resources.computing_power + gain } }, `연산력을 확보했습니다. (+${gain} 연산력)`);
    },
    synthesize_materials: () => {
        if (!spendActionPoint()) return;
        const gain = getRandomValue(10, 4);
        updateState({ resources: { ...gameState.resources, materials: gameState.resources.materials + gain } }, `재료를 합성했습니다. (+${gain} 재료)`);
    },
    convert_energy: () => {
        if (!spendActionPoint()) return;
        const gain = getRandomValue(5, 2);
        updateState({ resources: { ...gameState.resources, energy: gameState.resources.energy + gain } }, `에너지를 변환했습니다. (+${gain} 에너지)`);
    },
    build_dataArchive: () => {
        if (!spendActionPoint()) return;
        const cost = { materials: 50, energy: 20 };
        if (gameState.resources.materials >= cost.materials && gameState.resources.energy >= cost.energy) {
            gameState.research_facilities.dataArchive.built = true;
            const v = getRandomValue(10, 3);
            updateState({ knowledge: gameState.knowledge + v, resources: { ...gameState.resources, materials: gameState.resources.materials - cost.materials, energy: gameState.resources.energy - cost.energy } }, `데이터 아카이브를 구축했습니다! (+${v} 지식)`);
        } else { updateState({}, "자원이 부족합니다."); }
    },
    build_fabricationRoom: () => {
        if (!spendActionPoint()) return;
        const cost = { energy: 30, materials: 30 };
        if (gameState.resources.energy >= cost.energy && gameState.resources.materials >= cost.materials) {
            gameState.research_facilities.fabricationRoom.built = true;
            const v = getRandomValue(10, 3);
            updateState({ efficiency: gameState.efficiency + v, resources: { ...gameState.resources, energy: gameState.resources.energy - cost.energy, materials: gameState.resources.materials - cost.materials } }, `제작실을 구축했습니다! (+${v} 효율)`);
        } else { updateState({}, "자원이 부족합니다."); }
    },
    build_centralControl: () => {
        if (!spendActionPoint()) return;
        const cost = { materials: 100, energy: 50 };
        if (gameState.resources.materials >= cost.materials && gameState.resources.energy >= cost.energy) {
            gameState.research_facilities.centralControl.built = true;
            const v = getRandomValue(15, 5);
            updateState({ innovation: gameState.innovation + v, resources: { ...gameState.resources, materials: gameState.resources.materials - cost.materials, energy: gameState.resources.energy - cost.energy } }, `중앙 통제실을 건설했습니다! (+${v} 혁신)`);
        } else { updateState({}, "자원이 부족합니다."); }
    },
    build_theoryLibrary: () => {
        if (!spendActionPoint()) return;
        const cost = { energy: 80, materials: 40 };
        if (gameState.resources.energy >= cost.energy && gameState.resources.materials >= cost.materials) {
            gameState.research_facilities.theoryLibrary.built = true;
            const v = getRandomValue(15, 5);
            updateState({ knowledge: gameState.knowledge + v, resources: { ...gameState.resources, energy: gameState.resources.energy - cost.energy, materials: gameState.resources.materials - cost.materials } }, `이론 라이브러리를 구축했습니다! (+${v} 지식)`);
        } else { updateState({}, "자원이 부족합니다."); }
    },
    build_advancedLab: () => {
        if (!spendActionPoint()) return;
        const cost = { energy: 150, quantum_bits: 5 };
        if (gameState.resources.energy >= cost.energy && gameState.resources.quantum_bits >= cost.quantum_bits) {
            gameState.research_facilities.advancedLab.built = true;
            const v = getRandomValue(20, 5);
            updateState({ innovation: gameState.innovation + v, resources: { ...gameState.resources, energy: gameState.resources.energy - cost.energy, quantum_bits: gameState.resources.quantum_bits - cost.quantum_bits } }, `고등 연구실을 도입했습니다! (+${v} 혁신)`);
        } else { updateState({}, "자원이 부족합니다."); }
    },
    maintain_facility: (params) => {
        if (!spendActionPoint()) return;
        const facilityKey = params.facility;
        const cost = { energy: 10, materials: 10 };
        if (gameState.resources.energy >= cost.energy && gameState.resources.materials >= cost.materials) {
            gameState.research_facilities[facilityKey].durability = 100;
            updateState({ resources: { ...gameState.resources, energy: gameState.resources.energy - cost.energy, materials: gameState.resources.materials - cost.materials } }, `${gameState.research_facilities[facilityKey].name} 시설을 최적화했습니다.`);
        } else { updateState({}, "자원이 부족합니다."); }
    },
    run_algorithm: () => {
        if (!spendActionPoint()) return;
        const rand = currentRandFn();
        if (rand < 0.3) {
            const v = getRandomValue(1, 1);
            updateState({ resources: { ...gameState.resources, quantum_bits: (gameState.resources.quantum_bits || 0) + v } }, `알고리즘 실행 중 양자적 얽힘을 발견했습니다! (+${v} 양자 비트)`);
        } else {
            const v = getRandomValue(10, 5);
            updateState({ resources: { ...gameState.resources, computing_power: gameState.resources.computing_power + v } }, `알고리즘 최적화로 연산력을 추가 확보했습니다. (+${v} 연산력)`);
        }
    },
    debug_legacy_code: () => {
        if (!spendActionPoint()) return;
        const rand = currentRandFn();
        if (rand < 0.6) {
            const v = getRandomValue(10, 5);
            updateState({ resources: { ...gameState.resources, algorithms: gameState.resources.algorithms + v } }, `레거시 코드에서 유용한 알고리즘을 발견했습니다. (+${v} 알고리즘)`);
        } else {
            updateState({}, `디버깅에 실패했습니다. 코드는 미궁에 빠졌습니다.`);
        }
    },
    play_minigame: () => {
        if (!spendActionPoint()) return;
        const minigame = minigames[0];
        gameState.currentScenarioId = `minigame_${minigame.name}`;
        updateState({ dailyActions: { ...gameState.dailyActions, minigamePlayed: true } });
        updateGameDisplay(minigame.description);
        minigame.start(document.getElementById('gameArea'), document.getElementById('gameChoices'));
    },
    return_to_intro: () => updateState({ currentScenarioId: 'intro' }),
    manualNextDay: () => {
        if (gameState.manualDayAdvances >= 5) { updateGameDisplay("오늘은 더 이상 다음 날로 넘어갈 수 없습니다."); return; }
        updateState({
            manualDayAdvances: gameState.manualDayAdvances + 1,
            day: gameState.day + 1,
            dailyEventTriggered: false
        });
        processDailyEvents();
    },
};

function applyStatEffects() {
    let message = "";
    if (gameState.logic >= 70) { message += "뛰어난 논리로 연구 성공률이 증가합니다. "; }
    if (gameState.knowledge >= 70) { const v = getRandomValue(5, 2); gameState.resources.algorithms += v; message += `방대한 지식을 기반으로 새로운 알고리즘을 발견했습니다. (+${v} 알고리즘) `; }
    if (gameState.efficiency >= 70) { const v = getRandomValue(2, 1); gameState.researchers.forEach(r => r.cooperation = Math.min(100, r.cooperation + v)); message += `효율적인 시스템 덕분에 연구원들의 협력도가 상승합니다. (+${v} 협력도) `; }
    if (gameState.innovation < 30) { gameState.actionPoints -= 1; message += "혁신이 정체되어 집중력이 1 감소합니다. "; }
    if (gameState.concentration < 30) { Object.keys(gameState.research_facilities).forEach(key => { if(gameState.research_facilities[key].built) gameState.research_facilities[key].durability -= 1; }); message += "집중력 저하로 연구 시설들이 노후화됩니다. "; }
    return message;
}

const weightedDailyEvents = [
    { id: "server_overload", weight: 10, condition: () => gameState.resources.computing_power < 20, onTrigger: () => { const v = getRandomValue(10, 3); updateState({ resources: { ...gameState.resources, computing_power: Math.max(0, gameState.resources.computing_power - v) }, efficiency: gameState.efficiency - v }, `서버 과부하로 연산력이 손실되고 효율성이 저하됩니다. (-${v} 연산력, -${v} 효율)`); } },
    { id: "research_breakthrough", weight: 5, condition: () => true, onTrigger: () => { const v = getRandomValue(1, 1); updateState({ resources: { ...gameState.resources, breakthroughs: (gameState.resources.breakthroughs || 0) + v }, innovation: gameState.innovation + 10 }, `연구에 돌파구가 생겼습니다! (+${v} 기술 혁신, +10 혁신)`); } },
    { id: "hacking_attempt", weight: 10, condition: () => true, onTrigger: () => { const v = getRandomValue(10, 5); updateState({ resources: { ...gameState.resources, data: Math.max(0, gameState.resources.data - v) } }, `외부 해킹 시도로 데이터를 일부 잃었습니다. (-${v} 데이터)`); } },
];

function processDailyEvents() {
    if (gameState.dailyEventTriggered) return;
    currentRandFn = mulberry32(getDailySeed() + gameState.day);
    updateState({ actionPoints: 10, dailyEventTriggered: true });
    const statEffectMessage = applyStatEffects();
    let dailyMessage = "새로운 연구의 날이 밝았습니다. " + statEffectMessage;

    if (gameState.logic <= 0) { gameState.currentScenarioId = "game_over_logic"; }
    else if (gameState.knowledge <= 0) { gameState.currentScenarioId = "game_over_knowledge"; }
    else if (gameState.efficiency <= 0) { gameState.currentScenarioId = "game_over_efficiency"; }
    else if (gameState.resources.computing_power <= 0 && gameState.day > 1) { gameState.currentScenarioId = "game_over_resources"; }

    let eventId = "intro";
    const possibleEvents = weightedDailyEvents.filter(event => !event.condition || event.condition());
    if (possibleEvents.length > 0) {
        const totalWeight = possibleEvents.reduce((sum, event) => sum + event.weight, 0);
        const rand = currentRandFn() * totalWeight;
        let cumulativeWeight = 0;
        let chosenEvent = possibleEvents.find(event => (cumulativeWeight += event.weight) >= rand);
        if (chosenEvent) {
            eventId = chosenEvent.id;
            if (chosenEvent.onTrigger) chosenEvent.onTrigger();
        }
    }
    if (!gameScenarios[gameState.currentScenarioId]) {
        gameState.currentScenarioId = eventId;
    }
    updateGameDisplay(dailyMessage + (gameScenarios[gameState.currentScenarioId]?.text || ''));
    renderChoices(gameScenarios[gameState.currentScenarioId]?.choices || []);
    saveGameState();
}

function initDailyGame() {
    loadGameState();
}

function resetGame() {
    if (confirm("정말로 연구소를 폐쇄하시겠습니까? 모든 데이터가 사라집니다.")) {
        localStorage.removeItem('intpLabGame');
        resetGameState();
        saveGameState();
        location.reload();
    }
}

window.onload = function() {
    try {
        initDailyGame();
        document.getElementById('resetGameBtn').addEventListener('click', resetGame);
        document.getElementById('nextDayBtn').addEventListener('click', gameActions.manualNextDay);
    } catch (e) {
        console.error("오늘의 게임 생성 중 오류 발생:", e);
        document.getElementById('gameDescription').innerText = "콘텐츠를 불러오는 데 실패했습니다. 페이지를 새로고침해 주세요.";
    }
};
