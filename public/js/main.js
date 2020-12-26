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

let selfChosen = false;
let selfChoice;

let username;
let users;

let gameHistory = [];

// set username
const userInput = document.getElementById('user-input');
const loginOverlay = document.getElementById('login');

const toastQueue = [];
const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
});

userInput.addEventListener('keyup', e => {
    if (e.key === 'Enter') {
        username = e.target.value;
        socket.emit('auth-user', username);
        loginOverlay.style.opacity = '0';
        setTimeout(() => {
            loginOverlay.style.display = 'none';
        }, 200);
    }
});

options.forEach(item => {
    item.addEventListener('click', e => handleItemClick(e));
});

function handleItemClick(e) {
    if (selfChosen) return;

    const itemName = e.target.id.split('__')[1];
    selfChosen = true;
    selfChoice = itemName;

    const itemDetails = iconData.find(i => i.name === itemName);

    getSelfUserId() === 0
        ? (document.getElementById('player-choice-1').innerHTML = itemDetails.path)
        : (document.getElementById('player-choice-2').innerHTML = itemDetails.path);

    selectionBarOverlay.classList.add('active');

    emitSelfChoice();
}

function emitSelfChoice() {
    socket.emit('choice', selfChoice);
}

function displayResult(resultObject) {
    console.log(gameHistory, 'GH');
    const result = resultObject.result;
    if (result === 'win') confetti.start();
    resultBox.innerHTML = `<h1><span class='${result}'>${result}</span></h1><p onclick='resetGame()'>Play again!</p>`;

    const selfUserId = getSelfUserId();
    console.log(selfUserId);

    if (selfUserId == 0) {
        const itemDetails = iconData.find(i => i.name === resultObject.choices[1]);
        document.getElementById('player-choice-2').innerHTML = itemDetails.path;
    } else {
        const itemDetails = iconData.find(i => i.name === resultObject.choices[0]);
        document.getElementById('player-choice-1').innerHTML = itemDetails.path;
    }
}

function updateGameHistory() {
    const gameHistoryContentWrapper = document.querySelector('.game-history__content');
    console.log(users, 'USERS');
    const game = gameHistory[gameHistory.length - 1];
    console.log(game, 'GAME');
    console.log(getSelfUserId());
    gameHistoryContentWrapper.innerHTML += `
            <div class="match ${game.result}">
                <span class="fpc ${getSelfUserId() === 0 && 'highlighted'}">
                    ${getChoiceDetails(game.choices[0]).path}
                    <span class="name">${users[0]}</span>
                </span>
                <span class="result">vs</span>
                <span class="spc ${getSelfUserId() === 1 && 'highlighted'}">
                    ${getChoiceDetails(game.choices[1]).path}
                    <span class="name">${users[1]}</span>
                </span>
            </div>
            `;
}

function getChoiceDetails(choice) {
    return iconData.find(i => i.name === choice);
}

function resetGame() {
    selfChosen = false;
    selfChoice = undefined;

    confetti.stop();
    selectionBarOverlay.classList.remove('active');

    const minusIcon = iconData.find(i => i.name === 'minus');

    gamePlate.innerHTML = `
        <div id="player-choice-1">
            ${minusIcon.path}
        </div>
        <div id="player-choice-2">
             ${minusIcon.path}
        </div>`;
    resultBox.innerHTML = '';
}

/* Handle game history */
const historyToggle = document.querySelector('#game-history .btn-open');
const gameHistoryContainer = document.getElementById('game-history');

historyToggle.addEventListener('click', e => {
    console.log('Clicked toggle');
    gameHistoryContainer.classList.toggle('active');
});

window.addEventListener('click', e => {
    console.log(e.target);
    if (e.target.id == 'game-plate') gameHistoryContainer.classList.remove('active');
});

socket.on('user-joined', user => {
    setUsers(user);
    if (user.name !== username) {
        queueToast({
            icon: 'info',
            title: `${user.name} joined the game`,
        });
    }
});

socket.on('login', user => {
    setUsers(user);
    queueToast({
        icon: 'success',
        title: `Successfully joined game, welcome ${user.name}`,
    });
});

socket.on('game-full', () => {
    Swal.fire({
        icon: 'error',
        title: "You're too late",
        text: 'Sorry, but this game is already full! You cannot join anymore...',
    }).then(() => (window.location.href = 'https://rps.inceptioncloud.net'));
});

socket.on('game-abort', packet => {
    setUsers(packet);
    queueToast({
        icon: 'warning',
        title: packet.userLeft + ' left the game',
    });
});

socket.on('error', data => {
    Swal.fire({
        icon: 'error',
        title: 'Whooops!',
        text: data,
    }).then(() => window.location.reload());
});

socket.on('disconnect', () => {
    window.location.reload();
});

socket.on('result', resultObject => {
    console.log(resultObject);
    gameHistory.push(resultObject);
    displayResult(resultObject);
    updateGameHistory();
});

function setUsers(usersData) {
    users = usersData.users;
    const userId = getSelfUserId();
    console.log(userId, 'USER ID');

    document.getElementsByClassName(`ind__player-2`)[0].style.color =
        'rgb(236, 236, 236)';
    document.getElementsByClassName(`ind__player-1`)[0].style.color =
        'rgb(236, 236, 236)';
    users.forEach((name, i) => {
        document.getElementsByClassName(`ind__player-${i + 1}`)[0].innerText = name;
        i == userId &&
            (document.getElementsByClassName(`ind__player-${i + 1}`)[0].style.color =
                'orange');
    });

    const loadingScreen = document.getElementById('loading');
    if (users.length === 2) {
        loadingScreen.style.display = 'none';
    } else {
        resetGame();
        loadingScreen.style.display = 'flex';
        loadingScreen.innerHTML = '<h1>Waiting for second player...</h1>';
    }
}

function getSelfUserId() {
    for (let i = 0; i < users.length; i++) {
        if (users[i] === username) return i;
    }
    throw "Self user isn't part of the game?!";
}

function queueToast(object) {
    object.willClose = () => {
        toastQueue.splice(0, 1);
        if (toastQueue.length > 0) {
            setTimeout(() => {
                fireNextToast();
            }, 100);
        }
    };

    toastQueue.push(object);

    if (toastQueue.length === 1) {
        fireNextToast();
    }
}

function fireNextToast() {
    const next = toastQueue[toastQueue.length - 1];
    Toast.fire(next);
}
