## Command documentation

How to read this documentation:
- `<team>` is a required parameter with the name `team`
- `[permission-level]` is an optional parameter with the name `permission-level`

Terminology:
- `team`: refers to so called "Aktivteams" (examples: `Medien und Gestaltungstechnik`, `Garten`)
- `year`: used for `Jahrgang` in commands (examples: `5`, `11`)
- `class`: identifies the class something belongs to, this is only the letter without the year 
   (examples: `A`, `B`, `L`)
- `student`: refers to a student which goes to this school
- `user`: refers to a discord user which verified and thus associated with a `student`
- `permissionLevel`: refers to the position and permissions a `user` has in a `team`

#### About permission levels

The bot supports 3 permission levels:
- `member`: the user is part of the team, but does not have management permissions
- `trusted`: the user may add and remove members
- `owner`: the user may add and remove members and trusted users, as well as promote or demote
  members to trusted and vice versa

---

### User commands

The following commands require no global permission.

#### Verification

Command: `/verify <fist-name> <surname> [second-name]`

Description: Verifies the user and adds the appropriate roles.

Options:
- `first-name`: The first name of the student to verify as
- `surname`: The surname of the student to verify as
- `second-name`: The second name of the student to verify as, if any

#### Team management

Command: `/team add-user <team> <user> [permission-level]`

Description: Adds a user to a team and sets his permission level. A user can only add users to a team if the selected
`permission-level` is lower than theirs. This in return means that members, which have the lowest possible permission
level, can't add any users.

Options:
- `team`: The team to add the user to
- `user`: The user to add to the team
- `permission-level`: The permission level the user will have, defaults to `member`

This command is functionally equivalent to `add-student` and only provided for convenience, can however only be used,
if the student is on the discord already. If the student is not on the discord, use `add-student` instead!

---

Command: `/team add-student <team> <first-name> <surname> [permission-level] [second-name]`

Description: Adds a student to a team and sets his permission level. A user can only add students to a team if the
selected `permission-level` is lower than theirs. This in return means that members, which have the lowest possible
permission level, can't add any users.

Options:
- `team`: The team to join the user to
- `first-name`: The first name of the student
- `surname`: The surname of the student
- `permission-level`: The permission level the user will have, defaults to `member`
- `second-name`: The second name of the student, if any

This command is functionally equivalent to `add-user`, but allows adding students to teams which are not
on the discord. If the student is on the discord already, it will be easier to use `add-user`.

---

Command: `/team remove-user <team> <user>`

Description: Removes a user from a team. A user can only remove users from a team if the `permission-level` of the
user to be removed is lower than theirs. This in return means that members, which have the lowest possible permission
level, can't remove any users.

Options:
- `team`: The team to remove the user from
- `user`: The user to remove from the team

This command is functionally equivalent to `remove-student` and only provided for convenience, can however only be used,
if the student is on the discord already. If the student is not on the discord, use `remove-student` instead!

---

Command: `/team remove-student <team> <first-name> <surname> [second-name]`

Description: Removes a student from a team. A user can only remove students from a team if the `permission-level` of the
student to be removed is lower than theirs. This in return means that members, which have the lowest possible
permission level, can't remove any students.

Options:
- `team`: The team to remove the student from
- `first-name`: The first name of the student
- `surname`: The surname of the student
- `second-name`: The second name of the student, if any

This command is functionally equivalent to `remove-user`, but allows removing students from teams which are not
on the discord. If the student is on the discord already, it will be easier to use `remove-user`.

---

Command: `/team set-user-permission-level <team> <user> <permission-level>`

Description: Changes the permission level of a user in a team. A user can only change the permission level of another
user if the `permission-level` of the user for which the level is requested to change is lower than theirs and the
`permission-level` which is set as the new one is also lower than theirs. This in return means that members, which
have the lowest possible permission level, can't change the level of any other member.

Options:
- `team`: The team to change the permission level of the user for
- `user`: The user to change the permission level for
- `permission-level`: The new permission level of the user

This command is functionally equivalent to `set-student-permission-level` and only provided for convenience, can
however only be used, if the student is on the discord already. If the student is not on the discord, use
`set-student-permission-level` instead!

---

Command: `/team set-student-permission-level <team> <first-name> <surname> <permission-level> [second-name]`

Description: Changes the permission level of a student in a team. A user can only change the permission level of another
student if the `permission-level` of the student for which the level is requested to change is lower than theirs and the
`permission-level` which is set as the new one is also lower than theirs. This in return means that members, which
have the lowest possible permission level, can't change the level of any other student.

