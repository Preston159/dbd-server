/*
 * This code is licensed for use under GPLv3.0. It is not in the public domain.
 * Copyright (C) Preston Petrie 2021
 */
/**
 * @module Matchmaking
 */
import type { KilledLobby, Lobby, QueueData, QueuedPlayer, Session, Side } from './types/types'
import { genMatchUUID } from './util.js'

const openLobbies: Lobby[] = []
const killedLobbies: KilledLobby[] = []
const queuedPlayers: QueuedPlayer[] = []

/**
 * Places a player into the matchmaking queue.
 * @param queueData the player's queue data
 * @param session   the player's Session
 */
export function queuePlayer(queueData: QueueData, session: Session): void {
    queuedPlayers.push({
        bhvrSession: session.bhvrSession,
        userId: session.clientIds.userId,
        side: queueData.side,
        lastCheckedForMatch: Date.now(),
    })
}

/**
 * Finds a queued player by their bhvrSession.
 * @param bhvrSession the player's bhvrSession
 * @returns a tuple [ QueuedPlayer, number ] where [0] is the relevant QueuedPlayer object (or null) and [1] is the index in queuedPlayers (or -1)
 */
export function getQueuedPlayer(bhvrSession: string): [ QueuedPlayer, number ] {
    for(let i = 0;i < queuedPlayers.length;i++) {
        if(queuedPlayers[i].bhvrSession === bhvrSession) {
            return [ queuedPlayers[i], i ]
        }
    }
    return [ null, -1 ]
}

/**
 * Gets a player's queue status to be sent to the client
 * @param side      'A' if killer or 'B' if survivor
 * @param session   the player's Session
 */
export function getQueueStatus(side: Side, session: Session): Record<string, unknown> {
    const [ queuedPlayer, index ] = getQueuedPlayer(session.bhvrSession)
    if(queuedPlayer === null) {
        return {}
    }
    if(side === 'B') {
        if(openLobbies.length > 0) {
            for(const openLobby of openLobbies) {
                if(!openLobby.isReady || openLobby.hasStarted) {
                    continue
                }
                if(openLobby.nonHosts.length < 4) {
                    openLobby.nonHosts.push(queuedPlayer)
                    queuedPlayers.splice(index, 1)
                    return createQueueResponseMatched(openLobby.host.userId, openLobby.id, session.clientIds.userId)
                }
            }
        } else {
            return {
                queueData: {
                    ETA: -10000,
                    position: 0,
                    sizeA: 0,
                    sizeB: 1,
                },
                status: 'QUEUED',
            }
        }
    } else {
        const matchId = genMatchUUID()
        openLobbies.push({
            isReady: false,
            host: queuedPlayer,
            nonHosts: [],
            id: matchId,
            isPrepared: false,
            hasStarted: false,
        })
        return createQueueResponseMatched(session.clientIds.userId, matchId)
    }
}

/**
 * Removes the specified player from the matchmaking queue.
 * @param bhvrSession the player's bhvrSession
 */
export function removePlayerFromQueue(bhvrSession: string): void {
    const [ queuedPlayer, index ] = getQueuedPlayer(bhvrSession)
    if(queuedPlayer === null) {
        return
    }
    queuedPlayers.splice(index, 1)
}

/**
 * Finds a lobby by its ID.
 * @param id the ID of the lobby
 * @returns a tuple [ Lobby, number ] where [0] is the Lobby (or null) and [1] is the Lobby's index in openLobbies (or -1)
 */
export function getLobbyById(id: string): [ Lobby, number ] {
    for(let i = 0;i < openLobbies.length;i++) {
        if(openLobbies[i].id === id) {
            return [ openLobbies[i], i ]
        }
    }
    return [ null, -1 ]
}

/**
 * Finds and returns a killed lobby by its ID.
 * @param id the ID of the lobby
 */
export function getKilledLobbyById(id: string): KilledLobby {
    for(const killedLobby of killedLobbies) {
        if(killedLobby.id === id) {
            return killedLobby
        }
    }
    return null
}

/**
 * Registers a match and marks it ready.
 * @param matchId           the ID of the match
 * @param sessionSettings   the SessionSettings sent by the host client
 */
export function registerMatch(matchId: string, sessionSettings: string): Record<string, unknown> {
    const [ lobby ] = getLobbyById(matchId)
    if(lobby === null) {
        return null
    }
    lobby.isReady = true
    lobby.sessionSettings = sessionSettings
    return createMatchResponse(matchId)
}

