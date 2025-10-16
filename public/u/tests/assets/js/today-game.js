// today-game.js - 지식의 연구소 (The Lab of Knowledge)

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
        focus: 50,
        actionPoints: 10,
        maxActionPoints: 10,
        resources: { compute: 10, materials: 10, energy: 5, quantum_bits: 0 },
        researchers: [
            { id: "newton", name: "뉴턴", personality: "분석적", skill: "물리학", collaboration: 70 },
            { id: "curie", name: "퀴리", personality: "탐구적", skill: "화학", collaboration: 60 }
        ],
        maxResearchers: 5,
        currentScenarioId: "intro",
        lastPlayedDate: new Date().toISOString().slice(0, 10),
        manualDayAdvances: 0,
        dailyEventTriggered: false,
        dailyBonus: { generationSuccess: 0 },
        dailyActions: { explored: false, symposiumHeld: false, talkedTo: [], minigamePlayed: false },
        labFacilities: {
            dataArchive: { built: false, durability: 100, name: "데이터 아카이브", description: "연구 데이터를 저장하고 관리합니다.", effect_description: "지식 스탯 보너스 및 데이터 손실 방지." },
            fabricationBay: { built: false, durability: 100, name: "제작실", description: "실험 장비와 재료를 제작합니다.", effect_description: "기술 레벨업 및 재료 생성 효율 증가." },
            mainControlRoom: { built: false, durability: 100, name: "중앙 통제실", description: "연구소의 모든 시스템을 통제합니다.", effect_description: "신규 연구원 영입 및 기술 교류 이벤트 활성화." },
            theoryLibrary: { built: false, durability: 100, name: "이론 라이브러리", description: "기초 과학 이론과 논문을 보관합니다.", effect_description: "고문서 분석을 통한 스탯 및 자원 획득 기회 제공." },
            advancedLab: { built: false, durability: 100, name: "고등 연구실", description: "양자 비트를 사용하는 고급 연구를 수행합니다.", effect_description: "고급 기술 연구 및 양자 비트 활용 잠금 해제." }
        },
        techLevel: 0,
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
        // Patch for old save files
        if (!loaded.dailyBonus) loaded.dailyBonus = { generationSuccess: 0 };
        if (!loaded.researchers || loaded.researchers.length === 0) {
            loaded.researchers = [
                { id: "newton", name: "뉴턴", personality: "분석적", skill: "물리학", collaboration: 70 },
                { id: "curie", name: "퀴리", personality: "탐구적", skill: "화학", collaboration: 60 }
            ];
        }
        if (!loaded.innovation) loaded.innovation = 50;
        if (!loaded.focus) loaded.focus = 50;

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
    const researcherListHtml = gameState.researchers.map(r => `<li>${r.name} (${r.skill}) - 협력도: ${r.collaboration}</li>`).join('');
    statsDiv.innerHTML = `
        <p><b>연구일:</b> ${gameState.day}일</p>
        <p><b>행동력:</b> ${gameState.actionPoints}/${gameState.maxActionPoints}</p>
        <p><b>논리:</b> ${gameState.logic} | <b>지식:</b> ${gameState.knowledge} | <b>효율:</b> ${gameState.efficiency} | <b>혁신:</b> ${gameState.innovation} | <b>집중:</b> ${gameState.focus}</p>
        <p><b>자원:</b> 연산력 ${gameState.resources.compute}, 재료 ${gameState.resources.materials}, 에너지 ${gameState.resources.energy}, 양자 비트 ${gameState.resources.quantum_bits || 0}</p>
        <p><b>기술 레벨:</b> ${gameState.techLevel}</p>
        <p><b>소속 연구원 (${gameState.researchers.length}/${gameState.maxResearchers}):</b></p>
        <ul>${researcherListHtml}</ul>
        <p><b>구축된 시설:</b></p>
        <ul>${Object.values(gameState.labFacilities).filter(f => f.built).map(f => `<li>${f.name} (내구성: ${f.durability}) - ${f.effect_description}</li>`).join('') || '없음'}</ul>
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
        if (!gameState.labFacilities.dataArchive.built) dynamicChoices.push({ text: "데이터 아카이브 구축 (연산력 50, 재료 20)", action: "build_data_archive" });
        if (!gameState.labFacilities.fabricationBay.built) dynamicChoices.push({ text: "제작실 구축 (재료 30, 에너지 30)", action: "build_fabrication_bay" });
        if (!gameState.labFacilities.mainControlRoom.built) dynamicChoices.push({ text: "중앙 통제실 구축 (연산력 100, 재료 50, 에너지 50)", action: "build_main_control_room" });
        if (!gameState.labFacilities.theoryLibrary.built) dynamicChoices.push({ text: "이론 라이브러리 구축 (재료 80, 에너지 40)", action: "build_theory_library" });
        if (gameState.labFacilities.fabricationBay.built && gameState.labFacilities.fabricationBay.durability > 0 && !gameState.labFacilities.advancedLab.built) {
            dynamicChoices.push({ text: "고등 연구실 구축 (재료 50, 에너지 100)", action: "build_advanced_lab" });
        }
        Object.keys(gameState.labFacilities).forEach(key => {
            const facility = gameState.labFacilities[key];
            if (facility.built && facility.durability < 100) {
                dynamicChoices.push({ text: `${facility.name} 유지보수 (재료 10, 에너지 10)`, action: "maintain_facility", params: { facility: key } });
            }
        });
        dynamicChoices.push({ text: "취소", action: "return_to_intro" });
    } else {
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
    "intro": { text: "무엇을 연구할까요?", choices: [
        { text: "연구소 탐사", action: "explore" },
        { text: "연구원과 토론", action: "talk_to_researchers" },
        { text: "아이디어 심포지엄", action: "hold_symposium" },
        { text: "자원 생성", action: "show_resource_generation_options" },
        { text: "연구 시설 관리", action: "show_facility_options" },
        { text: "사색의 시간", action: "show_contemplation_options" },
        { text: "오늘의 미니게임", action: "play_minigame" }
    ]},
    "daily_event_paradox": {
        text: "연구원 뉴턴과 퀴리 사이에 논리적 모순이 발견되었습니다. 둘 다 자신의 가설이 맞다고 주장하고 있습니다.",
        choices: [
            { text: "뉴턴의 가설을 검증한다.", action: "handle_paradox", params: { first: "newton", second: "curie" } },
            { text: "퀴리의 실험 데이터를 분석한다.", action: "handle_paradox", params: { first: "curie", second: "newton" } },
            { text: "둘의 연구를 통합할 새로운 가설을 제시한다.", action: "mediate_paradox" },
            { text: "흥미롭지만, 내 연구가 아니다.", action: "ignore_event" }
        ]
    },
    "daily_event_overload": { text: "", choices: [{ text: "확인", action: "return_to_intro" }] },
    "daily_event_corruption": { text: "", choices: [{ text: "확인", action: "return_to_intro" }] },
    "daily_event_tech_exchange": {
        text: "외부 기관에서 기술 교류를 제안했습니다. [재료 50개]를 [양자 비트 5개]와 교환하자고 합니다.",
        choices: [
            { text: "제안을 수락한다", action: "accept_exchange" },
            { text: "제안을 거절한다", action: "decline_exchange" }
        ]
    },
    "daily_event_new_researcher": {
        choices: [
            { text: "환영하고 연구 주제를 논의한다.", action: "welcome_new_unique_researcher" },
            { text: "그의 연구 실적을 검토해본다.", action: "observe_researcher" },
            { text: "연구소와 방향이 맞지 않는 것 같다.", action: "reject_researcher" }
        ]
    },
    "daily_event_breakthrough": { text: "", choices: [{ text: "확인", action: "return_to_intro" }] },
    "daily_event_legacy_code": {
        text: "데이터 아카이브에서 오래된 레거시 코드를 발견했습니다. 분석해볼까요?",
        choices: [
            { text: "분석한다 (에너지 5 소모)", action: "analyze_legacy_code" },
            { text: "시간이 아깝다. 무시한다", action: "ignore_legacy_code" }
        ]
    },
    "daily_event_visiting_scholar": {
        text: "저명한 초빙 학자가 연구소에 방문했습니다. 그의 강연은 항상 새로운 영감을 줍니다.",
        choices: [
            { text: "강연을 듣는다 (행동력 1 소모)", action: "listen_to_scholar" },
            { text: "내 연구에 집중한다", action: "decline_scholar" }
        ]
    },
    "daily_event_system_hack": {
        text: "외부에서 시스템 해킹 시도가 감지되었습니다! 연산력의 일부를 방어에 사용해야 합니다.",
        choices: [
            { text: "방어 프로토콜 가동 (연산력 손실)", action: "hack_defend" },
            { text: "해커의 역량을 과소평가하고 무시한다 (큰 위험)", action: "hack_ignore" }
        ]
    },
    "daily_event_research_paradox": {
        text: "핵심 연구에서 심각한 패러독스가 발생했습니다. 연구가 중단될 위기입니다.",
        choices: [
            { text: "밤을 새워 해결책을 찾는다 (행동력 소모)", action: "paradox_solve" },
            { text: "다른 연구원에게 책임을 넘긴다 (협력도 하락)", action: "paradox_pass_buck" },
            { text: "문제를 잠시 덮어둔다 (더 큰 문제 발생 위험)", action: "paradox_ignore" }
        ]
    },
    "daily_event_data_corruption": {
        text: "핵심 데이터가 오염되었습니다. 연구원들의 지식 수준이 떨어지고 있습니다.",
        choices: [
            { text: "백업 데이터로 복구 (자원 소모, 지식 회복)", action: "data_recover" },
            { text: "오염된 데이터를 기반으로 연구를 강행한다 (지식 추가 하락 위험)", action: "data_ignore" }
        ]
    },
    "game_over_logic": { text: "연구소의 논리 지수가 너무 낮아 비합리적인 결론만 도출됩니다. 연구는 중단되었습니다.", choices: [], final: true },
    "game_over_knowledge": { text: "연구원들의 지식 수준이 정체되었습니다. 더 이상의 혁신은 일어나지 않습니다.", choices: [], final: true },
    "game_over_efficiency": { text: "연구소의 효율이 무너져 시스템이 마비되었습니다. 아무것도 진행할 수 없습니다.", choices: [], final: true },
    "game_over_innovation": { text: "연구소의 혁신성이 고갈되어 새로운 아이디어가 나오지 않습니다. 연구소는 활력을 잃었습니다.", choices: [], final: true },
    "game_over_focus": { text: "연구원들의 집중력이 바닥나 사소한 실수가 반복됩니다. 신뢰성을 잃었습니다.", choices: [], final: true },
    "game_over_resources": { text: "연구소의 자원이 고갈되어 더 이상 연구를 진행할 수 없습니다.", choices: [], final: true },
    "action_resource_generation": {
        text: "어떤 자원을 생성하시겠습니까?",
        choices: [
            { text: "연산력 확보", action: "perform_generate_compute" },
            { text: "재료 합성", action: "perform_synthesize_materials" },
            { text: "에너지 집약", action: "perform_condense_energy" },
            { text: "취소", action: "return_to_intro" }
        ]
    },
    "action_facility_management": { text: "어떤 시설을 관리하시겠습니까?", choices: [] },
    "resource_generation_result": { text: "", choices: [{ text: "확인", action: "show_resource_generation_options" }] },
    "facility_management_result": { text: "", choices: [{ text: "확인", action: "show_facility_options" }] },
    "paradox_resolution_result": { text: "", choices: [{ text: "확인", action: "return_to_intro" }] },
    "hack_result": { text: "", choices: [{ text: "확인", action: "return_to_intro" }] },
    "research_paradox_result": { text: "", choices: [{ text: "확인", action: "return_to_intro" }] },
    "data_corruption_result": { text: "", choices: [{ text: "확인", action: "return_to_intro" }] },
    "contemplation_menu": {
        text: "어떤 사색에 잠기시겠습니까?",
        choices: [
            { text: "알고리즘 실행 (행동력 1 소모)", action: "run_random_algorithm" },
            { text: "레거시 코드 디버깅 (행동력 1 소모)", action: "debug_legacy_code" },
            { text: "취소", action: "return_to_intro" }
        ]
    },
};

const symposiumOutcomes = [
    {
        condition: (gs) => gs.knowledge < 40,
        weight: 40,
        effect: (gs) => {
            const knowledgeLoss = getRandomValue(10, 4);
            const efficiencyLoss = getRandomValue(5, 2);
            const focusLoss = getRandomValue(5, 2);
            return {
                changes: { knowledge: gs.knowledge - knowledgeLoss, efficiency: gs.efficiency - efficiencyLoss, focus: gs.focus - focusLoss },
                message: `기초 지식 부족으로 심포지엄의 논의가 길을 잃었습니다. (-${knowledgeLoss} 지식, -${efficiencyLoss} 효율, -${focusLoss} 집중)`
            };
        }
    },
    {
        condition: (gs) => gs.logic > 70 && gs.innovation > 60,
        weight: 30,
        effect: (gs) => {
            const innovationGain = getRandomValue(15, 5);
            const knowledgeGain = getRandomValue(10, 3);
            const focusGain = getRandomValue(10, 3);
            return {
                changes: { innovation: gs.innovation + innovationGain, knowledge: gs.knowledge + knowledgeGain, focus: gs.focus + focusGain },
                message: `높은 논리와 혁신성을 바탕으로 획기적인 아이디어가 도출되었습니다! (+${innovationGain} 혁신, +${knowledgeGain} 지식, +${focusGain} 집중)`
            };
        }
    },
    {
        condition: (gs) => gs.resources.compute < gs.researchers.length * 4,
        weight: 25,
        effect: (gs) => {
            const logicGain = getRandomValue(10, 3);
            const focusGain = getRandomValue(5, 2);
            return {
                changes: { logic: gs.logic + logicGain, focus: gs.focus + focusGain },
                message: `연산력 부족 문제에 대해 논의했습니다. 자원 분배를 최적화하여 위기를 극복했습니다. (+${logicGain} 논리, +${focusGain} 집중)`
            };
        }
    },
    {
        condition: (gs) => gs.researchers.some(r => r.collaboration < 50),
        weight: 20,
        effect: (gs) => {
            const researcher = gs.researchers.find(r => r.collaboration < 50);
            const collaborationGain = getRandomValue(10, 4);
            const logicGain = getRandomValue(5, 2);
            const focusGain = getRandomValue(5, 2);
            const updatedResearchers = gs.researchers.map(r => r.id === researcher.id ? { ...r, collaboration: Math.min(100, r.collaboration + collaborationGain) } : r);
            return {
                changes: { researchers: updatedResearchers, logic: gs.logic + logicGain, focus: gs.focus + focusGain },
                message: `심포지엄 중, ${researcher.name}이(가) 자신의 연구에 대한 비판적 의견을 제시했습니다. 그의 논리를 존중하고 토론하자 협력도가 상승했습니다. (+${collaborationGain} ${researcher.name} 협력도, +${logicGain} 논리, +${focusGain} 집중)`
            };
        }
    },
    {
        condition: () => true,
        weight: 20,
        effect: (gs) => {
            const efficiencyGain = getRandomValue(5, 2);
            const focusGain = getRandomValue(3, 1);
            return {
                changes: { efficiency: gs.efficiency + efficiencyGain, focus: gs.focus + focusGain },
                message: `평범한 심포지엄이었지만, 연구 진행 상황을 공유하며 효율성과 집중력이 약간 향상되었습니다. (+${efficiencyGain} 효율, +${focusGain} 집중)`
            };
        }
    },
    {
        condition: (gs) => gs.efficiency < 40 || gs.logic < 40,
        weight: 25,
        effect: (gs) => {
            const knowledgeLoss = getRandomValue(5, 2);
            const efficiencyLoss = getRandomValue(5, 2);
            const focusLoss = getRandomValue(5, 2);
            return {
                changes: { knowledge: gs.knowledge - knowledgeLoss, efficiency: gs.efficiency - efficiencyLoss, focus: gs.focus - focusLoss },
                message: `논의가 핵심을 벗어나며 소모적인 토론으로 끝났습니다. 지식, 효율, 집중력이 약간 감소했습니다. (-${knowledgeLoss} 지식, -${efficiencyLoss} 효율, -${focusLoss} 집중)`
            };
        }
    }
];

const exploreOutcomes = [
    {
        condition: (gs) => gs.resources.compute < 20,
        weight: 30,
        effect: (gs) => {
            const computeGain = getRandomValue(10, 5);
            return {
                changes: { resources: { ...gs.resources, compute: gs.resources.compute + computeGain } },
                message: `연구소 서버실에서 미사용 연산력을 발견했습니다! (+${computeGain} 연산력)`
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
                message: `창고에서 재활용 가능한 재료를 찾아냈습니다! (+${materialsGain} 재료)`
            };
        }
    },
    {
        condition: (gs) => true,
        weight: 20,
        effect: (gs) => {
            const logicGain = getRandomValue(5, 2);
            const innovationGain = getRandomValue(5, 2);
            return {
                changes: { logic: gs.logic + logicGain, innovation: gs.innovation + innovationGain },
                message: `연구소를 탐사하며 새로운 아이디어를 구상했습니다. (+${logicGain} 논리, +${innovationGain} 혁신)`
            };
        }
    },
    {
        condition: () => true,
        weight: 25,
        effect: (gs) => {
            const actionLoss = getRandomValue(2, 1);
            const knowledgeLoss = getRandomValue(5, 2);
            const focusLoss = getRandomValue(5, 2);
            return {
                changes: { actionPoints: gs.actionPoints - actionLoss, knowledge: gs.knowledge - knowledgeLoss, focus: gs.focus - focusLoss },
                message: `복잡한 미로같은 복도를 헤매다 길을 잃었습니다. (-${actionLoss} 행동력, -${knowledgeLoss} 지식, -${focusLoss} 집중)`
            };
        }
    },
    {
        condition: () => true,
        weight: 15,
        effect: (gs) => {
            const logicLoss = getRandomValue(5, 2);
            const focusLoss = getRandomValue(5, 2);
            return {
                changes: { logic: gs.logic - logicLoss, focus: gs.focus - focusLoss },
                message: `탐사 중 사소한 오류에 발목을 잡혀 논리와 집중력이 약간 감소했습니다. (-${logicLoss} 논리, -${focusLoss} 집중)`
            };
        }
    }
];

const talkOutcomes = [
    {
        condition: (gs, researcher) => researcher.collaboration < 60,
        weight: 40,
        effect: (gs, researcher) => {
            const collaborationGain = getRandomValue(10, 5);
            const logicGain = getRandomValue(5, 2);
            const focusGain = getRandomValue(5, 2);
            const updatedResearchers = gs.researchers.map(r => r.id === researcher.id ? { ...r, collaboration: Math.min(100, r.collaboration + collaborationGain) } : r);
            return {
                changes: { researchers: updatedResearchers, logic: gs.logic + logicGain, focus: gs.focus + focusGain },
                message: `${researcher.name}${getWaGwaParticle(researcher.name)} 깊은 토론을 나누며 협력도와 당신의 집중력을 얻었습니다. (+${collaborationGain} ${researcher.name} 협력도, +${logicGain} 논리, +${focusGain} 집중)`
            };
        }
    },
    {
        condition: (gs, researcher) => researcher.personality === "분석적",
        weight: 20,
        effect: (gs, researcher) => {
            const knowledgeGain = getRandomValue(10, 3);
            const innovationGain = getRandomValue(5, 2);
            return {
                changes: { knowledge: gs.knowledge + knowledgeGain, innovation: gs.innovation + innovationGain },
                message: `${researcher.name}${getWaGwaParticle(researcher.name)} 날카로운 토론을 나누며 지식과 혁신성이 상승했습니다. (+${knowledgeGain} 지식, +${innovationGain} 혁신)`
            };
        }
    },
    {
        condition: (gs, researcher) => researcher.skill === "정보학",
        weight: 15,
        effect: (gs, researcher) => {
            const computeGain = getRandomValue(5, 2);
            return {
                changes: { resources: { ...gs.resources, compute: gs.resources.compute + computeGain } },
                message: `${researcher.name}${getWaGwaParticle(researcher.name)} 알고리즘에 대한 유용한 정보를 얻어 연산력을 추가로 확보했습니다. (+${computeGain} 연산력)`
            };
        }
    },
    {
        condition: (gs, researcher) => true,
        weight: 25,
        effect: (gs, researcher) => {
            const efficiencyGain = getRandomValue(5, 2);
            const focusGain = getRandomValue(3, 1);
            return {
                changes: { efficiency: gs.efficiency + efficiencyGain, focus: gs.focus + focusGain },
                message: `${researcher.name}${getWaGwaParticle(researcher.name)} 연구 진행 상황을 공유하며 효율성과 집중력이 조금 더 단단해졌습니다. (+${efficiencyGain} 효율, +${focusGain} 집중)`
            };
        }
    },
    {
        condition: (gs, researcher) => gs.efficiency < 40 || researcher.collaboration < 40,
        weight: 20,
        effect: (gs, researcher) => {
            const collaborationLoss = getRandomValue(10, 3);
            const knowledgeLoss = getRandomValue(5, 2);
            const focusLoss = getRandomValue(5, 2);
            const updatedResearchers = gs.researchers.map(r => r.id === researcher.id ? { ...r, collaboration: Math.max(0, r.collaboration - collaborationLoss) } : r);
            return {
                changes: { researchers: updatedResearchers, knowledge: gs.knowledge - knowledgeLoss, focus: gs.focus - focusLoss },
                message: `${researcher.name}${getWaGwaParticle(researcher.name)} 토론 중 논리적 오류를 지적하다 감정이 상했습니다. (-${collaborationLoss} ${researcher.name} 협력도, -${knowledgeLoss} 지식, -${focusLoss} 집중)`
            };
        }
    },
    {
        condition: (gs) => gs.knowledge < 30,
        weight: 15,
        effect: (gs, researcher) => {
            const actionLoss = getRandomValue(1, 0);
            const innovationLoss = getRandomValue(5, 2);
            return {
                changes: { actionPoints: gs.actionPoints - actionLoss, innovation: gs.innovation - innovationLoss },
                message: `${researcher.name}${getWaGwaParticle(researcher.name)} 토론이 길어졌지만, 특별한 소득은 없었습니다. 당신의 혁신성이 감소했습니다. (-${actionLoss} 행동력, -${innovationLoss} 혁신)`
            };
        }
    }
];

function calculateMinigameReward(minigameName, score) {
    let rewards = { logic: 0, knowledge: 0, efficiency: 0, innovation: 0, focus: 0, message: "" };

    switch (minigameName) {
        case "논리 회로 퍼즐":
            if (score >= 51) {
                rewards.logic = 15;
                rewards.knowledge = 10;
                rewards.focus = 5;
                rewards.message = `완벽한 논리입니다! (+15 논리, +10 지식, +5 집중)`;
            } else if (score >= 21) {
                rewards.logic = 10;
                rewards.knowledge = 5;
                rewards.message = `훌륭한 논리 회로입니다! (+10 논리, +5 지식)`;
            } else if (score >= 0) {
                rewards.logic = 5;
                rewards.message = `논리 회로 퍼즐을 완료했습니다. (+5 논리)`;
            } else {
                rewards.message = `논리 회로 퍼즐을 완료했지만, 아쉽게도 보상은 없습니다.`;
            }
            break;
        // ... other minigame rewards
        default:
            rewards.message = `미니게임 ${minigameName}을(를) 완료했습니다.`;
            break;
    }
    return rewards;
}

const minigames = [
    {
        name: "논리 회로 퍼즐",
        description: "주어진 입출력에 맞게 논리 게이트를 연결하여 회로를 완성하세요.",
        start: (gameArea, choicesDiv) => {
            // Placeholder implementation
            gameState.minigameState = { score: 0 };
            gameArea.innerHTML = `<p>${minigames[0].description}</p><p>게임을 시작합니다! (구현 예정)</p>`;
            choicesDiv.innerHTML = `<button class="choice-btn" onclick="minigames[0].processAction('endGame')">게임 종료</button>`;
        },
        render: () => {}, 
        processAction: (actionType) => {
            if (actionType === 'endGame') {
                gameState.minigameState.score = getRandomValue(30, 20); // Random score for placeholder
                minigames[0].end();
            }
        },
        end: () => {
            const rewards = calculateMinigameReward(minigames[0].name, gameState.minigameState.score);
            updateState({
                logic: gameState.logic + rewards.logic,
                knowledge: gameState.knowledge + rewards.knowledge,
                efficiency: gameState.efficiency + rewards.efficiency,
                innovation: gameState.innovation + rewards.innovation,
                focus: gameState.focus + rewards.focus,
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    // ... other 4 placeholder minigames
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
    explore: () => {
        if (!spendActionPoint()) return;
        const possibleOutcomes = exploreOutcomes.filter(outcome => outcome.condition(gameState));
        const totalWeight = possibleOutcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
        const rand = currentRandFn() * totalWeight;
        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(outcome => {
            cumulativeWeight += outcome.weight;
            return rand < cumulativeWeight;
        }) || exploreOutcomes.find(o => o.condition());
        const result = chosenOutcome.effect(gameState);
        updateState({ ...result.changes, dailyActions: { ...gameState.dailyActions, explored: true } }, result.message);
    },
    talk_to_researchers: () => {
        if (!spendActionPoint()) return;
        const researcher = gameState.researchers[Math.floor(currentRandFn() * gameState.researchers.length)];
        if (gameState.dailyActions.talkedTo.includes(researcher.id)) {
            updateState({}, `${researcher.name}${getWaGwaParticle(researcher.name)} 이미 충분히 토론했습니다.`);
            return;
        }
        const possibleOutcomes = talkOutcomes.filter(outcome => outcome.condition(gameState, researcher));
        const totalWeight = possibleOutcomes.reduce((sum, outcome) => sum + outcome.weight, 0);
        const rand = currentRandFn() * totalWeight;
        let cumulativeWeight = 0;
        let chosenOutcome = possibleOutcomes.find(outcome => {
            cumulativeWeight += outcome.weight;
            return rand < cumulativeWeight;
        }) || talkOutcomes.find(o => o.condition(gs, researcher));
        const result = chosenOutcome.effect(gameState, researcher);
        updateState({ ...result.changes, dailyActions: { ...gameState.dailyActions, talkedTo: [...gameState.dailyActions.talkedTo, researcher.id] } }, result.message);
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
        }) || symposiumOutcomes.find(o => o.condition());
        const result = chosenOutcome.effect(gameState);
        updateState(result.changes, result.message);
    },
    // ... (The rest of the gameActions, translated and completed for INTP)
    return_to_intro: () => updateState({ currentScenarioId: 'intro' }),
    show_contemplation_options: () => updateState({ currentScenarioId: 'contemplation_menu' }),
    run_random_algorithm: () => {
        if (!spendActionPoint()) return;
        let message = "";
        let changes = {};
        const rand = currentRandFn();
        if (rand < 0.1) {
            const computeGain = getRandomValue(30, 10);
            message = `알고리즘 최적화 성공! 엄청난 연산력을 확보했습니다! (+${computeGain} 연산력)`;
            changes.resources = { ...gameState.resources, compute: gameState.resources.compute + computeGain };
        } else if (rand < 0.4) {
            const knowledgeGain = getRandomValue(10, 5);
            message = `알고리즘 실행 중 새로운 패턴을 발견했습니다. (+${knowledgeGain} 지식)`;
            changes.knowledge = gameState.knowledge + knowledgeGain;
        } else if (rand < 0.7) {
            const focusLoss = getRandomValue(5, 2);
            message = `알고리즘에 오류가 발생했습니다. 집중력이 약간 감소합니다. (-${focusLoss} 집중)`;
            changes.focus = gameState.focus - focusLoss;
        } else {
            message = `알고리즘은 특별한 결과 없이 종료되었습니다.`;
        }
        updateState({ ...changes, currentScenarioId: 'contemplation_menu' }, message);
    },
    debug_legacy_code: () => {
        if (!spendActionPoint()) return;
        let message = "";
        let changes = {};
        const rand = currentRandFn();
        if (rand < 0.2) {
            const quantumBitGain = getRandomValue(3, 1);
            message = `레거시 코드에서 양자 얽힘의 비밀을 발견했습니다! (+${quantumBitGain} 양자 비트)`;
            changes.resources = { ...gameState.resources, quantum_bits: (gameState.resources.quantum_bits || 0) + quantumBitGain };
        } else if (rand < 0.6) {
            const materialsGain = getRandomValue(10, 5);
            message = `오래된 코드에서 재활용 가능한 재료를 추출했습니다. (+${materialsGain} 재료)`;
            changes.resources = { ...gameState.resources, materials: gameState.resources.materials + materialsGain };
        } else {
            message = `레거시 코드는 너무 복잡해서 아무것도 발견하지 못했습니다.`;
        }
        updateState({ ...changes, currentScenarioId: 'contemplation_menu' }, message);
    },
    play_minigame: () => {
        if (gameState.dailyActions.minigamePlayed) { updateGameDisplay("오늘의 미니게임은 이미 플레이했습니다."); return; }
        if (!spendActionPoint()) return;
        const minigameIndex = (gameState.day - 1) % minigames.length;
        const minigame = minigames[minigameIndex];
        gameState.currentScenarioId = `minigame_${minigame.name}`;
        updateState({ dailyActions: { ...gameState.dailyActions, minigamePlayed: true } });
        updateGameDisplay(minigame.description);
        minigame.start(document.getElementById('gameArea'), document.getElementById('gameChoices'));
    },
};

// --- Daily/Initialization Logic ---
function applyStatEffects() {
    let message = "";
    if (gameState.logic >= 70) {
        gameState.dailyBonus.generationSuccess += 0.1;
        message += "높은 논리 지수 덕분에 자원 생성 성공률이 증가합니다. ";
    }
    if (gameState.logic < 30) {
        gameState.researchers.forEach(r => r.collaboration = Math.max(0, r.collaboration - 5));
        message += "낮은 논리 지수로 인해 연구원들의 협력도가 하락합니다. ";
    }
    if (gameState.knowledge >= 70) {
        gameState.maxActionPoints += 1;
        gameState.actionPoints = gameState.maxActionPoints;
        message += "풍부한 지식 덕분에 연구에 활기가 넘쳐 행동력이 증가합니다. ";
    }
    if (gameState.knowledge < 30) {
        gameState.maxActionPoints = Math.max(5, gameState.maxActionPoints - 1);
        gameState.actionPoints = Math.min(gameState.actionPoints, gameState.maxActionPoints);
        message += "지식 수준이 정체되어 연구에 침체기가 찾아와 행동력이 감소합니다. ";
    }
    if (gameState.efficiency >= 70) {
        Object.keys(gameState.labFacilities).forEach(key => {
            if (gameState.labFacilities[key].built) gameState.labFacilities[key].durability = Math.min(100, gameState.labFacilities[key].durability + 1);
        });
        message += "높은 효율성 덕분에 시설물 유지보수가 더 잘 이루어집니다. ";
    }
    if (gameState.efficiency < 30) {
        Object.keys(gameState.labFacilities).forEach(key => {
            if (gameState.labFacilities[key].built) gameState.labFacilities[key].durability = Math.max(0, gameState.labFacilities[key].durability - 2);
        });
        message += "효율성이 약화되어 시설물들이 빠르게 노후화됩니다. ";
    }
    if (gameState.innovation >= 70) {
        const knowledgeGain = getRandomValue(5, 2);
        gameState.knowledge = Math.min(100, gameState.knowledge + knowledgeGain);
        message += `당신의 높은 혁신성 덕분에 새로운 지식을 얻습니다! (+${knowledgeGain} 지식) `;
    }
    if (gameState.innovation < 30) {
        const knowledgeLoss = getRandomValue(5, 2);
        gameState.knowledge = Math.max(0, gameState.knowledge - knowledgeLoss);
        message += `혁신성이 약해져 연구가 정체됩니다. (-${knowledgeLoss} 지식) `;
    }
    if (gameState.focus >= 70) {
        const efficiencyGain = getRandomValue(5, 2);
        gameState.efficiency = Math.min(100, gameState.efficiency + efficiencyGain);
        message += `당신의 높은 집중력 덕분에 연구 효율이 오릅니다. (+${efficiencyGain} 효율) `;
    }
    if (gameState.focus < 30) {
        const efficiencyLoss = getRandomValue(5, 2);
        gameState.efficiency = Math.max(0, gameState.efficiency - efficiencyLoss);
        message += `집중력이 약해져 연구 효율이 떨어집니다. (-${efficiencyLoss} 효율) `;
    }
    return message;
}

const weightedDailyEvents = [
    { id: "daily_event_overload", weight: 10, condition: () => true, onTrigger: () => {
        const computeLoss = getRandomValue(10, 5);
        gameScenarios.daily_event_overload.text = `지난 밤 서버 과부하로 인해 연산력 일부가 손실되었습니다. (-${computeLoss} 연산력)`;
        updateState({ resources: { ...gameState.resources, compute: Math.max(0, gameState.resources.compute - computeLoss) } });
    } },
    { id: "daily_event_corruption", weight: 10, condition: () => true, onTrigger: () => {
        const materialsLoss = getRandomValue(10, 5);
        gameScenarios.daily_event_corruption.text = `보관중이던 재료 일부가 오염되었습니다. (-${materialsLoss} 재료)`;
        updateState({ resources: { ...gameState.resources, materials: Math.max(0, gameState.resources.materials - materialsLoss) } });
    } },
    { id: "daily_event_breakthrough", weight: 7, condition: () => true, onTrigger: () => {
        const knowledgeGain = getRandomValue(15, 5);
        gameScenarios.daily_event_breakthrough.text = `간밤에 연구 돌파가 있었습니다! (+${knowledgeGain} 지식)`;
        updateState({ knowledge: gameState.knowledge + knowledgeGain });
    } },
    { id: "daily_event_paradox", weight: 15, condition: () => gameState.researchers.length >= 2 },
    { id: "daily_event_new_researcher", weight: 10, condition: () => gameState.labFacilities.mainControlRoom.built && gameState.researchers.length < gameState.maxResearchers, onTrigger: () => {
        // ... (implementation for new researcher)
    }},
    { id: "daily_event_tech_exchange", weight: 15, condition: () => gameState.labFacilities.mainControlRoom.built },
    { id: "daily_event_legacy_code", weight: 15, condition: () => true },
    { id: "daily_event_visiting_scholar", weight: 10, condition: () => true },
    { id: "daily_event_system_hack", weight: 15, condition: () => gameState.resources.compute > 30 },
    { id: "daily_event_research_paradox", weight: 10, condition: () => gameState.researchers.length >= 3 && gameState.efficiency < 50 },
    { id: "daily_event_data_corruption", weight: 5, condition: () => gameState.knowledge < 40 || gameState.resources.compute < 20 },
];

function processDailyEvents() {
    if (gameState.dailyEventTriggered) return;
    currentRandFn = mulberry32(getDailySeed() + gameState.day);

    updateState({
        actionPoints: 10,
        maxActionPoints: 10,
        dailyActions: { explored: false, symposiumHeld: false, talkedTo: [], minigamePlayed: false },
        dailyEventTriggered: true,
        dailyBonus: { generationSuccess: 0 }
    });

    const statEffectMessage = applyStatEffects();
    let skillBonusMessage = "";
    let durabilityMessage = "";

    gameState.researchers.forEach(r => {
        if (r.skill === '물리학') { gameState.resources.energy++; skillBonusMessage += `${r.name}의 연구 덕분에 에너지를 추가로 얻었습니다. `; }
        else if (r.skill === '화학') { gameState.resources.materials++; skillBonusMessage += `${r.name}의 실험 덕분에 재료를 추가로 얻었습니다. `; }
        else if (r.skill === '정보학') { gameState.resources.compute++; skillBonusMessage += `${r.name}의 연산 덕분에 연산력을 추가로 얻었습니다. `; }
    });

    Object.keys(gameState.labFacilities).forEach(key => {
        const facility = gameState.labFacilities[key];
        if(facility.built) {
            facility.durability -= 1;
            if(facility.durability <= 0) {
                facility.built = false;
                durabilityMessage += `${facility.name} 시설이 파손되었습니다! 수리가 필요합니다. `;
            }
        }
    });

    gameState.resources.compute -= gameState.researchers.length * 2;
    let dailyMessage = "새로운 연구일이 시작되었습니다. ";
    dailyMessage += statEffectMessage + skillBonusMessage + durabilityMessage;
    if (gameState.resources.compute < 0) {
        gameState.efficiency -= 10;
        dailyMessage += "연산력이 부족하여 연구 효율이 떨어집니다! (-10 효율)";
    }

    if (gameState.logic <= 0) { gameState.currentScenarioId = "game_over_logic"; }
    else if (gameState.knowledge <= 0) { gameState.currentScenarioId = "game_over_knowledge"; }
    else if (gameState.efficiency <= 0) { gameState.currentScenarioId = "game_over_efficiency"; }
    else if (gameState.innovation <= 0) { gameState.currentScenarioId = "game_over_innovation"; }
    else if (gameState.focus <= 0) { gameState.currentScenarioId = "game_over_focus"; }
    else if (gameState.resources.compute < -(gameState.researchers.length * 5)) { gameState.currentScenarioId = "game_over_resources"; }

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
    if (confirm("정말로 게임을 초기화하시겠습니까? 모든 진행 상황이 사라집니다.")) {
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
        document.getElementById('nextDayBtn').addEventListener('click', () => {
            if (gameState.manualDayAdvances >= 5) {
                updateGameDisplay("오늘은 더 이상 수동으로 날짜를 넘길 수 없습니다. 내일 다시 시도해주세요.");
                return;
            }
            updateState({
                manualDayAdvances: gameState.manualDayAdvances + 1,
                day: gameState.day + 1,
                lastPlayedDate: new Date().toISOString().slice(0, 10),
                dailyEventTriggered: false
            });
            processDailyEvents();
        });
    } catch (e) {
        console.error("오늘의 게임 생성 중 오류 발생:", e);
        document.getElementById('gameDescription').innerText = "콘텐츠를 불러오는 데 실패했습니다. 페이지를 새로고침해 주세요.";
    }
};