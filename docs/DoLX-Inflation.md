# Economic Inflation

This document describes X-Change's wealth-driven inflation system, the bank loan ("rent money") feature built alongside it, and how to keep both intact when importing future vanilla changes.

## Priority: Vanilla First

Vanilla changes always take priority.

When vanilla changes a shop, a price, or the rent system:

1. Port the vanilla change as written and understand its new behaviour first.
2. Reapply only the smallest inflation adjustment needed afterward.
3. Do not replace a new vanilla pricing flow with an older X-Change copy.
4. Preserve vanilla prices, shop logic, and rent progression. Inflation is a multiplier applied on top; it never owns the base price.
5. If vanilla introduces its own price helper, route inflation through that helper instead of duplicating it.

The base price of everything stays vanilla. Inflation is a read-only multiplier layered over the moment money changes hands and the moment a price is displayed.

## Design Goals

- A rich player should not find the city trivially cheap. Prices rise with the player's wealth.
- The system is dynamic. Spend down and prices fall back through the tiers; Bailey's extra rent pressure is temporary and clears when his visible-wealth threshold is no longer met.
- The displayed price and the charged price must always agree. One rounding function is the single source of truth.
- Money kept in the bank still counts as wealth, but borrowed "rent money" is neutral, because the cash you receive is cancelled by the principal you owe.
- Inflation applies to **prices the player pays**, never to income, wages, gambling stakes, cheats, or internal bank transfers.
- Bailey's rent reacts to wealth and debt, tiered with caps and special demands at extreme wealth. Past the selected refusal/hunt stage, Bailey stops accepting refusals and hunts the player.

## Money Units

All money in this game is stored in **pennies** (the raw `$money` value). Displayed pounds are `value / 100`. Every threshold and constant in this system is therefore a raw penny value:

- `100000` = £1,000 displayed
- `500000` = £5,000 displayed
- `1000000` = £10,000 displayed
- `2000000` = £20,000 displayed

Thresholds were chosen in raw units because individual item prices in this game are small (a common item is a few thousand pennies).

## State Model

General price inflation has **no persistent state of its own**. The multiplier is recomputed live from the player's current wealth on every read. Nothing is written to the save by the shop-price layer, so there is no migration to maintain.

Bailey's rent has one small saved counter, `$baileyRentInflationSteps`, for the extra rent pressure he has built up. It rises by one step only after a successful rent payment while Bailey-visible wealth is at the rent-inflation threshold, and is cleared as soon as Bailey-visible wealth falls below that threshold. This keeps rent from jumping instantly when the player gets rich, and keeps old pressure from haunting a save after the player becomes poor again.

The bank loan does have state, stored under `$hbsc.loan`:

- `owed`: remaining amount to repay, including interest, in pennies.
- `lastPaymentDay`: `Time.days` of the last borrow or repayment; drives the one-month overdue clock.
- `autoRepay`: once true, Bailey collects a weekly surcharge through the rent.
- `baileyAnnouncePending`: shows the one-time "the bank contacted me" line.
- `action`: transient UI selector for the loan passages.

Three small, non-persistent flags drive the aggressive-Bailey street event: `$baileyStreetHuntPending`, `$baileyHuntReturn`, and `$daily.baileyHuntBroke`.

## Net Wealth

There are **two** wealth figures, on purpose — one for the economy, one for Bailey:

```
inflation wealth  = cash + savings + ALL fixed-term principal + prepaid Bailey deposit − loan principal   (totalWealth)
Bailey-visible    = cash + savings − loan principal                                                    (baileyWealth)
```

Nothing escapes **inflation**: savings count, fixed-term deposits count, and refundable prepaid Bailey rent deposit counts — locking money into a long-term deposit or prepaying rent still makes the player wealthy in the economy's eyes (`setup.inflation.bankFunds()` sums savings + every fixed term's principal, and `totalWealth()` adds cash, prepaid Bailey deposit, and subtracts the loan).

