/**
 * Buffer utilities
 *
 * @module utils/bufferutils
 */
const util = require('util');
const EventEmitter = require('events').EventEmitter;

const MODE_FIXED_PACKETSIZE = 0;
const MODE_HEADER_PAYLOAD = 1;

/**
 * Packetizer object
 *
 * This buffer object handles accumulation of Byte buffer
 * and split them into packets.
 *
 * User of this object may provide below configuration.
 *
 * Configuration
 * mode - fixed size packet or header + payload
 * packetSize - size of a single packets. default 500 bytes
 * headerSize - size of header packet. default 7 bytes.
 * payloadSizeIndex - location of size of variable location if exist. default 5.
 * maxDataLength - limit max payload size. default Infinity.
 * readDataLengthFn - read function for variable len. default readUInt16LE
 *
 * Usage example
 * // creation
 * let buff = new Packetizer()
 *
 * // hook a single packet event
 * buff.on('packet', (packet) => {
 *    // do something with the packet
 * })
 *
 * // hook error event
 * buff.on('error', (err) => {
 *    // handle err
 * })
 *
 * buff.append(Buffer.alloc(10));
 * buff.append(Buffer.alloc(10));
 * buff.append(Buffer.alloc(10));
 *
 * @param {Object} configuration object that hold parsing data
 */
function Packetizer (config) {
  if (!config) {
    throw new Error('Buffer requires mode selection');
  }
  EventEmitter.call(this);
  // accumulative buffer
  this.buff = Buffer.allocUnsafe(0);

  // default mode
  this.mode = config.mode || MODE_FIXED_PACKETSIZE;

  if (this.mode === MODE_FIXED_PACKETSIZE) {
    this.packetSize = config.packetSize || 500;
  } else {
    this.headerSize = config.headerSize || 7;
    this.payloadSizeIndex = config.payloadSizeIndex || 5;
    this.maxDataLength = config.maxDataLength || Infinity;
    this.readDataLengthFn = config.readDataLengthFn || Buffer.prototype.readUInt32LE;
  }
}

// Inherit from EventEmitter
util.inherits(Packetizer, EventEmitter);

/**
 * Append message buffer to existing buffer
 *
 * @param {Buffer} addtional message to append
 */
Packetizer.prototype.append = function (msg) {
  this.buff = Buffer.concat([this.buff, msg],
    this.buff.byteLength + msg.byteLength);

  this._process_buff();
};

/**
 * Flush existing buffer. 
 */
Packetizer.prototype.flush = function () {
  this.buff = Buffer.allocUnsafe(0);
}

/**
 * Get the size of current buffer
 */
Packetizer.prototype.length = function () {
  return this.buff.length;
}

/**
 * Internal
 * 
 * Process buffer
 */
Packetizer.prototype._process_buff = function () {
  if (this.mode === MODE_FIXED_PACKETSIZE) this._process_fixed_packet();
  else this._process_header_payload();
}

/**
 * Internal
 * 
 * Process buffer and packetize as fixed size packets 
 */
Packetizer.prototype._process_fixed_packet = function () {
  let readStart = 0;
  let readEnd = 0;

  while (this.buff.byteLength >= readEnd + this.packetSize) {
      readEnd += this.packetSize;
      try {
        this.emit('packet', this.buff.slice(readStart, readEnd));
      } catch (err) {
        this.emit('error', err);
        readStart = readEnd;
        break;
      }
      readStart = readEnd;
  }

  // Remove reading completed bytes and allocate remaining buffer.
  if (readStart !== 0) {
    // Allocate new buffer with the size of unprocessed bytes
    let newBuff = Buffer.allocUnsafe(this.buff.byteLength - readEnd);
    this.buff.copy(newBuff, 0, readEnd, this.buff.byteLength);
    this.buff = newBuff;
  }
}

/**
 * Internal
 * 
 * Process buffer and packetize as header + payload
 */
Packetizer.prototype._process_header_payload = function () {
  // Get size of Completed packets
  let readStart = 0;
  let readEnd = 0;

  // Going through packet by packet
  while (this.buff.byteLength >= readEnd + this.headerSize) {
    let payloadSize = this.readDataLengthFn.call(this.buff, (readEnd + this.payloadSizeIndex));

    // if user set maximum size of single packet
    // this will throw error, otherwise it never throw.
    if (payloadSize > this.maxDataLength) {
      this.emit('error', new Error('Max size is' + this.maxDataLength + '. But got a packet : ' + payloadSize));
      break;
    }

    // if it has a complete packet
    if (this.buff.byteLength >=
          (readEnd + this.headerSize + payloadSize)) {
      readEnd = readEnd + (this.headerSize + payloadSize);

      try {
        this.emit('packet', this.buff.slice(readStart, readEnd));
      } catch (err) {
        // if user's packet handling throws error, we catch it.
        this.emit('error', err);
        readStart = 0;
        break;
      }

      readStart = readEnd;
    } else {
      break;
    }
  }

  // Remove reading completed bytes and allocate remaining buffer.
  if (readStart !== 0) {
    // Allocate new buffer with the size of unprocessed bytes
    let newBuff = Buffer.allocUnsafe(this.buff.byteLength - readEnd);
    this.buff.copy(newBuff, 0, readEnd, this.buff.byteLength);
    this.buff = newBuff;
  }
}

const create(config) {
  return new Packetizer(config);
}

exports.Packetizer = {create, MODE_FIXED_PACKETSIZE, MODE_HEADER_PAYLOAD};
