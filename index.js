const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;

app.use(express.static(__dirname + '/src'));

io.on("connection", (socket) => {
  socket.on('drawing', (data) => {
    io.emit('drawing', data);
  });
})

http.listen(port, () => console.log('listening on port ' + port));