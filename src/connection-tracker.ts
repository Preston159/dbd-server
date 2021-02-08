import { Socket, Server as HttpServer } from 'net'
import { Server as HttpsServer } from 'https'

type Server = HttpServer | HttpsServer

const connections: Socket[] = []

/**
 * @returns an array of all active tracked connections
 */
export function getActiveConnections(): readonly Socket[] {
    return connections
}

/**
 * @returns the number of active tracked connections
 */
export function getActiveConnectionCount(): number {
    return connections.length
}

/**
 * Begins listening for and tracking connections on the given server(s)
 * @param servers the servers to track
 */
export function trackConnectionsOn(...servers: Server[]): void {
    servers.forEach(addServer)
}

/**
 * Adds required handlers to a server
 * @param server the server
 */
function addServer(server: Server): void {
    server.on('connection', (socket) => {
        connections.push(socket)
        socket.on('close', () => connections.splice(connections.indexOf(socket), 1))
    })
}

/**
 * Attempts to safely close all active connections
 * @returns {Promise} a Promise which resolves when all connections are successfully closed, or rejects with the first socket error
 */
export function closeConnections(): Promise<void[]> {
    const promises: Promise<void>[] = []
    for(const socket of connections) {
        promises.push(new Promise((resolve, reject) => {
            socket.on('error', (err) => reject(err))
            socket.on('close', () => resolve())
            socket.end()
        }))
    }
    return Promise.all(promises)
}
