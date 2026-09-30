# Pregnancy

How pregnancy works in the code: how cum turns into a pregnancy, how a pregnancy is stored, how births and children work, and the X-Change additions on top. This page replaces the old five-file description. The system now runs on records (`V.pregnancies`, `V.childRecords`), not on per-mother objects.

This page names tuning values instead of copying them. The numbers live in `PregnancyConstants` (`pregnancy-constants.js`), so read them there.

Vanilla changes come first. When vanilla changes pregnancy code, port the vanilla change as written, then reapply only the smallest X-Change adjustment still needed. X-Change additions are marked "DoLX" in comments and listed in [X-Change additions](#x-change-additions).

## The files

Code is in `game/03-JavaScript/04-Pregnancy/`:

| File                          | What it holds                                                                                                                                            |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pregnancy-constants.js`      | `PregnancyConstants`: every tuning number (grace period, depth weights, cycle, gestation, litter weights, gene pools). Change numbers here, not in code. |
| `conception.js`               | Cum loads, conception rolls, the pending conception, fertility and cycle maths, the morning-after pill.                                                  |
| `pregnancy-macros.js`         | The macros scenes call: `<<combatInseminate>>`, `<<sceneInseminate>>`, `<<npcPregnancyRoll>>`, `<<sillyInseminate>>`.                                    |
| `eligibility.js`              | Can this pair conceive? Anatomy, settings, scene flags.                                                                                                  |
| `pregnancy-records.js`        | The record store, due dates, labour, who knows what.                                                                                                     |
| `pregnancy-lifecycle.js`      | Player pregnancy per-tick effects, birth, NPC pregnancy, stored NPCs.                                                                                    |
| `child-generator.js`          | Species, litter size, child genes, names.                                                                                                                |
| `parasite.js`                 | Parasite pregnancies. A separate system, still on `$sexStats`.                                                                                           |
| `story-functions.js`          | Read-only helpers for scenes (belly size, risk meter, heat, knowledge).                                                                                  |
| `children-story-functions.js` | Helpers for born children and their activities.                                                                                                          |
| `pregnancy-migration.js`      | Converts old saves to the records system.                                                                                                                |

The twee side is `game/base-system/pregnancy/` (`pregnancy.twee`, `pregnancy-widgets.twee`, `children.twee`, `children-events.twee`, `events.twee`, `containers.twee`). The realistic childbirth encounter is in `game/special-xchange/DoLXAddition/RCB-Mod/`.

Two naming rules:

- The player is always the string `"pc"`, the way a named NPC is `"Robin"`. Names are case sensitive.
- A carrier is whoever is pregnant. A donor is the other genetic parent. `"pc"` can be either.

## The data

### `V.pregnancies`: one record per conception

Shared by the whole litter. IDs are array indexes, so records are never removed. A cleared record is tombstoned by setting `carrier` to `"cleared"` (`clearPregnancyRecord`).

Fields (`pushPregnancyRecord`): `pregnancyId`, `carrier`, `carrierSpecies`, `donor`, `donorSpecies`, `possibleDonors` (everyone who could be the donor), `conceivedDate`, `conceivedLocation`, `gestationVariance`, `orifice` (`"vagina"` or `"anus"`), `deliveredDate`, `deliveredLocation`, and the awareness lists `awareOfPregnancy`, `awareOfCarrier`, `awareOfDonor`, plus `talkedAbout` and `playerLearnedFrom`. Optional: `womb` (1 or 2, Beta only), `hatchDelay` and `layCare` (egg species), `waterBreaking`, `birthInProgress`, `carrierDescription`.

A pregnancy is active while `deliveredDate === null`.

### `V.childRecords`: one record per child

Fields: `childId`, `pregnancyId`, `species` (base species: `human`, `wolf` or `hawk`), `features` (size, colours, `monster`, `beastTransform`, `divineTransform`), `gender` (`m`, `f`, `h`), `identical`, `development` (where the child lives, activity, talking, toys), `bornDate`, `name`, `awareOfChild`, `awareOfGender`.

An unhatched egg has no `bornDate` but its pregnancy is delivered (`childIsUnhatchedEgg`).

### Other saved state

- `V.cumLoads`: `{ vagina: [], anus: [] }`. Stored loads waiting for a conception roll (realistic mode).
- `V.pendingPregnancies`: `{ vagina, vagina2, anus }`. A conception that has won its roll and is waiting to implant. `vagina2` is the second Beta womb.
- `V.storedNPCs`: generated NPCs the game follows to term, keyed like `"pregnancy_0"`.
- `V.babyIntros`: queued baby introductions, keyed by who is being introduced.
- `V.birth`: the realistic childbirth encounter (see [Realistic childbirth](#realistic-childbirth)).
- `V.pregnancyStats`, `V.sexStats[orifice].pregnancy`: counters and per-orifice body state (birth events, given birth).

### Species

- **Donor species** (what the donor is): `human`, `wolf`, `wolfboy`, `wolfgirl`, `hawk`, `harpy` (and `waterdragon`, DoLX).
- **Child base species** (`childBaseSpecies`): `human`, `wolf` or `hawk`. Wolf people give `wolf`. Hawk, harpy and water dragon give `hawk`, so they ride the egg path.
- `setup.pregnancy.typesEnabled` (`game/04-Variables/variables-static.twee`) lists the donor species that can impregnate at all. Lists of named NPCs who can carry or impregnate the player (`canBePregnant`, `canImpregnatePlayer`), infertile NPCs (`infertile`) and locations that always keep random NPC births (`randomAlwaysKeep`) live in the same place.

## How a pregnancy starts

The mode is `$settings.pregnancyType`:

- `realistic`: cum is stored as a load. Loads roll for conception later. The player may not know they are pregnant, or who the father is, at first.
- `fetish`: each load rolls the moment it lands. A win is an instant pregnancy and the player knows the pregnancy and father at once.
- `silly`: sex triggers are off. Holding hands or kissing conceives, instantly, as in fetish mode. `<<sillyInseminate>>` is the whole entry point. It rolls both directions, needs bare hands for a handhold and an uncovered face for a kiss, doubles the odds beside a love interest, and never fires for Gwylan. It is called from `<<takeHandholdingVirginity>>` and `<<takeKissVirginity>>` in `game/base-combat/widgets.twee`. The Hail Mary feat is disabled in this mode.

### The player, realistic mode

1. **A load lands.** Combat calls `<<combatInseminate slot>>` (or `<<combatInseminate slot true>>` for a beast, which raises potency by `$pregnancyBoost`). A story scene calls `<<sceneInseminate orifice donor donorSpecies depth [quantity] [days]>>`. Both call `inseminate()`, which checks eligibility and pushes a load onto `V.cumLoads[orifice]`.
   - The load has `donor`, `donorSpecies`, `time`, `weight`, `canWash`, `lifespan` and `location`.
   - `depth` is `outside`, `imminent` or `deep`. Each depth has a weight in `PregnancyConstants.depthWeight`, and deep is the strongest. Outside and imminent loads can be washed out. Deep loads cannot.
   - Condoms, strap-ons and chastity stop the load in `combatInseminate`. A small penis dribbles at half potency.
2. **Grace period.** A load cannot roll until `PregnancyConstants.loadGracePeriod` has passed. That is the window to wash a washable load out (`washLoads()` runs from the wash widgets, and a plug or dildo keeps that orifice's load in).
3. **Daily rolls.** Every game hour `time.js` calls `hourlyPregnancyUpdate()` (drops expired loads, implants due conceptions) and `checkLabour()`, then `rollAndRecordConception("vagina")` and `("anus")`. Each eligible load gets one roll per day of its life, at that day's fertility:

   ```
   chance = basePlayerPregnancyChance x playerConceptionModifier() x fertility x load.weight    (capped 0-100)
   ```

   A load lives for a number of days rolled per load from `PregnancyConstants.loadLifespanDays`. A load that wins becomes a pending conception in `V.pendingPregnancies`. If several win, one is picked at random.

4. **Implantation.** After `PregnancyConstants.implantationWindow`, `startDuePregnancies()` turns the pending conception into a record with `createPregnancy()`. Until then the morning-after pill can discard it.
5. **Blocked cases.** No roll happens if the body is not ready (`readyToCarry()`: already pregnant or recovering), the orifice has parasites, or the anal route is not allowed (`playerCanCarryAnally()`). One pregnancy per body, with the Beta exception below.

### Fetish and forced conception

`instantConception(orifice, load, force)` runs when a load lands. In fetish mode it rolls `fetishPregnancyRoll()` and a win calls `conceiveNow()`. A demon player's Force Impregnation action conceives on the spot in every mode (deep loads only). `conceiveNow()` creates the record, and outside realistic mode also tells the player who the donor is.

### NPCs

NPCs store no loads. `<<npcPregnancyRoll carrier carrierSpecies donor donorSpecies orifice [depth] [location] [donorFertility] [slot]>>` does one roll on the spot:

```
chance = baseNpcPregnancyChance/100 x depth weight x npcMenstrualFertility x npcConceptionModifier x donorFertility x (donor is pc ? xchangeDonorFertility : 1)
```

A forced impregnation skips the roll. A named NPC gets a record under their name. A generated NPC (one in an `$NPCList` slot) is only followed if `rememberRandomCarrier()` files them in `$storedNPCs`. A non-consensual scene is not followed unless it was a deliberate breeding, and the number of followed generated NPCs is capped (10, or 15 for a deliberate breeding or a location in `randomAlwaysKeep`).

Named NPCs can also be made pregnant directly by story code with `<<namedNpcPregnancy carrier donor donorSpecies [donorKnown] [awareOf]>>`. The player can be made pregnant directly with `<<playerPregnancy donor species [donorKnown] [orifice] [trackedNPCs] [awareOf]>>`.

### Eligibility (`eligibility.js`)

- `canPlayerConceive(orifice, donor, donorSpecies)` and `canNpcConceive(orifice, carrier, infertile)` are the gates `inseminate` and `npcPregnancyRoll` use.
- `playerPregnancyEligible(name, species, forced)` checks impregnation is not disabled (`V.disableImpregnation`, and `V.disableNormalImpregnation` unless forced), the species is enabled, the donor is not in `infertile`, and a named donor has finished pregnancy content (unless `incompletePregnancyEnabled`).
- `playerSpeciesPregnancyEnabled(species)` reads `playerPregnancyHumanEnabled`, `playerPregnancyBeastEnabled` and `playerPregnancyEggLayingEnabled`.
- `playerCanCarryAnally()` follows `$settings.analPregnancy` (`always`, `exceptional` or off). Exceptional means the magic pregnancy tattoo or a grown ear slime focused on pregnancy, with no vagina. The Omega pill grants it on its own.
- `playerCanBreedWith(NPC)`, `pregnancyCompatible(NPC)`, `playerPregnancyPossibleWith(NPC)` and `NPCPregnancyPossibleWithPlayer(NPC)` answer "could this pair do it?" for scene text. Pass a name or an NPC object.
- `npcWelcomesBreeding(NPC)`: true when the NPC's `pregnancyAvoidance` is below 50, so removing protection does not anger them.
- `impregnationDisabled(forced)`: the global switch.

### Fertility

- The cycle: `fertilityOnCycleDay(day)`, `menstrualFertility()`, `cycleFertilityRamp(day)`. Fertility rises into ovulation and falls after it. It is never below `fertilityFloor()`. With `fertilityCycleEnabled` off, every day is fertile. While pregnant or recovering it is 0 (unless a Beta womb is free).
- Pills and other modifiers, all in `playerConceptionModifier()` with numbers in `PregnancyConstants.conceptionModifiers`: one contraceptive dose cuts conception hard and two block it, each fertility booster dose raises it (up to a dose cap) and also lifts the day's fertility floor, the magic tattoo raises it, and an ear slime multiplies it depending on whether it is focused on pregnancy or on impregnating.
- The cycle advances 0.5 day per `<<menstruationCycle>>`, two ticks a day, so one cycle day is one calendar day.
- The character screen's risk meter is `playerPregnancyRisk()` (bands in `PregnancyConstants.riskMeterLabels`). It reads the exposure a load left today would meet, not the raw odds, so the label and the printed fertile dates always agree.
- `playerHeatMinArousal()` and `playerRutMinArousal()` give the arousal floor from heat and rut (capped at half of maximum arousal).

### Morning-after pill

`takeMorningAfterPill()` discards every pending conception and all stored loads. It returns a token for the pharmacy scene: `notPregnant`, `success` (caught in the first third of the window), `aLittleLate`, `late` or `tooLate` (a pregnancy already exists).

## Pregnancy over time

- `advancePregnancy(orifice)` runs twice a day. It counts days pregnant, sets morning sickness (an early light window and a main window, both in `PregnancyConstants.morningSickness`), and when a pregnancy reaches term (once) grows the breasts and may start lactation.
- Gestation is set by settings and the donor's child species: `humanPregnancyMonths` (x30 days), `wolfPregnancyWeeks` (x7), `birdPregnancyWeeks` (x7). Each record adds a random variance (`gestationVariance`, range in `PregnancyConstants.gestation`).
- `getDueDate(pregnancy)`, `pregnancyProgress(pregnancy)` (0 to 1), `daysAlong(pregnancy)` and `pregnancyDaysEta(pregnancy)` are the time helpers.
- The belly stays hidden early on, then grows to a term size based on the litter count, capped at the sprite's frame count (`playerBellySize`, `npcBellySize`, numbers in `PregnancyConstants.belly`). It shows only above the visibility thresholds in `PregnancyConstants.belly.visibility`, depending on clothes.
- Pregnancy tests can read negative in the first days (`PregnancyConstants.pregnancyTest`).
- When a player pregnancy reaches its due date, `checkLabour()` sets `waterBreaking` and `V.eventskip`. It waits while stats are frozen, in combat, possessed, or with an event NPC loaded. Egg species never break their waters. They are laid.

## Birth

- `getLabouringPregnancy(carrier)` finds the one giving birth: waters broken first, then any at term, then the first active. `getLabouringLitter(carrier)` returns its children.
- `birthLaborTime()` gives labour minutes: a base time plus more for each extra baby (numbers are inside the function).
- `endPlayerPregnancy(birthLocation, location)` births the litter (`birthRecordedLitter`), updates the per-orifice body stats, records virgin births, puts the menstrual cycle into `recovering` when no other pregnancy remains (length depends on species), clears labour flags, and runs Alex's clean-up and the child-fee update. `location` is where the children go (`home`, `wolf_cave`, `tower`); `birthLocation` is where the birth happened.
- `birthRecordedLitter(pregnancyId, birthLocation, location)` marks delivery, starts rearing for each child (`beginRearing`), names babies (`generateBabyName`), records births for hatched children, updates the species and parentage counters, and unlocks first-birth toys. It also makes Bailey (home), the Black Wolf (wolf cave) or the Great Hawk (tower) aware.
- `getPlayerPregnancyForBirth(returnOrifice)` is the pregnancy to read in any birth passage. It prefers the one in labour and falls back to the first active. A herm or Beta player can carry more than one, so never use a generic "the player's pregnancy" lookup during birth. `playerBirthOrifice()` gives the hole.
- Default places by species (`defaultBirthLocations`): human is hospital then home, wolf types are the wolf cave, bird types are the tower.
- `endNpcPregnancy(npcName, birthLocation, location)` births an NPC's litter. `npcPregnancyCycle()` (called from `time.js`) ages every named NPC's pregnancy: the NPC becomes aware after a set share of gestation, waters break at the due date, and once the birth is far enough overdue and unseen it is resolved offscreen (`PregnancyConstants.npcGestation`). `randomPregnancyProgress()` does the same for `$storedNPCs` and deletes each one after birth.

## Children

`generateChildren(pregnancyId)` runs once from `createPregnancy()` and creates the litter:

- Litter size is a weighted roll per base species (`PregnancyConstants.childGen`): human is mostly one, sometimes two, rarely three (triplets are rare on purpose, a feat depends on it). Wolf, hawk and water dragon each have their own weights in the same object.
- `boostLitterSize()` (DoLX) makes a longer-latched tummy parasite and the Fertility treatment push the litter larger. A harpy player's pre-grown clutch (`V.harpyEggs.count`) replaces the roll.
- Human twins can be identical (`identicalMultiplePercent`, rolled again for a third child). Self-impregnation always gives identical children.
- Gender is an even split. A herm parent gives a chance of a herm child (`hermChildPercent`), and always does for self-pregnancy.
- Each child rolls eye, skin and hair colour from its parents (`resolveChildParent`), and a size. Wolf pups roll the fur pool (the Black Wolf's are always black). Children of a monster person get the `monster` trait.
- The player's beast and divine heritage (`pcHeritage`) passes to the litter, read through `Transformations.effectiveLevel` so chimera forms count. A named NPC parent can pass theirs too (`npcHeritage`, currently Poppy).

Once born, `updateChildActivity(childId)` in `children-story-functions.js` picks a daily activity per species (`humanChildActivity`, `wolfChildActivity`, `hawkChildActivity`). `setChildFirstWord`, `getChildDays` and the `getChildrenAt(location)`, `getBornChildren()` and `childAgeOf(child)` helpers serve the Childrens Home.

## Who knows what

Awareness is stored per record, as name lists. Low-level setters and getters are in `pregnancy-records.js`:

- Set: `setKnowsPregnancy`, `setKnowsCarrier`, `setKnowsDonor`, `setKnowsChild`, `setKnowsGender`, `setPlayerLearnedFrom(pregnancyId, source)`.
- Ask: `knowsPregnancy`, `knowsCarrier`, `knowsDonor`, `knowsChild`, `knowsGender`, `hasTalkedAbout`, `markTalkedAbout`, `couldBeDonor`.
- `resolvePaternity(pregnancyId)`: if only one suspect's species fits the litter, the donor stops being a mystery.

Scenes use the friendlier wrappers in `story-functions.js`, which take a carrier name and an optional `existingId` to pick one specific record:

```twee
<<if knowsAboutPregnancy("pc", "Whitney")>>              /* Whitney knows about the current pregnancy */
<<if knowsAboutPregnancy("pc", "Whitney", 0)>>           /* about pregnancy id 0 */
<<setKnowsAboutPregnancy "pc" "Whitney">>                /* Whitney learns about it */
<<setKnowsAboutPregnancy "Whitney" "pc" 0 true>>         /* pc learns of Whitney's pregnancy 0, and queue the baby intro */
<<setKnowsAboutPregnancyCurrentLoaded>>                  /* everyone loaded learns, if the belly shows */
```

More: `knowsAboutAnyPregnancy(carrier, who)`, `knowsAboutPregnancyTotal(parent, who, [location])` (births the person knows about), `knowsAboutChildrenTotal(parent, who, [location])`, `talkedAboutPregnancy(carrier, who, [id])`, `<<setTalkedAboutPregnancy carrier who [id]>>`, `<<setBabyIntro carrier introFor [birthId]>>` and `<<removeBabyIntro carrier introFor birthId>>` (see the `Pregnancy Birth Prison` and `Pregnancy Birth Asylum` passages for use), `playerConceivedWith(name)`.

## Story function reference

Read-only helpers for scenes (`story-functions.js`). Most return a number or boolean.

**Player**

- `playerIsPregnant()`: true for a real (non-parasite) pregnancy in the current body.
- `playerAwareTheyCanBePregnant()`, `playerAwareTheyArePregnant()`, `playerAwareTheyAreInHeat()`: what the player knows. Males may not yet know they can carry.
- `playerPregnancyProgress([percent])`: 0 to 1. Pass `false` for the raw value.
- `playerNormalPregnancyTotal()`: how many births the body has been through.
- `playerBellySize([pregnancyOnly])`, `playerBellyVisible([pregnancyOnly])`: belly size 0 to 24, and whether it shows. Pass `true` to ignore non-pregnancy belly sources.
- `isPregnancyEnding()`, `playerNormalPregnancyType()`, `playerClutchReadyToLay()`.
- `playerPregnancyRisk()`, `playerHeatMinArousal()`, `playerRutMinArousal()`.
- `wakingPregnancyEvent()`, `dailyPregnancyEvent()`: pick a random menstruation or pregnancy event (see the `wakingEffects` widget and `pregnancyDailyEvent`).
- `getParasiteObject()`: the parasite pregnancy on `$sexStats`.

**Named NPCs**

- `npcIsPregnant(npc)`, `npcPregnancyEnding(npc)`, `npcPregnancyProgress(npc, [percent])`, `npcBellySize(npc)`, `npcBellyVisible(npc)`.

**Other**

- `pregnancyNameCorrection(name, [caps], [pregnancy])`: fixes a donor name for display (for example "yourself").
- `pregnancyDonorAttribution(source)`, `pregnancyFatherReveal(source)`, `pregnancyDonorIsPerson(source)`.
- `childrenCountBetweenParents(a, b)` and `pregnancyCountBetweenParents(a, b)`: born children and pregnancies two people share, whoever carried. `pregnancyCountFromParents(carrier, donor)` is directional.
- `getPlayerPregnancy()`, `getActivePregnancy(carrier, orifice, [womb])`, `getActivePregnancies(carrier)`, `getChildrenOf(pregnancyId)`, `getPregnancyOf(child)`.

## Parasites

Parasite pregnancies are separate from records. `<<impregnateParasite>>`, `<<fertiliseParasites>>`, `<<parasiteProgressDay>>` and `parasiteProgressTime` live in `parasite.js`. A parasite in an orifice blocks conception there (`orificeHasParasites`, `pregnancyBlocksParasites`). `maxParasites(orifice)` and `canImpregnateParasite(orifice)` say how many fit and whether one can take.

## Settings

Pregnancy settings live in `$settings`:

| Setting                                                                                         | Meaning                                                                                               |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `pregnancyType`                                                                                 | `realistic`, `fetish` or `silly`.                                                                     |
| `basePlayerPregnancyChance`, `baseNpcPregnancyChance`                                           | Base odds (0 to 100).                                                                                 |
| `humanPregnancyMonths`, `wolfPregnancyWeeks`, `birdPregnancyWeeks`                              | Gestation length.                                                                                     |
| `playerPregnancyHumanEnabled`, `playerPregnancyBeastEnabled`, `playerPregnancyEggLayingEnabled` | Which species can impregnate the player.                                                              |
| `npcPregnancyEnabled`, `nnpcPregnancyEnabled`, `npcAnalPregnancyEnabled`                        | Generated NPCs, named NPCs, and anal carrying by NPCs.                                                |
| `analPregnancy`                                                                                 | `always`, `exceptional` or off, for the player.                                                       |
| `incompletePregnancyEnabled`                                                                    | Allow named NPCs whose pregnancy content is unfinished.                                               |
| `fertilityCycleEnabled`                                                                         | Off makes every day fertile.                                                                          |
| `realisticChildbirthEnabled`                                                                    | Route eligible births through the `:: Childbirth` encounter. It does not change how pregnancy starts. |

New settings also need an entry in the settings export (`settingsObjects()` in `save.js`) and the presets.

## X-Change additions

- **Pills.** `xchangeConceptionModifier()` scales the player's chance: `$xchange.pregnancyMultPercent` (the global dial), Breeder or Hyper Fertility (x10, times `fertilityStrengthPercent`), Fake Breeder (nothing can take), and Beta's second womb (falls as the first pregnancy progresses, minimum 0.1). `xchangeDonorFertility()` boosts the player's own seed for the Bull pill and Hyper Fertility. `xchangeIgnoresCycleTiming()` keeps the player always fertile, while heat still follows the real cycle.
- **Beta.** Two vaginal wombs. `playerHasBetaWombs()`, `availablePlayerPregnancySlot()` (`vagina`, `vagina2` or `anus`), `betaSecondWombOpen()`, `wombLabel()`. Each record's `womb` is 1 or 2. The second womb keeps its own pending slot.
- **Omega.** The butt carries. `omegaTargetsAnus()`, `omegaTargetsVagina()` (when "Omega needs no vagina" is on and a vagina exists), `hasOmegaAnalPregnancy()`. Omega bypasses the anal pregnancy setting.
- **Water dragon.** `waterdragon` is a donor species that maps to the egg path. A full water dragon (`isFullWaterDragon()`) lays eggs on a cycle and can turn a carried litter into eggs. See [DoLX-TFRework.md](DoLX-TFRework.md) for the egg cycle helpers.
- **Fertility treatment and parasites.** Both raise litter size (`boostLitterSize`). The pregnancy tattoo and ear slime change conception odds (`playerConceptionModifier`).
- **Chimera heritage.** `pcHeritage()` reads effective transformation levels.
- **Silly mode and Hail Mary.** See above.

## Realistic childbirth

Opt-in with `$settings.realisticChildbirthEnabled`. The `$birth` object drives it: an entry passage creates `$birth`, `:: Childbirth` validates it, the encounter widgets update it, and `:: Childbirth End` sends the player to the right recovery passage.

Files (all in `game/special-xchange/DoLXAddition/RCB-Mod/`):

- `realistic-childbirth-passages.twee`: `:: Childbirth`, `:: Childbirth End`, and the egg-laying recovery passages.
- `realistic-childbirth-encounter.twee`: the actions, stage progress, push urge, give-up handling and settings widget.
- `realistic-childbirth-init.js`: the version and safety gate, `setup.rcbBirthSafetyCheck()`.

Flow: 10 stages. Stages 1 to 4 are early labour (short), 5 to 7 active pushing, 8 delivery, 9 the pause between multiple births, 10 finished.

The combat **Give up** button sets `$finish`. `:: Childbirth` catches it before another labour turn, sets `$birth.giveup`, and goes to `:: Childbirth End`. The birth still resolves. Only the end text changes, and the player is not trapped in the loop.

### The `$birth` contract

Create `$birth` and set `$childbirthstart to 1` before sending the player to `Childbirth` (see the links in `game/base-system/pregnancy/events.twee`). `Childbirth End` unsets `$birth` on the way out. Fields:

- `location`: required. Picks the recovery passage.
- `genital`: strongly recommended for player births. Use the orifice from `getPlayerPregnancyForBirth(true)`.
- `partner`, `inlobby`: optional, used by location dialogue.
- `epidural`: optional. Prison starts with pain relief by setting it first.
- Set by the encounter itself: `version`, `type` (`human`, `wolf`, `hawk`), `fetuscount`, `father`, `stage`, difficulty values, and the filters.

Locations the encounter can end (`RCB_LOCATIONS`) and where each goes:

| `$birth.location`                     | Recovery                                                                                                 |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `hospital`                            | `Pregnancy Birth Hospital 3`                                                                             |
| `wolf cave`                           | `Pregnancy Birth Wolf Cave 2`                                                                            |
| `forest shop`                         | `Pregnancy Birth Forest Shop 4` (wolf: `... Forest Shop Wolf`)                                           |
| `cottage`                             | `Farm PC Birth 5`                                                                                        |
| `asylum`                              | `Pregnancy Birth Asylum 3`                                                                               |
| `prison`                              | `Pregnancy Birth Prison 3` (non-human: `Pregnancy Birth Prison Wolf`)                                    |
| `bedroom`                             | Egg laying: `Robin Bed Egg Laying`, `Kylar Bed Egg Laying` or `Solo Bed Egg Laying`, by `$birth.partner` |
| `tower`                               | `Bird Tower Player Egg Laying Realistic End`                                                             |
| `waterdragon_nest`, `waterdragon_lab` | The water dragon laying passages                                                                         |

If `$birth` is missing, from an unsupported version, or has no routable location, `setup.rcbBirthSafetyCheck()` ejects to `Childbirth End` with a safe location instead of soft-locking. A bad `$birth.type` is repaired in place from the live pregnancy. When `$birth` changes shape in a way old saves need migrating for, bump `RCB_BIRTH_VERSION` and add a patch to `birthPatches`.

### Normal versus realistic birth

Normal childbirth keeps its recovery passages. The setting only changes routes that check `$settings.realisticChildbirthEnabled` and link to `Childbirth`. When adding or changing a player birth route:

- Call `getPlayerPregnancyForBirth(true)` before deciding species or creating `$birth`, and store the orifice in `$birth.genital`.
- Keep the normal route's `<<playerPrebirth>>` call if it skips `Childbirth`. Realistic birth calls it inside `Childbirth End`. Both then share `birthUi`, `pregnancyFeats` and `endPlayerPregnancy`.
- Make sure the recovery passage is in the `Childbirth End` switch.
- Use `getPlayerPregnancyForBirth()` in recovery text that reads the baby count, father, type, birth id or child ids.

## Old saves

`migratePregnancyData()` (`pregnancy-migration.js`) converts the old per-mother pregnancy and children data into records. It runs from `game/04-Variables/variables-versionUpdate.twee`, behind `$objectVersion.pregnancyRecords`, and initialises `V.pregnancies`, `V.childRecords`, `V.cumLoads` and `V.pendingPregnancies` first so a failed migration cannot leave them undefined. It also migrates in-flight pregnancies for the player and NPCs, and resolves baby intros last. Old mid-scene saves that still carry `$children` are migrated again.

The same file holds one-time repairs (gestation variance, adoption timestamps). Follow that pattern for new repairs: a flag in `$objectVersion`, run once.

`endPlayerPregnancy()` clears `waterBreaking` and `birthInProgress` on the record when the birth is done, so a finished birth cannot leak into a later pregnancy.

## Adding a species

1. Add the donor species to `setup.pregnancy.typesEnabled`.
2. `childBaseSpecies()`: map it to `human`, `wolf` or `hawk`, or add a new base species.
3. `offspringSpecies()`: say what each donor and carrier pairing grows as.
4. `playerSpeciesPregnancyEnabled()`: link it to a setting.
5. For a new base species: `gestationSeconds()` (and its setting), `PregnancyConstants.childGen.<base>LitterWeights`, `defaultBirthLocations()`, and a `...ChildActivity` function in `children-story-functions.js`.
6. For realistic birth: add it to `RCB_TYPES` and the birth prompt tables (missing combinations are backfilled with generic text by `rcbNormalizeBirthPrompts()`).
7. The `Diversity of Life` feat is awarded from `earnHourlyFeats` (`feats.js`). Update it if the new species should count.

## Adding a birth location

1. `defaultBirthLocations()`: give the species a default.
2. `RCB_LOCATIONS` and `LOCATION_FROM_GAME` in `realistic-childbirth-init.js`, and the `<<switch $birth.location>>` in `Childbirth End`.
3. The lobby switch in `:: Childbirth` (who waits with the player), and birth dialogue and prompts for the place.
4. If children go there afterwards, handle that location wherever `getChildrenAt(location)` is used, and in `birthRecordedLitter()` if someone should learn of the birth.
