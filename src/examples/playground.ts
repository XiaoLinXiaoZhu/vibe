import { writeFile } from "fs";
import { createVibe } from "../vibe";
import { z } from "zod";
const v = createVibe();

const result = await v.fuckWho('Alice', 'Bob');

console.log('Result:', result);
