# Security Policy

## Supported Versions

We actively monitor and patch our deployment workflows, Cloudflare Worker routes, and public assets. Only the latest live deployment environment and the current primary version of this public repository receive security updates.

| Version | Supported          | Environment / Scope |
| ------- | ------------------ | ------------------- |
| Live (v1.x) | :white_check_mark: | `card.tccards.tn` Live Infrastructure |
| Main Branch | :white_check_mark: | GitHub Pages & Active Actions Workflows |
| Beta / Dev  | :x:                | Experimental Testing Workflows |
| Legacy (v0.x)| :x:               | Obsolete Proof-of-Concept Repositories |

---

## Reporting a Vulnerability

We take the security of our user metadata, vCard downloads, and dynamic URL routing very seriously. If you discover a security vulnerability, please do not open a public GitHub issue. Instead, report it privately to ensure our infrastructure remains safe.

### How to Report
1. **Email Us:** Send a detailed security report directly to **security@tccards.tn**.
2. **Include Details:** Provide a clear description of the vulnerability, the component affected (e.g., Cloudflare Worker, Google Apps Script backend, or Frontend script), and actionable steps or a Proof of Concept (PoC) to reproduce the issue.

### What to Expect
- **Acknowledgment:** We will acknowledge receipt of your report within **48 hours**.
- **Status Updates:** Our core engineering team will provide status updates at least once every **3 business days** while analyzing and resolving the issue.
- **Resolution:** If the vulnerability is accepted, we will deploy a fix directly to our live production pipeline. We will coordinate a public disclosure timeframe with you if appropriate.

Thank you for helping keep TC Cards secure for all users!
