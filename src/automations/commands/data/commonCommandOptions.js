import {SlashCommandNumberOption, SlashCommandStringOption, SlashCommandUserOption} from "@discordjs/builders";

export class CommonCommandOptions {
    static get userOption() {
        return new SlashCommandUserOption()
            .setName("user")
            .setDescription("The user to target")
            .setRequired(true);
    }

    static get teamOption() {
        return new SlashCommandStringOption()
            .setName("team")
            .setDescription("The team to target")
            .setRequired(true);
    }

    static get firstNameOption() {
        return new SlashCommandStringOption()
            .setName("first-name")
            .setDescription("The first name of the student")
            .setRequired(true);
    }

    static get secondNameOption() {
        return new SlashCommandStringOption()
            .setName("second-name")
            .setDescription("The second name of the student, if any")
            .setRequired(false);
    }

    static get surnameOption() {
        return new SlashCommandStringOption()
            .setName("surname")
            .setDescription("The surname of the student")
            .setRequired(true);
    }

    static get permissionLevelOption() {
        return new SlashCommandNumberOption()
            .setName("permission-level")
            .setDescription("The level of permissions the user should have")
            .addChoices([
                ["member", 0],
                ["trusted", 1],
                ["owner", 2]
            ])
            .setRequired(false);
    }
}
