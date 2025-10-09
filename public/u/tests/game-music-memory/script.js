
document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    const startGameBtn = document.getElementById('start-game-btn');
    const messageElement = document.getElementById('message');
    const timerElement = document.getElementById('timer');

    let audioContext;
    let audioBuffer;
    let songPath = '';

    let cards = [];
    let flippedCards = [];
    let matchedPairs = 0;
    let lockBoard = false;
    let gameTimer;
    let timeLeft = 60;

    // Audio player
    const audioPlayer = new Audio();

    async function loadMusicData() {
        try {
            const response = await fetch('../music_data.json');
            const data = await response.json();
            // For now, just use the first song
            const song = data[0];
            songPath = `../../..${song.path}`;
            return song;
        } catch (error) {
            console.error('Error loading music data:', error);
            messageElement.textContent = '음악 데이터를 불러오는 데 실패했습니다.';
        }
    }

    function createBoard(song) {
        gameBoard.innerHTML = '';
        matchedPairs = 0;
        cards = [];

        let sections = song.sections;
        if (!sections || sections.length < 6) {
            sections = generateRandomSections(song.duration, 6);
        }

        const gameSections = sections.slice(0, 6).flatMap(section => [section, section]);
        shuffle(gameSections);

        gameSections.forEach((section, index) => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.dataset.id = index;
            card.dataset.startTime = section.start;
            card.dataset.endTime = section.end;

            card.innerHTML = `
                <div class="card-face card-front">?</div>
                <div class="card-face card-back">🎵</div>
            `;

            card.addEventListener('click', () => flipCard(card));
            gameBoard.appendChild(card);
            cards.push(card);
        });
    }
    
    function generateRandomSections(duration, count) {
        const sections = [];
        const snippetLength = 5; // 5 seconds for each snippet
        for (let i = 0; i < count; i++) {
            const start = Math.random() * (duration - snippetLength);
            sections.push({ start: start, end: start + snippetLength });
        }
        return sections;
    }

    function shuffle(array) {
        array.sort(() => Math.random() - 0.5);
    }

    function flipCard(card) {
        if (lockBoard || card.classList.contains('flip') || card.classList.contains('matched')) return;

        card.classList.add('flip');
        playSnippet(card.dataset.startTime, card.dataset.endTime);

        flippedCards.push(card);

        if (flippedCards.length === 2) {
            checkForMatch();
        }
    }

    function playSnippet(startTime, endTime) {
        audioPlayer.src = songPath;
        audioPlayer.currentTime = startTime;
        audioPlayer.play();

        const checkTime = setInterval(() => {
            if (audioPlayer.currentTime >= endTime) {
                audioPlayer.pause();
                clearInterval(checkTime);
            }
        }, 100);
    }

    function checkForMatch() {
        lockBoard = true;
        const [card1, card2] = flippedCards;

        if (card1.dataset.startTime === card2.dataset.startTime) {
            // Match
            card1.classList.add('matched');
            card2.classList.add('matched');
            matchedPairs++;
            resetFlippedCards();
            if (matchedPairs === 6) {
                endGame(true);
            }
        } else {
            // No match
            setTimeout(() => {
                card1.classList.remove('flip');
                card2.classList.remove('flip');
                resetFlippedCards();
            }, 1500);
        }
    }

    function resetFlippedCards() {
        flippedCards = [];
        lockBoard = false;
    }

    function startGame() {
        startGameBtn.disabled = true;
        messageElement.textContent = '';
        timeLeft = 60;
        timerElement.textContent = timeLeft;
        
        loadMusicData().then(song => {
            if (song) {
                createBoard(song);
                startTimer();
            }
        });
    }

    function startTimer() {
        gameTimer = setInterval(() => {
            timeLeft--;
            timerElement.textContent = timeLeft;
            if (timeLeft <= 0) {
                endGame(false);
            }
        }, 1000);
    }

    function endGame(isWin) {
        clearInterval(gameTimer);
        lockBoard = true;
        if (isWin) {
            messageElement.textContent = '축하합니다! 모든 쌍을 맞췄습니다!';
        } else {
            messageElement.textContent = '시간 초과! 다시 시도해보세요.';
        }
        startGameBtn.disabled = false;
    }

    startGameBtn.addEventListener('click', startGame);
});
