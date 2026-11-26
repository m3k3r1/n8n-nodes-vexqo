# Publishing

Releases are built in this public GitHub repository and staged with npm provenance. n8n verification is a separate review after npm publication.

## One-time setup

The maintainer needs a verified npm account with 2FA and ownership of `n8n-nodes-vexqo`.

Configure an npm trusted publisher:

- GitHub owner: `m3k3r1`
- Repository: `n8n-nodes-vexqo`
- Workflow: `publish.yml`
- Environment: leave blank

The workflow uses staged publishing. It does not need permission to publish directly or change dist-tags. The maintainer approves each staged version in npm with 2FA.

For a new package, staged publishing reserves its name with a public `0.0.0-stage` placeholder. Do not advertise that placeholder as a working node. Bootstrap requires an authenticated npm session. Use a separate bootstrap version, such as `0.0.1-bootstrap.0`: npm rejects another staged candidate with an already staged version. Configure the trusted publisher before staging the final version from GitHub. Never approve the local bootstrap candidate or commit a token.

References: [staged publishing](https://docs.npmjs.com/staged-publishing/), [trusted publishers](https://docs.npmjs.com/trusted-publishers/), [n8n verification](https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/).

## Release steps

1. Update the version, lockfile and changelog. Run build, lint and the runtime suite.
2. Push to `main` and wait for CI.
3. Push a version tag matching package.json, such as `0.1.0`.
4. The Publish action validates, builds, packs and stages the tarball with provenance. Stage the tarball, not the working directory: the node CLI's `prepublishOnly` hook rejects commands outside its own release flow.
5. Review the staged package, source commit and provenance in npm; approve with 2FA.
6. Verify the public version and tarball. Update the README release status.
7. Submit through the n8n Creator Portal's Nodes area. Claim n8n Cloud availability only after approval.

A manual workflow run must use a tag matching package.json. It can retry a failed staging operation.
