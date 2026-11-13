export type PeerSignal = {
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

/** One session per peer; serialize SDP/ICE work so candidates cannot race SDP. */
export function createPeerSession({
  localStream,
  send,
  onStream,
  onState,
  onError,
  createConnection = () => new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
  }),
}: {
  localStream: MediaStream | null;
  send: (signal: PeerSignal) => void;
  onStream: (stream: MediaStream) => void;
  onState: (state: RTCPeerConnectionState) => void;
  onError: (error: unknown) => void;
  createConnection?: () => RTCPeerConnection;
}) {
  const pc = createConnection();
  let closed = false;
  let queue = Promise.resolve();
  const candidates: RTCIceCandidateInit[] = [];
  let remoteStream: MediaStream | null = null;

  // addTrack lets the answerer reuse the offer's media sections.
  localStream?.getTracks().filter((track) => track.readyState === "live").forEach((track) => {
    pc.addTrack(track, localStream);
  });

  pc.ontrack = (event) => {
    if (closed) return;
    remoteStream = event.streams[0] || remoteStream || new MediaStream();
    if (!remoteStream.getTracks().some((track) => track.id === event.track.id)) remoteStream.addTrack(event.track);
    onStream(remoteStream);
  };
  pc.onicecandidate = ({ candidate }) => {
    if (!closed && candidate) send({ candidate: candidate.toJSON() });
  };
  pc.onconnectionstatechange = () => {
    if (!closed) onState(pc.connectionState);
  };

  function enqueue(work: () => Promise<void>) {
    queue = queue.then(async () => { if (!closed) await work(); }).catch((error) => {
      if (!closed) onError(error);
    });
    return queue;
  }
  async function flushCandidates() {
    while (!closed && candidates.length) await pc.addIceCandidate(candidates.shift()!);
  }

  return {
    offer: () => enqueue(async () => {
      // Request incoming media even when the caller has no local camera or mic.
      for (const kind of ["audio", "video"] as const) {
        if (!pc.getTransceivers().some((item) => item.receiver.track.kind === kind)) {
          pc.addTransceiver(kind, { direction: "recvonly" });
        }
      }
      const offer = await pc.createOffer();
      if (closed) return;
      await pc.setLocalDescription(offer);
      if (!closed) send({ offer });
    }),
    receive: (signal: PeerSignal) => enqueue(async () => {
      if (signal.offer) {
        await pc.setRemoteDescription(signal.offer);
        if (closed) return;
        await flushCandidates();
        const answer = await pc.createAnswer();
        if (closed) return;
        await pc.setLocalDescription(answer);
        if (!closed) send({ answer });
      } else if (signal.answer) {
        await pc.setRemoteDescription(signal.answer);
        await flushCandidates();
      } else if (signal.candidate) {
        if (pc.remoteDescription) await pc.addIceCandidate(signal.candidate);
        else candidates.push(signal.candidate);
      }
    }),
    close: () => {
      closed = true;
      candidates.length = 0;
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.close();
    },
  };
}
