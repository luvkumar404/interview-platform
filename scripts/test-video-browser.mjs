import assert from 'node:assert/strict';
const base = process.env.TEST_BASE_URL || 'http://localhost:3100';
const debug = process.env.CDP_URL || 'http://localhost:9223';
const noHostMedia = process.env.TEST_HOST_WITHOUT_CAMERA === '1';
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function tab(url) {
  const target = await fetch(`${debug}/json/new?${encodeURIComponent(url)}`, {method:'PUT'}).then(r=>r.json());
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  let next=0;const pending=new Map();
  ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}};
  function send(method,params={}) {return new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});}
  async function evaluate(expression) {const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
  await send('Runtime.enable');
  return {evaluate,send,close:async()=>{ws.close();await fetch(`${debug}/json/close/${target.id}`);}};
}
async function until(page, expression, description, timeout=45000) {
  const start=Date.now();
  while(Date.now()-start<timeout){if(await page.evaluate(expression))return;await delay(250);}
  throw new Error(`Timed out: ${description}. Page: ${await page.evaluate('document.body.innerText.slice(-2000)')}`);
}
const host=await tab(base);let candidate;
try {
  await until(host, 'Array.from(document.querySelectorAll("button")).some(b=>b.textContent.includes("Start an interview"))','landing page');
  if (noHostMedia) {
    const source = 'navigator.mediaDevices.getUserMedia = async () => { throw new DOMException("Test: no camera", "NotAllowedError"); };';
    await host.send('Page.addScriptToEvaluateOnNewDocument', {source});
    await host.evaluate(source);
  }
  await host.evaluate('Array.from(document.querySelectorAll("button")).find(b=>b.textContent.includes("Start an interview")).click()');
  await until(host, noHostMedia ? 'location.pathname.startsWith("/room/") && document.querySelector("button[type=submit]")?.disabled === false' : 'location.pathname.startsWith("/room/") && document.querySelector("video")?.videoWidth > 0', 'host camera setup');
  assert.match(await host.evaluate('document.body.innerText'),/Host \(Interviewer\)/);
  const shared=await host.evaluate('location.origin + location.pathname');
  await host.evaluate('document.querySelector("button[type=submit]").click()');
  await until(host,'!!document.querySelector(".room-workspace")','host workspace');
  candidate=await tab(shared);
  await until(candidate,'document.querySelector("video")?.videoWidth > 0 && !!document.querySelector("#participant-name")','candidate camera preview');
  assert.equal(await candidate.evaluate('document.querySelector("#participant-name").value'),'Candidate');
  await candidate.evaluate('document.querySelector("button[type=submit]").click()');
  const playing='document.querySelectorAll(".room-video-column video").length === 2 && Array.from(document.querySelectorAll(".room-video-column video")).every(v=>v.videoWidth > 0 && !v.paused && v.getVideoPlaybackQuality().totalVideoFrames > 3)';
  const hostPlaying = noHostMedia ? playing.replace('length === 2', 'length === 1') : playing;
  const candidatePlaying = noHostMedia ? playing.replace('length === 2', 'length === 1') : playing;
  await until(host,hostPlaying,'candidate video playing for interviewer');
  await until(candidate,candidatePlaying,'interviewer video playing for candidate');
  console.log(noHostMedia ? 'Passed: interviewer without camera receives candidate video.' : 'Passed: real create buttons, both camera previews, candidate role with host cookie, and video frames in both directions.');
  // Leave and rejoin to exercise fresh negotiation after a peer connection closes.
  await candidate.send('Page.navigate',{url:shared});
  await until(candidate,'!!document.querySelector("#participant-name") && document.querySelector("video")?.videoWidth > 0','candidate rejoin preview');
  await candidate.evaluate('document.querySelector("button[type=submit]").click()');
  await until(host,hostPlaying,'candidate video after rejoin');
  await until(candidate,candidatePlaying,'interviewer video after rejoin');
  console.log('Passed: candidate leaves and rejoins with video restored on both sides.');
  await candidate.evaluate(`document.querySelector('[aria-label="Turn Off Camera"]').click()`);
  await until(candidate,`!!document.querySelector('[aria-label="Turn On Camera"]')`,"camera disabled");
  await candidate.evaluate(`document.querySelector('[aria-label="Turn On Camera"]').click()`);
  await until(candidate,candidatePlaying,'local preview after enabling camera again');
  await until(host,hostPlaying,'remote video after enabling camera again');
  console.log('Passed: candidate camera off/on restores preview and remote video.');
  await host.evaluate(`fetch(location.pathname.replace('/room/','/api/rooms/')+'/end',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})`);
} finally {await candidate?.close();await host.close();}
