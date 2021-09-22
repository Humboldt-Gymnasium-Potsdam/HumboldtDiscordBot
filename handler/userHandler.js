import {db, fetchFromDB} from "./databaseHandler.js";

const classRoleIDs = { 
    // get data from json-file
    "5L": 132234234,

    "6L": 324234,

    "7A": 23434354354,
    "7B": 34757643583,
    "7C": 374354534,
    "7D": 734578,
    
    "8A": 557347574875643,
    "8B": 437583478574,
    "8C": 32892385,

    "9A": 47834783547,
    "9B": 35478654378,
    "9C": 7834556345,
    "9L": 3847343457543,

    "10A": 784365783456,
    "10B": 823487345786,
    "10C": 73456834657,
    "10L": 835477437534,

    "11": 73546354,
    
    "12": 475634785,
}

const jahrgangsRoleIDs = {
    5: 34354,
    6: 67867835478,
    7: 37478785,
    8: 734783467834,
    9: 346787834675354,
    10: 374567834678,
    11: 673489345678867,
    12: 6723678378234,
}

const aktivTeamRoleIDs = {
    // get data from json-file
    "Studentenfutter": 2348237623734,
    "Events": 72462386547,
    "Medien": 72367843678543,
    "Glueck": 37846734567543,
    "Sharewood": 74373547,
    "Garten": 37457854,
    "HuGhas": 43678345,
    "Schuelerfirma": 893463475623,
    "Film AG": 3473547865,
    "Schuelerzeitung": 673476867854,
    "HuHu": 746734678543,
    "HumboldtTage": 34565753467,
}

const getJahrgangAndClassRole = ((currentClass, bot) => {
    let newRoleID;

    // go through the classes and check if the student is in a class
    for (const className in classRoleIDs) {
        if (className === currentClass) {
            newRoleID = classRoleIDs[className]
            break;
        }
    }

    if (!newRoleID) {
        console.log("404 - the current class of the student was NOT found ::: database error")
    }

    // fetch the role from the guild
    let classRole;
    try {
        const guild = bot.guilds.get(); // get data from json-file
        classRole = guild.roles.get(newRoleID);
    } catch {
        console.log("404 - the bot could NOT find any guild or role with this ID")
        return;
    }

    // check the class-height
    let newJahrgangsRoleID;

    if (currentClass.includes("6")) {
        newJahrgangsRoleID = jahrgangsRoleIDs[6]
    } else if (currentClass.includes("7")) {
        newJahrgangsRoleID = jahrgangsRoleIDs[7]
    } else if (currentClass.includes("8")) {
        newJahrgangsRoleID = jahrgangsRoleIDs[8]
    } else if (currentClass.includes("9")) {
        newJahrgangsRoleID = jahrgangsRoleIDs[9]
    } else if (currentClass.includes("10")) {
        newJahrgangsRoleID = jahrgangsRoleIDs[10]
    } else if (currentClass.includes("11")) {
        newJahrgangsRoleID = jahrgangsRoleIDs[11]
    } else if (currentClass.includes("12")) {
        newJahrgangsRoleID = jahrgangsRoleIDs[12]
    }

    if (!newJahrgangsRoleID) {
        console.log("logic error in code")
    }

    // fetch the role from the guild
    let jahrgangsRole;
    try {
         classRole = guild.roles.get(newJahrgangsRoleID);
    } catch {
        console.log("the bot could NOT find any role with this ID")
        return;
    }
    
    // give the roles back
    return [ jahrgangsRole, classRole ];
});

const getAktivTeamRole = ((aktivTeam, bot) => {
    // check if the student is in an Aktiv-Team
    if (!aktivTeam) {
        return null;
    }

    let newRoleID;

    // go through the teams and check if the student is in one of 'em
    for (const aktivTeamName in aktivTeamRoleIDs) {
        if (aktivTeamName === aktivTeam) {
            newRoleID = aktivTeamRoleIDs[aktivTeamName]
            break;
        }
    }

    if (!newRoleID) {
        console.log("404 - the aktivTeam of the student was NOT found ::: database error")
    }

    // fetch the role from the guild
    let aktivTeamRole;
    try {
        const guild = bot.guilds.get(); // get data from json-file
        aktivTeamRole = guild.roles.get(newRoleID);
    } catch {
        console.log("404 - the bot could NOT find any guild with this ID")
        return;
    }
    
    // give the role back
    return aktivTeamRole;
});


export function userVerify(member, firstName, lastName, currentClass, aktivTeam= null, bot) {
    // change nickname
    const nickname = `${firstName} ${lastName}`;
    member.setNickname(nickname);

    // add roles
    const studentRole = null; // get data from json-file
    const newRoles = getJahrgangAndClassRole(currentClass, bot);
    const aktivTeamRole = getAktivTeamRole(aktivTeam, bot);

    const newUserRoles = [ studentRole ] + newRoles;
    if (aktivTeamRole) {
        newUserRoles.push(aktivTeamRole);
    }

    for (const newUserRole in newUserRoles) {
        member.roles.add(newUserRole);
    }

    // give user to database
    let maxID = fetchFromDB("SELECT id FROM verified_students WHERE id= :id", { "id": "SELECT MAX(id) FROM verified_students" })
    if (!maxID) {
        maxID = 1;
    }

    const newID = maxID +1;

    db.run(
        `INSERT INTO verified_students VALUES ( \
            ${newID}, ${firstName}, ${lastName}, ${currentClass}, ${aktivTeam}, ${member.id} \
        )`
    );
}