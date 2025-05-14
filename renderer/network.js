// renderer/network.js
import SimplePeer from 'simple-peer';
import io         from 'socket.io-client';

export default function createNetwork(room = 'default', signalingURL = 'https://livechat.osc-fr1.scalingo.io') {
  const socket = io(signalingURL);
  const peers  = new Map();   // id-socket -> SimplePeer

  /* ---------- Signaling ---------- */
  socket.on('connect', () => socket.emit('join', room));

  socket.on('peers', ids =>             // on arrive : on devient initiateur pour chacun
    ids.forEach(id => startPeer(id, true))
  );

  socket.on('peer:join', id => startPeer(id, false));

  socket.on('signal', ({ from, data }) => {
    const p = peers.get(from);
    if (p) p.signal(data);
  });

  socket.on('peer:leave', id => {
    const p = peers.get(id);
    if (p) p.destroy();
    peers.delete(id);
  });

  function startPeer(id, initiator) {
    if (peers.has(id)) return;
    const peer = new SimplePeer({ initiator, trickle: false });
    peers.set(id, peer);

    peer.on('signal', data => socket.emit('signal', { to: id, data }));

    peer.on('data', buf => {
      try {
        const msg = JSON.parse(buf.toString());
        if (msg.type === 'scene') {
          // Rejoue exactement le même flux interne que ta fenêtre Design
          window.electronAPI.sendScene(msg.payload);
        }
      } catch (_) {}
    });

    peer.on('close', () => peers.delete(id));
  }

  /* ---------- API publique ---------- */
  function broadcastScene(sceneJson) {
    const msg = JSON.stringify({ type: 'scene', payload: sceneJson });
    peers.forEach(p => p.connected && p.send(msg));
  }

  return { broadcastScene };
}
