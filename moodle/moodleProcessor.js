import * as Path from "path";
import * as fs from "../support/promise_fs.js";
import PDFJs from "pdfjs-dist/legacy/build/pdf.js";
import {LessonRow, TableInformation, Week} from "./moodleData.js";

export class MoodleProcessor {
    static async process(data) {
        return PDFJs.getDocument({data}).promise.then((doc) => {
            return MoodleProcessor.getText(doc);
        }).then((text) => {
            return MoodleProcessor.processText(text);
        }).then((plan) => {
            plan.pdfPath = Path.join("moodle-pdfs", `Schedule-${plan.timeInfo.dayNumerical}.${plan.timeInfo.monthNumerical}-${plan.timeInfo.yearOne}_${plan.timeInfo.yearTwo}_12TH.pdf`);
            return fs.exists("moodle-pdfs").then((exists) => {
                if (!exists) {
                    return fs.mkdir("moodle-pdfs");
                }

                return Promise.resolve();
            }).then(() => fs.writeFile(plan.pdfPath, data)).then(() => plan);
        });
    }

    static getText(doc) {
        const promises = [];

        for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
            promises.push(doc.getPage(pageNumber).then((page) => {
                return page.getTextContent().then((text) => {

                    return text.items.map(
                        (item) => item.str ?? "").join("\n") + "\n";
                });
            }));
        }

