# envpush

## 0.2.0

### Minor Changes

- c0bf127: Add interactive main menu, server command, input validation, and custom environment names

  - Interactive menu when running `evp` with no subcommand, with contextual categories based on auth/project state
  - `evp server` command to set or show the server URL
  - Input validation on login/register forms (email, password, confirm password, team name)
  - Reuse saved server URL in login/register instead of prompting every time
  - Custom environment names during `evp init` instead of hardcoded list
