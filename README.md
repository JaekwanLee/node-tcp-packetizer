TCP Packetizer
=========
This module is a helper to accumulate incoming bytes message from tcp sockets and return a packet by packet.

Install
---
```
npm install -s tcp-packetizer
```

Usage
---
this tcp-packetizer module helps to but tcp streaming message. There are two patterns it supports as fixed size packet or header & payload.

- Fixed Size packet
```
const packetizer = require('tcp-packetizer');

const server = net.createServer((socket) => {

  // Create a packetizer with fixed size option
  socket.packetizer = packetizer.create({
    mode: packetizer.MODE_FIXED_PACKETSIZE,
    packetSize: 100     // Mention your packet size
  });

  // redirect msg to packetizer
  socket.on('data', (msg) => {
    socket.packetizer.append(msg);
  });

  socket.packetizer.on('err', (err) => {
    // Packet Error handling
  });

  socket.packetizer.on('packet', (packet) => {
    // Single packet handling 
  });
})

```

- Header and Payload option
```
const packetizer = require('tcp-packetizer');

const server = net.createServer((socket) => {

  // Create a packetizer with fixed size option
  socket.packetizer = packetizer.create({
    mode: packetizer.MODE_HEADER_PAYLOAD,
    headerSize: 7,                                      // Header length.
    payloadSizeIndex: 5,                                // Payload size index in the header packet.
    readDataLengthFn: Buffer.prototype.readUInt32LE     // A way to read payload size, 8, 16, 32, 64 bytes and endianess.
  });

  // redirect msg to packetizer
  socket.on('data', (msg) => {
    socket.packetizer.append(msg);
  });

  socket.packetizer.on('err', (err) => {
    // Packet Error handling
  });

  socket.packetizer.on('packet', (packet) => {
    // Single packet handling 
  });
})

```