**Bailey, however, only sees liquid money.** `baileyWealth()` excludes anything locked in an active fixed term, so it can't raise his rent demand, bump his rent tier, or tip him into "you've been hoarding" aggression. When a term matures it is swept into savings (see [Fixed Terms / `processDay`]) and from then on it's part of `baileyWealth()` too. Borrowing raises neither figure, because the borrowed cash and the owed principal cancel out (loans stay neutral).

**Bailey, however, can only reach liquid money.** Rent affordability and forced bank withdrawals use `setup.inflation.rentPayable()` = cash + `liquidBankFunds()` (savings **only**). An **active fixed-term deposit shelters money from Bailey** — it is not liquid, so he can't take it for rent. When a fixed term **matures**, `setup.hbsc.processDay()` automatically sweeps its principal+interest into the regular savings balance (overflowing to carried cash if the savings cap is hit); from that moment the money is liquid, counts for `rentPayable()`, and Bailey can detect and collect it. If cash is short at rent time, Bailey marches the player to the bank to withdraw from savings (see below) — but never from a still-locked term.

## Compatibility API

The system is implemented in `game/overworld-town/loc-hbsc-bank-branch/inflation.js`, exposed as `setup.inflation`. All values are pennies.

### `setup.inflation.TIERS`

The default tier thresholds. Highest qualifying tier wins; below the lowest threshold there is no inflation. The wealth thresholds are fixed in code; the percentage for each tier is saved in `$settings` and can be changed from **Rebalance Settings**.

| Net wealth ≥               | Increase | Multiplier | Name           |
| -------------------------- | -------- | ---------- | -------------- |
| 50000000 (£500,000)        | +11%     | x1.11      | Onset          |
| 200000000 (£2,000,000)     | +35%     | x1.35      | Bad economy    |
| 500000000 (£5,000,000)     | +75%     | x1.75      | Crisis         |
| 1500000000 (£15,000,000)   | +150%    | x2.5       | Extreme crisis |
| 10000000000 (£100,000,000) | +1500%   | x16.0      | Parody spiral  |

These are stages, not a stacking per-cycle rate. A 3,000 item costs 3,330 / 4,050 / 5,250 / 7,500 / 48,000 across the current-preset tiers. Everything downstream reads the setting-backed tier values through `setup.inflation.multiplier()`.

**Relentless Bailey** (`$settings.inflationBaileyRelentless`, a plain on/off toggle, **off by default**) is the way to make Bailey bite before any wealth tier is reached. When on:

- `baileyAggressive()` is forced true — he never accepts a refusal, and street hunts are live, from the start.
- `rentInflationActive()` is forced true — his weekly rent step climbs from £0 wealth up, so rent never sits stuck at the vanilla £2,000 / £4,000-with-Robin.
- `rentCap()` returns `Infinity` — there is **no ceiling**, so rent keeps rising one step every paid week forever. The whole **Bailey Rent Limits** settings box is ignored and is greyed-out/disabled in the UI while this is on.

