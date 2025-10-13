// today-game.js - 지식의 연구소 (The Knowledge Lab)

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
            dataArchive: { built: false, durability: 100 },
            fabricationBay: { built: false, durability: 100 },
            mainControlRoom: { built: false, durability: 100 },
            theoryLibrary: { built: false, durability: 100 },
            advancedLab: { built: false, durability: 100 }
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
        <p><b>논리:</b> ${gameState.logic} | <b>지식:</b> ${gameState.knowledge} | <b>효율:</b> ${gameState.efficiency}</p>
        <p><b>자원:</b> 연산력 ${gameState.resources.compute}, 재료 ${gameState.resources.materials}, 에너지 ${gameState.resources.energy}, 양자 비트 ${gameState.resources.quantum_bits || 0}</p>
        <p><b>기술 레벨:</b> ${gameState.techLevel}</p>
        <p><b>소속 연구원 (${gameState.researchers.length}/${gameState.maxResearchers}):</b></p>
        <ul>${researcherListHtml}</ul>
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
                dynamicChoices.push({ text: `${key} 유지보수 (재료 10, 에너지 10)`, action: "maintain_facility", params: { facility: key } });
            }
        });
        dynamicChoices.push({ text: "취소", action: "return_to_intro" });
    } else {
        dynamicChoices = choices ? [...choices] : [];
    }

    choicesDiv.innerHTML = dynamicChoices.map(choice => `<button class="choice-btn" data-action="${choice.action}" data-params='${JSON.stringify(choice.params || {})}''">${choice.text}</button>`).join('');
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
        { text: "연구소 둘러보기", action: "explore" },
        { text: "연구원과 토론하기", action: "talk_to_researchers" },
        { text: "아이디어 심포지엄 개최", action: "hold_symposium" },
        { text: "자원 생성", action: "show_resource_generation_options" },
        { text: "연구 시설 관리", action: "show_facility_options" },
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
    "daily_event_overload": { text: "지난 밤 서버 과부하로 인해 연구소 재료 일부가 손상되었습니다. (-10 재료)", choices: [{ text: "확인", action: "return_to_intro" }] },
    "daily_event_corruption": { text: "데이터 손실이 발생하여 연산력 일부를 복구에 사용했습니다. (-10 연산력)", choices: [{ text: "확인", action: "return_to_intro" }] },
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
    "game_over_logic": { text: "연구소의 논리 지수가 너무 낮아 비합리적인 결론만 도출됩니다. 연구는 중단되었습니다.", choices: [], final: true },
    "game_over_knowledge": { text: "연구원들의 지식 수준이 정체되었습니다. 더 이상의 혁신은 일어나지 않습니다.", choices: [], final: true },
    "game_over_efficiency": { text: "연구소의 효율이 무너져 시스템이 마비되었습니다. 아무것도 진행할 수 없습니다.", choices: [], final: true },
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
    "resource_generation_result": {
        text: "",
        choices: [{ text: "확인", action: "show_resource_generation_options" }]
    },
    "facility_management_result": {
        text: "",
        choices: [{ text: "확인", action: "show_facility_options" }]
    },
    "paradox_resolution_result": {
        text: "",
        choices: [{ text: "확인", action: "return_to_intro" }]
    }
};

function calculateMinigameReward(minigameName, score) {
    let rewards = { logic: 0, knowledge: 0, efficiency: 0, message: "" };

    switch (minigameName) {
        case "기억력 순서 맞추기":
            if (score >= 51) {
                rewards.knowledge = 15;
                rewards.logic = 10;
                rewards.efficiency = 5;
                rewards.message = "완벽한 기억력입니다! 새로운 패턴을 발견했습니다. (+15 지식, +10 논리, +5 효율)";
            } else if (score >= 21) {
                rewards.knowledge = 10;
                rewards.logic = 5;
                rewards.message = "훌륭한 기억력입니다. (+10 지식, +5 논리)";
            } else if (score >= 0) {
                rewards.knowledge = 5;
                rewards.message = "기억력 게임을 완료했습니다. (+5 지식)";
            } else {
                rewards.message = "기억력 게임을 완료했지만, 아쉽게도 보상은 없습니다.";
            }
            break;
        case "논리 회로 퍼즐":
            rewards.logic = 10;
            rewards.message = "논리 회로 퍼즐을 해결했습니다. (+10 논리)";
            break;
        case "추상적 추론 퀴즈":
            rewards.knowledge = 5;
            rewards.logic = 5;
            rewards.message = "추상적 추론 퀴즈를 완료했습니다. (+5 지식, +5 논리)";
            break;
        case "알고리즘 최적화":
            rewards.efficiency = 10;
            rewards.message = "알고리즘을 최적화했습니다. (+10 효율)";
            break;
        case "가설 검증 챌린지":
            rewards.knowledge = 10;
            rewards.logic = 5;
            rewards.message = "가설 검증에 성공했습니다. (+10 지식, +5 논리)";
            break;
        default:
            rewards.message = `미니게임 ${minigameName}을(를) 완료했습니다.`;
            break;
    }
    return rewards;
}

