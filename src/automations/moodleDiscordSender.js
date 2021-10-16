import * as Discord from "discord.js";
import {TableInformation} from "../moodle/moodleData.js";
import winston from "winston";
import {formatError} from "../util/util.js";

export class MoodleDiscordSender {
    static processClassPing(input, config) {
        const rolePing = config.roles.classes[input];

        if (rolePing) {
            return `<@&${rolePing.class}>`;
        } else {
            return input;
        }
    }

    constructor(application) {
        this.config = application.config;
        this.client = application.bot;
    }

    generateMoodleMessage(data) {
        return `
Vertretungsplan für ${data.timeInfo.dayName}, den ${data.timeInfo.dayNumerical}.${data.timeInfo.monthNumerical} ${data.timeInfo.week}-Woche

Ordnungsdienste:
    - Diese Woche: ${MoodleDiscordSender.makeProperServiceInfo(data.properService.classThisWeek, data.properService.teacherThisWeek)}
    - Nächste Woche: ${MoodleDiscordSender.makeProperServiceInfo(data.properService.classNextWeek, data.properService.teacherNextWeek)}

Aufstuhlung: ${MoodleDiscordSender.makeChairServiceInfo(data, this.config)}

${data.extraText.length > 0 ? "__" + data.extraText + "__" : ""}

Vertretungen:
${(() => {
            return data.lessons.map((lesson) => {
                let lessonBuffer = "";
                lessonBuffer += `${
                    lesson.classes.split(",").map((s) => MoodleDiscordSender.processClassPing(s.trim(), this.config))
                }: ${lesson.lessons} ${lesson.newSubject} mit ${lesson.newTeacher}`;

                if (lesson.room.length > 0) {
                    lessonBuffer += ` in ${lesson.room}`;
                }

                if (lesson.info.length > 0) {
                    lessonBuffer += ` => ${lesson.info}`;
                }

                return lessonBuffer;
            }).join("\n");
        })()}

Zuletzt aktualisiert: <t:${Math.floor(data.processedAt.toDate().getTime() / 1000)}>
`.trim();
    }

    moodleDataReceived(data) {
        return this.sendMessageToMoodleChannels(data);
    }

    moodleError(error) {
        return this.sendMessageToMoodleChannels(formatError(error));
    }

    async sendMessageToMoodleChannels(data) {
        if (!this.config.channels.moodle) {
            return;
        }

        const guild = await this.client.guilds.fetch().then((guilds) => guilds.first());

        const channel = await (await guild.fetch()).channels.fetch()
            .then((channels) =>
                channels.find((v) => v.id === this.config.channels.moodle));

        if (!channel) {
            winston.warn(`Could not find channel ${this.config.channels.moodle} on guild ${guild.id}`);
        } else if (channel.type !== "GUILD_TEXT") {
            winston.warn(`Channel ${channel.id} has type ${channel.type}, expected text`);
        } else {
            const messages = (() => {
                let split;
                if (data instanceof TableInformation) {
                    split = Discord.Util.splitMessage(this.generateMoodleMessage(data));
                } else {
                    split = Discord.Util.splitMessage(data);
                }
                if (Array.isArray(split)) {
                    return split;
                } else {
                    return [split];
                }
            })();

            const botMarker = this.generateBotMarker(messages,
                data instanceof TableInformation ? data : undefined);

            await this.updateMoodleMessages(
                channel,
                messages,
                botMarker,
                data instanceof TableInformation ? data.timeInfo.dayNumerical : -1,
                data instanceof TableInformation ? data.timeInfo.monthNumerical : -1
            );
        }

    }

    generateBotMarker(messages, data) {
        if (data) {
            return `BOT-MARKER:${data.timeInfo.dayNumerical}:${data.timeInfo.monthNumerical}:${messages.length}:BOT-MARKER`;
        } else {
            return this.lastBotMarker || `BOT-MARKER:ERROR:ERROR:${messages.length}:BOT-MARKER`;
        }
    }

