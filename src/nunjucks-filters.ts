/*
 * This code is licensed for use under GPLv3.0. It is not in the public domain.
 * Copyright (C) Preston Petrie 2021
 */
/**
 * @module Nunjucks Filters
 */

/**
 * Replaces spaces with non-breaking spaces.
 * @param str the string to convert
 */
export const makeSpacesNonBreaking: (str: string) => string = (str: string) => str.replace(/ /g, '&nbsp;')

/**
 * Repeats a string the specified number of times.
 * @param str   the string to repeat
 * @param count the number of repetitions
 */
export const repeatString: (str: string, count: number) => string = (str: string, count: number) => str.repeat(count)

/**
 * Converts newline characters to `<br />`.
 * @param str the string to convert
 */
export const newlineToBr: (str: string) => string = (str: string) => str.replace(/\r?\n/g, '<br />')

/**
 * Places the given string inside a td.
 * @param str       the string
 * @param header    if true, use th instead of td
 */
export const td: (str: string, header?: boolean) => string = (str: string, header = false) => header ? `<th>${str}</th>` : `<td>${str}</td>`

/**
 * Converts a player inventory item into a table row.
 * @param str the inventory item
 */
export const invItemToRow: (str: string) => string = (str: string) => {
    const split = str.split(',')
    return `<tr><td>${split[0]}</td><td>${split[1]}</td></tr>`
}
/**
 * Places the given text inside a span element which will select the full text content when clicked.
 * @param str the text
 */
export const spanSelectAll: (str: string) => string = (str: string) => `<span style="-webkit-user-select: all; user-select: all;">${str}</span>`
