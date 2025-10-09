document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const startBtn = document.getElementById('start-btn');
    const scoreDisplay = document.getElementById('score');
    const comboDisplay = document.getElementById('combo');
    const feedbackDisplay = document.getElementById('feedback');

    const audioPlayer = new Audio();

    // Game settings
    const LANES = 1; // Simplified to a single lane
    const NOTE_HEIGHT = 20;
    const NOTE_SPEED = 3; // pixels per frame
    const HIT_LINE_Y = 450;

    let score = 0;
    let combo = 0;
    let notes = [];
    let beatmap = null;
    let songPath = '';
    let gameStartTime = 0;
    let isPlaying = false;

    canvas.width = 400;
    canvas.height = 500;

    const laneWidth = canvas.width / LANES;

    // Timing windows (in seconds)
    const PERFECT_WINDOW = 0.05;
    const GOOD_WINDOW = 0.1;
    const OK_WINDOW = 0.15;

    async function loadGameData() {
        try {
            const musicResponse = await fetch('../music_data.json');
            const musicData = await musicResponse.json();
            const song = musicData[0]; // Use first song for now
            songPath = `../../..${song.path}`;

            const beatmapResponse = await fetch('./beatmaps/thought-bubble.beatmap.json');
            beatmap = await beatmapResponse.json();

        } catch (error) {
            console.error('Error loading game data:', error);
        }
    }

    function prepareNotes() {
        notes = beatmap.notes.map(note => ({
            time: note.time,
            lane: 0, // All notes in one lane
            y: -NOTE_HEIGHT,
            isHit: false
        }));
    }

    function gameLoop(timestamp) {
        if (!isPlaying) return;

        update();
        draw();

        requestAnimationFrame(gameLoop);
    }

    function update() {
        const elapsedTime = (Date.now() - gameStartTime) / 1000;

        notes.forEach(note => {
            if (!note.isHit) {
                const timeDiff = note.time - elapsedTime;
                note.y = HIT_LINE_Y - (timeDiff * NOTE_SPEED * 60); 

                if (note.y > canvas.height) {
                    note.isHit = true; 
                    resetCombo();
                    showFeedback('Miss');
                }
            }
        });
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw hit line
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, HIT_LINE_Y);
        ctx.lineTo(canvas.width, HIT_LINE_Y);
        ctx.stroke();
        ctx.lineWidth = 1;

        // Draw notes
        notes.forEach(note => {
            if (!note.isHit && note.y > -NOTE_HEIGHT && note.y < canvas.height) {
                ctx.fillStyle = '#3498db';
                ctx.fillRect(note.lane * laneWidth, note.y, laneWidth, NOTE_HEIGHT);
            }
        });
    }

    function handleInput(event) {
        if (!isPlaying) return;

        const elapsedTime = (Date.now() - gameStartTime) / 1000;
        let hit = false;

        // Find the closest un-hit note
        let closestNote = null;
        let minTimeDiff = Infinity;

        for (const note of notes) {
            if (!note.isHit) {
                const timeDiff = Math.abs(note.time - elapsedTime);
                if (timeDiff < minTimeDiff) {
                    minTimeDiff = timeDiff;
                    closestNote = note;
                }
            }
        }

        if (closestNote && minTimeDiff <= OK_WINDOW) {
            closestNote.isHit = true;
            hit = true;
            if (minTimeDiff <= PERFECT_WINDOW) {
                score += 100;
                combo++;
                showFeedback('Perfect');
            } else if (minTimeDiff <= GOOD_WINDOW) {
                score += 50;
                combo++;
                showFeedback('Good');
            } else {
                score += 20;
                combo++;
                showFeedback('OK');
            }
        } else {
            // Tapping with no note nearby doesn't reset combo
        }

        scoreDisplay.textContent = `점수: ${score}`;
        comboDisplay.textContent = `콤보: ${combo}`;
    }

    function resetCombo() {
        combo = 0;
        comboDisplay.textContent = `콤보: ${combo}`;
    }

    function showFeedback(text) {
        feedbackDisplay.textContent = text;
        feedbackDisplay.style.opacity = 1;
        setTimeout(() => {
            feedbackDisplay.style.opacity = 0;
        }, 500);
    }

    async function startGame() {
        startBtn.disabled = true;
        startBtn.textContent = '로딩 중...';
        await loadGameData();
        
        if (!beatmap) {
            startBtn.textContent = '데이터 로딩 실패';
            return;
        }

        prepareNotes();
        score = 0;
        combo = 0;
        scoreDisplay.textContent = '점수: 0';
        comboDisplay.textContent = '콤보: 0';
        isPlaying = true;

        audioPlayer.src = songPath;
        audioPlayer.play();
        gameStartTime = Date.now();

        startBtn.style.display = 'none';

        requestAnimationFrame(gameLoop);
    }

    startBtn.addEventListener('click', startGame);
    canvas.addEventListener('click', handleInput);
    canvas.addEventListener('touchstart', handleInput);
});