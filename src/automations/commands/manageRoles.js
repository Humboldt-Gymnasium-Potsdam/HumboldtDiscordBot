import {
    SlashCommandBuilder,
    SlashCommandNumberOption,
    SlashCommandRoleOption,
    SlashCommandStringOption
} from "@discordjs/builders";
import winston from "winston";
import {resolveTemplateString} from "../../support/configLoader.js";
import {MessageActionRow, MessageButton} from "discord.js";
import {formatError} from "../../util/util.js";

export default class ManageRolesCommand {
    constructor(application) {
        this.config = application.config;
        this.bot = application.bot;
        this.database = application.database;
    }

    asBuilder() {
        const roleOption = new SlashCommandRoleOption()
            .setName("role")
            .setDescription("The role to import")
            .setRequired(true);

        const teamNameOption = new SlashCommandStringOption()
            .setName("team-name")
            .setDescription("The name of the team")
            .setRequired(true);

        const yearOption = new SlashCommandNumberOption()
            .setName("year")
            .setDescription("The year this role belongs to")
            .setRequired(true);

        const classOption = new SlashCommandStringOption()
            .setName("class")
            .setDescription("The class this role belongs to")
            .setRequired(false);

        return new SlashCommandBuilder()
            .setName("manage-roles")
            .setDescription("Allows changing the properties of roles associated with teams and years")
            .setDefaultPermission(false)
            .addSubcommandGroup((group) => group
                .setName("import")
                .setDescription("Imports an existing role into the system")
                .addSubcommand((command) => command
                    .setName("team")
                    .setDescription("Imports a team role")
                    .addRoleOption(roleOption)
                    .addStringOption(teamNameOption)
                )
                .addSubcommand((command) => command
                    .setName("year")
                    .setDescription("Imports a year or class role")
                    .addRoleOption(roleOption)
                    .addNumberOption(yearOption)
                    .addStringOption(classOption)
                )
            )
            .addSubcommandGroup((group) => group
                .setName("create")
                .setDescription("Creates a new role and imports it into the system")
                .addSubcommand((command) => command
                    .setName("team")
                    .setDescription("Creates a team role")
                    .addStringOption(teamNameOption)
                )
                .addSubcommand((command) => command
                    .setName("year")
                    .setDescription("Creates a year or class role")
                    .addNumberOption(yearOption)
                    .addStringOption(classOption)
                )
            )
            .addSubcommandGroup((group) => group
                .setName("delete")
                .setDescription("Deletes a role and its database entry")
                .addSubcommand((command) => command
                    .setName("team")
                    .setDescription("Deletes a team")
                    .addStringOption(teamNameOption)
                )
                .addSubcommand((command) => command
                    .setName("year")
                    .setDescription("Deletes a year or class role")
                    .addNumberOption(yearOption)
                    .addStringOption(classOption)
                )
            );
    }

    getRequiredPermissions() {
        return ["manageRoles"];
    }

    async execute(interaction) {
        await interaction.deferReply({ephemeral: true});

        const subcommandGroup = interaction.options.getSubcommandGroup();

        switch (subcommandGroup) {
            case "create":
                await this.performCreationOrImport(interaction, true);
                break;

            case "import":
                await this.performCreationOrImport(interaction, false);
                break;

            case "delete":
                await this.performRoleDeletion(interaction);
                break;

            default:
                winston.error(`Received invalid subcommand group ${subcommandGroup}`);
                await interaction.editReply(`Internal error, invalid subcommand group received!`);
                break;
        }
    }

    async performCreationOrImport(interaction, create) {
        const {isTeam, name, year} = this.gatherInteractionData(interaction);

        if (isTeam) {
            const teamData = await this.database.getTeamData(name);

            if (teamData != null) {
                await interaction.editReply(`A team with this name exists already and has the group <@&${teamData.id}>`);
                return;
            }
        } else {
            const classData = name != null ?
                await this.database.getYearAndClassData(year, name) :
                await this.database.getYearData(year);

            if (classData != null) {
                await interaction.editReply(`A ${name != null ? "class" : "year"} with this name exists already and has the group <@&${classData.id}>`);
                return;
            }

            if(name != null && name.length > 1) {
                await interaction.editReply(`Class should only be a single letter, typically A, B, C or L`);
                return;
            }
        }

        const role = create ?
            await this.createRole(interaction, isTeam, name, year) :
            await this.importRole(interaction, interaction.options.get("role").value, isTeam, name, year);

        winston.verbose(`Role creation or import for role ${role.id} succeeded, importing into database...`);
        if (isTeam) {
            await this.database.importTeamRole(role.id, name);
        } else {
            await this.database.importYearRole(role.id, year, name);
        }

        if (create) {
            await interaction.editReply(`<@&${role.id}> has been created and imported into the database!`);
        } else {
            await interaction.editReply(`<@&${role.id}> has been imported into the database!`);
        }
    }

