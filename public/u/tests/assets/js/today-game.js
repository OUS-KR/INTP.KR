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
            { text: "에너지 집약", "action": "perform_condense_energy" },
            { text: "취소", "action": "return_to_intro" }
        ]
    },
    "action_facility_management": {
        text: "어떤 시설을 관리하시겠습니까?",
        choices: []
    },
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
    // ... other INTP-themed outcomes
];

// ... (rest of the game logic, adapted for INTP)
// The full implementation will be provided in the write_file call.
