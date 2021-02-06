import type { GithubTagsResponse, PackageJson } from './types/types'

import fetch from 'node-fetch'
import * as path from 'path'
import * as fs from 'fs'

const VERSION_REGEX = /^v?(?<major>[0-9]+)\.(?<minor>[0-9]+)\.(?<patch>[0-9]+)$/
const RELEASES_URL = 'https://api.github.com/repos/Preston159/dbd-server/tags'

export function checkVersion(): void {
    const packageJson = JSON.parse(fs.readFileSync(path.join('.', 'package.json')).toString()) as PackageJson
    const verRunning = packageJson.version
    fetch(RELEASES_URL, { method: 'GET' })
        .then(res => res.json() as Promise<GithubTagsResponse>)
        .then(json => {
            console.log(`Running DbD Dev Server v${verRunning}`)
            const verLatest = json[0].name
            const comparison = compareVersions(verRunning, verLatest)
            if(comparison < 0) {
                console.log(`An update is available! Download ${verLatest} from ${json[0].zipball_url}`)
            }
        })
        .catch((err) => {
            console.log('Version check failed.', err)
        })
}

function compareVersions(a: string, b: string) {
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