        return Promise.all(promises).then((texts) => {
            return texts.join("");
        });
    }

    static async processText(text) {
        const rows = [];

        const planInfo = new TableInformation();
        planInfo.debugText = text.split("\n");

        let currentConstructionRow = new LessonRow();
        let nextInfo = NextInfo.YearInfo;
        const lines = [];
        for (const line of text.split("\n")) {
            const trimmed = line.trim();
            if (trimmed.length < 1) {
                continue;
            }
            lines.push(trimmed);
        }

        for (let i = 0; i < lines.length;) {
            const line = lines[i].trim();
            if (line.length < 1) {
                continue;
            }

            switch (nextInfo) {
                case NextInfo.YearInfo: {
                    if (line.startsWith("Stundenplan ")) {
                        const years = line.substring(12).split("-").map((s) => s.trim());

                        if (years.length === 2) {
                            planInfo.timeInfo.yearOne = parseInt(years[0], 10);
                            planInfo.timeInfo.yearTwo = parseInt(years[1], 10);
                        }

                        nextInfo = NextInfo.Header;
                    }

                    i++;
                    break;
                }

                case NextInfo.Header: {
                    if (line.startsWith("Vertretungsplan Klasse")) {
                        let trimmedLine = line.substr(22).trim();

                        let dotIndex = trimmedLine.indexOf(".");
                        planInfo.timeInfo.dayNumerical = parseInt(trimmedLine.substring(0, dotIndex), 10);
                        trimmedLine = trimmedLine.substr(dotIndex + 1);
                        dotIndex = trimmedLine.indexOf(".");
                        planInfo.timeInfo.monthNumerical = parseInt(trimmedLine.substring(0, dotIndex), 10);
                        // Remove " / "
                        trimmedLine = trimmedLine.substr(dotIndex + 4);
                        const spaceIndex = trimmedLine.indexOf(" ");
                        planInfo.timeInfo.dayName = trimmedLine.substring(0, spaceIndex);

                        const weekLetter = trimmedLine.charAt(trimmedLine.length - 1).toLowerCase();
                        switch (weekLetter) {
                            case "a":
                                planInfo.timeInfo.week = Week.A;
                                break;
                            case "b":
                                planInfo.timeInfo.week = Week.B;
                                break;
                            default:
                                planInfo.timeInfo.week = Week.A;
                                break;
                        }

                        nextInfo = NextInfo.ProperService;
                    }
                    i++;
                    break;
                }

                case NextInfo.ProperService: {
                    // Ordnungsdienst: Tutorium 11.1 Frau Brandt - Kommende Woche: Tutorium 11.2 Herr Fiebig
                    // tslint:disable-next-line:max-line-length
                    // Ordnungsdienst: Klasse 8B / Frau Hintze & Herr Leuer - kommende Woche: Klasse 8L / Frau Gutzmerow & Frau Starke

                    if (line.startsWith("Ordnungsdienst: ")) {
                        let data = processProperServiceClass(line.substring(16).trim());
                        planInfo.properService.classThisWeek = data.clazz;
                        planInfo.properService.teacherThisWeek = data.teacher;

                        data = processProperServiceClass(data.remaining);
                        planInfo.properService.classNextWeek = data.clazz;
                        planInfo.properService.teacherNextWeek = data.teacher;

                        nextInfo = NextInfo.ChairService;
                        i++;
                    } else {
                        nextInfo = NextInfo.ExtraText;
                    }


                    break;
                }

                case NextInfo.ChairService: {
                    if (!line.startsWith("Aufstuhlung Aula & Ei nach dem 4. Block - Klasse ")) {
                        nextInfo = NextInfo.ExtraText;
                        break;
                    }
                    const infoData = line.substring(49).split("-").map((s) => s.trim());
                    if (infoData.length >= 3) {
                        planInfo.chairService.clazz = infoData[0];
                        planInfo.chairService.subject = infoData[1];
                        planInfo.chairService.teacher = infoData[2];
                    }
                    nextInfo = NextInfo.ExtraText;
                    i++;
                    break;
                }

                case NextInfo.ExtraText: {
                    if (line === "Abwesende Lehrer:") {
                        nextInfo = NextInfo.AbsentTeachers;
                        i++;
                        break;
                    } else if (line === "Stunde") {
                        nextInfo = NextInfo.UnnededBeforeLessons;
                        i++;
                        break;
                    } else if (line.startsWith("Aufstuhlung Aula & Ei nach dem 4. Block - Klasse ")) {
                        nextInfo = NextInfo.ChairService; // Uh... sometimes the order is switched
                        break;
                    } else if (line.startsWith("Ordnungsdienst: ")) {
                        nextInfo = NextInfo.ProperService;
                        break;
                    }

                    if (planInfo.extraText === "") {
                        planInfo.extraText = line;
                    } else {
                        planInfo.extraText += "\n" + line;
                    }

                    i++;
                    break;
                }

                case NextInfo.AbsentTeachers: {
                    planInfo.absentTeachers = line.split(",").map((s) => s.trim());
                    nextInfo = NextInfo.UnnededBeforeLessons;
                    i++;
                    break;
                }

                case NextInfo.UnnededBeforeLessons: {
                    if (line === "Vertretungs-Text" || line === "Text") {
                        nextInfo = NextInfo.Lessons;
                    }
                    i++;
                    break;
                }

                case NextInfo.Lessons: {
                    currentConstructionRow.lessons = line;
                    nextInfo = NextInfo.Classes;
                    i++;
                    break;
                }

                case NextInfo.Classes: {
                    currentConstructionRow.classes = line;
                    nextInfo = NextInfo.OrigSubject;
                    i++;
                    break;
                }

                case NextInfo.OrigSubject: {
                    currentConstructionRow.origSubject = line;
                    nextInfo = NextInfo.OrigTeacher;
                    i++;
                    break;
                }

                case NextInfo.OrigTeacher: {
                    currentConstructionRow.origTeacher = line;
                    nextInfo = NextInfo.NewSubject;
                    i++;
                    break;
                }

                case NextInfo.NewSubject: {
                    if (line.length > 6) { // Likely origSubject and origTeacher are missing
                        currentConstructionRow.newSubject = currentConstructionRow.origSubject;
                        currentConstructionRow.newTeacher = currentConstructionRow.origTeacher;
                        currentConstructionRow.origSubject = "";
                        currentConstructionRow.origTeacher = "";
                        nextInfo = NextInfo.Room;
                    } else {
                        currentConstructionRow.newSubject = line;
                        nextInfo = NextInfo.NewTeacher;
                        i++;
                    }
                    break;
                }

                case NextInfo.NewTeacher: {
                    currentConstructionRow.newTeacher = line;
                    nextInfo = NextInfo.Room;
                    i++;
                    break;
                }

                case NextInfo.Room: {
                    if (!isCharNumber(line.charAt(1)) && line !== "SH2" && line !== "SH1" && line !== "ext" && line !== "Aula" &&
                        line !== "---") { // Likely room is missing
                        nextInfo = NextInfo.Info;
                    } else {
                        currentConstructionRow.room = line;
                        nextInfo = NextInfo.Info;
                        i++;
                    }
                    break;
                }

                case NextInfo.Info: {
                    if (line.includes("Humboldt-Gymnasium Potsdam")) { // New page...
                        rows.push(currentConstructionRow);
                        currentConstructionRow = new LessonRow();
                        nextInfo = NextInfo.UnnededBeforeLessons;
                        i++;
                        break;
                    }

                    let wasInfo = false;
                    // Yeah... sometimes its multiline so I need a few hacks
                    if (!isCharNumber(line.charAt(0)) || line.length > 5) {
                        if (currentConstructionRow.info.length === 0) {
                            currentConstructionRow.info = line.trim();
                        } else {
                            currentConstructionRow.info += " " + line.trim();
                        }
                        i++;
                        wasInfo = true;
                    }

                    if (!wasInfo || i === lines.length) {
                        rows.push(currentConstructionRow);
                        currentConstructionRow = new LessonRow();
                        nextInfo = NextInfo.Lessons;
                    }
                    break;
                }
            }
        }

        planInfo.lessons = rows;
        return planInfo;
    }
}

