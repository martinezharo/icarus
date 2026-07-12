# AGENTS.md

## Project

Icarus is an application designed for keeping a diary using ICS files.

This repository is a VERY EARLY WIP. Proposing sweeping changes that improve long-term maintainability is encouraged.

## Product priorities

- Support ICS files containing diary entries spanning many years.
- Allow users to browse, read, and edit their entries with virtually no latency.
- Maximum privacy so that no one can access your diary.
- Local-first.

## Maintainability

Long-term maintainability is a core priority. If you add new functionality, first check whether there is shared logic that can be extracted into a separate module. Duplicate logic across multiple files is a code smell and should be avoided. Don't be afraid to modify existing code. Don't take shortcuts by simply adding local logic to solve a problem.