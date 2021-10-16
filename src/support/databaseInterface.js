import sqlite from "sqlite3";
import {assertArgHasValue} from "../util/assert.js";

export class DatabaseInterface {
    constructor(config) {
        this.database = new sqlite.Database(config.databasePath);
        this.ensureSetup();
    }

    ensureSetup() {
        this.database.run("CREATE TABLE IF NOT EXISTS yearRoles (id TEXT NOT NULL PRIMARY KEY, year INTEGER NOT NULL," +
            " class TEXT)");
        this.database.run("CREATE TABLE IF NOT EXISTS teamRoles (id TEXT NOT NULL PRIMARY KEY, name TEXT NOT NULL)");
        this.database.run("CREATE TABLE IF NOT EXISTS students (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT," +
            " firstName" +
            " TEXT NOT NULL, secondName TEXT, surname TEXT NOT NULL, class TEXT, year INTEGER NOT NULL)");
        this.database.run("CREATE TABLE IF NOT EXISTS verified (id TEXT NOT NULL PRIMARY KEY, studentId INTEGER NOT NULL" +
            ", FOREIGN KEY(studentId) REFERENCES students(id))");
        this.database.run("CREATE TABLE IF NOT EXISTS teamMembership (studentId TEXT NOT NULL, team TEXT NOT NULL," +
            " permissionLevel INTEGER NOT NULL," +
            " PRIMARY KEY(studentId, team), FOREIGN KEY(studentId) REFERENCES students(id), FOREIGN KEY(team)" +
            " REFERENCES teamRoles(name))");
    }

    async importYearRole(id, year, clazz) {
        assertArgHasValue(id, "id");
        assertArgHasValue(year, "year");

        await this.runAsync(
            "INSERT INTO yearRoles (id, year, class) VALUES ($id, $year, $clazz)",
            {$id: id, $year: year, $clazz: clazz}
        );
    }

    async importTeamRole(id, name) {
        assertArgHasValue(id, "id");
        assertArgHasValue(name, "name");

        await this.runAsync(
            "INSERT INTO teamRoles (id, name) VALUES ($id, $name)",
            {$id: id, $name: name}
        );
    }

    async getYearData(year) {
        assertArgHasValue(year, "year");

        return await this.getAsync(
            "SELECT id FROM yearRoles WHERE year = $year AND class IS NULL", {$year: year}
        );
    }

    async getClassData(clazz) {
        assertArgHasValue(clazz, "clazz");

        return await this.getAsync(
            "SELECT (id, year) FROM yearRoles WHERE class = $clazz", {$clazz: clazz}
        );
    }

    async getYearAndClassData(year, clazz) {
        assertArgHasValue(year, "year");
        assertArgHasValue(clazz, "clazz");

        return await this.getAsync(
            "SELECT id FROM yearRoles WHERE year = $year AND class = $clazz",
            {$year: year, $clazz: clazz}
        );
    }

    async getTeamData(name) {
        assertArgHasValue(name, "name");

        return await this.getAsync(
            "SELECT id FROM teamRoles WHERE name = $name", {$name: name}
        );
    }

    async deleteYear(year) {
        assertArgHasValue(year, "year");

        return await this.runAsync(
            "DELETE FROM yearRoles WHERE year = $year AND class IS NULL", {$year: year}
        );
    }

    async deleteYearAndClass(year, clazz) {
        assertArgHasValue(year, "year");
        assertArgHasValue(clazz, "clazz");

        return await this.runAsync(
            "DELETE FROM yearRoles WHERE year = $year AND class = $clazz", {$year: year, $clazz: clazz}
        );
    }

    async deleteTeam(name) {
        assertArgHasValue(name, "name");

        return await this.runAsync(
            "DELETE FROM teamRoles WHERE name = $name", {$name: name}
        );
    }

    async getStudentDataForUser(userId) {
        assertArgHasValue(userId, "userId");

        return await this.getAsync(
            "SELECT * FROM verified JOIN students ON verified.studentId = students.id WHERE verified.id = $userId",
            {$userId: userId}
        );
    }

    async findStudent(firstName, secondName, surname) {
        assertArgHasValue(firstName, "firstName");
        assertArgHasValue(surname, "surname");

        if(secondName == null) {
            return await this.getAsync(
`SELECT students.id AS studentId, firstName, secondName, surname, class, year, verified.id AS userId
FROM students
         LEFT JOIN verified ON verified.studentId = students.id
WHERE firstName = $firstName
  AND surname = $surname`,
                {
                    $firstName: firstName,
                    $surname: surname
                }
            );
        } else {

            return await this.getAsync(
`SELECT students.id AS studentId, firstName, secondName, surname, class, year, verified.id AS userId
FROM students
    LEFT JOIN verified ON verified.studentId = students.id
WHERE firstName = $firstName
    AND secondName = $secondName
    AND surname = $surname`,
                {
                    $firstName: firstName,
                    $secondName: secondName,
                    $surname: surname
                }
            );
        }
    }

    async completeVerification(userId, studentId) {
        assertArgHasValue(userId, "userId");
        assertArgHasValue(studentId, "studentId");

        return await this.runAsync(
            "INSERT INTO verified (id, studentId) VALUES ($id, $studentId)",
            {$id: userId, $studentId: studentId}
        );
    }

