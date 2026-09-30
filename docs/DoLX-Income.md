# Divine transformation income

Full Angel, Fallen Angel and Demon transformations raise the money the player earns. This page covers how that bonus works, where it hooks into the money system, and what to do when vanilla changes a wage or a money widget.

## Rule 1: vanilla wins

When vanilla changes a wage, reward, gambling flow, stolen-goods flow or money widget:

1. Port the vanilla change as written and work out where its money comes from.
2. Keep the vanilla base amount and reward conditions.
3. Send real income through the existing income layer. Do not copy divine checks into the passage.
4. Treat transfers, refunds, returned stakes and borrowed principal as not income.
5. When an action is sexual but its passage or location name is not, add the smallest source label that says so.

The divine bonus is a multiplier on genuine income. It does not own base wages, skill scaling, animal-transformation bonuses, gambling rules or bank principal.

## What it does

- Full Angel raises ordinary, non-sexual income by 50%.
- Full Angel raises the temple chastity-exam allowance by 75% instead. The Jordan dialogue and the cash shown match.
- Full Demon raises sexual work by 50%: dancing, prostitution, Avery income, gloryhole work, paid exhibitionism.
- Fallen Angel raises every genuine income type by 20%.
- These bonuses stack with animal-transformation bonuses, skill scaling, haggling, gambling profit and stolen-goods value.
- No transformation bonus doubles a payout. A finished animal form adds 75% (`animalTfIncomeBonus` in `koztools.js`, used by `animalTfIncome()`). The full-Angel temple allowance is x1.75.
- A transformation only counts when the body shows a defining part. See [DoLX-TFRework.md](DoLX-TFRework.md): `chimeraFull()` is what level checks use.
- One payout gets the divine bonus once. A display helper must not change a shared value in a way that makes the later cash award apply the bonus again.
- Separate economic events each get a bonus. Stealing goods and later selling them are two events, so the bonuses stack.
- Where a passage prints the final earnings, the printed amount matches the amount awarded.
- Transfers and returned money never create cash.
- The feature has no saved state, settings, initialisation or migration.

## The rules

`divineTfIncome(value, source, incomeType)` is in `game/base-system/DoLXAddition/koztools.js`. It returns the adjusted value in the unit it was given.

| Form         | Requirement                                     | Applies to                   | Multiplier |
| ------------ | ----------------------------------------------- | ---------------------------- | ---------- |
| Fallen Angel | `Transformations.effectiveLevel("fallen") >= 2` | Every genuine income type    | x1.2       |
| Angel        | `Transformations.effectiveLevel("angel") >= 6`  | Ordinary (not sexual) income | x1.5       |
| Demon        | `Transformations.effectiveLevel("demon") >= 6`  | Sexual income                | x1.5       |

Fallen Angel wins. If the effective state also shows Angel or Demon levels, the payout gets Fallen's x1.2 and nothing else.

The temple allowance is the one full-Angel exception. An Angel who is not Fallen gets x1.75 (the passage pays `$grace * 7000` instead of `$grace * 4000`). A Fallen Angel still gets x1.2. The solo passage (`loc-temple/main.twee`) and Sydney's passage (`special-sydney/temple.twee`) work the allowance out once, print it, and pay it with `divineTfAdjusted: true`.

The helper ignores zero and negative values and rounds a positive result with `Math.round()`.

## Money units

Normal cash is in pennies: `100` is £1, `100000` is £1,000. `$blackmoney` is in pounds, so `<<blackmoney>>` passes pound values to the helper, and the pub converts to pennies when the goods are sold. The helper does not care about units. It multiplies and rounds whatever it is given, so callers keep their own subsystem's unit.

## Classifying income

The helper lowercases `source`. With no source it falls back to `$location`. An explicit `incomeType` overrides everything.

### Explicit types

- `"normal"`: ordinary income for the Angel and Demon split.
- `"slut"`: sexual income for the Angel and Demon split.
- `"none"`: not income. The value comes back unchanged.

Fallen Angel applies to both `"normal"` and `"slut"`. Only `"none"` turns divine income off completely.

Use an explicit type only when the source name cannot describe the action. Do not treat an ordinary job as sexual just because it happens somewhere sexual.

### Sources that count as sexual (Demon)

- anything containing `prostitution`
- exactly `avery`, `briargel`, `stripclub`
- anything containing `brothel` (this includes `brothelshow`)
- anything containing `gloryhole`
- anything containing `exhibitionism`
- anything containing `dance`

