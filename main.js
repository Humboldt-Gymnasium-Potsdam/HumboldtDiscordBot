import {Client, Intents} from "discord.js";
import * as fs from "fs";
import {joinHandler} from "./handler/verifyHandler.js";

// set the bot up
const bot = new Client({
    intents: [
        Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.DIRECT_MESSAGE_TYPING
    ],
    partials: [
        'MESSAGE', 'CHANNEL', 'REACTION'
    ]
});

const configFile = fs.readFileSync("./config.json").toString("utf-8");
const config = JSON.parse(configFile);

if (fs.existsSync("./config.override.json")) {
    const configFileOverride = fs.readFileSync("./config.override.json").toString("utf-8");
    const configOverride = JSON.parse(configFileOverride);

    Object.assign(config, configOverride);
}


bot.on("ready", () => {         // !!! CHECK IF THERE IS A DATABASE IF NOT CREATE ONE !!!
    console.log("jes")
})

bot.on("guildMemberAdd", member => {
    member.send("Willkommen")
})

bot.on("messageCreate", message => {
    console.log("test")

    joinHandler(message.author, bot, config);
})


bot.login(config.token);
