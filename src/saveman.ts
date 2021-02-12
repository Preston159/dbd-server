/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as crypto from 'crypto'
import * as zlib from 'zlib'

import key from '../private/savekey.js'
const iv = ''

type SaveData = Record<string, unknown> & { characterData: { key: number }[]; playerUId: string }

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
    const outBuffer = Buffer.from(hex, 'hex')
    const paddingCount = outBuffer[outBuffer.length - 1]
    return outBuffer.slice(0, outBuffer.length - paddingCount)
}

function encrypt(data: Buffer): Buffer {
    const cipher = crypto.createCipheriv('aes-256-ecb', key, iv)
    cipher.setAutoPadding(true)
    let hex = ''
    hex = cipher.update(data).toString('hex')
    hex += cipher.final().toString('hex')
    return Buffer.from(hex, 'hex')
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