Everything else is ordinary income (Angel) unless overridden.

All dance income is sexual: party, docks, café and strip-club dancing, Danube dancing (`danubeDanceJob`) and dance tips. Danube is not an Angel exception. Strip-club bartending tips stay ordinary. Strip-club dancing uses a dancer or dance source, so it is sexual.

### Sources that never get a bonus

The helper returns the original amount for `debug`, `startingMoney`, `notTracked`, `bankLoan`, anything containing `refund`, and any call with `incomeType: "none"`.

`money()` also skips calls marked `recordOnly: true`. Those rebuild statistics and do not award cash.

This keeps cheats, starting money, loans, refunds and expense advances from becoming income. Positive refund sources and `incomeType: "none"` calls restore cash without adding to the earned totals in `moneyStats`.

## How it hooks in

The main hook is the positive-amount branch of `money()` in `game/base-system/stat-changes.js`. For every positive `<<money>>` award, in order:

1. Check and normalise the base amount.
2. Apply the automatic cat bonus for the café sources `cafeWaiter`, `cafeChef` and `cafeBuns`, unless the caller already applied its animal bonus.
3. Apply `divineTfIncome()`, unless the caller already did or marked it as non-income.
4. Add the final amount to `$money`.
5. Record the final amount in the money statistics.

Negative `<<money>>` calls go to the separate inflation logic (see [DoLX-Inflation.md](DoLX-Inflation.md)). Divine income never changes a price.

`money()` accepts an options object with three relevant fields:

| Option                                       | Meaning                                                                                         |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `animalTfAdjusted: true`                     | The caller already applied the animal-transformation bonus.                                     |
| `divineTfAdjusted: true`                     | The caller already ran `divineTfIncome()`, usually because it needed the final number to print. |
| `incomeType: "normal"`, `"slut"` or `"none"` | Explicit type passed to the divine helper.                                                      |

These stop duplicates. They do not switch off other bonuses.

## Widgets

All are in `game/base-system/widgets.twee`.

### `<<income amount source [animalAdjusted] [incomeType]>>`

Awards and prints a known penny amount, divine-adjusted once:

```twine
You've earned <<income 50000 "flatsCleaning">>.
```

It passes the final amount to `<<money>>` with `divineTfAdjusted: true` and prints the same amount. If the amount already went through `animalTfIncome()`, pass `true` as the third argument:

```twine
You earn <<income `animalTfIncome(1000, "bunny")` "cafeDanceJob" true>>.
```

The fourth argument is an optional `incomeType`. For the sources `hotelCleaning` and `flatsCleaning`, the widget also adds the full bird transformation's 45% housekeeping bonus.

### `<<moneyGain amount [variation] [crime] [source]>>`

Works out variation and skulduggery scaling first. Crime gain is based on the amount before the divine bonus. It then applies the bonus once, awards the cash and prints it. When the source is not given, it uses `"thievery"` if the crime argument is set.

An action that is sexual but happens in a generic location must pass a source:

```twine
<<moneyGain 100 false false "exhibitionism">>
<<moneyGain 200 false false "avery">>
```

### `<<moneyGainDisplay>>`

Previews the divine-adjusted amount (in `_money_gain_display`) but leaves `_money_gain` at the base, skill-adjusted amount. A later link that awards `_money_gain` through `<<money>>` gets the bonus once from the central hook, so the cash matches the preview.

Do not set `_money_gain` to the previewed amount. A later `<<money _money_gain>>` would apply the bonus a second time.

### `<<tipreceive source>>`

Applies the relevant bunny or cat bonus first (dancing sources get the bunny bonus, plus the cat bonus in the café; `cafeWaiter` and `cafeChef` get the cat bonus), then the divine bonus to the tip and to the café's flat 500 extra. It prints and awards the total with both duplicate flags set. The flat bonus is café-only, and not for `cafeWaiter`, whose shift has its own wage.

Always give a source for sexual work and Avery:

```twine
<<tipreceive "prostitution">>
<<tipreceive "stripClubDancer">>
<<tipreceive "avery">>
```

An ordinary massage, bartending or office-manager tip can keep its ordinary source or use the location fallback.

### `<<blackmoney amount [incomeType]>>`

Every addition to `$blackmoney` goes through this widget. The amount is in pounds:

```twine
<<blackmoney 20>>
```

