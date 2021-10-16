import winston from "winston";
import {computeArrayPatches} from "../util/util.js";
import {MessageEmbed} from "discord.js";

export class UserManager {
    constructor(config, database) {
        this.config = config;
        this.database = database;
    }

    async afterJoinHandler(user) {
        if (await this.database.getStudentDataForUser(user.id) != null) {
            await this.applyRoles(user);
        }

        const verifyEmbed = new MessageEmbed()
            .setColor(this.config.colors.verifyEmbed)
            .setTitle("Verifizieren")
            .setDescription("Bitte verifiziere dich, indem du `/verify` nutzt.")
            .setFooter("Dies ist notwendig, um zu prüfen, ob du vom Humboldt Gymnasium bist")
            .setThumbnail("https://cdn.discordapp.com/attachments/577839440769318912/890260708980318278/HumboldtImage.png");

        try {
            await user.send({
                embeds: [verifyEmbed]
            });
        } catch (e) {
            if (e.code === 50007 /* user has DMs disabled */) {
                const verifyInfoEmbed = new MessageEmbed()
                    .setTitle("Verifizieren")
                    .setDescription("Bitte verifiziere dich, indem du `/verify` nutzt.")
                    .setFooter("Dies ist notwendig, um zu prüfen, ob du vom Humboldt Gymnasium bist")
                    .setThumbnail("https://cdn.discordapp.com/attachments/577839440769318912/890260708980318278/HumboldtImage.png");

                const verifyChannel = await user.guild.channels.fetch(this.config.channels.verify);
                await verifyChannel.send(`<@!${user.id}>`);
                await verifyChannel.send({embeds: [verifyInfoEmbed]});
                return;
            }

            throw e;
        }
    }

    async applyRoles(user, extensive = false) {
        winston.debug(`Applying roles to user ${user.id}, extensive = ${extensive}`);
        if (!extensive) {
            const roleIds = await this.database.getRolesForUser(user.id);
            winston.verbose(`user = ${user.id}, roles = [${roleIds.join(", ")}]`);
            await user.roles.add(roleIds);
        } else {
            const currentUserRoles = await user.roles.fetch().then((roles) => roles.map((role) => role.id));

            winston.verbose(`Performing complete role listing for ${user.id}...`);
            const roleListing = await this.database.getCompleteRoleListingForUser(user.id)
                .then((rows) => rows.map((row) => ({value: row.id, belongs: row.belongs === 1})));

            const patches = computeArrayPatches(currentUserRoles, roleListing);
            winston.verbose(`Current roles of ${user.id}    : [${currentUserRoles.join(", ")}]`);
            winston.verbose(`Roles to remove from ${user.id}: [${patches.remove.join(", ")}]`);
            winston.verbose(`Roles to add to ${user.id}     : [${patches.add.join(", ")}]`);

            await Promise.all([
                user.roles.remove(patches.remove, "Updating associated roles"),
                user.roles.add(patches.add, "Updating associated roles")
            ]);
        }
    }
}
