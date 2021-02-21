/*
 * This code is licensed for use under GPLv3.0. It is not in the public domain.
 * Copyright (C) Preston Petrie 2021
 */
/**
 * @module Settings
 */
import type { ServerSettingsJson } from './types/types'

import * as fs from 'fs'
import HJSON from 'hjson'
import * as path from 'path'

const serverSettings = HJSON.parse(fs.readFileSync(path.join('.', 'settings', 'server-settings.hjson')).toString()) as ServerSettingsJson

export const PING_GOOD = 150
export const PING_OK = 1000

export const DEBUG_REQUIRE_HTTPS = serverSettings.debugRequireHttps

export const SAVE_TO_FILE = serverSettings.saveToFile // whether to save users' profiles as files

export const SESSION_LENGTH = serverSettings.sessionLength // one day

export const REQUIRE_STEAM = serverSettings.requireSteam // if true, guest logins will be disabled

export const WHITELIST_ENABLED = serverSettings.whitelistEnabled

export const RATE_LIMIT_TIME = serverSettings.rateLimitTime // seconds
export const RATE_LIMIT_COUNT = serverSettings.rateLimitCount
export const LOGIN_LIMIT_COUNT = serverSettings.loginLimitCount
