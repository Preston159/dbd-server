import type { Session, ConfigValue, RequestMethod, RequestType } from './types/types'
import type { Response, Request } from 'express'

import * as path from 'path'
import * as fs from 'fs'
import * as https from 'https'
import express from 'express'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import nunjucks from 'nunjucks'

import { IPV4_REGEX, API_PREFIX, setAttachment, getLastPartOfId, validateTypes, errorToCode, xpToPlayerLevel, removeToken, toArray } from './util.js'
import { getIp } from './ipaddr.js'
import { decryptSave } from './saveman.js'
import idToName from './idtoname.js'
import { log, logReq, init as initLogger, logListItem, logListItems, logBlankLine, logError } from './logger.js'
import { isCdn } from './cdn.js'
import failureLogger from './failure-logger.js'
import * as filters from './nunjucks-filters.js'
import debugResponse, { setResponse, unsetResponse } from './debug-response.js'
import * as connectionTracker from './connection-tracker.js'
import respondEmpty, { addAutoResponses } from './respond-empty.js'
import { getSteamIdFromToken } from './steam-manager.js'
import { isSessionActive, getSession, createSession, deleteSession, findSessionById, createFakeSession, getSessionsAsArray } from './session-manager.js'
import * as StartingValues from './starting-values.js'
import { DEBUG_REQUIRE_HTTPS, REQUIRE_STEAM, SAVE_TO_FILE, SESSION_LENGTH, WHITELIST_ENABLED } from './settings.js'
import { checkVersion } from './version-checker.js'

//#region copyright notice
console.log(
    'DbD Dev Server Copyright (C) 2020 Preston Petrie\n' +
    'This program comes with ABSOLUTELY NO WARRANTY; for details see LICENSE file.\n' +
    'This program is free software, and you are welcome to redistribute it\n' +
    'under certain conditions; see LICENSE file for details.\n\n'
    )
//#endregion

checkVersion()

const app = express()

app.disable('trust proxy')
app.disable('etag')

// when this is true, all incoming connection requests are immediately closed
// used for shutting down the server gracefully
let discardRequests = false

// set up headers and log the request
app.use((req, res, next) => {
    if(discardRequests) {
        res.set('Connection', 'close')
        res.removeHeader('Keep-Alive')
        res.status(503).end()
        return
    }
    res.set('X-Robots-Tag', 'noindex')
    if(!IPV4_REGEX.test(req.ip)) {
        res.status(400).end()
        log(`throwing out IPv6 request (${req.ip} => ${req.method} ${removeToken(req.originalUrl)})`)
        return
    }
    let type: RequestType = 'UL'
    if(req.originalUrl.startsWith(API_PREFIX)) {
        type = 'API'
    } else if(isCdn(req.originalUrl)) {
        type = 'CDN'
    }
    logReq(req, type)
    if(type === 'CDN') {
        res.status(204).end()
        return
    }
    next()
})
app.use(bodyParser.text({ type: '*/*' }))
app.use(cookieParser())

app.use(respondEmpty)
addAutoResponses([ 'GET', '/favicon.ico', 404 ], [ 'GET', /^\/api\/v1\/gameon/, 404 ])

const httpServer = app.listen(80, '0.0.0.0')
const httpsServer = https.createServer({
    key: fs.readFileSync(path.join('private', 'privatekey.key')),
    cert: fs.readFileSync(path.join('private', 'cert.crt')),
}, app)
httpsServer.listen(443, '0.0.0.0')

connectionTracker.trackConnectionsOn(httpServer, httpsServer)

const njkEnv = nunjucks.configure(['src/templates/'], {
    autoescape: false,
    express: app,
    noCache: true,
}) as { addFilter: (name: string, filter: Function) => void } // eslint-disable-line @typescript-eslint/ban-types
njkEnv.addFilter('idtoname', idToName)
njkEnv.addFilter('makenb', filters.makeSpacesNonBreaking)
njkEnv.addFilter('newlinetobr', filters.newlineToBr)
njkEnv.addFilter('td', filters.td)
njkEnv.addFilter('invitemtorow', filters.invItemToRow)
njkEnv.addFilter('spanselectall', filters.spanSelectAll)

