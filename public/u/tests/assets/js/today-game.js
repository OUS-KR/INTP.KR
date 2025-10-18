// today-game.js - INTP - 지식의 연구소 (Knowledge Lab)

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
    if (!word || word.length === 0) return "";
    const lastChar = word[word.length - 1];
    const uni = lastChar.charCodeAt(0);
    if (uni < 0xAC00 || uni > 0xD7A3) return "를";
    return (uni - 0xAC00) % 28 > 0 ? "을" : "를";
}

function getWaGwaParticle(word) {
    if (!word || word.length === 0) return "";
    const lastChar = word[word.length - 1];
    const uni = lastChar.charCodeAt(0);
    if (uni < 0xAC00 || uni > 0xD7A3) return "와";
    return (uni - 0xAC00) % 28 > 0 ? "과" : "와";
}

function showFeedback(isSuccess, message) {
    const feedbackMessage = document.getElementById('feedbackMessage');
    if (feedbackMessage) {
        feedbackMessage.innerText = message;
        feedbackMessage.className = `feedback-message ${isSuccess ? 'correct' : 'incorrect'}`;
    }
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
        actionPoints: 10, // Internally actionPoints, but represents '행동력' in UI
        maxActionPoints: 10,
        resources: { computing_power: 10, materials: 10, energy: 5, quantum_bits: 0 },
        researchers: [
            { id: "max", name: "맥스", personality: "분석적", skill: "물리학", trust: 70 },
            { id: "eliza", name: "엘리자", personality: "탐구적", skill: "정보학", trust: 60 }
        ],
        maxResearchers: 5,
        currentScenarioId: "intro",
        lastPlayedDate: new Date().toISOString().slice(0, 10),
        manualDayAdvances: 0,
        dailyEventTriggered: false,
        dailyBonus: { researchSuccess: 0 }, // Re-themed from gatheringSuccess
        dailyActions: { explored: false, discussed: false, symposiaHeld: false, minigamePlayed: false }, // Re-themed
        researchFacilities: {
            dataArchive: { built: false, durability: 100, name: "데이터 아카이브", description: "방대한 데이터를 저장하고 관리합니다.", effect_description: "지식 및 연산력 증가." },
            fabricationLab: { built: false, durability: 100, name: "제작실", description: "새로운 재료와 장비를 제작합니다.", effect_description: "재료 및 혁신 증가." },
            centralControl: { built: false, durability: 100, name: "중앙 통제실", description: "연구소의 모든 시스템을 효율적으로 제어합니다.", effect_description: "효율성 및 논리 증가." },
            theoryLibrary: { built: false, durability: 100, name: "이론 라이브러리", description: "다양한 이론과 가설을 탐구합니다.", effect_description: "지식 및 집중 증가." },
            advancedLab: { built: false, durability: 100, name: "고등 연구실", description: "최첨단 기술을 연구하고 양자 비트를 생성합니다.", effect_description: "양자 비트 및 혁신 증가." }
        },
        labLevel: 0, // Re-themed from toolsLevel
        minigameState: {}
    };
    currentRandFn = mulberry32(getDailySeed() + gameState.day);
}

function saveGameState() {
    localStorage.setItem('intpKnowledgeLabGame', JSON.stringify(gameState));
}

