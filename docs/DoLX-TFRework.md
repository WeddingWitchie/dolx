# Transformation Rework

This document describes X-Change's transformation compatibility layer, why it exists, and how to preserve it when importing future vanilla changes.

## Priority: Vanilla First

Vanilla changes always take priority.

When vanilla changes transformation code:

1. Port the vanilla change as written and understand its new behaviour first.
2. Reapply only the smallest X-Change compatibility adjustment needed afterward.
3. Do not replace a new vanilla system with an older copy of the X-Change code.
4. Preserve vanilla progression, transformation decay, unlocks, feats, and rendering unless this document explicitly identifies an X-Change extension.
5. If vanilla introduces its own equivalent abstraction, prefer the vanilla abstraction and adapt or remove the X-Change helper.

The purpose of this rework is not to create a second transformation system. It provides a read-only compatibility view for gameplay while leaving vanilla transformation state authoritative.

## Design Goals

- Chimeras are additive. They add appearance and inherited functionality without replacing their base transformations.
- Chimeras do not write fake transformation points or build values into the save.
- A genome dump may clear raw progression without making still-visible transformation parts lose their related gameplay functionality.
- A player can hide or disable chimera parts in the mirror. Functionality supplied only by those parts should disappear while they are disabled and return when they are shown again.
- Base transformation progression, decay, feats, history, and permanent unlock flags remain independent from chimera functionality.
- Story and gameplay checks should behave consistently across every transformation.
- Exact narration about a horn, wing, ear, or tail must still require that exact part to be visible.

## State Model

There are several different kinds of transformation state. They must not be treated as interchangeable.

### Raw transformation level

Examples include `$angel`, `$demon`, `$wolfgirl`, `$harpy`, `$fox`, and `$waterdragon`.

These values are vanilla progression state. They are used by transformation gain/loss, build conversion, transformation history, feats, save migration, and mirror unlock logic. Chimeras must not artificially raise them.

### Raw transformation build

Examples include `$angelbuild`, `$demonbuild`, `$wolfbuild`, and `$waterdragonbuild`.

Build is also progression state. It must continue to rise and decay according to vanilla rules. Chimeras may expose an effective build to inherited abilities, but must not overwrite the stored build.

### Permanent unlock flags

Examples include `$angeltf`, `$demontf`, `$wolftf`, `$harpytf`, and `$waterdragontf`.

These record that the corresponding base transformation was obtained. They keep mirror choices available after progression changes or a genome dump. A chimera must not automatically award an unrelated base transformation unlock.

### Transformation parts

`$transformationParts` stores the current body-part presentation. Common values are:

- `"disabled"`: the part is not present.
- `"hidden"`: the part is currently hidden.
- a sprite or style value such as `"default"`: the part is active.

Never test active visibility with only `isnot "hidden"`. The value `"disabled"` is also not equal to `"hidden"`, so that check incorrectly treats a missing part as visible.

### Chimera configuration

`$chimera` stores per-part Show/Hide choices for composite sprites such as Bakunawa and Ryuujin. It does not store base transformation progress.

## Compatibility API

The compatibility layer is implemented in `game/03-JavaScript/transformations-state.js`.

### `Transformations.partActive(transformation, part)`

Returns `true` only when a part exists and is neither `"disabled"` nor `"hidden"`.

Use this for exact visible-body-part checks:

```twee
<<if Transformations.partActive("demon", "horns")>>
	Your horns catch the light.
<</if>>
```

Do not write:

```twee
<<if $transformationParts.demon.horns isnot "hidden">>
```

### `Transformations.chimeraActive(name)`

Returns whether a supported functional chimera currently has an active presentation.

Supported functional chimeras are:

| Chimera | Base transformations | Active presentation |
| --- | --- | --- |
| Seraphim | Bird + Angel | Any active Seraphim wing, plumage, or eye part |
| Kitsune | Fox + Angel | Any active Kitsune ear, tail, cheek, or misc part |
| Okami | Wolf + Angel | Any active Okami ear, tail, wing, or misc part |
| Bakunawa | Water Dragon + Demon | A configured active Water Dragon/Demon composite part |
| Ryuujin | Water Dragon + Angel | A configured active Water Dragon/Angel composite part |