const NextInfo = {
    YearInfo: 0,
    Header: 1,
    ProperService: 2,
    ChairService: 3,
    ExtraText: 4,
    AbsentTeachers: 5,
    UnnededBeforeLessons: 6,
    Lessons: 7,
    Classes: 8,
    OrigSubject: 9,
    OrigTeacher: 10,
    NewSubject: 11,
    NewTeacher: 12,
    Room: 13,
    Info: 14
};

function isCharNumber(char) {
    switch (char) {
        case "1":
            return true;
        case "2":
            return true;
        case "3":
            return true;
        case "4":
            return true;
        case "5":
            return true;
        case "6":
            return true;
        case "7":
            return true;
        case "8":
            return true;
        case "9":
            return true;
        case "0":
            return true;
        default:
            return false;
    }
}

function processProperServiceClass(currentLine) {
    const ret = {
        remaining: "",
        clazz: "",
        teacher: ""
    };

    if (currentLine.startsWith("Kommende Woche: ")) {
        currentLine = currentLine.substring(16).trim();
    }

    if (currentLine.startsWith("Klasse ")) {
        currentLine = currentLine.substring(7).trim();
        if (isCharNumber(currentLine.charAt(1))) {
            ret.clazz = currentLine.substr(0, 2);
            currentLine = currentLine.substring(3);
        } else {
            ret.clazz = currentLine.substr(0, 3);
            currentLine = currentLine.substring(4);
        }
    } else if (currentLine.startsWith("Tutorium ")) {
        currentLine = currentLine.substring(9).trim();
        ret.clazz = currentLine.substr(0, 4);
        currentLine = currentLine.substring(5);
    }

    const teacherIndex = (() => {
        const indices = [currentLine.indexOf("Herr"), currentLine.indexOf("Frau")]
            .filter((v) => v !== -1)
            .sort();

        return indices.length > 0 ? indices[0] + 5 : -1;
    })();

    if (teacherIndex === -1) {
        return ret;
    }

    currentLine = currentLine.substring(teacherIndex);
    ret.teacher = currentLine.substring(0, indexOfOrEnd(currentLine, " ")).trim();

    currentLine = currentLine.substring(indexOfOrEnd(currentLine, " ")).trim();
    if (currentLine.includes("-")) {
        currentLine = currentLine.substring(currentLine.indexOf("-") + 2).trim();
    }

    ret.remaining = currentLine.trim();

    return ret;
}

function indexOfOrEnd(str, search) {
    const idx = str.indexOf(search);
    return idx === -1 ? str.length : idx;
}
