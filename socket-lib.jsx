import { Chat, makeId, getCookie } from "websocket/chat.js";
import { Message } from "websocket/message.js";

var Client = {};

Client.ws = new Chat('wss://'+window.location.host+'/ws', Date.now());
Client.init = function() {
  console.log('ws_token', getCookie('ws_token'));
}
Client.init();
Client.onMessageFuncs = [];
Client.token = null;

// for sending actions
Client.request = function(name, payload, onOk, onError) {
  let m = null;
  if (payload.hasOwnProperty('payload')) {
    m = new Message(makeId(), {name, ...payload});
  } else {
    m = new Message(makeId(), {
      name,
      payload,
      //token: getCookie('ws_token'), // off for now cuz server will reject if invalid
      token: Client.token, // off for now cuz server will reject if invalid
    });
  }
  Client.ws.send(m, onOk, onError);
}

// for published messages
Client.onMessage = function(type, func) {
  Client.onMessageFuncs = Client.onMessageFuncs.concat({type, func});
}
