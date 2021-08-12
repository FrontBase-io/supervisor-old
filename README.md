# Supervisor

Supervisor is a part of FrontBase. Supervisor is the main entry point for FrontBase. Commands are executed using `yarn` (or using an alias `frontbase` that executes yarn in it's respective folder).

## Responsibility

Supervisor performs the following tasks

- **Initialisation** check if the database is online and initialised. If anything is wrong it will spin up a express server with an error page. If initialisation is incomplete it will perform it.
- **OS interactions** such as
  - Installing and updating of apps
  - Keeping `server`, `engine` and `client` up to date.
  - File creation
