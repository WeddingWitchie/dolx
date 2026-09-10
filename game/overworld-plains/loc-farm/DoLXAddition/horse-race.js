/* Horse Race Betting Minigame for DoL-style projects */
setup.horserace = setup.horserace || {};

(function () {
	"use strict";
	const HR = setup.horserace;
	HR.DEFAULT_WATCH_DELAY = 1600;

	/* ---- Gambling balance configuration -------------------------------- *
	 * INJURY_CHANCE_PERCENT: chance that the backed horse will be pulled up
	 *   late in the race after a bet is placed.
	 *
	 * PAYOUT_MARGIN: house edge applied to winning payouts. 1.0 = fair odds
	 *   (the original, slightly player-favorable behaviour). 0.92 = the house
	 *   keeps 8%, so grinding trends negative over time. Set to 1.0 to disable.
	 *
	 * The weekly reset is handled by DoL's native $weekly cleanup; all weekly
	 * counters live on $weekly, so they clear automatically each game week.
	 * ------------------------------------------------------------------- */
	HR.INJURY_CHANCE_PERCENT = 80;
	HR.PAYOUT_MARGIN = 0.92;

	/* Every clean rigging job makes the backed horse steadier; every botched one leaves it rattled.
	These shift the base injury chance up or down, so a player who works the stable yard well raises their 25% clean run,
	and a player who fumbles it lowers their own odds. */
	HR.RIG_SUCCESS_INJURY_SHIFT = 8;
	HR.RIG_FAILURE_INJURY_SHIFT = 6;
	HR.INJURY_CHANCE_FLOOR = 30;
	HR.INJURY_CHANCE_CEILING = 92;

	HR.effectiveInjuryChance = function () {
		const race = HR.ensureState();
		const successes = Number.isFinite(race.rigSuccesses) ? race.rigSuccesses : 0;
		const failures = Number.isFinite(race.rigFailures) ? race.rigFailures : 0;
		const shifted = HR.INJURY_CHANCE_PERCENT - successes * HR.RIG_SUCCESS_INJURY_SHIFT + failures * HR.RIG_FAILURE_INJURY_SHIFT;
		return HR.clamp(shifted, HR.INJURY_CHANCE_FLOOR, HR.INJURY_CHANCE_CEILING);
	};

	/* The number the player actually cares about: the chance their backed horse gets round the course without being pulled up. */
	HR.cleanRunChance = function () {
		return 100 - HR.effectiveInjuryChance();
	};

	/* ---- Race rigging configuration ------------------------------------ *
	 * Each stable action adds suspicion on success or failure (failure adds more, since getting caught trying is worse than a clean success).
	 * SUSPICION_CANCEL_CAP is the maximum percent chance, rolled once when the player places their bet, that the stewards pull the race entirely (bet is never charged).
	 * Surviving suspicion instead shortens the effective odds on a winning payout, via suspicionPayoutMultiplier.
	 * ------------------------------------------------------------------- */
	HR.SUSPICION_CANCEL_CAP = 80;

	HR.suspicionPayoutMultiplier = function (suspicion) {
		return HR.clamp(1 - HR.clamp(suspicion, 0, 100) / 250, 0.55, 1);
	};

	HR.RIG_ACTIONS = [
		{
			id: "injure_horse",
			tier: "high",
			label: "Injure a horse",
			target: "rival",
			passage: "Racecourse Rig Injure Horse",
			difficulty: 250,
			suspicionSuccess: 25,
			suspicionFail: 45,
			apply(horse) {
				horse.baseSpeed -= 60;
				horse.maxStamina -= 60;
				horse.stamina = Math.min(horse.stamina, horse.maxStamina);
				horse.focus -= 20;
			},
		},
		{
			id: "beat_rider",
			tier: "high",
			label: "Threaten a rider",
			target: "rival",
			passage: "Racecourse Rig Threaten Rider",
			difficulty: 350,
			suspicionSuccess: 25,
			suspicionFail: 45,
			apply(horse) {
				horse.baseSpeed -= 25;
				horse.focus -= 30;
				horse.stamina -= 15;
			},
		},
		{
			id: "drug_horse",
			tier: "medium",
			label: "Drug the feed",
			target: "rival",
			passage: "Racecourse Rig Drug Horse",
			difficulty: 450,
			suspicionSuccess: 12,
			suspicionFail: 25,
			itemCost: "phial",
			apply(horse) {
				horse.stamina -= 25;
				horse.focus -= 20;
			},
		},
		{
			id: "stimulate_own",
			tier: "medium",
			label: "Dose your horse",
			target: "own",
			passage: "Racecourse Rig Stimulant",
			difficulty: 400,
			suspicionSuccess: 12,
			suspicionFail: 25,
			itemCost: "phial",
			apply(horse) {
				horse.baseSpeed += 15;
				horse.stamina += 15;
			},
		},
		{
			id: "bribe_money",
			tier: "medium",
			label: "Bribe with cash",
			target: "rival",
			passage: "Racecourse Rig Bribe Money",
			difficulty: 300,
			suspicionSuccess: 12,
			suspicionFail: 20,
			cost: 500,
			apply(horse) {
				horse.focus -= 20;
				horse.baseSpeed -= 10;
			},
		},
		{
			id: "sabotage_equipment",
			tier: "low",
			label: "Cut the tack",
			target: "rival",
			passage: "Racecourse Rig Sabotage Tack",
			difficulty: 350,
			suspicionSuccess: 4,
			suspicionFail: 10,
			apply(horse) {
				horse.focus -= 15;
				horse.stamina -= 8;
			},
		},
		{
			id: "encourage_own",
			tier: "low",
			label: "Encourage your horse",
			target: "own",
			passage: "Racecourse Rig Encourage Horse",
			deviancyGated: true,
			difficulty: 250,
			suspicionSuccess: 4,
			suspicionFail: 10,
			apply(horse) {
				horse.focus += 12;
				horse.stamina += 8;
			},
		},
		{
			id: "bribe_sex",
			tier: "low",
			label: "Bribe with sex",
			target: "own",
			passage: "Racecourse Rig Bribe Rider",
			difficulty: 300,
			suspicionSuccess: 4,
			suspicionFail: 10,
			apply(horse) {
				horse.baseSpeed += 12;
				horse.focus += 10;
			},
		},
	];

	/* ---- Stable rigging mini-game --------------------------------------- *
	 * Every rigging action (except the rider bribe, which runs the real sex encounter loop instead) plays out as a short push-your-luck game:
		a progress meter that has to reach 100 before a risk meter reaches 100.
	 * Each turn the player picks:
	 *   "quick"    - a skulduggery check at the action's full difficulty.
	 *                Big progress and a real risk bump on success, a small
	 *                gain but a heavy risk bump on failure.
	 *   "careful"  - a skulduggery check 100 points easier. Smaller gains,
	 *                much smaller risk either way.
	 *   "watch"    - no check, no progress, but bleeds off risk.
	 * Five turns is the hard cap; running out of time resolves on whichever meter is closer to its own threshold.
	 * ------------------------------------------------------------------- */
	HR.RIG_MINIGAME_TURN_CAP = 5;

	HR.rigGameState = function () {
		const race = HR.ensureState();
		if (race.rigGame == null || typeof race.rigGame !== "object") race.rigGame = {};
		const g = race.rigGame;
		if (!Number.isFinite(g.progress)) g.progress = 0;
		if (!Number.isFinite(g.risk)) g.risk = 0;
		if (!Number.isFinite(g.turn)) g.turn = 0;
		if (typeof g.actionId !== "string") g.actionId = "";
		if (typeof g.pendingMode !== "string") g.pendingMode = "";
		return g;
	};

	HR.startRigMinigame = function (actionId) {
		const g = HR.rigGameState();
		g.actionId = actionId;
		g.progress = 0;
		g.risk = 0;
		g.turn = 0;
		g.pendingMode = "";
		return g;
	};

	/* Built in JS rather than as twee markup */
	HR.renderRigMeters = function () {
		const g = HR.rigGameState();
		const progress = HR.clamp(g.progress, 0, 100);
		const risk = HR.clamp(g.risk, 0, 100);
		const turnsLeft = Math.max(0, HR.RIG_MINIGAME_TURN_CAP - g.turn);
		return `<div class="horse-race-panel">
			<div class="horse-race-progress">
				<span>Progress</span>
				<meter min="0" max="100" low="35" high="70" optimum="100" value="${progress.toFixed(0)}"></meter>
				<span>${Math.floor(progress)}%</span>
			</div>
			<div class="horse-race-progress">
				<span>Risk of being noticed</span>
				<meter min="0" max="100" low="35" high="70" optimum="0" value="${risk.toFixed(0)}"></meter>
				<span>${Math.floor(risk)}%</span>
			</div>
			<p>Time before the horses are led out: <strong>${turnsLeft}</strong></p>
		</div>`;
	};

	HR.rigMinigameDifficulty = function (action, mode) {
		if (!action) return 0;
		if (mode === "careful") return Math.max(0, action.difficulty - 100);
		return action.difficulty;
	};

	HR.applyMinigameTurn = function (mode, success) {
		const g = HR.rigGameState();
		g.turn += 1;
		if (mode === "quick") {
			if (success) {
				g.progress = HR.clamp(g.progress + 45, 0, 100);
				g.risk = HR.clamp(g.risk + 8, 0, 100);
			} else {
				g.progress = HR.clamp(g.progress + 10, 0, 100);
				g.risk = HR.clamp(g.risk + 35, 0, 100);
			}
		} else if (mode === "careful") {
			if (success) {
				g.progress = HR.clamp(g.progress + 25, 0, 100);
				g.risk = HR.clamp(g.risk + 3, 0, 100);
			} else {
				g.progress = HR.clamp(g.progress + 8, 0, 100);
				g.risk = HR.clamp(g.risk + 15, 0, 100);
			}
		} else if (mode === "watch") {
			g.risk = HR.clamp(g.risk - 18, 0, 100);
		}
		return g;
	};

	HR.rigMinigameOutcome = function () {
		const g = HR.rigGameState();
		if (g.risk >= 100) return "caught";
		if (g.progress >= 100) return "success";
		if (g.turn >= HR.RIG_MINIGAME_TURN_CAP) return g.progress >= 60 ? "success" : "caught";
		return "ongoing";
	};

	HR.RIG_MINIGAME_TEXT = {
		injure_horse: {
			scene: "You crouch at the horse's front leg with a grip on the shoe. You need to work the nail loose without the handler noticing.",
			quick: "Pull hard",
			careful: "Work it slowly",
			watchLabel: "Check where the handler is",
			quickSuccess: "The nail gives way fast. You have most of the shoe loose already.",
			quickFail: "You yank too hard and the shoe clangs against the ground. You freeze, but nobody comes running yet.",
			carefulSuccess: "You ease the nail out a little at a time. Slow, but it's working, and nobody has looked over.",
			carefulFail: "Your fingers slip on the nail head and you lose your grip. You've barely moved it.",
			watch: "You glance down the row. The handler is still occupied at the far end.",
		},
		beat_rider: {
			scene: "You have the rider cornered behind the stalls. You need to make the threat land before someone walks past.",
			quick: "Push the threat hard",
			careful: "Keep your voice low and controlled",
			watchLabel: "Check who's nearby",
			quickSuccess: "The threat lands. You can see it go in.",
			quickFail: "The rider flinches back, voice rising. A groom two stalls down glances over.",
			carefulSuccess: "You keep it quiet and specific. The rider is listening, and nobody else has noticed.",
			carefulFail: "The rider isn't buying it, and keeps glancing past your shoulder for someone to call to.",
			watch: "You check over your shoulder. Still just the two of you back here.",
		},
		drug_horse: {
			scene: "You have the phial open and the feed bucket in front of you. You need to mix it in evenly before the handler comes back.",
			quick: "Tip in the whole phial",
			careful: "Mix it in a little at a time",
			watchLabel: "Listen for footsteps",
			quickSuccess: "It mixes into the feed cleanly. The horse won't notice a thing.",
			quickFail: "Some of it splashes over the rim. You wipe it off the bucket with your sleeve before it stains.",
			carefulSuccess: "You work it in slowly, stirring with two fingers until the feed looks untouched.",
			carefulFail: "The feed clumps around the liquid instead of soaking it in. You have to keep working at it.",
			watch: "You stop and listen. No footsteps yet.",
		},
		stimulate_own: {
			scene: "The water bucket is in front of you and the phial is already open. You need to get it mixed in before the handler returns.",
			quick: "Pour it straight in",
			careful: "Add it slowly and stir",
			watchLabel: "Watch for the handler",
			quickSuccess: "It disperses fast, and the water clears back up within seconds.",
			quickFail: "The water clouds visibly. You swirl it hard with your hand to clear it before anyone sees.",
			carefulSuccess: "You stir it in a little at a time until the water looks normal again.",
			carefulFail: "It's taking longer than you'd like. The water is still faintly discoloured.",
			watch: "You look up and down the row. Nobody is coming yet.",
		},
		bribe_money: {
			scene: "The rider is listening, but hasn't agreed to anything yet. You need to close the deal before he loses his nerve or someone walks over.",
			quick: "Push the offer harder",
			careful: "Talk him through it calmly",
			watchLabel: "Check who's within earshot",
			quickSuccess: "The rider stops hesitating and holds out a hand.",
			quickFail: "The rider hesitates and looks towards the stalls, checking who's around.",
			carefulSuccess: "You keep your voice down and lay it out plainly. The rider is coming around.",
			carefulFail: "The rider still won't commit, and keeps looking past you.",
			watch: "You glance around. Nobody close enough to overhear yet.",
		},
		sabotage_equipment: {
			scene: "The girth strap is in your hands. You need to weaken the stitching without leaving it obviously torn.",
			quick: "Pick at it hard",
			careful: "Work the stitching loose bit by bit",
			watchLabel: "Check for the handler",
			quickSuccess: "A section of stitching tears free clean. It'll hold together until it's put under real weight.",
			quickFail: "The thread snaps somewhere visible. You turn the strap so the damage faces away from view.",
			carefulSuccess: "You work a few stitches loose at a time. It still looks intact from a glance.",
			carefulFail: "The leather is tougher than you expected and barely gives.",
			watch: "You look towards the water trough. The handler isn't back yet.",
		},
		encourage_own: {
			scene:
				"Your hand is on the horse's flank and it is pushing back against you. You need to work it up and settle it again before anyone comes down the row.",
			quick: "Keep going, faster",
			careful: "Slow, steady strokes",
			watchLabel: "Check the next stall over",
			quickSuccess: "The horse settles fast, ears forward, weight steady on all four legs.",
			quickFail: "The horse jerks its head up at the pace and stamps a hoof against the straw.",
			carefulSuccess: "The horse relaxes into it, breathing slow, eyes half closed.",
			carefulFail: "The horse is still restless, shifting its weight and flicking its tail.",
			watch: "You listen. Nothing from the next stall yet.",
		},
	};

	HR.getRigAction = function (actionId) {
		return HR.RIG_ACTIONS.find(action => action.id === actionId) || null;
	};

	HR.rigActionUsed = function (actionId) {
		const race = HR.ensureState();
		return Array.isArray(race.riggedActions) && race.riggedActions.includes(actionId);
	};

	HR.rigCostInternal = function (action) {
		if (!action || !Number.isFinite(action.cost)) return 0;
		return HR.toInternalMoney(action.cost);
	};

	HR.resolveRigAction = function (actionId, targetId, success) {
		const race = HR.ensureState();
		const action = HR.getRigAction(actionId);
		const horse = HR.getHorse(targetId);
		if (!action || !horse) return { ok: false };

		if (!Array.isArray(race.riggedActions)) race.riggedActions = [];
		if (!race.riggedActions.includes(actionId)) race.riggedActions.push(actionId);

		if (success) {
			action.apply(horse);
			race.rigSuccesses = (Number.isFinite(race.rigSuccesses) ? race.rigSuccesses : 0) + 1;
			/* A rider or handler on your side keeps the bookies quiet for longer. */
			if (actionId === "bribe_money" || actionId === "bribe_sex") {
				HR.weeklyState().horseRaceStaffBribed = true;
			}
		} else {
			race.rigFailures = (Number.isFinite(race.rigFailures) ? race.rigFailures : 0) + 1;
		}

		horse.baseSpeed = HR.clamp(horse.baseSpeed, 5, 140);
		horse.focus = HR.clamp(horse.focus, 5, 140);
		horse.maxStamina = HR.clamp(horse.maxStamina, 10, 160);
		horse.stamina = HR.clamp(horse.stamina, 0, horse.maxStamina + 35);

		const suspicionAdded = success ? action.suspicionSuccess : action.suspicionFail;
		race.suspicion = HR.clamp((Number.isFinite(race.suspicion) ? race.suspicion : 0) + suspicionAdded, 0, 100);

		return { ok: true, suspicionAdded, action, horse };
	};

	HR.trackDefs = {
		oval: {
			name: "Outer Oval",
			description: "A proper oval course.",
			viewBox: "0 0 1000 540",
			/* The path starts on the finish/start line, so horses do not begin somewhere else. */
			path: "M 250 400 L 750 400 C 875 400 930 340 930 270 C 930 200 875 140 750 140 L 250 140 C 125 140 70 200 70 270 C 70 340 125 400 250 400 Z",
			finish: { x1: 250, y1: 365, x2: 250, y2: 435 },
		},
		cross: {
			name: "Infield Circuit",
			description: "A wider oval with positioning matters more than pure speed.",
			viewBox: "0 0 1000 540",
			/* The path starts on the finish/start line, so the markers and line match. */
			path: "M 250 420 L 780 420 C 895 420 945 360 945 285 C 945 210 895 150 780 150 L 220 150 C 105 150 55 210 55 285 C 55 360 105 420 220 420 L 250 420 Z",
			innerPaths: ["M 250 150 L 750 420", "M 220 420 L 780 150"],
			finish: { x1: 250, y1: 385, x2: 250, y2: 455 },
		},
	};

	HR.skillPool = [
		{
			id: "steady_stride",
			name: "Steady Stride",
			description: "Keeps a clean rhythm and builds speed over time.",
			condition(horse, race) {
				return horse.progress >= 15 && horse.progress <= 75 && horse.stamina > 35;
			},
			effect(horse, race, log) {
				horse.boost += 2.1;
				horse.focus += 4;
				horse.stamina -= 3;
				log.push(`${horse.name} finds a steady stride and starts gaining ground.`);
			},
		},
		{
			id: "steady_breath",
			name: "Steady Breath",
			description: "Recovers stamina while keeping pace.",
			condition(horse) {
				return horse.stamina < 78;
			},
			effect(horse, race, log) {
				horse.stamina += 14;
				horse.boost += 0.4;
				log.push(`${horse.name}'s breathing steadies, saving strength for later.`);
			},
		},
		{
			id: "inner_rail",
			name: "Inner Rail",
			description: "Uses the inside lane cleanly.",
			condition(horse) {
				return horse.lane <= 2;
			},
			effect(horse, race, log) {
				horse.progress += 3;
				horse.boost += 1.1;
				log.push(`${horse.name} stays close to the inner rail and moves ahead.`);
			},
		},
		{
			id: "corner_cutter",
			name: "Corner Cutter",
			description: "Accelerates through tight corners.",
			condition(horse, race) {
				return race.trackId === "cross" || horse.progress % 25 > 14;
			},
			effect(horse, race, log) {
				horse.progress += race.trackId === "cross" ? 4 : 2.5;
				horse.boost += 1.2;
				log.push(`${horse.name} turns the corner smoothly and keeps its speed.`);
			},
		},
		{
			id: "draft_chaser",
			name: "Draft Chaser",
			description: "Uses the horse ahead as a windbreak.",
			condition(horse, race) {
				return HR.rankOf(race, horse.id) > 1 && HR.distanceToNextHorse(race, horse.id) <= 9;
			},
			effect(horse, race, log) {
				horse.boost += 2.5;
				horse.stamina += 5;
				log.push(`${horse.name} follows another runner closely, then gets ready to speed up.`);
			},
		},
		{
			id: "pace_lock",
			name: "Pace Lock",
			description: "Finds a smooth rhythm.",
			condition() {
				return true;
			},
			effect(horse, race, log) {
				horse.boost += 1.8;
				horse.focus += 3;
				log.push(`${horse.name} settles into a smooth pace.`);
			},
		},
		{
			id: "mud_dancer",
			name: "Mud Dancer",
			description: "Performs better when the track is wet or muddy.",
			condition(horse, race) {
				return race.condition === "wet" || race.condition === "muddy";
			},
			effect(horse, race, log) {
				horse.progress += race.condition === "muddy" ? 5 : 3;
				horse.boost += 1.3;
				log.push(`${horse.name} handles the bad ground easily.`);
			},
		},
		{
			id: "sunlit_stride",
			name: "Sunlit Stride",
			description: "Shines on a clear track.",
			condition(horse, race) {
				return race.condition === "clear";
			},
			effect(horse, race, log) {
				horse.boost += 2.2;
				horse.progress += 2;
				log.push(`${horse.name} picks up speed on the clear track.`);
			},
		},
		{
			id: "fearless_chase",
			name: "Fearless Chase",
			description: "Closes the gap when behind.",
			condition(horse, race) {
				return HR.rankOf(race, horse.id) >= Math.ceil(race.horses.length / 2);
			},
			effect(horse, race, log) {
				horse.boost += 2.8;
				log.push(`${horse.name} refuses to be left behind and starts chasing hard.`);
			},
		},
		{
			id: "leader_pride",
			name: "Leader's Pride",
			description: "Runs harder when already in first place.",
			condition(horse, race) {
				return HR.rankOf(race, horse.id) === 1;
			},
			effect(horse, race, log) {
				horse.boost += 1.5;
				horse.stamina += 6;
				log.push(`${horse.name} feels the others closing in and pushes harder.`);
			},
		},
		{
			id: "tempo_breaker",
			name: "Tempo Breaker",
			description: "Breaks another runner's rhythm.",
			condition(horse, race) {
				return race.horses.length > 1 && horse.progress > 20 && horse.progress < 85;
			},
			effect(horse, race, log) {
				const target = HR.nearestRival(race, horse.id);
				if (target) {
					target.boost -= 1.4;
					target.stamina -= 5;
					log.push(`${horse.name} shifts tempo and disrupts ${target.name}'s rhythm.`);
				}
			},
		},
		{
			id: "track_reader",
			name: "Track Reader",
			description: "Chooses the best route through difficult tracks.",
			condition() {
				return true;
			},
			effect(horse, race, log) {
				horse.progress += race.trackId === "cross" ? 4 : 2;
				horse.focus += 6;
				log.push(`${horse.name} reads the track and chooses a better line.`);
			},
		},
		{
			id: "second_wind",
			name: "Second Wind",
			description: "Recovers from exhaustion.",
			condition(horse) {
				return horse.stamina < 45 && horse.progress > 35;
			},
			effect(horse, race, log) {
				horse.stamina += 24;
				horse.boost += 1;
				log.push(`${horse.name} finds a second wind when it should be fading.`);
			},
		},
		{
			id: "final_burst",
			name: "Final Burst",
			description: "Speeds up when the horse is close to the finish.",
			condition(horse) {
				return horse.progress >= 65;
			},
			effect(horse, race, log) {
				horse.boost += 4.2;
				log.push(`${horse.name} saves its strength, then bursts forward near the finish.`);
			},
		},
		{
			id: "last_fang",
			name: "Final Push",
			description: "Speeds up near the end when the horse is not in first place.",
			condition(horse, race) {
				return horse.progress >= 78 && HR.rankOf(race, horse.id) > 1;
			},
			effect(horse, race, log) {
				horse.progress += 6;
				horse.boost += 2;
				log.push(`${horse.name} makes a final push for the finish line.`);
			},
		},
	];

	HR.horseNames = [
		"Velvet Comet",
		"Green Bullet",
		"Old Crown",
		"Silver Orchard",
		"Saltwind",
		"Midnight Loan",
		"Card Shark",
		"Foxglove",
		"Bright Rumour",
		"Rain Partner",
		"Lucky Riot",
		"Amber Needle",
		"Glass Herald",
		"Cinder Waltz",
		"North Chapel",
		"Paper Moon",
		"Blue Rascal",
		"Hidden Parish",
		"Cherry Debt",
		"Quiet Siren",
		"Red Lantern",
		"Ashen Clover",
		"Copper Saint",
		"Dawn Treaty",
		"Moss Chapel",
	];

	HR.fallbackConditions = ["turf", "dirt", "wet", "muddy"];

	HR.normaliseWeatherName = function (raw) {
		const types =
			typeof setup !== "undefined" && setup.WeatherGeneration && Array.isArray(setup.WeatherGeneration.weatherTypes)
				? setup.WeatherGeneration.weatherTypes
				: [];

		if (raw && typeof raw === "object") {
			for (const key of ["name", "type", "weather", "current", "condition"]) {
				const found = HR.normaliseWeatherName(raw[key]);
				if (found) return found;
			}
			return "";
		}

		if (Number.isFinite(raw)) {
			const byValue = types.find(type => type && type.value === raw);
			return byValue ? byValue.name : "";
		}

		if (typeof raw !== "string") return "";

		const cleaned = raw.trim();
		if (!cleaned) return "";

		const direct = types.find(type => type && type.name === cleaned);
		if (direct) return direct.name;

		const lower = cleaned.toLowerCase();

		if (lower.includes("thunder")) return "thunderstorm";
		if (lower.includes("storm")) return "storm";
		if (lower.includes("heavy") && (lower.includes("rain") || lower.includes("snow") || lower.includes("precip"))) return "heavyPrecipitation";
		if (lower.includes("light") && (lower.includes("rain") || lower.includes("snow") || lower.includes("precip"))) return "lightPrecipitation";
		if (lower.includes("rain") || lower.includes("snow") || lower.includes("precip")) return "lightPrecipitation";
		if (lower.includes("heavy") && lower.includes("cloud")) return "heavyClouds";
		if (lower.includes("cloud")) return "lightClouds";
		if (lower.includes("clear") || lower.includes("sun")) return "clear";

		return cleaned;
	};

	HR.getCurrentWeatherName = function () {
		const V = typeof State !== "undefined" && State.variables ? State.variables : {};
		const candidates = [];

		try {
			if (typeof Weather !== "undefined") {
				candidates.push(Weather.current, Weather.name, Weather.type, Weather.weather, Weather.condition, Weather.currentWeather);
			}
		} catch (e) {
			/* Weather object may not exist on older builds. */
		}

		candidates.push(V.weather, V.weatherType, V.currentWeather, V.weather_current);

		for (const candidate of candidates) {
			const found = HR.normaliseWeatherName(candidate);
			if (found) return found;
		}

		return "";
	};

	HR.getRaceGoing = function () {
		const weatherName = HR.getCurrentWeatherName();

		switch (weatherName) {
			case "clear":
				return {
					weatherName,
					condition: "clear",
					label: "clear",
					description: "The track is dry; the horses can run at full speed.",
				};

			case "lightClouds":
				return {
					weatherName,
					condition: "clear",
					label: "good",
					description: "The weather is mild, but the track is still easy to run on.",
				};

			case "heavyClouds":
				return {
					weatherName,
					condition: "clear",
					label: "cloudy",
					description: "The sky is overcast, but the ground is still good.",
				};

			case "lightPrecipitation":
				return {
					weatherName,
					condition: "wet",
					label: "wet",
					description: "Light rain has made the track slippery.",
				};

			case "heavyPrecipitation":
				return {
					weatherName,
					condition: "wet",
					label: "soft",
					description: "Heavy rain has soaked the track, making it harder to run on.",
				};

			case "storm":
				return {
					weatherName,
					condition: "muddy",
					label: "muddy",
					description: "The storm has turned parts of the track to mud.",
				};

			case "thunderstorm":
				return {
					weatherName,
					condition: "muddy",
					label: "heavy",
					description: "Thunder and heavy rain make the track difficult.",
				};

			default: {
				const fallback = HR.fallbackConditions[HR.randInt(0, HR.fallbackConditions.length - 1)];
				return {
					weatherName: "",
					condition: fallback,
					label: fallback,
					description: "",
				};
			}
		}
	};

	HR.clamp = function (value, min, max) {
		return Math.max(min, Math.min(max, value));
	};

	HR.randFloat = function (min, max) {
		return min + Math.random() * (max - min);
	};

	HR.randInt = function (min, max) {
		if (typeof random === "function") return random(min, max);
		return Math.floor(Math.random() * (max - min + 1)) + min;
	};

	HR.shuffle = function (source) {
		const array = source.slice();
		for (let i = array.length - 1; i > 0; i--) {
			const j = HR.randInt(0, i);
			const tmp = array[i];
			array[i] = array[j];
			array[j] = tmp;
		}
		return array;
	};

	HR.roundMoney = function (amount) {
		if (setup.hbsc && typeof setup.hbsc.roundMoney === "function") {
			return setup.hbsc.roundMoney(amount);
		}
		if (!Number.isFinite(amount)) return 0;
		return Math.max(0, Math.round(amount));
	};

	HR.toInternalMoney = function (amount) {
		if (setup.hbsc && typeof setup.hbsc.toInternalMoney === "function") {
			return setup.hbsc.toInternalMoney(amount);
		}
		if (!Number.isFinite(amount)) return 0;
		return HR.roundMoney(amount * 100);
	};

	HR.toWholeMoney = function (amount) {
		if (setup.hbsc && typeof setup.hbsc.toWholePounds === "function") {
			return setup.hbsc.toWholePounds(amount);
		}
		return Math.floor(HR.roundMoney(amount) / 100);
	};

	HR.formatMoney = function (amount) {
		return "£" + HR.toWholeMoney(amount).toLocaleString("en-GB");
	};

	HR.parseMoneyInput = function (value) {
		if (setup.hbsc && typeof setup.hbsc.parseMoneyInput === "function") {
			return setup.hbsc.parseMoneyInput(value);
		}
		if (Number.isFinite(value)) return HR.toInternalMoney(value);
		if (typeof value !== "string") return 0;
		const cleaned = value.replace(/[£,\s]/g, "").trim();
		if (!cleaned || !/^\d+$/.test(cleaned)) return 0;
		return HR.toInternalMoney(Number(cleaned));
	};

	HR.escapeHtml = function (value) {
		if (setup.hbsc && typeof setup.hbsc.escapeHtml === "function") {
			return setup.hbsc.escapeHtml(value);
		}
		return String(value == null ? "" : value)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");
	};

	HR.escapeJsArg = function (value) {
		return HR.escapeHtml(JSON.stringify(String(value == null ? "" : value)));
	};

	HR.playPassage = function (passage) {
		const target = String(passage == null ? "" : passage);
		if (!target) return false;

		/* Compatibility helper only.  
		Do not call HR.playPassage from inside HR.playPassage, or SugarCube will recurse until the call stack dies. */
		if (typeof window !== "undefined") {
			if (window.SugarCube && window.SugarCube.Engine && typeof window.SugarCube.Engine.play === "function") {
				window.SugarCube.Engine.play(target);
				return false;
			}
			if (window.Engine && typeof window.Engine.play === "function") {
				window.Engine.play(target);
				return false;
			}
		}
		if (typeof SugarCube !== "undefined" && SugarCube && SugarCube.Engine && typeof SugarCube.Engine.play === "function") {
			SugarCube.Engine.play(target);
			return false;
		}
		if (typeof Engine !== "undefined" && Engine && typeof Engine.play === "function") {
			Engine.play(target);
			return false;
		}

		if (State.variables.debug === 1) {
			console.error(`Cannot open passage: ${target}`);
		}
		return false;
	};

	HR.refreshGameSidebar = function () {
		try {
			if (typeof UIBar !== "undefined" && UIBar && typeof UIBar.update === "function") {
				UIBar.update();
				return;
			}
			if (typeof window !== "undefined" && window.SugarCube && window.SugarCube.UIBar && typeof window.SugarCube.UIBar.update === "function") {
				window.SugarCube.UIBar.update();
			}
		} catch (e) {
			if (State && State.variables && State.variables.debug === 1) {
				console.warn("Horse race could not refresh the sidebar.", e);
			}
		}
	};

	HR.passRaceTime = function (minutes) {
		const amount = Math.max(0, Math.floor(Number(minutes) || 0));
		if (amount <= 0) return;

		try {
			const wiki = `<<pass ${amount}>>`;
			if (typeof Wikifier !== "undefined" && typeof Wikifier.wikifyEval === "function") {
				Wikifier.wikifyEval(wiki);
			} else if (typeof window !== "undefined" && typeof window.Wikifier?.wikifyEval === "function") {
				window.Wikifier.wikifyEval(wiki);
			}
			HR.refreshGameSidebar();
		} catch (e) {
			if (State && State.variables && State.variables.debug === 1) {
				console.warn("Horse race could not run <<pass>>.", e);
			}
		}
	};

	/* Single source of truth for every weekly counter.
	They live on DoL's $weekly object, so the game's normal weekly cleanup resets them for us and nothing accumulates in the permanent save. */
	HR.weeklyState = function () {
		const V = State.variables;
		if (V.weekly == null || typeof V.weekly !== "object") V.weekly = {};
		const w = V.weekly;
		if (!Number.isFinite(w.horseRaceWeeklyBets)) w.horseRaceWeeklyBets = 0;
		if (!Number.isFinite(w.horseRaceWeeklyAccidents)) w.horseRaceWeeklyAccidents = 0;
		if (!Number.isFinite(w.horseRaceIncidentLossStreak)) w.horseRaceIncidentLossStreak = 0;
		if (!Array.isArray(w.horseRaceInjuredHorses)) w.horseRaceInjuredHorses = [];
		if (!Number.isFinite(w.horseRaceWeeklyWins)) w.horseRaceWeeklyWins = 0;
		if (typeof w.horseRaceStaffBribed !== "boolean") w.horseRaceStaffBribed = false;
		if ("horseRaceWeeklyWinnings" in w) delete w.horseRaceWeeklyWinnings;
		return w;
	};

	/* The bookies only tolerate so many winning weeks from one face.
	Once the player hits the cap the racecourse fills up and no more slips are sold until the week rolls over.
	Having a rider or handler in your pocket (a landed cash or sex bribe) buys you two extra wins before that. */
	HR.WEEKLY_WIN_CAP = 5;
	HR.WEEKLY_WIN_CAP_BRIBED = 7;

	HR.weeklyWinCap = function () {
		return HR.weeklyState().horseRaceStaffBribed ? HR.WEEKLY_WIN_CAP_BRIBED : HR.WEEKLY_WIN_CAP;
	};

	HR.weeklyWins = function () {
		return HR.weeklyState().horseRaceWeeklyWins;
	};

	HR.atWeeklyWinCap = function () {
		return HR.weeklyWins() >= HR.weeklyWinCap();
	};

	HR.addWeeklyBet = function (amountInternal) {
		if (!Number.isFinite(amountInternal)) return;
		HR.weeklyState().horseRaceWeeklyBets += amountInternal;
	};

	HR.availableHorseNames = function () {
		const injuredNames = new Set(HR.weeklyState().horseRaceInjuredHorses);
		return HR.horseNames.filter(name => !injuredNames.has(name));
	};

	HR.recordLoss = function () {
		const V = State.variables;
		const race = HR.ensureState();
		if (race.lossRecorded) return;
		race.lossRecorded = true;
		if (V.daily == null || typeof V.daily !== "object") V.daily = {};
		if (!Number.isFinite(V.daily.horseRaceLosses)) V.daily.horseRaceLosses = 0;
		V.daily.horseRaceLosses += 1;
		if (V.daily.horseRaceLosses > 3) {
			race.lossTraumaPending = true;
		} else {
			race.lossStressPending = true;
		}
	};

	HR.ensureState = function () {
		const V = State.variables;
		if (V.horserace == null || typeof V.horserace !== "object") V.horserace = {};

		const race = V.horserace;
		if (typeof race.phase !== "string") race.phase = "idle";
		if (!Number.isFinite(race.round)) race.round = 0;
		if (!Number.isFinite(race.betAmount)) race.betAmount = 0;
		if (!Number.isFinite(race.payout)) race.payout = 0;
		if (!Array.isArray(race.horses)) race.horses = [];
		if (!Array.isArray(race.messages)) race.messages = [];
		if (!Array.isArray(race.messageHistory)) race.messageHistory = [];
		if (!Array.isArray(race.ranking)) race.ranking = [];
		if (typeof race.betInput !== "string") race.betInput = "";
		if (typeof race.selectedHorseId !== "string") race.selectedHorseId = "";
		if (typeof race.betHorseId !== "string") race.betHorseId = "";
		if (typeof race.winnerId !== "string") race.winnerId = "";
		if (typeof race.lastError !== "string") race.lastError = "";
		if (typeof race.trackId !== "string" || !HR.trackDefs[race.trackId]) race.trackId = "oval";
		if (typeof race.condition !== "string") race.condition = "clear";
		if (typeof race.paidOut !== "boolean") race.paidOut = false;
		if (typeof race.trial !== "boolean") race.trial = false;
		if (typeof race.autoWatch !== "boolean") race.autoWatch = false;
		if (typeof race.lossStressPending !== "boolean") race.lossStressPending = false;
		if (typeof race.lossTraumaPending !== "boolean") race.lossTraumaPending = false;
		if (typeof race.lossRecorded !== "boolean") race.lossRecorded = false;

		/* Weekly counters used to live here; they now live on $weekly and reset
		   with DoL's weekly cleanup. Shed the old fields from existing saves. */
		if ("weeklyWinnings" in race) delete race.weeklyWinnings;
		if ("weeklyAccidents" in race) delete race.weeklyAccidents;
		if ("weekAnchorDay" in race) delete race.weekAnchorDay;
		if ("inputNonce" in race) delete race.inputNonce;

		/* Per-race "fixed" accident fields (reset by createRace). */
		if (typeof race.accident !== "boolean") race.accident = false;
		if (!Number.isFinite(race.accidentAtRound)) race.accidentAtRound = 0;
		if (typeof race.accidentRefund !== "boolean") race.accidentRefund = false;
		if (typeof race.incidentHorseId !== "string") race.incidentHorseId = "";

		/* Per-race stable rigging fields (reset by createRace). */
		if (!Number.isFinite(race.suspicion)) race.suspicion = 0;
		if (!Number.isFinite(race.rigSuccesses)) race.rigSuccesses = 0;
		if (!Number.isFinite(race.rigFailures)) race.rigFailures = 0;
		if (typeof race.rigEntered !== "boolean") race.rigEntered = false;
		if (typeof race.rigSuccessPassage !== "string") race.rigSuccessPassage = "";
		if (typeof race.rigCaughtPassage !== "string") race.rigCaughtPassage = "";
		if (!Array.isArray(race.riggedActions)) race.riggedActions = [];
		if (typeof race.rigActionId !== "string") race.rigActionId = "";
		if (typeof race.rigTargetId !== "string") race.rigTargetId = "";
		if (typeof race.riggedCancelled !== "boolean") race.riggedCancelled = false;

		for (const horse of race.horses) {
			if (!horse || typeof horse !== "object") continue;
			if (typeof horse.accident !== "boolean") horse.accident = false;
			if (!Number.isFinite(horse.progress)) horse.progress = 0;
			if (!Number.isFinite(horse.stamina)) horse.stamina = 80;
			if (!Number.isFinite(horse.boost)) horse.boost = 0;
			if (!Number.isFinite(horse.focus)) horse.focus = 70;
			if (!Number.isFinite(horse.skillCooldown)) horse.skillCooldown = 0;
			if (!Array.isArray(horse.skills)) horse.skills = [];
			if (!Array.isArray(horse.skillHistory)) horse.skillHistory = [];
			if (!Number.isFinite(horse.lastSkillRound)) horse.lastSkillRound = -99;
		}

		return race;
	};

	HR.getSkill = function (id) {
		return HR.skillPool.find(skill => skill.id === id) || null;
	};

	HR.getHorse = function (horseId) {
		const race = HR.ensureState();
		return race.horses.find(horse => horse && horse.id === horseId) || null;
	};

	HR.randomSkills = function (count) {
		return HR.shuffle(HR.skillPool.map(skill => skill.id)).slice(0, count);
	};

	HR.createHorse = function (name, index) {
		const baseSpeed = HR.randInt(68, 94);
		const stamina = HR.randInt(68, 100);
		const focus = HR.randInt(55, 96);
		const kick = HR.randFloat(0.2, 1.8);

		return {
			id: `horse-${index + 1}`,
			name,
			lane: index + 1,
			baseSpeed,
			stamina,
			maxStamina: stamina,
			focus,
			finishKick: kick,
			progress: 0,
			accident: false,
			boost: 0,
			skillCooldown: HR.randInt(0, 2),
			lastSkillRound: -99,
			skills: HR.randomSkills(3),
			skillHistory: [],
			odds: 2.0,
			formScore: baseSpeed * 0.52 + stamina * 0.3 + focus * 0.14 + kick * 5,
		};
	};

	HR.createRace = function (force) {
		const race = HR.ensureState();
		if (!force && race.phase !== "idle" && race.phase !== "finished" && race.phase !== "closed") return race;

		const namePool = HR.availableHorseNames();
		if (namePool.length < 3) {
			race.id = `hr-closed-${Date.now()}-${HR.randInt(1000, 9999)}`;
			race.phase = "closed";
			race.round = 0;
			race.horses = [];
			race.messages = [];
			race.messageHistory = [];
			race.ranking = [];
			race.selectedHorseId = "";
			race.betHorseId = "";
			race.betAmount = 0;
			race.betInput = "";
			race.payout = 0;
			race.winnerId = "";
			race.won = false;
			race.paidOut = false;
			race.trial = false;
			race.autoWatch = false;
			race.lastError = "The horses are not in good enough shape to run today.";
			race.accident = false;
			race.accidentAtRound = 0;
			race.accidentRefund = false;
			race.incidentHorseId = "";
			race.lossStressPending = false;
			race.lossTraumaPending = false;
			race.lossRecorded = false;
			race.suspicion = 0;
			race.riggedActions = [];
			race.rigActionId = "";
			race.rigTargetId = "";
			race.riggedCancelled = false;
			race.rigGame = {};
			race.rigSuccesses = 0;
			race.rigFailures = 0;
			race.rigEntered = false;
			race.rigSuccessPassage = "";
			race.rigCaughtPassage = "";
			return race;
		}

		const minCount = Math.min(3, namePool.length);
		const maxCount = Math.min(5, namePool.length);
		const count = HR.randInt(minCount, maxCount);
		const names = HR.shuffle(namePool).slice(0, count);
		const horses = names.map((name, index) => HR.createHorse(name, index));
		const bestScore = Math.max.apply(
			null,
			horses.map(horse => horse.formScore)
		);

		for (const horse of horses) {
			const weakness = Math.max(0, bestScore - horse.formScore);
			horse.odds = Number(HR.clamp(1.35 + weakness / 18 + HR.randFloat(0, 0.45), 1.35, 5.75).toFixed(2));
		}

		race.id = `hr-${Date.now()}-${HR.randInt(1000, 9999)}`;
		race.phase = "betting";
		race.trackId = HR.randInt(1, 2) === 1 ? "oval" : "cross";
		const going = HR.getRaceGoing();
		race.weatherName = going.weatherName;
		race.condition = going.condition;
		race.goingLabel = going.label;
		race.goingDescription = going.description;
		race.round = 0;
		race.horses = horses;
		race.messages = [];
		race.messageHistory = [];
		race.ranking = [];
		race.selectedHorseId = "";
		race.betHorseId = "";
		race.betAmount = 0;
		race.betInput = "";
		race.payout = 0;
		race.winnerId = "";
		race.won = false;
		race.paidOut = false;
		race.trial = false;
		race.autoWatch = false;
		race.lastError = "";
		race.accident = false;
		race.accidentAtRound = 0;
		race.accidentRefund = false;
		race.incidentHorseId = "";
		race.lossStressPending = false;
		race.lossTraumaPending = false;
		race.lossRecorded = false;
		race.suspicion = 0;
		race.riggedActions = [];
		race.rigActionId = "";
		race.rigTargetId = "";
		race.riggedCancelled = false;
		race.rigGame = {};
		race.rigSuccesses = 0;
		race.rigFailures = 0;
		race.rigEntered = false;
		race.rigSuccessPassage = "";
		race.rigCaughtPassage = "";

		return race;
	};

	/* Sheds the heavy per-race data (horse list, logs, ranking) from the save once a race is over and the player walks away, so finished races do not sit in every save slot.
	   Weekly counters are untouched. */
	HR.clearRaceData = function () {
		const race = HR.ensureState();
		if (race.phase !== "finished" && race.phase !== "idle" && race.phase !== "closed") return race;
		race.horses = [];
		race.messages = [];
		race.messageHistory = [];
		race.ranking = [];
		race.selectedHorseId = "";
		race.betHorseId = "";
		race.winnerId = "";
		race.incidentHorseId = "";
		race.betInput = "";
		race.betAmount = 0;
		race.payout = 0;
		race.accident = false;
		race.accidentAtRound = 0;
		race.accidentRefund = false;
		race.lossStressPending = false;
		race.lossTraumaPending = false;
		race.lossRecorded = false;
		race.suspicion = 0;
		race.riggedActions = [];
		race.rigActionId = "";
		race.rigTargetId = "";
		race.riggedCancelled = false;
		race.rigGame = {};
		race.rigSuccesses = 0;
		race.rigFailures = 0;
		race.rigEntered = false;
		race.rigSuccessPassage = "";
		race.rigCaughtPassage = "";
		race.phase = "idle";
		return race;
	};

	HR.startTrialRace = function () {
		const race = HR.createRace(true);
		if (race.phase === "closed") return race;
		race.phase = "running";
		race.trial = true;
		race.selectedHorseId = "";
		race.betHorseId = "";
		race.betAmount = 0;
		race.betInput = "";
		race.payout = 0;
		race.paidOut = true;
		race.autoWatch = false;
		race.messages = ["Alex waits beside the rail with you while the handlers settle the horses at the gate."];
		race.messageHistory = race.messages.slice();
		return race;
	};

	HR.placeBet = function (horseId, rawAmount) {
		const V = State.variables;
		const race = HR.ensureState();
		race.lastError = "";
		race.betInput = typeof rawAmount === "string" ? rawAmount : String(rawAmount == null ? "" : rawAmount);

		if (race.phase !== "betting") {
			race.lastError = "The bookie has already closed betting for this race.";
			return { ok: false, reason: "closed" };
		}

		if (HR.atWeeklyWinCap()) {
			race.lastError = "You cannot get near a bookie through this crowd.";
			return { ok: false, reason: "crowded" };
		}

		const horse = HR.getHorse(horseId);
		if (!horse) {
			race.lastError = "Choose a horse before placing your bet.";
			return { ok: false, reason: "noHorse" };
		}

		const amount = HR.parseMoneyInput(rawAmount);
		if (!(amount > 0)) {
			race.lastError = "Enter a valid bet amount.";
			return { ok: false, reason: "invalidAmount" };
		}
		if (!Number.isFinite(V.money) || V.money < amount) {
			race.lastError = `You do not have ${HR.formatMoney(amount)} to bet.`;
			return { ok: false, reason: "insufficientMoney" };
		}

		const suspicion = HR.clamp(race.suspicion || 0, 0, 100);
		if (suspicion > 0 && HR.randInt(1, 100) <= HR.clamp(suspicion, 0, HR.SUSPICION_CANCEL_CAP)) {
			/* Shut the whole meeting down for the rest of the day.
			Without this the player just walks back to the course, createRace builds a fresh field, and being caught costs them nothing at all. */
			if (V.daily == null || typeof V.daily !== "object") V.daily = {};
			V.daily.horseRaceCancelled = true;
			race.phase = "closed";
			race.riggedCancelled = true;
			race.horses = [];
			race.selectedHorseId = "";
			race.betHorseId = "";
			race.betAmount = 0;
			race.betInput = "";
			race.lastError = "The stewards pull the race after noticing irregular betting patterns.";
			return { ok: false, reason: "cancelled" };
		}

		const weekly = HR.weeklyState();
		const injuryRoll = HR.randInt(1, 100) <= HR.effectiveInjuryChance();

		V.money = HR.roundMoney(V.money - amount);
		HR.addWeeklyBet(amount);
		race.betHorseId = horse.id;
		race.selectedHorseId = horse.id;
		race.betAmount = amount;
		race.phase = "running";
		race.autoWatch = false;
		race.messages = [`You back ${horse.name} for ${HR.formatMoney(amount)} at ${horse.odds.toFixed(2)}x odds.`];

		if (injuryRoll) {
			race.accident = true;
			race.accidentAtRound = HR.randInt(18, 24);
			race.accidentRefund = false;
			weekly.horseRaceWeeklyAccidents += 1;
		} else {
			race.accident = false;
			race.accidentAtRound = 0;
			race.accidentRefund = false;
		}

		race.messageHistory = race.messages.slice();
		return { ok: true, accident: race.accident };
	};

	HR.rankedHorses = function (race) {
		return race.horses.slice().sort(function (a, b) {
			const aAccident = a && a.accident === true;
			const bAccident = b && b.accident === true;
			if (aAccident !== bAccident) return aAccident ? 1 : -1;
			if (b.progress !== a.progress) return b.progress - a.progress;
			return b.formScore - a.formScore;
		});
	};

	HR.rankOf = function (race, horseId) {
		const ranked = HR.rankedHorses(race);
		const index = ranked.findIndex(horse => horse.id === horseId);
		return index < 0 ? ranked.length : index + 1;
	};

	HR.distanceToNextHorse = function (race, horseId) {
		const ranked = HR.rankedHorses(race);
		const index = ranked.findIndex(horse => horse.id === horseId);
		if (index <= 0) return Infinity;
		return Math.abs(ranked[index - 1].progress - ranked[index].progress);
	};

	HR.nearestRival = function (race, horseId) {
		const horse = race.horses.find(candidate => candidate.id === horseId);
		if (!horse) return null;
		let best = null;
		let bestDistance = Infinity;
		for (const rival of race.horses) {
			if (!rival || rival.id === horseId) continue;
			const distance = Math.abs(rival.progress - horse.progress);
			if (distance < bestDistance) {
				best = rival;
				bestDistance = distance;
			}
		}
		return best;
	};

	HR.trySkill = function (horse, race, log) {
		if (horse.skillCooldown > 0) {
			horse.skillCooldown -= 1;
			return;
		}

		const baseChance = 0.13 + horse.focus / 900 + (horse.progress >= 70 ? 0.05 : 0);
		if (Math.random() > HR.clamp(baseChance, 0.12, 0.31)) return;

		const candidates = horse.skills.map(skillId => HR.getSkill(skillId)).filter(skill => skill && skill.condition(horse, race));

		if (candidates.length === 0) return;

		const skill = candidates[HR.randInt(0, candidates.length - 1)];
		const before = log.length;
		skill.effect(horse, race, log);
		for (let i = before; i < log.length; i++) {
			log[i] = {
				type: "skill",
				horseId: horse.id,
				horseName: horse.name,
				skillName: skill.name,
				round: race.round,
				text: String(log[i] == null ? "" : log[i]),
			};
		}
		horse.lastSkillRound = race.round;
		horse.skillHistory.push({ round: race.round, name: skill.name });
		if (horse.skillHistory.length > 6) horse.skillHistory.shift();
		horse.skillCooldown = HR.randInt(2, 4);
	};

	HR.step = function (watching) {
		const V = State.variables;
		const race = HR.ensureState();
		if (race.phase === "betting") race.phase = "running";
		if (race.phase !== "running") return race;

		HR.passRaceTime(2);
		race.round += 1;
		const stepMessages = [];

		if (watching) {
			for (const horse of race.horses) {
				if (horse.accident === true) continue;
				HR.trySkill(horse, race, stepMessages);
			}
		}

		for (const horse of race.horses) {
			if (horse.accident === true) continue;

			const staminaPressure = (horse.stamina - 50) / 55;
			const wetPenalty = race.condition === "wet" ? -0.15 : race.condition === "muddy" ? -0.35 : 0;
			const trackChaos = race.trackId === "cross" ? HR.randFloat(-0.35, 0.45) : HR.randFloat(-0.2, 0.25);
			const finalKick = horse.progress >= 75 ? horse.finishKick : 0;
			const gamblingLuck = V.statFreeze ? 1 : 1 + (V.daily?.moorGamblingLuck ? 0.4 : 0) + (V.foodstuff?.four_leaf_clover?.amount >= 1 ? 0.07 : 0);
			const pace =
				(horse.baseSpeed / 21 + staminaPressure + horse.boost + finalKick + wetPenalty + trackChaos + HR.randFloat(-0.85, 1.05)) *
				(horse.id === race.betHorseId ? gamblingLuck : 1);

			horse.progress = HR.clamp(horse.progress + Math.max(0.8, pace), 0, 100);
			horse.stamina = HR.clamp(horse.stamina - HR.randFloat(1.8, 4.1), 0, horse.maxStamina + 35);
			horse.boost *= 0.52;
		}

		if (race.accident) {
			const incidentHorse = HR.getHorse(race.betHorseId);
			if (incidentHorse && incidentHorse.accident !== true && (incidentHorse.progress >= 82 || race.round >= race.accidentAtRound)) {
				HR.triggerAccident();
			}
		}

		if (stepMessages.length === 0) {
			const leader = HR.rankedHorses(race)[0];
			stepMessages.push(`${leader.name} keeps ahead of the others.`);
		}

		race.messages = stepMessages;
		race.messageHistory = Array.isArray(race.messageHistory) ? race.messageHistory : [];
		for (let i = stepMessages.length - 1; i >= 0; i--) {
			race.messageHistory.unshift(stepMessages[i]);
		}
		race.messageHistory = race.messageHistory.slice(0, 3);

		if (race.horses.some(horse => horse.progress >= 100) || race.round >= 28) {
			HR.finishRace();
		}

		return race;
	};

	HR.triggerAccident = function () {
		const V = State.variables;
		const race = HR.ensureState();
		const horse = HR.getHorse(race.betHorseId);

		if (!horse) {
			race.accident = false;
			return race;
		}

		const refunded = race.accidentRefund;
		const weekly = HR.weeklyState();

		/* Only the backed horse is pulled up. The race continues for everyone else. */
		race.accident = false;
		race.incidentHorseId = horse.id;
		horse.accident = true;
		horse.boost = 0;
		horse.stamina = 0;

		if (!weekly.horseRaceInjuredHorses.includes(horse.name)) {
			weekly.horseRaceInjuredHorses.push(horse.name);
		}

		if (!race.paidOut) {
			if (refunded && race.betAmount > 0) {
				V.money = HR.roundMoney((Number.isFinite(V.money) ? V.money : 0) + race.betAmount);
			} else {
				weekly.horseRaceIncidentLossStreak += 1;
				HR.recordLoss();
			}
			/* This bet is already resolved. finishRace must not pay or charge it again. */
			race.paidOut = true;
		}

		const accidentText = refunded
			? `${horse.name} suddenly shortens its stride near the final stretch and is pulled up by the rider. The other horses thunder on while the medics hurry onto the track. The bookie sighs and returns your stake.`
			: `${horse.name} falters near the final stretch and is pulled out of the race. The other horses keep running while the medics hurry onto the track, and the bookie keeps your stake.`;

		const accidentMessage = {
			type: "accident",
			horseId: horse.id,
			text: accidentText,
		};

		race.messages = [accidentMessage];
		race.messageHistory = [accidentMessage].concat(Array.isArray(race.messageHistory) ? race.messageHistory : []).slice(0, 3);
		return race;
	};
	HR.simulateToEnd = function (watching) {
		const race = HR.ensureState();
		let guard = 0;
		while (race.phase === "running" && guard < 40) {
			HR.step(Boolean(watching));
			guard += 1;
		}
		return race;
	};

	HR.cancelAutoWatch = function () {
		if (HR._autoWatchTimer) {
			clearTimeout(HR._autoWatchTimer);
			HR._autoWatchTimer = null;
		}
	};

	HR.updateLiveTrack = function () {
		if (typeof document === "undefined") return;
		const race = HR.ensureState();
		const root = document.querySelector(".horse-race-live");
		if (!root) return;

		const caption = root.querySelector(".horse-race-caption");
		const track = HR.trackDefs[race.trackId] || HR.trackDefs.oval;
		root.classList.toggle("horse-race-accident-active", race.accident === true || Boolean(race.incidentHorseId));
		if (caption) {
			caption.innerHTML = `<strong>${HR.escapeHtml(track.name)}</strong>`;
		}

		const markers = Array.from(root.querySelectorAll(".horse-race-marker"));
		markers.forEach(function (marker, index) {
			const horse = race.horses[index];
			if (!horse) return;
			marker.setAttribute("data-progress", horse.progress.toFixed(2));
			marker.classList.toggle("horse-race-skill-active", Number.isFinite(horse.lastSkillRound) && race.round - horse.lastSkillRound <= 2);
			marker.classList.toggle("horse-race-incident-horse", horse.accident === true || horse.id === race.incidentHorseId);
			const title = marker.querySelector("title");
			if (title) title.textContent = `${horse.name}: ${Math.floor(horse.progress)}%`;
		});

		const progressRows = Array.from(root.querySelectorAll(".horse-race-progress"));
		progressRows.forEach(function (row, index) {
			const horse = race.horses[index];
			if (!horse) return;
			const meter = row.querySelector("meter");
			const text = row.querySelector("[data-progress-text]");
			if (meter) meter.value = horse.progress.toFixed(2);
			if (text) text.textContent = `${Math.floor(horse.progress)}%`;
			row.classList.toggle("horse-race-backed", horse.id === race.betHorseId);
			row.classList.toggle("horse-race-skill-active", Number.isFinite(horse.lastSkillRound) && race.round - horse.lastSkillRound <= 2);
			row.classList.toggle("horse-race-incident-horse", horse.accident === true || horse.id === race.incidentHorseId);
		});

		HR.placeMarkers();
	};

	HR.updateLiveLog = function () {
		if (typeof document === "undefined") return;
		const log = document.getElementById("horse-race-log-area");
		if (log) log.outerHTML = HR.renderRaceLog();
	};

	/* resultPassage is intentionally omitted: this function only needs the label.
	   refreshLiveView still passes it positionally, so we accept and ignore it. */
	HR.updateLiveControls = function (_resultPassage, resultLabel) {
		if (typeof document === "undefined") return;
		const race = HR.ensureState();
		const controls = document.getElementById("horse-race-controls");
		const status = document.getElementById("horse-race-watch-status");
		if (!controls) return;

		const resultAnchor = document.querySelector("#horse-race-result-link a");
		if (race.phase === "finished") {
			controls.innerHTML = `<span class="horse-race-finished-note">The race has ended. See the result below.</span>`;
			if (status) status.textContent = "The race is finished.";
			if (resultAnchor) resultAnchor.textContent = resultLabel || "See the result";
			return;
		}
		if (resultAnchor) resultAnchor.textContent = "Skip to the finish";

		const watchButton = controls.querySelector("[data-horse-watch]");
		const pauseButton = controls.querySelector("[data-horse-pause]");
		if (watchButton) watchButton.disabled = race.autoWatch;
		if (pauseButton) pauseButton.disabled = !race.autoWatch;
		if (status) {
			status.textContent = race.autoWatch
				? "The horses are running."
				: race.round > 0
				? "The race is paused."
				: "The horses are lined up. Start watching when you are ready.";
		}
	};

	HR.refreshLiveView = function (resultPassage, resultLabel) {
		HR.updateLiveTrack();
		HR.updateLiveLog();
		HR.updateLiveControls(resultPassage, resultLabel);
	};

	HR.startLiveWatch = function (resultPassage, delay, resultLabel) {
		const race = HR.ensureState();
		if (race.phase === "betting") race.phase = "running";
		if (race.phase !== "running") {
			HR.refreshLiveView(resultPassage, resultLabel);
			return false;
		}

		race.autoWatch = true;
		HR.cancelAutoWatch();
		HR.refreshLiveView(resultPassage, resultLabel);

		const wait = Math.max(600, Number(delay) || HR.DEFAULT_WATCH_DELAY);
		const tick = function () {
			const liveRace = HR.ensureState();
			if (!liveRace.autoWatch || liveRace.phase !== "running") {
				HR.refreshLiveView(resultPassage, resultLabel);
				return;
			}

			HR.step(true);
			const afterStep = HR.ensureState();
			if (afterStep.phase === "finished") {
				afterStep.autoWatch = false;
				HR.cancelAutoWatch();
				HR.refreshLiveView(resultPassage, resultLabel);
				return;
			}

			HR.refreshLiveView(resultPassage, resultLabel);
			HR._autoWatchTimer = setTimeout(tick, wait);
		};

		/* Let the browser apply the current marker positions first, then animate. */
		HR._autoWatchTimer = setTimeout(tick, Math.min(350, wait));
		return false;
	};

	HR.pauseLiveWatch = function (resultPassage, resultLabel) {
		const race = HR.ensureState();
		race.autoWatch = false;
		HR.cancelAutoWatch();
		HR.refreshLiveView(resultPassage, resultLabel);
		return false;
	};

	HR.renderLiveControls = function (resultPassage, resultLabel, watchLabel, pauseLabel, delay) {
		const race = HR.ensureState();
		if (race.phase === "finished") {
			return `<p id="horse-race-watch-status" class="horse-race-watch-status">The race has ended. See the result below.</p>
			<div id="horse-race-controls" class="horse-race-controls"><span class="horse-race-finished-note">Finished.</span></div>`;
		}

		const result = HR.escapeJsArg(resultPassage);
		const label = HR.escapeJsArg(resultLabel || "See the result");
		const wait = Number.isFinite(Number(delay)) ? Number(delay) : HR.DEFAULT_WATCH_DELAY;
		return `<p id="horse-race-watch-status" class="horse-race-watch-status">${
			race.round > 0 ? "The race is paused." : "The horses are lined up. Start watching when you are ready."
		}</p>
		<div id="horse-race-controls" class="horse-race-controls">
			<button type="button" data-horse-watch onclick="return setup.horserace.startLiveWatch(${result}, ${wait}, ${label});"${
			race.autoWatch ? " disabled" : ""
		}>${HR.escapeHtml(watchLabel || "Start watching")}</button>
			<button type="button" data-horse-pause onclick="return setup.horserace.pauseLiveWatch(${result}, ${label});"${
			race.autoWatch ? "" : " disabled"
		}>${HR.escapeHtml(pauseLabel || "Pause watching")}</button>
		</div>`;
	};

	HR.finishRace = function () {
		const V = State.variables;
		const race = HR.ensureState();
		if (race.phase === "finished") return race;

		const ranked = HR.rankedHorses(race);
		race.phase = "finished";
		race.autoWatch = false;
		race.ranking = ranked.map(horse => horse.id);
		race.winnerId = ranked.length > 0 ? ranked[0].id : "";
		race.won = race.betHorseId !== "" && race.betHorseId === race.winnerId;
		race.payout = 0;

		if (!race.paidOut && race.betAmount > 0 && race.betHorseId !== "") {
			const betHorse = HR.getHorse(race.betHorseId);
			if (race.won && betHorse) {
				const margin = Number.isFinite(HR.PAYOUT_MARGIN) ? HR.clamp(HR.PAYOUT_MARGIN, 0, 1) : 1;
				const suspicionMultiplier = HR.suspicionPayoutMultiplier(race.suspicion || 0);
				const basePayout = HR.roundMoney(race.betAmount * betHorse.odds * margin * suspicionMultiplier);
				const baseProfit = Math.max(0, basePayout - race.betAmount);
				const boostedProfit = window.divineTfIncome(baseProfit, "horseRace");
				race.payout = HR.roundMoney(basePayout + boostedProfit - baseProfit);
				V.money = HR.roundMoney((Number.isFinite(V.money) ? V.money : 0) + race.payout);
				HR.weeklyState().horseRaceWeeklyWins += 1;
			} else {
				HR.recordLoss();
			}
			race.paidOut = true;
		}

		const winner = HR.getHorse(race.winnerId);
		if (winner) {
			race.messages = [`${winner.name} crosses the line first.`];
			race.messageHistory = race.messages.concat(Array.isArray(race.messageHistory) ? race.messageHistory : []).slice(0, 3);
		}
		return race;
	};

	HR.renderHorseList = function () {
		const race = HR.ensureState();
		const rows = race.horses
			.map(function (horse) {
				return `<tr>
				<td>${horse.lane}</td>
				<td><strong>${HR.escapeHtml(horse.name)}</strong></td>
				<td>${horse.odds.toFixed(2)}x</td>
				<td>${horse.baseSpeed}</td>
				<td>${horse.maxStamina}</td>
			</tr>`;
			})
			.join("");

		const track = HR.trackDefs[race.trackId];
		return `<div class="horse-race-panel">
			<p><strong>Track:</strong> ${HR.escapeHtml(track.name)}. ${HR.escapeHtml(track.description)}</p>
			<p><strong>Going:</strong> ${HR.escapeHtml(race.goingLabel || race.condition)}. ${HR.escapeHtml(race.goingDescription || "")}</p>
			<table class="horse-race-table">
				<thead><tr><th>Lane</th><th>Horse</th><th>Odds</th><th>Speed</th><th>Stamina</th></tr></thead>
				<tbody>${rows}</tbody>
			</table>
		</div>`;
	};

	HR.renderTrack = function () {
		const race = HR.ensureState();
		const track = HR.trackDefs[race.trackId] || HR.trackDefs.oval;
		const raceId = HR.escapeHtml(race.id || "horse-race");
		const markers = race.horses
			.map(function (horse, index) {
				const label = HR.escapeHtml(String(index + 1));
				const name = HR.escapeHtml(horse.name);
				const incidentClass = horse.accident === true || horse.id === race.incidentHorseId ? " horse-race-incident-horse" : "";
				return `<g class="horse-race-marker${incidentClass}" data-horse-id="${HR.escapeHtml(horse.id)}" data-progress="${horse.progress.toFixed(2)}" data-lane-index="${index}" data-name="${name}">
				<title>${name}: ${Math.floor(horse.progress)}%</title>
				<circle r="15"></circle>
				<text text-anchor="middle" dominant-baseline="central">${label}</text>
			</g>`;
			})
			.join("");

		const progressRows = race.horses
			.map(function (horse) {
				const betClass = horse.id === race.betHorseId ? " horse-race-backed" : "";
				const incidentClass = horse.accident === true || horse.id === race.incidentHorseId ? " horse-race-incident-horse" : "";
				return `<div class="horse-race-progress${betClass}${incidentClass}" data-horse-id="${HR.escapeHtml(horse.id)}">
				<span>${horse.lane}. ${HR.escapeHtml(horse.name)}</span>
				<meter min="0" max="100" value="${horse.progress.toFixed(2)}"></meter>
				<span data-progress-text>${Math.floor(horse.progress)}%</span>
			</div>`;
			})
			.join("");

		const finish = track.finish || {};
		const finishX1 = Number.isFinite(finish.x1) ? finish.x1 : finish.x;
		const finishY1 = finish.y1;
		const finishX2 = Number.isFinite(finish.x2) ? finish.x2 : finish.x;
		const finishY2 = finish.y2;
		const innerPaths = Array.isArray(track.innerPaths) ? track.innerPaths : [];
		const innerEdges = innerPaths.map(path => `<path class="horse-race-track-inner-edge" d="${HR.escapeHtml(path)}"></path>`).join("");
		const innerMain = innerPaths.map(path => `<path class="horse-race-track-inner-main" d="${HR.escapeHtml(path)}"></path>`).join("");
		const innerLines = innerPaths.map(path => `<path class="horse-race-track-inner-line" d="${HR.escapeHtml(path)}"></path>`).join("");

		return `<div id="horse-race-${raceId}" class="horse-race-live" data-race-id="${raceId}">
			<svg class="horse-race-svg" viewBox="${HR.escapeHtml(track.viewBox)}" role="img" aria-label="Horse race track">
				<rect class="horse-race-grass" x="0" y="0" width="1000" height="540"></rect>
				<path class="horse-race-track-edge" d="${HR.escapeHtml(track.path)}"></path>
				${innerEdges}
				<path class="horse-race-track-main" d="${HR.escapeHtml(track.path)}"></path>
				${innerMain}
				<path class="horse-race-track-line" d="${HR.escapeHtml(track.path)}"></path>
				${innerLines}
				<line class="horse-race-finish" x1="${finishX1}" y1="${finishY1}" x2="${finishX2}" y2="${finishY2}"></line>
				<path class="horse-race-hidden-path" d="${HR.escapeHtml(track.path)}"></path>
				${markers}
			</svg>
			<div class="horse-race-caption"><strong>${HR.escapeHtml(track.name)}</strong></div>
			${progressRows}
		</div>`;
	};

	HR.placeMarkers = function (raceId) {
		if (typeof document === "undefined") return;
		let root = null;
		if (raceId) root = document.getElementById(`horse-race-${raceId}`);
		if (!root) root = document.querySelector(".horse-race-live");
		if (!root) return;

		const path = root.querySelector(".horse-race-hidden-path");
		const markers = Array.from(root.querySelectorAll(".horse-race-marker"));
		if (!path || markers.length === 0 || typeof path.getTotalLength !== "function") return;

		const length = path.getTotalLength();
		const laneCentre = (markers.length - 1) / 2;

		markers.forEach(function (marker, index) {
			const progress = HR.clamp(Number(marker.getAttribute("data-progress")) || 0, 0, 100) / 100;
			const laneIndex = Number(marker.getAttribute("data-lane-index"));
			const laneOffset = ((Number.isFinite(laneIndex) ? laneIndex : index) - laneCentre) * 18;
			const at = path.getPointAtLength(Math.min(length, Math.max(0, length * progress)));
			const next = path.getPointAtLength(Math.min(length, Math.max(0, length * progress + 1)));
			const dx = next.x - at.x;
			const dy = next.y - at.y;
			const norm = Math.sqrt(dx * dx + dy * dy) || 1;
			const normalX = -dy / norm;
			const normalY = dx / norm;
			marker.setAttribute("transform", `translate(${at.x + normalX * laneOffset}, ${at.y + normalY * laneOffset})`);
		});
	};

	HR.renderRaceLog = function () {
		const race = HR.ensureState();
		const messages = (
			race.messageHistory.length > 0 ? race.messageHistory : race.messages.length > 0 ? race.messages : ["The crowd waits for the next move."]
		).slice(0, 3);
		const items = messages
			.map(function (message) {
				if (message && typeof message === "object" && message.type === "accident") {
					return `<li class="horse-race-accident-log" style="color:#ff6b6b;"><strong>${HR.escapeHtml(
						message.text || "A horse is pulled up after an incident."
					)}</strong></li>`;
				}
				if (message && typeof message === "object" && message.type === "skill") {
					const round = Number.isFinite(message.round) ? `<span class="horse-race-log-round">Moment ${message.round}</span> ` : "";
					return `<li class="horse-race-skill-log">${round}<span class="horse-race-skill-badge">${HR.escapeHtml(
						message.skillName || "Skill"
					)}</span> <strong>${HR.escapeHtml(message.horseName || "Horse")}</strong>: ${HR.escapeHtml(message.text || "surges forward.")}</li>`;
				}
				return `<li>${HR.escapeHtml(message)}</li>`;
			})
			.join("");
		return `<div id="horse-race-log-area" class="horse-race-log"><strong>Race log</strong><ul>${items}</ul></div>`;
	};

	HR.renderResult = function () {
		const race = HR.ensureState();
		if (race.phase !== "finished") HR.finishRace();

		const incidentHorse = race.incidentHorseId ? HR.getHorse(race.incidentHorseId) : null;

		const ranked = race.ranking.map(horseId => HR.getHorse(horseId)).filter(Boolean);
		const rows = ranked
			.map(function (horse, index) {
				const backed = horse.id === race.betHorseId ? " backed" : "";
				const incident = horse.accident === true || horse.id === race.incidentHorseId;
				const resultText = incident ? `<strong><span style="color:#ff6b6b;">Accident</span></strong>` : `${Math.floor(horse.progress)}%`;

				return `<tr class="${backed}">
				<td>${index + 1}</td>
				<td>${HR.escapeHtml(horse.name)}</td>
				<td>${resultText}</td>
			</tr>`;
			})
			.join("");

		const winner = HR.getHorse(race.winnerId);

		if (incidentHorse) {
			const winnerLine = winner
				? `<p><strong>${HR.escapeHtml(winner.name)}</strong> crosses the winning post first, but the crowd is still looking back towards ${HR.escapeHtml(
						incidentHorse.name
				  )}.</p>`
				: `<p>The field reaches the end in confusion while the officials check the track.</p>`;

			const stakeLine = race.accidentRefund
				? `<p><strong><span style="color:#ffcf6b;">Your stake is returned.</span></strong> ${HR.escapeHtml(
						incidentHorse.name
				  )} was pulled from the race, so your ${HR.formatMoney(race.betAmount)} bet wins nothing.</p>`
				: `<p><strong><span style="color:#ff6b6b;">Your stake is lost.</span></strong> ${HR.escapeHtml(
						incidentHorse.name
				  )} was pulled from the race, and the bookie keeps your ${HR.formatMoney(race.betAmount)} bet.</p>`;

			return `<div class="horse-race-result">
				${winnerLine}
				<p><strong><span style="color:#ff6b6b;">${HR.escapeHtml(
					incidentHorse.name
				)} suffered an incident.</span></strong> Medics hurry onto the track while the other horses finish the race.</p>
				${stakeLine}
				<table class="horse-race-table">
					<thead><tr><th>Place</th><th>Horse</th><th>Result</th></tr></thead>
					<tbody>${rows}</tbody>
				</table>
			</div>`;
		}

		let celebration = winner
			? `<p><strong>${HR.escapeHtml(winner.name)}</strong> crosses the winning post first. The crowd cheers while the bookies start checking their slips.</p>`
			: "<p>The result board changes, and nobody seems certain who crossed the line first.</p>";

		if (race.betAmount > 0 && race.betHorseId !== "") {
			const betHorse = HR.getHorse(race.betHorseId);
			if (race.won) {
				celebration += `<p><strong><span style="color:#5fcf7b;">You won.</span></strong> Your ${HR.formatMoney(race.betAmount)} bet on ${HR.escapeHtml(
					betHorse ? betHorse.name : "your horse"
				)} pays ${HR.formatMoney(race.payout)}.</p>`;
			} else {
				celebration += `<p><strong><span style="color:#ff6b6b;">You lost.</span></strong> Your ${HR.formatMoney(
					race.betAmount
				)} bet does not return anything.</p>`;
			}
		}

		return `<div class="horse-race-result">
			${celebration}
			<table class="horse-race-table">
				<thead><tr><th>Place</th><th>Horse</th><th>Finish</th></tr></thead>
				<tbody>${rows}</tbody>
			</table>
		</div>`;
	};
})();
