/*
 * This code is licensed for use under GPLv3.0. It is not in the public domain.
 * Copyright (C) Preston Petrie 2021
 */
/**
 * @module IP Address
 */
import { networkInterfaces } from 'os'

import { isPublicIpv4 } from './util.js'

/**
 * @returns the IP address of the machine at runtime
 */
export function getIp(): string {
    const ifaces = networkInterfaces()
    const eths = Object.keys(ifaces).filter(value => value.startsWith('eth'))
    if(eths.length === 0) {
        return '127.0.0.1'
    }
    const iface = ifaces[eths[0]]
    const ips = iface.filter(info => info.family === 'IPv4').map(info => info.address)
    for(const ip of ips) {
        if(isPublicIpv4(ip)) {
            return ip
        }
    }
    return ips.length > 0 ? ips[0] : '127.0.0.1'
}