The bonus at theft becomes part of the stored value. When the player sells the goods, the pub pays through `<<income ... "pubStolenGoods">>` and that sale gets its own bonus. Do not exclude `pubStolenGoods`. Stealing and selling are separate events and both count.

## Player-facing text

`game/base-system/overlays/traits.twee` describes the bonuses beside the other full-transformation effects:

- Angel: while not Fallen, non-sexual income +50% and temple allowance +75%.
- Demon: while not Fallen, sexual-job income +50%.
- Both Fallen Angel stages: all income +20%. The bonus starts at effective Fallen level 2, earlier than the level-4 trait stage.

Keep this text in step with `divineTfIncome()` whenever a percentage, threshold or classification changes.

## How bonuses stack

Independent bonuses apply in the order their subsystem sets:

- Skill and skulduggery scaling can raise a base reward before the divine bonus.
- Cat and bunny bonuses can change the reward before the divine bonus.
- Stolen goods: divine bonus at theft, then maths and skulduggery affect the sale value (`blackMoneySaleValue()` in `koztools.js`), then the sale gets its own divine bonus.
- Gambling: the game rules set the base profit, then the divine bonus changes profit only.

A full Angel stealing and selling goods, ignoring maths and skulduggery:

```text
100 stolen-goods value
-> 150 stored value (Angel bonus at theft)
-> 225 cash-equivalent sale value (Angel bonus at the sale)
```

A Fallen Angel gets `100 -> 120 -> 144`.

That is intended. What is not intended is applying x1.5 twice to one `<<money>>` award because a display widget and the central hook both adjusted it.

## Direct writers

Most income goes through `money()`. A few systems write `$money` directly because they mix principal, stakes or their own state.

### Pub dice

`game/overworld-town/loc-pub/DoLXAddition/dice.twee`. The game takes and returns its working money with direct `$money` writes. At the end:

- the original stake is unchanged,
- only positive net profit goes through `divineTfIncome(..., "pubDice")`,
- the shown earnings and `$xchange.gamblingEarnings` use the boosted profit,
- win, loss and champion checks use the original result.

Do not send the whole returned pool through `money()`. The returned stake would count as income.

### Horse racing

`game/overworld-plains/loc-farm/DoLXAddition/horse-race.js`. Payout splits into returned stake and profit:

```text
base profit = max(0, base payout - bet amount)
final payout = base payout + boosted profit - base profit
```

Only the profit gets the bonus (source `horseRace`). Refunds are unchanged.

### HBSC fixed terms

`game/overworld-town/loc-hbsc-bank-branch/bank.js`. At maturity only the interest gets the `bankInterest` bonus. The principal comes back unchanged:

```text
maturity total = principal + boosted interest
```

Withdrawals, deposits, fixed-term principal and loan cash are transfers or debt, not income.

### Avery deposits to HBSC savings

Some Avery rewards go straight into HBSC savings and skip `money()`. Those callers apply `divineTfIncome(..., "avery")` before `setup.hbsc.receiveExternalDeposit()` and print the same adjusted amount (see `special-avery/DoLXAddition/bank.twee` and `gifts.twee`).

Money Avery gives as an expense advance, such as ingredient money (`<<money 5000 "averyExpenses" { incomeType: "none" }>>`), is not a wage. It uses `incomeType: "none"`.

## Adding a new income

### A known amount you print straight away

Use `<<income>>`:

```twine
You make <<income 20000 "factoryProduce">>.
```

### An existing `<<money>>` award with no earnings display

Keep `<<money>>` and give it a stable source. The central hook does the rest:

```twine
<<money 20000 "factoryProduce">>
```

### A sexual or dance action

Use a source that classifies the action, even if the location is generic:

```twine
<<money 5000 "prostitution">>
<<moneyGain 100 false false "exhibitionism">>
<<tipreceive "dancing">>
```

Classify the individual payout, not the whole location, when the location also has ordinary work.

### A transfer, refund, returned principal or expense advance

Mark it:

```twine
<<money _amount "savingsWithdrawal" { incomeType: "none" }>>
```

If a purchase can be refunded after the player leaves the passage, store the amount `setup.inflation.spendPrice()` returned when charging it, and refund exactly that. The refund then equals what was paid even if the player's wealth crossed an inflation tier in between.

If a system already writes `$money` directly for a balanced transfer, leave it direct and note it.

### A payout worked out in JavaScript

