/*
 * This code is licensed for use under GPLv3.0. It is not in the public domain.
 * Copyright (C) Preston Petrie 2021
 */
/**
 * @module Respond Empty
 */
import type { RequestMethod } from './types/types'

import { Request, Response, NextFunction } from 'express'

type AutoResponse = [ RequestMethod, string | RegExp, number ]

const responses: AutoResponse[] = []

/**
 * Adds an automatic empty response
 * @param autoResponse the request method and path, and the status code with which to respond
 */
export function addAutoResponse(autoResponse: AutoResponse): void {
    responses.push(autoResponse)
}

/**
 * Adds multiple automatic empty responses
 * @param autoResponses the request methods and paths, and the status codes with which to respond
 */
export function addAutoResponses(...autoResponses: AutoResponse[]): void {
    autoResponses.forEach(addAutoResponse)
}

/**
 * The Express middleware which responds to requests
 */
export default function respondEmpty(req: Request<any>, res: Response<any>, next: NextFunction): void {
    const response = responses.filter(
        (autoResponse) => autoResponse[0] === req.method &&
        (typeof autoResponse[1] === 'string' ? req.originalUrl === autoResponse[1] : autoResponse[1].test(req.originalUrl))
    )[0]
    if(response) {
        res.status(response[2]).end()
    } else {
        next()
    }
}
