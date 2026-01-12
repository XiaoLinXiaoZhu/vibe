import { writeFile } from "fs";
import { createVibe } from "../vibe";
import { z } from "zod";

const v = createVibe();

console.log(
    await v.explain("捧腹大笑","english")(z.string())
);