const ipAddr = getIp()

const DEBUG_FILE = path.join('.', 'DEBUG')
const DEBUG = fs.existsSync(DEBUG_FILE)
const VERSIONS_STRING = '{"availableVersions":{"2.6.0.100094":"2.6.0.100094-1557154926","2.6.0.84905":"2.6.0.84905-1554217487","2.6.0.98545":"2.6.0.98545-1556291021","2.6.0.98763":"2.6.0.98763-1556301195","2.7.0.1":"2.7.0.1-1557939464","3.0.0.13":"3.0.0.13-1561474922","3.0.0.16":"3.0.0.16-1562079672","3.0.0.4":"3.0.0.4-1560778720","m_3.0.0.2":"m_3.0.0.2-1560873223"}}'

// load the config info sent to the client
const CONFIG = JSON.parse(fs.readFileSync(path.join('.', 'config.json')).toString()) as Record<string, ConfigValue>
// convert the config into the format the game expects
const CONFIG_STRING = (() => {
    const arr: { keyName: string; value: ConfigValue }[] = []
    for(const key of Object.keys(CONFIG)) {
        arr.push({
            keyName: key,
            value: CONFIG[key],
        })
    }
    return JSON.stringify(arr)
})()
// load catalog.json file
const CATALOG = fs.readFileSync(path.join('.', 'catalog.json'))

