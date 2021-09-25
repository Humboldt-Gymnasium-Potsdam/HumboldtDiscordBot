import {db, fetchFromDB} from "./databaseHandler.js";

const getJahrgangAndClassRole = ((currentClass, bot, config) => {
    const roleConfig = config.roles.classes[currentClass];

    const newRoleID = roleConfig.class;
    const yearRoleID = roleConfig.year;

    if (!newRoleID) {
        console.log("404 - the current class of the student was NOT found ::: database error")
    }

    // fetch the role from the guild
    let classRole;
    try {
        const guild = bot.guilds.get();
        classRole = guild.roles.get(newRoleID);
    } catch {
        console.log("404 - the bot could NOT find any guild or role with this ID")
        return;
    }

    // fetch the role from the guild
    let yearRole;
    try {
        const guild = bot.guilds.get();
        classRole = guild.roles.get(yearRoleID);
    } catch {
        console.log("the bot could NOT find any role with this ID")
        return;
    }
    
    // give the roles back
    return [ yearRole, classRole ];
});

const getAktivTeamRole = ((aktivTeam, bot, config) => {
    // check if the student is in an Aktiv-Team
    if (!aktivTeam) {
        return null;
    }

    const newRoleID = config.roles.teams[aktivTeam];

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


export function userVerify(member, firstName, lastName, currentClass, aktivTeam= null, bot, config) {
    // change nickname
    const nickname = `${firstName} ${lastName}`;
    member.setNickname(nickname);

    // add roles
    const studentRole = null; // get data from json-file
    const newRoles = getJahrgangAndClassRole(currentClass, bot, config);
    const aktivTeamRole = getAktivTeamRole(aktivTeam, bot, config);

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
