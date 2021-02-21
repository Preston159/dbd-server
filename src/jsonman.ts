/*
 * This code is licensed for use under GPLv3.0. It is not in the public domain.
 * Copyright (C) Preston Petrie 2021
 */
/**
 * @module JSON Manager
 */
import * as fs from 'fs'

import { encryptDbD } from './saveman.js'

/**
 * Loads the specified JSON file and encrypts it for decryption by the client.<br>
 * The file must be UTF-16LE encoded.
 * @param filePath the path to the JSON file
 */
export function loadAndEncryptJson(filePath: string): string {
    let fileContents = fs.readFileSync(filePath)
    if(fileContents[0] === 0xFF && fileContents[1] === 0xFE) {
        fileContents = fileContents.slice(2)
    }
    return encryptDbD(fileContents)
}