Presets never touch this toggle; it is purely a manual switch. When it's on but the player isn't genuinely rich, `baileyAggressionReason()` returns `"relentless"` (a plain bully-squeeze) instead of `"inflation"` (which would falsely claim they're hoarding).

### Economy Rebalance Settings

The player-facing controls live under **Settings -> Rebalance Settings**, in the **Economy Inflation** box above the older Rebalancing Settings toggles:

- **Economy Rebalance Preset** applies one of five presets: `Light`, `Mid`, `Current`, `Hard`, or `Harsher`. `Light` keeps prices lower, makes extra rent start as late as possible, and sets refusal/hunt to Parody; `Current` is the default and matches the table above; `Hard` / `Harsher` make wealth bite earlier.
- **Inflation Percentages** controls the tier increases: `$settings.inflationOnsetPct`, `$settings.inflationBadPct`, `$settings.inflationCrisisPct`, `$settings.inflationExtremePct`, and `$settings.inflationParodyPct`.
- **Bailey Triggers** leads with the **Relentless Bailey** toggle (`$settings.inflationBaileyRelentless`, off by default — the manual "bite from the start" switch). Below it are _Extra rent starts_ (`$settings.inflationBaileyRentPct`) and _Refusal/hunt starts_ (`$settings.inflationBaileyCrisisTier`, default `"crisis"`) — both are threshold settings that Relentless Bailey overrides, so both are greyed-out/disabled while it is on.
- **Bailey Rent Limits** controls the rent-pressure caps: `$settings.inflationBaileyCapLow`, `$settings.inflationBaileyCapHigh`, `$settings.inflationBaileyDemandJump`, and `$settings.inflationBaileyDemandInvestment`. This entire box is greyed-out/disabled while **Relentless Bailey** is on (that mode is uncapped).
- **Bailey Weekly Pressure** controls the weekly rent step (`$settings.inflationBaileyStep`, default £500) and overdue bank-loan collection (`$settings.inflationLoanRentSurcharge`, default £1,500).

Inflation is always on. `$settings.inflationEnabled` is forced true and only kept as reserved scaffolding for a future toggle. `setup.inflation.ensureSettings()` initializes and clamps these values for old saves. `setup.inflation.applyPreset(name)` writes a full preset into `$settings`.

### `setup.inflation.multiplier(wealth?)`

Returns the price multiplier (`>= 1`) for the given wealth, or the player's current net wealth if omitted. Capped at the top tier (currently `x16.0`).

### `setup.inflation.price(base)`

The **single source of truth**. Returns `Math.round(base * multiplier())`. Both the `money()` charge hook and the `<<printprice>>` display widget go through this, so a label and its charge always match.

### `setup.inflation.rentDemand(baseRent)`

Bailey's actual weekly rent demand, tiered by **Bailey-visible wealth** (`baileyWealth()` — cash + savings only, **not** locked fixed terms). The wealth thresholds are fixed, while the caps below are player settings shown with their current-preset defaults:

| Bailey-visible wealth | Demand                                                                   |
| --------------------- | ------------------------------------------------------------------------ |
| < rent threshold      | normal vanilla rent, with the rent setting and Robin double-rent applied |
| < £1M                 | rent pressure capped at `RENT_CAP_LOW` (**£15,000**)                     |
| £1M – £10M            | rent pressure capped at `RENT_CAP_HIGH` (**£35,000**)                    |
| £10M – £100M          | rent pressure capped at **£75,000**                                      |
| >= £100M              | rent pressure capped at **£250,000**                                     |

If **Relentless Bailey** is on, `rentCap()` returns `Infinity` and the table above does not apply — rent climbs one step every paid week with no ceiling.

Rent does not multiply or jump directly from wealth. Once Bailey-visible wealth reaches `$settings.inflationBaileyRentPct` (default +35%, the Bad economy tier) — **or always, if Relentless Bailey is toggled on** — successful rent payment advances `$baileyRentInflationSteps` by one. Each step adds `$settings.inflationBaileyStep` (default £500, scaled by Bailey's Rent setting and Robin's double-rent state) to the next week's rent, capped by the current wealth tier. If Bailey-visible wealth drops below the trigger, the counter is cleared and rent immediately returns to the normal capped vanilla amount: £2,000 at 100% rent, or £4,000 when Robin's rent is included.

### `setup.inflation.rentDemandTier()`

`""` (normal), `"jump"` (>= £10M, the £75,000 cap tier), or `"investment"` (>= £100M, the £250,000 cap tier). Drives the special Bailey dialogue in the `<<baileyRentFlavour>>` widget.

### `setup.inflation.applyToRent(amount)`

Delegates to `rentDemand(amount)`. Called by the `rentmod` widget.

### `setup.inflation.appliesToSpend(source)`

Whether a `money()` spend with the given `source` should be inflated. Returns false for `EXCLUDED_SOURCES` (`"baileyRent"`, `"bankLoan"`, `"tailorDeposit"`, `"robinGift"`, `"estateBetting"`).

**Gating rule:** any button whose label prints an inflated price must test affordability against the inflated price too — `setup.inflation.canAfford(base, source)`, or `$money gte (setup.inflation ? setup.inflation.spendPrice(base, source) : base)`. Testing the raw base lets the player click a purchase they cannot cover. Wagers that are paid back out of a pot at their raw value (the dice game, the estate ante) must bypass the hook instead, so the buy-in and the winnings use the same units.

### `setup.inflation.percent(wealth?)`, `isCrisis(wealth?)`

`percent` returns the inflation as a whole-number percentage above base (for UI). `isCrisis` is true once wealth reaches the stage selected by `$settings.inflationBaileyCrisisTier` (default `"crisis"`).

### `$settings.inflationBaileyCrisisTier`

The economy stage at which Bailey stops accepting refusal and can begin street hunting: `"onset"`, `"bad"`, `"crisis"`, `"extreme"`, or `"parody"`. This follows the stage's wealth threshold, not the stage's percentage slider, so choosing `"parody"` really waits for the £100,000,000 tier.

### `setup.inflation.hasLoanDebt()`, `baileyAggressionReason()`, `baileyAggressive()`

`baileyAggressionReason()` returns `""`, `"inflation"`, `"loan"`, or `"both"`. Bailey is aggressive (rent unavoidable, street hunting active) when **Bailey-visible** wealth reaches `$settings.inflationBaileyCrisisTier` **or** the player owes the bank. He calms down when there is no loan and visible wealth is back below that stage. The stage judgement runs `isCrisis(baileyWealth())`, so money locked in an active fixed term never triggers aggression until it matures into savings.

### `setup.inflation.totalWealth()` vs `baileyWealth()`

Two deliberately separate wealth figures:

|                                    | Formula                                                                                    | Drives                                                                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `totalWealth()` (inflation wealth) | cash + savings + **active fixed-term principal** + prepaid Bailey deposit − loan principal | general economy: `multiplier()`, `price()`, `percent()` (journal economy block), the parody cap                                                        |
| `baileyWealth()` (Bailey-visible)  | cash + savings − loan principal (**no** locked fixed terms)                                | everything Bailey reacts to: `rentDemand`, `rentDemandTier`, the crisis side of `baileyAggressionReason`, the `<<rentInflationNotice>>` hoarding smirk |

`rentPayable()` = cash + `liquidBankFunds()` (savings only) is what affordability/forced-withdrawal use. So a locked fixed term inflates the **shops** but is invisible to **Bailey** until it matures and `processDay()` sweeps it into savings, at which point it joins `baileyWealth()` and `rentPayable()`.

## Integration Points

There are exactly three places the multiplier is applied. Everything else is base-vanilla.

### 1. The charge: `money()` hook

`game/base-system/stat-changes.js`. Every negative (spend) amount passed to the `money()` function / `<<money>>` macro is run through `setup.inflation.price()`, unless its `source` is in `EXCLUDED_SOURCES`.

This means **the amount actually deducted is correct game-wide automatically**, including in shops nobody remembered to update.

The surcharge is clamped so it can never overdraw the player: if they can afford the base price but not the inflated price, they pay all their cash; if they cannot afford the **base** price, the amount is left untouched so the engine's normal affordability error still fires. This preserves vanilla behaviour for guard-less shops and prevents a near-free purchase when cash is low but bank wealth is high.

### 2. The rent: `rentmod` widget

`game/overworld-town/loc-home/rent.twee`. After the base rent tier is set, `rentmod` applies the current Bailey rent pressure with `setup.inflation.applyToRent()`. The pressure counter advances only inside `<<rentpay>>` after a successful payment; journal previews, deposit calculations, Poppy, and Robin paths only read the current demand. Because the same widget renders every path, the displayed rent equals the charged rent everywhere.

### 3. The display: `<<printprice>>` widget

`game/base-system/widgets.twee`. `<<printprice base [class]>>` is the inflation-aware twin of `<<printmoney>>`. It prints `formatMoney(setup.inflation.price(base))`. Use it to show any price the player is about to pay.

> Note: `formatMoney` also sets the temporary `_printmoney` as a side effect. Passages that build a link caption from `_printmoney` (the pharmacy, the Niki photo) get the inflated value automatically once their first price display is switched to `<<printprice>>`.

## Adding Inflation to a Priced Action

This is the recipe for any new shop, service, or paid action. Follow all three steps so the charge, the guard, and the label stay in sync.

```
/* 1. CHARGE - use the <<money>> macro with a source. The hook inflates it automatically. */
<<money -5000 "myShop">>

/* 2. LABEL - use <<printprice>> instead of <<printmoney>> for the price. */
<<printprice 5000>>

/* 3. GUARD - inflate the affordability check so the option matches the charge. */
<<if $money gte (setup.inflation ? setup.inflation.price(5000) : 5000)>>
```

For a price held in a variable, pass the variable: `<<printprice _cost>>`, `$money gte (setup.inflation ? setup.inflation.price(_cost) : _cost)`.

Do **not** use `<<printprice>>` inside a JavaScript template literal (backtick link captions). There, call the function directly: `${formatMoney(setup.inflation ? setup.inflation.price(5000) : 5000)}`.

**Sub-systems with their own price engine** (e.g. the hairDYE hairdresser in `game/00-framework-tools/DoLXAddition/hairDYE/`) compute prices in JS and render a table. Keep the charge on `<<money ... "source">>` so the hook scales it, and add a tiny display wrapper — `dhmShop.displayPrice(amount)` returns `setup.inflation.price(amount)`; used wherever a price is printed (table cells, "to pay" totals). Do not double-inflate: if you inflate at the charge instead, exclude that source from the hook. Beware shared sources — the hairdresser's gel/growth-formula buys reuse `"hairdressers"`, so its dye table is fixed on the display side, not by excluding the source.

### Things that must NOT be inflated

- **Income and wages** (`<<money 1200 "cafeWaiter">>`, "a £500 thank you"). The hook only touches negative amounts, but never switch an income `<<printmoney>>` to `<<printprice>>`.
- **Refunds and reimbursements.** They are not income and are never multiplied again; return the exact inflation-adjusted amount captured when the original purchase was charged.
- **The player's balance readout** ("You have £X").
- **Gambling stakes** (dice). Inflating a bet breaks the win/loss maths. These deliberately bypass the hook with direct `$money` writes.
- **Bank deposits, withdrawals, and tier top-ups.** These move money between cash and savings and write `$money` directly.
- **Cheats.**
- **Rent and loan repayments**, which are handled at their own source (`"baileyRent"`, `"bankLoan"`) and excluded from the hook.

If a paid action writes `$money` directly (`<<set $money -= N>>`) it bypasses the hook and will **not** inflate. Convert it to `<<money -N "source">>` unless it is one of the exceptions above.

## Bank Loan ("Rent Money")

Implemented in `game/overworld-town/loc-hbsc-bank-branch/bank.js` (`setup.hbsc.*` loan helpers). Constants near the top of the loan section:

- `LOAN_CHUNK` (30000000): advanced per request.
- `LOAN_PRINCIPAL_MAX` (100000000): cap on outstanding borrowed principal.
- `LOAN_INTEREST` (0.5): repay 1.5x principal.
- `LOAN_RENT_SURCHARGE` (150000): fallback weekly amount Bailey collects toward an overdue loan; live saves read `$settings.inflationLoanRentSurcharge`.
- `LOAN_OVERDUE_DAYS` (25): 25 in-game days with no payment before collection passes to Bailey.

Borrow in chunks until outstanding principal reaches the cap (the last chunk is auto-capped to the remaining room); repaying frees capacity. `ensureLoanState` is wired into `setup.hbsc.ensureState`; `processLoanDay` into `processDay` (daily). UI lives in the `HBSC Bank Loan` / `HBSC Bank Loan Result` passages (`main.twee`) and the `hbscOptions` widget. A savings account is not required to borrow.

Loan cash uses the `bankLoan` source so it is excluded from inflation. Loan repayments and the rent surcharge are likewise excluded.

## Aggressive Bailey

When `setup.inflation.baileyAggressive()` is true:

- **Temple and Alex's farm** (`temple_bailey_options`, `cottage_bailey_options`) drop the "Refuse" option. The shared `<<baileyGripDemand>>` widget (`loc-home/kozmods/misc.twee`) prints a reason-based hand-grip line (he knows you're hoarding, or the bank sent him).
- **Street hunt.** `streeteffects` (`loc-street/widgets.twee`) sets `$eventforced` and `$baileyStreetHuntPending` when rent is overdue (`$renttime lte -2`, or `$renttime lte 0` in daytime hours) and rent is active. `eventsstreet`'s top-priority branch renders the `<<baileyStreetHunt>>` widget (`loc-street/kozmods/events/bailey-hunt.twee`) inline, suppressing the normal street links. The hunt fires on **every** town-street entry until the rent is paid (which resets `$renttime`). A penniless player only triggers it once per day (`$daily.baileyHuntBroke`) so it cannot soft-lock travel.

