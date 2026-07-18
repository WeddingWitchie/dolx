# Divine Transformation Income Bonuses

This document describes X-Change's divine-transformation income bonuses, their integration with the central money system, and how to preserve them when importing future vanilla money changes.

## Priority: Vanilla First

Vanilla changes always take priority.

When vanilla changes a wage, reward, gambling flow, stolen-goods flow, or money widget:

1. Port the vanilla change as written and understand where its money comes from.
2. Keep the vanilla base amount and reward conditions.
3. Route genuine income through the existing X-Change income layer instead of copying divine checks into the passage.
4. Preserve transfers, refunds, returned stakes, and borrowed principal as non-income.
5. Use the smallest explicit source classification needed when the action itself is sexual but its passage or location name is not.

The divine system is a multiplier layered over genuine income. It does not own base wages, skill scaling, animal-TF bonuses, gambling rules, or bank principal.

## Design Goals

- A full Angel transformation rewards ordinary and non-sexual ways of earning money.
- A full Demon transformation rewards sexualised work, including dancing, prostitution, Avery income, gloryhole work, and paid exhibitionism.
- A Fallen Angel transformation gives a smaller bonus to every genuine income type.
- Existing independent bonuses stack. Animal-TF income bonuses, skill multipliers, haggling, gambling profit, stolen-goods value, and divine bonuses are not mutually exclusive.
- The same divine bonus runs only once for one payout. A display helper must not modify a shared value and cause the later cash award to apply the identical multiplier again.
- Separate economic events can each receive a bonus. Stealing goods and later fencing those goods are intentionally two events, so their bonuses stack.
- The amount printed to the player should match the amount awarded whenever a passage states the final earnings.
- Transfers and returned money must not create free cash.
- The feature has no persistent state, settings, initialization, or save migration of its own.

## Transformation Rules

`divineTfIncome(value, source, incomeType)` is implemented in `game/base-system/kozmods/koztools.js`. It returns the adjusted value in the same units it received.

| Active transformation | Requirement                                     | Eligible income            | Multiplier |
| --------------------- | ----------------------------------------------- | -------------------------- | ---------- |
| Fallen Angel          | `Transformations.effectiveLevel("fallen") >= 2` | Every genuine income type  | x1.2       |
| Angel                 | `Transformations.effectiveLevel("angel") >= 6`  | Ordinary / non-slut income | x1.5       |
| Demon                 | `Transformations.effectiveLevel("demon") >= 6`  | Slut income                | x1.5       |

Fallen Angel has precedence. If the effective transformation state also exposes Angel or Demon levels, the payout receives Fallen's x1.2 rather than combining divine forms on the same event.

The helper ignores zero and negative values and rounds the final positive result with `Math.round()`.

## Money Units

Normal cash uses pennies:

- `100` = £1 displayed
- `100000` = £1,000 displayed

`$blackmoney` stores stolen-goods value in pounds. The `<<blackmoney>>` widget therefore passes pound values to `divineTfIncome()`, then the pub converts the resulting inventory value to pennies when the goods are fenced.

The helper is unit-neutral: it multiplies and rounds whatever unit the caller supplies. Callers must keep their existing subsystem's unit convention.

## Income Classification

The helper lowercases `source`. If no source is supplied, it falls back to `$location` (`V.location`). An explicit `incomeType` overrides automatic classification.

### Explicit classifications

- `incomeType: "normal"`: classify the action as ordinary for the Angel/Demon split.
- `incomeType: "slut"`: classify the action as sexualised for the Angel/Demon split.
- `incomeType: "none"`: this is not income; return the base value unchanged.

Fallen Angel still applies to both `"normal"` and `"slut"`; only `"none"` disables divine income entirely.

Use an explicit classification only when the source name cannot describe the action reliably. Do not infer sexual income merely because an otherwise ordinary job happens in a sexual location.

### Automatically Demon-aligned sources

A source is treated as slut income when it is:

- any source containing `prostitution`
- exactly `avery`
- exactly `brothel`
- exactly `stripclub`
- any source containing `brothelshow`
- any source containing `gloryhole`
- any source containing `exhibitionism`
- any source containing `dance`

Everything else is Angel-aligned ordinary income unless explicitly overridden.

