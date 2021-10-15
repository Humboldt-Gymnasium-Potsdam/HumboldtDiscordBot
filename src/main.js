import {Client, Intents} from "discord.js";
// import {joinHandler} from "./handler/verifyHandler.js";
import {loadBotConfig} from "./support/configLoader.js";
import winston from "winston";
import {MoodleInterface} from "./moodle/moodleInterface.js";
import {MoodleDiscordSender} from "./automations/moodleDiscordSender.js";
import {DatabaseInterface} from "./support/databaseInterface.js";
import {CommandRegistrar} from "./automations/commandRegistrar.js";

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

    winston.verbose("About to set up database...");
    const database = new DatabaseInterface(config);
    winston.info("Database has been set up!");

    const commandRegistrar = new CommandRegistrar(config, bot);
    const commandScanningPromise = commandRegistrar.scan();

    bot.on("ready", () => {
        winston.info("Bot is up and running!");
    });

    bot.on("guildMemberAdd", member => {
        member.send("Willkommen");
    });

    bot.on("messageCreate", message => {
        if(!message.author.bot) {
            if(message.guild !== null && message.content === `<@!${bot.user.id}> reload-slash-commands`) {
                commandScanningPromise
                    .then(() => commandRegistrar.registerCommandsForGuild(message.guild))
                    .then(() => message.reply("Slash commands reloaded!"));
            }
        }
    });

    const moodle = new MoodleInterface(winston, config);
    const moodleSender = new MoodleDiscordSender(bot, config);

    const startPromises = [
        moodle.performLogin(),
        bot.login(config.token)
    ];

    moodle.on("data", (data) => moodleSender.moodleDataReceived(data));
    moodle.on("error", (error) => moodleSender.moodleError(error));

    await Promise.all(startPromises).then(() => moodle.rescheduleScrape());
})();
