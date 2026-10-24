# Security policy

redactly sits on the logging path of many applications, so a weakness in it can expose the very data it is meant to hide. We take every report seriously.

## Supported versions

| Version        | Supported |
| -------------- | --------- |
| 0.1.x (latest) | ✅        |
| older          | ❌        |

Security fixes are released for the latest minor version only. Upgrade with `npm install redactly@latest`.

## What counts as a vulnerability

- **Bypass**: a sensitive value that a built-in detector or the sensitive key list should catch, but that ends up in the output unredacted.
- **ReDoS**: an input that makes a pattern run in super-linear time.
- **Fail-open**: any input that makes redactly throw, hang, or return the raw value instead of failing closed.
- **Supply chain**: anything that could let an attacker tamper with the published package, the build or the release workflow.

False positives (redacting too much) and missing detectors for new formats are not vulnerabilities: please open a regular issue at https://github.com/Comicwym/redactly/issues.

## Reporting a vulnerability

**Do not open a public issue, discussion or pull request.**

Report privately through GitHub Security Advisories:
https://github.com/Comicwym/redactly/security/advisories/new

Please include:
- the redactly version and runtime (Node, Bun, Deno, browser);
- a minimal input that reproduces the problem, with any real secret replaced by a fake value;
- what you expected and what you got;
- for ReDoS, the input size and the time it takes.

## Disclosure process and timeline

1. **Acknowledgement** within 3 working days.
2. **Assessment**: we confirm the issue and its severity within 7 days and keep you updated at least weekly.
3. **Fix**: confirmed issues are fixed within 14 days (critical ones as fast as possible), released as a patch version with npm provenance, and covered by a regression test.
4. **Disclosure**: we publish a GitHub Security Advisory and request a CVE when relevant, coordinating the date with you. If 90 days pass without a fix, you are free to disclose.

We credit reporters in the advisory unless you prefer to stay anonymous.

## Safe harbor

We will not pursue legal action against good-faith research that follows this policy, avoids privacy violations and service disruption, and only uses test data.
