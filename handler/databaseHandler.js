import sqlite from "sqlite3";

// initialize SQLite
export const db = new sqlite.Database("./db.db")

export function createDatabase() {
    // create the students table
    db.run("CREATE TABLE all_students( \
            id INTEGER UNIQUE NOT NULL, first_name TEXT NOT NULL, last_name TEXT NOT NULL, current_class TEXT NOT NULL, aktiv_team TEXT \
        )"
    )

    // create the verified students table
    db.run(
        "CREATE TABLE verified_students( \
            id INTEGER UNIQUE NOT NULL, first_name TEXT NOT NULL, last_name TEXT NOT NULL, current_class TEXT NOT NULL, aktiv_team TEXT, user_id INTEGER NOT NULL \
        )"
    )

    // create the verify-queue table
    db.run(
        "CREATE TABLE verify_queue( \
            id INTEGER UNIQUE NOT NULL, user_id INTEGER NOT NULL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP \
        )"
    )
}

export const fetchFromDB = ((sql, values) => {
    db.get(sql, values, (error, result) => {
        if (error) {
            return console.error(error)
        }

        return result;
    })
})
