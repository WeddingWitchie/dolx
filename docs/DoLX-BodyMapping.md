# Body and gender fields

How X-Change stores the player's sex, body and gender, how its herm differs from base DoL's herm, and how old `"h"` data gets migrated. Read this before touching anything that reads or writes `sex`, `gender_body`, `gender`, or the genital flags.

## Rule 1: vanilla wins

If vanilla changes how sex or gender is stored or branched:

1. Port the vanilla change as written and understand it first.
2. Keep `$player.sex` a real `"m"` or `"f"`. That is what lets vanilla code treat an X-Change herm as an ordinary man or woman.
3. Never write `sex "h"` for the player.
4. Ask "is this a herm body?" with `setup.xChangeTransformedRole($player.gender_body)`. Do not compare values by hand.

## The four fields

These fields have different valid values. Mixing them up is the most common cause of body bugs.

| Field                       | Values        | Meaning                                                                                                                       |
| --------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `$player.sex`               | `m`, `f`      | Anatomy. Stays binary even for a herm. Vanilla can also hold `h`, which X-Change converts on load.                            |
| `$player.gender_body`       | `m`, `f`, `a` | The body used for rendering and transformations. `a` means herm (two genitals).                                               |
| `$player.gender`            | `m`, `f`, `n` | Identity. A body change does not touch it. Load-time checks accept `m`, `f` and `n`; anything else is converted.              |
| `$player.gender_appearance` | `m`, `f`      | How the player reads to others, worked out from clothes, build and genitals. Do not set it. Read `perceivedGender()` instead. |

Genitals are tracked separately by `$player.penisExist`, `$player.vaginaExist` and `$player.ballsExist`. A herm body has `gender_body` `"a"`, both `penisExist` and `vaginaExist` true, and a real `sex` of `m` or `f`.

Sizes are `$player.penissize`, `$player.breastsize`, `$player.bottomsize` and `$ballssize`. Penis size runs `0 Micro, 1 Mini, 2 Tiny, 3 Small, 4 Normal, 5 Large, 6 Enormous`.

`perceivedGender()` (in `game/base-system/widgets.js`) returns `m`, `f`, or `n` when the player reads as androgynous. It follows the nude-gender-perception setting: 0 ignores genitals, 1 re-scores the whole body once genitals are visible, 2 goes by anatomy alone once genitals are visible (a herm still reads by appearance).

### The fields can disagree

