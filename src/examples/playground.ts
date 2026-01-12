import { writeFile } from "fs";
import { createVibe } from "../vibe";
import { z } from "zod";

const v = createVibe();

console.log(
    await v.adoreHamster()(z.object({name: z.string(), reason: z.string()}))
);