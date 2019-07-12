import { Message } from "./message.js";
export function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

function getEndianness() {
	var a = new ArrayBuffer(4);
	var b = new Uint8Array(a);
	var c = new Uint32Array(a);
	b[0] = 0xa1;
	b[1] = 0xb2;
	b[2] = 0xc3;
	b[3] = 0xd4;
	if (c[0] === 0xd4c3b2a1) {
		return 'BlobReader.ENDIANNESS.LITTLE_ENDIAN';
	}
	if (c[0] === 0xa1b2c3d4) {
		return 'BlobReader.ENDIANNESS.BIG_ENDIAN';
	} else {
		throw new Error('Unrecognized endianness');
	}
}

export const makeId = function() {
	if (!Chat.prototype.curId) Chat.prototype.curId = Number.MAX_SAFE_INTEGER;
	let r = Chat.prototype.curId--;
	return r;
}

//var exampleSocket = new WebSocket("ws://www.example.com/socketserver", "protocolOne");
export const Chat = function(url, chatId) {
	this.url = url;
	this.id = chatId;
	this.sent = [];
	this.send_queue = [];
  this.replyFuncs = [];
	this.got = [];
  this.notifyConnected = () => true;
  this.isConnected = false;
  this.isConnecting = false;
}

Chat.prototype.connect = function(notifyConnected = null) {
  this.isConnecting = true;
	console.debug("Connecting to: "+this.url);
	this.socket = new WebSocket(this.url);
	this.socket.onmessage = this.onMessage.bind(this);
	this.socket.onopen = this.onOpen.bind(this);
	this.socket.onclose = this.onClose.bind(this);
  if (notifyConnected) this.notifyConnected = notifyConnected;
}

Chat.prototype.disconnect = function() {
	console.debug("disconnecting from: "+this.url);
  this.isConnected = false;
  this.isConnecting = false;
	this.socket.close();
}

Chat.prototype.onMessage = function(event) {
	let m = Message.prototype.fromString(event.data);
	this.got = this.got.concat(m);
	// remove from queue cuz we got a response
  let queueMsg = this.send_queue.filter(_m => _m.id === m.id)[0];
	this.send_queue = this.send_queue.filter(_m => _m.id !== m.id);
  let replyFunc = this.replyFuncs.filter(func => func.id === m.id);
  if (replyFunc[0]) {
    if (replyFunc[0].handleError) {
      if (m.errors.length > 0) {
        replyFunc[0].handleError(m.errors, queueMsg);
      } else {
        replyFunc[0].reply(m.result);
      }
    } else {
      replyFunc[0].reply(m);
    }
    this.replyFuncs = this.replyFuncs.filter(func => func.id !== m.id);
  } else {
    console.log('no reply func found: recieved', m);
  }
	//console.log('queue size', this.send_queue.length);
}

Chat.prototype.onOpen = function(event) {
	console.debug('connected');
  this.isConnecting = false;
  this.isConnected = true;
  this.notifyConnected();
	if (this.send_queue.length > 0) {
		this.send_queue.forEach(msg => {
      this._send(msg);
		});
	}
}

Chat.prototype.onClose = function(event) {
  console.debug('socket closed');
  this.isConnected = false;
  this.isConnecting = false;
}

/* should not be called directly */
Chat.prototype._send = function(msg) {
  console.debug('sending message', msg);
  if (msg.isBinary === true) {
    this.socket.send(msg.toUint8Array(), { binary: true })
  } else {
    this.socket.send(msg.toString(), { binary: false })
  }
}

Chat.prototype.send = function(message, reply = null, handleError = null) {
	if (this.isConnected) {
		this._send(message); 
	} else {
    if (this.isConnecting === false) {
      console.log('attempting to reconnect');
      this.connect();
    }
    this.send_queue = this.send_queue.concat(message);
	}
  if (reply) {
    this.replyFuncs = this.replyFuncs.concat({id: message.id, reply, handleError});
  }
}

