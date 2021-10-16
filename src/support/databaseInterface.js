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
            " TEXT NOT NULL, secondName TEXT, surName TEXT NOT NULL, class TEXT NOT NULL, year INTEGER NOT NULL)");
        this.database.run("CREATE TABLE IF NOT EXISTS verified (id TEXT NOT NULL PRIMARY KEY, studentId INTEGER NOT NULL" +
            ", FOREIGN KEY(studentId) REFERENCES students(id))");
        this.database.run("CREATE TABLE IF NOT EXISTS teamMembership (userId TEXT NOT NULL, team TEXT NOT NULL," +
            " PRIMARY KEY(userId, team), FOREIGN KEY(userId) REFERENCES verified(id), FOREIGN KEY(team)" +
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

    async findStudent(firstName, secondName, surName) {
        assertArgHasValue(firstName, "firstName");
        assertArgHasValue(surName, "surName");

        return await this.runAsync(
            "SELECT * FROM students WHERE firstName = $firstName AND secondName = $secondName AND surName = $surName",
            {
                $firstName: firstName,
                $secondName: secondName,
                $surName: surName
            }
        );
    }

    async getRolesForUser(userId) {
        assertArgHasValue(userId, "userId");

        return await this.getAsync(
            "SELECT yearRoles.id FROM yearRoles\n" +
            "    JOIN verified ON verified.id = $userId\n" +
            "    JOIN students ON students.id = verified.studentId\n" +
            "        AND (yearRoles.class IS NULL OR yearRoles.class = students.class)\n" +
            "        AND yearRoles.year = students.year" +
            "UNION" +
            "   SELECT teamRoles.id FROM teamRoles\n" +
            "       JOIN verified ON verified.id = $userId\n" +
            "       JOIN teamMembership ON teamMembership.userId = verified.id;",
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
        return await this.getAsync(
            "SELECT id, (\n" +
            "    id IN (\n" +
            "        SELECT teamRoles.id FROM teamRoles\n" +
            "            JOIN verified ON verified.id = $userId\n" +
            "            JOIN teamMembership ON teamMembership.userId = verified.id\n" +
            "        UNION\n" +
            "            SELECT yearRoles.id FROM yearRoles\n" +
            "                JOIN verified ON verified.id = $userId\n" +
            "                JOIN students ON students.id = verified.studentId\n" +
            "                   AND (yearRoles.class IS NULL OR yearRoles.class = students.class)\n" +
            "                   AND yearRoles.year = students.year\n" +
            "    )\n" +
            ") AS belongs FROM (\n" +
            "    SELECT id FROM teamRoles\n" +
            "         UNION\n" +
            "            SELECT id FROM yearRoles\n" +
            ")\n",
            {$userId: userId}
        );
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

                if (err !== null) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }
}
