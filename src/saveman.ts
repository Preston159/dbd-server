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
    data = data.slice(4) // is always 0xUU UU 00 00 (U is unknown; I'm not sure if this matters to the game)
    data = zlib.inflateSync(data)
    return data
}

export function decryptSave(saveData: string): SaveData {
    const save = decryptDbD(saveData)
    return JSON.parse(save.toString('utf16le'))
}

function decrypt(data: Buffer): Buffer {
    const cipher = crypto.createDecipheriv('aes-256-ecb', key, iv)
    cipher.setAutoPadding(false)
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
