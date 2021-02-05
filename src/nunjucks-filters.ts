
export const makeSpacesNonBreaking: (str: string) => string = (str: string) => str.replace(/ /g, '&nbsp;')
export const repeatString: (str: string, count: number) => string = (str: string, count: number) => str.repeat(count)
export const newlineToBr: (str: string) => string = (str: string) => str.replace(/\r?\n/g, '<br />')
export const td: (str: string, header?: boolean) => string = (str: string, header = false) => header ? `<th>${str}</th>` : `<td>${str}</td>`
export const invItemToRow: (str: string) => string = (str: string) => {
    const split = str.split(',')
    return `<tr><td>${split[0]}</td><td>${split[1]}</td></tr>`
}
export const spanSelectAll: (str: string) => string = (str: string) => `<span style="-webkit-user-select: all; user-select: all;">${str}</span>`
