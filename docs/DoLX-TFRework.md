# Transformation state and chimeras

X-Change adds chimeras (blends such as Kitsune or Bakunawa) on top of vanilla transformations. This page explains how gameplay code should ask "what can this body do?" without changing the vanilla progression values underneath.

The code is `game/03-JavaScript/transformations-state.js`, exposed as the `Transformations` class plus a few global wrappers.

## Rule 1: vanilla wins

When vanilla changes transformation code:

1. Port the vanilla change as written and understand it first.
2. Then reapply only the smallest chimera adjustment that is still needed.
3. Do not replace a new vanilla system with an old copy of the X-Change code.
4. Keep vanilla progression, decay, unlocks, feats and rendering unless this page names an X-Change extension.
5. If vanilla adds its own version of a helper, use the vanilla one and adapt or remove ours.

This is not a second transformation system. It is a read-only view for gameplay. Vanilla variables stay the source of truth.

## What it guarantees

- Chimeras add appearance and inherited abilities. They never replace the base transformations.
- Chimeras never write fake levels or builds into the save.
- A genome dump can clear raw progress without stripping abilities from parts that are still showing.
- Hiding or disabling a part in the mirror removes any ability that only that part supplied. Showing it again brings the ability back.
- Progression, decay, feats, history and permanent unlock flags do not depend on chimeras.
- Story text about one specific horn, wing, ear or tail still needs that exact part to be visible.

## The kinds of state

They are not interchangeable.

| Kind           | Examples                                                                          | Owned by               | Rule                                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Raw level      | `$angel`, `$demon`, `$fallenangel`, `$wolfgirl`, `$harpy`, `$fox`, `$waterdragon` | Vanilla progression    | Chimeras must not raise it.                                                                                                                |
| Raw build      | `$angelbuild`, `$demonbuild`, `$wolfbuild`, `$birdbuild`, `$waterdragonbuild`     | Vanilla progression    | It rises and decays by vanilla rules. Chimeras may expose an effective build but must not overwrite the stored one.                        |
| Unlock flag    | `$angeltf`, `$demontf`, `$wolftf`, `$harpytf`, `$waterdragontf`                   | Vanilla                | Records that the base form was obtained. Keeps mirror choices available after a genome dump. A chimera must not award an unrelated unlock. |
| Parts          | `$transformationParts`                                                            | Vanilla and the mirror | Per-part presentation, see below.                                                                                                          |
| Chimera config | `$chimera`                                                                        | The mirror             | Per-part Show/Hide choices for composite chimeras (Bakunawa, Ryuujin, Melusine). It holds no progress.                                     |

### Part values

Each entry in `$transformationParts` is one of:

- `"disabled"`: the part does not exist.
- `"hidden"`: the part exists but is hidden.
- anything else, such as `"default"` or a sprite name: the part is showing.

Never test visibility with `isnot "hidden"`. `"disabled"` is also not `"hidden"`, so that check treats a missing part as visible.

The fallen angel's parts live under the key `fallenAngel`, not `fallen`.

## The API

### `Transformations.partActive(transformation, part)`

True only when the part exists and is neither `"disabled"` nor `"hidden"`. Use it for exact visible-part checks.

```twee
<<if Transformations.partActive("demon", "horns")>>
	Your horns catch the light.
<</if>>
```

### Wing helpers

- `Transformations.hasWings()`: any wings showing (angel, fallen angel, demon, bird, okami, seraphim).
- `Transformations.hasNaturalFlightWings()`: bird or seraphim wings.
- `Transformations.hasDivineWings()`: angel, fallen angel, demon or okami wings. They look right but cannot carry the player unaided.
- `Transformations.hasGwylanStrengthenedWings()`: divine wings while Gwylan's strengthening is still running (`$gwylan.wingStrength`).
- `Transformations.hasFlightWings()`: natural flight wings, or strengthened divine wings.

### `Transformations.chimeraActive(name)`

Whether a chimera is showing. It returns `false` for an unknown name.

| Chimera    | Base forms                  | Counts as showing when                                                                                                                                                                       |
| ---------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `seraphim` | Bird + Angel                | Any Seraphim wings, plumage or eyes are showing.                                                                                                                                             |
| `kitsune`  | Fox + Angel                 | Any Kitsune ears, tail, cheeks or misc are showing.                                                                                                                                          |
| `okami`    | Wolf + Angel                | Any Okami ears, tail, wings or misc are showing.                                                                                                                                             |
| `kasha`    | Cat + Demon                 | Cat ears, cat tail, demon horns and demon wings are all showing.                                                                                                                             |
| `catsith`  | Cat + Fallen Angel          | Cat ears, cat tail, fallen angel halo and fallen angel wings are all showing.                                                                                                                |
| `bakunawa` | Water Dragon + Demon        | One of its `$chimera.bakunawa` toggles is on and its water dragon and demon parts are showing (tail with tail, horns with horns, or ears with a demon horn, tail or wing).                   |
| `ryuujin`  | Water Dragon + Angel        | One of its `$chimera.ryuujin` toggles is on and its water dragon and angel parts are showing (tail or horns with an angel halo or wings, or the halo with a water dragon horn, ear or tail). |
| `melusine` | Water Dragon + Angel + Bird | One of its `$chimera.melusine` toggles is on and all three families are showing. Bird wings are required.                                                                                    |

