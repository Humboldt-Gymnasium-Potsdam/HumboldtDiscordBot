import {Client, Intents} from "discord.js";
import {loadBotConfig} from "./support/configLoader.js";
import winston from "winston";
import {MoodleInterface} from "./moodle/moodleInterface.js";
import {MoodleDiscordSender} from "./automations/moodleDiscordSender.js";
import {DatabaseInterface} from "./support/databaseInterface.js";
import {CommandRegistrar} from "./automations/commandRegistrar.js";
import {CallbackManager} from "./manager/callbackManager.js";
import {UserManager} from "./manager/userManager.js";

winston.configure({
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3,
        verbose: 4,
        silly: 5
    },
    exitOnError: false,
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.cli()
            ),
            handleExceptions: true,
            level: process.env.HUMBOLDT_BOT_LOG_LEVEL ?? "info"
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

    const callbackManager = new CallbackManager();
    const application = {config, bot, database, callbackManager, userManager: null, commandRegistrar: null};

    const userManager = new UserManager(application);
    application.userManager = userManager;

    const commandRegistrar = new CommandRegistrar(application);
    application.commandRegistrar = commandRegistrar;

    const commandScanningPromise = commandRegistrar.scan();


    bot.on("ready", () => {
        winston.info("Bot is up and running!");
    });

    bot.on("guildMemberAdd", (member) => {
        userManager.afterJoinHandler(member);
    });

    bot.on("messageCreate", (message) => {
        if(!message.author.bot) {
            if(message.guild !== null) {
                const botManagers = config.botManagers;

                if(botManagers != null && botManagers.includes(message.author.id)) {
                    switch (message.content) {
                        case `<@!${bot.user.id}> reload-guild-slash-commands`:
                            commandScanningPromise
                                .then(() => commandRegistrar.registerCommandsForGuild(message.guild))
                                .then(() => message.reply("Guild slash commands reloaded!"));
                            break;

                        case `<@!${bot.user.id}> reload-global-slash-commands`:
                            commandScanningPromise
                                .then(() => commandRegistrar.registerGlobalCommands())
                                .then(() => message.reply("Global slash commands reloaded!"));
                            break;

                        case `<@!${bot.user.id}> simulate-join`:
                            userManager.afterJoinHandler(message.member);
                            break;
                    }
                }
            }
        }
    });

    bot.on("interactionCreate", (interaction) => {
        if(interaction.isCommand()) {
            commandRegistrar.handleInteraction(interaction);
        }
    });

    const moodle = new MoodleInterface(application);
    const moodleSender = new MoodleDiscordSender(application);

    const startPromises = [
        moodle.performLogin(),
        bot.login(config.token)
    ];

    moodle.on("data", (data) => moodleSender.moodleDataReceived(data));
    moodle.on("error", (error) => moodleSender.moodleError(error));

    await Promise.all(startPromises).then(() => moodle.rescheduleScrape());
})();
