# Body & Gender Mapping

This document describes how X-Change (DoLX) models the player's sex, body, and gender; how that differs from base-DoL's herm representation; and how legacy `"h"` data is migrated so it can't corrupt a save. Read this before touching anything that reads or writes `sex`, `gender_body`, `gender`, or the genital-existence flags — especially herm/futa transformations.

## Priority: Vanilla First

Vanilla changes always take priority.

When vanilla changes how sex/gender is stored or branched:

1. Port the vanilla change as written and understand its new behaviour first.
2. Keep the player's underlying `sex` a real binary (`"m"`/`"f"`) wherever DoLX already does — that is what lets vanilla code treat a DoLX herm as an ordinary male/female.
3. Do not reintroduce `sex === "h"` for the player. DoLX deliberately never sets it (see [Why `"a"` and not `"h"`](#why-a-and-not-h)).
4. Route "is this a herm" questions through `setup.xChangeTransformedRole`, never a hand-rolled value check.

## The Four Fields

The player's body/identity is spread across four fields with **different valid value sets**. Conflating them is the most common source of body bugs.

| Field | Valid values (DoLX) | Meaning |
| --- | --- | --- |
| `$player.sex` | `m`, `f` | Physical anatomy / underlying sex. DoLX keeps this binary even for herms. Vanilla also has `h` (herm), which DoLX force-converts on load. |
| `$player.gender_body` | `m`, `f`, **`a`** | Body archetype used for rendering and transformations. **`a` = herm / androgynous** (two-genital body). This is DoLX's herm marker. |
| `$player.gender` | `m`, `f` | Base gender identity. DoLX normalises anything else (`h`, `t`, …) to `m`/`f`. Preserved across transformations — a genderflip changes the *body*, not this. |
| `$player.gender_appearance` | `m`, `f` | How the player reads to others, computed from clothing/build/genitals. A herm resolves via a tiebreak. Read it through `perceivedGender()`; do not set it directly. |

Genital presence is tracked separately by boolean flags, independent of the labels above:

- `$player.penisExist`, `$player.vaginaExist`, `$player.ballsExist`
- A **herm** is precisely `gender_body === "a"` with `penisExist === true && vaginaExist === true` and a real `sex` of `"m"`/`"f"`.

Sizes are `$player.penissize`, `$player.breastsize`, `$player.bottomsize`, `$ballssize`. Penis size scale (see save.js settings): `0 = Micro, 1 = Mini, 2 = Tiny, 3 = Small, 4 = Normal, 5 = Large, 6 = Enormous`.

### Key insight: sex, body, and identity can all disagree

`sex` (anatomy), `gender_body` (rendered body), and `gender` (identity) are independent. A feminine male is `sex "m"` + `gender "f"`; a masculine female is `sex "f"` + `gender "m"`. Transformations must key off the field that actually describes what they change:

- Genital restore/creation keys off **anatomy** (the original body's `sex`), not identity.
- This exact confusion caused the herm "stuck at Micro penis" bug: `<<hermify>>` restored genitals by `$player.gender` (identity) while the genderflip-first step created/destroyed them by `$player.sex` (body). When they disagreed, the wrong branch ran and the new penis was never sized. Fixed by keying the restore on the original body's `sex`.

## Herm: DoLX vs Vanilla

There are two different herm representations. Do not conflate them.

- **Vanilla herm = `sex === "h"`.** Base DoL's native value, alive throughout vanilla code (farm, work, swimming, pregnancy, captions, combat behaviour, `player.js`, `time.js`, `feats.js`; NPCs Gwylan/Sydney/Kylar use `gender === "h"`).
- **DoLX herm = `gender_body === "a"` + `sex` of `"m"`/`"f"` + both genitals.** Set by `<<hermify>>` (`game/base-system/kozmods/xchange.twee`), which writes `gender_body "a"`, `sex "m"`, `penisExist`/`vaginaExist` true, and never touches `$player.gender`.

The canonical detector is `setup.xChangeTransformedRole($player.gender_body)` (`game/base-system/kozmods/koztools.js`): it returns `"herm"` **only** for `"a"`, otherwise `"xchange"`.

### Why `"a"` and not `"h"`

`"h"` predates `"a"` historically, so it is tempting to reuse it. Don't — DoLX chose `"a"` on purpose:

1. **Vanilla-compatibility.** Vanilla branches on `sex === "h"` in hundreds of places, much of it the herm combat/encounter code a previous Akoz found crashy and removed. By keeping `sex` binary and marking the herm body with `gender_body "a"` instead, vanilla systems treat a DoLX herm as an ordinary male/female and those buggy paths never fire.
2. **`"h"` is an invalid `gender_body` in DoLX.** `xChangeBodySnapshotUsable` requires `gender_body ∈ {m, f, a}` and `sex ∈ {m, f}`. A body carrying `gender_body "h"` fails validation and surfaces the loud `<<error>>` in load-body/save-body.
3. **Nothing recognises `gender_body "h"` as herm.** Only `"a"` maps to `"herm"`.

**Therefore `"h"` is only ever an input to migrate away from — never a value DoLX should write.** When converting an unsupported herm the target is `"m"` (a plain male body), not `"h"` and not `"a"`.

## `"h"` Migration Coverage

Legacy `"h"` can arrive from old base-DoL saves or early X-Change builds. It is handled in three places; keep all three intact.

### 1. Body snapshots — one-time, flagged

Pill body snapshots (`originalBody`, `changedBody`, `hermBody`, `clonedBody[*]`) are migrated by `xChangeMigrateLegacyHermSnapshots()` (`game/base-system/kozmods/xchange.js`), invoked once behind `$xchange._didLegacyBodySexFix` in `version-update.twee` (~line 937). It converts `gender_body "h" → "a"`, derives a valid `sex` when missing, and touches nothing else — anything else malformed still surfaces loudly rather than being silently reset.

### 2. Live player, unsupported sex — the conversion block

`game/04-Variables/kozmods/version-update.twee` (~line 1369): if `$player.gender` or `$player.sex` is not `m`/`f` (i.e. a vanilla `"h"` herm or other unsupported value), the player is force-converted to a consistent **male** body — `gender`, `sex`, **and `gender_body`** set to `"m"`, genitals reset to male-only — and `$hermSaveWarningMessage` / `$xchange.saveWasLoadedAsHerm` are set. This follows the project decision to flip leftover herms to a single sex rather than normalise them to the DoLX herm shape.

> The `gender_body "m"` line here was added deliberately: an older version set `gender`/`sex` but not `gender_body`, so a legacy `"h"` body stayed frozen as `gender_body "h"` after everything else became male.

### 3. Live player, lingering invalid `gender_body` — one-time heal

Right after the conversion block, a one-time pass behind `$xchange.fixLiveGenderBody` normalises any live `gender_body` **not** in `{m, f, a}` to match `$player.sex`. This heals saves that were already frozen with `gender_body "h"` by the older conversion (which won't re-enter the block once `sex` is valid). It never touches a valid `m`/`f`/`a` body, so real DoLX herms are left alone. It logs to `$xchange.errorLog`.

### Related repair: herm Micro penis

Also in `version-update.twee`, behind `$xchange.fixHermMicroPenis`: a currently-herm body (or its cached `hermBody` snapshot) left with a size-0/invalid penis is regenerated to at least Normal, capped to the configured penis-size range. This repairs saves — including permanent herms — affected by the old identity-keyed `<<hermify>>` bug before it was root-fixed.

## Helper Functions

- `setup.xChangeTransformedRole(genderBody)` — `"herm"` for `"a"`, else `"xchange"`. The one true "is this a herm body" check. (koztools.js)
- `xChangeBodySnapshotUsable(body)` — validation gate for body snapshots: requires numeric sizes, `gender_body ∈ {m,f,a}`, `sex ∈ {m,f}`. A failing snapshot is reported, never silently repaired. (xchange.js)
- `xChangeMigrateLegacyHermSnapshots()` — one-time `"h" → "a"` snapshot migration + sex derivation. (xchange.js)
- `perceivedGender()` — how the player reads to others; wraps `gender_appearance` with the herm/nudity tiebreak. Read this, don't poke `gender_appearance`. (widgets.js)

## Gotchas

- **Never write `sex "h"` for the player.** It re-lights the buggy vanilla herm paths DoLX avoids.
- **Never write `gender_body "h"`.** It is invalid (validator rejects it) and unrecognised as herm.
- **Don't hand-roll `["a","h"].includes(gender_body)`** for herm detection — it implies DoLX supports live `"h"` (it doesn't) and diverges from `xChangeTransformedRole`. Use the helper.
- **Restore genitals by anatomy, not identity.** When creating/restoring genitals during a transform, branch on the original body's `sex` (`$xchange.pill.originalBody.sex`), not `$player.gender`.
- **A herm always has both genitals and a non-zero penis.** If a code path can leave a herm with `penissize` 0, add a guard that regenerates it (as `<<hermify>>` now does after its cached-vs-fresh branch).
- **Migrations are one-time and flagged, never per-load resets.** Follow the existing `$xchange.fix*` pattern and log to `$xchange.errorLog`; only touch definitively-invalid data.

## Important Files

- `game/base-system/kozmods/xchange.twee`: `<<hermify>>`, `<<become-boy>>`/`<<become-girl>>`, `<<save-body>>`/`<<load-body>>`, the effect processor, and `<<xchange-restore>>`.
- `game/base-system/kozmods/xchange.js`: `xChangeBodySnapshotUsable`, the legacy `"h"` snapshot migration, and derivation helpers.
- `game/base-system/kozmods/koztools.js`: `setup.xChangeTransformedRole`.
- `game/04-Variables/kozmods/version-update.twee`: the live-player migrations — unsupported-sex conversion (`$hermSaveWarningMessage`), `fixLiveGenderBody`, `fixHermMicroPenis`, `fixGiStaleSex`, and the snapshot-migration trigger.
- `game/base-system/widgets.js`: `perceivedGender()` and the `gender_appearance` calculation.

## Validation

From the repository root on Windows:

```powershell
node --check game/base-system/kozmods/xchange.js
node --check game/base-system/kozmods/koztools.js
cmd /c compile.bat
git diff --check
```

Useful structural searches:

```powershell
# The player should never be assigned sex "h" anywhere.
rg -n '\$player\.sex\s+to\s+"h"' game
rg -n 'player\.sex\s*=\s*"h"' game

# gender_body should only ever be written as m / f / a.
rg -n 'gender_body\s+to\s+"h"' game

# Herm detection should go through the helper, not a raw value list.
rg -n '\["a","h"\]|gender_body\s+is\s+"a"' game
```
