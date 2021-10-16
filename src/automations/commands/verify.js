import {
    SlashCommandBuilder,
    SlashCommandNumberOption,
    SlashCommandRoleOption,
    SlashCommandStringOption
} from "@discordjs/builders";

export default class VerifyCommand {
    constructor(application) {

    }

    isGlobal() {
        return true;
    }

    asBuilder() {
        return new SlashCommandBuilder()
            .setName("verify")
            .setDescription("Verifiziert einen Nutzer")
            .addStringOption((option) => option
                .setName("first-name")
                .setDescription("Vorname")
                .setRequired(true)
            )
            .addStringOption((option) => option
                .setName("second-name")
                .setDescription("Zweitname")
                .setRequired(false)
            )
            .addStringOption((option) => option
                .setName("surname")
                .setDescription("Nachname")
                .setRequired(true)
            );
    }

    async execute(interaction) {
        await interaction.deferReply({ephemeral: true});

        const firstName = interaction.options.get("first-name").value;
        const secondName = interaction.options.get("second-name")?.value ?? null;
        const surName = interaction.options.get("surname").value;
    }
}
