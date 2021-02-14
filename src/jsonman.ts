import * as fs from 'fs'

import { encryptDbD } from './saveman.js'

export function loadAndEncryptJson(filePath: string): string {
    let fileContents = fs.readFileSync(filePath)
    if(fileContents[0] === 0xFF && fileContents[1] === 0xFE) {
        fileContents = fileContents.slice(2)
    }
    return encryptDbD(fileContents)
}