    static makeProperServiceInfo(clazz, teacher) {
        if (clazz.length < 1 && teacher.length < 1) {
            return "_Keine Angabe_";
        } else if (clazz.length < 1) {
            return teacher;
        } else if (teacher.length < 1) {
            return clazz;
        } else {
            return `${clazz} mit ${teacher}`;
        }
    }

    static makeChairServiceInfo(data, config) {
        if (data.chairService.clazz.length < 1) {
            return "_Keine Angabe_";
        }

        return `${MoodleDiscordSender.processClassPing(data.chairService.clazz, config)} nach ${data.chairService.subject} mit ${data.chairService.teacher}`;
    }

    async updateMoodleMessages(
        channel,
        messages,
        botMarker,
        currentDay,
        currentMonth
    ) {
        const lastMessages = await channel.messages.fetch({limit: 20});

        const lastBotMessage = lastMessages.find((message) => message.author === this.client.user
            && message.content.trim().endsWith(":BOT-MARKER"));
        if (!lastBotMessage) {
            return await this.rewriteMoodleMessages(channel, messages, botMarker);
        }

        // 0: BOT-MARKER
        // 1: <data.timeInfo.dayNumerical>
        // 2: <data.timeInfo.monthNumerical>
        // 3: <messages.length>
        // 4: BOT-MARKER
        const botMarkerParts = lastBotMessage.content.substr(lastBotMessage.content.indexOf("BOT-MARKER:")).split(":");
        if (botMarkerParts.length !== 5) {
            winston.warn(`Found invalid bot marker ${botMarkerParts} in message ${lastBotMessage.id}`);
            return await this.rewriteMoodleMessages(channel, messages, botMarker, lastBotMessage);
        }

        let messageCount;
        if (botMarkerParts[1] === "ERROR") {
            messageCount = parseInt(botMarkerParts[3], 10);
        } else {
            const day = parseInt(botMarkerParts[1], 10);
            const month = parseInt(botMarkerParts[2], 10);
            messageCount = parseInt(botMarkerParts[3], 10);

            if (day !== currentDay || month !== currentMonth) {
                return await this.rewriteMoodleMessages(channel, messages, botMarker, lastBotMessage);
            }
        }

        const lastMoodleMessages = await channel.messages.fetch({
            limit: messageCount,
            before: lastBotMessage.id
        });

        if (!lastMoodleMessages.every((message) => message.author === this.client.user)) {
            for (const message of lastMoodleMessages.values()) {
                if (message.author === this.client.user && message.deletable) {
                    await message.delete();
                }
            }
            return await this.rewriteMoodleMessages(channel, messages, botMarker, lastBotMessage);
        }
        return await this.rewriteMoodleMessages(
            channel,
            messages,
            botMarker,
            lastBotMessage,
            [...lastMoodleMessages.values()].reverse()
        );
    }

    async rewriteMoodleMessages(
        channel,
        messages,
        botMarker,
        botMarkerMessage,
        existingMessages
    ) {
        if (botMarkerMessage && (!botMarkerMessage.editable || !botMarkerMessage.deletable)) {
            return await this.rewriteMoodleMessages(channel, messages, botMarker);
        }

        if (existingMessages) {
            let editedCount = 0;
            for (let i = 0; i < existingMessages.length && i < messages.length; i++) {
                await existingMessages[i].edit(messages[i]);
                editedCount++;
            }

            if (existingMessages.length !== messages.length) {
                if (editedCount < messages.length) {
                    // we need additional messages
                    if (botMarkerMessage) {
                        await botMarkerMessage.delete();
                        botMarkerMessage = undefined;
                    }

                    for (let i = editedCount; i < messages.length; i++) {
                        await channel.send(messages[i]);
                    }
                } else {
                    // we have too many messages
                    let diff = existingMessages.length - messages.length;
                    while (diff--) {
                        await existingMessages.pop().delete();
                    }
                }
            }
        } else {
            if (botMarkerMessage) {
                await botMarkerMessage.delete();
                botMarkerMessage = undefined;
            }

            for (const message of messages) {
                await channel.send(message);
            }
        }

        if (botMarkerMessage) {
            await botMarkerMessage.edit(botMarker);
        } else {
            await channel.send(botMarker);
        }
    }
}
