import type { KilledLobby, Lobby, QueueData, QueuedPlayer, Session, Side } from './types/types'
import { genMatchUUID } from './util.js'


const openLobbies: Lobby[] = []
const killedLobbies: KilledLobby[] = []
const queuedPlayers: QueuedPlayer[] = []

export function queuePlayer(queueData: QueueData, session: Session): void {
    queuedPlayers.push({
        bhvrSession: session.bhvrSession,
        userId: session.clientIds.userId,
        side: queueData.side,
        lastCheckedForMatch: Date.now(),
    })
}

export function getQueuedPlayer(bhvrSession: string): [ QueuedPlayer, number ] {
    for(let i = 0;i < queuedPlayers.length;i++) {
        if(queuedPlayers[i].bhvrSession === bhvrSession) {
            return [ queuedPlayers[i], i ]
        }
    }
    return [ null, -1 ]
}

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

export function removePlayerFromQueue(bhvrSession: string): void {
    const [ queuedPlayer, index ] = getQueuedPlayer(bhvrSession)
    if(queuedPlayer === null) {
        return
    }
    queuedPlayers.splice(index, 1)
}

export function getLobbyById(id: string): [ Lobby, number ] {
    for(let i = 0;i < openLobbies.length;i++) {
        if(openLobbies[i].id === id) {
            return [ openLobbies[i], i ]
        }
    }
    return [ null, -1 ]
}

export function getKilledLobbyById(id: string): KilledLobby {
    for(const killedLobby of killedLobbies) {
        if(killedLobby.id === id) {
            return killedLobby
        }
    }
    return null
}

export function registerMatch(matchId: string, sessionSettings: string): Record<string, unknown> {
    const [ lobby ] = getLobbyById(matchId)
    if(lobby === null) {
        return null
    }
    lobby.isReady = true
    lobby.sessionSettings = sessionSettings
    return createMatchResponse(matchId)
}

export function deleteMatch(matchId: string): void {
    const [ lobby, index ] = getLobbyById(matchId)
    if(lobby === null) {
        return
    }
    const killedLobby = openLobbies.splice(index, 1)[0] as KilledLobby
    killedLobby.killedTime = Date.now()
    killedLobbies.push(killedLobby)
}

export function isOwner(matchId: string, bhvrSession: string): boolean {
    const [ lobby ] = getLobbyById(matchId)
    return lobby && lobby.host.bhvrSession === bhvrSession
}

export function deleteOldMatches(): void {
    console.log('Deleting old matches')
    for(let i = killedLobbies.length - 1;i >= 0;i--) {
        if(killedLobbies[i].killedTime < Date.now() - 5 * 60 * 1000) {
            killedLobbies.splice(i, 1)
        }
    }
}

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