A one-time `<<rentInflationNotice>>` (the first time inflation is reached) and the loan's `<<loanRentNotice>>` are shown in the rent-due flow.

**Bank withdrawal.** Storing money in _savings_ does not dodge rent in town. Affordability checks use `setup.inflation.rentPayable()` (cash + savings, **not** locked fixed terms), so the "Pay" option appears whenever cash **or** savings can cover it. The shared `rentpay` widget then calls `<<baileyBankDraw>>` (in `loc-home/kozmods/misc.twee`) when cash is short: Bailey marches the player to HBSC (the teller is unbothered, the guard eyes the _player_ as the threat) and forces a withdrawal of the shortfall from savings ("You can't run from me by stuffing it in a vault."). He cannot touch a still-locked fixed term — that money only becomes reachable once the term matures and is swept into savings. This covers the home, street hunt, and temple pay paths, and each path returns the player to the passage/location Bailey interrupted.

**Farm exception.** Alex's farm is too far from HBSC for the forced-withdrawal scene. The farm Bailey path requires enough cash on hand to pay. If the player is short, Bailey takes whatever cash they are carrying as a down payment, then leaves threatening Alex's farm instead of dragging the player to the bank.

If even cash + savings can't cover it, the street hunt's broke branch drains both as a down payment. The `<<baileyRentFlavour>>` widget (defined in `loc-home/kozmods/misc.twee`, called from `rentdue`/`rentduerobin` and the street hunt) prints the special demand line at the `"jump"` (>= £10M, "I want more") and `"investment"` (>= £100M, "my best investment") rent-demand tiers.