const minigames = [
    {
        name: "기억력 순서 맞추기",
        description: "화면에 나타나는 숫자 순서를 기억하고 정확하게 입력하세요. 단계가 올라갈수록 어려워집니다!",
        start: (gameArea, choicesDiv) => {
            gameState.minigameState = { currentSequence: [], playerInput: [], stage: 1, score: 0, showingSequence: false };
            minigames[0].render(gameArea, choicesDiv);
            minigames[0].showSequence();
        },
        render: (gameArea, choicesDiv) => {
            gameArea.innerHTML = `
                <p><b>단계:</b> ${gameState.minigameState.stage} | <b>점수:</b> ${gameState.minigameState.score}</p>
                <p id="sequenceDisplay" style="font-size: 2em; font-weight: bold; min-height: 1.5em;"></p>
                <p>순서를 기억하고 입력하세요:</p>
                <div id="playerInputDisplay" style="font-size: 1.5em; min-height: 1.5em;">${gameState.minigameState.playerInput.join(' ')}</div>
            `;
            choicesDiv.innerHTML = `
                <div class="number-pad">
                    ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => `<button class="choice-btn num-btn" data-value="${num}">${num}</button>`).join('')}
                    <button class="choice-btn num-btn" data-value="0">0</button>
                    <button class="choice-btn submit-btn" data-action="submitSequence">입력 완료</button>
                    <button class="choice-btn reset-btn" data-action="resetInput">초기화</button>
                </div>
            `;
            choicesDiv.querySelectorAll('.num-btn').forEach(button => {
                button.addEventListener('click', () => minigames[0].processAction('addInput', button.dataset.value));
            });
            choicesDiv.querySelector('.submit-btn').addEventListener('click', () => minigames[0].processAction('submitSequence'));
            choicesDiv.querySelector('.reset-btn').addEventListener('click', () => minigames[0].processAction('resetInput'));
        },
        showSequence: () => {
            gameState.minigameState.showingSequence = true;
            gameState.minigameState.currentSequence = [];
            const sequenceLength = gameState.minigameState.stage + 2;
            for (let i = 0; i < sequenceLength; i++) {
                gameState.minigameState.currentSequence.push(Math.floor(currentRandFn() * 10));
            }

            const sequenceDisplay = document.getElementById('sequenceDisplay');
            let i = 0;
            const interval = setInterval(() => {
                if (i < gameState.minigameState.currentSequence.length) {
                    sequenceDisplay.innerText = gameState.minigameState.currentSequence[i];
                    i++;
                } else {
                    clearInterval(interval);
                    sequenceDisplay.innerText = "입력하세요!";
                    gameState.minigameState.showingSequence = false;
                }
            }, 800);
        },
        processAction: (actionType, value = null) => {
            if (gameState.minigameState.showingSequence) return;

            if (actionType === 'addInput') {
                gameState.minigameState.playerInput.push(parseInt(value));
                document.getElementById('playerInputDisplay').innerText = gameState.minigameState.playerInput.join(' ');
            } else if (actionType === 'resetInput') {
                gameState.minigameState.playerInput = [];
                document.getElementById('playerInputDisplay').innerText = '';
            } else if (actionType === 'submitSequence') {
                const correct = gameState.minigameState.currentSequence.every((num, i) => num === gameState.minigameState.playerInput[i]);

                if (correct && gameState.minigameState.playerInput.length === gameState.minigameState.currentSequence.length) {
                    gameState.minigameState.score += gameState.minigameState.currentSequence.length * 10;
                    gameState.minigameState.stage++;
                    gameState.minigameState.playerInput = [];
                    updateGameDisplay("정답입니다! 다음 단계로 넘어갑니다.");
                    minigames[0].render(document.getElementById('gameArea'), document.getElementById('gameChoices'));
                    setTimeout(() => minigames[0].showSequence(), 1500);
                } else {
                    updateGameDisplay("오답입니다. 게임 종료.");
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
                currentScenarioId: 'intro'
            }, rewards.message);
            gameState.minigameState = {};
        }
    },
    { name: "논리 회로 퍼즐", description: "주어진 입출력에 맞게 논리 회로를 완성하세요.", start: (ga, cd) => { ga.innerHTML = "<p>논리 회로 퍼즐 - 개발 중</p>"; cd.innerHTML = "<button class='choice-btn' onclick='minigames[1].end()'>종료</button>"; gameState.minigameState = { score: 10 }; }, render: () => {}, processAction: () => {}, end: () => { const r = calculateMinigameReward(minigames[1].name, gameState.minigameState.score); updateState({ logic: gameState.logic + r.logic, knowledge: gameState.knowledge + r.knowledge, efficiency: gameState.efficiency + r.efficiency, currentScenarioId: 'intro' }, r.message); gameState.minigameState = {}; } },
    { name: "추상적 추론 퀴즈", description: "다음 패턴을 보고 이어질 도형을 추론하세요.", start: (ga, cd) => { ga.innerHTML = "<p>추상적 추론 퀴즈 - 개발 중</p>"; cd.innerHTML = "<button class='choice-btn' onclick='minigames[2].end()'>종료</button>"; gameState.minigameState = { score: 15 }; }, render: () => {}, processAction: () => {}, end: () => { const r = calculateMinigameReward(minigames[2].name, gameState.minigameState.score); updateState({ logic: gameState.logic + r.logic, knowledge: gameState.knowledge + r.knowledge, efficiency: gameState.efficiency + r.efficiency, currentScenarioId: 'intro' }, r.message); gameState.minigameState = {}; } },
    { name: "알고리즘 최적화", description: "주어진 문제에 대해 가장 효율적인 알고리즘을 선택하세요.", start: (ga, cd) => { ga.innerHTML = "<p>알고리즘 최적화 - 개발 중</p>"; cd.innerHTML = "<button class='choice-btn' onclick='minigames[3].end()'>종료</button>"; gameState.minigameState = { score: 20 }; }, render: () => {}, processAction: () => {}, end: () => { const r = calculateMinigameReward(minigames[3].name, gameState.minigameState.score); updateState({ logic: gameState.logic + r.logic, knowledge: gameState.knowledge + r.knowledge, efficiency: gameState.efficiency + r.efficiency, currentScenarioId: 'intro' }, r.message); gameState.minigameState = {}; } },
    { name: "가설 검증 챌린지", description: "제한된 정보로 가장 타당한 가설을 선택하고 검증하세요.", start: (ga, cd) => { ga.innerHTML = "<p>가설 검증 챌린지 - 개발 중</p>"; cd.innerHTML = "<button class='choice-btn' onclick='minigames[4].end()'>종료</button>"; gameState.minigameState = { score: 25 }; }, render: () => {}, processAction: () => {}, end: () => { const r = calculateMinigameReward(minigames[4].name, gameState.minigameState.score); updateState({ logic: gameState.logic + r.logic, knowledge: gameState.knowledge + r.knowledge, efficiency: gameState.efficiency + r.efficiency, currentScenarioId: 'intro' }, r.message); gameState.minigameState = {}; } }
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
        if (gameState.dailyActions.explored) { updateState({ dailyActions: { ...gameState.dailyActions, explored: true } }, "오늘은 더 이상 새로운 것을 발견하지 못했습니다."); return; }
        
        let changes = { dailyActions: { ...gameState.dailyActions, explored: true } };
        let message = "연구소를 둘러보니 조용하고 평화롭습니다.";
        const rand = currentRandFn();
        if (rand < 0.3) { message += " 흥미로운 논문 초안을 발견했습니다. (+2 지식)"; changes.knowledge = gameState.knowledge + 2; }
        else if (rand < 0.6) { message += " 유용한 부품 더미를 발견했습니다. (+2 재료)"; changes.resources = { ...gameState.resources, materials: gameState.resources.materials + 2 }; }
        else { message += " 특별한 것은 발견하지 못했습니다."; }
        
        updateState(changes, message);
    },
    talk_to_researchers: () => {
        if (!spendActionPoint()) return;
        const researcher = gameState.researchers[Math.floor(currentRandFn() * gameState.researchers.length)];
        if (gameState.dailyActions.talkedTo.includes(researcher.id)) { updateState({ dailyActions: { ...gameState.dailyActions, talkedTo: [...gameState.dailyActions.talkedTo, researcher.id] } }, `${researcher.name}${getWaGwaParticle(researcher.name)} 이미 충분히 토론했습니다.`); return; }
        
        let changes = { dailyActions: { ...gameState.dailyActions, talkedTo: [...gameState.dailyActions.talkedTo, researcher.id] } };
        let message = `${researcher.name}${getWaGwaParticle(researcher.name)} 토론했습니다. `;
        if (researcher.collaboration > 80) { message += `${researcher.name}는 당신의 논리에 감탄하며 새로운 아이디어를 제시했습니다. (+5 효율)`; changes.efficiency = gameState.efficiency + 5; }
        else if (researcher.collaboration < 40) { message += `${researcher.name}는 당신의 가설에 의문을 제기합니다. 더 명확한 근거가 필요합니다. (-5 지식)`; changes.knowledge = gameState.knowledge - 5; }
        else { message += `지적인 토론을 통해 새로운 관점을 얻었습니다. (+2 지식)`; changes.knowledge = gameState.knowledge + 2; }
        
        updateState(changes, message);
    },
    hold_symposium: () => {
        if (!spendActionPoint()) return;
        if (gameState.dailyActions.symposiumHeld) {
            const message = "오늘은 이미 심포지엄을 개최했습니다. 연속된 심포지엄은 연구원들의 집중력을 떨어뜨립니다. (-5 효율)";
            gameState.efficiency -= 5;
            updateState({ efficiency: gameState.efficiency }, message);
            return;
        }
        updateState({ dailyActions: { ...gameState.dailyActions, symposiumHeld: true } });
        const rand = currentRandFn();
        let message = "아이디어 심포지엄을 개최했습니다. ";
        if (rand < 0.5) { message += "연구원들이 활발하게 토론하며 연구 효율이 증대되었습니다. (+10 효율, +5 지식)"; updateState({ efficiency: gameState.efficiency + 10, knowledge: gameState.knowledge + 5 }); }
        else { message += "격렬한 논쟁이 있었지만, 당신의 중재로 새로운 합의점에 도달했습니다. (+5 논리)"; updateState({ logic: gameState.logic + 5 }); }
        updateGameDisplay(message);
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
    handle_paradox: (params) => {
        if (!spendActionPoint()) return;
        const { first, second } = params;
        let message = "";
        let reward = { logic: 0, knowledge: 0, efficiency: 0 };
        
        const updatedResearchers = gameState.researchers.map(r => {
            if (r.id === first) {
                r.collaboration = Math.min(100, r.collaboration + 10);
                message += `${r.name}의 가설을 지지했습니다. ${r.name}의 협력도가 상승했습니다. `;
                reward.logic += 5;
            } else if (r.id === second) {
                r.collaboration = Math.max(0, r.collaboration - 5);
                message += `${second}의 협력도가 약간 하락했습니다. `;
            }
            return r;
        });
        
        updateState({ ...reward, researchers: updatedResearchers, currentScenarioId: 'paradox_resolution_result' }, message);
    },
    mediate_paradox: () => {
        if (!spendActionPoint()) return;
        const message = "당신의 통찰력으로 두 가설을 통합하는 새로운 이론을 제시했습니다. 연구소의 효율이 크게 증가했습니다! (+10 효율, +5 지식)";
        updateState({ efficiency: gameState.efficiency + 10, knowledge: gameState.knowledge + 5, currentScenarioId: 'paradox_resolution_result' }, message);
    },
    ignore_event: () => {
        if (!spendActionPoint()) return;
        const message = "논리적 모순을 무시했습니다. 해결되지 않은 문제로 인해 연구 효율이 저하됩니다. (-10 효율, -5 논리)";
        const updatedResearchers = gameState.researchers.map(r => {
            r.collaboration = Math.max(0, r.collaboration - 5);
            return r;
        });
        updateState({ efficiency: gameState.efficiency - 10, logic: gameState.logic - 5, researchers: updatedResearchers, currentScenarioId: 'paradox_resolution_result' }, message);
    },
    show_resource_generation_options: () => updateState({ currentScenarioId: 'action_resource_generation' }),
    show_facility_options: () => updateState({ currentScenarioId: 'action_facility_management' }),
    perform_generate_compute: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.techLevel * 0.1) + (gameState.dailyBonus.generationSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            message = "연산력 확보에 성공했습니다! (+5 연산력)";
            changes.resources = { ...gameState.resources, compute: gameState.resources.compute + 5 };
        } else {
            message = "연산력 확보에 실패했습니다.";
        }
        updateState(changes, message);
    },
    perform_synthesize_materials: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.techLevel * 0.1) + (gameState.dailyBonus.generationSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            message = "재료 합성에 성공했습니다! (+5 재료)";
            changes.resources = { ...gameState.resources, materials: gameState.resources.materials + 5 };
        } else {
            message = "재료 합성에 실패했습니다.";
        }
        updateState(changes, message);
    },
    perform_condense_energy: () => {
        if (!spendActionPoint()) return;
        const successChance = Math.min(0.95, 0.6 + (gameState.techLevel * 0.1) + (gameState.dailyBonus.generationSuccess || 0));
        let message = "";
        let changes = {};
        if (currentRandFn() < successChance) {
            message = "에너지 집약에 성공했습니다! (+5 에너지)";
            changes.resources = { ...gameState.resources, energy: gameState.resources.energy + 5 };
        } else {
            message = "에너지 집약에 실패했습니다.";
        }
        updateState(changes, message);
    },
    build_data_archive: () => {
        if (!spendActionPoint()) return;
        const cost = { compute: 50, materials: 20 };
        let message = "";
        let changes = {};
        if (gameState.resources.materials >= cost.materials && gameState.resources.compute >= cost.compute) {
            gameState.labFacilities.dataArchive.built = true;
            message = "데이터 아카이브를 구축했습니다!";
            changes.efficiency = gameState.efficiency + 10;
            changes.resources = { ...gameState.resources, materials: gameState.resources.materials - cost.materials, compute: gameState.resources.compute - cost.compute };
        } else {
            message = "자원이 부족하여 구축할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_fabrication_bay: () => {
        if (!spendActionPoint()) return;
        const cost = { materials: 30, energy: 30 };
        let message = "";
        let changes = {};
        if (gameState.resources.materials >= cost.materials && gameState.resources.energy >= cost.energy) {
            gameState.labFacilities.fabricationBay.built = true;
            message = "제작실을 구축했습니다!";
            changes.knowledge = gameState.knowledge + 10;
            changes.resources = { ...gameState.resources, materials: gameState.resources.materials - cost.materials, energy: gameState.resources.energy - cost.energy };
        } else {
            message = "자원이 부족하여 구축할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_main_control_room: () => {
        if (!spendActionPoint()) return;
        const cost = { compute: 100, materials: 50, energy: 50 };
        let message = "";
        let changes = {};
        if (gameState.resources.materials >= cost.materials && gameState.resources.energy >= cost.energy && gameState.resources.compute >= cost.compute) {
            gameState.labFacilities.mainControlRoom.built = true;
            message = "중앙 통제실을 구축했습니다!";
            changes.efficiency = gameState.efficiency + 20;
            changes.knowledge = gameState.knowledge + 20;
            changes.resources = { ...gameState.resources, materials: gameState.resources.materials - cost.materials, energy: gameState.resources.energy - cost.energy, compute: gameState.resources.compute - cost.compute };
        } else {
            message = "자원이 부족하여 구축할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_theory_library: () => {
        if (!spendActionPoint()) return;
        const cost = { materials: 80, energy: 40 };
        let message = "";
        let changes = {};
        if (gameState.resources.materials >= cost.materials && gameState.resources.energy >= cost.energy) {
            gameState.labFacilities.theoryLibrary.built = true;
            message = "이론 라이브러리를 구축했습니다!";
            changes.logic = gameState.logic + 15;
            changes.efficiency = gameState.efficiency + 10;
            changes.resources = { ...gameState.resources, materials: gameState.resources.materials - cost.materials, energy: gameState.resources.energy - cost.energy };
        } else {
            message = "자원이 부족하여 구축할 수 없습니다.";
        }
        updateState(changes, message);
    },
    build_advanced_lab: () => {
        if (!spendActionPoint()) return;
        const cost = { materials: 50, energy: 100 };
        let message = "";
        let changes = {};
        if (gameState.resources.materials >= cost.materials && gameState.resources.energy >= cost.energy) {
            gameState.labFacilities.advancedLab.built = true;
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
            gameState.labFacilities[facilityKey].durability = 100;
            message = `${facilityKey} 시설의 유지보수를 완료했습니다. 내구도가 100으로 회복되었습니다.`;
            changes.resources = { ...gameState.resources, materials: gameState.resources.materials - cost.materials, energy: gameState.resources.energy - cost.energy };
        } else {
            message = "유지보수에 필요한 자원이 부족합니다.";
        }
        updateState(changes, message);
    },
    upgrade_tech: () => {
        if (!spendActionPoint()) return;
        const cost = 20 * (gameState.techLevel + 1);
        if (gameState.resources.materials >= cost && gameState.resources.energy >= cost) {
            gameState.techLevel++;
            updateState({ resources: { ...gameState.resources, materials: gameState.resources.materials - cost, energy: gameState.resources.energy - cost }, techLevel: gameState.techLevel });
            updateGameDisplay(`기술 연구에 성공했습니다! 모든 자원 생성 성공률이 10% 증가합니다. (현재 레벨: ${gameState.techLevel})`);
        } else { updateGameDisplay(`기술을 연구하기 위한 자원이 부족합니다. (재료 ${cost}, 에너지 ${cost} 필요)`); }
        updateState({ currentScenarioId: 'intro' });
    },
    analyze_data: () => {
        if (!spendActionPoint()) return;
        const rand = currentRandFn();
        if (rand < 0.3) { updateState({ resources: { ...gameState.resources, materials: gameState.resources.materials + 20, energy: gameState.resources.energy + 20 } }); updateGameDisplay("데이터 분석 중 새로운 자원 합성법을 발견했습니다! (+20 재료, +20 에너지)"); }
        else if (rand < 0.5) { updateState({ logic: gameState.logic + 10, efficiency: gameState.efficiency + 10 }); updateGameDisplay("데이터에서 시스템의 비효율성을 개선할 방법을 발견했습니다. (+10 논리, +10 효율)"); }
        else { updateGameDisplay("데이터를 분석했지만, 특별한 것은 발견하지 못했습니다."); }
        updateState({ currentScenarioId: 'intro' });
    },
    accept_exchange: () => {
        if (!spendActionPoint()) return;
        if (gameState.resources.materials >= 50) {
            updateState({ resources: { ...gameState.resources, materials: gameState.resources.materials - 50, quantum_bits: (gameState.resources.quantum_bits || 0) + 5 } });
            updateGameDisplay("기술 교류에 성공하여 양자 비트를 얻었습니다! 이 자원은 고급 연구에 사용할 수 있습니다.");
        } else { updateGameDisplay("기술 교류에 필요한 재료가 부족합니다."); }
        updateState({ currentScenarioId: 'intro' });
    },
    decline_exchange: () => {
        if (!spendActionPoint()) return;
        updateGameDisplay("기술 교류 제안을 거절했습니다. 그들은 아쉬워하며 떠났습니다.");
        updateState({ currentScenarioId: 'intro' });
    },
    return_to_intro: () => updateState({ currentScenarioId: 'intro' }),
    play_minigame: () => {
        if (gameState.dailyActions.minigamePlayed) { updateGameDisplay("오늘의 미니게임은 이미 플레이했습니다."); return; }
        if (!spendActionPoint()) return;
        
        const minigameIndex = (gameState.day - 1) % minigames.length;
        const minigame = minigames[minigameIndex];
        
        gameState.currentScenarioId = `minigame_${minigame.name}`; 
        
        updateState({ dailyActions: { ...gameState.dailyActions, minigamePlayed: true } }); 
        
        updateGameDisplay(minigame.description);
        minigame.start(document.getElementById('gameArea'), document.getElementById('gameChoices'));
    }
};

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
        message += "높은 지식 수준 덕분에 연구에 활기가 넘쳐 행동력이 증가합니다. ";
    }
    if (gameState.knowledge < 30) {
        gameState.maxActionPoints = Math.max(5, gameState.maxActionPoints - 1);
        gameState.actionPoints = Math.min(gameState.actionPoints, gameState.maxActionPoints);
        message += "지식 수준이 정체되어 연구실에 침체기가 찾아와 행동력이 감소합니다. ";
    }

    if (gameState.efficiency >= 70) {
        Object.keys(gameState.labFacilities).forEach(key => {
            if (gameState.labFacilities[key].built) gameState.labFacilities[key].durability = Math.min(100, gameState.labFacilities[key].durability + 1);
        });
        message += "높은 효율성 덕분에 연구 시설 유지보수가 더 잘 이루어집니다. ";
    }
    if (gameState.efficiency < 30) {
        Object.keys(gameState.labFacilities).forEach(key => {
            if (gameState.labFacilities[key].built) gameState.labFacilities[key].durability = Math.max(0, gameState.labFacilities[key].durability - 2);
        });
        message += "효율성이 약화되어 연구 시설들이 빠르게 노후화됩니다. ";
    }
    return message;
}

