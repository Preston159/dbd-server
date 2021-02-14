import * as crypto from 'crypto'
import { Response } from 'express'

import type { StringPart, PlayerLevel, PlayerLevelInfo, CliCommand } from './types/types'

export const LOGIN_TOKEN_REGEX = /[?&]token=[0-9a-f]+/i
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
export const IPV4_REGEX = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/
export const IPV4_REGEX_M = new RegExp(IPV4_REGEX, 'm')
export const PRIVATE_IPV4_REGEX = /(?:^0\.|^10\.|^100\.|^192\.168)/
export const CDN_REGEX = /^\/(?:specialEvents|bonusPointEvents|schedule|news)\/(?<file>.+)$/
export const API_PREFIX = '/api/v1'

/**
 * Checks if a given IP is a valid IPv4 address
 * @param ip the IP address to check
 */
export function isIpv4(ip: string): boolean {
    return IPV4_REGEX.test(ip)
}

/**
 * Checks if a given IPv4 address is in the public address space
 * @param ip the IP address to check
 */
export function isPublicIpv4(ip: string): boolean {
    return isIpv4(ip) && !PRIVATE_IPV4_REGEX.test(ip)
}

/**
 * Pads a number with leading zeroes to a given length
 * @param n         the number to pad
 * @param length    the required length
 */
export function padNumber(n: number, length: number): string {
    const str = n.toString()
    return str.length >= length ? str : '0'.repeat(length - str.length) + str
}

/**
 * Converts a number to a hexadecimal string and pads it with a leading zero if <= 0xf
 * @param n the number
 */
export function padHexByte(n: number): string {
    const str = n.toString(16)
    return n <= 0xf ? '0' + str : str
}

/**
 * Pads a string with spaces to a specified length
 * @param str           the string to pad
 * @param length        the required length
 * @param shorten       if true, the string will be shortened if it is longer than length
 * @param alignRight    if true, align to the right by adding spaces to the left rather than to the right
 */
export function padString(str: string, length: number | number[], shorten = false, alignRight = false): string {
    let len: number
    if(Array.isArray(length)) {
        for(const l of length) {
            len = l
            if(str.length <= len) {
                break
            }
        }
    } else {
        len = length
    }
    if(shorten) {
        str = str.substr(0, len)
    }
    return str.length >= length ? str :
        alignRight ? ' '.repeat(len - str.length) + str : str + ' '.repeat(len - str.length)
}

/**
 * Pads a request method to 6 characters in length. Used for logging.
 * @param method the request method
 */
export function padMethod(method: string): string {
    return(padString(method, 6, true))
}

/**
 * Builds a string using the given parts.
 * @param parts for each part: if a tuple, pad the given string to the given length on the given side, shortening if necessary; if a string, includes the string unmodified
 */
export function formatString(parts: StringPart[]): string {
    let out = ''
    for(const part of parts) {
        if(typeof part === 'string') {
            out += part
            continue
        }
        if(part[1] < 0) {
            out += part[0]
            continue
        }
        out += padString(part[0], part[1], true, part[2] === 'R')
    }
    return out
}

/**
 * Sets the Content-Disposition header of the given response to signify the file should be downloaded rather than displayed in the browser.
 * @param res       the response to modify
 * @param filename  if provided, tells the browser what to name the downloaded file
 */
export function setAttachment(res: Response<any>, filename?: string): void {
    res.set('Content-Disposition', 'attachment' + (filename ? `; filename="${filename}"` : ''))
}

/**
 * Gets the last part of a UUID string.
 * @param id the UUID
 */
export function getLastPartOfId(id: string): string {
    if(!UUID_REGEX.test(id)) {
        throw new Error('Invalid UUID provided.')
    }
    return id.substr(id.length - 12)
}

/**
 * Validates the types of the values given.
 * @param args for each: a tuple containing the value to test and its type as a string
 */
export function validateTypes(...args: [ any, 'array' | 'boolean' | 'number' | 'object' | 'string' | 'undefined' | 'null' ][]): boolean {
    for(const [ variable, type ] of args) {
        switch(type) {
        case 'undefined':
            return variable === undefined
        case 'null':
            return variable === null
        case 'array':
            return Array.isArray(variable)
        default:
            return typeof variable === type
        }
    }
}

/**
 * Gets the XP cap at a given player level.
 * @param level the level
 */
export function getPlayerLevelCap(level: number): number {
    if(level === 1) {
        return 720
    }
    if(level === 2) {
        return 900
    }
    if(level <= 5) {
        return 1200
    }
    if(level <= 13) {
        return 2100
    }
    if(level <= 23) {
        return 2700
    }
    if(level <= 33) {
        return 3300
    }
    if(level <= 48) {
        return 3750
    }
    return 4200
}

