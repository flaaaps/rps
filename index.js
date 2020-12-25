// Setup basic express server
const express = require('express');
const app = express();
const path = require('path');
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 3000;

const url = require('url');

server.listen(port, () => {
    console.log('Server listening at port %d', port);
});
app.engine('html', require('ejs').renderFile);

// Routing
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', __dirname + '/public');
app.set('view engine', 'html');

app.get('/', (req, res) => {
    res.send('default');
});

app.get('/game', (req, res) => {
    const gameId = req.query.id;
    if (!gameId) return res.send({ success: false, error: 'Please include a game id' });
    res.render('game.html');
});

// Chatroom
const games = [];

io.on('connection', async socket => {
    let userAlreadyAuthenticated = false;
    const connectionUrl = socket.handshake.headers.referer;
    const parsedUrl = url.parse(connectionUrl);

    console.log('== New connection established ==');
    console.log('> Connection URL: ' + connectionUrl);

    if (parsedUrl.query) {
        const params = getUrlParams(parsedUrl.query);
        const gameId = params.id;

        if (gameExists(gameId)) {
            console.log('> Joining game with id ' + gameId);
            const game = getGameById(gameId);
            console.log('> Object:', game);
            if (game.userCount >= 2) {
                console.log('> Game is already full');
                socket.emit('game-full');
                return;
            }
        } else {
            // Create/join room
            console.log('> Creating new game with id ' + gameId);
            await socket.join(gameId);
            games.push({ gameId, userCount: 0, users: [] });
        }

        socket.on('auth-user', username => {
            if (userAlreadyAuthenticated) return;
            console.log('> Authenticating user ' + username + ' in game ' + gameId);

            const game = getGameById(gameId);

            if (game.users.some(user => user.username.toLowerCase() === username)) {
                console.log('> User with name ' + username + ' already exists in this game');
                socket.emit('error', 'This username is already taken, please select another one!');
                return;
            }

            if (game.userCount >= 2) {
                console.log('> Cannot auth user, game is full');
                socket.emit('game-full');
                return;
            }

            const userObject = { username, socket: socket };
            userAlreadyAuthenticated = true;
            game.userCount = game.userCount + 1;
            game.users.push(userObject);

            socket.emit('login', { name: username, users: game.users.map(it => it.username) });
            game.users.forEach(user =>
                user.socket.emit('user-joined', { name: username, users: game.users.map(it => it.username) }),
            );

            socket.on('choice', choice => {
                if (!verifyChoice(choice)) {
                    socket.emit('error', 'Invalid choice');
                    return;
                }

                console.log('> ' + username + ' chose ' + choice);
                userObject.choice = choice;

                checkForGameEnd(game);
            });
        });
    } else {
        socket.emit('error', 'Missing room d');
    }

    socket.on('ping', cb => {
        if (typeof cb === 'function') cb();
    });

    // socket.on('disconnecting', () => {
    // 	console.log(socket.rooms, 'ROOMS');
    // });
});

function checkForGameEnd(game) {
    const allUsersChosen = game.users.every(user => verifyChoice(user.choice));

    if (allUsersChosen) {
        console.log('> All users have chosen, game is ending...');

        const result = getResult(game)
        const choices = game.users.map(user => user.choice)
        game.users.forEach((user, index) => {
            if (result === 0) {
                user.socket.emit("result", { result: "draw", choices })
            } else if (index === result - 1) {
                user.socket.emit("result", { result: "win", choices })
            } else {
                user.socket.emit("result", { result: "loss", choices })
            }
            delete user.choice
        })
    }
}

/**
 * Returns which player won the game or 0 if it ended in a draw.
 * @param game The game that is checked
 * @returns {number} 1 if the first player won, 2 if the second player won or 0 if
 * the game ended in a draw
 */
function getResult(game) {
    const users = game.users;
    const choiceUser1 = users[0].choice;
    const choiceUser2 = users[1].choice;

    return choiceUser1 === choiceUser2 ? 0
        : winsOver(choiceUser1, choiceUser2) ? 1
            : 2
}

/**
 * Checks whether the choice of A wins over the choice of B.
 * @param {String} a The choice of A, either "rock", "paper" or "scissors"
 * @param {String} b The choice of B, either "rock", "paper" or "scissors"
 * @returns {Boolean} True if A wins, false otherwise (including a draw)
 */
function winsOver(a, b) {
    return (
        (a === 'paper' && b === 'rock') ||
        (a === 'rock' && b === 'scissors') ||
        (a === 'scissors' && b === 'paper')
    );
}

function verifyChoice(input) {
    return input === 'rock' || input === 'paper' || input === 'scissors';
}

function gameExists(gameId) {
    return !!getGameById(gameId);
}

function getGameById(gameId) {
    return games.find(game => game.gameId === gameId);
}

function getUrlParams(query) {
    if (!query) return;
    const paramSplit = query.split('&');
    const obj = {};
    paramSplit.map(param => {
        const splittedParam = param.split('=');
        if (splittedParam[0] !== '' && splittedParam[1] !== '') {
            obj[splittedParam[0]] = splittedParam[1];
        }
    });
    return obj;
}
