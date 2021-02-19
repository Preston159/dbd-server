
/**
 * Extracts a user's Steam ID from their login token
 * @param token the login token
 */
export function getSteamIdFromToken(token: string): string {
    if(token == null || token.length < 40) {
        return null
    }
    return Buffer.from(token, 'hex').readBigUInt64LE(0x0c).toString()
}
