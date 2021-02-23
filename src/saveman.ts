/*
 * This code is licensed for use under GPLv3.0. It is not in the public domain.
 * Copyright (C) Preston Petrie 2021
 */
/**
 * @module Save Manager
 */
import type { SaveData } from './types/types'

import * as crypto from 'crypto'
import * as zlib from 'zlib'
import * as path from 'path'
import * as fs from 'fs'
import HJSON from 'hjson'

import * as StartingValues from './starting-values.js'
import { isInteger } from './util.js'

import key from '../private/savekey.js'
const iv = ''

// the path of the default save
const DEFAULT_SAVE_PATH = path.join('.', 'json', 'defaultSave.json')
// load the default save and encrypt it
const DEFAULT_SAVE = (() => {
    if(fs.existsSync(DEFAULT_SAVE_PATH)) {
        const saveObj = HJSON.parse(fs.readFileSync(DEFAULT_SAVE_PATH).toString()) as SaveData
        saveObj.bonusExperience = StartingValues.bloodpoints
        return encryptDbD(Buffer.from(JSON.stringify(saveObj), 'utf16le'))
    } else {
        return null
    }
})()

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/**
 * Decrypts data using BHVR's encryption method.
 * @param encryptedData the encrypted data
 */
export function decryptDbD(encryptedData: string): Buffer {
    let data: any = encryptedData
    data = data.substr(8) // is always DbdDAgAC
    data = Buffer.from(data, 'base64')
    data = decrypt(data)
    for(let i = 0;i < data.length;i++) {
        data[i]++
    }
    data = data.slice(8) // is always 0x44 62 64 44 41 51 45 42
    data = Buffer.from(data.toString(), 'base64')
    data = data.slice(4) // is always a 32-bit LE integer denoting the size of the plaintext
    data = zlib.inflateSync(data)
    return data as Buffer
}

/**
 * Encrypts the data using BHVR's encrypted method.
 * @param plainData the Buffer containing the data to be encrypted; should be UTF-16LE encoded
 */
export function encryptDbD(plainData: Buffer): string {
    let data: any = plainData

    const dataSize = plainData.length
    const bufferA = Buffer.alloc(4)
    bufferA.writeInt32LE(dataSize)

    data = zlib.deflateSync(data)
    data = appendBuffers(bufferA, data)
    data = Buffer.from(data.toString('base64'))
    data = appendBuffers(Buffer.of(0x44, 0x62, 0x64, 0x44, 0x41, 0x51, 0x45, 0x42), data)
    for(let i = 0;i < data.length;i++) {
        data[i]--
    }
    data = encrypt(data)
    data = data.toString('base64')
    data = 'DbdDAgAC' + (data as string)
    return data as string
}

/* eslint-enable @typescript-eslint/no-unsafe-assignment */

/**
 * Converts an encrypted player save to an Object.
 * @param saveData the encrypted save data
 */
export function decryptSave(saveData: string): SaveData {
    const save = decryptDbD(saveData)
    return JSON.parse(save.toString('utf16le')) as SaveData
}

/**
 * Performs the AES decryption for decryptDbD()
 */
function decrypt(data: Buffer): Buffer {
    const cipher = crypto.createDecipheriv('aes-256-ecb', key, iv)
    cipher.setAutoPadding(false)
    let hex = ''
    hex = cipher.update(data).toString('hex')
    hex += cipher.final().toString('hex')
    let outBuffer = Buffer.from(hex, 'hex')
    if(outBuffer[outBuffer.length - 1] === 0) {
        while(outBuffer[outBuffer.length - 1] === 0) {
            outBuffer = outBuffer.slice(0, outBuffer.length - 1)
        }
    } else {
        const paddingCount = outBuffer[outBuffer.length - 1]
        outBuffer = outBuffer.slice(0, outBuffer.length - paddingCount)
    }
    return outBuffer
}

/**
 * Performs the AES encryption for encryptDbD()
 */
function encrypt(data: Buffer): Buffer {
    const cipher = crypto.createCipheriv('aes-256-ecb', key, iv)
    cipher.setAutoPadding(false)
    const paddingByteCount = (32 - (data.length % 32)) || 32
    data = appendBuffers(data, Buffer.alloc(paddingByteCount, 0))
    return appendBuffers(cipher.update(data), cipher.final())
}

/**
 * Concatenates two Buffers.
 * @param a the first Buffer
 * @param b the second Buffer
 */
function appendBuffers(a: Buffer, b: Buffer): Buffer {
    const out = Buffer.alloc(a.length + b.length)
    for(let i = 0;i < a.length;i++) {
        out[i] = a[i]
    }
    for(let i = 0;i < b.length;i++) {
        out[a.length + i] = b[i]
    }
    return out
}

/**
 * Returns `true` if the default save file exists, `false` otherwise.
 */
export function defaultSaveExists(): boolean {
    return !!DEFAULT_SAVE
}

/**
 * Returns the encrypted default save.
 */
export function getDefaultSave(): string {
    if(!defaultSaveExists()) {
        return ''
    }
    return DEFAULT_SAVE
}

/**
 * Returns the path where save files are stored, or the path for a specific user's save if `userId` is specified.
 * @param userId the user ID
 */
export function getSavePath(userId?: string): string {
    if(userId) {
        return path.join('.', 'saves', `save_${userId}`)
    } else {
        return path.join('.', 'saves')
    }
}

export function saveFileExists(userId: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        const savePath = getSavePath(userId)
        fs.stat(savePath, (err) => {
            if(err) {
                resolve(false)
                return
            }
            resolve(true)
            return
        })
    })
}

export function setPlayerPerkLevel(userId: string, characterId: number, perkId: string, level: number): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        if(level < 1 || level > 4 || !isInteger(level)) {
            reject(new Error('Invalid perk level provided'))
            return
        }
        void saveFileExists(userId).then((exists) => {
            if(!exists) {
                resolve(false)
                return
            }
            const savePath = getSavePath(userId)
            fs.readFile(savePath, { encoding: 'utf8' }, (err, data) => {
                if(err) {
                    reject(err)
                    return
                }
                const save = decryptSave(data)
                let found = false
                for(const character of save.characterData) {
                    if(character.key === characterId) {
                        for(const item of character.data.inventory) {
                            const [ perkName ] = item.i.split(',')
                            if(perkName === perkId) {
                                item.i = `${perkName},${level}`
                                found = true
                                break
                            }
                        }
                        break
                    }
                }
                if(found) {
                    const encryptedSave = encryptDbD(Buffer.from(JSON.stringify(save), 'utf16le'))
                    fs.writeFile(savePath, encryptedSave, (writeErr) => {
                        if(writeErr) {
                            reject(writeErr)
                            return
                        }
                        resolve(true)
                        return
                    })
                } else {
                    resolve(false)
                }
            })
        })
    })
}