A feminine man is `sex "m"` with `gender "f"`. A transformation must use the field that matches what it changes. Restoring or creating genitals uses anatomy (the original body's `sex`), not identity.

This mix-up caused the "herm stuck at Micro penis" bug: `<<hermify>>` restored genitals by `$player.gender`, while the step before it created or removed them by `$player.sex`. When the two disagreed, the wrong branch ran and the new penis never got a size. The restore now keys off the original body's `sex`.

## Herm: X-Change versus vanilla

- **Vanilla herm** is `sex === "h"`. Vanilla branches on it in many places: farm, work, swimming, pregnancy, captions, combat, `player.js`, `time.js`, `feats.js`. Gwylan, Sydney and Kylar use `gender === "h"`.
- **X-Change herm** is `gender_body "a"` with `sex` `m` or `f` and both genitals. `<<hermify>>` sets it (`game/base-system/DoLXAddition/xchange/xchange.twee`). It sets `gender_body "a"`, `sex "m"`, and both exist flags, and it never touches `$player.gender`.

`setup.xChangeTransformedRole(genderBody)` (`game/base-system/DoLXAddition/koztools.js`) returns `"herm"` for `"a"` and `"xchange"` for anything else.

### Why `"a"` and not `"h"`

1. Vanilla checks `sex === "h"` in hundreds of places, including herm combat code that a previous developer found crash-prone and removed. Keeping `sex` binary means vanilla treats an X-Change herm as a normal man or woman and those paths never run.
2. `xChangeBodySnapshotUsable` only accepts `gender_body` in `m`, `f`, `a` and `sex` in `m`, `f`. A snapshot with `gender_body "h"` fails and shows a loud `<<error>>` in `<<load-body>>` and `<<save-body>>`.
3. Only `"a"` maps to `"herm"`.

So `"h"` is only ever something to migrate away from. Never write it. When converting an unsupported herm, the target is a plain male body (`"m"`), not `"h"` or `"a"`.

## Migrating old `"h"` data

Old base-DoL saves and early X-Change builds can carry `"h"`. Three places handle it. Keep all three.

### 1. Body snapshots (once)

`xChangeMigrateLegacyHermSnapshots()` in `game/base-system/DoLXAddition/xchange/xchange.js` fixes the stored pill bodies: `originalBody`, `changedBody`, `hermBody` and each `clonedBody` entry. It turns `gender_body "h"` into `"a"` and works out `sex` if it is missing. Nothing else is changed. Other bad data still shows the loud error.

It runs once, from `game/04-Variables/DoLXAddition/version-update.twee`, behind `$xchange._didLegacyBodySexFix`.

### 2. The live player with an unsupported sex

Also in `version-update.twee`: if `$player.gender` is not `m`, `f` or `n`, or `$player.sex` is not `m` or `f`, the player becomes a consistent male body. `gender`, `sex` and `gender_body` all become `"m"`, and genitals reset to male-only. It also sets `$hermSaveWarningMessage` and `$xchange.saveWasLoadedAsHerm`. The project decision is to flip leftover herms to one sex rather than reshape them into the X-Change herm.

The `gender_body "m"` line was added on purpose. An older version reset `gender` and `sex` but not `gender_body`, which left a legacy `"h"` body stuck.

### 3. A live player with a bad `gender_body` (once)

Right after that block, `$xchange.fixLiveGenderBody` runs once. It sets any live `gender_body` outside `m`, `f`, `a` to match `$player.sex`. This heals saves the older conversion left with `"h"`. It never touches a valid `m`, `f` or `a`, so real herms are safe. It logs to `$xchange.errorLog`.

### Other one-time repairs in the same file

- `$xchange.fixGiStaleSex`: the gender-identity shift used to leave `$player.sex` stale mid-shift. If sex and genitals clearly disagree (male sex with only a vagina, or female sex with only a penis), sex is corrected to match.
- `$xchange.fixDefaultGenderBody`: character creation sets `gender_body` to `"a"` (`variables-start.twee`) and nothing changed it unless a herm-capable pill applied. That made ordinary saves read as herms everywhere that checks `gender_body`, including the body-appearance femininity factor and `xChangeTransformedRole`. If `gender_body` is still `"a"` and the player has never been X-Changed, it is set to `sex`. Permanent pills still count as X-Changed, so real herms are left alone.
- `$xchange.fixHermMicroPenis`: a herm body (or its cached `hermBody` snapshot) with a penis size below 1 gets a size of at least Normal, capped to the configured penis range. This repairs saves hit by the old identity-keyed `<<hermify>>` bug.

## Helpers

| Helper                                     | File          | What it does                                                                                                                                                                                        |
| ------------------------------------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setup.xChangeTransformedRole(genderBody)` | `koztools.js` | `"herm"` for `"a"`, otherwise `"xchange"`. The only herm check to use.                                                                                                                              |
| `xChangeBodySnapshotUsable(body)`          | `xchange.js`  | Validates a saved body. Needs numeric sizes, a face style and variant, a body shape, `gender_body` in `m`, `f`, `a` and `sex` in `m`, `f`. A failing snapshot is reported, never silently repaired. |
| `xChangeMigrateLegacyHermSnapshots()`      | `xchange.js`  | The one-time snapshot migration above.                                                                                                                                                              |
| `playerIsXChanged()`                       | `xchange.js`  | True while the player is in an X-Change body, including permanent pills.                                                                                                                            |
| `perceivedGender()`                        | `widgets.js`  | How the player reads to others.                                                                                                                                                                     |

## Gotchas

- Never write `sex "h"` for the player. It re-enables the vanilla herm paths X-Change avoids.
- Never write `gender_body "h"`. The validator rejects it and nothing reads it as a herm.
- Do not write `["a","h"].includes(gender_body)`. It implies a live `"h"` is supported, and it drifts from `xChangeTransformedRole`.
- Restore genitals by anatomy. Branch on `$xchange.pill.originalBody.sex`, not `$player.gender`.
- A herm always has both genitals and a penis size of at least 1. If a path can leave a herm at size 0, add a guard that regenerates it, as `<<hermify>>` does after its cached-or-fresh branch.
- Migrations run once behind a `$xchange.fix*` flag and log to `$xchange.errorLog`. Only touch data that is definitely invalid. Never reset on every load.

## Where things are

- `game/base-system/DoLXAddition/xchange/xchange.twee`: `<<hermify>>`, `<<become-boy>>`, `<<become-girl>>`, `<<save-body>>`, `<<load-body>>`, `<<xchange-restore>>`.
- `game/base-system/DoLXAddition/xchange/xchange.js`: snapshot validation and the legacy migration.
- `game/base-system/DoLXAddition/koztools.js`: `setup.xChangeTransformedRole`.
- `game/04-Variables/DoLXAddition/version-update.twee`: the live-player migrations and the snapshot migration trigger.
- `game/base-system/widgets.js`: `perceivedGender()` and the `gender_appearance` calculation.

## Checks

From the repository root:

```powershell
node --check game/base-system/DoLXAddition/xchange/xchange.js
node --check game/base-system/DoLXAddition/koztools.js
cmd /c compile.bat
git diff --check
```

Searches that should stay clean:

```powershell
# The player is never assigned sex "h".
rg -n '\$player\.sex\s+to\s+"h"' game
rg -n 'player\.sex\s*=\s*"h"' game

# gender_body is only ever written as m, f or a.
rg -n 'gender_body\s+to\s+"h"' game

# Herm detection goes through the helper.
rg -n '\["a","h"\]|gender_body\s+is\s+"a"' game
```