Options:
- `team`: The team to change the permission level of the student for
- `first-name`: The first name of the student
- `surname`: The surname of the student
- `second-name`: The second name of the student, if any
- `permission-level`: The new permission level of the student

---

### Administrative commands

The following commands require the `manage` permission:

#### Role management

Command: `/manage-roles import team <role> <team>`

Description: Imports an existing role for a team, creating the team in the process. The role is
renamed to match the team name template from the configuration.

Options:
- `role` The role to import
- `team` The name of the team

---

Command: `/manage-roles import year <role> <year> [class]`

Options:
- `role` The role to import
- `year` The year of the new role
- `class` The class identifier, for example `A`, `B` or `L`, of the new role, if any

Description: Imports an existing role for a year or class, creating the year or class in the
process. The role is renamed to match the year or class template from the configuration.
If `class` is given, a class role, else a year role is created.

---

Command: `/manage-roles create team <team>`

Description: Creates a new team and the associated roles.

Options:
- `team` The name of the team

---

Command: `/manage-roles create year <year> [class]`

Description: Creates a new year or class and the associated roles.

Options:
- `year` The year to create
- `class` The class identifier, for example `A`, `B` or `L`, of the new role, if any

---

Command: `/manage-roles delete team <team>`

Description: Deletes a team. **DANGER: this action is irreversible!**

Options:
- `team`: The team to delete

---

Command: `/manage-roles delete year <year> [class]`

Description: Deletes a year or class. When deleting a year, associated class _will not_ be automatically
deleted with it. **DANGER: this action is irreversible!**

Options:
- `year`: The year to delete
- `class`: The class to delete

#### User management

Command: `/manage-user team join-user <team> <user> [permission-level]`

Description: Joins a user to a team and sets his permission level.

Options:
- `team`: The team to join the user to
- `user`: The user to join to the team
- `permissino-level`: The permission level the user will have, defaults to `member`

This command is functionally equivalent to `join-student` and only provided for convenience, can however only be used,
if the student is on the discord already. If the student is not on the discord, use `join-student` instead!

---

Command: `/manage-user team join-student <team> <first-name> <surname> [permission-level] [second-name]`

Description: Joins a student to a team and sets his permission level.

Options:
- `team`: The team to join the user to
- `first-name`: The first name of the student
- `surname`: The surname of the student
- `permission-level`: The permission level the user will have, defaults to `member`
- `second-name`: The second name of the student, if any

This command is functionally equivalent to `join-student`, but allows adding students to teams which are not
on the discord. If the student is on the discord already, it will be easier to use `join-student`.

---

Command: `/manage-user team remove-user <team> <user>`

Description: Removes a user from a team.

Options:
- `team`: The team to remove the user from
- `user`: The user to remove from the team

This command is functionally equivalent to `remove-student` and only provided for convenience, can however only be used,
if the student is on the discord already. If the student is not on the discord, use `remove-student` instead!

---

Command: `/manage-user team remove-student <team> <first-name> <surname> [second-name]`

Description: Removes a student from a team.

Options:
- `team`: The team to remove the student from
- `first-name`: The first name of the student
- `surname`: The surname of the student
- `second-name`: The second name of the student, if any

This command is functionally equivalent to `remove-student`, but allows removing students from teams which are not
on the discord. If the student is on the discord already, it will be easier to use `remove-student`.

---

Command: `/manage-user team set-user-permission-level <team> <user> <permission-level>`

Description: Changes the permission level of a user in a team.

Options:
- `team`: The team to change the permission level of the user for
- `user`: The user to change the permission level for
- `permission-level`: The new permission level of the user

This command is functionally equivalent to `set-student-permission-level` and only provided for convenience, can
however only be used, if the student is on the discord already. If the student is not on the discord, use
`set-student-permission-level` instead!

---

Command: `/manage-user team set-student-permission-level <team> <first-name> <surname> <permission-level> [second-name]`

Description: Changes the permission level of a student in a team.

Options:
- `team`: The team to change the permission level of the student for
- `first-name`: The first name of the student
- `surname`: The surname of the student
- `second-name`: The second name of the student, if any
- `permission-level`: The new permission level of the student

---

Command: `/manage-user reload-data <user>`

Description: Reloads data from the database and re-applies naming and roles to the user. Use this command if for some
reason the database goes out of sync with the actual discord data.

Options:
- `user`: The user to reload the data for
