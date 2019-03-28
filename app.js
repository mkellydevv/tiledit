const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const port = process.env.PORT || 2000;

http.listen(port, () => {
    console.log(`Express Server started: Listening on port ${port}.`);
});

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

io.sockets.on('connection', (socket) => {
	console.log('Socket with uid:', socket.id, 'connected to server.');
});