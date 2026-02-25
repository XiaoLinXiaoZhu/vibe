import { writeFile } from "fs";
import { createVibe } from "../vibe";
import { z } from "zod";

const v = createVibe();

console.log(
    await v.download({
        source: "pixiv",
        count: 10,
        metadataTags: ["original", "1girl", "solo", "nsfw"],
        dist: "./downloads",
    })
);