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

	console.log("== New connection established ==")
	console.log("> Connection URL: " + connectionUrl)

	if (parsedUrl.query) {
		const params = getUrlParams(parsedUrl.query);
		const gameId = params.id;

		if (gameExists(gameId)) {
			console.log("> Joining game with id " + gameId)
			const game = getGameById(gameId)
			console.log("> Object:", game)
			if (game.userCount >= 2) {
				console.log("> Game is already full")
				socket.emit("game-full", "This game is already full!")
				return
			}
		} else {
			// Create/join room
			console.log("> Creating new game with id " + gameId)
			await socket.join(gameId);
			games.push({ gameId, userCount: 0, users: [] });
		}

		socket.on('auth-user', username => {
			if (userAlreadyAuthenticated) return;
			console.log('> Authenticating user ' + username + ' in game ' + gameId);

			const game = getGameById(gameId)
			if (game.userCount >= 2) {
				console.log("> Cannot auth user, game is full")
				socket.emit("game-full", "This game is already full!")
				return
			}

			userAlreadyAuthenticated = true;
			game.userCount = game.userCount + 1;
			game.users.push({ username, socket: socket });

			socket.emit('login', { name: username, users: game.users.map(it => it.username) });
			game.users.forEach(user =>
				user.socket.emit('user-joined', { name: username, users: game.users.map(it => it.username) })
			)
		});
	} else {
		socket.emit('room-error', 'Missing room id');
	}

	socket.on('ping', cb => {
		if (typeof cb === 'function') cb();
	});

	// socket.on('disconnecting', () => {
	// 	console.log(socket.rooms, 'ROOMS');
	// });
});

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
