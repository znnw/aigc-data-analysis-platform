# Contributing

Thank you for considering a contribution to the AIGC Intelligent Data Analysis Platform Backend.

## Development Setup

1. Install JDK 8, Maven 3.6+, MySQL 8, Redis, and RabbitMQ.
2. Install Elasticsearch 7.x if you need post search or synchronization features.
3. Import the schema from `sql/create_table.sql`.
4. Configure the required environment variables.
5. Build the project:

```bash
mvn -B -DskipTests package
```

6. Start the local profile:

```bash
java -jar target/aigc-data-analysis-backend-0.0.1-SNAPSHOT.jar --spring.profiles.active=local
```

## Branching

- `main` contains stable code.
- Use `feature/<short-description>` for new features.
- Use `fix/<short-description>` for bug fixes.
- Use `docs/<short-description>` for documentation-only changes.

## Commit Messages

Prefer Conventional Commits:

```text
feat: add async chart retry support
fix: handle empty Excel numeric columns
docs: update deployment configuration
refactor: isolate AI provider selection
test: cover chart status transitions
chore: update dependencies
```

## Pull Request Checklist

- The project builds with `mvn -B -DskipTests package`.
- New behavior includes tests where practical.
- API changes are reflected in the README and OpenAPI annotations.
- No credentials, local absolute paths, runtime logs, or generated artifacts are committed.
- The change does not expose administrative endpoints without authorization.
- Database or configuration changes include migration and rollback notes.

## Code Style

- Follow the existing Java package and layering conventions.
- Keep controllers focused on validation and orchestration.
- Put reusable infrastructure logic in `manager`, `config`, or `utils`.
- Prefer explicit DTOs over exposing persistence entities from new public APIs.
- Use parameter validation and business exceptions consistently.
- Avoid unrelated refactoring in feature pull requests.

## Reporting Issues

Use the GitHub issue templates and include:

- Expected behavior
- Actual behavior
- Reproduction steps
- Relevant logs with secrets removed
- Runtime and dependency versions

Security issues must follow `SECURITY.md`.