/**
 * Removes the specified match from openLobbies and moves it to killedLobbies.
 * @param matchId the match ID
 */
export function deleteMatch(matchId: string): void {
    const [ lobby, index ] = getLobbyById(matchId)
    if(lobby === null) {
        return
    }
    const killedLobby = openLobbies.splice(index, 1)[0] as KilledLobby
    killedLobby.killedTime = Date.now()
    killedLobbies.push(killedLobby)
}

/**
 * Returns `true` if the specified player is the host of the given match, `false` otherwise.
 * @param matchId       the match ID
 * @param bhvrSession   the player's bhvrSession
 */
export function isOwner(matchId: string, bhvrSession: string): boolean {
    const [ lobby ] = getLobbyById(matchId)
    return lobby && lobby.host.bhvrSession === bhvrSession
}

/**
 * Deletes all Killed Lobbies which were killed more than 5 minutes ago.
 */
export function deleteOldMatches(): void {
    console.log('Deleting old matches')
    for(let i = killedLobbies.length - 1;i >= 0;i--) {
        if(killedLobbies[i].killedTime < Date.now() - 5 * 60 * 1000) {
            killedLobbies.splice(i, 1)
        }
    }
}

/**
 * Creates a match response to be sent to the client.
 * @param matchId   the match ID
 * @param killed    whether or not the match has been killed
 */
export function createMatchResponse(matchId: string, killed = false): Record<string, unknown> {
    let [ lobby ] = getLobbyById(matchId)
    if(lobby === null) {
        lobby = getKilledLobbyById(matchId)
    }
    if(lobby === null) {
        return {}
    }
    return {
        category: 'oman-100372-dev:None:Windows:::1:4:0:G:2',
        churn: 0,
        creationDateTime: Date.now(),
        creator: lobby.host.userId,
        customData: {
            SessionSettings: lobby.sessionSettings || '',
        },
        geolocation: {},
        matchId,
        props: {
            countA: 1,
            countB: 4,
            EncryptionKey: 'Rpqy9fgpIWrHxjJpiwnJJtoZ2hbUZZ4paU+0n4K/iZI=',
            gameMode: 'None',
            platform: 'Windows',
        },
        rank: 1,
        reason: lobby.reason ? lobby.reason : '',
        schema: 3,
        sideA: [ lobby.host.userId ],
        sideB: lobby.nonHosts.map(player => player.userId),
        skill: {
            continent: 'NA',
            country: 'US',
            latitude: 0,
            longitude: 0,
            rank: 20,
            rating: {
                rating: 1500,
                RD: 347.4356,
                volatility: 0.06,
            },
            regions: {
                good: ['us-east-1'],
                ok: ['us-east-1'],
            },
            version: 2,
            x: 20,
        },
        status: killed ? 'KILLED' : 'OPENED',
        version: 2,
    }
}

/**
 * Creates a queue response to be sent to the client.
 * @param creatorId the host's ID
 * @param matchId   the match ID
 * @param joinerId  the joiner's ID
 */
function createQueueResponseMatched(creatorId: string, matchId: string, joinerId?: string): { status: string; matchData: any } {
    return {
        status: 'MATCHED',
        matchData: {
            category: 'oman-100372-dev:None:Windows:::1:4:0:G:2',
            churn: 0,
            creationDateTime: Date.now(),
            creator: creatorId,
            customData: {},
            geolocation: {},
            matchId,
            props: {
                countA: 1,
                countB: 4,
                EncryptionKey: 'Rpqy9fgpIWrHxjJpiwnJJtoZ2hbUZZ4paU+0n4K/iZI=',
                gameMode: 'None',
                platform: 'Windows',
            },
            rank: 1,
            reason: '',
            schema: 3,
            sideA: [ creatorId ],
            sideB: joinerId ? [ joinerId ] : [],
            skill: {
                continent: 'NA',
                country: 'US',
                latitude: 0,
                longitude: 0,
                rank: 20,
                rating: {
                    rating: 1500,
                    RD: 347.4356,
                    volatility: 0.06,
                },
                regions: {
                    good: ['us-east-1'],
                    ok: ['us-east-1'],
                },
                version: 2,
                x: 20,
            },
            status: 'CREATED',
            version: 1,
        },
    }
}
