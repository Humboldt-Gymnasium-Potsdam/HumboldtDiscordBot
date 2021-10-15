import sqlite from "sqlite3";
import {assertArgHasValue} from "../util/assert.js";

export class DatabaseInterface {
    constructor(config) {
        this.database = new sqlite.Database(config.databasePath);
        this.ensureSetup();
    }

    ensureSetup() {
        this.database.run("CREATE TABLE IF NOT EXISTS yearRoles (id TEXT NOT NULL PRIMARY KEY, year INT NOT NULL, class TEXT)");
        this.database.run("CREATE TABLE IF NOT EXISTS teamRoles (id TEXT NOT NULL PRIMARY KEY, name TEXT NOT NULL)");
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

    async getRoleData(clazz) {
        assertArgHasValue(clazz, "clazz");

        return await this.getAsync(
            "SELECT (id, year) FROM yearRoles WHERE class = $clazz", {clazz}
        );
    }

    async getTeamData(name) {
        assertArgHasValue(name, "name");

        return await this.getAsync(
            "SELECT id FROM teamRoles WHERE name = $name", {name}
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