function generateRandomResearcher() {
    const names = ["파인만", "테슬라", "다윈", "갈릴레오"];
    const personalities = ["독창적인", "괴짜", "체계적인", "호기심 많은"];
    const skills = ["물리학", "화학", "생물학", "정보학"];
    const randomId = Math.random().toString(36).substring(2, 9);

    return {
        id: randomId,
        name: names[Math.floor(currentRandFn() * names.length)],
        personality: personalities[Math.floor(currentRandFn() * personalities.length)],
        skill: skills[Math.floor(currentRandFn() * skills.length)],
        collaboration: 50
    };
}

// --- Daily/Initialization Logic ---
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
        else if (r.skill === '화학') { gameState.resources.materials++; skillBonusMessage += `${r.name}의 연구 덕분에 재료를 추가로 얻었습니다. `; }
        else if (r.skill === '정보학') { gameState.resources.compute++; skillBonusMessage += `${r.name}의 연구 덕분에 연산력을 추가로 얻었습니다. `; }
    });

    Object.keys(gameState.labFacilities).forEach(key => {
        const facility = gameState.labFacilities[key];
        if(facility.built) {
            facility.durability -= 1;
            if(facility.durability <= 0) {
                facility.built = false;
                durabilityMessage += `${key} 시설이 파손되었습니다! 수리가 필요합니다. `;
            }
        }
    });

    gameState.resources.compute -= gameState.researchers.length * 2;
    let dailyMessage = "새로운 연구일이 시작되었습니다. ";
    dailyMessage += statEffectMessage + skillBonusMessage + durabilityMessage;
    if (gameState.resources.compute < 0) {
        gameState.knowledge -= 10;
        dailyMessage += "연산력이 부족하여 연구가 지연됩니다! (-10 지식)";
    }
    
    const rand = currentRandFn();
    let eventId = "intro";
    if (rand < 0.15) { eventId = "daily_event_overload"; updateState({resources: {...gameState.resources, materials: Math.max(0, gameState.resources.materials - 10)}}); }
    else if (rand < 0.30) { eventId = "daily_event_corruption"; updateState({resources: {...gameState.resources, compute: Math.max(0, gameState.resources.compute - 10)}}); }
    else if (rand < 0.5 && gameState.researchers.length >= 2) { eventId = "daily_event_paradox"; }
    else if (rand < 0.7 && gameState.labFacilities.mainControlRoom.built && gameState.researchers.length < gameState.maxResearchers) {
        eventId = "daily_event_new_researcher";
        const newResearcher = generateRandomResearcher();
        gameState.pendingNewResearcher = newResearcher;
        gameScenarios["daily_event_new_researcher"].text = `새로운 연구원 ${newResearcher.name}(${newResearcher.personality}, ${newResearcher.skill})이(가) 합류하고 싶어 합니다. (현재 연구원 수: ${gameState.researchers.length} / ${gameState.maxResearchers})`;
    }
    else if (rand < 0.85 && gameState.labFacilities.mainControlRoom.built) { eventId = "daily_event_tech_exchange"; }
    
    gameState.currentScenarioId = eventId;
    updateGameDisplay(dailyMessage + (gameScenarios[eventId]?.text || ''));
    renderChoices(gameScenarios[eventId].choices);
    saveGameState();
}

function initDailyGame() {
    loadGameState();
}

function resetGame() {
    if (confirm("정말로 연구를 초기화하시겠습니까? 모든 진행 상황이 사라집니다.")) {
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