// 蛇蛇对决 · 房间码中继服务（零依赖，Node 8+）
// 协议：WS 文本帧 JSON
//   客户端 -> 服务端：{t:'join',room:'1234'} / {t:'i',d:'up'} / {t:'a',k:'boost'|'shield'}
//                    {t:'p',v:0|1} / {t:'preq'} / {t:'again'} / {t:'leave'}
//                    {t:'s',s:{...}}   (房主状态广播)
//   服务端 -> 客户端：{t:'wait'} / {t:'start',role} / {t:'s',s} / {t:'i',d} / {t:'a',k}
//                    {t:'p',v} / {t:'peer_left'} / {t:'full'} / {t:'err',msg}
'use strict';
const http = require('http');
const crypto = require('crypto');

const PORT = process.env.PORT || 8765;
const HOST = '0.0.0.0';
const MAX_ROOM = 2;                 // 每房间最多两人
const IDLE_MS = 1000 * 60 * 30;     // 房间空闲 30 分钟自动回收

/* ---------------- 极简 WebSocket 服务端 ---------------- */
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size,
      peers: [...rooms.values()].reduce((n, r) => n + r.peers.length, 0) }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('snake relay running\n');
});

const rooms = new Map();

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) { socket.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    'Sec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  socket.setNoDelay(true);
  handlePeer(socket);
});

function handlePeer(socket) {
  const peer = { socket, room: null, role: null, alive: true, buf: Buffer.alloc(0) };
  socket.on('data', chunk => {
    peer.buf = Buffer.concat([peer.buf, chunk]);
    let frame;
    while ((frame = readFrame(peer.buf))) {
      peer.buf = peer.buf.subarray(frame.consumed);
      if (frame.opcode === 0x8) { closePeer(peer); return; }       // close
      if (frame.opcode === 0x9) { sendRaw(socket, 0xA, frame.payload); continue; } // ping->pong
      if (frame.opcode === 0x1 || frame.opcode === 0x2) {
        const text = frame.payload.toString('utf8');
        let msg; try { msg = JSON.parse(text); } catch (e) { continue; }
        onMessage(peer, msg);
      }
    }
  });
  socket.on('error', () => closePeer(peer));
  socket.on('close', () => closePeer(peer));
}

function readFrame(buf) {
  if (buf.length < 2) return null;
  const b0 = buf[0], b1 = buf[1];
  const fin = (b0 & 0x80) !== 0;
  const opcode = b0 & 0x0f;
  const masked = (b1 & 0x80) !== 0;
  let len = b1 & 0x7f;
  let off = 2;
  if (len === 126) { if (buf.length < 4) return null; len = buf.readUInt16BE(2); off = 4; }
  else if (len === 127) { if (buf.length < 10) return null;
    len = Number(buf.readBigUInt64BE(2)); off = 10; }
  let mask = null;
  if (masked) { if (buf.length < off + 4) return null; mask = buf.subarray(off, off + 4); off += 4; }
  if (len > 2 * 1024 * 1024) return null;              // 防御超大帧
  if (buf.length < off + len) return null;
  let payload = Buffer.from(buf.subarray(off, off + len));
  if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
  if (!fin) return null;                                // 不支持分片（本协议消息都很小）
  return { opcode, payload, consumed: off + len };
}

function sendRaw(socket, opcode, payload) {
  if (!socket.writable) return;
  const len = payload.length;
  let head;
  if (len < 126) head = Buffer.from([0x80 | opcode, len]);
  else if (len < 65536) { head = Buffer.alloc(4); head[0] = 0x80 | opcode; head[1] = 126; head.writeUInt16BE(len, 2); }
  else { head = Buffer.alloc(10); head[0] = 0x80 | opcode; head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
  try { socket.write(Buffer.concat([head, payload])); } catch (e) {}
}
function send(peer, obj) { sendRaw(peer.socket, 0x1, Buffer.from(JSON.stringify(obj), 'utf8')); }

/* ---------------- 房间逻辑 ---------------- */
function onMessage(peer, msg) {
  if (msg.t === 'join') {
    const room = String(msg.room || '').slice(0, 12);
    if (!room) { send(peer, { t: 'err', msg: '房间码无效' }); return; }
    let r = rooms.get(room);
    if (!r) { r = { peers: [], last: Date.now() }; rooms.set(room, r); }
    if (r.peers.length >= MAX_ROOM) { send(peer, { t: 'full' }); return; }
    peer.room = room;
    peer.role = r.peers.length === 0 ? 'host' : 'guest';
    r.peers.push(peer); r.last = Date.now();
    if (r.peers.length === 1) {
      send(peer, { t: 'wait' });
    } else {
      const [host, guest] = r.peers;
      send(host, { t: 'start', role: 'host' });
      send(guest, { t: 'start', role: 'guest' });
    }
    return;
  }

  const r = peer.room ? rooms.get(peer.room) : null;
  if (!r) return;

  switch (msg.t) {
    case 's': // 房主状态广播 -> 只发给对手
    case 'i':
    case 'a':
    case 'p':
    case 'preq': {
      const other = r.peers.find(p => p !== peer);
      if (other) send(other, msg);
      break;
    }
    case 'again': {
      peer.again = true;
      const other = r.peers.find(p => p !== peer);
      if (other && other.again) {
        r.peers.forEach(p => { p.again = false; });
        r.peers.forEach((p, i) => send(p, { t: 'start', role: i === 0 ? 'host' : 'guest' }));
      } else if (other) {
        send(other, { t: 'err', msg: '' });     // 静默：仅提示对方已准备
      }
      break;
    }
    case 'leave':
      closePeer(peer);
      break;
  }
}

function closePeer(peer) {
  if (peer.closed) return;
  peer.closed = true;
  try { sendRaw(peer.socket, 0x8, Buffer.alloc(0)); } catch (e) {}
  try { peer.socket.end(); } catch (e) {}
  const r = peer.room ? rooms.get(peer.room) : null;
  if (r) {
    r.peers = r.peers.filter(p => p !== peer);
    r.last = Date.now();
    if (r.peers.length === 0) rooms.delete(peer.room);
    else r.peers.forEach(p => { p.again = false; send(p, { t: 'peer_left' }); });
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [code, r] of rooms) {
    if (r.peers.length === 0 || now - r.last > IDLE_MS) {
      r.peers.forEach(p => closePeer(p));
      rooms.delete(code);
    }
  }
}, 60000).unref();

server.listen(PORT, HOST, () => {
  console.log('[snake-relay] listening on ' + HOST + ':' + PORT);
});