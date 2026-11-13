import { customAlphabet } from "nanoid";

// Generate cryptographically random room codes grouped 3-3-3.
const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
const nanoidRoom = customAlphabet(alphabet, 9);
const nanoidToken = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 32);

export function generateRoomCode(): string {
  const id = nanoidRoom();
  return `${id.slice(0, 3)}-${id.slice(3, 6)}-${id.slice(6)}`;
}

export function generateHostToken(): string {
  return nanoidToken();
}
