/*
 * This code is licensed for use under GPLv3.0. It is not in the public domain.
 * Copyright (C) Preston Petrie 2021
 */
/**
 * @module Steam Manager
 */

/**
 * Extracts a user's Steam ID from their login token
 * @param token the login token
 */
export function getSteamIdFromToken(token: string): string {
    if(token == null || token.length < 400) {
        return null
    }
    return Buffer.from(token, 'hex').readBigUInt64LE(0x0c).toString()
}

/**
 * Verifies the Steam game ID sent by the client.<br>
 * This also happens to detect Goldberg.
 * @param token the steam token
 */
export function verifyGameId(token: string): boolean {
    const tokenBuf = Buffer.from(token, 'hex')
    return tokenBuf.readInt32LE(0x48) === 381210
}