## Player-Facing Indicator

The `journal` widget (`game/base-system/overlays/journal.twee`) shows an "Economy" block above the world map: stable, the current `+X%`, or a crisis label, plus a warning when Bailey is aggressive. It reads `setup.inflation.percent()` and `baileyAggressionReason()` only; it owns no state.

The `hbscJournal` widget (`game/overworld-town/loc-hbsc-bank-branch/widget.twee`) shows an "Outstanding loan" line in the HBSC Banking section when `$hbsc.loan.owed > 0`, including the overdue/Bailey-collection note.

## Parody Money Cap

A failsafe for the runaway end of the spiral (inflation plus compounding bank interest can balloon a save into absurd numbers). When the player navigates with net wealth above `setup.inflation.PARODY_WEALTH` (£3,000,000,000), a comedic event confiscates it.

- The hook is a wrapper around `Config.navigation.override`, installed in `:: StoryInit` (`game/04-Variables/variables-start.twee`). StoryInit re-runs on every page open, so the wrapper composes with the live vanilla override rather than editing core config. It first defers to the original override's result (version-migration waiting rooms and passage remaps win), and only then asks `setup.inflation.moneyParodyDue(dest)`, which skips the parody's own passages (`PARODY_PASSAGES`) and refuses to fire mid-combat, mid-scene, or during an active bad end. When it fires, it stores the interrupted destination in `$moneyParodyReturnPassage`.
- The event lives in `game/00-framework-tools/DoLXAddition/money-parody.twee` (`Money Parody Intro` → `Money Parody Take` → `Money Parody Take 2`). `setup.inflation.takeAllMoney()` wipes every stash; cash (down to `PARODY_LEFTOVER`, £1,000,000,000), HBSC savings, fixed terms, the stale interest/maturity notices (`$hbsc.notices`) that drive the journal's "recent changes" line, and the prepaid Bailey rent deposit (`$baileyDeposit`). The final link returns to `$moneyParodyReturnPassage`, then falls back to the previous valid passage or `Bedroom` if the stored passage is invalid. The loan (debt) is deliberately left so it still shows in the bank journal.
- It awards the hidden, difficulty-5 feat **"Meet the Dev"** ("Thanks for playing our game!"). That feat is the single one allowed to bypass the cheat/debug/soft-mode lockout in `earnFeat` (`feats.js`), because the parody only fires in an exploit state.
- It is **self-gating**: there is no "seen" flag. After it runs, wealth is back under the cap; it only re-fires if the player climbs back above it. Every parody passage is in `PARODY_PASSAGES` so it can never redirect into itself.

