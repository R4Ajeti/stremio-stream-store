# Security Policy

## Supported Versions

Security fixes are intended for the current `main` branch and the latest deployed version of Stremio Stream Store.

## Public Hosting Checklist

- Set `LINK_WRITE_TOKEN` before exposing the addon publicly.
- Keep Firebase service account credentials out of git.
- Use a long random `ANALYTICS_IP_SALT` when analytics is enabled.
- Set `ANALYTICS_READ_TOKEN` if the analytics dashboard should be private.
- Only save `http` or `https` stream URLs from trusted sources.

## Reporting Issues

If you find a vulnerability, report it privately to the project maintainer instead of opening a public issue with exploit details.
