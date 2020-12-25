const socket = io();

let iconData;
confetti.maxCount = 75;
confetti.gradient = true;

(async () => {
    iconData = await (await fetch('./choices.json')).json();
})();
const options = document.querySelectorAll('.item');
const gamePlate = document.getElementById('game-plate');
const selectionBarOverlay = document.getElementById('selector').firstElementChild;

const resultBox = document.getElementById('result-box');

let playing = false;

let playerChoice;
let randomChoice;
let username;

// set username
const userInput = document.getElementById('user-input');
const loginOverlay = document.getElementById('login');

userInput.addEventListener('keyup', e => {
    if (e.key === 'Enter') {
        username = e.target.value;
        // document.getElementsByClassName('ind__player')[0].innerText = username;
        socket.emit('add user', username);
        loginOverlay.style.opacity = '0';
        setTimeout(() => {
            loginOverlay.style.display = 'none';
        }, 200);
        // Submit username
    }
});

options.forEach(item => {
    item.addEventListener('click', e => handleItemClick(e));
});

/**
 * TODO: Add 'start' button
 */
function handleItemClick(e) {
    if (playing) return;
    console.log('Starting game...');
    playing = true;
    selectionBarOverlay.classList.add('active');
    const itemName = e.target.id.split('__')[1];
    playerChoice = itemName;

    const itemDetails = iconData.find(i => i.name == itemName);

    gamePlate.innerHTML = itemDetails.path;

    generateRandomChoice();
}

function generateRandomChoice() {
    console.log('Generating random choice...');
    let choiceIndex = Math.floor(Math.random() * (iconData.length - 1));

    gamePlate.innerHTML += iconData[choiceIndex].path;
    randomChoice = iconData[choiceIndex].name;

    console.log('Random choice: ', randomChoice);

    checkResult();
}

function checkResult() {
    console.log('Checking results...');
    const result =
        randomChoice == playerChoice
            ? 'draw'
            : winsOver(randomChoice, playerChoice)
            ? 'loss'
            : 'win';

    setTimeout(() => {
        if (result == 'win') confetti.start();
        resultBox.innerHTML = `<h1><span class="${result}">${result}</span></h1><p onclick="resetGame()">Play again!</p>`;
    }, 500);
}

function resetGame() {
    playing = false;
    confetti.stop();
    selectionBarOverlay.classList.remove('active');

    const minusIcon = iconData.find(i => i.name == 'minus');

    gamePlate.innerHTML = `${minusIcon.path} ${minusIcon.path}`;
    resultBox.innerHTML = '';
}

/**
 * Checks whether the choice of A wins over the choice of B.
 * @param {String} a The choice of A, either "rock", "paper" or "scissors"
 * @param {String} b The choice of B, either "rock", "paper" or "scissors"
 * @returns {Boolean} True if A wins, false otherwise (including a draw)
 */
function winsOver(a, b) {
    return (
        (a == 'paper' && b == 'rock') ||
        (a == 'rock' && b == 'scissors') ||
        (a == 'scissors' && b == 'paper')
    );
}

// socket io stuff

// loginForm.addEventListener('keyup', e => {
//     if (e.keyCode == 13) {
//         socket.emit('add user', usernameInput.value);
//         usernameInput.value = '';
//     }
// });

socket.on('user joined', user => {
    console.log('A USER JOINED', user);
    setUsers(user);
    wrapper.innerHTML += `<h3>${user.name} joined the game</h3>`;
});

socket.on('login', user => {
    setUsers(user);
    wrapper.innerHTML += `<h3>Wazzupp ${user.name}, ${user.count}</h3>`;
});

socket.on('game full', data => {
    wrapper.innerHTML += `Whooops: ${data}`;
});

socket.on('room-error', data => {
    wrapper.innerHTML += `<p>Error: ${data}</p>`;
});

function setUsers(userData) {
    const usernames = userData.users;
    usernames.map((name, i) => {
        console.log(name, i);
        document.getElementsByClassName(`ind__player-${i + 1}`)[0].innerText = name;
    });
    const loadingScreen = document.getElementById('loading');
    if (usernames.length == 2) {
        loadingScreen.style.display = 'none';
    } else {
        loadingScreen.innerHTML = '<h1>Waiting for second player...</h1>';
    }
}
