import { CDN_REGEX } from './util.js'

/**
 * Returns true if the given URL path is a CDN request, false otherwise
 * @param url the request path
 */
export function isCdn(url: string): boolean {
    return CDN_REGEX.test(url)
}
