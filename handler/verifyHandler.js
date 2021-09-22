import { MessageEmbed } from "discord.js";
import { deleteMessage } from "../automations/messageManager.js";
import { fetchFromDB, db } from "./databaseHandler.js";
import { userVerify } from "./userHandler.js";
import { errorColor, helpColor, verifyColor, infoColor } from "../globalVars.js";

// Join-Handler
export async function joinHandler(member, bot, config) {
    // check if the user-id is already in the database, if it is add him/her the student-role and her/his class
    const inDatabase = fetchFromDB(
        "SELECT user_id FROM verified_students WHERE user_id = :userID", { userID: member.id }
    )

    if (inDatabase) {
        const [ studentFirstName, studentLastName, studentClass, studentAktivTeam ] = fetchFromDB(
            "SELECT first_name, last_name, class, aktiv_team FROM verified_students WHERE user_id = :userID",
            { userID: member.id }
        )

        if (!studentFirstName || !studentLastName || !studentClass) {
            
            // show this error in the audit-log

            console.log("Database has a leck of data !!!")
            return;
        }

        userVerify(member, studentFirstName, studentLastName, studentClass, studentAktivTeam, bot)
        return;
    }

    // send the verify message via dm if it works
    try {
        // set the embed up
        const verifyEmbed = new MessageEmbed()
            .setColor(verifyColor)
            .setTitle("Verifizieren")
            .setDescription("Bitte verifiziere dich, indem du **hier** deinen **vollen Namen** (wenn vorhanden auch deinen Zweitnamen) hineinschreibst. \n\n**Zum Beispiel ⇒** \`Max Manuel Mustermann\`")
            .setFooter("Dies ist notwendig, um zu prüfen, ob du vom Humboldt Gymnasium bist")
            .setThumbnail("https://cdn.discordapp.com/attachments/577839440769318912/890260708980318278/HumboldtImage.png");

        // try send to user via dm
        const message = await member.send({ embeds: [ verifyEmbed ] }).catch(console.error);

        // react on the message only for design-terms
        await message.react("<a:verify:890276283483832410>")
    } catch (error) {
        console.log(error)
        // set error/does'nt work embed up
        const verifyInfoEmbed = new MessageEmbed()
            .setTitle("Verifizieren")
            .setDescription(`Bitte schreibe ${bot.user.mention} mit deinem **vollen Namen** an, um verifiziert zu werden!`)
            .setFooter("Dies ist notwendig, um zu prüfen, ob du vom Humboldt Gymnasium bist")
            .setThumbnail("https://cdn.discordapp.com/attachments/577839440769318912/890260708980318278/HumboldtImage.png");

        // send it into the "verify-info"-channel
        const verifyInfoChannel = await bot.channels.fetch(890265915315331122)

        const message = await verifyInfoChannel.send(member.mention, { embeds: [ verifyInfoEmbed ] })
        await message.react("<a:verify:890276283483832410>")

        // auto delete after 30 seconds
        await deleteMessage(message, 30)
    }

    // give the user-id of the author in queue ( in the database ) to make him ready for verifying
    console.log("queueifying the user-id")

    return;
}