## Important Files

- `game/overworld-town/loc-hbsc-bank-branch/inflation.js`: the entire `setup.inflation` API, default presets, setting ranges, and tier thresholds.
- `game/base-system/stat-changes.js`: the `money()` charge hook (search for "X-Change inflation").
- `game/base-system/widgets.twee`: the `<<printprice>>` widget (next to `<<printmoney>>`).
- `game/overworld-town/loc-home/rent.twee`: `rentmod` scaling, and `rentpay` (loan surcharge + the `<<baileyBankDraw>>` savings withdrawal).
- `game/overworld-town/loc-home/kozmods/misc.twee`: the Bailey demand widgets — `<<baileyGripDemand>>`, `<<baileyRentFlavour>>`, `<<baileyBankDraw>>`, `<<rentInflationNotice>>`, `<<loanRentNotice>>`.
- `game/overworld-town/loc-hbsc-bank-branch/bank.js`: the loan engine.
- `game/overworld-town/loc-hbsc-bank-branch/main.twee`: loan UI passages.
- `game/overworld-town/loc-street/widgets.twee`: `streeteffects` trigger and the `eventsstreet` branch.
- `game/overworld-town/loc-street/kozmods/events/bailey-hunt.twee`: the street hunt scene.
- `game/base-system/overlays/journal.twee`: the economy indicator.
- `game/04-Variables/variables-start.twee`: `:: StoryInit` wrapper that installs the parody redirect over `Config.navigation.override`.
- `game/00-framework-tools/DoLXAddition/money-parody.twee`: the parody event passages.
- `game/04-Variables/feats.js`: the "Meet the Dev" feat and its cheat-lockout exemption in `earnFeat`.

