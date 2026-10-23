# Security policy

redactly sits on the logging path of many applications, so we treat these as security issues:
- a sensitive value that a built-in detector should catch but does not (a bypass);
- a pattern that can be made super-linear (ReDoS);
- any input that makes redactly throw or return the raw value.

## Reporting

Please **do not open a public issue**. Use GitHub's private vulnerability reporting ("Security" tab → "Report a vulnerability") on the repository. Include a minimal input that reproduces the problem, with any real secret replaced by a fake one.

We aim to acknowledge reports within 3 working days and to ship a fix for confirmed issues within 14 days.

## Supported versions

Only the latest minor release receives security fixes.
