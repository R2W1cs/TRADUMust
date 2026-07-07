# SignBridge extension — offline 3D CWASA

The **3D CWASA Avatar** mode bundles the signing runtime inside `extension/3d/` so it works without loading scripts from the internet.

## One-time setup

From the repo root:

```bash
npm run extension:cwasa
```

This downloads CWASA binaries to `public/asl-avatar/` (if missing) and copies them plus **58 native ASL SiGML** glosses into `extension/3d/`.

## Reload after setup

1. Open `chrome://extensions`
2. Click **Reload** on SignBridge
3. Choose **3D CWASA Avatar** in the popup

## What's bundled

| Path | Purpose |
|------|---------|
| `3d/cwa/allcsa.js` | CWASA runtime (~15 MB) |
| `3d/cwa/cwasa.css` | Avatar styles |
| `3d/avatars/*.jar` | Anna, Marc, Françoise 3D models |
| `3d/sigml/asl/*.sigml` | Native ASL signs (offline) |

Glosses not in the local ASL library fall back to the remote 3dasl CDN when online.

## Scripts

- `npm run extension:cwasa` — ensure cache + sync to extension
- `npm run extension:setup` — alias for the above

Large binaries are gitignored; run `extension:cwasa` after clone.
