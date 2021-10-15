import {SlashCommandBuilder, SlashCommandRoleOption} from "@discordjs/builders";

const TeamOrYear = {
    TEAM: 0,
    YEAR: 1
};

export default class ManageRolesCommand {
    constructor(config, bot) {
        this.config = config;
        this.bot = bot;
    }

    asBuilder() {
        const roleIdOption = new SlashCommandRoleOption()
            .setName("role")
            .setDescription("The role to import")
            .setRequired(true);

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
                    .addRoleOption(roleIdOption)
                    .addStringOption((option) => option
                        .setName("team-name")
                        .setDescription("The name of the team to import the role for")
                        .setRequired(true)
                    )
                )
                .addSubcommand((command) => command
                    .setName("year")
                    .setDescription("Imports a year role")
                    .addRoleOption(roleIdOption)
                    .addStringOption((option) => option
                        .setName("year")
                        .setDescription("The year the role belongs to")
                        .setRequired(true)
                    )
                    .addStringOption((option) => option
                        .setName("class")
                        .setDescription("The class the role belongs to")
                        .setRequired(false)
                    )
                )
            );
    }

    getRequiredPermissions() {
        return ["manageRoles"];
    }
}