Other vanilla hybrid labels and sprite combinations remain presentation logic unless they are deliberately added to this function.

### `Transformations.effectiveLevel(name)`

SugarCube passages normally use the global wrapper:

```twee
<<if effectiveTransformationLevel("angel") gte 6>>
```

The effective level is read-only. It is the highest level implied by:

- the raw vanilla transformation level;
- currently active base transformation parts; or
- a currently active supported chimera.

It does not modify the raw level.

| Name | Raw variable | Part thresholds | Functional chimera sources |
| --- | --- | --- | --- |
| `wolf` | `$wolfgirl` | ears 4, cheeks 5, tail 6 | Okami |
| `cat` | `$cat` | ears 4, tail 6 | None |
| `cow` | `$cow` | horns 2, ears 4, tail 6 | None |
| `bear` | `$bear` | ears 4, tail 6 | None |
| `bird` | `$harpy` | eyes/malar 2, tail/plumage 4, wings 6 | Seraphim |
| `fox` | `$fox` | ears 4, cheeks 5, tail 6 | Kitsune |
| `bunny` | `$bunny` | ears 4, tail 6 | None |
| `angel` | `$angel` | halo 4, wings 6 | Seraphim, Kitsune, Okami, Ryuujin |
| `fallen` | `$fallenangel` | halo/wings 2; plus wings 4 | None |
| `demon` | `$demon` | horns 2, tail 4, wings 6 | Bakunawa |
| `waterdragon` | `$waterdragon` | horns 2, ears 4, tail 7 | Bakunawa, Ryuujin |

### `Transformations.effectiveBuild(name)`

SugarCube passages normally use:

```twee
<<set _build to effectiveTransformationBuild("angel")>>
```

The effective build returns the raw build unless an active functional chimera needs the completed base value. It never writes that value back to the save.

Completed effective builds are currently 100 for animal transformations, 50 for Angel, and 30 for Demon.

### `Transformations.canBanish()`

The global wrapper is `canAngelBanish()`.

Banish availability uses the effective Angel level and the remaining daily Banish count. The daily count is replenished from the effective Angel build. This lets an active Angel chimera retain Banish after a genome dump without forcing `$angel` or `$angelbuild` upward.

Forgive, Seduce, transformation-derived traits, and other inherited actions follow the same effective-level principle.

## Which Check Should Be Used?

### Use an effective level for gameplay capability

Use `effectiveTransformationLevel()` when the question is:

- Does the player have this transformation's ability?
- Should this transformation-specific action or dialogue branch be available?
- Should a transformation-derived stat, allure, attractiveness, instinct, or trait apply?
- Should a story recognise the player's overall transformed nature?
- Should functionality survive a genome dump while the relevant form remains present?

Example:

```twee
<<if effectiveTransformationLevel("demon") gte 6 and $demonseduce isnot 1>>
	<<set _mouth["Seduce"] to "seduce">>
<</if>>
```

### Use `partActive` for exact physical narration

Use `Transformations.partActive()` when text or rendering depends on one exact visible limb.

```twee
<<if Transformations.partActive("bird", "wings")>>
	Your wings brush the doorway.
<</if>>
```

An effective level alone is insufficient here because another chimera part may provide the inherited ability while the narrated wing is hidden.

### Use both only when both facts matter

Some scenes require a completed form and one specific visible low-level part.

```twee
<<if effectiveTransformationLevel("demon") gte 6 and Transformations.partActive("demon", "horns")>>
```

This is valid because Demon horns imply level 2, not level 6. The effective-level condition is not redundant.

### Use raw values only for state ownership

Raw transformation levels and builds are correct when the code is intentionally reading or changing vanilla progression state. Current examples include:

- transformation gain, loss, and decay in `game/base-system/transformations.twee`;
- initialisation and save migration in `game/04-Variables/`;
- permanent base transformation flags in `<<widget "tfcheck">>`;
- mirror menu unlocks and saved description choices in `game/base-system/mirror.twee`;
- transformation history, statistics, and base-transformation feats;
- daily Angel/Fallen/Demon progression in `game/03-JavaScript/time.js`.