Other hybrid names (Hellhound, Dog, Jackalope, Moon Rabbit) are description labels only. Do not add them here unless they gain real abilities.

### `Transformations.chimeraFull(name)`

True when the chimera is showing and has one of its defining parts. A chimera showing only a cosmetic part still counts as present for the mirror and dialogue (`chimeraActive`), but it is not a finished transformation and must not grant levels, builds or income bonuses.

Defining parts: Seraphim needs wings. Kitsune needs ears or tail. Okami needs ears, tail or wings. Chimeras not in that list already need several parts together, so any active one counts.

This is also why minor cosmetics on their own (bear pubes or plumage, bird eyes or malar markings, seraphim eyes, kitsune cheeks, Okami markings) give no levels, builds or income bonuses.

### `Transformations.effectiveLevel(name)`

Global wrapper: `effectiveTransformationLevel(name)`. Read-only. It is the highest of:

- the raw vanilla level,
- the level implied by showing parts (see the table),
- the "full" level (usually 6) when a supported chimera is `chimeraFull`.

| Name          | Raw            | Part levels                                 | Full | Chimera sources                             |
| ------------- | -------------- | ------------------------------------------- | ---- | ------------------------------------------- |
| `wolf`        | `$wolfgirl`    | ears 4, cheeks 5, tail 6                    | 6    | Okami                                       |
| `cat`         | `$cat`         | ears 4, tail 6                              | 6    | Kasha, Cat Sith                             |
| `cow`         | `$cow`         | horns 2, ears 4, tail 6                     | 6    | none                                        |
| `bear`        | `$bear`        | ears 4, tail 6                              | 6    | none                                        |
| `bird`        | `$harpy`       | eyes 2, malar 2, tail 4, plumage 4, wings 6 | 6    | Seraphim, Melusine                          |
| `fox`         | `$fox`         | ears 4, cheeks 5, tail 6                    | 6    | Kitsune                                     |
| `bunny`       | `$bunny`       | ears 4, tail 6                              | 6    | none                                        |
| `angel`       | `$angel`       | halo 4, wings 6                             | 6    | Seraphim, Kitsune, Okami, Ryuujin, Melusine |
| `fallen`      | `$fallenangel` | halo 2, wings 2 (`fallenplus` wings 4)      | 4    | Cat Sith                                    |
| `demon`       | `$demon`       | horns 2, tail 4, wings 6                    | 6    | Bakunawa, Kasha                             |
| `waterdragon` | `$waterdragon` | horns 2, ears 4, tail 7                     | 7    | Bakunawa, Ryuujin, Melusine                 |

Angel, fallen angel and demon are mutually exclusive. `effectiveLevel` checks demon first, then fallen (at level 2 or more), then angel (at level 1 or more), and only the first one that applies returns a level. The other two return 0.

### `Transformations.effectiveBuild(name)`

Global wrapper: `effectiveTransformationBuild(name)`. Returns the raw build, or a higher floor when parts or a full chimera need the finished value. It never writes back to the save.

- Finished builds: 100 for animal forms and water dragon, 50 for angel, 30 for demon.
- Any showing demon part restores the full demon build (the demon build gates forced impregnation).
- Angel halo gives at least 10 and wings at least 50, so Banish does not get stuck at 0/0 when parts are kept or restored.
- Angel returns 0 while demon or fallen angel is effective.
- A `chimeraFull` chimera listed for that form raises the build to the finished value.

### `Transformations.canBanish()`

Global wrapper: `canAngelBanish()`. True when the effective Angel level is at least 4 and `$angelBanish` is at least 1. This lets a showing Angel chimera keep Banish after a genome dump without raising `$angel` or `$angelbuild`. Forgive, Seduce, transformation traits and other inherited actions follow the same rule.

### Shared traits

`Transformations.sharedTraitSources` lists traits that several forms grant (fangs, sharp eyes, mate for life) and the level each form grants them at. `Transformations.dropTraits(source, ...traits)` disables the traits a form is losing, unless another form still grants them. Use it wherever a transformation loses a trait, so one form dropping it does not remove it from another.

### Other helpers in the same file