/**
 * Converts a total XP amount to a player level object.
 * @param xp the total XP
 */
export function xpToPlayerLevel(xp: number): PlayerLevel {
    const totalXp = xp
    let xpLeft = xp
    let level = 1
    let devotion = 0
    for(let cap = getPlayerLevelCap(level); xpLeft >= cap; cap = getPlayerLevelCap(level)) {
        xpLeft -= cap
        if(++level === 100) {
            level = 1
            devotion++
        }
    }
    return {
        levelVersion: 1,
        totalXp,
        currentXp: xpLeft,
        currentXpUpperBound: getPlayerLevelCap(level),
        level,
        prestigeLevel: devotion,
    }
}

/**
 * Converts player level info into the equivalent total XP.
 * @param level the level info containing the level number, devotion, and current XP
 */
export function playerLevelToTotalXp(level: PlayerLevelInfo): number {
    let totalXp = level.prestigeLevel * 352_470
    for(let pl = level.level - 1; pl >= 1; pl--) {
        totalXp += getPlayerLevelCap(pl)
    }
    totalXp += level.currentXp
    return totalXp
}

/**
 * Gets the number of pips at a given rank.
 */
export function pipsInRank(rank: number): number {
    // 19-20
    if(rank >= 19) {
        return 3
    }
    // 13-18
    if(rank >= 13) {
        return 4
    }
    // 2-12
    if(rank >= 2) {
        return 5
    }
    // 1 or invalid
    return 0
}

/**
 * Converts a rank to the equivalent total number of pips.
 */
export function rankToPips(rank: number): number {
    let pips = 0
    for(let r = 20; r > rank; r--) {
        pips += pipsInRank(r)
    }
    return pips
}

/**
 * Replaces the IP address in a SessionSettings.
 * @param sessionSettings   the SessionSettings
 * @param newIp             the new IP address
 */
export function replaceIpInSessionSettings(sessionSettings: string, newIp: string): string {
    const origSettingsBuffer = Buffer.from(sessionSettings, 'base64')
    const pipes: number[] = []
    for(let i = origSettingsBuffer.length - 1;i >= 0;i--) {
        if(origSettingsBuffer[i] === 124) {
            pipes.push(i)
            if(pipes.length === 2) {
                break
            }
        }
    }
    const origIp = origSettingsBuffer.slice(pipes[1] + 1, pipes[0]).toString()
    const newSettingsBuffer = Buffer.alloc(origSettingsBuffer.length + (newIp.length - origIp.length))
    const replacementIpString = origSettingsBuffer.slice(pipes[1] + 1).toString().replace(origIp, newIp)
    for(let i = 0;i <= pipes[1];i++) {
        newSettingsBuffer[i] = origSettingsBuffer[i]
    }
    for(let i = 0;i < replacementIpString.length;i++) {
        newSettingsBuffer[i + pipes[1] + 1] = replacementIpString.charCodeAt(i)
    }
    return newSettingsBuffer.toString('base64')
}

/**
 * Removes provider login token, if any, from the given URL.<br>
 * This is useful for logging, as tokens aren't used and shouldn't be saved. They could theoretically be used to impersonate a user.
 * @param url the URL to modify
 * @returns a modified URL which doesn't contain the token
 */
export function removeToken(url: string): string {
    return url.replace(LOGIN_TOKEN_REGEX, '')
}

/**
 * Generates a random sequence of characters of the given length using only characters which can appear in a bhvrSession part.
 * @param len the length of the string to return
 */
export function genFriendlyRandomString(len: number): string {
    const pool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
    let out = ''
    for(let i = 0;i < len;i++) {
        out += pool.charAt(Math.floor(Math.random() * pool.length))
    }
    return out
}

/**
 * Generates a random sequence of hexadecimal digits.
 * @param count the number of digits to return
 * @param max   the largest digit to use
 */
function getRandomHexDigits(count = 1, max = 0xf): string {
    const pool = '0123456789abcdef'.substr(0, max + 1)
    let out = ''
    for(let i = 0;i < count;i++) {
        out += pool.charAt(Math.floor(Math.random() * pool.length))
    }
    return out
}

/**
 * Generates a hash of the given length for the given string.<br>
 * Useful for ensuring a player's UUID is always the same.
 * @param id            the string to hash
 * @param outputLength  the requested length
 */
function hashId(id: string, outputLength: number): string {
    const md5 = crypto.createHash('md5').update(id).digest('hex')
    return md5.substr(32 - outputLength, outputLength)
}

/**
 * Generates a UUID for a player.
 * @param provider      if true, the last part of the UUID will start with F
 * @param providerId    the player's ID obtained from the provider
 */
