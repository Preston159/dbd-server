/*
 * This code is licensed for use under GPLv3.0. It is not in the public domain.
 * Copyright (C) Preston Petrie 2021
 */
/**
 * @module Starting Values
 */
import type { PlayerLevel, PlayerLevelInfo, StartingValuesJson } from './types/types'

import * as fs from 'fs'
import HJSON from 'hjson'
import * as path from 'path'

import { rankToPips, xpToPlayerLevel, playerLevelToTotalXp } from './util.js'

const startingValues = HJSON.parse(fs.readFileSync(path.join('.', 'settings', 'starting-values.hjson')).toString()) as StartingValuesJson

// these values affect players' starting values, e.g. their default save
export const bloodpoints = startingValues.bloodpoints // note: these are bonus bloodpoints, and as such can be over 1,000,000
const survivorRank = startingValues.survivorRank
const survivorPips = startingValues.survivorPips
const killerRank = startingValues.killerRank
const killerPips = startingValues.killerPips
const playerLevel: PlayerLevelInfo = {
    currentXp: startingValues.playerLevel.currentXp,
    level: startingValues.playerLevel.level,
    prestigeLevel: startingValues.playerLevel.prestigeLevel,
}
export const playerLevelObject: Readonly<PlayerLevel> = xpToPlayerLevel(playerLevelToTotalXp(playerLevel))
export const pips: Readonly<{ survivor: number; killer: number }> = {
    survivor: rankToPips(survivorRank) + survivorPips,
    killer: rankToPips(killerRank) + killerPips,
}
