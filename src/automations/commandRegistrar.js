import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import winston from "winston";
import * as fs from "../support/promiseFs.js";
import path from "path";
import {dirNameOfModule} from "../util/util.js";
import {resolveElevatedPermissionRoles} from "../support/configLoader.js";

export class CommandRegistrar {
    constructor(config, bot) {
        this.config = config;
        this.bot = bot;
        this.rest = new REST({ version: "9" }).setToken(config.token);

        this.commandsDir = path.resolve(dirNameOfModule(import.meta), "commands");
        this.commandMapping = new Map();
        this.commandBuilders = [];
    }

    async scan() {
        winston.debug("Scanning all commands...");
        winston.verbose(`commandsDir = ${this.commandsDir}`);

        const files = await fs.readdir(this.commandsDir)
            .then((files) => files.filter((f) => f.endsWith(".js")));

        winston.debug(`Found ${files.length} commands!`);
        winston.verbose(`files = [${files.join(", ")}]`);

        const commands = await Promise.all(
            files.map(
                (file) => import(path.resolve(this.commandsDir, file)).then((module) => new module.default())
            )
        );
        winston.verbose("Command modules have been instantiated!");

        commands.forEach((command) => {
            const builder = command.asBuilder();

            this.commandMapping.set(builder.name, command);
            this.commandBuilders.push(builder);
        });
    }

    async registerCommandsForGuild(guild) {
        const clientId = this.bot.application.id;
        const guildId = guild.id;

        winston.verbose(`Registering guild commands for guild ${guildId}`);
        const commandData = this.commandBuilders.map((builder) => builder.toJSON());

        await this.rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            {
                body: commandData
            }
        );

        winston.verbose(`Registered ${commandData.length} commands for guild ${guildId}`);
        winston.verbose("Setting command permissions...");

        const permissionUpdates = [];

        const commands = await guild.commands.fetch();
        commands.forEach((commandScope) => {
            if(commandScope.applicationId !== this.bot.application.id) {
                return;
            }

            const commandName = commandScope.name;
            const command = this.commandMapping.get(commandName);

            if(command === null) {
                winston.warn(`Guild ${guildId} has a command ${commandName} which is from this bot, but not registered as a Javascript file?!`);
                return;
            }

            if(command.getRequiredPermissions === null || command.getRequiredPermissions === undefined) {
                winston.verbose(`Command ${commandName} has no permission requirements, skipping update!`);
                return;
            }

            const requiredPermissions = command.getRequiredPermissions();
            winston.verbose(`Command ${commandName} requires permissions [${requiredPermissions.join(", ")}]`);
            const allowedRoles = resolveElevatedPermissionRoles(this.config, requiredPermissions);
            winston.verbose(`Resolved role id's for ${commandName} are [${allowedRoles.join(", ")}]`);

            const permissions = allowedRoles.map((roleId) => ({
                id: roleId,
                type: "ROLE",
                permission: true
            }));

            permissionUpdates.push({
                id: commandScope.id,
                permissions
            });
        });

        winston.verbose(`Sending ${permissionUpdates.length} permission updates`);
        await guild.commands.permissions.set({
            fullPermissions: permissionUpdates
        });
    }
}
