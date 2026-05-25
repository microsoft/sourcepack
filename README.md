# SourcePack

SourcePack is a thin layer on top of NPM for adding agent definitions, agent skills, and other source code assets to a source tree in a versioned and managed way.

## Publisher Guide

This section is for authors who want to publish their own SourcePack packages via GitHub Packages, either for internal use within an organization or for public consumption.

### Configure GitHub Packages for Your Organization

GitHub Packages is enabled by default on all repositories — there is no per-repository toggle. Configuration is done at the **organization** level.

1. Go to your organization on github.com.
2. Click **Settings**.
3. In the left sidebar under **Code, planning, and automation**, click **Packages**.
4. Under **Package Creation**, select which visibility types organization members can create:
   - **Public** — anyone can access the packages.
   - **Private** — only collaborators and org members with explicit access.
   - **Internal** — visible to all organization members (and all enterprise members if the org belongs to an enterprise).
5. Under **Default Package Settings**, confirm whether **Inherit access from source repository** is selected. When enabled, packages automatically inherit access permissions from the repository they are linked to via the `repository` field in `package.json`.

### Package Visibility and Access

- Packages are **private by default** when first published.
- A published package's visibility can be changed in the package's own settings page (Organization > **Packages** tab > select package > **Package settings** > **Danger Zone** > **Change visibility**).
- When a package is linked to a repository (via the `repository` field in `package.json`), it inherits the repository's access permissions automatically, and GitHub Actions workflows in that repository get access to the package.

### Configure Repository Permissions for GitHub Actions

The publish workflow uses the `GITHUB_TOKEN` to authenticate to GitHub Packages. By default, this token may only have read permissions. You must grant it write access so that `npm publish` can push packages.

1. Go to your repository on github.com.
2. Click **Settings**.
3. In the left sidebar, click **Actions** > **General**.
4. Scroll down to **Workflow permissions**.
5. Select **Read and write permissions**.
6. Click **Save**.

## Consumer Guide

### Prerequisites

To install packages from this project, you need to authenticate to GitHub Packages.

1. **Create a Personal Access Token (classic)** — Go to github.com > profile icon > **Settings** > **Developer settings** > **Personal access tokens** > **Tokens (classic)**. Generate a token with at least the `read:packages` scope. If your org uses SSO, click **Configure SSO** next to the token and authorize it for your organization.

2. **Log in to the GitHub Packages npm registry**:

```bash
npm login --scope=@microsoft --auth-type=legacy --registry=https://npm.pkg.github.com
```

Enter your GitHub username and paste the PAT as the password.

3. **Add an `.npmrc` file** to your consuming project (in the same directory as `package.json`):

```
@microsoft:registry=https://npm.pkg.github.com
```

### Installing Packages

Install individual component packages as needed:

```bash
npm install --save-dev @microsoft/sourcepack-sample-readme
```

Or pin a specific version:

```bash
npm install --save-dev @microsoft/sourcepack-sample-readme@0.0.1
```

After installation, templates are available under `node_modules/@microsoft/sourcepack-sample-readme/`.

### Scaffolding Files

After installing template packages, use the CLI to copy template files and directories into your project:

```bash
npx @microsoft/sourcepack-cli init
```

This reads each installed package's `sourcepack.json` manifest and processes two types of entries:

**Files** — Individual files copied to a destination. Each entry requires an `ifExists` key:
- `replace` — Overwrite the existing file with the source.
- `skip` — Do nothing if the file already exists.

**Directories** — Entire directory trees installed as a unit. Each entry requires an `ifExists` key:
- `replace` — Delete the existing directory and replace it entirely with the source.
- `skip` — Do nothing if the directory already exists.
- `merge` — Copy source files into the destination without removing extra files already present.

The CLI prints a status line for each item processed:

```
@microsoft/sourcepack-sample-readme:
  COPY: README.md .
@microsoft/sourcepack-sample-tickets:
  COPY: Ticket.md _templates
  REPLACE: .github/skills/pending-tickets
```

If a file already exists and `ifExists` is `skip`:

```
  SKIP: README.md .
```

If a directory already exists and `ifExists` is `skip`:

```
  SKIP: .github/skills/pending-tickets
```

#### Automatic Scaffolding (Optional)

To run scaffolding automatically on every `npm install`, add a `postinstall` script to your consuming project's `package.json`:

```json
"scripts": {
  "postinstall": "npx @microsoft/sourcepack-cli init"
}
```

This eliminates the manual `npx` step — files are scaffolded each time dependencies are installed or updated.

### Upgrading Packages

To update to the latest version:

```bash
npm update @microsoft/sourcepack-sample-readme
```

Or install a specific newer version:

```bash
npm install --save-dev @microsoft/sourcepack-sample-readme@0.1.5
```

### Removing Packages

To uninstall a component package:

```bash
npm uninstall @microsoft/sourcepack-sample-readme
```

### Available Packages

| Package | Description | Contents |
|---------|-------------|----------|
| `@microsoft/sourcepack-sample-readme` | Vision Document template | `README.md` |
| `@microsoft/sourcepack-sample-tickets` | Tickets templates and skills | `Ticket.md`, `pending-tickets/` skill |
| `@microsoft/sourcepack-sample-agents` | Agents configuration template | `AGENTS.md` |
| `@microsoft/sourcepack-obsidian-simplevault` | Simple Obsidian vault configuration | `.obsidian/` directory |
