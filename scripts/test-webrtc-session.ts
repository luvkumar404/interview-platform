import assert from "node:assert/strict";
import { test } from "node:test";
import { createPeerSession } from "../lib/webrtc-session";

function fixture() {
  const events: string[] = [];
  const sent: unknown[] = [];
  const errors: unknown[] = [];
  const connection = {
    getTransceivers: () => [],
    remoteDescription: null as RTCSessionDescriptionInit | null,
    addTransceiver: (kind: string, options: RTCRtpTransceiverInit) => events.push(`${kind}:${options.direction}`),
    createOffer: async () => ({ type: "offer", sdp: "offer" }),
    createAnswer: async () => ({ type: "answer", sdp: "answer" }),
    setLocalDescription: async () => { events.push("local"); },
    setRemoteDescription: async (description: RTCSessionDescriptionInit) => {
      await new Promise(resolve => setTimeout(resolve, 5));
      connection.remoteDescription = description;
      events.push("remote");
    },
    addIceCandidate: async () => {
      assert.ok(connection.remoteDescription, "ICE requires remote SDP");
      events.push("candidate");
    },
    close: () => events.push("closed"),
  };
  const session = createPeerSession({
    localStream: null, send: (data) => sent.push(data), onStream: () => {},
    onState: () => {}, onError: (error) => errors.push(error),
    createConnection: () => connection as unknown as RTCPeerConnection,
  });
  return {session,events,sent,errors};
}

test("a participant without local devices still requests audio and video", async () => {
  const {events,session}=fixture();
  await session.offer();
  assert.deepEqual(events.slice(0,2),["audio:recvonly","video:recvonly"]);
  session.close();
});
test("early and concurrent ICE waits for the remote description", async () => {
  const {session,events,sent,errors}=fixture();
  await session.receive({candidate:{candidate:"early"}});
  await Promise.all([
    session.receive({offer:{type:"offer",sdp:"offer"}}),
    session.receive({candidate:{candidate:"concurrent"}}),
  ]);
  assert.deepEqual(events,["remote","candidate","local","candidate"]);
  assert.deepEqual(sent,[{answer:{type:"answer",sdp:"answer"}}]);
  assert.deepEqual(errors,[]);
  session.close();
});
test("closed sessions do not send stale offers or process queued candidates", async () => {
  const {session,sent,errors}=fixture();
  const offer=session.offer();
  session.close();
  await offer;
  await session.receive({candidate:{candidate:"late"}});
  assert.deepEqual(sent,[]);
  assert.deepEqual(errors,[]);
});