## Porting a Future Vanilla Change

Use this checklist whenever vanilla changes a shop, a price, or the rent system.

1. Port the vanilla change as written first. Keep its base prices and shop logic.
2. If vanilla adds a paid action, charge it with `<<money -N "source">>` (it inflates automatically) and display the price with `<<printprice N>>`.
3. If vanilla writes `$money` directly for a purchase, convert it to `<<money>>` unless it is income, a bet, a bank transfer, or a cheat.
4. Inflate any `$money gte N` affordability guard for a purchase.
5. Never change an income or balance `<<printmoney>>` to `<<printprice>>`.
6. If vanilla reworks rent, ensure `rentmod` still runs after the base rent is set, and that `baileyRent` remains the deduction source.
7. If vanilla adds a new excluded transfer (e.g. another savings-like flow that writes `$money`), add its source to `EXCLUDED_SOURCES`.
8. If vanilla rebalances item prices, do nothing; inflation is a multiplier and tracks the new base automatically.
9. Compile and run the structural checks below.

## Validation

From the repository root on Windows:

```powershell
node --check game/overworld-town/loc-hbsc-bank-branch/inflation.js
node --check game/base-system/stat-changes.js
node --check game/overworld-town/loc-hbsc-bank-branch/bank.js
cmd /c compile.bat
git diff --check
```

