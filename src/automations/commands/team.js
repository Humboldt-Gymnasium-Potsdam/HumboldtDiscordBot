import {
    SlashCommandBuilder,
    SlashCommandNumberOption,
    SlashCommandRoleOption,
    SlashCommandStringOption
} from "@discordjs/builders";

export default class TeamCommand {
    constructor(application) {
    }

    asBuilder() {
        const teamOption = new SlashCommandStringOption()
            .setName("team")
            .setDescription("The team to manage")
            .setRequired(true);

        return new SlashCommandBuilder()
            .setName("team")
            .setDescription("Allows to manage team members")
            .addSubcommand((command) => command
                .setName("add")
                .setDescription("Adds a user to the team")
            )
            .addSubcommand((command) => command
                .setName("remove")
                .setDescription("Removes a user from the team")
            );
    }
}
