/*
 * This code is licensed for use under GPLv3.0. It is not in the public domain.
 * Copyright (C) Preston Petrie 2021
 */
/**
 * @module Events
 */
import type { EventsJson, GameEvent, SpecialEventsContent } from './types/types'

import * as path from 'path'
import * as fs from 'fs'
import HJSON from 'hjson'

import { encryptDbD } from './saveman.js'
import { getGameDateString } from './util.js'

// load event config data
const events = HJSON.parse(fs.readFileSync(path.join('.', 'settings', 'events.hjson')).toString()) as EventsJson

/**
 * Returns the encrypted event data which should be sent to the client.
 * @param event if specified, the event to enable; otherwise, the config file is used
 */
export function getGameEventData(event?: GameEvent): string {
    const eventData = JSON.parse(fs.readFileSync(path.join('.', 'json', 'specialEventsContent.json')).toString()) as SpecialEventsContent
    const now = new Date()
    const end = new Date()
    end.setDate(end.getDate() + 180)

    for(const gameEvent of eventData.specialEvents) {
        if((!event && events[gameEvent.eventId]) || (event && gameEvent.eventId === event)) {
            gameEvent.mainEndTime = getGameDateString(end)
            gameEvent.postEndTime = getGameDateString(end)
            gameEvent.startTime = getGameDateString(now)
        }
    }

    const eventDataString = JSON.stringify(eventData, null, 4).replace(/,/g, ', ').replace(/\n/g, '\r\n')
    const eventDataBuffer = Buffer.from(eventDataString, 'utf16le')
    return encryptDbD(eventDataBuffer)
}
