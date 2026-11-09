<!-- HYPRGATE NAPPLET MIRROR NOTICE:START -->
> This repository is a read-only mirror of the `blobbi` napplet from `hyprgate/gui`.
> Open issues and pull requests in https://github.com/hyprgate/gui.
> Do not push commits to this standalone napplet repository; direct changes are overwritten by Hyprgate's mirror workflow.
<!-- HYPRGATE NAPPLET MIRROR NOTICE:END -->

# Blobbi

Adopt, hatch and raise a pixel pet. Care for it with music, food, toys and medicine, finish daily
missions, and evolve it into its adult form. An existing Blobbi is imported from Nostr
(kind 31124) when one exists.

Package: `@hyprgate/napp-blobbi`. Source lives in the Hyprgate monorepo at `napplets/blobbi`. The
standalone `hyprgate/napplet-blobbi` repository is a generated, read-only mirror, so send changes
to `hyprgate/web`.

## Working on it

Run these from the Hyprgate checkout so `workspace:*` packages resolve:

```bash
pnpm install --frozen-lockfile
pnpm --filter ./napplets/blobbi paja        # Kehto Paja plus the Vite dev server
pnpm --filter ./napplets/blobbi exec vitest run
pnpm --filter ./napplets/blobbi type-check
pnpm --filter ./napplets/blobbi conformance # builds, then checks dist/
```

## Coins

Coins are earned by caring for a Blobbi. So nobody gets stuck without one, rerolling an egg can't
take you below the adoption cost, and the first adoption always goes through.
