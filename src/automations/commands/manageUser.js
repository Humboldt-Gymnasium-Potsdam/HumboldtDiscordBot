import {
    SlashCommandBuilder,
    SlashCommandNumberOption,
    SlashCommandRoleOption,
    SlashCommandStringOption,
    SlashCommandUserOption
} from "@discordjs/builders";

export default class ManageUserCommand {
    constructor(application) {
        this.userManager = application.userManager;
    }

    asBuilder() {
        const teamOption = new SlashCommandStringOption()
            .setName("team")
            .setDescription("The team to target")
            .setRequired(true);

        const userOption = new SlashCommandUserOption()
            .setName("user")
            .setDescription("The user to target")
            .setRequired(true);

        const firstNameOption = new SlashCommandStringOption()
            .setName("first-name")
            .setDescription("The first name of the student")
            .setRequired(true);

        const surnameOption = new SlashCommandStringOption()
            .setName("surname")
            .setDescription("The surname of the student")
            .setRequired(true);

        const secondNameOption = new SlashCommandStringOption()
            .setName("second-name")
            .setDescription("The second name of the student, if any")
            .setRequired(false);

        const permissionLevelOption = new SlashCommandNumberOption()
            .setName("permission-level")
            .setDescription("The level of permissions the user should have")
            .addChoices([
                ["member", 0],
                ["trusted", 1],
                ["owner", 2]
            ])
            .setRequired(true);

        return new SlashCommandBuilder()
            .setName("manage-user")
            .setDescription("Manages users and their permissions and teams")
            .setDefaultPermission(false)
            .addSubcommandGroup((group) => group
                .setName("team")
                .setDescription("Manages the teams of the user")
                .addSubcommand((command) => command
                    .setName("join-user")
                    .setDescription("Joins a discord user to a team")
                    .addStringOption(teamOption)
                    .addUserOption(userOption)
                    .addNumberOption(permissionLevelOption)
                )
                .addSubcommand((command) => command
                    .setName("join-student")
                    .setDescription("Joins a student to a team")
                    .addStringOption(teamOption)
                    .addStringOption(firstNameOption)
                    .addStringOption(surnameOption)
                    .addNumberOption(permissionLevelOption)
                    .addStringOption(secondNameOption)
                )
                .addSubcommand((command) => command
                    .setName("remove-user")
                    .setDescription("Removes a discord user from a team")
                    .addStringOption(teamOption)
                    .addUserOption(userOption)
                )
                .addSubcommand((command) => command
                    .setName("remove-student")
                    .setDescription("Removes a student from a team")
                    .addStringOption(teamOption)
                    .addStringOption(firstNameOption)
                    .addStringOption(surnameOption)
                    .addStringOption(secondNameOption)
                )
                .addSubcommand((command) => command
                    .setName("set-user-permission-level")
                    .setDescription("Changes the permission level for a discord user")
                    .addStringOption(teamOption)
                    .addUserOption(userOption)
                    .addNumberOption(permissionLevelOption)
                )
                .addSubcommand((command) => command
                    .setName("set-student-permission-level")
                    .setDescription("Changes the permission level for a student")
                    .addStringOption(teamOption)
                    .addStringOption(firstNameOption)
                    .addStringOption(surnameOption)
                    .addNumberOption(permissionLevelOption)
                    .addStringOption(secondNameOption)
                )
            )
            .addSubcommand((command) => command
                .setName("reload-data")
                .setDescription("Reloads the roles and user name for a user")
                .addUserOption(userOption)
            )
    }

    getRequiredPermissions() {
        return ["manage"];
    }

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        if(subcommand === "reload-data") {
            await this.userManager.reloadUserData(interaction, interaction.options.get("user").value);
            return;
        }

        const subcommandGroup = interaction.options.getSubcommandGroup();

        if(subcommandGroup === "team") {
            const actionData = {};
            const team = interaction.options.get("team").value;

            switch (subcommand) {
                case "join-user":
                    actionData.action = "join";
                    actionData.userId = interaction.options.get("user").value;
                    actionData.permissionLevel = interaction.options.get("permission-level").value;
                    break;

                case "join-student":
                    actionData.action = "join";
                    actionData.firstName = interaction.options.get("first-name").value;
                    actionData.secondName = interaction.options.get("second-name")?.value;
                    actionData.surname = interaction.options.get("surname").value;
                    actionData.permissionLevel = interaction.options.get("permission-level").value;
                    break;

                case "remove-user":
                    actionData.action = "remove";
                    actionData.userId = interaction.options.get("user").value;
                    break;

                case "remove-student":
                    actionData.action = "remove";
                    actionData.firstName = interaction.options.get("first-name").value;
                    actionData.secondName = interaction.options.get("second-name")?.value;
                    actionData.surname = interaction.options.get("surname").value;
                    break;

                case "set-user-permission-level":
                    actionData.action = "setPermissionLevel";
                    actionData.userId = interaction.options.get("user").value;
                    actionData.permissionLevel = interaction.options.get("permission-level").value;
                    break;

                case "set-student-permission-level":
                    actionData.action = "setPermissionLevel";
                    actionData.firstName = interaction.options.get("first-name").value;
                    actionData.secondName = interaction.options.get("second-name")?.value;
                    actionData.surname = interaction.options.get("surname").value;
                    actionData.permissionLevel = interaction.options.get("permission-level").value;
                    break;
            }

            await this.userManager.adjustTeamMembership(interaction, team, true, actionData);
        }
    }
}
