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
    isSteam: boolean
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

export type Side = 'A' | 'B'

export type QueueData = {
    side: Side
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

export type KilledLobby = Lobby & { killedTime: number }

export type Match = {
    players: QueuedPlayer[]
    alivePlayers: QueuedPlayer[]
}

export type QueuedPlayer = {
    bhvrSession: string
    userId: string
    side: Side
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
    failedRequests: boolean
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

export type CliCommand = {
    command: string
    usage?: string
    aliases?: string[]
    description?: string
    args: boolean
    run: (args?: string[]) => void
}

export type StartingValuesJson = {
    bloodpoints: number
    survivorRank: number
    survivorPips: number
    killerRank: number
    killerPips: number
    playerLevel: {
        currentXp: number
        level: number
        prestigeLevel: number
    }
}

export type ServerSettingsJson = {
    debugRequireHttps: boolean
    saveToFile: boolean
    sessionLength: number
    requireSteam: boolean
    whitelistEnabled: boolean
    rateLimitTime: number
    rateLimitCount: number
    loginLimitCount: number
}

export type EventsJson = {
    Halloween2017: boolean
    Winter2017: boolean
    Lunar: boolean
    Summer: boolean
    Halloween2018: boolean
    Winter2018: boolean
    Lunar2019: boolean
    Anniversary2019: boolean
}

export type GameEvent = 'Winter2017' | 'Lunar' | 'Summer' | 'Halloween2018' | 'Winter2018' | 'Lunar2019' | 'Anniversary2019' | 'None'

export type SpecialEventsContent = {
    specialEvents: {
        eventId: GameEvent
        mainEndTime: string
        postEndTime: string
        startTime: string
    }[]
}
