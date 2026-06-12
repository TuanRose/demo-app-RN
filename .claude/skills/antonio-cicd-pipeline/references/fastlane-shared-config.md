# Sharing Fastlane Config Across Apps

Reusing config across **multiple apps** — central governance, separate access control. A different goal from in-repo topology (`fastlane-init.md`): not "where in the app repo" but "how do many apps share lanes/credentials". Four techniques — keep them distinct because they solve different problems.

## ① `import_from_git` — pull lanes from a remote repo at runtime
Fastlane's native way to share **lanes**.
```ruby
# Thin Fastfile in the app repo — import + override
import_from_git(url: "https://github.com/myorg/fastlane-config.git",
                branch: "main", path: "fastlane/Fastfile")
lane :beta do
  shared_beta(platform: "ios")   # lane defined in the config repo
end
```
- Clones the config repo into cache at runtime, then loads its Fastfile.
- Private repo: uses existing git creds; on CI configure an HTTPS PAT (same pattern as `match`).
- **Pin a `tag`/commit SHA for production** — pointing at `main` means an upstream change can break every app's build.
- Pros: app repos stay near-empty; edit a lane once → all apps inherit. Cons: weak versioning unless you pin.

## ② `import` — share a file within a monorepo
```ruby
import "../shared/CommonLanes"
```
Simplest, but same-repo only — no cross-repo sharing.

## ③ Fastlane plugin (Ruby gem) — the production-grade way
Package logic as a versioned gem.
```bash
fastlane new_plugin mycompany_release   # scaffolds fastlane-plugin-mycompany_release
```
```ruby
# Gemfile in each app
gem "fastlane-plugin-mycompany_release",
    git: "https://github.com/myorg/fastlane-plugin-mycompany_release", tag: "v1.2.0"
```
```ruby
# app Fastfile — call your custom action like a built-in
lane :beta do
  mycompany_build_and_upload(platform: "ios", env: "qa")
end
```
- Pros: SemVer-versioned, testable, a real library — how large orgs share signing/build logic.
- Cons: heavier setup; needs a gem release process.

## ④ (Don't confuse) the Match repo — a separate repo for CREDENTIALS
`match` already uses a **separate, encrypted git repo** for certs + profiles:
```ruby
# Matchfile
git_url("https://github.com/myorg/ios-certificates"); storage_mode("git")
```
This is "a separate repo" too, but it solves **credentials**, not **Fastfile logic**. When someone says "split the config repo", clarify which they mean: certs → always a `match` repo; lane logic → `import_from_git` / plugin.

## ⑤ CI-tier complement — reusable workflows (GitHub Actions)
```yaml
jobs:
  ios:
    uses: myorg/ci-workflows/.github/workflows/ios-build.yml@v1
    secrets: inherit
```
A shared `ci-workflows` repo holds standard workflows; every app `uses:` it. Combined with `import_from_git`/plugin at the Fastlane tier → the whole pipeline is centralized (YARA's `build-upload-android-config.yml` model).

## Decision matrix

| Need | Solution |
|------|----------|
| Single app | Unified root (`fastlane-init.md`), **no** config repo. Still split a `match` repo for certs. |
| Few apps, one org, share build/signing logic | `import_from_git` (pin a tag) — fast, sufficient |
| Many apps, need versioning + tested config | **Plugin gem** — production standard, worth the investment |
| Certs / profiles | **Always** a dedicated encrypted `match` repo |
| Centralize CI too | Reusable workflows + (`import_from_git` \| plugin) |

**Guidance:** don't extract a config repo for a single app — it's over-engineering. It pays off at **≥ 2–3 apps** in one org. Start with `import_from_git`, graduate to a **plugin gem** when you need versioning/tests. Split the `match` repo from day one regardless of app count, since certs belong in their own encrypted repo.
