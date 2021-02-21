/*
 * This code is licensed for use under GPLv3.0. It is not in the public domain.
 * Copyright (C) Preston Petrie 2021
 */
/**
 * @module ID To Name
 */
const names: Map<string, string> = new Map<string, string>()

names.set("0", "Dwight")
names.set("1", "Meg")
names.set("2", "Claudette")
names.set("3", "Jake")
names.set("4", "Nea")
names.set("5", "Laurie")
names.set("6", "Ace")
names.set("7", "Bill")
names.set("8", "Feng")
names.set("9", "David")
names.set("10", "Kate")
names.set("11", "Quentin")
names.set("12", "Tapp")
names.set("13", "Adam")
names.set("14", "Jeff")
names.set("15", "Jane")
names.set("16", "Ash")

names.set("268435456", "Trapper")
names.set("268435457", "Wraith")
names.set("268435458", "Billy")
names.set("268435459", "Nurse")
names.set("268435460", "Hag")
names.set("268435461", "Myers")
names.set("268435462", "Doctor")
names.set("268435463", "Huntress")
names.set("268435464", "Leatherface")
names.set("268435465", "Freddy")
names.set("268435466", "Pig")
names.set("268435467", "Clown")
names.set("268435468", "Spirit")
names.set("268435469", "Legion")
names.set("268435470", "Plague")
names.set("268435471", "Ghostface")

/**
 * Converts a Dead by Daylight character ID into a name
 * @param id the ID
 * @return the character name
 */
export default function(id: string | number): string {
    return names.get(id.toString()) || `Character ${id}`
}
