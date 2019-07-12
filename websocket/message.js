
export const Message = function(id, options) {
	options = options || { binary: false };
  this.isBinary = options.binary || false;
  this.base64 = options.base64 || null;
  this.token = options.token || null;
	this.id = id;
  this.name = options.name || null;
  this.payload = options.payload || {};
  this.errors = options.errors || [];
  this.result = options.result || null;
  this.byteArray = options.byteArray || null;
}

Message.prototype.toString = function() {
  let out = {
    id: this.id, data: this.data, name: this.name, payload: this.payload, base64: this.base64,
  }
  if (this.token) out.token = this.token;
  return JSON.stringify(out);
}

Message.prototype.toBlob = function() {
  // first byte should have some message metadata, so maybe like
  //console.log('calling to blob');
  if (this.data instanceof Uint8Array) {
    return this.data.buffer;
  } else {
    console.error('unsupported data type', this.data);
  }
  //return new Blob(new Uint8Array([0b10101111, 127, 999999999999999]));
}

Message.prototype.toUint8Array = function() {
  let metaString = JSON.stringify({
    id: this.id,
    name: this.name,
    payload: this.payload,
  });
  let utf8arr = String.prototype.toUTF8Array(metaString);
  let numBytes = utf8arr.length;
  // first 32 bits describe the size of the json string
  // sending as big endian order
  let a = numBytes & 0xFF000000;
  let b = numBytes & 0x00FF0000;
  let c = numBytes & 0x0000FF00;
  let d = numBytes & 0x000000FF;
  //console.log('size (numBytes)', numBytes, 'a', a, 'b', b, 'c', c, 'd', d);
  //console.log('combined', a | b | c | d);
  //console.log('utf8arr', utf8arr);
  var totalMessageSize = this.byteArray ? this.byteArray.length + numBytes + 4 : numBytes + 4;
  var buf = new Uint8Array(totalMessageSize);
  buf[0] = a;
  buf[1] = b;
  buf[2] = c;
  buf[3] = d;
  let metaStrLen = numBytes;
  let count = 0;
  while (metaStrLen--) {
    buf[count+4] = utf8arr[count];
    count++;
  }
  let sizeRest = totalMessageSize - numBytes - 4;
  if (this.byteArray) {
    let count2 = 0;
    while (sizeRest--) {
      buf[count+4] = this.byteArray[count2];
      count++;
      count2++;
    }
    //return buf.concat(this.byteArray);
  }
  return buf;
}

Message.prototype.fromString = function(str) {
  try {
    var obj = JSON.parse(str);
    //console.log('message.fromString:', obj);
    return new Message(obj.id, {...obj});
  } catch (e) {
    console.log('got a bad message, not json string. got from server: ', str);
    console.log('error',e);
    return new Message(1, {info: 'not done yet for binary message responses'});
  }
}

// source: http://jonisalonen.com/2012/from-utf-16-to-utf-8-in-javascript/
String.prototype.toUTF8Array = function(str) {
  var utf8 = [];
  for (var i=0; i < str.length; i++) {
    var charcode = str.charCodeAt(i);
    if (charcode < 0x80) utf8.push(charcode);
    else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 
        0x80 | (charcode & 0x3f));
    }
    else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(0xe0 | (charcode >> 12), 
        0x80 | ((charcode>>6) & 0x3f), 
        0x80 | (charcode & 0x3f));
    }
    // surrogate pair
    else {
      i++;
      // UTF-16 encodes 0x10000-0x10FFFF by
      // subtracting 0x10000 and splitting the
      // 20 bits of 0x0-0xFFFFF into two halves
      charcode = 0x10000 + (((charcode & 0x3ff)<<10)
        | (str.charCodeAt(i) & 0x3ff))
      utf8.push(0xf0 | (charcode >>18), 
        0x80 | ((charcode>>12) & 0x3f), 
        0x80 | ((charcode>>6) & 0x3f), 
        0x80 | (charcode & 0x3f));
    }
  }
  return utf8;
}