export function genUUID(provider = false, providerId = ''): string {
    const uuidBase = '00000000-0000-0000-0000-'
    if(provider) {
        return uuidBase + 'f' + hashId(providerId, 11)
    } else {
        return uuidBase + getRandomHexDigits(1, 0xe) + getRandomHexDigits(11)
    }
}

//#region date-time

const getYearString = (when: Date) => padNumber(when.getFullYear(), 4)
const getMonthString = (when: Date) => padNumber(when.getMonth() + 1, 2)
const getDayString = (when: Date) => padNumber(when.getDate(), 2)
const getHourString = (when: Date) => padNumber(when.getHours(), 2)
const getMinuteString = (when: Date) => padNumber(when.getMinutes(), 2)
const getSecondString = (when: Date) => padNumber(when.getSeconds(), 2)
const getMillisString = (when: Date) => padNumber(when.getMilliseconds(), 3)

/**
 * Returns a date string
 * @param forFileName if true, the returned string is filename-friendly
 */
export function getDateString(forFileName = false): string {
    const now = new Date()
    if(forFileName) {
        return getYearString(now) + getMonthString(now) + getDayString(now) + getHourString(now) + getMinuteString(now)
    }
    return getYearString(now) + '-' + getMonthString(now) + '-' + getDayString(now) + ' ' + getHourString(now) + ':' + getMinuteString(now) + ':' + getSecondString(now) + '.' + getMillisString(now)
}

//#endregion

//#region errors

/**
 * Attempts to return the filename, line number, and column number of where the given Error occurred
 * @return a tuple in the format [ filename: string, line: number, column: number]
 */
export function getErrorLocation(error: Error): [ string | undefined, number, number ] {
    try {
        const firstStackLine = error.stack.split('\n', 3)[1]
        const info = firstStackLine.split(':')
        return [ info[0], parseInt(info[1], 10), parseInt(info[2], 10) ]
    } catch {
        return [ undefined, 0, 0 ]
    }
}

/**
 * Converts an Error object to an exit code
 * @param error the Error object
 * @param mask  an optional bitmask which defaults to 0xffff; the number is bitwise-and'ed with this mask prior to being returned
 */
export function errorToCode(error: Error, mask = 0xffff): number {
    const location = getErrorLocation(error)
    /* eslint-disable no-bitwise */
    const line = location[1] & 0xff
    const column = location[2] & 0xff
    return ((column << 8) | line) & mask
    /* eslint-enable no-bitwise */
}

//#endregion

//#region array utils

/**
 * Converts an array-like data structure (e.g. an enum) to an array.
 * @param arrayLike the data structure to convert
 */
export function toArray<V>(arrayLike: Record<string, V>): V[] {
    const out: V[] = []
    for(let i = 0;i < Number.MAX_SAFE_INTEGER;i++) {
        const el = arrayLike[i]
        if(!el) {
            break
        }
        out.push(el)
    }
    return out
}

/**
 * Converts a map to an array. The returned array will contain only the map's values, not its keys.
 * @param map the map to convert
 */
export function mapToArray<V>(map: Map<any, V>): readonly V[] {
    const out: V[] = []
    for(const key of map.keys()) {
        out.push(map.get(key))
    }
    return out
}

//#endregion

/**
 * Compares two strings and finds where they differ
 * @param a string A
 * @param b string B
 * @returns the index of the first difference, or -1 if the strings are the same
 */
export function stringDiff(a: string, b: string): number {
    if(a === b) {
        return -1
    }
    const max = Math.max(a.length, b.length)
    let i = 0
    for(;i < max;i++) {
        if(a.charAt(i) !== b.charAt(i)) {
            break
        }
    }
    return i
}

/**
 * Checks whether the provided input matches the provided command
 * @param cmd   the command
 * @param input the input
 * @returns a tuple [ boolean, string ] where the boolean is whether there was a match, and the string is the matched text
 */
export function checkCmdMatch(cmd: CliCommand, input: string): [ boolean, string ] {
    if(!cmd.args && input === cmd.command) {
        return [ true, cmd.command ]
    }
    if(cmd.args && input.startsWith(cmd.command)) {
        return [ true, cmd.command ]
    }
    if(cmd.aliases) {
        for(const alias of cmd.aliases) {
            if(!cmd.args && input === alias) {
                return [ true, alias ]
            }
            if(cmd.args && input.startsWith(alias)) {
                return [ true, alias ]
            }
        }
    }
    return [ false, null ]
}

export function getGameDateString(date: Date): string {
    const year = date.getUTCFullYear().toString()
    const month = padNumber(date.getUTCMonth() + 1, 2)
    const day = padNumber(date.getUTCDate(), 2)
    return `${year}-${month}-${day}T00:00:00`
}
