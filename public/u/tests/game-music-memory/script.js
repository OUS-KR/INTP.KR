
document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    const startGameBtn = document.getElementById('start-game-btn');
    const messageElement = document.getElementById('message');
    const songSelect = document.getElementById('song-select');
    const shuffleAllCheckbox = document.getElementById('shuffle-all');
    const gameControls = document.getElementById('game-controls');

    let allMusicData = [];
    let songPath = '';

    let cards = [];
    let flippedCards = [];
    let matchedPairs = 0;
    let lockBoard = false;

    const audioPlayer = new Audio();

    async function loadMusicData() {
        try {
            const response = await fetch('../music_data.json');
            allMusicData = await response.json();
            populateSongSelect();
        } catch (error) {
            console.error('Error loading music data:', error);
            messageElement.textContent = '음악 데이터를 불러오는 데 실패했습니다.';
        }
    }

    function populateSongSelect() {
        songSelect.innerHTML = '';
        allMusicData.forEach(song => {
            const option = document.createElement('option');
            option.value = song.id;
            option.textContent = song.title;
            songSelect.appendChild(option);
        });
        // Select the first song by default
        if (allMusicData.length > 0) {
            songPath = `../../..${allMusicData[0].path}`;
        }
    }

    function createBoard(selectedSongId, shuffleAll) {
        gameBoard.innerHTML = '';
        matchedPairs = 0;
        cards = [];
        lockBoard = false;

        let gameSections = [];

        if (shuffleAll) {
            // Mix sections from all songs
            const allSections = allMusicData.flatMap(song => {
                let sections = song.sections;
                if (!sections || sections.length < 6) {
                    sections = generateRandomSections(song.duration, 6);
                }
                return sections.slice(0, 6).map(s => ({ ...s, songId: song.id, songPath: `../../..${song.path}` }));
            });
            shuffle(allSections);
            gameSections = allSections.slice(0, 6).flatMap(section => [section, section]);
        } else {
            // Use sections from a single selected song
            const selectedSong = allMusicData.find(song => song.id === selectedSongId);
            if (!selectedSong) {
                messageElement.textContent = '선택된 음악을 찾을 수 없습니다.';
                return;
            }
            songPath = `../../..${selectedSong.path}`;
            let sections = selectedSong.sections;
            if (!sections || sections.length < 6) {
                sections = generateRandomSections(selectedSong.duration, 6);
            }
            gameSections = sections.slice(0, 6).flatMap(section => [section, section]);
        }

        shuffle(gameSections);

        gameSections.forEach((section, index) => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.dataset.id = index;
            card.dataset.startTime = section.start;
            card.dataset.endTime = section.end;
            card.dataset.songPath = section.songPath || songPath; // Use specific songPath if shuffled

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

        card.classList.add('flip');
        flippedCards.push(card);

        lockBoard = true; // Lock the board immediately when a card is flipped

        playSnippet(card.dataset.songPath, card.dataset.startTime, card.dataset.endTime, () => {
            // Callback after snippet finishes
            if (flippedCards.length === 2) { // If two cards are flipped, proceed to check for match
                checkForMatch();
            }
            // If it's the first card, music finished, but keep board locked until second card is chosen
            // and its music finishes. lockBoard remains true.
        });
    }

    function playSnippet(path, startTime, endTime, callback) {
        audioPlayer.src = path;
        audioPlayer.currentTime = startTime;
        audioPlayer.play();

        const checkTime = setInterval(() => {
            if (audioPlayer.currentTime >= endTime || audioPlayer.paused) {
                audioPlayer.pause();
                clearInterval(checkTime);
                if (callback) callback(); // Execute callback after audio finishes
            }
        }, 100);
    }

    function checkForMatch() {
        const [card1, card2] = flippedCards;

        if (card1.dataset.startTime === card2.dataset.startTime && card1.dataset.songPath === card2.dataset.songPath) {
            // Match
            card1.classList.add('matched');
            card2.classList.add('matched');
            matchedPairs++;
            resetFlippedCards(); // This will unlock the board
            if (matchedPairs === 6) {
                endGame();
            }
        } else {
            // No match - unflip after a delay, then unlock board
            setTimeout(() => {
                card1.classList.remove('flip');
                card2.classList.remove('flip');
                resetFlippedCards(); // This will unlock the board
            }, 1500);
        }
    }

    function resetFlippedCards() {
        flippedCards = [];
        lockBoard = false; // Always unlock here
    }

    function startGame() {
        startGameBtn.disabled = true;
        messageElement.textContent = '';
        gameControls.style.display = 'none'; // Hide controls during game

        const selectedSongId = songSelect.value;
        const shuffleAll = shuffleAllCheckbox.checked;
        
        createBoard(selectedSongId, shuffleAll);
    }

    function endGame() {
        lockBoard = true;
        messageElement.textContent = '축하합니다! 모든 쌍을 맞췄습니다!';
        startGameBtn.disabled = false;
        gameControls.style.display = 'flex'; // Show controls after game
    }

    startGameBtn.addEventListener('click', startGame);
    loadMusicData(); // Load music data on page load
});
