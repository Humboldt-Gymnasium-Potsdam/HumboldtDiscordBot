import moment from "moment";

export class LessonRow {
    lessons = "";
    classes = "";
    origSubject = "";
    origTeacher = "";
    newSubject = "";
    newTeacher = "";
    room = "";
    info = "";
}

export class ProperService {
    classThisWeek = "";
    teacherThisWeek = "";
    classNextWeek = "";
    teacherNextWeek = "";
}

export class ChairService {
    clazz = "";
    subject = "";
    teacher = "";
}

export class TimeInfo {
    yearOne = 0;
    yearTwo = 0;
    dayNumerical = 0;
    monthNumerical = 0;
    dayName = "";
    week = Week.A;
}

export const Week = {
    A: "A",
    B: "B"
};

export class TableInformation {
    timeInfo = new TimeInfo();
    properService = new ProperService();
    chairService = new ChairService();
    extraText = "";
    absentTeachers = [];
    lessons = [];
    pdfPath = "";
    processedAt = moment();
    debugText = [];
}
