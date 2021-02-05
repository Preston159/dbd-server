import { Request, Response, NextFunction } from 'express'

import { RequestMethod } from './types/types'

type DebugResponse = {
    contentType: string
    data: string | Buffer
}
type DebugResponseEntry = {
    path: string
    method: RequestMethod
    response: DebugResponse | DebugResponseFunction
}
type DebugResponseFunction = (req: Request<any>) => DebugResponse

const responses: DebugResponseEntry[] = []

/**
 * Sets a new debug response with the given information
 * @param response the path and method which should be responded to and the response to use
 */
export function setResponse(response: DebugResponseEntry): void {
    const { path, method } = response
    unsetResponse(path, method)
    responses.unshift(response)
}

/**
 * Removes a previously-set debug response
 * @param path      the path on which the response was set
 * @param method    the request method
 */
export function unsetResponse(path: string, method: RequestMethod): void {
    for(let i = 0;i < responses.length;i++) {
        if(responses[i].path === path && responses[i].method === method) {
            responses.splice(i, 1)
            return
        }
    }
}

/**
 * An Express middleware which does the requested responding<br>
 * This middleware should be registered before any request handlers.
 */
export default function debugResponse(req: Request<any>, res: Response<any>, next: NextFunction): void {
    const responseEntry = responses.filter(_response => _response.path === req.originalUrl && _response.method === req.method)[0]
    if(!responseEntry) {
        next()
        return
    }
    const response = typeof responseEntry.response === 'function' ? responseEntry.response(req) : responseEntry.response
    res.set('Content-Type', response.contentType)
    res.send(response.data)
}
