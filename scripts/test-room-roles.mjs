import assert from "node:assert/strict";

const origin = process.env.TEST_BASE_URL || "http://localhost:3100";
const createdResponse = await fetch(`${origin}/api/rooms`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ language: "javascript" }),
});
assert.equal(createdResponse.status, 200, "Create the test room");
const { room, hostToken } = await createdResponse.json();
const endpoint = `${origin}/api/rooms/${room.code}`;
const cookie = createdResponse.headers.get("set-cookie").split(";")[0];

async function expectRole(query, headers, expected, label) {
  const response = await fetch(`${endpoint}${query}`, { headers });
  assert.equal(response.status, 200, label);
  const data = await response.json();
  assert.equal(data.isHost, expected, label);
  assert.equal(data.room.status, "ACTIVE");
}

try {
  await expectRole("", {}, false, "A shared link opens as candidate in another browser");
  await expectRole("", { cookie }, false, "A shared link stays candidate in the creator's browser");
  await expectRole("", { "x-host-token": hostToken }, false, "Stored credentials do not change shared-link intent");
  await expectRole("?role=candidate", { cookie }, false, "Explicit candidate entry ignores the host cookie");
  await expectRole("?role=interviewer", { cookie }, true, "Creator enters as interviewer using the cookie");
  await expectRole("?role=interviewer", { "x-host-token": hostToken }, true, "Creator enters as interviewer using the stored token");
  await expectRole("?role=interviewer", {}, false, "An interviewer URL alone cannot grant host status");
  await expectRole("?role=interviewer", { "x-host-token": "invalid" }, false, "Invalid credentials cannot grant host status");
  await expectRole("?role=interviewer", { cookie }, true, "Candidate entry does not overwrite the creator's identity");
  console.log("Passed all 9 candidate/interviewer role checks.");
} finally {
  const ended = await fetch(`${endpoint}/end`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hostToken }),
  });
  assert.equal(ended.status, 200, "End the test room");
}
