# Roles & Access Management

There are two primary types of roles within the ChurchApp system: **System Roles** and **Ministry Roles**. They serve distinct purposes and are completely separated in both functionality and storage.

## 1. System Roles
System roles control access to the modules and features within the admin portal. They are stored in the user's Firestore document under the `role` field.

### Hierarchy & Access Levels

- **super_admin**: Has access to all sections, including global "Churches" management. Can assign any system role.
- **church_admin**: Has access to almost all sections within a specific church. Can assign any role except `super_admin`.
- **pastor**: Has access to ministries, schedules, sermons, worship, bible plans, discipleship, and reports. Cannot assign system roles.
- **secretary**: Has access to members, events, attendance, and announcements. Cannot assign system roles.
- **finance_admin**: Has access to giving, giving campaigns, expenses, and reports. Cannot assign system roles.
- **ministry_leader**: Has access to ministries, scheduling, songs & lyrics, and setlists. Cannot assign system roles. 
- **viewer**: A baseline/fallback role that typically has read-only access to basic dashboards and public-facing content, but restricted from sensitive areas like attendance or detailed reports. Cannot assign system roles.

### Managing System Roles
- Authorized admins (`super_admin` and `church_admin`) can assign or change roles via **Settings → Users & Roles** or from the **Access & Role** tab within a member's profile.
- Users are never permitted to elevate or change their own system role.
- All system role changes are audited and stored in the `roleAuditLogs` Firestore collection to maintain a verifiable history of access grants.

---

## 2. Ministry Roles
Ministry roles control serving responsibilities and edit access *within a specific ministry*. They do not affect a user's access to system-level modules.

### Ministry Leaders
- Leaders are stored in the `ministries` document under the `leaderIds` array.
- Users whose user IDs appear in `leaderIds` are permitted to edit the details, schedules, and team roster of that specific ministry.
- They are visually identified by a "Leader" badge in the ministry's Team Roster.

### Serving Roles
- General serving titles (e.g., Drummer, Vocalist, Usher, Preacher, Presider, Sunday School Teacher) that describe a member's function within a ministry.
- These are stored inside the `members` array of a `ministries` document, specifically in the `servingRole` property of the member object.
- Serving roles do not grant any special system access; they are purely for team organization and scheduling context.

### Managing Ministry Roles
- Admins and existing Ministry Leaders can assign serving roles or promote team members to leaders directly from the **Team Roster** tab on a specific Ministry's details page using the three-dot action menu.