This means all dance income is Demon-aligned, including `danubeDanceJob`, party dancing, docks dancing, cafe dancing, strip-club dancing, and dance tips. Danube is not a special Angel exception.

Generic strip-club bartending tips remain ordinary income. Strip-club dancing uses an explicit dancer/dance source and is therefore Demon-aligned.

### Sources that never receive a divine bonus

The helper returns the original amount for:

- `debug`
- `startingMoney`
- `notTracked`
- `bankLoan`
- any source containing `refund`
- any call with `incomeType: "none"`

The central `money()` hook also skips calls marked `recordOnly: true`. Those reconstruct statistics and do not award cash.

This prevents cheats, initial money, loans, refunds, expense advances, and internal transfers from becoming income.

## Central Integration

The main hook is the positive-amount branch of `money()` in `game/base-system/stat-changes.js`.

For every positive `<<money>>` award, the order is:

1. Validate and normalize the base amount.
2. Apply the existing automatic cat-TF bonus for cafe sources, unless the caller already applied its animal bonus.
3. Apply `divineTfIncome()`, unless the caller already adjusted the payout or marked it as non-income.
4. Add the final amount to `$money`.
5. Record the final amount in the existing money statistics.

Negative `<<money>>` calls continue into the separate inflation/spending logic. Divine income never modifies a price or expense.

The optional object accepted by `money()` now has three relevant flags:

| Option                                        | Meaning                                                                                                               |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `animalTfAdjusted: true`                      | The caller already applied the relevant animal-TF income bonus.                                                       |
| `divineTfAdjusted: true`                      | The caller already applied `divineTfIncome()` because it needed the final number for display or subsystem accounting. |
| `incomeType: "normal"`, `"slut"`, or `"none"` | Explicit classification passed to the divine helper.                                                                  |

These flags prevent duplicate application. They do not disable unrelated bonuses.

## Income Widgets

The shared widgets live together in `game/base-system/widgets.twee`.

### `<<income amount source [animalAdjusted] [incomeType]>>`

Use this when a passage both awards and prints a known penny amount:

```twine
You've earned <<income 50000 "flatsCleaning">>.
```

It calculates the final divine-adjusted amount, passes it to `<<money>>` with `divineTfAdjusted: true`, and prints the same value. If the supplied amount already passed through `animalTfIncome()`, pass `true` as the third argument:

```twine
You earn <<income `animalTfIncome(1000, "bunny")` "cafeDanceJob" true>>.
```

The fourth argument is an optional explicit `incomeType`.

### `<<moneyGain>>`

`<<moneyGain amount [variation] [crime] [source]>>` continues to calculate variation and skulduggery scaling first. Crime gain is based on the pre-divine amount. The final cash is then adjusted once, awarded, and printed.

Sexual actions with a generic location must pass a source:

```twine
<<moneyGain 100 false false "exhibitionism">>
<<moneyGain 200 false false "avery">>
```

### `<<moneyGainDisplay>>`

This widget previews the divine-adjusted value but deliberately leaves `_money_gain` at its base, skill-adjusted amount. If a later link awards `_money_gain` through `<<money>>`, the central hook applies the divine bonus once and the cash matches the preview.

Do not change `_money_gain` itself to the divine-adjusted preview. Doing so makes a later `<<money _money_gain>>` apply the same divine multiplier twice.

### `<<tipreceive source>>`

This widget applies any relevant bunny/cat income bonus first, then the divine bonus. It prints and awards the already-adjusted tip with both duplicate-prevention flags.

Always supply a source for sexual work or Avery:

```twine
<<tipreceive "prostitution">>
<<tipreceive "stripClubDancer">>
<<tipreceive "avery">>
```

An ordinary massage, bartending shift, or office-manager tip can keep its ordinary source or use the existing location fallback.

### `<<blackmoney amount [incomeType]>>`

All additions to `$blackmoney` go through this widget. Its amount is in pounds, not pennies.

```twine
<<blackmoney 20>>
```

The acquisition bonus becomes part of the stored stolen-goods value. When the player later sells the goods, the pub payout goes through `<<income ... "pubStolenGoods">>` and receives the eligible bonus for that new income event.

Do not exclude `pubStolenGoods` from the divine helper. Acquisition and fencing are intentionally separate and cumulative.

## Player-Facing Trait Descriptions