- `Transformations.colourableAnimalParts` and `defaults`: which parts can be recoloured, and the default colours.
- `Transformations.isFullWaterDragon()` (global `isFullWaterDragon()`): effective water dragon level 7 and raw `$waterdragon` at least 6. Eggs, dragon labour and the nest use this, not `effectiveLevel`, because a level 7 tail alone can come from a cosmetic unlock after a genome dump.
- Water dragon egg cycle: `waterDragonLayingBlocked()`, `rollWaterDragonEggCycle()`, `waterDragonEggsOverdueDays()`, `waterDragonEggsOverdue()`. Laying pauses during flashbacks, replays, the Hopeless Cycle, combat, soft bad ends, and in the asylum, prison, island and pirate ship. Harper's lab is the exception. Eggs overdue by 3 days are laid wherever the player sleeps.
- `Transformations.bakunawaResonant()` and `bakunawaDamageMultiplier()`: Bakunawa deals 15% more damage under a blood moon.
- `Transformations.stealFortune()`: the Kasha's fortune steal. Adds 2 to `$moorLuck` up to a cap of 10.
- `descriptionPhrase(id)`, `descriptionComboLabel(id)`, `descriptionComboMenuLabel(id)`: names for description keys such as `"hellhound"` or `"cat+fallen"`.

## Which check to use

Ask one question at every transformation check:

> Is this code deciding what state the player owns, or what the current form can do?

- Owns or changes state: use raw vanilla values.
- Decides what the form can do: use the effective level or build.
- Describes one exact visible body part: use `partActive`.

### Effective level, for capability

Use `effectiveTransformationLevel()` for:

- whether the player has a transformation's ability,
- whether a transformation-specific action or dialogue branch is available,
- transformation-derived stats, allure, attractiveness, instinct and traits,
- whether a story recognises the player as transformed,
- anything that should survive a genome dump while the form is still showing.

```twee
<<if effectiveTransformationLevel("demon") gte 6 and $demonseduce isnot 1>>
	<<set _mouth["Seduce"] to "seduce">>
<</if>>
```

### `partActive`, for exact narration

```twee
<<if Transformations.partActive("bird", "wings")>>
	Your wings brush the doorway.
<</if>>
```

The effective level alone is not enough here, because another chimera part could supply the ability while the wing you are describing is hidden.

### Both, only when both facts matter

```twee
<<if effectiveTransformationLevel("demon") gte 6 and Transformations.partActive("demon", "horns")>>
```

This is valid because demon horns only imply level 2, so the level check adds something.

### Raw values, only where you own the state

Reading or changing raw values is right in code that deliberately manages vanilla progression:

- gain, loss and decay in `game/base-system/transformations.twee`,
- initialisation and save migration in `game/04-Variables/`,
- the permanent flags in `<<widget "tfcheck">>` (`game/base-system/widgets.twee`),
- mirror unlocks and saved description choices in `game/base-system/mirror.twee`,
- history, statistics and base-transformation feats,
- daily Angel, Fallen and Demon progression in `game/03-JavaScript/time.js`.

Do not convert these to effective levels. An effective demon level inside `tfcheck` would let Bakunawa permanently award the base Demon unlock.

## Common mistakes

Redundant capstone check. Active bird wings already imply effective bird level 6:

```twee
/* Wrong */
<<if effectiveTransformationLevel("bird") gte 6 or Transformations.partActive("bird", "wings")>>
```

Use the level for capability, or `partActive` for the exact wing. Likewise, if the tail is active the effective wolf level is already 6, so pair `partActive` checks with each other and the level check with capability only.

Impossible state:

```twee
/* Wrong: a part cannot be both */
<<if $transformationParts.bird.wings is "hidden" and $transformationParts.bird.wings is "disabled">>
```

Write `not Transformations.partActive("bird", "wings")` instead.

Forcing raw progress for a chimera:

```twee
/* Never do this */
<<set $angel to Math.max($angel, 6)>>
<<set $angelbuild to Math.max($angelbuild, 50)>>
```

The effective view exists so this is never needed.

Renderer changes: canvas renderer files route model options and sprite substitutions. Do not add save migration, schema setup or gameplay backfilling there.

## After a genome dump

- Raw points and builds may be reduced or cleared by vanilla.
- Permanent unlock flags still control mirror choices.
- Showing parts still imply their effective levels.
- A showing chimera still supplies its finished level and build.
- Hiding or disabling the parts removes that source. Showing them restores it.
- Nothing recreates raw progress.

## Mirror and descriptions

`game/base-system/mirror.twee` keeps four things apart:

- parts that are actually showing (automatic descriptions),
- permanent unlock flags (manual description options stay available),
- the chimera Show/Hide config,
- the saved manual choice (`$tfDesc.primary`).

