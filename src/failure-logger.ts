import { Request, Response, NextFunction } from 'express'

/**
 * Sets up a middleware which logs requests which have not been responded to<br>
 * This middleware should be registered last, after all normal response-yielding methods.
 * @param send404 if true, this middleware will send an empty 404 page as a response and end the response chain
 * @returns the configured middleware
 */
export default function failureLogger(send404 = false): (req: Request<any>, res: Response<any>, next: NextFunction) => void {
    return (req: Request<any>, res: Response<any>, next: NextFunction) => {
        if(!res.headersSent) {
            console.log('A request has been received which the server did not explicitly respond to.')
            console.log(`  ${req.ip} ${req.method} ${req.originalUrl}`)
            if(req.body && (typeof req.body !== 'object' || Object.keys(req.body).length > 0)) {
                console.log(req.body)
            }
        }
        if(send404) {
            res.status(404).end()
        } else {
            next()
        }
    }
}
