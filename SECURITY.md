# Security Policy

## Supported Versions

Security fixes are applied to the latest revision on the `main` branch.

| Version | Supported |
| --- | --- |
| Latest `main` | Yes |
| Older revisions | No |

## Reporting a Vulnerability

Please do not report security vulnerabilities through public GitHub issues.

Use GitHub's private vulnerability reporting or Security Advisory feature for this repository. Include:

- A concise description of the issue.
- The affected endpoint, component, or dependency.
- Reproduction steps or a proof of concept.
- The potential impact and any known mitigations.

Please avoid including real credentials, personal data, or production database content in the report.

## Secret Handling

The repository must not contain:

- Database passwords
- Redis or RabbitMQ credentials
- DeepSeek or third-party AI API keys
- Tencent Cloud COS access keys
- WeChat application secrets
- Private certificates or signing keys

Use environment variables or a secret manager. If a credential is committed accidentally, revoke and rotate it immediately. Removing it from the current branch is not sufficient because it may remain in Git history.

## Security Baseline

- Use HTTPS in production.
- Replace the development administrator account before deployment.
- Use secure session and cookie settings.
- Restrict administrative endpoints and object-storage permissions.
- Keep dependencies and GitHub Actions up to date.

## Dependency Updates

Dependabot is configured for Maven and GitHub Actions. Review automated pull requests before merging, especially changes to Spring Boot, MySQL, RabbitMQ, Elasticsearch, WxJava, and cloud SDK dependencies.
