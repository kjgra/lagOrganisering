/**
 * Player levels, shared by the server, the board and the tag sheet.
 *
 * The coaching group chose a 10-step scale where the lowest level a player
 * can get is MIN_LEVEL, so no child is ever a «1». The database, the server
 * and the tag sheet all refuse anything below it.
 */
export const MIN_LEVEL = 5;
export const MAX_LEVEL = 10;
export const LEVELS = [5, 6, 7, 8, 9, 10] as const;

/** The old 1–5 scale on the new one: lowest to lowest, highest to highest. */
export const FROM_OLD_LEVEL: Record<number, number> = { 1: 5, 2: 6, 3: 8, 4: 9, 5: 10 };

export const isLevel = (n: number): boolean => Number.isInteger(n) && n >= MIN_LEVEL && n <= MAX_LEVEL;
