import { customAlphabet } from "nanoid";

// Generate 10-char room codes matching /^[A-Za-z0-9_-]{8,12}$/
const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const nanoidRoom = customAlphabet(alphabet, 10);
const nanoidToken = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", 32);

export function generateRoomCode(): string {
  return nanoidRoom();
}

export function generateHostToken(): string {
  return nanoidToken();
}