`game/base-system/overlays/traits.twee` displays the bonus alongside the other full-transformation effects:

- Angel states that non-sexual income is increased by 50%.
- Demon states that dancing, sex work, Avery, and other sexualised-job income is increased by 50%.
- Both Fallen Angel description stages state that all income is increased by 20%, because the mechanic begins at effective Fallen level 2 rather than only at the later level-4 trait stage.

Keep these descriptions synchronized with `divineTfIncome()` whenever the percentages, thresholds, or classifications change.

## Stacking Rules

Independent bonuses stack in the order imposed by their subsystem:

- Skill/skulduggery scaling can increase a base reward before divine income.
- Cat or bunny income bonuses can modify the reward before divine income.
- Stolen-goods acquisition can be divinely boosted, then maths/skulduggery can affect its sale value, then the fencing income can receive its own divine bonus.
- Gambling rules determine base profit first; divine income then modifies profit only.

Example for a full Angel stealing and fencing goods, ignoring maths/skulduggery for clarity:

```text
100 stolen-goods value
-> 150 stored value from Angel acquisition bonus
-> 225 cash-equivalent sale value from Angel fencing bonus
```

A Fallen Angel produces `100 -> 120 -> 144` through the same two events.

This is intended stacking. Applying Angel x1.5 twice to one `<<money>>` award because both a display widget and the central hook adjusted it is not intended stacking.

## Direct-Writer Exceptions

Most income is covered automatically by `money()`. A few systems deliberately write cash directly because they mix principal, stakes, or subsystem state.

### Pub dice

The dice minigame removes and returns its working money through direct `$money` writes. At the end of the game:

- the original stake remains unchanged
- only positive net profit passes through `divineTfIncome(..., "pubDice")`
- the displayed earnings and `$xchange.gamblingEarnings` use the boosted profit
- win/loss and champion checks continue to use the original game result

Do not route the entire returned dice pool through `money()`, or the returned stake will be mistaken for income.

### Horse racing

Horse-race payout is split conceptually into returned stake and profit:

```text
base profit = max(0, base payout - bet amount)
final payout = base payout + boosted profit - base profit
```

Only `base profit` receives the divine bonus. Refunds remain unchanged.

### HBSC fixed terms

At maturity, only calculated interest receives the `bankInterest` bonus. Principal is added back unchanged:

```text
maturity total = principal + boosted interest
```

Cash/savings withdrawals, deposits, fixed-term principal, and loan cash are transfers or debt, not income.

### Avery HBSC transfers

Some Avery rewards are deposited directly into HBSC savings and therefore bypass `money()`. Those callers apply `divineTfIncome(..., "avery")` before `setup.hbsc.receiveExternalDeposit()` and display the same adjusted amount.

Money Avery gives specifically as an expense advance, such as ingredient-buying money, uses `incomeType: "none"`. It is not a bang-maid wage or reward.

## Adding a New Income

### Known amount that is immediately printed

Prefer `<<income>>`:

```twine
You make <<income 20000 "factoryProduce">>.
```

### Existing `<<money>>` award without an earnings display

Keep `<<money>>` and give it a stable source:

```twine
<<money 20000 "factoryProduce">>
```

The central hook applies the correct divine bonus.

### Sexual or dancing action

Use a source that classifies the action, even when the passage's location is generic:

```twine
<<money 5000 "prostitution">>
<<moneyGain 100 false false "exhibitionism">>
<<tipreceive "dancing">>
```

Do not classify an entire location as slut income if it also contains ordinary work. Classify the individual payout.

### Transfer, refund, returned principal, or expense advance

Mark it explicitly:

```twine
<<money _amount "savingsWithdrawal" { incomeType: "none" }>>
```

If the subsystem already uses a deliberate direct `$money` writer for a balanced transfer, leave that writer direct and document it in the exception audit.

### Payout calculated in JavaScript

If the amount is pure income, call `divineTfIncome()` once before the write and keep the adjusted value for display/statistics. If it contains returned stake or principal, split profit/interest from principal first.

## Important Files

