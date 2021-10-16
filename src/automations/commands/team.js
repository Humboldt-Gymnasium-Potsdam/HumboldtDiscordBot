import {
    SlashCommandBuilder
} from "@discordjs/builders";
import {CommonCommandOptions} from "./data/commonCommandOptions.js";

export default class TeamCommand {
    constructor(application) {
        this.userManager = application.userManager;
    }

    asBuilder() {
        return new SlashCommandBuilder()
            .setName("team")
            .setDescription("Allows to manage team members")
            .addSubcommand((command) => command
                .setName("add-user")
                .setDescription("Adds a discord user to the team")
                .addStringOption(CommonCommandOptions.teamOption)
                .addUserOption(CommonCommandOptions.userOption)
                .addNumberOption(CommonCommandOptions.permissionLevelOption)
            )
            .addSubcommand((command) => command
                .setName("add-student")
                .setDescription("Adds a student to the team")
                .addStringOption(CommonCommandOptions.teamOption)
                .addStringOption(CommonCommandOptions.firstNameOption)
                .addStringOption(CommonCommandOptions.surnameOption)
                .addNumberOption(CommonCommandOptions.permissionLevelOption)
                .addStringOption(CommonCommandOptions.secondNameOption)
            )
            .addSubcommand((command) => command
                .setName("remove-user")
                .setDescription("Removes a discord user from the team")
                .addStringOption(CommonCommandOptions.teamOption)
                .addUserOption(CommonCommandOptions.userOption)
            )
            .addSubcommand((command) => command
                .setName("remove-student")
                .setDescription("Removes a student from the team")
                .addStringOption(CommonCommandOptions.teamOption)
                .addStringOption(CommonCommandOptions.firstNameOption)
                .addStringOption(CommonCommandOptions.surnameOption)
                .addStringOption(CommonCommandOptions.secondNameOption)
            )
            .addSubcommand((command) => command
                .setName("set-user-permission-level")
                .setDescription("Sets the permission level of a discord user in the team")
                .addStringOption(CommonCommandOptions.teamOption)
                .addUserOption(CommonCommandOptions.userOption)
                .addNumberOption(CommonCommandOptions.permissionLevelOption.setRequired(true))
            )
            .addSubcommand((command) => command
                .setName("set-student-permission-level")
                .setDescription("Sets the permission level of a student in the team")
                .addStringOption(CommonCommandOptions.teamOption)
                .addStringOption(CommonCommandOptions.firstNameOption)
                .addStringOption(CommonCommandOptions.surnameOption)
                .addNumberOption(CommonCommandOptions.permissionLevelOption.setRequired(true))
                .addStringOption(CommonCommandOptions.secondNameOption)
            );
    }

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        const actionData = {};
        const team = interaction.options.get("team").value;

        switch (subcommand) {
            case "add-user":
                actionData.action = "join";
                actionData.userId = interaction.options.get("user").value;
                actionData.permissionLevel = interaction.options.get("permission-level")?.value ?? 0;
                break;

            case "add-student":
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

        await this.userManager.adjustTeamMembership(interaction, team, false, actionData);
    }
}
