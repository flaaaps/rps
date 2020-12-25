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

// set username
const userInput = document.getElementById('user-input');
const loginOverlay = document.getElementById('login');

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

    const minusIcon = iconData.find(i => i.name === 'minus');
    const itemDetails = iconData.find(i => i.name === itemName);
    gamePlate.innerHTML = getSelfUserId() === 0 ? itemDetails.path + minusIcon.path
        : minusIcon.path + itemDetails.path;

    selectionBarOverlay.classList.add('active');

    emitSelfChoice();
}

function emitSelfChoice() {
    socket.emit('choice', selfChoice);
}

function displayResult(resultObject) {
    console.log(resultObject);
    const result = resultObject.result
    if (result === 'win') confetti.start();
    resultBox.innerHTML = `<h1><span class='${result}'>${result}</span></h1><p onclick='resetGame()'>Play again!</p>`;

    gamePlate.innerHTML = ""
    resultObject.choices.forEach((choice) => {
        const itemDetails = iconData.find(i => i.name === choice);
        gamePlate.innerHTML += itemDetails.path
    })
}

function resetGame() {
    selfChosen = false;
    selfChoice = undefined;

    confetti.stop();
    selectionBarOverlay.classList.remove('active');

    const minusIcon = iconData.find(i => i.name === 'minus');

    gamePlate.innerHTML = `${minusIcon.path} ${minusIcon.path}`;
    resultBox.innerHTML = '';
}

// socket io stuff

// loginForm.addEventListener('keyup', e => {
//     if (e.keyCode == 13) {
//         socket.emit('add user', usernameInput.value);
//         usernameInput.value = '';
//     }
// });

socket.on('user-joined', user => {
    setUsers(user);
    wrapper.innerHTML += `<h3>${user.name} joined the game</h3>`;
});

socket.on('login', user => {
    setUsers(user);
    wrapper.innerHTML += `<h3>Wazzupp ${user.name}</h3>`;
});

socket.on('room-full', data => {
    wrapper.innerHTML += `The room is already full: ${data}`;
});

socket.on('error', data => {
    // TODO: fire swal or something
    wrapper.innerHTML += `Whoooops: ${data}`;
});

socket.on('disconnect', () => {
    window.location.reload();
});

socket.on('result', resultObject => {
    displayResult(resultObject);
});

function setUsers(usersData) {
    users = usersData.users;
    users.forEach((name, i) => {
        document.getElementsByClassName(`ind__player-${i + 1}`)[0].innerText = name;
    });

    const loadingScreen = document.getElementById('loading');
    if (users.length === 2) {
        loadingScreen.style.display = 'none';
    } else {
        loadingScreen.innerHTML = '<h1>Waiting for second player...</h1>';
    }
}

function getSelfUserId() {
    for (let i = 0; i < users.length; i++) {
        if (users[i] === username)
            return i;
    }
    throw 'Self user isn\'t part of the game?!';
}
