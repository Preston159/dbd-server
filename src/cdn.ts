/*
 * This code is licensed for use under GPLv3.0. It is not in the public domain.
 * Copyright (C) Preston Petrie 2021
 */
/**
 * @module CDN
 */
import { CDN_REGEX } from './util.js'

/**
 * Returns true if the given URL path is a CDN request, false otherwise
 * @param url the request path
 */
export function isCdn(url: string): boolean {
    return CDN_REGEX.test(url)
}
