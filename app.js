var com = require("serialport");
var express = require('express');
var app = express();

var server = app.listen(3000);
var io = require('socket.io')(server);

var serialPort = new com.SerialPort("/dev/cu.usbmodem1411", {
  baudrate: 9600,
  parser: com.parsers.readline('\r\n')
});

app.use(express.static('public'))

serialPort.on('open', function() {
  console.log('Port open');
});

serialPort.on('data', function(data) {
  io.sockets.emit('data', data);
  console.log(data);
});
