import type { PlayerLevel, PlayerLevelInfo } from './types/types'

import { rankToPips, xpToPlayerLevel, playerLevelToTotalXp } from './util.js'

// these values affect players' starting values, e.g. their default save
export const bloodpoints = 500_000_000 // note: these are bonus bloodpoints, and as such can be over 1,000,000
const survivorRank = 20
const survivorPips = 0
const killerRank = 20
const killerPips = 0
const playerLevel: PlayerLevelInfo = {
    currentXp: 666,
    level: 66,
    prestigeLevel: 6,
}
// -- do not modify below this line -- //
export const playerLevelObject: Readonly<PlayerLevel> = xpToPlayerLevel(playerLevelToTotalXp(playerLevel))
export const pips: Readonly<{ survivor: number; killer: number }> = {
    survivor: rankToPips(survivorRank) + survivorPips,
    killer: rankToPips(killerRank) + killerPips,
}