    async getRolesForUser(userId) {
        assertArgHasValue(userId, "userId");

        return await this.allAsync(
`SELECT teamRoles.id FROM teamRoles
    JOIN verified ON verified.id = $userId
    JOIN students ON students.id = verified.studentId
    JOIN teamMembership ON teamMembership.studentId = students.id
UNION
    SELECT yearRoles.id FROM yearRoles
        JOIN verified ON verified.id = $userId
        JOIN students ON students.id = verified.studentId
           AND (yearRoles.class IS NULL OR yearRoles.class = students.class)
           AND yearRoles.year = students.year
           `,
            {$userId: userId}
        );
    }

    async getCompleteRoleListingForUser(userId) {
        assertArgHasValue(userId, "userId");

        /*
         * Ok so what the fuck does the below query do you ask?
         *
         * Here is a breakdown:
         * 1. The last select statement collects ALL available role ids from
         *    teamRoles and yearRoles, merges them together in one column and returns them
         * 2. The upper most query with JOIN finds all role ids for teams the user is in
         * 3. The lower query with JOIN finds all role ids for classes and years the user is in
         * 4. The UNION between 2. and 3. combines their results into a single column
         * 5. The first select collects all ids from 1. in the first column and then for each row
         *    tests whether the id is in the results from 4.
         *
         * The entire return value is a table which in its first column has all role ids
         * that exists while the second column contains either 0 (if the user does not have
         * the role in the first column) or 1 (if the user has the role).
         *
         * These results may then be used to selectively add or remove roles from a discord user.
         * Due to the complexity this query should only be used if necessary and the role states
         * of a user are unknown.
         */
        return await this.allAsync(
`SELECT id, (
    id IN (
        SELECT teamRoles.id FROM teamRoles
            JOIN verified ON verified.id = $userId
            JOIN students ON students.id = verified.studentId
            JOIN teamMembership ON teamMembership.studentId = students.id
        UNION
            SELECT yearRoles.id FROM yearRoles
                JOIN verified ON verified.id = $userId
                JOIN students ON students.id = verified.studentId
                   AND (yearRoles.class IS NULL OR yearRoles.class = students.class)
                   AND yearRoles.year = students.year
    )
) AS belongs FROM (
    SELECT id FROM teamRoles
         UNION
            SELECT id FROM yearRoles
);
`,
            {$userId: userId}
        );
    }

    async getTeamMembershipForUser(userId, team) {
        assertArgHasValue(userId, "userId");
        assertArgHasValue(team, "team");

        return await this.getAsync(
`SELECT teamMembership.* FROM teamMembership
    JOIN verified ON verified.id = $userId
    JOIN students ON students.id = verified.studentId
        WHERE teamMembership.studentId = students.id AND teamMembership.team = $team
`,
            {$userId: userId, $team: team}
        )
    }

    async getTeamMembershipForStudent(studentId, team) {
        assertArgHasValue(studentId, "studentId");
        assertArgHasValue(team, "team");

        return await this.getAsync(
`SELECT teamMembership.* FROM teamMembership
    JOIN students ON students.id = $studentId
    WHERE teamMembership.team = $team
`,
            {$studentId: studentId, $team: team}
        )
    }

    async joinStudentToTeam(studentId, team, permissionLevel) {
        assertArgHasValue(studentId, "studentId");
        assertArgHasValue(team, "team");
        assertArgHasValue(permissionLevel, "permissionLevel");

        await this.runAsync(
            "INSERT INTO teamMembership (studentId, team, permissionLevel) VALUES ($studentId, $team," +
            " $permissionLevel)",
            {$studentId: studentId, $team: team, $permissionLevel: permissionLevel}
        )
    }

    async removeStudentFromTeam(studentId, team) {
        assertArgHasValue(studentId, "studentId");
        assertArgHasValue(team, "team");

        await this.runAsync(
            "DELETE FROM teamMembership WHERE studentId = $studentId AND team = $team",
            {$studentId: studentId, $team: team}
        )
    }

    async changeTeamPermissionLevel(studentId, team, newPermissionLevel) {
        assertArgHasValue(studentId, "studentId");
        assertArgHasValue(team, "team");
        assertArgHasValue(newPermissionLevel, "newPermissionLevel");

        await this.runAsync(
            "UPDATE teamMembership SET permissionLevel = $newPermissionLevel WHERE team = $team AND studentId =" +
            " $studentId",
            {$newPermissionLevel: newPermissionLevel, $team: team, $studentId: studentId}
        )
    }

    runAsync(stmt, ...args) {
        return new Promise((resolve, reject) => {
            let completed = false;

            this.database.run(stmt, ...args, function (err) { // IMPORTANT: use function instead of arrow function
                if (completed) {
                    return;
                }

                completed = true;

                if (err !== null) {
                    reject(err);
                } else {
                    // `this` is set by sqlite3 and contains the here used properties
                    resolve({
                        lastID: this.lastID,
                        changes: this.changes
                    });
                }
            });
        });
    }

    getAsync(stmt, ...args) {
        return new Promise((resolve, reject) => {
            let completed = false;

            this.database.get(stmt, ...args, (err, row) => {
                if (completed) {
                    return;
                }

                completed = true;

                if (err != null) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    allAsync(stmt, ...args) {
        return new Promise((resolve, reject) => {
            let completed = false;

            this.database.all(stmt, ...args, (err, rows) => {
                if(completed) {
                    return;
                }

                completed = true;

                if(err != null) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
}