If it is pure income, call `divineTfIncome()` once before the write and keep the result for display and statistics. If it contains returned stake or principal, split off the profit or interest first.

## Where things are

- `game/base-system/DoLXAddition/koztools.js`: `divineTfIncome()` and `blackMoneySaleValue()`.
- `game/base-system/stat-changes.js`: the positive-income hook in `money()`.
- `game/base-system/widgets.twee`: `<<income>>`, `<<moneyGain>>`, `<<moneyGainDisplay>>`, `<<tipreceive>>`, `<<blackmoney>>`.
- `game/base-system/overlays/traits.twee`: the Angel, Demon and Fallen Angel text.
- `game/special-dance/actions.twee`: dance-tip source and one-time adjustment.
- `game/overworld-town/loc-dance-studio/job.twee`: party, docks and Danube dance wages.
- `game/overworld-town/loc-pub/main.twee`: stolen-goods sale.
- `game/overworld-town/loc-pub/DoLXAddition/dice.twee`: profit-only dice adjustment.
- `game/overworld-plains/loc-farm/DoLXAddition/horse-race.js`: profit-only horse-race adjustment.
- `game/overworld-town/loc-hbsc-bank-branch/bank.js`: fixed-term interest.
- `game/overworld-town/special-avery/` (including `DoLXAddition/`): Avery cash and HBSC deposits.
- `game/overworld-town/loc-street/DoLXAddition/resistance-whoring-event.twee`: car-whoring payout.
- `game/overworld-town/loc-street/danube.twee`, `cliff.twee`, `starfish.twee`: paid exhibition challenges.

## Porting a vanilla change

1. Decide whether each amount is income, a cost, a balance, a stake, principal, a refund, a loan or a transfer.
2. Keep the vanilla base amount and reward conditions.
3. Normal income: `<<money amount "source">>` or `<<income amount "source">>`.
4. Dancing, prostitution, paid exhibitionism, gloryhole work and Avery income: make sure that individual payout has a sexual source.
5. A transfer, refund or advance routed through `<<money>>`: use `incomeType: "none"` or an already excluded source.
6. If an animal helper already adjusted the amount: pass `animalTfAdjusted: true`, or the third `<<income>>` argument.
7. If JavaScript or a widget already called `divineTfIncome()`: pass `divineTfAdjusted: true` to the later `money()` call.
8. Never divine-adjust a whole gambling pool, returned bet, bank principal or withdrawal. Isolate the profit or interest.
9. Do not add a saved variable for this feature. Transformation levels and the live payout are enough.
10. Compile and run the checks below.

## Checks

From the repository root:

```powershell
node --check game/base-system/DoLXAddition/koztools.js
node --check game/base-system/stat-changes.js
node --check game/overworld-town/loc-hbsc-bank-branch/bank.js
node --check game/overworld-plains/loc-farm/DoLXAddition/horse-race.js
cmd /c compile.bat
git diff --check
```

Searches to review:

```powershell
# Direct cash additions should be a documented transfer or stake system.
rg -n '\$money\s*\+=' game

# The only raw stolen-goods addition should be inside the shared widget.
rg -n '\$blackmoney\s*\+=' game

# Unclassified tips in sexual or Avery content.
rg -n '<<tipreceive\s*>>' game

# Positive money calls near refunds, deposits, loans or advances.
rg -n -i '(refund|deposit|withdraw|loan|advance|principal|stake|wager).{0,160}<<money\s+[^-]' game -g '*.twee'

# Every pre-adjusted payout. Check that its later money call opts out exactly once.
rg -n 'divineTfIncome|divineTfAdjusted' game
```

The first and third searches will not return zero. Classify each hit by context.

## Two questions for every positive money reference

> Is this genuinely new wealth, and what action earned it?

- Ordinary work, sales, theft, interest or gambling profit: Angel income.
- Dancing, prostitution, Avery, gloryhole work or paid exhibitionism: Demon income.
- Any genuine income while Fallen Angel is active: Fallen x1.2 instead.
- Refund, withdrawal, loan, returned stake or principal, expense advance: not income.

> Has this exact payout already passed through `divineTfIncome()`?

- No: let `money()` apply it.
- Yes: pass `divineTfAdjusted: true` to the later `money()` call.
- It is a new economic event, such as selling goods that were boosted at theft: apply the bonus again.

The rule to keep is the difference between separate events that stack and one payout adjusted twice.