const WHITELIST_FILE = path.join('.', 'whitelist.txt')
let WHITELIST: string[] = WHITELIST_ENABLED && fs.existsSync(WHITELIST_FILE) ?
        fs.readFileSync(WHITELIST_FILE).toString().split(/\r?\n/g).filter(v => !/^#.*|^$/.test(v)) // split on newlines and remove comments to isolate IP addresses
        : []
console.log('Whitelist is ' + (WHITELIST_ENABLED ? 'enabled' : 'disabled'))
if(WHITELIST_ENABLED) {
    console.log('Whitelisted IPs')
    console.log(WHITELIST)
}
// returns true if the given IP is whitelisted OR if whitelist is disabled
const checkWhitelist = (ip: string) => {
    return !WHITELIST_ENABLED || WHITELIST.includes(ip)
}

const setJson = (res: Response<any>) => res.set('Content-Type', 'application/json')
const setBinary = (res: Response<any>) => res.set('Content-Type', 'binary/octet-stream')
const sendJson = (res: Response<any>, obj: object) => setJson(res).send(JSON.stringify(obj)) // eslint-disable-line @typescript-eslint/ban-types
const sendBinary = (res: Response<any>, data: string | Buffer) => setBinary(res).send(data)
const redirectTo = (res: Response<any>, url: string) => res.status(303).location(url).end()
const setText = (res: Response<any>) => res.set('Content-Type', 'text/plain')
const sendText = (res: Response<any>, text: string) => setText(res).send(text)
const sendTextLines = (res: Response<any>, lines: string[]) => sendText(res, lines.join('\n') + '\n')

initLogger()

if(DEBUG) {
    log('Debug mode is enabled. Delete the DEBUG file and restart to disable.')
    const DEBUG_IPS = (() => {
        const fileContents = fs.readFileSync(DEBUG_FILE)
        const ipRegex = /^(?<ip>(?:\d{1,3}\.){3}\d{1,3})$/gm
        const out: string[] = []
        if(fileContents.length > 0) {
            for(const match of fileContents.toString().match(ipRegex)) {
                out.push(match)
            }
        }
        return out as readonly string[]
    })()
    log('Debug options accessible by the following IP addresses:')
    if(DEBUG_IPS.length === 0) {
        logListItem('any')
    } else {
        logListItems(DEBUG_IPS)
    }
    logBlankLine()
    const checkRequest = (req: Request<any>, res: Response<any>) => {
        if(app.get('trust proxy')) {
            log('WARNING: VALIDATING DEBUG REQUEST WHEN PROXIES ARE TRUSTED')
        }
        if(DEBUG_REQUIRE_HTTPS && req.protocol !== 'https') {
            redirectTo(res, `https://${req.hostname}${req.originalUrl}`)
            return false
        }
        if(DEBUG_IPS.length === 0 || DEBUG_IPS.includes(req.ip)) {
            return true
        }
        res.status(403).end()
        return false
    }

    app.use(debugResponse)
    enum DebugCommand { LIST, PRINT_ACTIVE_SESSIONS, PRINT_OPEN_LOBBIES, CREATE_FAKE_SESSION, CLEAR_FAKE_SESSIONS, RELOAD_WHITELIST }
    enum QueryType { USER_ID }
    const commands = toArray(DebugCommand) as readonly string[]
    app.get('/debug', (req, res) => {
        if(!checkRequest(req, res)) {
            return
        }
        res.render('debug/debug.html', {
            actions: commands,
        })
    })
    app.get('/exec', (req, res) => {
        if(!checkRequest(req, res)) {
            return
        }
        if(typeof req.query.command !== 'string') {
            res.status(400).end()
            return
        }
        const command = DebugCommand[req.query.command] as DebugCommand
        const output: string[] = []
        switch(command) {
            case undefined:
                res.status(400).send('Invalid command')
                return
            case DebugCommand.LIST:
                res.send(commands)
                return
            case DebugCommand.PRINT_ACTIVE_SESSIONS:
                res.render('debug/sessions.html', {
                    sessions: getSessionsAsArray(),
                })
                return
            case DebugCommand.CREATE_FAKE_SESSION:
                const session = createFakeSession()
                sendJson(res, session)
                return
            case DebugCommand.CLEAR_FAKE_SESSIONS:
                createFakeSession()
                output.push('Done')
                break
            case DebugCommand.RELOAD_WHITELIST:
                WHITELIST = fs.readFileSync(WHITELIST_FILE).toString().split(/\r?\n/g).filter(v => !/^#.*|^$/.test(v))
                output.push('Done')
                output.push('Whitelisted IPs:')
                output.push(...WHITELIST)
                break
            default:
                res.status(500).send('Missing case')
                return
        }
        if(res.headersSent) {
            return
        }
        if(output.length > 0) {
            res.send(output.join('<br />'))
        } else {
            res.status(204).end()
        }
    })
    app.get('/query', (req, res) => {
        if(!checkRequest(req, res)) {
            return
        }
        const { type, id } = req.query
        if(typeof type !== 'string' || typeof id !== 'string') {
            res.status(400).end()
            return
        }
        const queryType = QueryType[type] as QueryType
        switch(queryType) {
            case undefined:
                res.status(400).send('Invalid query type')
                return
            case QueryType.USER_ID:
                sendJson(res, findSessionById(id))
                return
            default:
                res.status(500).send('Missing case')
                return
        }
    })
    app.post('/response/:postCommand/:method/:path*', (req, res) => {
        const command = req.params.postCommand
        switch(command) {
            case 'SET': {
                const contentType = req.get('Content-Type') || 'text/plain'
                const body = req.body.toString() as string
                const method = req.params.method as RequestMethod
                const reqPath = '/' + req.params.path
                setResponse({
                    method,
                    path: reqPath,
                    response: {
                        contentType,
                        data: body,
                    },
                })
                res.status(204).end()
                break
            }
            case 'UNSET': {
                const method = req.params.method as RequestMethod
                const reqPath = '/' + req.params.path
                unsetResponse(reqPath, method)
                res.status(204).end()
                break
            }
            default:
                res.status(400).end()
                break
        }
    })
}

//#region middleware

// send 404 if whitelist validation fails
app.use((req, res, next) => {
    if(checkWhitelist(req.ip)) {
        next()
    } else {
        res.status(404).end()
    }
})

//#endregion

//#region robots

app.get(/\/robots.txt$/i, (req, res) => {
    sendTextLines(res, [
        'User-agent: *',
        'Disallow: /',
    ])
})

//#endregion

//#region userland

app.get('/gameinfo/catalog.json', (req, res) => {
    res.send(CATALOG)
})

app.get('/hosts', (req, res) => {
    res.render('hosts.html', {
        ip: ipAddr,
    })
})

app.get('/', (req, res) => {
    res.render('index.html')
})

const checkForUserAndErr: (userId: any, res: Response<any>) => Session = (userId, res) => {
    if(typeof userId !== 'string') {
        res.status(400).end()
        return null
    }
    const session = findSessionById(userId)
    if(!session) {
        res.status(404).render('error.html', {
            error: 'A user with that ID could not be found.',
            linktomain: true,
        })
        return null
    }
    return session
}

app.get('/user/:userId', (req, res) => {
    const session = checkForUserAndErr(req.params.userId, res)
    if(!session) {
        return
    }
    const profile = session.profile ? decryptSave(session.profile) : null
    // let name: string
    if(profile && profile.characterData) {
        profile.characterData.sort((a, b) => a.key - b.key)
        // name = Buffer.from(profile.playerUId, 'hex').toString('utf16le')
    }
    res.render('user.html', {
        session,
        profile,
        // name,
    })
})

app.get('/user/:userId/saveData.bin', (req, res) => {
    const session = checkForUserAndErr(req.params.userId, res)
    if(!session) {
        return
    }
    setAttachment(res, getLastPartOfId(session.clientIds.userId) + '.bin')
    sendBinary(res, session.profile ? session.profile : '')
})

app.get('/user/:userId/saveData.json', (req, res) => {
    const session = checkForUserAndErr(req.params.userId, res)
    if(!session) {
        return
    }
    setAttachment(res, getLastPartOfId(session.clientIds.userId) + '.json')
    sendJson(res, session.profile ? decryptSave(session.profile) : {})
})

app.get('/match/:matchId', (req, res) => {
    res.status(404).end()
})

//#endregion

//#region bhvrapi

app.get('/api/v1/version', (req, res) => {
    setJson(res).send(VERSIONS_STRING)
})

app.get('/api/v1/utils/contentVersion/version', (req, res) => {
    setJson(res).send(VERSIONS_STRING)
})

app.get('/api/v1/healthcheck', (req, res) => {
    setJson(res).send('{"health":"Alive"}')
})

app.post('/api/v1/me/logout', (req, res) => {
    if(deleteSession(req.cookies.bhvrSession as string)) {
        setJson(res).status(204).end()
    } else {
        setJson(res).status(404).end()
    }
})

app.post('/api/v1/auth/login/guest', (req, res) => {
    if(REQUIRE_STEAM) {
        res.status(404).end()
        return
    }
    const now = Math.floor(Date.now() / 1000)
    const session = createSession(now, SESSION_LENGTH)
    const response = JSON.stringify({
        triggerResults: {
            success: [ null ],
            error: [],
        },
        tokenId: session.clientIds.tokenId,
        generated: now,
        expire: now + SESSION_LENGTH,
        userId: session.clientIds.userId,
        guestToken: session.clientIds.guestToken,
    })
    res.cookie('bhvrSession', session.bhvrSession, { maxAge: SESSION_LENGTH * 1000, httpOnly: true })
    res.cookie('GUEST_SESSION', session.guestSession, { maxAge: SESSION_LENGTH * 1000, httpOnly: true })
    setJson(res).send(response)
})

app.post('/api/v1/auth/provider/:provider/login', (req, res) => {
    if(req.params.provider === 'steam' && typeof req.query.token === 'string') {
        const providerId = getSteamIdFromToken(req.query.token)
        const provider = {
            providerName: 'steam',
            providerId,
        }
        const now = Math.floor(Date.now() / 1000)
        const session = createSession(now, SESSION_LENGTH, true, providerId)
        res.cookie('bhvrSession', session.bhvrSession, { maxAge: SESSION_LENGTH * 1000, httpOnly: true })
        sendJson(res, {
            triggerResults: {
                error: [],
                success: [ null ],
            },
            id: session.clientIds.userId, // USER ID
            creationDate: now,
            provider,
            providers: [ provider ],
            friends: [],
            tokenId: session.clientIds.tokenId, // TOKEN ID
            generated: now,
            expire: now + SESSION_LENGTH,
            userId: session.clientIds.userId, // USER ID
            token: session.clientIds.tokenId, // TOKEN ID
        })
        return
    } else {
        sendJson(res, {
            type: 'Exception',
            message: 'Unable to login with provider.',
        })
    }
})

app.get('/api/v1/timetravel', (req, res) => {
    setJson(res).send('{"date":"now","isTimeTraveler":false,"isTemp":false,"isTicking":false}')
})

app.post('/api/v1/timetravel', (req, res) => {
    setJson(res).send('{}')
})

app.get('/api/v1/config', (req, res) => {
    setJson(res).send(CONFIG_STRING)
})

app.get('/api/v1/inventories', (req, res) => {
    const bhvrSession = req.cookies.bhvrSession as string
    if(!isSessionActive(bhvrSession)) {
        res.status(404).send(JSON.stringify({
            code: 404,
            message: 'Inventory not found',
            data: {},
        }))
        return
    }
    const session = getSession(bhvrSession)
    setJson(res).send(JSON.stringify({
        code: 200,
        message: 'OK',
        data: {
            playerId: session.clientIds.userId,
            inventory: [],
        },
    }))
})

app.get('/specialEvents/specialEventsContent.json', (req, res) => {
    setBinary(res).status(204).end()
})

app.get('/bonusPointEvents/bonusPointEventsContent.json', (req, res) => {
    setBinary(res).status(204).end()
})

app.get('/schedule/contentSchedule.json', (req, res) => {
    setBinary(res).status(204).end()
})

app.get('/news/newsContent.json', (req, res) => {
    setBinary(res).status(204).end()
})

app.get('/api/v1/players/me/states/FullProfile/binary', (req, res) => {
    const bhvrSession = req.cookies.bhvrSession as string
    let profileData: string
    if(!isSessionActive(bhvrSession)) {
        profileData = ''
    } else {
        const session = getSession(bhvrSession)
        profileData = session.profile || ''
    }
    setBinary(res).status(200).send(profileData)
})

app.post('/api/v1/players/me/states/binary', (req, res) => {
    if(!validateTypes([ req.query.version, 'string' ])) {
        res.status(400).end()
        return
    }
    const bhvrSession = req.cookies.bhvrSession as string
    if(!isSessionActive(bhvrSession)) {
        res.status(404).end()
        return
    }
    const version = parseInt(req.query.version as string, 10)
    const session = getSession(bhvrSession)
    session.profile = req.body as string
        session.profileVersion = version
        log(`pushed save data for ${session.clientIds.userId}`)
        writeSaveToFile(session, version)
        sendJson(res, {
            version: version + 1,
            stateName: 'FullProfile',
            schemaVersion: 0,
            playerId: session.clientIds.userId,
        })
})

app.post('/api/v1/extensions/shrine/getAvailable', (req, res) => {
    res.status(404).send('{"type":"DataNotFoundException","localizationCode":"notFound","message":"Unable to find requested data in shrine market catalog"}')
})

app.get('/api/v1/wallet/currencies/BonusBloodpoints', (req, res) => {
    const bhvrSession = req.cookies.bhvrSession as string
    if(!isSessionActive(bhvrSession)) {
        res.status(404).end()
        return
    }
    const session = getSession(bhvrSession)
    sendJson(res, {
        userId: session.clientIds.userId,
        balance: StartingValues.bloodpoints,
        currency: 'BonusBloodpoints',
    })
})

app.post('/api/v1/wallet/withdraw', (req, res) => {
    const { currency, amount } = JSON.parse(req.body) as { currency: string; amount: number }
    if(!validateTypes([ currency, 'string' ], [ amount, 'number' ])) {
        res.status(400).end()
        return
    }
    sendJson(res, {
        status: 200,
        message: 'OK',
        currency,
        balance: amount,
    })
})

app.post('/api/v1/extensions/wallet/needMigration', (req, res) => {
    try {
        setJson(res).send(JSON.parse(req.body).data)
    } catch {
        res.status(500).end()
    }
})

app.post('/api/v1/extensions/wallet/migrateCurrencies', (req, res) => {
    try {
        const list = JSON.parse(req.body).data.list as { balance: number; currency: string }[]
        const response = {
            migrationStatus: true,
            list: [],
        }
        for(const c of list) {
            response.list.push({ migrated: true, currency: c.currency, reason: 'NONE' })
        }
        sendJson(res, response)
    } catch {
        res.status(500).end()
    }
})

app.post('/api/v1/extensions/wallet/getLocalizedCurrenciesAfterLogin', (req, res) => {
    setJson(res).send('{"list":[{"balance":0,"currency":"Dust"},{"balance":0,"currency":"Bloodpoints"},{"balance":0,"currency":"BonusBloodpoints"},{"balance":0,"currency":"HardCurrency"},{"balance":0,"currency":"testCurrency"},{"balance":0,"currency":"Shards"},{"balance":0,"currency":"Cells"},{"balance":0,"currency":"USCents"},{"balance":0,"currency":"Halloween2018Coins"},{"balance":0,"currency":"HalloweenCoins"},{"balance":0,"currency":"LunarCoins"},{"balance":0,"currency":"LunarNewYearCoins"},{"balance":0,"currency":"HalloweenEventCurrency"}]}')
})

app.get('/api/v1/consent', (req, res) => {
    const bhvrSession = req.cookies.bhvrSession as string
    if(!isSessionActive(bhvrSession)) {
        res.status(404).end()
        return
    }
    const session = getSession(bhvrSession)
    setJson(res).send(`{"userId":"${session.clientIds.userId}","consentList":[]}`)
})

app.get('/api/v1/messages/list', (req, res) => {
    setJson(res).send('{"messages":[]}')
})

app.get('/api/v1/ranks/pips', (req, res) => {
    sendJson(res, {
        killerPips: StartingValues.pips.killer,
        survivorPips: StartingValues.pips.survivor,
        highestAchievedSurvivorPips: 85,
        highestAchievedKillerPips: 85,
    })
})

app.post('/api/v1/ranks/pips', (req, res) => {
    setJson(res).send(req.body)
})

app.post('/api/v1/gameDataAnalytics/batch', (req, res) => {
    setJson(res).status(500).send('{"type":"TypeError","message":"Sorry unexpected error happened.","localizationCode":"unexpectedError"}')
})

app.post('/api/v1/gameLogs/batch', (req, res) => {
    setJson(res).status(500).send('{"type":"TypeError","message":"Sorry unexpected error happened.","localizationCode":"unexpectedError"}')
})

app.get('/api/v1/players/ban/status', (req, res) => {
    sendJson(res, {
        isBanned: false,
    })
})

app.get('/api/v1/archives/stories/get/activeNode', (req, res) => {
    setJson(res).send('{"activeNode":[]}')
})

app.get('/api/v1/archives/stories/get/storyIds', (req, res) => {
    setJson(res).send('{"openStories":["Tome03","Tome02","Tome01"],"storiesStatus":[{"id":"Tome03","levelStatus":[{"status":"open","hasUnseenContent":true},{"status":"locked"},{"status":"locked"},{"status":"locked"},{"status":"locked"}]},{"id":"Tome02","levelStatus":[{"status":"open","hasUnseenContent":true},{"status":"locked"},{"status":"locked"},{"status":"locked"}]},{"id":"Tome01","levelStatus":[{"status":"open","hasUnseenContent":true},{"status":"locked"},{"status":"locked"},{"status":"locked"}]}]}')
})

app.get('/api/v1/config/GAME_ON_UI_ENABLE_PLATFORM/raw', (req, res) => {
    setJson(res).end()
})

app.post('/api/v1/extensions/playerLevels/getPlayerLevel', (req, res) => {
    sendJson(res, StartingValues.playerLevelObject)
})

app.post('/api/v1/extensions/playerLevels/earnPlayerXp', (req, res) => {
    const bhvrSession = req.cookies.bhvrSession as string
    if(!isSessionActive(bhvrSession)) {
        res.status(404).end()
        return
    }
    const xpEarned = (JSON.parse(req.body) as { data: { matchTime: number } }).data.matchTime
    const session = getSession(bhvrSession)
    session.totalXp += xpEarned
    sendJson(res, xpToPlayerLevel(session.totalXp))
})

app.post('/api/v1/match', (req, res) => {
    setJson(res).status(400).send(JSON.stringify({
        type: 'BadRequestException',
        localizationCode: 'requestInvalidSyntax',
        message: '',
    }))
})

app.get('/api/v1/config/:key', (req, res) => {
    const value = CONFIG[req.params.key]
    // the game expects string values to not be surrounded in quotes, so we must check rather than blindly passing to sendJson()
    if(typeof value === 'string') {
        setJson(res).send(value)
    } else {
        sendJson(res, value)
    }
})

app.post('/api/v1/queue', (req, res) => {
    res.status(404).end()
})

app.post('/api/v1/queue/cancel', (req, res) => {
    res.status(404).end()
})

app.post('/api/v1/match/:matchId/register', (req, res) => {
    res.status(404).end()
})

app.get('/api/v1/match/:matchId', (req, res) => {
    res.status(404).end()
})

app.put('/api/v1/match/:matchId/:reason', (req, res) => {
    res.status(404).end()
})

app.delete('/api/v1/match/:matchId/user/:userId', (req, res) => {
    res.status(404).end()
})

app.post('/api/v1/extensions/ownedProducts/reportOwnedProducts', (req, res) => {
    setJson(res).send('Ok')
})

app.post('/api/v1/extensions/store/steamGetPendingTransactions', (req, res) => {
    setJson(res).status(204).end()
})

app.post('/api/v1/extensions/store/getAvailableBundles', (req, res) => {
    setJson(res).status(204).end()
})

app.get('/banners/featuredPageContent.json', (req, res) => {
    setJson(res).status(204).end()
})

//#endregion

// register and set up the failure logger middleware
// this must be registered after all response-yielding methods
app.use(failureLogger(true))

//#region misc functions

function writeSaveToFile(session: Session, version: number) {
    if(!SAVE_TO_FILE) {
        return
    }
    fs.writeFileSync(path.join('saves', `save_${session.clientIds.userId}_${version}`), session.profile)
}

//#endregion

//#region shutdown

function queueForcedShutdown() {
    setTimeout(() => process.exit(-1), 10_000)
}

function initShutdown() {
    console.log()
    log('Initiating shutdown')
    discardRequests = true
    connectionTracker.closeConnections()
    .then(() => Promise.all([
        new Promise<void>((resolve, reject) => {
            httpServer.close((err) => {
                if(err) {
                    reject(err)
                }
                resolve()
            })
        }),
        new Promise<void>((resolve, reject) => {
            httpsServer.close((err) => {
                if(err) {
                    reject(err)
                }
                resolve()
            })
        }),
    ]))
    .then(() => {
        process.exit(0)
    })
    .catch((err: Error) => {
        logError(err)
        process.exit(errorToCode(err) || 1)
    })
    queueForcedShutdown()
}

process.on('SIGINT', initShutdown)

//#endregion