Do not mechanically convert these reads to effective levels. For example, using an effective Demon level inside `tfcheck` would let Bakunawa permanently award the base Demon unlock. That violates the additive chimera design.

## Common Mistakes

### Redundant capstone OR checks

Do not combine an effective level with the same capstone part:

```twee
/* Wrong: active Bird wings already imply effective Bird level 6. */
<<if effectiveTransformationLevel("bird") gte 6 or Transformations.partActive("bird", "wings")>>
```

Use only the effective level for capability, or only `partActive` for exact wing visibility.

### Mixing form and visibility without a reason

This is usually redundant:

```twee
<<if effectiveTransformationLevel("wolf") gte 6
	and Transformations.partActive("wolf", "ears")
	and Transformations.partActive("wolf", "tail")>>
```

The active tail already implies effective Wolf level 6. If the scene needs both visible parts, test the two parts. If it only needs Wolf capability, test the effective level.

### Impossible state checks

A part cannot equal `"hidden"` and `"disabled"` at the same time.

```twee
/* Wrong. */
<<if $transformationParts.bird.wings is "hidden"
	and $transformationParts.bird.wings is "disabled">>
```

Use `not Transformations.partActive("bird", "wings")` when the question is simply whether the wing is inactive.

### Forcing raw progression for a chimera

Do not restore code that sets base levels or builds merely because a chimera is active:

```twee
/* Do not do this. */
<<set $angel to Math.max($angel, 6)>>
<<set $angelbuild to Math.max($angelbuild, 50)>>
```

The effective view exists specifically to avoid this save-state mutation.

### Broad helper rewrites in renderers

Canvas renderer files should continue to route existing model options and sprite substitutions. Do not add save migration, schema initialisation, or gameplay-state backfilling to renderer code.

## Genome Dump Behaviour

After a genome dump:

- raw transformation points and builds may be reduced or cleared by vanilla behaviour;
- permanent unlock flags continue to control mirror availability;
- visible transformation parts continue to imply their appropriate effective levels;
- active functional chimeras continue to supply completed effective levels/builds;
- hiding or disabling the relevant parts removes that effective chimera source;
- showing the parts again restores it;
- no raw base transformation progress is recreated by the compatibility layer.

## Mirror and Description Behaviour

`game/base-system/mirror.twee` deliberately distinguishes:

- actual visible/present parts, used for automatic descriptions;
- permanent unlock flags, used to keep manual description options available;
- chimera Show/Hide configuration;
- the saved manual description choice.

Do not replace all mirror checks with effective levels. Mirror code owns presentation and unlock state, so raw values and permanent flags are often intentional there.

`<<tfDescValidList>>` is also used by the Characteristics overlay. Its supported outputs are:

- `_present`, containing current base/chimera presence and the derived Xenos state;
- `_descOption`, containing manual-description eligibility;
- `$tfDescValid`, containing the final list of valid saved choices.

Callers must not depend on implementation-only temporary variables created inside the widget. In particular, do not read `_tfParts`, `_partActive`, or `_baseTfPresent` after calling it. Use `_present`, `Transformations.partActive()`, or `Transformations.chimeraActive()` instead. Temporary-variable side effects are not a stable API and can produce passage-only runtime errors that the Twee compiler cannot detect.

Bakunawa and Ryuujin must be included in:

- the displayed description-name map;
- description option ordering;
- current-presence calculation;
- permanent/manual option validity;
- invalid-choice self-healing;
- chimera Show/Hide controls.

## Allure, Characteristics, and Story Recognition

Transformation-derived allure, attractiveness, traits, actions, and general story recognition should use effective levels. This is what lets Ryuujin, Bakunawa, and the older functional chimeras inherit the relevant base behaviour.

When a line specifically describes a visible limb, combine that gameplay decision with `partActive`, or use `partActive` alone if the limb itself already implies the required level.

