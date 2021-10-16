import {
    SlashCommandBuilder,
} from "@discordjs/builders";
import {CommonCommandOptions} from "./data/commonCommandOptions.js";

export default class VerifyCommand {
    constructor(application) {
        this.application = application;
    }

    isGlobal() {
        return true;
    }

    asBuilder() {
        return new SlashCommandBuilder()
            .setName("verify")
            .setDescription("Verifies a user")
            .addStringOption(CommonCommandOptions.firstNameOption)
            .addStringOption(CommonCommandOptions.surnameOption)
            .addStringOption(CommonCommandOptions.secondNameOption);
    }

    async execute(interaction) {
        await interaction.deferReply({ephemeral: true});

        const firstName = interaction.options.get("first-name").value;
        const secondName = interaction.options.get("second-name")?.value ?? null;
        const surName = interaction.options.get("surname").value;

        await this.application.userManager.interactiveVerification(interaction, firstName, secondName, surName);
    }
}
