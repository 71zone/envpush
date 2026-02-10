import { randomBytes } from "node:crypto";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

function randomSegment(length: number): string {
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CHARS[bytes[i]! % CHARS.length];
  }
  return result;
}

/**
 * Generate a memorable invite code.
 * Format: PREFIX-XXXX-XXXX where PREFIX is 4 chars from team name.
 */
export function generateInviteCode(teamName: string): string {
  const prefix = teamName
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 4)
    .padEnd(4, "X");
  return `${prefix}-${randomSegment(4)}-${randomSegment(4)}`;
}
