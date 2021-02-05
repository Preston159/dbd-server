import type { LoggerOptions, FileParts, RequestType } from './types/types'

import type { Request } from 'express'
import * as fs from 'fs'
import type { WriteStream } from 'fs'
import * as path from 'path'

import { getDateString, API_PREFIX, formatString, padHexByte, padString, removeToken } from './util.js'

const FNAME_REGEX = /^(?<name>[A-Za-z0-9\-_\.]+)\.(?<ext>[A-Za-z]{1,4})$/
const DIR_REGEX = /^[A-Za-z0-9\-_]+$/

const opts: LoggerOptions = {
    console: true,
    file: true,
    logDir: 'logs',
    fileName: 'server.log',
}

let writeStream: WriteStream = null
let filePath: string = path.join('.', opts.logDir, opts.fileName)
const logToFileQueue: string[] = []

/**
 * Initializes the file logger
 */
export function init(): void {
    createDirectory()
    closeWriteStream()
    renameOldFile()
    updateFilePath()
    writeStream = fs.createWriteStream(filePath)
    log('File logger initialized')
}

/**
 * Creates the 'logs' directory if it doesn't exist
 */
function createDirectory() {
    if(!fs.existsSync(path.join('.', 'logs'))) {
        fs.mkdirSync(path.join('.', 'logs'))
    }
}

/**
 * Renames the most recent log file by appending a date string to its name
 */
function renameOldFile() {
    if(fs.existsSync(filePath)) {
        const timestamp = getDateString(true)
        const split = nameAndExt(opts.fileName)
        const newName = path.join('.', opts.logDir, `${split.name}-${timestamp}.${split.extension}`)
        fs.renameSync(filePath, newName)
    }
}

/**
 * Updates the path of the log file based on the logger settings
 */
function updateFilePath() {
    filePath = path.join('.', opts.logDir, opts.fileName)
}

/**
 * Logs an Express request
 * @param req   the request
 * @param type  the type of the request
 */
export function logReq(req: Request<any>, type: RequestType): void {
    const reqPath = type === 'API' ? req.originalUrl.substr(API_PREFIX.length) : req.originalUrl
    log(formatString([
        'REQUEST ',
        [ `(${type})`, 5, 'L' ],
        [ req.ip, 15, 'R' ],
        ' => ',
        [ req.method, 6, 'L' ],
        removeToken(reqPath),
    ]))
}

/**
 * Logs a message
 * @param message the message to log
 */
export function log(message: string): void {
    if(opts.file) {
        logToFile(message)
    }
    if(opts.console) {
        console.log(message)
    }
}

/**
 * Logs an error
 * @param error the error to log
 */
export function logError(error: Error): void {
    log(error.toString())
    if(error.stack) log(error.stack)
}

/**
 * Logs a single list item
 * @param item  the item
 * @param level the indent level
 */
export function logListItem(item: string, level = 0): void {
    log('  '.repeat(level) + `- ${item}`)
}

/**
 * Logs several list items
 * @param items the items
 * @param level the indent level
 */
export function logListItems(items: readonly string[], level = 0): void {
    for(const item of items) {
        logListItem(item, level)
    }
}

/**
 * Logs a blank line
 */
export function logBlankLine(): void {
    if(opts.file) {
        logToFile(null)
    }
    if(opts.console) {
        console.log()
    }
}

/**
 * Logs the last N bytes of a buffer
 * @param buffer    the buffer to log
 * @param n         the number of bytes
 * @param ascii     if true, also log the ASCII representation of the bytes
 */
export function logLastNBytesOfBuffer(buffer: Buffer, n: number, ascii = false): void {
    const logPart = buffer.slice(buffer.length - n)
    const hexBytes: string[] = []
    for(const byte of logPart) {
        hexBytes.push(padHexByte(byte))
    }
    log(`[ ${hexBytes.join(', ')} ]`)
    if(ascii) {
        const asciiBytes: string[] = []
        for(const byte of logPart) {
            if(byte < 32 || byte > 126) {
                asciiBytes.push(' ?')
                continue
            }
            asciiBytes.push(padString(String.fromCharCode(byte), 2, true, true))
        }
        log(`[ ${asciiBytes.join(', ')} ]`)
    }
}

/**
 * Logs a message to the log file
 * @param message the message
 */
function logToFile(message: string) {
    message = message === null ? '\n' : `[${getDateString()}] ${message}\n`
    if(!writeStream) {
        logToFileQueue.push(message)
        return
    }
    while(logToFileQueue.length > 0) {
        writeStream.write(logToFileQueue.shift())
    }
    writeStream.write(message)
}

/**
 * Splits a file name into its name and extension
 * @param name the full name of the file
 */
function nameAndExt(name: string): FileParts {
    const match = FNAME_REGEX.exec(name)
    return {
        name: match.groups.name,
        extension: match.groups.ext,
    }
}

/**
 * Sets the name of the log file
 * @param newName           the new log file name
 * @param updateImmediately if true, automatically calls init()
 */
export function setFileName(newName: string, updateImmediately = false): void {
    if(!FNAME_REGEX.test(newName)) {
        throw new Error('Invalid file name provided.')
    }
    opts.fileName = newName
    if(updateImmediately) {
        init()
    }
}

/**
 * Sets the name of the log file parent directory
 * @param newDir            the new name
 * @param updateImmediately if true, automatically calls init()
 */
export function setLogDir(newDir: string, updateImmediately = false): void {
    if(!DIR_REGEX.test(newDir)) {
        throw new Error('Invalid directory name provided.')
    }
    opts.logDir = newDir
    if(updateImmediately) {
        init()
    }
}

/**
 * Sets the logging output options
 * @param console   if true, write to console
 * @param file      if true, write to file
 */
export function setLogging(console: boolean, file: boolean): void {
    opts.console = console
    if(!opts.file && file) {
        init()
    } else if(opts.file && !file) {
        closeWriteStream()
    }
    opts.file = file
}

/**
 * Closes the open write stream
 */
export function closeWriteStream(): void {
    if(writeStream) {
        writeStream.end()
        writeStream = null
    }
}