- `game/base-system/kozmods/koztools.js`: `divineTfIncome()` and `blackMoneySaleValue()`.
- `game/base-system/stat-changes.js`: central positive-income integration in `money()`.
- `game/base-system/widgets.twee`: `<<income>>`, `<<moneyGain>>`, `<<moneyGainDisplay>>`, `<<tipreceive>>`, and `<<blackmoney>>`.
- `game/base-system/overlays/traits.twee`: player-facing Angel, Demon, and Fallen Angel bonus descriptions.
- `game/special-dance/actions.twee`: final dance-tip source classification and one-time adjustment.
- `game/overworld-town/loc-dance-studio/job.twee`: party, docks, and Danube dance wages.
- `game/overworld-town/loc-pub/main.twee`: stolen-goods fencing payout.
- `game/overworld-town/loc-pub/kozmods/dice.twee`: profit-only dice adjustment.
- `game/overworld-plains/loc-farm/DoLXAddition/horse-race.js`: profit-only horse-race adjustment.
- `game/overworld-town/loc-hbsc-bank-branch/bank.js`: fixed-term interest adjustment.
- `game/overworld-town/special-avery/`: Avery cash and direct HBSC reward classifications.
- `game/overworld-town/loc-street/kozmods/resistance-whoring-event.twee`: X-Change car-whoring payout classification.
- `game/overworld-town/loc-street/danube.twee`, `cliff.twee`, and `starfish.twee`: paid exhibition challenge classifications.

## Porting a Future Vanilla Change

Use this checklist whenever vanilla changes money rewards or shared money widgets.

1. Identify whether the value is income, a cost, a balance, a stake, principal, a refund, a loan, or a transfer.
2. Preserve the vanilla base amount and reward conditions.
3. For normal income, use `<<money amount "source">>` or `<<income amount "source">>`.
4. For dancing, prostitution, paid exhibitionism, gloryhole work, or Avery income, ensure the individual payout has a Demon-aligned source.
5. For a transfer/refund/advance routed through `<<money>>`, use `incomeType: "none"` or an established excluded source.
6. If an animal helper already adjusted the amount, pass `animalTfAdjusted: true` or the third `<<income>>` argument.
7. If JavaScript or a widget already called `divineTfIncome()`, pass `divineTfAdjusted: true` into the later `money()` call.
8. Never divine-adjust an entire gambling pool, returned bet, bank principal, or savings withdrawal. Isolate profit or interest.
9. Do not add a persistent initialization variable for this feature; transformation levels and the live payout are sufficient.
10. Compile and run the validation checks below.

## Validation

From the repository root on Windows:

```powershell
node --check game/base-system/kozmods/koztools.js
node --check game/base-system/stat-changes.js
node --check game/overworld-town/loc-hbsc-bank-branch/bank.js
node --check game/overworld-plains/loc-farm/DoLXAddition/horse-race.js
cmd /c compile.bat
git diff --check
```

Useful structural searches:

```powershell
# Direct cash additions should be a documented transfer/stake subsystem.
rg -n '\$money\s*\+=' game

# The only raw stolen-goods addition should be inside the shared widget.
rg -n '\$blackmoney\s*\+=' game

# Review unclassified tips in sexual or Avery content.
rg -n '<<tipreceive\s*>>' game

# Review direct positive money calls near refunds, deposits, loans, or advances.
rg -n -i '(refund|deposit|withdraw|loan|advance|principal|stake|wager).{0,160}<<money\s+[^-]' game -g '*.twee'

# Find every pre-adjusted payout and verify its later money call opts out exactly once.
rg -n 'divineTfIncome|divineTfAdjusted' game
```

The first and third searches are not expected to return zero. Each result must be classified by context.

## Review Rule of Thumb

Ask two questions at every positive money reference:

> Is this genuinely new wealth, and what action earned it?

- New wealth from ordinary work, sales, theft, interest, or gambling profit: Angel income.
- New wealth from dancing, prostitution, Avery, gloryhole work, or paid exhibitionism: Demon income.
- Any genuine income while Fallen Angel is active: Fallen x1.2 instead.
- Refund, withdrawal, loan, returned stake/principal, or expense advance: not income.

Then ask:

> Has this exact payout already passed through `divineTfIncome()`?

- If no: let `money()` apply it.
- If yes: pass `divineTfAdjusted: true` to the later `money()` call.
- If it is a new economic event, such as fencing previously boosted stolen goods: apply the bonus again. That is intended stacking.

Keeping the distinction between **separate stacking events** and **duplicate adjustment of one payout** is the core of this system.
