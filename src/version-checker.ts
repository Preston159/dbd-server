/*
 * This code is licensed for use under GPLv3.0. It is not in the public domain.
 * Copyright (C) Preston Petrie 2021
 */
/**
 * @module Version Checker
 */
import type { GithubTagsResponse, PackageJson } from './types/types'

import fetch from 'node-fetch'
import * as path from 'path'
import * as fs from 'fs'

const VERSION_REGEX = /^v?(?<major>[0-9]+)\.(?<minor>[0-9]+)\.(?<patch>[0-9]+)$/
const RELEASES_URL = 'https://api.github.com/repos/Preston159/dbd-server/tags'

/**
 * Checks for available updates and notifies the user.
 */
export function checkVersion(): void {
    const packageJson = JSON.parse(fs.readFileSync(path.join('.', 'package.json')).toString()) as PackageJson
    const verRunning = packageJson.version
    fetch(RELEASES_URL, { method: 'GET' })
        .then(res => res.json() as Promise<GithubTagsResponse>)
        .then(json => {
            console.log(`Running DbD Dev Server v${verRunning}`)
            const verLatest = json[0].name
            const downloadURL = `https://github.com/Preston159/dbd-server/releases/tag/${json[0].name}`
            if(verRunning.endsWith('-dev')) {
                console.log("Stop! You're running a development version.")
                console.log("If you don't know what you're doing, download the latest release here:")
                console.log(downloadURL)
            } else {
                const comparison = compareVersions(verRunning, verLatest)
                if(comparison < 0) {
                    console.log(`An update is available! Download ${verLatest} from ${downloadURL}`)
                }
            }
        })
        .catch((err) => {
            console.log('Version check failed.', err)
        })
}

/**
 * Compares two SemVers.
 * @param a the first version
 * @param b the second version
 * @returns -1 if a < b, 1 if a > b, or 0 if a = b
 */
function compareVersions(a: string, b: string): number {
    const matchA = VERSION_REGEX.exec(a)
    const matchB = VERSION_REGEX.exec(b)
    if(!matchA) {
        throw new Error(`${a} is not a valid version`)
    }
    if(!matchB) {
        throw new Error(`${b} is not a valid version`)
    }
    for(const field of [ 'major', 'minor', 'patch' ]) {
        const fieldA = parseInt(matchA.groups[field], 10)
        const fieldB = parseInt(matchB.groups[field], 10)
        if(fieldA < fieldB) {
            return -1
        }
        if(fieldA > fieldB) {
            return 1
        }
    }
    return 0
}
