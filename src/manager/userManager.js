import winston from "winston";
import {computeArrayPatches} from "../util/util.js";
import {MessageEmbed, MessageActionRow, MessageButton} from "discord.js";

export class UserManager {
    constructor(application) {
        this.config = application.config;
        this.bot = application.bot;
        this.database = application.database;
    }

    async afterJoinHandler(user) {
        const studentData = await this.database.getStudentDataForUser(user.id);

        if (studentData != null) {
            await this.applyVerifiedData(user,  studentData);
            return;
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

    async interactiveVerification(interaction, firstName, secondName, surname) {
        const userId = interaction.user.id;

        if (await this.database.getStudentDataForUser(userId) != null) {
            await interaction.editReply("Du bist bereits verifiziert!");
            return;
        }

        let studentData = await this.database.findStudent(firstName, secondName, surname);
        let withoutSecondName = false;

        if (studentData == null) {
            studentData = await this.database.findStudent(firstName, null, surname);
            withoutSecondName = true;
        }

        if (studentData == null) {
            if (secondName == null) {
                await interaction.editReply("Leider kann ich dich nicht finden. Stelle sicher, dass du " +
                    "deinen Namen richtig geschrieben hast, und wenn vorhanden, auch deinen Zweitnamen angibst.");
            } else {
                await interaction.editReply("Leider kann ich dich nicht finden. Stelle sicher, dass du " +
                    "deinen Namen richtig geschrieben hast.");
            }
            return;
        } else if(studentData.userId != null) {
            await interaction.editReply("Unter diesem Namen ist schon ein Nutzer registriert. Bitte wende dich " +
                "an einen Administrator, wenn das nicht richtig ist!");
            return;
        }

        const verifyEmbed = new MessageEmbed()
            .setColor(this.config.colors.verifyEmbed)
            .setTitle("Verifizieren")
            .setDescription("Ok, bitte überprüfe ob diese Daten richtig sind:")
            .setFooter("Falls du Fragen hast, wende dich an einen Moderator.")
            .setThumbnail("https://cdn.discordapp.com/attachments/577839440769318912/890260708980318278/HumboldtImage.png");

        verifyEmbed.addField("Vorname", firstName);
        if (secondName != null) {
            verifyEmbed.addField("Zweitname", secondName);
        }
        verifyEmbed.addField("Nachname", surname);
        verifyEmbed.addField("Klassenstufe", studentData.year.toString(), true);

        if(studentData["class"] != null && studentData["class"].length > 0) {
            verifyEmbed.addField("Klasse", studentData["class"], true);
        }

        if (withoutSecondName) {
            verifyEmbed.addField("Warnung", "Dein Nachname wurde weggelassen, weil ich diesen nicht kenne.\n" +
                "Sollten diese Informationen nicht korrekt sein, wende dich bitte an einen Administrator!");
        }

        const components = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setLabel("Ja, das bin ich")
                    .setCustomId("confirm")
                    .setStyle("SUCCESS"),
                new MessageButton()
                    .setLabel("Nein, das bin ich nicht")
                    .setCustomId("cancel")
                    .setStyle("DANGER")
            );

        const message = await interaction.editReply({
            embeds: [verifyEmbed],
            components: [components]
        });

        await message.awaitMessageComponent({ componentType: "BUTTON", time: 360000 }).then(async (buttonInteraction) => {
            if(buttonInteraction.customId === "cancel") {
                await buttonInteraction.update({
                    content: "Bitte überprüfe deine angegebenen Daten und nutze `/verify` noch einmal. Sollte das" +
                        " Problem weiterhin bestehen, wende dich bitte an einen Administrator.",
                    components: [],
                    embeds: []
                });
                return;
            }

            winston.info(`Successfully verified user ${interaction.user.id} with student id ${studentData.studentId}`);
            await buttonInteraction.deferUpdate();
            await this.database.completeVerification(interaction.user.id, studentData.studentId);

            let member;

            if (interaction.member != null) {
                member = interaction.member;
            } else {
                member = await this.bot.guilds.fetch()
                    .then((guilds) => guilds.first().fetch())
                    .then((guild) => guild.members.fetch(interaction.user));
            }

            await this.applyVerifiedData(member, studentData, member.roles.cache.size > 0);

            await buttonInteraction.editReply({
                content: "Alles klar, deine Rollen wurden dir zugewiesen. Viel Spaß!",
                components: [],
                embeds: []
            });
        }).catch(async (err) => {
            if (err.code === "INTERACTION_COLLECTOR_ERROR") {
                await interaction.editReply({
                    content: "Du hast nach einer Stunde nicht auf die Nachricht reagiert, bitte nutze `/verify` noch" +
                        " einmal, um es erneut zu versuchen.",
                    components: [],
                    embeds: []
                });
                return;
            }

            throw err;
        });
    }

    async reloadUserData(interaction, userId) {
        await interaction.deferReply({ephemeral: true});

        const studentData = await this.database.getStudentDataForUser(userId);
        if(studentData == null) {
            await interaction.editReply("This user is not verified, can't reload data!");
            return;
        }

        const user = await this.findMemberByUserId(userId);
        if(user == null) {
            await interaction.editReply("This user is currently not on this guild!");
            return;
        }

        await this.applyVerifiedData(user, studentData, true);
        await interaction.editReply("Data reloaded successfully!");
    }

    async applyVerifiedData(user, studentData, extensive = false) {
        const newNickname = `${studentData.firstName} ${studentData.secondName != null ? studentData.secondName + " " : ""}${studentData.surname}`;
        winston.debug(`Renaming verified user ${user.id} to ${newNickname}`);

        if(user.id !== user.guild.ownerId) {
            await user.setNickname(newNickname);
        }

        winston.debug(`Applying roles to user ${user.id}, extensive = ${extensive}`);
        if (!extensive) {
            const roleIdsObjs = await this.database.getRolesForUser(user.id);

            if(roleIdsObjs == null) {
                winston.warn(`User ${user.id} is verified, but has no roles to apply!`);
                return;
            }

            const roleIds = roleIdsObjs.map((obj) => obj.id);
            winston.verbose(`user = ${user.id}, roles = [${roleIds.join(", ")}]`);
            await user.roles.add(roleIds);
        } else {
            const currentUserRoles = await user.fetch().then((user) => user.roles.cache.map((role) => role.id));

            winston.verbose(`Performing complete role listing for ${user.id}...`);
            const roleListing = await this.database.getCompleteRoleListingForUser(user.id)
                .then((rows) => rows.map((row) => ({value: row.id, belongs: row.belongs === 1})));

            const patches = computeArrayPatches(currentUserRoles, roleListing);
            winston.verbose(`Current roles of ${user.id}    : [${currentUserRoles.join(", ")}]`);
            winston.verbose(`Roles to remove from ${user.id}: [${patches.remove.join(", ")}]`);
            winston.verbose(`Roles to add to ${user.id}     : [${patches.add.join(", ")}]`);

            await user.roles.remove(patches.remove, "Updating associated roles");
            await user.roles.add(patches.add, "Updating associated roles")
        }
    }

    async adjustTeamMembership(interaction, team, privileged, actionData) {
        await interaction.deferReply({ephemeral: true});

        const teamData = await this.database.getTeamData(team);
        if(teamData == null) {
            await interaction.editReply(`The team with the name ${team} does not exist!`);
            return;
        }

        if(!await this.completeActionData(interaction, actionData)) {
            return;
        }

        if(actionData.action === "join") {
            const targetMembership = await this.database.getTeamMembershipForStudent(actionData.studentId, team);
            if(targetMembership != null) {
                await interaction.editReply("This person is already part of the team!");
                return;
            }

            if(!privileged && !await this.checkCanManage(
                interaction.user.id,
                null,
                team,
                actionData.permissionLevel
            )) {
                await interaction.editReply("You don't have permission to perform this action!");
                return;
            }

            await this.database.joinStudentToTeam(actionData.studentId, team, actionData.permissionLevel);
            await interaction.editReply("The person has been successfully added to the team!");

            if(actionData.userId != null) {
                const member = await this.findMemberByUserId(actionData.userId);
                if(member == null) {
                    return;
                }

                await member.roles.add(teamData.id);
            }
        } else if(actionData.action === "remove") {
            const targetMembership = await this.database.getTeamMembershipForStudent(actionData.studentId, team);
            if(targetMembership == null) {
                await interaction.editReply("This person is not part of the team!");
                return;
            }

            if(!privileged && !await this.checkCanManage(
                interaction.user.id,
                targetMembership,
                team
            )) {
                await interaction.editReply("You don't have permission to perform this action!");
                return;
            }

            await this.database.removeStudentFromTeam(actionData.studentId, team);
            await interaction.editReply("The person has been successfully removed from the team!");

            if(actionData.userId != null) {
                const member = await this.findMemberByUserId(actionData.userId);
                if(member == null) {
                    return;
                }

                await member.roles.remove(teamData.id);
            }
        } else if(actionData.action === "setPermissionLevel") {
            const targetMembership = await this.database.getTeamMembershipForStudent(actionData.studentId, team);
            if(targetMembership == null) {
                await interaction.editReply("This person is not part of the team!");
                return;
            }

            if(!privileged && !await this.checkCanManage(
                interaction.user.id,
                targetMembership,
                team,
                actionData.permissionLevel
            )) {
                await interaction.editReply("You don't have permission to perform this action!");
                return;
            }

            await this.database.changeTeamPermissionLevel(actionData.studentId, team, actionData.permissionLevel);
            await interaction.editReply("The permission level for this person has been changed!");
        }
    }

    findMemberByUserId(userId) {
        return this.bot.guilds.fetch()
            .then((guilds) => guilds.first().fetch())
            .then((guild) => guild.members.fetch(userId))
            .catch((err) => {
                if(err.code === 10007 /* user not a member of guild */) {
                    return null;
                }

                throw err;
            });
    }

    async checkCanManage(managingUserId, targetMembership, team, targetPermissionLevel = 0) {
        const managingMembership = await this.database.getTeamMembershipForUser(managingUserId, team);
        if(managingMembership == null || managingMembership.permissionLevel < targetPermissionLevel + 1) {
            return false;
        }

        if(targetMembership == null) {
            return true;
        }

        return targetMembership.permissionLevel < managingMembership.permissionLevel;
    }

    async completeActionData(interaction, actionData) {
        if(actionData.userId != null) {
            const studentData = await this.database.getStudentDataForUser(actionData.userId);
            if(studentData == null) {
                await interaction.editReply(`The user <@!${actionData.userId}> is not verified!`);
                return false;
            }

            actionData.firstName = studentData.firstName;
            actionData.secondName = studentData.secondName;
            actionData.surname = studentData.surname;
            actionData.studentId = studentData.id;
        } else {
            const studentData = await this.database.findStudent(
                actionData.firstName,
                actionData.secondName,
                actionData.surname
            );

            if(studentData == null) {
                await interaction.editReply("This student could not be found!");
                return false;
            }

            actionData.studentId = studentData.studentId;
            actionData.userId = studentData.userId;
        }

        return true;
    }
}
