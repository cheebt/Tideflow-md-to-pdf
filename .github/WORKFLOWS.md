# GitHub Actions Workflows

This repository uses GitHub Actions for automated building and testing.

## Workflows

### 1. CI (`ci.yml`)
**Triggers:** On push to `main` or pull requests

**What it does:**
- Runs TypeScript type checking
- Checks Rust code compilation
- Tests on Windows, Linux, and macOS
- Ensures code quality before merging

### 2. Release (`release.yml`)
**Triggers:** When you push a version tag (e.g., `v1.0.0`)

**What it does:**
- Builds installers for all platforms:
  - **Windows**: NSIS installer + MSI
  - **Linux**: DEB, RPM, and AppImage
  - **macOS**: DMG for Intel and Apple Silicon
- **Code-signs the Windows installers via SignPath** (once configured — see
  [Windows code signing](#windows-code-signing-signpath) below)
- Creates a GitHub Release automatically
- Attaches all installers to the release

> **Note:** Windows is built in its own `release-windows` job so the installers
> can be code-signed *after* the build and *before* they are attached to the
> release. macOS and Linux are still built and published directly by
> `tauri-action`.

## How to Create a Release

### Method 1: Using Git Tags (Recommended)

```bash
# 1. Update version in package.json and tauri.conf.json
# 2. Commit your changes
git add .
git commit -m "Release v1.0.1"
git push

# 3. Create and push a tag
git tag v1.0.1
git push origin v1.0.1
```

That's it! GitHub Actions will:
- Build for Windows, Linux, and macOS
- Create a release
- Upload all installers

### Method 2: Manual Trigger

1. Go to GitHub → Actions → "Release Build"
2. Click "Run workflow"
3. Select the branch and click "Run"

## Monitoring Builds

1. Go to your repository on GitHub
2. Click the "Actions" tab
3. You'll see all running and completed workflows
4. Click on any workflow to see detailed logs

## Build Times

Typical build times:
- **Windows**: ~5-10 minutes
- **Linux**: ~5-10 minutes
- **macOS**: ~10-15 minutes (builds both Intel and ARM)

**Total time**: ~15-20 minutes for all platforms

## What Gets Published

After a successful release build, you'll have:

**Windows** (2 installers):
- `Tideflow_X.X.X_x64-setup.exe` - NSIS installer
- `Tideflow_X.X.X_x64_en-US.msi` - MSI installer

**Linux** (3 packages):
- `tideflow_X.X.X_amd64.deb` - Debian/Ubuntu
- `tideflow-X.X.X-1.x86_64.rpm` - Fedora/RHEL
- `tideflow_X.X.X_amd64.AppImage` - Universal portable

**macOS** (2 DMGs):
- `Tideflow_x64.dmg` - Intel Macs
- `Tideflow_aarch64.dmg` - Apple Silicon (M1/M2/M3)

## Troubleshooting

### Build fails on macOS
- Apple code signing isn't configured (optional)
- The unsigned builds will still work, users just need to right-click → Open

### Build fails on Linux
- Check that all dependencies are listed in the workflow
- Ensure Typst binary has correct permissions

### Release not created
- Make sure you pushed a tag starting with `v` (e.g., `v1.0.0`)
- Check the Actions tab for error logs

## Windows code signing (SignPath)

Unsigned Windows installers trigger the **"Windows protected your PC" /
SmartScreen** warning on download. We remove this by code-signing the installers
with a certificate issued through the **[SignPath Foundation](https://signpath.org/)**
program, which provides **free code signing to open-source projects** (Tideflow
is MIT-licensed and qualifies).

**How it works:** the `release-windows` job builds the unsigned `.msi` and
`-setup.exe`, uploads them as a workflow artifact, and calls SignPath's GitHub
Action. SignPath pulls the artifact, signs it in its cloud (the private key never
touches the runner), and hands back the signed files, which are then attached to
the release. Signing happens *after* the build — no changes to `tauri.conf.json`
are needed.

> **Reputation note:** the SignPath Foundation certificate is an OV
> (Organization Validation) certificate. Signing removes the "unrecognized
> publisher" problem and establishes a stable publisher identity, but SmartScreen
> **reputation still builds up over the first downloads** — the warning fades
> rather than vanishing instantly. Instant trust requires an EV certificate or
> Azure Trusted Signing (both paid).

### One-time setup

Do this once, then every tagged release is signed automatically.

**1. Apply to SignPath Foundation**

- Sign up at <https://signpath.org/> and request the **open-source (Foundation)**
  plan for the `cheebt/Tideflow-md-to-pdf` repository.
- Install the **SignPath GitHub App** on the repository when prompted (this is
  how SignPath verifies the build originates from your CI).

**2. Create the SignPath objects** (in the SignPath web portal)

- A **Project** — note its *slug*.
- An **Artifact configuration** that signs the files inside the uploaded zip —
  configure it to sign `**/*.msi` and `**/*.exe`. Note its *slug*.
- A **Signing policy** (e.g. `release-signing`) linked to the Foundation
  certificate. Note its *slug*.
- Your **Organization ID** (a GUID, shown in account settings).
- A **CI API token** (User settings → API tokens).

**3. Add the values to GitHub**

In the repo: **Settings → Secrets and variables → Actions**.

| Name | Kind | Value |
| ---- | ---- | ----- |
| `SIGNPATH_API_TOKEN` | **Secret** | the CI API token from step 2 |
| `SIGNPATH_ORGANIZATION_ID` | **Variable** | your SignPath organization GUID |
| `SIGNPATH_PROJECT_SLUG` | **Variable** | the project slug |
| `SIGNPATH_SIGNING_POLICY_SLUG` | **Variable** | e.g. `release-signing` |
| `SIGNPATH_ARTIFACT_CONFIG_SLUG` | **Variable** | the artifact configuration slug |

The workflow keys off `SIGNPATH_ORGANIZATION_ID`: while it is empty, Windows
installers are published **unsigned** (with a warning in the job log) so releases
keep working during setup. Once it is set, the signed path activates
automatically.

**4. Release as usual**

Push a `v*` tag (see above). The `release-windows` job will build, sign, and
attach the signed installers to the draft release. Verify a downloaded installer
shows a valid signature: right-click → **Properties → Digital Signatures**.

## Next Steps

To enable code signing for **macOS**:
1. Add Apple Developer certificates to GitHub Secrets
2. Update the workflow with signing configuration
3. See: https://tauri.app/distribute/sign/macos/

For **Windows** code signing, this repo uses SignPath — see
[Windows code signing](#windows-code-signing-signpath) above. Tauri's own
distribution docs: https://tauri.app/distribute/sign/windows/
