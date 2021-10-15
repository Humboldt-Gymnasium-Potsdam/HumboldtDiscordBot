import {
    SlashCommandBuilder,
    SlashCommandNumberOption,
    SlashCommandRoleOption,
    SlashCommandStringOption
} from "@discordjs/builders";
import winston from "winston";
import {resolveTemplateString} from "../../support/configLoader.js";

export default class ManageRolesCommand {
    constructor(config, bot, database) {
        this.config = config;
        this.bot = bot;
        this.database = database;
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
                await interaction.editReply("Role has been created and imported into the database!");
                break;

            case "import":
                await this.performCreationOrImport(interaction, false);
                await interaction.editReply("Role has been imported into the database!");
                break;

            default:
                winston.error(`Received invalid subcommand group ${subcommandGroup}`);
                await interaction.editReply(`Internal error, invalid subcommand group received!`);
                break;
        }
    }

    async performCreationOrImport(interaction, create) {
        const isTeam = interaction.options.getSubcommand() === "team";

        const name = isTeam ? interaction.options.get("team-name").value : interaction.options.get("class")?.value;
        const year = isTeam ? null : interaction.options.get("year").value;
        const role = create ?
            await this.createRole(interaction, isTeam, name, year) :
            await this.importRole(interaction, interaction.options.get("role").value, isTeam, name, year);

        winston.verbose(`Role creation or import for role ${role.id} succeeded, importing into database...`);
        if (isTeam) {
            await this.database.importTeamRole(role.id, name);
        } else {
            await this.database.importYearRole(role.id, year, name);
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
}
