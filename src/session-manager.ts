import type { Session, ClientIds } from './types/types'

import { genFriendlyRandomString, mapToArray, genUUID } from './util.js'
import * as StartingValues from './starting-values.js'

const activeSessions: Map<string, Session> = new Map<string, Session>()

/**
 * Checks whether a session with the given bhvrSession is active
 * @param bhvrSession the session cookie
 */
export function isSessionActive(bhvrSession: string): boolean {
    return bhvrSession != null && activeSessions.has(bhvrSession)
}

/**
 * Finds a Session object with the given bhvrSession
 * @param bhvrSession the session cookie
 */
export function getSession(bhvrSession: string): Session {
    return activeSessions.get(bhvrSession)
}

/**
 * Creates a new Session
 * @param now           the creation time as a UNIX timestamp
 * @param validFor      the validity length in seconds
 * @param forProvider   an optional paramater denoting whether the session is for a provider (i.e. not a guest). Defaults to false.
 * @returns the Session object
 */
export function createSession(now: number, validFor: number, forProvider = false, providerId = ''): Session {
    const session: Session = {
        expires: now + validFor,
        clientIds: genClientIds(!forProvider, providerId),
        bhvrSession: genBhvrSession(now, validFor),
        guestSession: '',
        totalXp: StartingValues.playerLevelObject.totalXp,
        isSteam: forProvider,
    }
    session.guestSession = genGuestSession(session.clientIds.tokenId)
    activeSessions.set(session.bhvrSession, session)
    return session
}

/**
 * Creates a fake session<br>
 * This session will have both its creation and expiry dates set to 0, i.e. it will already be expired.
 * @returns the Session object
 */
export function createFakeSession(): Session {
    const tokenId = genUUID()
    const session: Session = {
        expires: 0,
        bhvrSession: genBhvrSession(0, 0),
        guestSession: genGuestSession(tokenId),
        clientIds: {
            guestToken: genUUID(),
            tokenId,
            userId: genUUID(),
        },
        isFake: true,
        totalXp: 0,
        isSteam: false,
    }
    activeSessions.set(session.bhvrSession, session)
    return session
}

/**
 * Deletes the session information with the given bhvrSession
 * @param bhvrSession the session cookie
 */
export function deleteSession(bhvrSession: string): boolean {
    return activeSessions.delete(bhvrSession)
}

/**
 * Generates a new bhvrSession cookie
 * @param now       the creation time as a UNIX timestamp
 * @param validFor  the validity length in seconds
 */
export function genBhvrSession(now: number, validFor: number): string {
    // parts 1, 2, and 5 might have some significance
    const part1 = genFriendlyRandomString(22)
    const part2 = genFriendlyRandomString(192)
    const part3 = (now * 1000).toString()
    const part4 = (validFor * 1000).toString()
    const part5 = genFriendlyRandomString(43)
    return `${part1}.${part2}.${part3}.${part4}.${part5}`
}

/**
 * Generates a new guest session cookie
 * @param tokenId the token ID for which the cookie is being created
 */
function genGuestSession(tokenId: string): string {
    return `s:${tokenId}.fftvtIJbNVAHHDFQLQeDHquBvH/hZ+Ywhf+/oOe34PM`
}

/**
 * @returns all active Session objects
 */
export function getSessionsAsArray(): readonly Session[] {
    return mapToArray(activeSessions)
}

/**
 * Generates an object containing random IDs for a new user
 * @param guest an optional paramter denoting whether the session is for a guest account. Defaults to true.
 */
export function genClientIds(guest = true, providerId = ''): ClientIds {
    const clientIds: ClientIds = {
        tokenId: genUUID(),
        userId: genUUID(!guest, providerId),
    }
    if(guest) {
        clientIds.guestToken = genUUID()
    }
    return clientIds
}

/**
 * Removes all active fake sessions
 */
export function clearFakeSessions(): void {
    const fakeSessions = getSessionsAsArray().filter(session => session.isFake).map(session => session.bhvrSession)
    for(const bhvrSession of fakeSessions) {
        activeSessions.delete(bhvrSession)
    }
}

/**
 * Removes all active expired sessions
 * @param ignoreFake an optional paramater denoting whether to leave fake sessions active despite being always expired. Defaults to false.
 */
export function removeExpiredSessions(ignoreFake = false): void {
    console.log('Removing expired sessions')
    const now = Math.floor(Date.now() / 1000)
    const expiredSessions = getSessionsAsArray().filter(session => session.expires < now && (!ignoreFake || !session.isFake)).map(session => session.bhvrSession)
    for(const bhvrSession of expiredSessions) {
        activeSessions.delete(bhvrSession)
    }
}

/**
 * Finds a Session object with the given user ID
 * @param id the user ID
 * @returns the Session object if found, null otherwise
 */
export function findSessionById(id: string): Session {
    for(const key of activeSessions.keys()) {
        const session = activeSessions.get(key)
        if(session.clientIds.userId === id) {
            return session
        }
    }
    return null
}

/**
 * @returns the number of active sessions
 */
export function getActiveSessionCount(): number {
    return activeSessions.size
}
