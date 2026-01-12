import { writeFile } from "fs";
import { createVibe } from "../vibe";
import { z } from "zod";
const v = createVibe();

const result = await v.convertEmojiToASCIIArt("👀", 100, 100)(z.string())

console.log(result);
writeFile("output.txt", result, (err) => {
    if (err) {
        console.error("Error writing to file", err);
    } else {
        console.log("ASCII art written to output.txt");
    }
});
