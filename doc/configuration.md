## Configuration documentation

The bot reads its configuration from `config.json` which is shipped with this repository
and can be found [here](../run/config.json). Additionally, the bot reads a configuration
file from `config.override.json` directly next to the `config.json` file. This override
file is merged with the other config file and overrides any values.

```json5
{
  "token": "", // Discord bot token
  "channels": {
    "verify": "890265915315331122", // Channel id to send verify notifications to
    "moodle": "887308923017777162" // Channel id to send the lesson plan to
  },
  "moodle": {
    "username": "", // Username to use for logging in to moodle
    "password": "", // Password to use for logging in to moodle
    "urls": {
      // The URL to set login data to 
      "login": "http://p113057.typo3server.info/login/index.php",
      // The url to search for the lesson plan after login
      "course": "http://p113057.typo3server.info/course/view.php?id=2"
    },
    "texts": {
      // Text which indicates that the login succeeded
      // this needs to be contained in the response to the login url in order
      // to signal that the login succeeded
      "loginSuccess": "sie sind angemeldet",
      // Link label to search for in the response to the course url in order to
      // determine the link to the lesson plan
      "tableName": "Vertretungsplan Schüler"
    },
    // The amount of seconds to wait before requesting the lesson plan again
    "scrapeInterval": 3600
  },
  "roles": {
    // Templates to apply for naming roles managed by the bot
    //
    // ${variableName} will be replaced with the content of the variable.
    "nameTemplates": {
      "year": "Jahrgang ${year}", // Name for the year roles, ${year} is available
      "class": "Klasse ${year}${name}", // Name for the class roles, ${year} and ${name] are available
      "team": "Aktivteam ${name}" // Name for the team roles, ${name} is available
    },
    // Map for permissions to roles which have more privileges to manage bot functions.
    //
    // The following permissions exists:
    // - manage: allows members to create and delete roles and manage teams
    "elevatedPermissions": {
      "manage": [] // Add discord role id's as strings which should have this permission here
    }
  },
  // Id's of users which can invoke special actions on the bot, such as reloading
  // slash commands
  "botManagers": ["302099567757754368", "538458510996930590"],
  "databasePath": "system-data.db", // File path to load the bot database from
  "colors": {
    "verifyRequest": "#28c15f" // Color to use for verify related embeds
  }
}
```
