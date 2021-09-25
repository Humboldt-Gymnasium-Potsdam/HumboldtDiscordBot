import {Client, Intents} from "discord.js";
import {joinHandler} from "./handler/verifyHandler.js";
import {loadBotConfig} from "./support/config_loader.js";
import winston from "winston";

winston.configure({
    exitOnError: false,
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.cli()
            ),
            handleExceptions: true,
            level: "verbose"
        }),
    ],
    level: process.env.HUMBOLDT_BOT_LOG_LEVEL ?? "info"
});

winston.info(`Logging with level ${winston.level}.`);

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
    winston.verbose("About to load configuration...");
    const config = await loadBotConfig();

    if(!config.token || typeof(config.token) !== "string" || config.token.trim().length < 1) {
        winston.error("Missing discord token in application config!");
        process.exit(1);
    }

    winston.verbose(`Config: ${JSON.stringify(config, null, 4)}`);
    winston.info("Configuration has been loaded!");

    bot.on("ready", () => {         // !!! CHECK IF THERE IS A DATABASE IF NOT CREATE ONE !!!
        winston.info("Bot is up and running!");
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