Useful structural searches:

```powershell
# Purchases that bypass the inflation hook by writing $money directly.
# Each result must be income, a bet, a bank transfer, or a cheat - otherwise convert to <<money>>.
rg -n '<<set \$money (-=|to \$money)' game

# Price labels that still show the base value instead of <<printprice>>.
# Classify each: a price the player pays should use <<printprice>>; income/balance should not.
rg -n '<<printmoney ' game

# Affordability guards that were not inflated.
rg -n '\$money (gte|>=) [0-9]' game

# Confirm <<printprice>> is never used inside a backtick template literal (it would not render).
rg -n '`[^`]*<<printprice' game
```

The `<<printmoney>>` search is not expected to return zero. Its remaining results must be income, balances, or narration, not prices the player pays.

## Review Rule of Thumb

Ask one question at every money reference:

> Is this money the player **pays for something**, or is it income, a balance, a bet, or a transfer?

- If the player pays it: charge with `<<money>>` (auto-inflates), label with `<<printprice>>`, guard with `setup.inflation.price()`.
- If it is income, a balance, a stake, a bank transfer, or a cheat: leave it on `<<printmoney>>` / direct `$money` and do not inflate it.

Keeping that boundary intact is the core of this system.

---

======================================================

# Future Balance Note: Fixed-Term Shelter Loop

======================================================

The fixed-term deposit loophole is intentional for now.

A player who understands the HBSC bank system should be able to use active fixed-term deposits as a temporary shelter from Bailey. Locked terms still count toward general economic inflation, so the city reacts to the player's hidden wealth through higher prices, but Bailey himself only reacts to liquid, visible money: cash and normal savings. This creates a deliberate strategic gap between "the economy knows the player is rich" and "Bailey can personally reach the money."

This should not be treated as a bug unless it becomes the dominant or safest way to bypass the rent system.

Current intended behaviour:

- Active fixed-term deposits count for shop/economy inflation.
- Active fixed-term deposits do not count for Bailey rent demand, rent tier, hoarding aggression, or forced withdrawal.
- Matured fixed-term deposits are swept into savings.
- Once swept into savings, they become Bailey-visible and Bailey-reachable.

If players abuse this too heavily, rebalance later rather than removing the mechanic outright. Possible future nerfs, from softest to harshest:

1. Add higher inflation tiers above very high wealth, so hidden money still makes the world more expensive.
2. Make fixed-term maturity sweep happen before rent/Bailey checks on the same day.
3. Block opening new fixed terms while rent is overdue, Bailey is actively hunting, or bank loan debt is overdue.
4. Add a cooldown after maturity before the player can re-lock the same money into another fixed term.
5. Add a bank suspicion fee or early-withdrawal penalty for repeated large fixed-term cycling.
6. Let Bailey notice repeated banking patterns only after abuse, not immediately.
7. As a last resort, allow Bailey-visible wealth to include a percentage of locked fixed terms instead of excluding them entirely.

Design principle: the loophole should reward planning and system knowledge, but it should not become a risk-free permanent shield against Bailey.
