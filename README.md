# Achievement Reviver (Web) v1.0

Restore Xbox Achievements and pure Survival mode to Minecraft Bedrock worlds directly in your web browser — 100% client-side, zero uploads, zero server processing.

**Created by [NIVYT](https://nivyt.pages.dev)**

---

## Overview

In **Minecraft Bedrock Edition**, toggling cheats on or opening a world in Creative mode flags the world permanently, locking Xbox Live Achievements forever.

**Achievement Reviver** solves this directly in your browser. Using client-side binary DataView inspection and in-memory Little-Endian NBT patching, it cleans the cheat flags and locks your world back to Survival in seconds.

- **100% Client-Side Privacy:** Your world files never leave your computer. Everything happens in your browser.
- **Large World Archive Support:** Handles `.mcworld` and `.zip` archives up to 300+ MB via JSZip.
- **Dual level.dat & level.dat_old Synchronization:** Patches both primary and backup files so Bedrock never rolls back your achievements.
- **Authentic Minecraft Chunker Aesthetic:** Authentic 4-stage stepper, Minecraft typography, and tactile 3D badges.

---

## NBT Tags Restored

| NBT Tag | Type | Patched Value | Description |
| :--- | :--- | :--- | :--- |
| `hasBeenLoadedInCreative` | `TAG_Byte` | `0` | Clears creative mode taint |
| `cheatsEnabled` | `TAG_Byte` | `0` | Disables cheat mode flags |
| `commandsEnabled` | `TAG_Byte` | `0` | Disables cheat slash commands |
| `GameType` | `TAG_Int` | `0` | Sets default gamemode to Survival |
| `ForceGameType` | `TAG_Byte` | `1` | Enforces Survival on world join |

---

## Deployment & Hosting

This project is a static web application and requires no backend or build step:

- **Cloudflare Pages / Vercel / Netlify:** Push repository and set build command to empty / root directory.
- **Local Testing:**
  ```bash
  python -m http.server 8080
  ```
  Open `http://localhost:8080` in your web browser.

---

## Credits & Author

- **Author:** [NIVYT](https://nivyt.pages.dev)
- **Main Website:** [https://nivyt.pages.dev](https://nivyt.pages.dev)
- **License:** MIT License
