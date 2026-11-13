/** Shared room links always enter as a candidate. Host entry still requires credentials. */
export function roomPath(code: string, role: "candidate" | "interviewer" = "candidate") {
  const path = `/room/${encodeURIComponent(code)}`;
  return role === "interviewer" ? `${path}?role=interviewer` : path;
}

export function roomInviteUrl(code: string, origin: string) {
  return new URL(roomPath(code), origin).href;
}
