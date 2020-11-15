import * as fs from "fs";
import { network } from "hardhat";

export function readGrantsFromFile() {
    const file = fs.readFileSync(`./grants/${network.name}.json`, 'utf-8');
    return JSON.parse(file);
}
