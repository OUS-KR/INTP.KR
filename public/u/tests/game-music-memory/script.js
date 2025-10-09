document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    const startGameBtn = document.getElementById('start-game-btn');
    const messageElement = document.getElementById('message');

    let songPath = '';

    let cards = [];
    let flippedCards = [];
    let matchedPairs = 0;
    let lockBoard = false;

    const audioPlayer = new Audio();

    async function loadMusicData() {
        try {
            const response = await fetch('../music_data.json');
            const data = await response.json();
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
        lockBoard = false;

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
        const snippetLength = 5; 
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

        lockBoard = true; // Lock the board immediately
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
            if (audioPlayer.currentTime >= endTime || audioPlayer.paused) {
                audioPlayer.pause();
                clearInterval(checkTime);
                // If it was the first card, unlock board. If it was the second, checkForMatch handles the lock.
                if (flippedCards.length < 2) {
                    lockBoard = false;
                }
            }
        }, 100);
    }

    function checkForMatch() {
        // lockBoard is already true from the second card's flipCard call
        const [card1, card2] = flippedCards;

        if (card1.dataset.startTime === card2.dataset.startTime) {
            // Match
            card1.classList.add('matched');
            card2.classList.add('matched');
            matchedPairs++;
            resetFlippedCards();
            if (matchedPairs === 6) {
                endGame();
            }
        } else {
            // No match - unflip after a delay
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
        
        loadMusicData().then(song => {
            if (song) {
                createBoard(song);
            }
        });
    }

    function endGame() {
        lockBoard = true;
        messageElement.textContent = '축하합니다! 모든 쌍을 맞췄습니다!';
        startGameBtn.disabled = false;
    }

    startGameBtn.addEventListener('click', startGame);
});