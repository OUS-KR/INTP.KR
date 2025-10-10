
document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    const startGameBtn = document.getElementById('start-game-btn');
    const messageElement = document.getElementById('message');
    const songSelect = document.getElementById('song-select');
    const shuffleAllCheckbox = document.getElementById('shuffle-all');
    const shuffleAllLabel = document.getElementById('shuffle-all-label');
    const gameControls = document.getElementById('game-controls');
    const stopAudioBtn = document.getElementById('stop-audio-btn');

    let allMusicData = [];
    let songPath = '';
    let currentAudioCallback = null;
    let currentAudioInterval = null;
    let lastMatchedSongInfo = null; // Store info of the last matched song

    let cards = [];
    let flippedCards = [];
    let matchedPairs = 0;
    let lockBoard = false;

    const audioPlayer = new Audio();

    async function loadMusicData() {
        try {
            const response = await fetch('/u/tests/assets/music_data.json');
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
        if (allMusicData.length > 0) {
            songPath = `../../..${allMusicData[0].path}`;
        }
    }

    function createBoard(selectedSongId, shuffleAll) {
        gameBoard.innerHTML = '';
        matchedPairs = 0;
        cards = [];
        lockBoard = false;
        lastMatchedSongInfo = null; // Reset for new game

        let gameSections = [];

        if (shuffleAll) {
            const allSections = allMusicData.flatMap(song => {
                let sections = song.sections;
                if (!sections || sections.length < 8) {
                    sections = generateRandomSections(song.duration, 8);
                }
                return sections.slice(0, 8).map(s => ({ ...s, songId: song.id, songPath: `../../..${song.path}` }));
            });
            shuffle(allSections);
            gameSections = allSections.slice(0, 8).flatMap(section => [section, section]);
        } else {
            const selectedSong = allMusicData.find(song => song.id === selectedSongId);
            if (!selectedSong) {
                messageElement.textContent = '선택된 음악을 찾을 수 없습니다.';
                return;
            }
            songPath = `../../..${selectedSong.path}`;
            let sections = selectedSong.sections;
            if (!sections || sections.length < 8) {
                sections = generateRandomSections(selectedSong.duration, 8);
            }
            gameSections = sections.slice(0, 8).flatMap(section => [section, section]);
        }

        shuffle(gameSections);

        gameSections.forEach((section, index) => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.dataset.id = index;
            card.dataset.startTime = section.start;
            card.dataset.endTime = section.end;
            card.dataset.songPath = section.songPath || songPath;

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

        lockBoard = true;

        playSnippet(card.dataset.songPath, card.dataset.startTime, card.dataset.endTime, () => {
            if (flippedCards.length === 1) {
                lockBoard = false;
            } else if (flippedCards.length === 2) {
                checkForMatch();
            }
        });
    }

    function playSnippet(path, startTime, endTime, callback) {
        audioPlayer.src = path;
        audioPlayer.currentTime = startTime;
        audioPlayer.play();
        stopAudioBtn.style.display = 'inline-block';

        currentAudioCallback = callback;

        currentAudioInterval = setInterval(() => {
            if (audioPlayer.currentTime >= endTime || audioPlayer.paused) {
                audioPlayer.pause();
                clearInterval(currentAudioInterval);
                currentAudioInterval = null;
                stopAudioBtn.style.display = 'none';
                if (currentAudioCallback) {
                    currentAudioCallback();
                    currentAudioCallback = null;
                }
            }
        }, 100);
    }

    function checkForMatch() {
        const [card1, card2] = flippedCards;

        if (card1.dataset.startTime === card2.dataset.startTime && card1.dataset.songPath === card2.dataset.songPath) {
            card1.classList.add('matched');
            card2.classList.add('matched');
            
            lastMatchedSongInfo = { path: card1.dataset.songPath }; // Save last matched song path
            
            matchedPairs++;
            resetFlippedCards();
            if (matchedPairs === cards.length / 2) {
                endGame();
            }
        } else {
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
        gameControls.style.display = 'none';

        const selectedSongId = songSelect.value;
        const shuffleAll = shuffleAllCheckbox.checked;
        
        createBoard(selectedSongId, shuffleAll);
    }

    function endGame() {
        lockBoard = true;
        messageElement.textContent = '축하합니다! 모든 쌍을 맞췄습니다!';
        
        if (lastMatchedSongInfo && lastMatchedSongInfo.path) {
            setTimeout(() => { // Add a small delay before playing
                playFullSong(lastMatchedSongInfo.path);
            }, 500);
        }

        setTimeout(() => { // Show controls after a longer delay
            startGameBtn.disabled = false;
            gameControls.style.display = 'flex';
        }, 2000);
    }

    function playFullSong(path) {
        const fullSongMessage = document.createElement('p');
        fullSongMessage.id = 'full-song-message';
        fullSongMessage.style.marginTop = '10px';
        fullSongMessage.textContent = '전체 곡을 재생합니다...';
        messageElement.appendChild(fullSongMessage);

        audioPlayer.src = path;
        audioPlayer.currentTime = 0;
        audioPlayer.play();
        stopAudioBtn.style.display = 'inline-block';

        audioPlayer.onended = stopAudio;
    }

    function stopAudio() {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        stopAudioBtn.style.display = 'none';
        if (currentAudioInterval) {
            clearInterval(currentAudioInterval);
            currentAudioInterval = null;
        }
        if (currentAudioCallback) {
            currentAudioCallback();
            currentAudioCallback = null;
        }
        // Also clear the onended handler to prevent conflicts
        audioPlayer.onended = null;

        const fullSongMessage = document.getElementById('full-song-message');
        if (fullSongMessage) {
            fullSongMessage.remove();
        }
    }

    shuffleAllCheckbox.addEventListener('change', () => {
        songSelect.disabled = shuffleAllCheckbox.checked;
        if (shuffleAllCheckbox.checked) {
            songSelect.value = '';
            shuffleAllLabel.classList.add('shuffle-active');
        } else {
            if (allMusicData.length > 0) {
                songSelect.value = allMusicData[0].id;
            }
            shuffleAllLabel.classList.remove('shuffle-active');
        }
    });

    startGameBtn.addEventListener('click', startGame);
    stopAudioBtn.addEventListener('click', stopAudio);
    loadMusicData();

    document.addEventListener('click', (event) => {
        if (!audioPlayer.paused && !event.target.closest('.card') && !event.target.closest('.controls')) {
            stopAudio();
        }
    });
});