Do not replace the mirror's checks with effective levels. It owns presentation and unlocks, so raw values and flags are often correct there.

`<<tfDescValidList>>` (`mirror.twee`) is also used by the Characteristics overlay. Its supported outputs are:

- `_present`: what is showing now, per form and per chimera, plus the derived `xenos` state (at least one animal and one divine form, three forms in total),
- `_descOption`: which manual descriptions are allowed (a form is allowed if it is present or its unlock flag is set, and a chimera is allowed if it is present or both its base forms are allowed),
- `$tfDescValid`: the final list of valid saved choices.

Do not read the widget's own temporaries (`_baseTfPresent`, `_animalIds` and similar) after calling it. Temporary-variable side effects are not stable, and a passage that reads a missing one fails at runtime in a way the compiler cannot catch. Use `_present`, `Transformations.partActive()` or `Transformations.chimeraActive()`.

Bakunawa, Ryuujin, Melusine, Kasha and Cat Sith must appear in: the display-name map, the description ordering, the current-presence calculation, manual option validity, invalid-choice self-healing, and the chimera Show/Hide controls (where they have toggles).

Presentation-only labels (Hellhound, Dog, Jackalope, Moon Rabbit, generic `animal+celestial` blends) keep their local logic in `tfDescValidList`.

## Allure, characteristics and story recognition

Transformation-derived allure, attractiveness, traits, actions and story recognition use effective levels. When a line describes a visible limb, combine the level check with `partActive`, or use `partActive` alone if the limb already implies the level.

## Where things are

- `game/03-JavaScript/transformations-state.js`: everything in this page.
- `game/base-system/transformations.twee`: progression and part changes.
- `game/base-system/mirror.twee`: mirror controls, chimera visibility, description choices.
- `game/base-system/widgets.twee`: permanent unlock checks (`tfcheck`).
- `game/base-system/widgets.js`: shared widgets that read effective state.
- `game/base-system/overlays/characteristics.twee` and `traits.twee`: player-facing allure and trait text.
- `game/base-clothing/canvasmodel-img.js` and `game/04-Variables/canvasmodel-main.js`: sprite paths, model options and transformation layers.
- `game/04-Variables/DoLXAddition/variables-modUpdate.twee`: save migration only. No ordinary runtime behaviour here.

## Porting a vanilla transformation change

1. Read the whole vanilla change. For each check, decide whether it owns state or consumes it.
2. Keep new vanilla variables, conditions, actions, narration and rendering.
3. Replace raw reads in new downstream numeric checks with the effective level or build.
4. Use `Transformations.partActive()` for exact body-part narration.
5. Keep raw checks in progression, migration, unlock, feat, history and mirror code.
6. New level or body part in vanilla: update `levelDefinitions` in `Transformations`.
7. Changed build thresholds: update `effectiveBuild()` and anything that consumes it.
8. New functional chimera: add its case to `chimeraActive()`, its defining parts to `chimeraMajorParts` if it has cosmetic-only parts, and list it under the base forms whose abilities it inherits in both `levelDefinitions` and `effectiveBuild`.
9. New sprite blend or narration label only: do not make it a functional chimera.
10. Check mirror visibility, automatic and manual descriptions, genome-dump behaviour and Show/Hide toggles.
11. Check every sprite path and filename.
12. Compile and run the checks below.

## Checks

From the repository root:

```powershell
node --check game/03-JavaScript/transformations-state.js
node --check game/base-system/widgets.js
cmd /c compile.bat
git diff --check
```

Searches to review:

```powershell
# Gameplay should not mix an effective level with raw part access.
rg -n 'effectiveTransformationLevel\("(angel|fallen|demon|wolf|cat|cow|bear|bird|fox|bunny|waterdragon)"\).*\$transformationParts' game

# Unsafe visible-part checks.
rg -n '\$transformationParts\.[A-Za-z]+\.[A-Za-z]+ isnot "hidden"' game

# Raw reads. Every result should be a state owner or a deliberate downstream read.
rg -n '\$(angel|fallenangel|demon|wolfgirl|cat|cow|bear|harpy|fox|bunny|waterdragon)\s+(gte|lte|gt|lt|is|isnot)\s+[0-9]+' game

# Truthy checks, arithmetic and writes the numeric search misses.
rg -n '\$(angel|fallenangel|demon|wolfgirl|cat|cow|bear|harpy|fox|bunny|waterdragon)\b' game

# Effective-level code that still depends on a raw build.
rg -n '\$(angelbuild|demonbuild|wolfbuild|catbuild|cowbuild|bearbuild|birdbuild|foxbuild|bunnybuild|waterdragonbuild)\b' game
```

The raw-read searches will not return zero. The point is that each remaining hit is a state owner, and that downstream gameplay uses the effective view.
