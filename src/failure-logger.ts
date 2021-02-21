/*
 * This code is licensed for use under GPLv3.0. It is not in the public domain.
 * Copyright (C) Preston Petrie 2021
 */
/**
 * @module Failure Logger
 */
import { Request, Response, NextFunction } from 'express'

import { logFailedRequest } from './logger.js'

/**
 * Sets up a middleware which logs requests which have not been responded to<br>
 * This middleware should be registered last, after all normal response-yielding methods.
 * @param send404 if true, this middleware will send an empty 404 page as a response and end the response chain
 * @returns the configured middleware
 */
export default function failureLogger(send404 = false): (req: Request<any>, res: Response<any>, next: NextFunction) => void {
    return (req: Request<any>, res: Response<any>, next: NextFunction) => {
        if(!res.headersSent) {
            logFailedRequest(req)
        }
        if(send404) {
            res.status(404).end()
        } else {
            next()
        }
    }
}
