//#region game

export type ClientIds = {
    tokenId: string
    userId: string
    guestToken?: string
}

export type Session = {
    expires: number
    bhvrSession: string
    guestSession: string
    clientIds: ClientIds
    totalXp: number
    profile?: string
    profileVersion?: number
    isFake?: boolean
}

export type Region = 'ap-south-1' |'eu-west-1' |'ap-southeast-1' |'ap-southeast-2' |'eu-central-1' |'ap-northeast-2' |'ap-northeast-1' |'us-east-1' |'sa-east-1' |'us-west-2'

export type RegionDecencies = {
    good: Region[]
    ok: Region[]
}

export type QueueDataLatency = {
    regionName: Region
    latency: number
}

export type QueueData = {
    side: 'A' | 'B'
    checkOnly: boolean
    latencies: QueueDataLatency[]
}

export type ConnectionInfo = {
    ipAddr: string
    port: number
}

export type Lobby = {
    isReady?: boolean
    sessionSettings?: string
    host: QueuedPlayer
    nonHosts: QueuedPlayer[]
    id: string
    isPrepared: boolean
    preparedData?: PreparedMatch
    hasStarted: boolean
    matchData?: Match
    reason?: string
}

export type Match = {
    players: QueuedPlayer[]
    alivePlayers: QueuedPlayer[]
}

export type QueuedPlayer = {
    bhvrSession: string
    userId: string
    location?: ConnectionInfo
    lastCheckedForMatch?: number
}

export type PreparedMatch = {
    lobbyOpen: boolean
    size: number
    hostId: string
    otherIds: string[]
}

export type AppProperties = {
    apps: {
        ipv4: string
    }
}

//#endregion

//#region logger

export type LoggerOptions = {
    console: boolean
    file: boolean
    logDir: string
    fileName: string
}

export type FileParts = {
    name: string
    extension: string
}

//#endregion

export type RequestMethod = 'CHECKOUT' | 'COPY' | 'DELETE' | 'GET' | 'HEAD' | 'LOCK' | 'MERGE' | 'MKACTIVITY' | 'MKCOL' | 'MOVE' | 'M-SEARCH' | 'NOTIFY' | 'OPTIONS' | 'PATCH' | 'POST' | 'PURGE' | 'PUT' | 'REPORT' | 'SEARCH' | 'SUBSCRIBE' | 'TRACE' | 'UNLOCK' | 'UNSUBSCRIBE'

export type RequestType = 'API' | 'CDN' | 'UL'

export type StringPart = [ string, number, 'L' | 'R' ] | string

export type ConfigValue = string | string[] | Record<string, unknown> | Record<string, unknown>[]

export type PlayerLevel = {
    levelVersion: 1
    totalXp: number
    level?: number
    prestigeLevel?: number
    currentXp?: number
    currentXpUpperBound?: number
}

export type PlayerLevelInfo = {
    level: number
    prestigeLevel: number
    currentXp: number
}

export type PackageJson = {
    version: string
}

export type GithubTagsResponse = {
    name: string
    zipball_url: string
    tarball_url: string
    commit: {
        sha: string
        url: string
    }
    node_id: string
}[]
