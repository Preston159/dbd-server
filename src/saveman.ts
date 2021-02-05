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

export function decryptSave(saveData: string): SaveData {
    let save: any = saveData
    save = save.substr(8)
    save = Buffer.from(save, 'base64')
    save = decrypt(save)
    for(let i = 0;i < save.length;i++) {
        save[i]++
    }
    save = save.slice(8)
    save = Buffer.from(save.toString(), 'base64')
    save = save.slice(4)
    save = zlib.inflateSync(save)
    return JSON.parse(save.toString('utf16le'))
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

function decrypt(data: Buffer): Buffer {
    const cipher = crypto.createDecipheriv('aes-256-ecb', key, iv)
    cipher.setAutoPadding(false)
    let hex = ''
    hex = cipher.update(data).toString('hex')
    hex += cipher.final().toString('hex')
    return Buffer.from(hex, 'hex')
}
