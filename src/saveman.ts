/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as crypto from 'crypto'
import * as zlib from 'zlib'
import * as path from 'path'
import * as fs from 'fs'
import v8 from 'v8'

import * as StartingValues from './starting-values.js'

import key from '../private/savekey.js'
const iv = ''

type SaveData = Record<string, unknown> & { characterData: { key: number }[]; playerUId: string }

const DEFAULT_SAVE_PATH = path.join('.', 'json', 'defaultSave.json')
const DEFAULT_SAVE = fs.existsSync(DEFAULT_SAVE_PATH) ? JSON.parse(fs.readFileSync(DEFAULT_SAVE_PATH).toString()) : ''

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
    return data
}

export function decryptSave(saveData: string): SaveData {
    const save = decryptDbD(saveData)
    return JSON.parse(save.toString('utf16le'))
}

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
    data = 'DbdDAgAC' + data
    return data
}

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

function encrypt(data: Buffer): Buffer {
    const cipher = crypto.createCipheriv('aes-256-ecb', key, iv)
    cipher.setAutoPadding(false)
    const paddingByteCount = (32 - (data.length % 32)) || 32
    data = appendBuffers(data, Buffer.alloc(paddingByteCount, 0))
    return appendBuffers(cipher.update(data), cipher.final())
}

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

export function getDefaultSave(steamId: string): string {
    if(!DEFAULT_SAVE) {
        return ''
    }
    const saveObj = v8.deserialize(v8.serialize(DEFAULT_SAVE)) // deep clone object
    const steam64 = BigInt(steamId)
    const idBuffer = Buffer.alloc(8)
    idBuffer.writeBigInt64LE(steam64)

    saveObj.playerUid = idBuffer.toString('hex').toUpperCase()
    saveObj.bonusExperience = StartingValues.bloodpoints

    return encryptDbD(Buffer.from(JSON.stringify(saveObj), 'utf16le'))
}
