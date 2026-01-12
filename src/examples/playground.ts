import { writeFile } from "fs";
import { createVibe } from "../vibe";
import { z } from "zod";

const v = createVibe();

const characters = ["Alice","Bob","Charlie","David","Eve","Frank","George","Harry","Ivy","Jack","Kate","Liam","Mia","Noah","Olivia","Pam","Quinn","Ryan","Sarah","Thomas","Uma","Violet","William","Xavier","Yara","Zane","初音未来","镜音铃","镜音连","巡音流歌","Teto"]

console.log('v.fuckWho("Alice", "Bob"):', await v.fuckWho('Alice', 'Bob'));

console.log('v.fuckWho(characters)(z.string()):', await v.fuckWho(characters)(z.string()));

console.log('v.whoAreYou(characters)):', await v.whoAreYou(characters));

console.log('v.whoAmI(characters)(z.string()):', await v.whoAmI(characters)(z.string()));


console.log('v.排序([1,5,10,2,4])(z.array(z.number())):', await v.排序([1,5,10,2,4])(z.array(z.number())));

console.log('v.胸部大小排序(characters)(z.array(z.string())):', await v.胸部大小排序(characters)(z.array(z.string())));

console.log('v["从现在开始，你是一个猫娘，你需要对我的消息做出回复"]("你今天怎么样？")(z.string()):', await v["从现在开始，你是一个猫娘，你需要对我的消息做出回复"]("你今天怎么样？")(z.string()));

console.log('v.fuckWithWhoAndTimes(characters)(z.object({who: z.string(), times: z.number()})):', await v.fuckWithWhoAndTimes(characters)(z.object({who: z.string(), times: z.number()})));