    async createRole(interaction, isTeam, name, year) {
        const roleName = this.resolveRoleTemplate(isTeam, name, year);

        winston.debug(`Creating role ${roleName}, isTeam = ${isTeam}, name = ${name}, year = ${year}`);

        return await interaction.guild.roles.create({
            name: roleName,
            reason: `Creating role for user association as requested by <@!${interaction.user.id}>`
        });
    }

    async importRole(interaction, roleId, isTeam, name, year) {
        const roleName = this.resolveRoleTemplate(isTeam, name, year);

        winston.debug(`Importing role ${roleId} as ${roleName}, isTeam = ${isTeam}, name = ${name}, year = ${year}`);

        return await interaction.guild.roles.edit(
            roleId,
            {
                name: roleName,
                reason: `Updating role name to match template as requested by <@!${interaction.user.id}>`
            }
        );
    }

    resolveRoleTemplate(isTeam, name, year) {
        const templateProperties = {name, year};

        const templateName = isTeam ? "team" : name != null ? "class" : "year";
        return resolveTemplateString(this.config, "roles", "nameTemplates", templateName, templateProperties);
    }

    async performRoleDeletion(interaction) {
        const {isTeam, name, year} = this.gatherInteractionData(interaction);

        let deletionTarget;

        if (isTeam) {
            const teamData = await this.database.getTeamData(name);

            if (teamData == null) {
                await interaction.editReply(`No team with this name exists!`);
                return;
            }

            deletionTarget = teamData.id;
        } else {
            const classData = name != null ?
                await this.database.getYearAndClassData(year, name) :
                await this.database.getYearData(year);

            if (classData == null) {
                await interaction.editReply(`No ${name != null ? "class" : "year"} with this name exists!`);
                return;
            }

            deletionTarget = classData.id;
        }

        const actionRow = new MessageActionRow()
            .addComponents(
                new MessageButton()
                    .setCustomId(`cancel`)
                    .setLabel("Cancel")
                    .setStyle("SECONDARY"),
                new MessageButton()
                    .setCustomId(`delete-including-role`)
                    .setLabel("Delete including role")
                    .setStyle("DANGER"),
                new MessageButton()
                    .setCustomId(`delete-without-role`)
                    .setLabel("Delete without role")
                    .setStyle("DANGER")
            );

        const message = await interaction.editReply({
            content: `Are you sure you want to delete <@&${deletionTarget}>? You have 60 seconds to confirm.`,
            components: [actionRow]
        });

        await message.awaitMessageComponent({componentType: "BUTTON", time: 60000}).then(async (buttonInteraction) => {
            if (buttonInteraction.customId === "cancel") {
                await buttonInteraction.update("Deletion cancelled!");
                return;
            }

            const deleteRole = buttonInteraction.customId === "delete-including-role";
            await buttonInteraction.deferUpdate();

            if (deleteRole) {
                buttonInteraction.guild.roles.fetch(deletionTarget).then((role) => {
                    if (role) {
                        return role.delete(`Deleting role as requested by <@!${buttonInteraction.user.id}>`);
                    }

                    return Promise.reject(new Error(`Role with id ${deletionTarget} not found`));
                }).catch((err) => {
                    winston.error(`Failed to delete role ${deletionTarget}:\n${formatError(err)}`);
                    buttonInteraction.followUp({
                        content: `Deleting the role <@&${deletionTarget}> failed, you might need to manually delete it if it still exists`,
                        ephemeral: true
                    });
                });
            }

            if (isTeam) {
                await this.database.deleteTeam(name);
            } else if (name != null) {
                await this.database.deleteYearAndClass(year, name);
            } else {
                await this.database.deleteYear(year);
            }

            await buttonInteraction.editReply({
                content: `${isTeam ? "Team " : name != null ? "Class " : "Year "}${deleteRole ? "and" +
                    " role have" : "has"} been deleted!`,
                components: []
            });
        }).catch(async (err) => {
            if (err.code === "INTERACTION_COLLECTOR_ERROR") {
                winston.debug(`Deleting role deletion reply as user did not interact within 60 seconds: ${err}`);
                await interaction.editReply({
                    content: "You did not interact within 60 seconds, action cancelled.",
                    components: []
                });
                return;
            }

            throw err;
        });
    }

    gatherInteractionData(interaction) {
        const isTeam = interaction.options.getSubcommand() === "team";

        const name = isTeam ? interaction.options.get("team-name").value : interaction.options.get("class")?.value;
        const year = isTeam ? null : interaction.options.get("year").value;

        return {isTeam, name, year};
    }
}
