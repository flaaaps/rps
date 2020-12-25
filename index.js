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
	console.log('Request');
	const gameId = req.query.id;
	if (!gameId) return res.send({ success: false, error: 'Please include a game id' });
	res.render('game.html');
});

// Chatroom
const games = [];

io.on('connection', async socket => {
	console.log('Connection established');
	let addedUser = false;
	const connectionUrl = socket.handshake.headers.referer;
	const parsedUrl = url.parse(connectionUrl);
	if (parsedUrl.query) {
		const params = getUrlParams(parsedUrl.query);
		const gameId = params.id;
		console.log(games);

		if (!gameExists(gameId)) {
			// Create/join room
			await socket.join(gameId);
			games.push({ gameId, userCount: 0, users: [] });
		}

		socket.on('add user', username => {
			console.log('ADDING USER');
			if (addedUser) return;
			const game = games.filter(game => game.gameId == gameId)[0];
			if (game.users >= 2)
				return socket.emit('game full', 'This game does already have two players');
			game.userCount = game.userCount + 1;
			addedUser = true;
			game.users.push(username);

			socket.emit('login', { name: username, count: game.userCount, users: game.users });
			socket
				.to(gameId)
				.emit('user joined', { name: username, count: game.userCount, users: game.users });
			console.log('GAMES', games);
		});
	} else {
		io.emit('room-error', 'Missing room id');
	}

	socket.on('ping', cb => {
		if (typeof cb === 'function') cb();
	});

	// socket.on('disconnecting', () => {
	// 	console.log(socket.rooms, 'ROOMS');
	// });
});

function gameExists(gameId) {
	const existingGame = games.find(game => game.gameId == gameId);
	return existingGame ? true : false;
}

function getUrlParams(query) {
	if (!query) return;
	const paramSplit = query.split('&');
	const obj = {};
	paramSplit.map(param => {
		const splittedParam = param.split('=');
		if (splittedParam[0] != '' && splittedParam[1] != '') {
			obj[splittedParam[0]] = splittedParam[1];
		}
	});
	return obj;
}
