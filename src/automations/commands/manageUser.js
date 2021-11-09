import {
    SlashCommandBuilder
} from "@discordjs/builders";
import {CommonCommandOptions} from "./data/commonCommandOptions.js";

export default class ManageUserCommand {
    constructor(application) {
        this.userManager = application.userManager;
    }

    asBuilder() {
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
                    .addStringOption(CommonCommandOptions.teamOption)
                    .addUserOption(CommonCommandOptions.userOption)
                    .addNumberOption(CommonCommandOptions.permissionLevelOption)
                )
                .addSubcommand((command) => command
                    .setName("join-student")
                    .setDescription("Joins a student to a team")
                    .addStringOption(CommonCommandOptions.teamOption)
                    .addStringOption(CommonCommandOptions.firstNameOption)
                    .addStringOption(CommonCommandOptions.surnameOption)
                    .addNumberOption(CommonCommandOptions.permissionLevelOption)
                    .addStringOption(CommonCommandOptions.secondNameOption)
                )
                .addSubcommand((command) => command
                    .setName("remove-user")
                    .setDescription("Removes a discord user from a team")
                    .addStringOption(CommonCommandOptions.teamOption)
                    .addUserOption(CommonCommandOptions.userOption)
                )
                .addSubcommand((command) => command
                    .setName("remove-student")
                    .setDescription("Removes a student from a team")
                    .addStringOption(CommonCommandOptions.teamOption)
                    .addStringOption(CommonCommandOptions.firstNameOption)
                    .addStringOption(CommonCommandOptions.surnameOption)
                    .addStringOption(CommonCommandOptions.secondNameOption)
                )
                .addSubcommand((command) => command
                    .setName("set-user-permission-level")
                    .setDescription("Changes the permission level for a discord user")
                    .addStringOption(CommonCommandOptions.teamOption)
                    .addUserOption(CommonCommandOptions.userOption)
                    .addNumberOption(CommonCommandOptions.permissionLevelOption.setRequired(true))
                )
                .addSubcommand((command) => command
                    .setName("set-student-permission-level")
                    .setDescription("Changes the permission level for a student")
                    .addStringOption(CommonCommandOptions.teamOption)
                    .addStringOption(CommonCommandOptions.firstNameOption)
                    .addStringOption(CommonCommandOptions.surnameOption)
                    .addNumberOption(CommonCommandOptions.permissionLevelOption.setRequired(true))
                    .addStringOption(CommonCommandOptions.secondNameOption)
                )
            )
            .addSubcommand((command) => command
                .setName("reload-data")
                .setDescription("Reloads the roles and user name for a user or everyone")
                .addUserOption(CommonCommandOptions.userOption.setRequired(false))
            )
    }

    getRequiredPermissions() {
        return ["manage"];
    }

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        if(subcommand === "reload-data") {
            const user = interaction.options.get("user");

            if(user != null) {
                await this.userManager.reloadUserData(interaction, interaction.options.get("user").value);
            } else {
                await this.userManager.reloadAllUserData(interaction, interaction.guild);
            }
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
                    actionData.permissionLevel = interaction.options.get("permission-level")?.value ?? 0;
                    break;

                case "join-student":
                    actionData.action = "join";
                    actionData.firstName = interaction.options.get("first-name").value;
                    actionData.secondName = interaction.options.get("second-name")?.value;
                    actionData.surname = interaction.options.get("surname").value;
                    actionData.permissionLevel = interaction.options.get("permission-level")?.value ?? 0;
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
