import {Client, Intents} from "discord.js";
import {joinHandler} from "./handler/verifyHandler.js";
import {loadBotConfig} from "./support/config_loader";

// set the bot up
const bot = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
        Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_TYPING
    ],
    partials: [
        "MESSAGE", "CHANNEL", "REACTION"
    ]
});

(async () => {
    const config = await loadBotConfig();

    bot.on("ready", () => {         // !!! CHECK IF THERE IS A DATABASE IF NOT CREATE ONE !!!
        console.log("jes");
    });

    bot.on("guildMemberAdd", member => {
        member.send("Willkommen");
    });

    bot.on("messageCreate", message => {
        console.log("test");

        joinHandler(message.author, bot, config);
    });


    await bot.login(config.token);
})();