Presentation-only hybrid names such as Hellhound, Dog, Jackalope, or Moon Rabbit should keep their local classification logic unless they are promoted into functional chimeras. Do not add them to `chimeraActive()` merely because a narration label exists.

## Important Files

- `game/03-JavaScript/transformations-state.js`: active-part, chimera, effective-level, effective-build, and Banish compatibility helpers.
- `game/base-system/transformations.twee`: authoritative transformation progression and part mutation.
- `game/base-system/mirror.twee`: mirror controls, chimera visibility, and description choices.
- `game/base-system/widgets.twee`: permanent base transformation unlock checks.
- `game/base-system/widgets.js`: shared gameplay widgets that consume effective state.
- `game/base-system/overlays/characteristics.twee`: player-facing allure and transformation factors.
- `game/base-clothing/canvasmodel-img.js`: sprite path and model-option routing.
- `game/base-clothing/canvasmodel-main.js`: transformation layer generation.
- `game/04-Variables/variables-modUpdate.twee`: save migration only; do not put ordinary runtime behaviour here.

## Porting a Future Vanilla Transformation Change

Use this checklist whenever vanilla changes a transformation-related file.

1. Read the full vanilla change and identify whether each check owns state or consumes state.
2. Preserve new vanilla variables, conditions, actions, narration, and renderer behaviour.
3. For new downstream numeric checks, replace the raw transformation read with the matching effective-level or effective-build helper.
4. For exact body-part narration, use `Transformations.partActive()`.
5. Keep raw checks in progression, migration, unlock, feat, history, and mirror-state code.
6. If vanilla adds a new transformation level or body part, update the threshold table in `Transformations.effectiveLevel()`.
7. If vanilla changes build thresholds, update `Transformations.effectiveBuild()` and any ability calculation that consumes it.
8. If vanilla adds a true functional chimera, add its active-part definition and list it only under the base transformations whose functionality it inherits.
9. If vanilla adds only a sprite blend or narration label, do not automatically make it a functional chimera.
10. Verify mirror visibility, automatic descriptions, manual descriptions, genome-dump behaviour, and Show/Hide toggles.
11. Verify every referenced sprite path and filename.
12. Compile and run the structural checks below.

## Validation

From the repository root on Windows:

```powershell
node --check game/03-JavaScript/transformations-state.js
node --check game/base-system/widgets.js
cmd /c compile.bat
git diff --check
```

Useful structural searches:

```powershell
# Gameplay should not mix an effective level with raw part access.
rg -n 'effectiveTransformationLevel\("(angel|fallen|demon|wolf|cat|cow|bear|bird|fox|bunny|waterdragon)"\).*\$transformationParts' game

# Find unsafe visible-part checks for review.
rg -n '\$transformationParts\.[A-Za-z]+\.[A-Za-z]+ isnot "hidden"' game

# Find raw transformation reads and classify every result as state-owning or downstream.
rg -n '\$(angel|fallenangel|demon|wolfgirl|cat|cow|bear|harpy|fox|bunny|waterdragon)\s+(gte|lte|gt|lt|is|isnot)\s+[0-9]+' game

# Catch truthy checks, arithmetic, copies, and writes that the numeric search misses.
rg -n '\$(angel|fallenangel|demon|wolfgirl|cat|cow|bear|harpy|fox|bunny|waterdragon)\b' game

# Effective-level consumers should not accidentally keep a raw build dependency.
rg -n '\$(angelbuild|demonbuild|wolfbuild|catbuild|cowbuild|bearbuild|birdbuild|foxbuild|bunnybuild|waterdragonbuild)\b' game
```

The raw-read search is not expected to return zero. Its remaining results must be intentional state owners. The important rule is that downstream gameplay must use the effective view while progression remains raw.

## Review Rule of Thumb

Ask one question at every transformation check:

> Is this code deciding what transformation state the player owns, or deciding what the currently presented form can do?

- If it owns or mutates state, use raw vanilla values.
- If it decides capability, use effective values.
- If it describes one exact visible body part, use `partActive`.

Keeping that boundary intact is the core of this rework.