function loadGameState() {
    const savedState = localStorage.getItem('intpKnowledgeLabGame');
    const today = new Date().toISOString().slice(0, 10);
    if (savedState) {
        let loaded = JSON.parse(savedState);
        // Patch for old save files
        if (!loaded.dailyBonus) loaded.dailyBonus = { researchSuccess: 0 };
        if (!loaded.researchers || loaded.researchers.length === 0) {
            loaded.researchers = [
                { id: "max", name: "맥스", personality: "분석적", skill: "물리학", trust: 70 },
                { id: "eliza", name: "엘리자", personality: "탐구적", skill: "정보학", trust: 60 }
            ];
        }
        // Ensure new stats are initialized if loading old save
        if (loaded.logic === undefined) loaded.logic = 50;
        if (loaded.knowledge === undefined) loaded.knowledge = 50;
        if (loaded.efficiency === undefined) loaded.efficiency = 50;
        if (loaded.innovation === undefined) loaded.innovation = 50;
        if (loaded.concentration === undefined) loaded.concentration = 50;
        if (loaded.labLevel === undefined) loaded.labLevel = 0;

        Object.assign(gameState, loaded);

        // Always initialize currentRandFn after loading state
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
    const researcherListHtml = gameState.researchers.map(r => `<li>${r.name} (${r.skill}) - 신뢰도: ${r.trust}</li>`).join('');
    statsDiv.innerHTML = `
        <p><b>날짜:</b> ${gameState.day}일</p>
        <p><b>행동력:</b> ${gameState.actionPoints}/${gameState.maxActionPoints}</p>
        <p><b>논리:</b> ${gameState.logic} | <b>지식:</b> ${gameState.knowledge} | <b>효율:</b> ${gameState.efficiency} | <b>혁신:</b> ${gameState.innovation} | <b>집중:</b> ${gameState.concentration}</p>
        <p><b>자원:</b> 연산력 ${gameState.resources.computing_power}, 재료 ${gameState.resources.materials}, 에너지 ${gameState.resources.energy}, 양자 비트 ${gameState.resources.quantum_bits || 0}</p>
        <p><b>연구소 레벨:</b> ${gameState.labLevel}</p>
        <p><b>연구원 (${gameState.researchers.length}/${gameState.maxResearchers}):</b></p>
        <ul>${researcherListHtml}</ul>
        <p><b>구축된 연구 시설:</b></p>
        <ul>${Object.values(gameState.researchFacilities).filter(f => f.built).map(f => `<li>${f.name} (내구도: ${f.durability}) - ${f.effect_description}</li>`).join('') || '없음'}</ul>
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
        dynamicChoices = gameScenarios.action_facility_management.choices ? [...gameScenarios.action_facility_management.choices] : [];
        // Build options
        if (!gameState.researchFacilities.dataArchive.built) dynamicChoices.push({ text: "데이터 아카이브 구축 (연산력 50, 재료 20)", action: "build_dataArchive" });
        if (!gameState.researchFacilities.fabricationLab.built) dynamicChoices.push({ text: "제작실 구축 (재료 30, 에너지 30)", action: "build_fabricationLab" });
        if (!gameState.researchFacilities.centralControl.built) dynamicChoices.push({ text: "중앙 통제실 구축 (연산력 100, 재료 50, 에너지 50)", action: "build_centralControl" });
        if (!gameState.researchFacilities.theoryLibrary.built) dynamicChoices.push({ text: "이론 라이브러리 구축 (재료 80, 에너지 40)", action: "build_theoryLibrary" });
        if (gameState.researchFacilities.fabricationLab.built && gameState.researchFacilities.fabricationLab.durability > 0 && !gameState.researchFacilities.advancedLab.built) {
            dynamicChoices.push({ text: "고등 연구실 구축 (재료 50, 에너지 100)", action: "build_advancedLab" });
        }
        // Maintenance options
        Object.keys(gameState.researchFacilities).forEach(key => {
            const facility = gameState.researchFacilities[key];
            if (facility.built && facility.durability < 100) {
                dynamicChoices.push({ text: `${facility.name} 유지보수 (재료 10, 에너지 10)`, action: "maintain_facility", params: { facility: key } });
            }
        });
        dynamicChoices.push({ text: "취소", action: "return_to_intro" });
    } else { // For any other scenario, use its predefined choices
        dynamicChoices = choices ? [...choices] : [];
    }

    choicesDiv.innerHTML = dynamicChoices.map(choice => `<button class="choice-btn" data-action="${choice.action}" data-params='${JSON.stringify(choice.params || {})}'>${choice.text}</button>`).join('');
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

// --- Game Data ---
const gameScenarios = {
    "intro": { text: "지식의 연구소에서 무엇을 할까요?", choices: [
        { text: "탐사하기", action: "explore_area" },
        { text: "연구원과 토론하기", action: "discuss_with_researcher" },
        { text: "심포지엄 개최", action: "hold_symposium" },
        { text: "자원 생성", action: "show_resource_generation_options" },
        { text: "연구 시설 관리", action: "show_facility_management_options" },
        { text: "사색의 시간", action: "show_contemplation_options" },
        { text: "오늘의 발견", action: "play_minigame" }
    ]},
    "daily_event_server_overload": {
        text: "", // Set by onTrigger
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "daily_event_research_breakthrough": {
        text: "", // Set by onTrigger
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "daily_event_system_hacking": {
        text: "연구소 시스템에 해킹 시도가 감지되었습니다. 연구소의 효율이 흔들리고 있습니다.",
        choices: [
            { text: "보안 시스템을 강화하고 해킹을 방어한다 (행동력 1 소모)", action: "defend_hacking" },
            { text: "해킹을 무시하고 연구에 집중한다", action: "ignore_hacking" }
        ]
    },
    "daily_event_resource_depletion": {
        text: "", // Set by onTrigger
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "daily_event_researcher_dispute": {
        text: "맥스와 엘리자 사이에 연구 방향에 대한 작은 의견 차이가 생겼습니다. 둘 다 당신의 판단을 기다리는 것 같습니다.",
        choices: [
            { text: "맥스의 관점을 먼저 들어준다.", action: "handle_researcher_dispute", params: { first: "max", second: "eliza" } },
            { text: "엘리자의 관점을 먼저 들어준다.", action: "handle_researcher_dispute", params: { first: "eliza", second: "max" } },
            { text: "둘을 불러 효율적인 해결책을 찾는다.", action: "mediate_researcher_dispute" },
            { text: "신경 쓰지 않는다.", action: "ignore_event" }
        ]
    },
    "daily_event_new_researcher": {
        choices: [
            { text: "유능한 인재를 영입한다.", action: "welcome_new_unique_researcher" },
            { text: "연구소에 필요한지 좀 더 지켜본다.", action: "observe_researcher" },
            { text: "정중히 거절한다.", action: "reject_researcher" }
        ]
    },
    "daily_event_external_funding": {
        text: "외부 기관에서 연구 자금 지원을 제안했습니다. 그들은 [연산력 50개]를 [양자 비트 5개]와 교환하자고 제안합니다.",
        choices: [
            { text: "제안을 수락한다", action: "accept_funding" },
            { text: "제안을 거절한다", action: "decline_funding" }
        ]
    },
    "daily_event_theory_breakdown": {
        text: "연구 중 핵심 이론에 중대한 결함이 발견되었습니다. 연구소의 논리가 흔들리고 있습니다.",
        choices: [
            { text: "이론의 결함을 분석하고 재정립한다 (행동력 1 소모)", action: "reestablish_theory" },
            { text: "결함을 무시하고 연구를 계속한다", action: "ignore_theory_breakdown" }
        ]
    },
    "daily_event_innovation_crisis": {
        text: "갑자기 새로운 아이디어가 떠오르지 않습니다. 연구소의 혁신이 침체되는 것 같습니다.",
        choices: [
            { text: "새로운 관점을 탐색한다 (행동력 1 소모)", action: "seek_new_perspective" },
            { text: "기존 연구에 집중한다", action: "focus_on_existing_research" }
        ]
    },
    "game_over_logic": { text: "연구소의 논리가 붕괴되어 더 이상 합리적인 판단을 내릴 수 없습니다. 지식의 연구소는 혼란에 빠졌습니다.", choices: [], final: true },
    "game_over_knowledge": { text: "연구소의 지식이 고갈되어 더 이상 새로운 기술을 개발할 수 없습니다. 연구는 중단되었습니다.", choices: [], final: true },
    "game_over_efficiency": { text: "연구소의 효율이 바닥을 쳤습니다. 모든 작업이 지연되고 자원이 낭비됩니다.", choices: [], final: true },
    "game_over_innovation": { text: "연구소의 혁신이 사라져 모든 연구원들이 목표를 잃었습니다. 지식의 연구소는 폐쇄되었습니다.", choices: [], final: true },
    "game_over_concentration": { text: "연구원들의 집중력이 바닥을 쳤습니다. 더 이상 정밀한 연구를 진행할 수 없습니다.", choices: [], final: true },
    "game_over_resources": { text: "연구소의 자원이 모두 고갈되어 더 이상 운영할 수 없습니다.", choices: [], final: true },
    "action_resource_generation": {
        text: "어떤 자원을 생성하시겠습니까?",
        choices: [
            { text: "연산력 생성", action: "generate_computing_power" },
            { text: "재료 수집", action: "gather_materials" },
            { text: "에너지 확보", "action": "secure_energy" },
            { text: "취소", "action": "return_to_intro" }
        ]
    },
    "action_facility_management": {
        text: "어떤 연구 시설을 관리하시겠습니까?",
        choices: [] // Choices will be dynamically added in renderChoices
    },
    "resource_generation_result": {
        text: "", // Text will be set dynamically by updateGameDisplay
        choices: [{ text: "확인", action: "show_resource_generation_options" }] // Return to gathering menu
    },
    "facility_management_result": {
        text: "", // Text will be set dynamically by updateGameDisplay
        choices: [{ text: "확인", action: "show_facility_management_options" }] // Return to facility management menu
    },
    "researcher_dispute_resolution_result": {
        text: "", // This will be set dynamically
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "hacking_defense_result": {
        text: "", // This will be set dynamically
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "theory_reestablishment_result": {
        text: "", // This will be set dynamically
        choices: [{ text: "확인", action: "return_to_intro" }]
    },
    "contemplation_menu": {
        text: "어떤 사색의 시간을 가지시겠습니까?",
        choices: [
            { text: "알고리즘 실행 (행동력 1 소모)", action: "execute_algorithm" },
            { text: "레거시 코드 디버깅 (행동력 1 소모)", action: "debug_legacy_code" },
            { text: "취소", action: "return_to_intro" }
        ]
    },
};

const symposiumOutcomes = [
    {
        condition: (gs) => gs.efficiency < 40,
        weight: 40,
        effect: (gs) => {
            const efficiencyLoss = getRandomValue(10, 4);
            const innovationLoss = getRandomValue(5, 2);
            const logicLoss = getRandomValue(5, 2);
            return {
                changes: { efficiency: gs.efficiency - efficiencyLoss, innovation: gs.innovation - innovationLoss, logic: gs.logic - logicLoss },
                message: "심포지엄이 시작되자마자 연구원들의 불만이 터져 나왔습니다. 낮은 효율성으로 인해 분위기가 험악합니다. (-${efficiencyLoss} 효율, -${innovationLoss} 혁신, -${logicLoss} 논리)"
            };
        }
    },
    {
        condition: (gs) => gs.logic > 70 && gs.knowledge > 60,
        weight: 30,
        effect: (gs) => {
            const efficiencyGain = getRandomValue(15, 5);
            const innovationGain = getRandomValue(10, 3);
            const logicGain = getRandomValue(10, 3);
            return {
                changes: { efficiency: gs.efficiency + efficiencyGain, innovation: gs.innovation + innovationGain, logic: gs.logic + logicGain },
                message: "높은 논리와 지식을 바탕으로 건설적인 심포지엄이 진행되었습니다! (+${efficiencyGain} 효율, +${innovationGain} 혁신, +${logicGain} 논리)"
            };
        }
    },
    {
        condition: (gs) => gs.resources.computing_power < gs.researchers.length * 4,
        weight: 25,
        effect: (gs) => {
            const knowledgeGain = getRandomValue(10, 3);
            const logicGain = getRandomValue(5, 2);
            return {
                changes: { knowledge: gs.knowledge + knowledgeGain, logic: gs.logic + logicGain },
                message: "연산력이 부족한 상황에 대해 논의했습니다. 모두가 효율적인 자원 관리에 동의하며 당신의 리더십을 신뢰했습니다. (+${knowledgeGain} 지식, +${logicGain} 논리)"
            };
        }
    },
    {
        condition: (gs) => gs.researchers.some(r => r.trust < 50),
        weight: 20,
        effect: (gs) => {
            const researcher = gs.researchers.find(r => r.trust < 50);
            const trustGain = getRandomValue(10, 4);
            const efficiencyGain = getRandomValue(5, 2);
            const logicGain = getRandomValue(5, 2);
            const updatedResearchers = gs.researchers.map(r => r.id === researcher.id ? { ...r, trust: Math.min(100, r.trust + trustGain) } : r);
            return {
                changes: { researchers: updatedResearchers, efficiency: gs.efficiency + efficiencyGain, logic: gs.logic + logicGain },
                message: "심포지엄 중, ${researcher.name}이(가) 조심스럽게 불만을 토로했습니다. 그의 의견을 존중하고 해결을 약속하자 신뢰를 얻었습니다. (+${trustGain} ${researcher.name} 신뢰도, +${efficiencyGain} 효율, +${logicGain} 논리)"
            };
        }
    },
    {
        condition: () => true, // Default positive outcome
        weight: 20,
        effect: (gs) => {
            const efficiencyGain = getRandomValue(5, 2);
            const innovationGain = getRandomValue(3, 1);
            return {
                changes: { efficiency: gs.efficiency + efficiencyGain, innovation: gs.innovation + innovationGain },
                message: "평범한 심포지엄이었지만, 모두가 한자리에 모여 지식을 나눈 것만으로도 의미가 있었습니다. (+${efficiencyGain} 효율, +${innovationGain} 혁신)"
            };
        }
    },
    {
        condition: (gs) => gs.logic < 40 || gs.knowledge < 40,
        weight: 25, // Increased weight when conditions met
        effect: (gs) => {
            const efficiencyLoss = getRandomValue(5, 2);
            const innovationLoss = getRandomValue(5, 2);
            const logicLoss = getRandomValue(5, 2);
            return {
                changes: { efficiency: gs.efficiency - efficiencyLoss, innovation: gs.innovation - innovationLoss, logic: gs.logic - logicLoss },
                message: "심포지엄은 길어졌지만, 의견 차이만 확인하고 끝났습니다. 연구원들의 효율과 혁신, 당신의 논리가 약간 감소했습니다. (-${efficiencyLoss} 효율, -${innovationLoss} 혁신, -${logicLoss} 논리)"
            };
        }
    }
];

const exploreAreaOutcomes = [
    {
        condition: (gs) => gs.resources.computing_power < 20,
        weight: 30,
        effect: (gs) => {
            const computingPowerGain = getRandomValue(10, 5);
            return {
                changes: { resources: { ...gs.resources, computing_power: gs.resources.computing_power + computingPowerGain } },
                message: "탐사 중 새로운 연산 자원을 발견했습니다! (+${computingPowerGain} 연산력)"
            };
        }
    },
    {
        condition: (gs) => gs.resources.materials < 20,
        weight: 25,
        effect: (gs) => {
            const materialsGain = getRandomValue(10, 5);
            return {
                changes: { resources: { ...gs.resources, materials: gs.resources.materials + materialsGain } },
                message: "탐사 중 희귀 재료를 발견했습니다! (+${materialsGain} 재료)"
            };
        }
    },
    {
        condition: () => true, // General positive discovery
        weight: 20,
        effect: (gs) => {
            const knowledgeGain = getRandomValue(5, 2);
            const innovationGain = getRandomValue(5, 2);
            return {
                changes: { knowledge: gs.knowledge + knowledgeGain, innovation: gs.innovation + innovationGain },
                message: "탐사하며 새로운 지식과 혁신을 얻었습니다. (+${knowledgeGain} 지식, +${innovationGain} 혁신)"
            };
        }
    },
    {
        condition: () => true, // Always possible
        weight: 25, // Increased weight for more frequent occurrence
        effect: (gs) => {
            const actionLoss = getRandomValue(2, 1);
            const efficiencyLoss = getRandomValue(5, 2);
            const concentrationLoss = getRandomValue(5, 2);
            return {
                changes: { actionPoints: gs.actionPoints - actionLoss, efficiency: gs.efficiency - efficiencyLoss, concentration: gs.concentration - concentrationLoss },
                message: "탐사에 너무 깊이 빠져 행동력을 소모하고 효율과 집중이 감소했습니다. (-${actionLoss} 행동력, -${efficiencyLoss} 효율, -${concentrationLoss} 집중)"
            };
        }
    },
    {
        condition: () => true, // Always possible
        weight: 15, // Increased weight for more frequent occurrence
        effect: (gs) => {
            const logicLoss = getRandomValue(5, 2);
            const knowledgeLoss = getRandomValue(5, 2);
            return {
                changes: { logic: gs.logic - logicLoss, knowledge: gs.knowledge - knowledgeLoss },
                message: "탐사 중 예상치 못한 오류에 부딪혀 논리와 지식이 약간 감소했습니다. (-${logicLoss} 논리, -${knowledgeLoss} 지식)"
            };
        }
    }
];

const discussWithResearcherOutcomes = [
    {
        condition: (gs, researcher) => researcher.trust < 60,
        weight: 40,
        effect: (gs, researcher) => {
            const trustGain = getRandomValue(10, 5);
            const knowledgeGain = getRandomValue(5, 2);
            const logicGain = getRandomValue(5, 2);
            const updatedResearchers = gs.researchers.map(r => r.id === researcher.id ? { ...r, trust: Math.min(100, r.trust + trustGain) } : r);
            return {
                changes: { researchers: updatedResearchers, knowledge: gs.knowledge + knowledgeGain, logic: gs.logic + logicGain },
                message: "${researcher.name}${getWaGwaParticle(researcher.name)} 깊은 토론을 나누며 신뢰와 당신의 논리를 얻었습니다. (+${trustGain} ${researcher.name} 신뢰도, +${knowledgeGain} 지식, +${logicGain} 논리)"
            };
        }
    },
    {
        condition: (gs, researcher) => researcher.personality === "탐구적",
        weight: 20,
        effect: (gs, researcher) => {
            const innovationGain = getRandomValue(10, 3);
            const knowledgeGain = getRandomValue(5, 2);
            return {
                changes: { innovation: gs.innovation + innovationGain, knowledge: gs.knowledge + knowledgeGain },
                message: "${researcher.name}${getWaGwaParticle(researcher.name)}와 탐구적인 토론을 나누며 혁신과 지식이 상승했습니다. (+${innovationGain} 혁신, +${knowledgeGain} 지식)"
            };
        }
    },
    {
        condition: (gs, researcher) => researcher.skill === "물리학",
        weight: 15,
        effect: (gs, researcher) => {
            const computingPowerGain = getRandomValue(5, 2);
            return {
                changes: { resources: { ...gs.resources, computing_power: gs.resources.computing_power + computingPowerGain } },
                message: "${researcher.name}${getWaGwaParticle(researcher.name)}에게서 물리학에 대한 유용한 정보를 얻어 연산력을 추가로 확보했습니다. (+${computingPowerGain} 연산력)"
            };
        }
    },
    {
        condition: (gs, researcher) => true, // Default positive outcome
        weight: 25,
        effect: (gs, researcher) => {
            const efficiencyGain = getRandomValue(5, 2);
            const concentrationGain = getRandomValue(3, 1);
            return {
                changes: { efficiency: gs.efficiency + efficiencyGain, concentration: gs.concentration + concentrationGain },
                message: "${researcher.name}${getWaGwaParticle(researcher.name)} 소소한 토론을 나누며 효율과 당신의 집중이 조금 더 단단해졌습니다. (+${efficiencyGain} 효율, +${concentrationGain} 집중)"
            };
        }
    },
    {
        condition: (gs, researcher) => gs.efficiency < 40 || researcher.trust < 40,
        weight: 20, // Increased weight when conditions met
        effect: (gs, researcher) => {
            const trustLoss = getRandomValue(10, 3);
            const efficiencyLoss = getRandomValue(5, 2);
            const logicLoss = getRandomValue(5, 2);
            const updatedResearchers = gs.researchers.map(r => r.id === researcher.id ? { ...r, trust: Math.max(0, r.trust - trustLoss) } : r);
            return {
                changes: { researchers: updatedResearchers, efficiency: gs.efficiency - efficiencyLoss, logic: gs.logic - logicLoss },
                message: "${researcher.name}${getWaGwaParticle(researcher.name)} 토론 중 오해를 사서 신뢰도와 효율, 당신의 논리가 감소했습니다. (-${trustLoss} ${researcher.name} 신뢰도, -${efficiencyLoss} 효율, -${logicLoss} 논리)"
            };
        }
    },
    {
        condition: (gs) => gs.efficiency < 30,
        weight: 15, // Increased weight when conditions met
        effect: (gs, researcher) => {
            const actionLoss = getRandomValue(1, 0);
            const knowledgeLoss = getRandomValue(5, 2);
            return {
                changes: { actionPoints: gs.actionPoints - actionLoss, knowledge: gs.knowledge - knowledgeLoss },
                message: "${researcher.name}${getWaGwaParticle(researcher.name)} 토론이 길어졌지만, 특별한 소득은 없었습니다. 당신의 지식이 감소했습니다. (-${actionLoss} 행동력, -${knowledgeLoss} 지식)"
            };
        }
    }
];

function calculateMinigameReward(minigameName, score) {
    let rewards = { logic: 0, knowledge: 0, efficiency: 0, innovation: 0, concentration: 0, message: "" };

    switch (minigameName) {
        case "논리 회로 퍼즐":
            if (score >= 51) {
                rewards.logic = 15;
                rewards.knowledge = 10;
                rewards.efficiency = 5;
                rewards.innovation = 5;
                rewards.message = "최고의 논리 회로 설계자가 되셨습니다! (+15 논리, +10 지식, +5 효율, +5 혁신)";
            } else if (score >= 21) {
                rewards.logic = 10;
                rewards.knowledge = 5;
                rewards.efficiency = 3;
                rewards.message = "훌륭한 논리 회로입니다! (+10 논리, +5 지식, +3 효율)";
            } else if (score >= 0) {
                rewards.logic = 5;
                rewards.message = "논리 회로 퍼즐을 완료했습니다. (+5 논리)";
            } else {
                rewards.message = "논리 회로 퍼즐을 완료했지만, 아쉽게도 보상은 없습니다.";
            }
            break;
        case "시스템 최적화": // Placeholder for now, but re-themed
            rewards.efficiency = 2;
            rewards.concentration = 1;
            rewards.message = "시스템 최적화를 완료했습니다. (+2 효율, +1 집중)";
            break;
        case "알고리즘 설계 챌린지": // Placeholder for now, but re-themed
            rewards.innovation = 2;
            rewards.logic = 1;
            rewards.message = "알고리즘 설계 챌린지를 완료했습니다. (+2 혁신, +1 논리)";
            break;
        case "이론 검증 시뮬레이션": // Placeholder for now, but re-themed
            rewards.knowledge = 2;
            rewards.efficiency = 1;
            rewards.message = "이론 검증 시뮬레이션을 완료했습니다. (+2 지식, +1 효율)";
            break;
        case "양자 비트 정렬": // Placeholder for now, but re-themed
            rewards.concentration = 2;
            rewards.innovation = 1;
            rewards.message = "양자 비트 정렬을 완료했습니다. (+2 집중, +1 혁신)";
            break;
        default:
            rewards.message = `미니게임 ${minigameName}${getEulReParticle(minigameName)} 완료했습니다.`;
            break;
    }
    return rewards;
}

const minigames = [
    {
        name: "논리 회로 퍼즐",
        description: "주어진 논리 게이트들을 연결하여 목표 출력을 만드세요. 효율적인 회로일수록 높은 점수를 얻습니다!",
        start: (gameArea, choicesDiv) => {
            const gates = ["AND", "OR", "NOT", "XOR"];
            gameState.minigameState = {
                targetOutput: Math.floor(currentRandFn() * 2), // 0 or 1
                currentCircuit: [],
                score: 0,
                gateInput: ""
            };
            minigames[0].render(gameArea, choicesDiv);
        },
        render: (gameArea, choicesDiv) => {
            const state = gameState.minigameState;
            gameArea.innerHTML = `
                <p><b>목표 출력:</b> ${state.targetOutput}</p>
                <p><b>현재 회로:</b> ${state.currentCircuit.join(' -> ')}</p>
                <p><b>점수:</b> ${state.score}</p>
                <input type="text" id="circuitGateInput" placeholder="게이트 (AND, OR, NOT, XOR) 또는 값 (0, 1) 입력" style="font-size: 1.2em; padding: 8px; width: 80%; margin-top: 10px;" autocomplete="off">
            `;
            choicesDiv.innerHTML = `
                <button class="choice-btn" data-action="addGate">게이트/값 추가</button>
                <button class="choice-btn" data-action="evaluateCircuit">회로 평가</button>
            `;
            const input = document.getElementById('circuitGateInput');
            input.value = state.gateInput;
            input.focus();
            input.addEventListener('input', (e) => { state.gateInput = e.target.value; });
            choicesDiv.querySelectorAll('.choice-btn').forEach(button => {
                button.addEventListener('click', () => {
                    const action = button.dataset.action;
                    if (action === "addGate") {
                        minigames[0].processAction('addGate', state.gateInput);
                    } else if (action === "evaluateCircuit") {
                        minigames[0].processAction('evaluateCircuit');
                    }
                });
            });
        },
        processAction: (actionType, value = null) => {
            const state = gameState.minigameState;
            if (actionType === 'addGate') {
                const input = value.trim().toUpperCase();
                const validGates = ["AND", "OR", "NOT", "XOR", "0", "1"];
                if (validGates.includes(input)) {
                    state.currentCircuit.push(input);
                    state.gateInput = "";
                    minigames[0].render(document.getElementById('gameArea'), document.getElementById('gameChoices'));
                } else {
                    updateGameDisplay("유효하지 않은 입력입니다. (AND, OR, NOT, XOR, 0, 1 중 하나)");
                }
            } else if (actionType === 'evaluateCircuit') {
                try {
                    let result = null;
                    let currentVal = null;
                    for (let i = 0; i < state.currentCircuit.length; i++) {
                        const item = state.currentCircuit[i];
                        if (item === "0" || item === "1") {
                            currentVal = parseInt(item);
                        } else if (["AND", "OR", "XOR"].includes(item)) {
                            const nextVal = parseInt(state.currentCircuit[i + 1]);
                            if (isNaN(nextVal)) throw new Error("논리 게이트 뒤에는 값이 와야 합니다.");
                            if (item === "AND") currentVal = currentVal && nextVal;
                            else if (item === "OR") currentVal = currentVal || nextVal;
                            else if (item === "XOR") currentVal = currentVal ^ nextVal;
                            i++; // Skip next value
                        } else if (item === "NOT") {
                            currentVal = currentVal === 0 ? 1 : 0;
                        }
                    }

                    if (currentVal === state.targetOutput) {
                        state.score += 100 - (state.currentCircuit.length * 5); // Reward for efficiency
                        state.stage++;
                        state.currentCircuit = [];
                        state.gateInput = "";
                        updateGameDisplay("정답입니다! 다음 단계로 넘어갑니다.");
                        minigames[0].render(document.getElementById('gameArea'), document.getElementById('gameChoices'));
                    } else {
                        updateGameDisplay("틀렸습니다! 게임 종료.");
                        minigames[0].end();
                    }
                } catch (e) {
                    updateGameDisplay(`회로 평가 오류: ${e.message}. 게임 종료.`);
                    minigames[0].end();
                }
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[0].name, gameState.minigameState.score);
            updateState({
                logic: gameState.logic + rewards.logic,
                knowledge: gameState.knowledge + rewards.knowledge,
                efficiency: gameState.efficiency + rewards.efficiency,
                innovation: gameState.innovation + rewards.innovation,
                concentration: gameState.concentration + rewards.concentration,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    {
        name: "시스템 최적화",
        description: "주어진 시스템의 비효율적인 부분을 찾아 최적화하는 게임입니다.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 10 };
            gameArea.innerHTML = `<p>${minigames[1].description}</p><p>게임을 시작합니다!</p>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[1].processAction('endGame')">게임 종료</button>`;
        },
        render: () => {},
        processAction: (actionType) => {
            if (actionType === 'endGame') {
                minigames[1].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[1].name, gameState.minigameState.score);
            updateState({
                efficiency: gameState.efficiency + rewards.efficiency,
                concentration: gameState.concentration + rewards.concentration,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    {
        name: "알고리즘 설계 챌린지",
        description: "주어진 문제를 해결하는 가장 효율적인 알고리즘을 설계하세요.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 15 };
            gameArea.innerHTML = `<p>${minigames[2].description}</p><p>게임을 시작합니다!</p>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[2].processAction('endGame')">게임 종료</button>`;
        },
        render: () {},
        processAction: (actionType) => {
            if (actionType === 'endGame') {
                minigames[2].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[2].name, gameState.minigameState.score);
            updateState({
                innovation: gameState.innovation + rewards.innovation,
                logic: gameState.logic + rewards.logic,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    {
        name: "이론 검증 시뮬레이션",
        description: "새로운 이론의 타당성을 검증하기 위한 시뮬레이션을 설계하고 실행하세요.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 20 };
            gameArea.innerHTML = `<p>${minigames[3].description}</p><p>게임을 시작합니다!</p>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[3].processAction('endGame')">게임 종료</button>`;
        },
        render: () {},
        processAction: (actionType) => {
            if (actionType === 'endGame') {
                minigames[3].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[3].name, gameState.minigameState.score);
            updateState({
                knowledge: gameState.knowledge + rewards.knowledge,
                efficiency: gameState.efficiency + rewards.efficiency,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    {
        name: "양자 비트 정렬",
        description: "복잡하게 얽힌 양자 비트들을 가장 효율적인 방법으로 정렬하세요.",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { score: 25 };
            gameArea.innerHTML = `<p>${minigames[4].description}</p><p>게임을 시작합니다!</p>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[4].processAction('endGame')">게임 종료</button>`;
        },
        render: () {},
        processAction: (actionType) => {
            if (actionType === 'endGame') {
                minigames[4].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[4].name, gameState.minigameState.score);
            updateState({
                concentration: gameState.concentration + rewards.concentration,
                innovation: gameState.innovation + rewards.innovation,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    }
];

// --- Game Actions ---
function spendActionPoint() {
    if (gameState.actionPoints <= 0) {
        updateGameDisplay("행동력이 부족합니다.");
        return false;
    }
    updateState({ actionPoints: gameState.actionPoints - 1 });
    return true;
}

const gameActions = {
    explore_area: () => {
        if (!spendActionPoint()) return;

        const possibleOutcomes = exploreAreaOutcomes.filter(outcome => outcome.condition(gameState));
        const totalWeight = possibleOutcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
        const rand = currentRandFn() * totalWeight;

        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(outcome => {
            cumulativeWeight += outcome.weight;
            return rand < cumulativeWeight;
        });

        if (!chosenOutcome) { // Fallback to default if something goes wrong
            chosenOutcome = exploreAreaOutcomes.find(o => o.condition());
        }

        const result = chosenOutcome.effect(gameState);
        updateState({ ...result.changes, dailyActions: { ...gameState.dailyActions, explored: true } }, result.message);
    },
    discuss_with_researcher: () => {
        if (!spendActionPoint()) return;
        const researcher = gameState.researchers[Math.floor(currentRandFn() * gameState.researchers.length)];
        if (gameState.dailyActions.discussed) { updateState({ dailyActions: { ...gameState.dailyActions, discussed: true } }, `${researcher.name}${getWaGwaParticle(researcher.name)} 이미 충분히 토론했습니다.`); return; }

        const possibleOutcomes = discussWithResearcherOutcomes.filter(outcome => outcome.condition(gameState, researcher));
        const totalWeight = possibleOutcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
        const rand = currentRandFn() * totalWeight;

        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(outcome => {
            cumulativeWeight += outcome.weight;
            return rand < cumulativeWeight;
        });

        if (!chosenOutcome) { // Fallback to default if something goes wrong
            chosenOutcome = discussWithResearcherOutcomes.find(o => o.condition());
        }

        const result = chosenOutcome.effect(gameState, researcher);
        updateState({ ...result.changes, dailyActions: { ...gameState.dailyActions, discussed: true } }, result.message);
    },
    hold_symposium: () => {
        if (!spendActionPoint()) return;

        const possibleOutcomes = symposiumOutcomes.filter(outcome => outcome.condition(gameState));
        const totalWeight = possibleOutcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
        const rand = currentRandFn() * totalWeight;

        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(outcome => {
            cumulativeWeight += outcome.weight;
            return rand < cumulativeWeight;
        });

        if (!chosenOutcome) { // Fallback to default if something goes wrong
            chosenOutcome = symposiumOutcomes.find(o => o.condition());
        }

        const result = chosenOutcome.effect(gameState);
        updateState(result.changes, result.message);
    },
    manualNextDay: () => {
        if (gameState.manualDayAdvances >= 5) { updateGameDisplay("오늘은 더 이상 수동으로 날짜를 넘길 수 없습니다. 내일 다시 시도해주세요."); return; }
        updateState({
            manualDayAdvances: gameState.manualDayAdvances + 1,
            day: gameState.day + 1,
            lastPlayedDate: new Date().toISOString().slice(0, 10),
            dailyEventTriggered: false
        });
        processDailyEvents();
    },
    handle_researcher_dispute: (params) => {
        if (!spendActionPoint()) return;
        const { first, second } = params;
        let message = "";
        let reward = { efficiency: 0, innovation: 0, logic: 0 };

        const trustGain = getRandomValue(10, 3);
        const trustLoss = getRandomValue(5, 2);
        const efficiencyGain = getRandomValue(5, 2);
        const logicGain = getRandomValue(5, 2);

        const updatedResearchers = gameState.researchers.map(r => {
            if (r.id === first) {
                r.trust = Math.min(100, r.trust + trustGain);
                message += `${r.name}의 관점을 먼저 들어주었습니다. ${r.name}의 신뢰도가 상승했습니다. `;
                reward.efficiency += efficiencyGain;
                reward.logic += logicGain;
            } else if (r.id === second) {
                r.trust = Math.max(0, r.trust - trustLoss);
                message += `${second}의 신뢰도가 약간 하락했습니다. `;
            }
            return r;
        });

        updateState({ ...reward, researchers: updatedResearchers, currentScenarioId: 'researcher_dispute_resolution_result' }, message);
    },
    mediate_researcher_dispute: () => {
        if (!spendActionPoint()) return;
        const efficiencyGain = getRandomValue(10, 3);
        const innovationGain = getRandomValue(5, 2);
        const logicGain = getRandomValue(5, 2);
        const message = `당신의 효율적인 중재로 맥스와 엘리자의 의견 차이가 해결되었습니다. 연구소의 효율과 당신의 논리가 강화되었습니다! (+${efficiencyGain} 효율, +${innovationGain} 혁신, +${logicGain} 논리)`;
        updateState({ efficiency: gameState.efficiency + efficiencyGain, innovation: gameState.innovation + innovationGain, logic: gameState.logic + logicGain, currentScenarioId: 'researcher_dispute_resolution_result' }, message);
    },
    ignore_event: () => {
        if (!spendActionPoint()) return;
        const efficiencyLoss = getRandomValue(10, 3);
        const innovationLoss = getRandomValue(5, 2);
        const message = "의견 차이를 무시했습니다. 연구원들의 불만이 커지고 연구소의 분위기가 침체됩니다. (-${efficiencyLoss} 효율, -${innovationLoss} 혁신)";
        const updatedResearchers = gameState.researchers.map(r => {
            r.trust = Math.max(0, r.trust - 5);
            return r;
        });
        updateState({ efficiency: gameState.efficiency - efficiencyLoss, innovation: gameState.innovation - innovationLoss, researchers: updatedResearchers, currentScenarioId: 'researcher_dispute_resolution_result' }, message);
    },
    defend_hacking: () => {
        if (!spendActionPoint()) return;
        const cost = 1; // Action point cost
        let message = "";
        let changes = {};
        if (gameState.actionPoints >= cost) {
            const efficiencyGain = getRandomValue(10, 3);
            const logicGain = getRandomValue(5, 2);
            message = "보안 시스템을 강화하고 해킹을 방어했습니다. 연구소의 효율과 논리가 상승합니다. (+${efficiencyGain} 효율, +${logicGain} 논리)";
            changes.efficiency = gameState.efficiency + efficiencyGain;
            changes.logic = gameState.logic + logicGain;
            changes.actionPoints = gameState.actionPoints - cost;
        } else {
            message = "해킹을 방어할 행동력이 부족합니다.";
        }
        updateState({ ...changes, currentScenarioId: 'hacking_defense_result' }, message);
    },
    ignore_hacking: () => {
        if (!spendActionPoint()) return;
        const efficiencyLoss = getRandomValue(10, 3);
        const innovationLoss = getRandomValue(5, 2);
        updateState({ efficiency: gameState.efficiency - efficiencyLoss, innovation: gameState.innovation - innovationLoss, currentScenarioId: 'hacking_defense_result' }, "해킹을 무시했습니다. 연구소의 효율과 혁신이 감소합니다. (-${efficiencyLoss} 효율, -${innovationLoss} 혁신)");
    },
    reestablish_theory: () => {
        if (!spendActionPoint()) return;
        const cost = 1; // Action point cost
        let message = "";
        let changes = {};
        if (gameState.actionPoints >= cost) {
            const logicGain = getRandomValue(10, 3);
            const knowledgeGain = getRandomValue(5, 2);
            message = "이론의 결함을 분석하고 재정립했습니다. 연구소의 논리와 지식이 상승합니다. (+${logicGain} 논리, +${knowledgeGain} 지식)";
            changes.logic = gameState.logic + logicGain;
            changes.knowledge = gameState.knowledge + knowledgeGain;
            changes.actionPoints = gameState.actionPoints - cost;
        } else {
            message = "이론을 재정립할 행동력이 부족합니다.";
        }
        updateState({ ...changes, currentScenarioId: 'theory_reestablishment_result' }, message);
    },
    ignore_theory_breakdown: () => {
        if (!spendActionPoint()) return;
        const logicLoss = getRandomValue(10, 3);
        const knowledgeLoss = getRandomValue(5, 2);
        updateState({ logic: gameState.logic - logicLoss, knowledge: gameState.knowledge - knowledgeLoss, currentScenarioId: 'theory_reestablishment_result' }, "이론의 결함을 무시했습니다. 연구소의 논리와 지식이 감소합니다. (-${logicLoss} 논리, -${knowledgeLoss} 지식)");
    },
    seek_new_perspective: () => {
        if (!spendActionPoint()) return;
        const rand = currentRandFn();
        let message = "";
        let changes = {};
        if (rand < 0.6) { // Success
            const innovationGain = getRandomValue(10, 3);
            const knowledgeGain = getRandomValue(5, 2);
            message = "새로운 관점을 탐색하여 혁신과 지식을 회복했습니다. (+${innovationGain} 혁신, +${knowledgeGain} 지식)";
            changes.innovation = gameState.innovation + innovationGain;
            changes.knowledge = gameState.knowledge + knowledgeGain;
        } else { // Failure
            const efficiencyLoss = getRandomValue(10, 3);
            const concentrationLoss = getRandomValue(5, 2);
            message = "새로운 관점을 찾으려 했지만, 오히려 효율과 집중이 감소했습니다. (-${efficiencyLoss} 효율, -${concentrationLoss} 집중)";
            changes.efficiency = gameState.efficiency - efficiencyLoss;
            changes.concentration = gameState.concentration - concentrationLoss;
        }
        updateState({ ...changes, currentScenarioId: 'intro' }, message);
    },
    focus_on_existing_research: () => {
        if (!spendActionPoint()) return;
        const innovationLoss = getRandomValue(10, 3);
        const logicLoss = getRandomValue(5, 2);
        updateState({ innovation: gameState.innovation - innovationLoss, logic: gameState.logic - logicLoss, currentScenarioId: 'intro' }, "기존 연구에 집중했지만, 혁신과 논리가 감소했습니다. (-${innovationLoss} 혁신, -${logicLoss} 논리)");
    },
    welcome_new_unique_researcher: () => {
        if (!spendActionPoint()) return;
        let message = "";
        let changes = {};
        if (gameState.researchers.length < gameState.maxResearchers && gameState.pendingNewResearcher) {
            const efficiencyGain = getRandomValue(10, 3);
            const innovationGain = getRandomValue(5, 2);
            const logicGain = getRandomValue(5, 2);
            gameState.researchers.push(gameState.pendingNewResearcher);
            message = `새로운 연구원 ${gameState.pendingNewResearcher.name}(${gameState.pendingNewResearcher.personality}, ${gameState.pendingNewResearcher.skill})을(를) 유능한 인재로 영입했습니다! 연구소의 효율과 혁신, 논리가 상승합니다. (+${efficiencyGain} 효율, +${innovationGain} 혁신, +${logicGain} 논리)`;
            changes.efficiency = gameState.efficiency + efficiencyGain;
            changes.innovation = gameState.innovation + innovationGain;
            changes.logic = gameState.logic + logicGain;
            changes.pendingNewResearcher = null;
        } else {
            message = "새로운 연구원을 영입할 수 없습니다.";
        }
        updateState({ ...changes, currentScenarioId: 'intro' }, message);
    },
    observe_researcher: () => {
        if (!spendActionPoint()) return;
        let message = "";
        let changes = {};
        const rand = currentRandFn();
        if (rand < 0.7) { // Success
            const knowledgeGain = getRandomValue(5, 2);
            message = "새로운 연구원을 관찰하며 흥미로운 점을 발견했습니다. 당신의 지식이 상승합니다. (+${knowledgeGain} 지식)";
            changes.knowledge = gameState.knowledge + knowledgeGain;
        } else { // Failure
            const efficiencyLoss = getRandomValue(5, 2);
            message = "연구원을 관찰하는 동안, 당신의 우유부단함이 연구소에 좋지 않은 인상을 주었습니다. (-${efficiencyLoss} 효율)";
            changes.efficiency = gameState.efficiency - efficiencyLoss;
        }
        changes.pendingNewResearcher = null;
        updateState({ ...changes, currentScenarioId: 'intro' }, message);
    },
    reject_researcher: () => {
        if (!spendActionPoint()) return;
        const innovationLoss = getRandomValue(10, 3);
        const efficiencyLoss = getRandomValue(5, 2);
        const logicLoss = getRandomValue(5, 2);
        message = "새로운 연구원의 영입을 거절했습니다. 연구소의 혁신과 효율, 논리가 감소합니다. (-${innovationLoss} 혁신, -${efficiencyLoss} 효율, -${logicLoss} 논리)";
        updateState({ innovation: gameState.innovation - innovationLoss, efficiency: gameState.efficiency - efficiencyLoss, logic: gameState.logic - logicLoss, pendingNewResearcher: null, currentScenarioId: 'intro' }, message);
    },
    accept_funding: () => {
        if (!spendActionPoint()) return;
        let message = "";
        let changes = {};
        if (gameState.resources.computing_power >= 50) {
            const innovationGain = getRandomValue(5, 2);
            message = "외부 기관의 자금 지원을 수락하여 기술 혁신을 얻었습니다! (+${innovationGain} 혁신)";
            changes.resources = { ...gameState.resources, computing_power: gameState.resources.computing_power - 50, technological_innovation: (gameState.resources.technological_innovation || 0) + 5 };
            changes.innovation = gameState.innovation + innovationGain;
        } else {
            message = "자금 지원에 필요한 연산력이 부족합니다.";
        }
        updateState({ ...changes, currentScenarioId: 'intro' }, message);
    },
    decline_funding: () => {
        if (!spendActionPoint()) return;
        const innovationLoss = getRandomValue(5, 2);
        updateState({ innovation: gameState.innovation - innovationLoss, currentScenarioId: 'intro' }, "자금 지원 제안을 거절했습니다. 외부 기관은 아쉬워하며 떠났습니다. (-${innovationLoss} 혁신)");
    },
    show_resource_generation_options: () => updateState({ currentScenarioId: 'action_resource_generation' }),
    show_facility_management_options: () => updateState({ currentScenarioId: 'action_facility_management' }),
    show_contemplation_options: () => updateState({ currentScenarioId: 'contemplation_menu' }),
    generate_computing_power: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.labLevel * 0.1) + (gameState.dailyBonus.researchSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            const computingPowerGain = getRandomValue(5, 2);
            message = `연산력을 성공적으로 생성했습니다! (+${computingPowerGain} 연산력)`;
            changes.resources = { ...gameState.resources, computing_power: gameState.resources.computing_power + computingPowerGain };
        } else {
            message = "연산력 생성에 실패했습니다.";
        }
        updateState(changes, message);
    },
    gather_materials: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.labLevel * 0.1) + (gameState.dailyBonus.researchSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            const materialsGain = getRandomValue(5, 2);
            message = `재료를 성공적으로 수집했습니다! (+${materialsGain} 재료)`;
            changes.resources = { ...gameState.resources, materials: gameState.resources.materials + materialsGain };
        } else {
            message = "재료 수집에 실패했습니다.";
        }
        updateState(changes, message);
    },
    secure_energy: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.labLevel * 0.1) + (gameState.dailyBonus.researchSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            const energyGain = getRandomValue(5, 2);
            message = `에너지를 성공적으로 확보했습니다! (+${energyGain} 에너지)`;
            changes.resources = { ...gameState.resources, energy: gameState.resources.energy + energyGain };
        } else {
            message = "에너지 확보에 실패했습니다.";
        }
        updateState(changes, message);
    },
    build_dataArchive: () => {
        if (!spendActionPoint()) return;
        const cost = { computing_power: 50, materials: 20 };
        let message = "";
        let changes = {};
        if (gameState.resources.computing_power >= cost.computing_power && gameState.resources.materials >= cost.materials) {
            gameState.researchFacilities.dataArchive.built = true;
            const knowledgeGain = getRandomValue(10, 3);
            message = `데이터 아카이브를 구축했습니다! (+${knowledgeGain} 지식)`;
            changes.knowledge = gameState.knowledge + knowledgeGain;
            changes.resources = { ...gameState.resources, computing_power: gameState.resources.computing_power - cost.computing_power, materials: gameState.resources.materials - cost.materials };
        } else {
            message = "자원이 부족하여 구축할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_fabricationLab: () => {
        if (!spendActionPoint()) return;
        const cost = { materials: 30, energy: 30 };
        let message = "";
        let changes = {};
        if (gameState.resources.materials >= cost.materials && gameState.resources.energy >= cost.energy) {
            gameState.researchFacilities.fabricationLab.built = true;
            const innovationGain = getRandomValue(10, 3);
            message = `제작실을 구축했습니다! (+${innovationGain} 혁신)`;
            changes.innovation = gameState.innovation + innovationGain;
            changes.resources = { ...gameState.resources, materials: gameState.resources.materials - cost.materials, energy: gameState.resources.energy - cost.energy };
        } else {
            message = "자원이 부족하여 구축할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_centralControl: () => {
        if (!spendActionPoint()) return;
        const cost = { computing_power: 100, materials: 50, energy: 50 };
        let message = "";
        let changes = {};
        if (gameState.resources.computing_power >= cost.computing_power && gameState.resources.materials >= cost.materials && gameState.resources.energy >= cost.energy) {
            gameState.researchFacilities.centralControl.built = true;
            const efficiencyGain = getRandomValue(20, 5);
            const logicGain = getRandomValue(20, 5);
            message = `중앙 통제실을 구축했습니다! (+${efficiencyGain} 효율, +${logicGain} 논리)`;
            changes.efficiency = gameState.efficiency + efficiencyGain;
            changes.logic = gameState.logic + logicGain;
            changes.resources = { ...gameState.resources, computing_power: gameState.resources.computing_power - cost.computing_power, materials: gameState.resources.materials - cost.materials, energy: gameState.resources.energy - cost.energy };
        } else {
            message = "자원이 부족하여 구축할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_theoryLibrary: () => {
        if (!spendActionPoint()) return;
        const cost = { materials: 80, energy: 40 };
        let message = "";
        let changes = {};
        if (gameState.resources.materials >= cost.materials && gameState.resources.energy >= cost.energy) {
            gameState.researchFacilities.theoryLibrary.built = true;
            const knowledgeGain = getRandomValue(15, 5);
            const concentrationGain = getRandomValue(10, 3);
            message = `이론 라이브러리를 구축했습니다! (+${knowledgeGain} 지식, +${concentrationGain} 집중)`;
            changes.knowledge = gameState.knowledge + knowledgeGain;
            changes.concentration = gameState.concentration + concentrationGain;
            changes.resources = { ...gameState.resources, materials: gameState.resources.materials - cost.materials, energy: gameState.resources.energy - cost.energy };
        } else {
            message = "자원이 부족하여 구축할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_advancedLab: () => {
        if (!spendActionPoint()) return;
        const cost = { materials: 50, energy: 100 };
        let message = "";
        let changes = {};
        if (gameState.resources.materials >= cost.materials && gameState.resources.energy >= cost.energy) {
            gameState.researchFacilities.advancedLab.built = true;
            message = "고등 연구실을 구축했습니다!";
            changes.resources = { ...gameState.resources, materials: gameState.resources.materials - cost.materials, energy: gameState.resources.energy - cost.energy };
        } else {
            message = "자원이 부족하여 구축할 수 없습니다.";
        }
        updateState(changes, message);
    },
    maintain_facility: (params) => {
        if (!spendActionPoint()) return;
        const facilityKey = params.facility;
        const cost = { materials: 10, energy: 10 };
        let message = "";
        let changes = {};
        if (gameState.resources.materials >= cost.materials && gameState.resources.energy >= cost.energy) {
            gameState.researchFacilities[facilityKey].durability = 100;
            message = `${gameState.researchFacilities[facilityKey].name} 시설의 유지보수를 완료했습니다. 내구도가 100으로 회복되었습니다.`;
            changes.resources = { ...gameState.resources, materials: gameState.resources.materials - cost.materials, energy: gameState.resources.energy - cost.energy };
        } else {
            message = "유지보수에 필요한 자원이 부족합니다.";
        }
        updateState(changes, message);
    },
    execute_algorithm: () => {
        if (!spendActionPoint()) return;
        let message = "";
        let changes = {};
        const rand = currentRandFn();

        if (rand < 0.1) { // Big Win
            const computingPowerGain = getRandomValue(30, 10);
            const materialsGain = getRandomValue(20, 5);
            const energyGain = getRandomValue(15, 5);
            message = `알고리즘 실행 대성공! 엄청난 자원을 얻었습니다! (+${computingPowerGain} 연산력, +${materialsGain} 재료, +${energyGain} 에너지)`;
            changes.resources = { ...gameState.resources, computing_power: gameState.resources.computing_power + computingPowerGain, materials: gameState.resources.materials + materialsGain, energy: gameState.resources.energy + energyGain };
        } else if (rand < 0.4) { // Small Win
            const innovationGain = getRandomValue(10, 5);
            message = `알고리즘 실행 성공! 혁신이 샘솟습니다. (+${innovationGain} 혁신)`;
            changes.innovation = gameState.innovation + innovationGain;
        } else if (rand < 0.7) { // Small Loss
            const innovationLoss = getRandomValue(5, 2);
            message = `아쉽게도 꽝! 혁신이 조금 식습니다. (-${innovationLoss} 혁신)`;
            changes.innovation = gameState.innovation - innovationLoss;
        } else { // No Change
            message = "알고리즘 실행 결과는 아무것도 아니었습니다.";
        }
        updateState({ ...changes, currentScenarioId: 'contemplation_menu' }, message);
    },
    debug_legacy_code: () => {
        if (!spendActionPoint()) return;
        let message = "";
        let changes = {};
        const rand = currentRandFn();

        if (rand < 0.2) { // Big Catch (Quantum Bits)
            const quantumBitsGain = getRandomValue(3, 1);
            message = `레거시 코드 디버깅 대성공! 양자 비트를 얻었습니다! (+${quantumBitsGain} 양자 비트)`;
            changes.resources = { ...gameState.resources, quantum_bits: (gameState.resources.quantum_bits || 0) + quantumBitsGain };
        } else if (rand < 0.6) { // Normal Catch (Knowledge)
            const knowledgeGain = getRandomValue(10, 5);
            message = `지식을 얻었습니다! (+${knowledgeGain} 지식)`;
            changes.resources = { ...gameState.resources, knowledge: gameState.resources.knowledge + knowledgeGain };
        } else { // No Change
            message = "아쉽게도 아무것도 얻지 못했습니다.";
        }
        updateState({ ...changes, currentScenarioId: 'contemplation_menu' }, message);
    },
    return_to_intro: () => updateState({ currentScenarioId: 'intro' }),
    play_minigame: () => {
        if (gameState.dailyActions.minigamePlayed) { updateGameDisplay("오늘의 발견은 이미 플레이했습니다."); return; }
        if (!spendActionPoint()) return;

        const minigameIndex = (gameState.day - 1) % minigames.length;
        const minigame = minigames[minigameIndex];

        gameState.currentScenarioId = `minigame_${minigame.name}`;

        updateState({ dailyActions: { ...gameState.dailyActions, minigamePlayed: true } });

        updateGameDisplay(minigame.description);
        minigame.start(document.getElementById('gameArea'), document.getElementById('gameChoices'));
    },
    show_resource_generation_options: () => updateState({ currentScenarioId: 'action_resource_generation' }),
    show_facility_management_options: () => updateState({ currentScenarioId: 'action_facility_management' }),
    show_contemplation_options: () => updateState({ currentScenarioId: 'contemplation_menu' }),
};

function applyStatEffects() {
    let message = "";
    // High Logic: Resource generation success chance increase
    if (gameState.logic >= 70) {
        gameState.dailyBonus.researchSuccess += 0.1;
        message += "높은 논리력 덕분에 새로운 자원 생성 성공률이 증가합니다. ";
    }
    // Low Logic: Knowledge decrease
    if (gameState.logic < 30) {
        gameState.knowledge = Math.max(0, gameState.knowledge - getRandomValue(5, 2));
        message += "논리 부족으로 지식이 감소합니다. ";
    }

    // High Knowledge: Action points increase
    if (gameState.knowledge >= 70) {
        gameState.maxActionPoints += 1;
        gameState.actionPoints = gameState.maxActionPoints;
        message += "넘치는 지식으로 행동력이 증가합니다. ";
    }
    // Low Knowledge: Action points decrease
    if (gameState.knowledge < 30) {
        gameState.maxActionPoints = Math.max(5, gameState.maxActionPoints - 1);
        gameState.actionPoints = Math.min(gameState.actionPoints, gameState.maxActionPoints);
        message += "지식 부족으로 행동력이 감소합니다. ";
    }

    // High Efficiency: Innovation and Concentration boost
    if (gameState.efficiency >= 70) {
        const innovationGain = getRandomValue(5, 2);
        const concentrationGain = getRandomValue(5, 2);
        gameState.innovation = Math.min(100, gameState.innovation + innovationGain);
        gameState.concentration = Math.min(100, gameState.concentration + concentrationGain);
        message += `당신의 높은 효율성 덕분에 연구소의 혁신과 집중이 향상됩니다! (+${innovationGain} 혁신, +${concentrationGain} 집중) `;
    }
    // Low Efficiency: Innovation and Concentration decrease
    if (gameState.efficiency < 30) {
        const innovationLoss = getRandomValue(5, 2);
        const concentrationLoss = getRandomValue(5, 2);
        gameState.innovation = Math.max(0, gameState.innovation - innovationLoss);
        gameState.concentration = Math.max(0, gameState.concentration - concentrationLoss);
        message += "효율성 부족으로 연구소의 혁신과 집중이 흐려집니다. (-${innovationLoss} 혁신, -${concentrationLoss} 집중) ";
    }

    // High Innovation: Logic boost or rare resource discovery
    if (gameState.innovation >= 70) {
        const logicGain = getRandomValue(5, 2);
        gameState.logic = Math.min(100, gameState.logic + logicGain);
        message += "당신의 혁신적인 아이디어가 새로운 논리를 불러일으킵니다. (+${logicGain} 논리) ";
        if (currentRandFn() < 0.2) { // 20% chance for quantum bits discovery
            const amount = getRandomValue(1, 1);
            gameState.resources.quantum_bits += amount;
            message += `양자 비트를 발견했습니다! (+${amount} 양자 비트) `;
        }
    }
    // Low Innovation: Logic decrease or action point loss
    if (gameState.innovation < 30) {
        const logicLoss = getRandomValue(5, 2);
        gameState.logic = Math.max(0, gameState.logic - logicLoss);
        message += "혁신 부족으로 논리가 감소합니다. (-${logicLoss} 논리) ";
        if (currentRandFn() < 0.1) { // 10% chance for action point loss
            const actionLoss = getRandomValue(1, 0);
            gameState.actionPoints = Math.max(0, gameState.actionPoints - actionLoss);
            message += "비효율적인 연구로 행동력을 낭비했습니다. (-${actionLoss} 행동력) ";
        }
    }

    // High Concentration: Researcher trust increase
    if (gameState.concentration >= 70) {
        gameState.researchers.forEach(r => r.trust = Math.min(100, r.trust + getRandomValue(2, 1)));
        message += "높은 집중력 덕분에 연구원들의 신뢰가 깊어집니다. ";
    }
    // Low Concentration: Researcher trust decrease
    if (gameState.concentration < 30) {
        gameState.researchers.forEach(r => r.trust = Math.max(0, r.trust - getRandomValue(5, 2)));
        message += "낮은 집중력으로 인해 연구원들의 신뢰가 하락합니다. ";
    }

    return message;
}

function generateRandomResearcher() {
    const names = ["앨리스", "밥", "찰리", "다이애나", "이브"];
    const personalities = ["논리적", "분석적", "혁신적", "탐구적"];
    const skills = ["물리학", "화학", "생물학", "정보학"];
    const randomId = Math.random().toString(36).substring(2, 9);

    return {
        id: randomId,
        name: names[Math.floor(currentRandFn() * names.length)],
        personality: personalities[Math.floor(currentRandFn() * personalities.length)],
        skill: skills[Math.floor(currentRandFn() * skills.length)],
        trust: 50
    };
}

// --- Daily/Initialization Logic ---
const weightedDailyEvents = [
    { id: "daily_event_server_overload", weight: 10, condition: () => true, onTrigger: () => {
        const computingPowerLoss = getRandomValue(10, 5);
        gameScenarios.daily_event_server_overload.text = `서버 과부하로 연산력 일부가 손실되었습니다. (-${computingPowerLoss} 연산력)`;
        updateState({ resources: { ...gameState.resources, computing_power: Math.max(0, gameState.resources.computing_power - computingPowerLoss) } });
    } },
    { id: "daily_event_research_breakthrough", weight: 10, condition: () => true, onTrigger: () => {
        const innovationGain = getRandomValue(10, 5);
        gameScenarios.daily_event_research_breakthrough.text = `획기적인 연구 돌파가 일어났습니다! 혁신이 증가합니다. (+${innovationGain} 혁신)`;
        updateState({ innovation: gameState.innovation + innovationGain });
    } },
    { id: "daily_event_system_hacking", weight: 15, condition: () => true },
    { id: "daily_event_resource_depletion", weight: 7, condition: () => true, onTrigger: () => {
        const materialsLoss = getRandomValue(10, 5);
        gameScenarios.daily_event_resource_depletion.text = `자원 고갈로 재료 일부가 사라졌습니다. (-${materialsLoss} 재료)`;
        updateState({ resources: { ...gameState.resources, materials: Math.max(0, gameState.resources.materials - materialsLoss) } });
    } },
    { id: "daily_event_researcher_dispute", weight: 15, condition: () => gameState.researchers.length >= 2 },
    { id: "daily_event_new_researcher", weight: 10, condition: () => gameState.researchFacilities.centralControl.built && gameState.researchers.length < gameState.maxResearchers, onTrigger: () => {
        const newResearcher = generateRandomResearcher();
        gameState.pendingNewResearcher = newResearcher;
        gameScenarios["daily_event_new_researcher"].text = `새로운 연구원 ${newResearcher.name}(${newResearcher.personality}, ${newResearcher.skill})이(가) 연구소에 합류하고 싶어 합니다. (현재 연구원 수: ${gameState.researchers.length} / ${gameState.maxResearchers})`;
    }},
    { id: "daily_event_external_funding", weight: 10, condition: () => gameState.researchFacilities.centralControl.built },
    { id: "daily_event_theory_breakdown", weight: 15, condition: () => true },
    { id: "daily_event_innovation_crisis", weight: 12, condition: () => gameState.innovation < 50 },
];

function processDailyEvents() {
    if (gameState.dailyEventTriggered) return;
    currentRandFn = mulberry32(getDailySeed() + gameState.day);

    // Reset daily actions and action points
    updateState({
        actionPoints: 10, // Reset to base maxActionPoints
        maxActionPoints: 10, // Reset maxActionPoints to base
        dailyActions: { explored: false, discussed: false, symposiaHeld: false, minigamePlayed: false },
        dailyEventTriggered: true,
        dailyBonus: { researchSuccess: 0 } // Reset daily bonus
    });

    // Apply stat effects
    const statEffectMessage = applyStatEffects();

    let skillBonusMessage = "";
    let durabilityMessage = "";

    // Daily skill bonus & durability decay
    gameState.researchers.forEach(r => {
        if (r.skill === '물리학') { gameState.resources.computing_power++; skillBonusMessage += `${r.name}의 물리학 지식 덕분에 연산력을 추가로 얻었습니다. `;
        } else if (r.skill === '화학') { gameState.resources.materials++; skillBonusMessage += `${r.name}의 화학 지식 덕분에 재료를 추가로 얻었습니다. `;
        } else if (r.skill === '생물학') { gameState.resources.energy++; skillBonusMessage += `${r.name}의 생물학 지식 덕분에 에너지를 추가로 얻었습니다. `;
        } else if (r.skill === '정보학') { gameState.resources.computing_power++; skillBonusMessage += `${r.name}의 정보학 지식 덕분에 연산력을 추가로 얻었습니다. `;
        }
    });

    Object.keys(gameState.researchFacilities).forEach(key => {
        const facility = gameState.researchFacilities[key];
        if(facility.built) {
            facility.durability -= 1;
            if(facility.durability <= 0) {
                facility.built = false;
                durabilityMessage += `${key} 시설이 파손되었습니다! 유지보수가 필요합니다. `;
            }
        }
    });

    gameState.resources.computing_power -= gameState.researchers.length * 2; // Computing power consumption
    let dailyMessage = "새로운 날이 시작되었습니다. ";
    dailyMessage += statEffectMessage + skillBonusMessage + durabilityMessage;
    if (gameState.resources.computing_power < 0) {
        gameState.knowledge -= 10;
        dailyMessage += "연산력이 부족하여 연구원들이 힘들어합니다! (-10 지식)";
    } else {
        dailyMessage += "";
    }

    // Check for game over conditions
    if (gameState.logic <= 0) { gameState.currentScenarioId = "game_over_logic"; }
    else if (gameState.knowledge <= 0) { gameState.currentScenarioId = "game_over_knowledge"; }
    else if (gameState.efficiency <= 0) { gameState.currentScenarioId = "game_over_efficiency"; }
    else if (gameState.innovation <= 0) { gameState.currentScenarioId = "game_over_innovation"; }
    else if (gameState.concentration <= 0) { gameState.currentScenarioId = "game_over_concentration"; }
    else if (gameState.resources.computing_power < -(gameState.researchers.length * 5)) { gameState.currentScenarioId = "game_over_resources"; }

    // --- New Weighted Random Event Logic ---
    let eventId = "intro";
    const possibleEvents = weightedDailyEvents.filter(event => !event.condition || event.condition());
    const totalWeight = possibleEvents.reduce((sum, event) => sum + event.weight, 0);
    const rand = currentRandFn() * totalWeight;

    let cumulativeWeight = 0;
    let chosenEvent = null;

    for (const event of possibleEvents) {
        cumulativeWeight += event.weight;
        if (rand < cumulativeWeight) {
            chosenEvent = event;
            break;
        }
    }

    if (chosenEvent) {
        eventId = chosenEvent.id;
        if (chosenEvent.onTrigger) {
            chosenEvent.onTrigger();
        }
    }

    gameState.currentScenarioId = eventId;
    updateGameDisplay(dailyMessage + (gameScenarios[eventId]?.text || ''));
    renderChoices(gameScenarios[eventId].choices);
    saveGameState();
}

function initDailyGame() {
    loadGameState();
}

function resetGame() {
    if (confirm("정말로 지식의 연구소를 포기하시겠습니까? 모든 연구 성과가 사라집니다.")) {
        localStorage.removeItem('intpKnowledgeLabGame');
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