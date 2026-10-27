/* globals setup, V, Wikifier, State, updateMoment */
(() => {
	let dispose = () => {};
	const quest = () => V.seaRemembers;
	const symbols = ["Shell", "Wave", "Star"];
	const shapes = [
		'<path d="M12 40Q0 8 30 6Q60 8 48 40L36 53H24Z M30 10V49 M17 15L26 48 M43 15L34 48"/>',
		'<path d="M4 42Q17 12 36 18Q54 22 40 34Q36 23 29 30Q22 40 52 43Q25 59 4 42Z"/>',
		'<path d="M30 3L36 22L55 17L41 32L54 48L34 42L24 58L23 38L3 32L22 26Z"/>',
	];
	const icon = function (i) {
		return `<svg viewBox="0 0 60 60" aria-hidden="true">${shapes[i]}</svg>`;
	};
	const mount = function (root) {
		const game = root.dataset.srGame;
		if (!setup.seaRemembers.exclusive() || !quest()) return;
		if ((game === "current" && !quest().route) || (game === "stone" && quest().current !== 5) || (game === "echo" && quest().stone !== 3)) return;

		let dead = false;
		let running = false;
		root.dataset.state = "intro";
		root.classList.add("sr-ritual");
		root.setAttribute("role", "region");
		root.setAttribute("aria-label", "Trial of the " + game[0].toUpperCase() + game.slice(1));
		const retreat = root.closest(".passage").querySelector(".sr-retreat");
		retreat.addEventListener(
			"click",
			event => {
				if (retreat.hidden) {
					event.preventDefault();
					event.stopImmediatePropagation();
				}
			},
			true
		);
		const timers = new Set();
		const later = (fn, ms) => {
			const id = setTimeout(() => {
				timers.delete(id);
				if (!dead && root.isConnected) fn();
			}, ms);
			timers.add(id);
			return id;
		};
		const clear = () => {
			for (const id of timers) clearTimeout(id);
			timers.clear();
		};
		const el = (tag, text, parent = root, cls) => {
			const node = document.createElement(tag);
			if (text) node.textContent = text;
			if (cls) node.className = cls;
			parent.append(node);
			return node;
		};
		const button = (label, fn, parent = root) => {
			const b = el("button", label, parent);
			b.type = "button";
			b.addEventListener("click", () => {
				if (dead || !setup.seaRemembers.exclusive()) return;
				fn();
			});
			return b;
		};
		const cost = (minutes, fatigue) => {
			Wikifier.wikifyEval(`<<island_pass ${minutes}>><<tiredness ${fatigue}>>`);
			if (!setup.seaRemembers.exclusive()) {
				retreat.hidden = false;
				root.classList.remove("sr-playing");
			}
			updateMoment();
		};
		const finish = function (success) {
			if (!running || dead || !setup.seaRemembers.exclusive()) return;
			running = false;
			clear();
			stopInput();
			retreat.hidden = false;
			root.classList.remove("sr-playing");
			quest().result = { game, success };
			cost(success ? 15 : 10, success ? 20 : 30);
			root.classList.add(success ? "sr-complete" : "sr-failed");
			root.dataset.state = success ? "success" : "failure";
			root.querySelectorAll("button").forEach(b => {
				b.disabled = true;
			});
			if (game === "current") {
				status.textContent = success ? "You reach the barrier handles." : "The current forces you back to the handholds.";
				root.querySelector(".sr-current-warning").textContent = success
					? "The drain bolt is within reach."
					: "Rest before retrying from the last sheltered crossing.";
			} else
				status.textContent =
					game === "stone"
						? success
							? "The last crack closes; the stone finally holds."
							: "The barrier breaks apart, forcing you back to the handholds."
						: success
						? "The symbols shine together; you remember."
						: "The memory scatters; you pull your hand from the carvings.";
			const next = el("div");
			next.className = "sr-outcome";
			$(next).wiki(
				success
					? "<<link [[Next|Island Trial Result]]>><</link>>"
					: `<<link [[Retry|Island ${game === "current" ? "Current" : game === "stone" ? "Stone" : "Echo"}]]>><<island_pass 30>><</link>>`
			);
			next.querySelector("a").focus();
		};
		const status = el("p", "", root, "sr-status");
		status.setAttribute("role", "status");
		status.setAttribute("aria-live", "polite");
		const begin = () => {
			retreat.hidden = true;
			delete quest().result;
			root.classList.add("sr-playing");
			root.dataset.state = "playing";
			root.scrollTop = 0;
			root.tabIndex = -1;
			root.focus();
		};
		let stopInput = () => {};
		dispose = () => {
			dead = true;
			running = false;
			clear();
			stopInput();
			root.classList.remove("sr-playing");
			root.replaceChildren();
		};
		if (game === "current") {
			status.textContent = "Swim through the ruins; avoid the rocks and resist the current.";
			el("p", "Drag within the water, or hold arrow keys / WASD. Reach the glowing ring in each passage.", root, "sr-intro");
			const ns = "http://www.w3.org/2000/svg";
			const svg = document.createElementNS(ns, "svg");
			svg.setAttribute("viewBox", "0 0 480 360");
			svg.setAttribute("class", "sr-course");
			svg.dataset.gestureOwner = "current";
			svg.setAttribute("tabindex", "0");
			svg.setAttribute("role", "group");
			svg.setAttribute("aria-label", "Underwater passage. Hold arrow keys or WASD, or drag to swim. Reach the glowing ring on the right.");
			root.append(svg);
			const staminaLabel = el("label", "Stamina", root, "sr-pressure sr-stamina");
			const meter = el("progress", "", staminaLabel);
			meter.max = meter.value = 100;
			const warning = el("p", "", root, "sr-current-warning");
			warning.setAttribute("role", "status");
			const draw = (tag, attrs, cls, parent = svg) => {
				const node = document.createElementNS(ns, tag);
				for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
				if (cls) node.setAttribute("class", cls);
				parent.append(node);
				return node;
			};
			// Keep the five-crossing save contract; older partial crossings stay earned.
			const routes = [
				{
					name: "Gentle Current",
					end: 2,
					rocks: [
						[145, 24, 38, 102],
						[280, 230, 40, 106],
					],
					flows: [
						[85, 50, 125, 260, 0, 17],
						[230, 55, 165, 250, 12, -10],
					],
				},
				{
					name: "Crossing Currents",
					end: 4,
					rocks: [
						[126, 24, 36, 178],
						[248, 167, 38, 169],
						[356, 24, 34, 102],
					],
					flows: [
						[80, 70, 120, 240, 0, -29],
						[198, 42, 120, 270, 0, 31],
						[326, 60, 100, 250, -18, 0],
					],
				},
				{
					name: "The Surge",
					end: 5,
					rocks: [
						[120, 24, 40, 126],
						[225, 213, 42, 123],
						[335, 24, 38, 158],
					],
					flows: [
						[77, 50, 120, 260, 0, 27],
						[190, 42, 125, 275, -18, -23],
						[300, 65, 120, 245, 0, 32],
					],
				},
			];
			const ability = Math.max(0, Math.min(1, ((Number(V.swimmingskill) || 0) + (Number(V.athletics) || 0)) / 2000));
			const radius = 9;
			const speed = 85 + ability * 5;
			const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
			const keys = new Set();
			let route, index, rocks, p, target, player, tail, streams;
			let stamina = 100;
			let clock = 0;
			let last = 0;
			let hitUntil = 0;
			let messageUntil = 0;
			let transition = 0;
			let frame = 0;
			let pointer = null;
			let anchor = null;
			const polygon = (x, y, w, h) => [
				[x + 6, y],
				[x + w - 5, y],
				[x + w, y + 10],
				[x + w - 2, y + h - 6],
				[x + w - 9, y + h],
				[x + 3, y + h - 2],
				[x, y + 8],
			];
			const collides = (pos, poly) => {
				let inside = false;
				for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
					const [ax, ay] = poly[j];
					const [bx, by] = poly[i];
					if (ay > pos.y !== by > pos.y && pos.x < ((bx - ax) * (pos.y - ay)) / (by - ay) + ax) inside = !inside;
					const t = Math.max(0, Math.min(1, ((pos.x - ax) * (bx - ax) + (pos.y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
					if (Math.hypot(pos.x - ax - t * (bx - ax), pos.y - ay - t * (by - ay)) < radius) return true;
				}
				return inside;
			};
			const release = () => {
				const captured = pointer;
				pointer = null;
				anchor = target = null;
				keys.clear();
				if (captured !== null && svg.hasPointerCapture(captured)) svg.releasePointerCapture(captured);
			};
			const paint = () => {
				player.setAttribute("transform", `translate(${p.x} ${p.y})`);
				meter.value = Math.max(0, stamina);
				meter.setAttribute("aria-valuetext", stamina < 25 ? "Exhausted" : stamina < 55 ? "Tiring" : "Steady");
			};
			const section = () => {
				index = quest().current < 2 ? 0 : quest().current < 4 ? 1 : 2;
				route = routes[index];
				p = quest().current === 1 ? { x: 218, y: 180 } : quest().current === 3 ? { x: 220, y: 100 } : { x: 38, y: 180 };
				stamina = 100;
				clock = hitUntil = messageUntil = transition = 0;
				status.textContent = route.name + ": swim to the glowing ring.";
				warning.textContent = "The stone alcoves shelter you from the strongest water.";
				svg.replaceChildren();
				svg.classList.remove("sr-hit", "sr-surging", "sr-surge-warning");
				draw("rect", { width: 480, height: 360 }, "sr-water");
				draw("path", { d: "M50 0L180 0L350 360L240 360Z" }, "sr-shaft");
				draw("path", { d: "M0 0H480V20L420 27L370 21L310 30L250 24L180 29L100 21L40 27L0 20Z" }, "sr-wall");
				draw("path", { d: "M0 360H480V340L420 333L350 340L290 331L220 338L150 332L80 340L0 334Z" }, "sr-wall");
				rocks = route.rocks.map(r => polygon(...r));
				rocks.forEach(poly => {
					draw("polygon", { points: poly.map(v => v.join(",")).join(" ") }, "sr-wall sr-rock");
					const [x, y] = poly[0];
					draw("path", { d: `M${x + 8} ${y + 15}l8 12 -5 18 9 12` }, "sr-stone-cut");
				});
				rocks.push(
					[
						[0, 0],
						[480, 0],
						[480, 20],
						[420, 27],
						[370, 21],
						[310, 30],
						[250, 24],
						[180, 29],
						[100, 21],
						[40, 27],
						[0, 20],
					],
					[
						[0, 360],
						[480, 360],
						[480, 340],
						[420, 333],
						[350, 340],
						[290, 331],
						[220, 338],
						[150, 332],
						[80, 340],
						[0, 334],
					]
				);
				draw("path", { d: "M21 155Q8 180 21 205M459 155Q472 180 459 205" }, "sr-alcove");
				draw("circle", { cx: p.x, cy: p.y, r: 21 }, "sr-entrance");
				draw("circle", { cx: 444, cy: 180, r: 22 }, "sr-checkpoint");
				draw("path", { d: "M437 170L449 180L437 190" }, "sr-exit-mark");
				streams = route.flows.map(([x, y, w, h, fx, fy]) => {
					const group = draw("g", {}, "sr-flow-zone");
					for (let n = 0; n < 5; n++) {
						const px = x + 15 + (n % 2) * (w - 38);
						const py = y + 22 + (n * (h - 50)) / 5;
						const angle = (Math.atan2(fy, fx) * 180) / Math.PI;
						draw("path", { d: "M-17 0Q-6 -5 7 0L13 0M8 -4L13 0L8 4", transform: `translate(${px} ${py}) rotate(${angle})` }, "sr-stream", group);
					}
					return group;
				});
				player = draw("g", {}, "sr-swimmer");
				draw("circle", { r: radius }, "sr-player", player);
				tail = draw("path", { d: "M-8 10Q-18 2-7-5L-8-14L0-9L8-15L9-5Q17 0 6 6Q-1 5 0 12Q5 19 11 12" }, "sr-dragon", player);
				paint();
			};
			const tick = now => {
				frame = 0;
				if (!running || dead || document.hidden || !root.isConnected || !setup.seaRemembers.exclusive()) return;
				const dt = last ? Math.min(0.035, (now - last) / 1000) : 0;
				last = now;
				if (transition > 0) {
					transition -= dt;
					if (transition <= 0) section();
				} else {
					clock += dt;
					const cycle = clock % 8;
					const surge = index === 2 && cycle >= 5.5 && cycle < 7;
					const impending = index === 2 && cycle >= 4 && cycle < 5.5;
					svg.classList.toggle("sr-surging", surge);
					svg.classList.toggle("sr-surge-warning", impending);
					let fx = 0;
					let fy = 0;
					route.flows.forEach(([x, y, w, h, vx, vy], i) => {
						if (p.x > x && p.x < x + w && p.y > y && p.y < y + h) {
							fx += vx;
							fy += vy;
						}
						if (!reduced.matches) streams[i].style.strokeDashoffset = String(-clock * (surge ? 42 : 18));
					});
					const multiplier = (surge ? 2.1 : 1) * (1 - ability * 0.08);
					fx *= multiplier;
					fy *= multiplier;
					let dx = Number(keys.has("right")) - Number(keys.has("left"));
					let dy = Number(keys.has("down")) - Number(keys.has("up"));
					if (keys.size) target = null;
					if (target) {
						dx = ((target.x - p.x) * 6) / speed;
						dy = ((target.y - p.y) * 6) / speed;
					}
					const length = Math.max(1, Math.hypot(dx, dy));
					dx = (dx / length) * speed;
					dy = (dy / length) * speed;
					stamina -= dt * (0.4 + (dx * fx + dy * fy < -500 ? Math.hypot(fx, fy) * 0.045 : 0));
					const steps = Math.max(1, Math.ceil((Math.hypot(dx + fx, dy + fy) * dt) / 2));
					for (let step = 0; step < steps; step++) {
						const next = { x: p.x + ((dx + fx) * dt) / steps, y: p.y + ((dy + fy) * dt) / steps };
						if (next.x < radius || next.x > 480 - radius || next.y < radius || next.y > 360 - radius) {
							warning.textContent = "You lose your grip on the current!";
							finish(false);
							return;
						}
						if (rocks.some(poly => collides(next, poly))) {
							if (clock > hitUntil) {
								stamina -= 17 - ability * 2;
								hitUntil = clock + 0.7;
								messageUntil = clock + 1.3;
								warning.textContent = "You strike the stone wall!";
							}
							break;
						}
						p = next;
					}
					svg.classList.toggle("sr-hit", hitUntil > clock);
					if (!reduced.matches) tail.setAttribute("transform", `rotate(${Math.sin(clock * 5) * 7})`);
					if (clock > messageUntil) {
						const message = impending
							? "The water gathers; a powerful surge is coming!"
							: surge
							? "The water surges through the passage!"
							: stamina < 25
							? "Your arms are tiring; reach the sheltered ring!"
							: Math.hypot(fx, fy) > 25
							? "The current drags you sideways!"
							: "Keep clear of the stone edges.";
						if (warning.textContent !== message) warning.textContent = message;
					}
					paint();
					if (stamina <= 0) {
						finish(false);
						return;
					}
					if (Math.hypot(p.x - 444, p.y - 180) < 18) {
						quest().current = route.end;
						if (route.end === 5) {
							quest().chapter = 4;
							finish(true);
							return;
						}
						cost(10, 8);
						release();
						transition = 1.4;
						status.textContent = "You reach a sheltered ring; the next passage opens.";
						warning.textContent = "Brace against the stone before swimming on.";
					}
				}
				frame = requestAnimationFrame(tick);
			};
			const point = event => new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
			svg.addEventListener("pointerdown", event => {
				if (!running || transition > 0 || pointer !== null) return;
				event.preventDefault();
				svg.focus({ preventScroll: true });
				pointer = event.pointerId;
				const pos = point(event);
				anchor = event.pointerType === "touch" ? { x: pos.x - p.x, y: pos.y - p.y } : { x: 0, y: 0 };
				target = { x: pos.x - anchor.x, y: pos.y - anchor.y };
				svg.setPointerCapture(pointer);
			});
			svg.addEventListener("pointermove", event => {
				if (event.pointerId !== pointer || !running) return;
				event.preventDefault();
				const pos = point(event);
				target = { x: pos.x - anchor.x, y: pos.y - anchor.y };
			});
			for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) svg.addEventListener(name, release);
			const direction = key => ({ ArrowUp: "up", w: "up", ArrowDown: "down", s: "down", ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right" }[key]);
			svg.addEventListener("keydown", event => {
				const d = direction(event.key.length === 1 ? event.key.toLowerCase() : event.key);
				if (!d || !running || transition > 0) return;
				event.preventDefault();
				keys.add(d);
			});
			svg.addEventListener("keyup", event => {
				const d = direction(event.key.length === 1 ? event.key.toLowerCase() : event.key);
				if (d) {
					event.preventDefault();
					keys.delete(d);
				}
			});
			svg.addEventListener("blur", release);
			const visibility = () => {
				cancelAnimationFrame(frame);
				frame = 0;
				release();
				last = 0;
				if (!document.hidden && running) frame = requestAnimationFrame(tick);
			};
			document.addEventListener("visibilitychange", visibility);
			stopInput = () => {
				cancelAnimationFrame(frame);
				release();
				document.removeEventListener("visibilitychange", visibility);
			};
			section();
			button("Begin", () => {
				begin();
				running = true;
				last = 0;
				svg.focus({ preventScroll: true });
				frame = requestAnimationFrame(tick);
			}).classList.add("sr-begin");
			return;
		}

		if (game === "stone") {
			status.textContent = "Seal the cracks before the barrier gives way.";
			el("p", "Wide cracks need two presses; brace the barrier to release pressure.", root, "sr-intro");
			const pressureLabel = el("label", "Water pressure", root, "sr-pressure");
			const pressureMeter = el("progress", "", pressureLabel);
			pressureMeter.max = 100;
			pressureMeter.value = 0;
			const grid = el("div", "", root, "sr-stone-wall");
			grid.setAttribute("role", "group");
			grid.setAttribute("aria-label", "Stone barrier. Arrow keys move between stones; Enter or Space repairs a crack.");
			const paths = [
				"M0 50L24 42L40 54L53 33L64 57L80 47L100 50",
				"M0 50L28 44L48 53L68 43L100 50M48 53L40 26L50 0M48 53L61 76L50 100",
				"M0 50L20 39L37 57L53 31L65 65L80 44L100 50",
			];
			const positions = ["upper left", "upper middle", "upper right", "middle left", "centre", "middle right", "lower left", "lower middle", "lower right"];
			let cracks = Array(9).fill(null);
			let pressure = 0;
			let repairs = 0;
			let braces = 2;
			let count = 5;
			let transitioning = false;
			let spawned = 0;
			const strength = Math.min(1, (Number(V.physique) || 0) / Math.max(1, Number(V.physiquesize) || 1));
			const cells = Array.from({ length: 9 }, (_, i) => {
				const cell = button("", () => strike(i), grid);
				cell.className = "sr-stone-tile";
				cell.disabled = true;
				cell.tabIndex = i === 0 ? 0 : -1;
				cell.setAttribute("aria-label", "Unbroken stone, " + positions[i]);
				cell.addEventListener("keydown", event => {
					const offset = { ArrowUp: -3, ArrowDown: 3, ArrowLeft: i % 3 ? -1 : 0, ArrowRight: i % 3 < 2 ? 1 : 0 }[event.key];
					if (offset === undefined) return;
					event.preventDefault();
					const next = Math.max(0, Math.min(8, i + offset));
					cell.tabIndex = -1;
					cells[next].tabIndex = 0;
					cells[next].focus();
				});
				return cell;
			});
			const marks = el("div", "", root, "sr-supports");
			marks.setAttribute("aria-label", "Secured supports");
			const supports = Array.from({ length: 3 }, () => el("span", "", marks));
			const warning = () =>
				pressure >= 80
					? "The barrier is beginning to give way!"
					: pressure >= 55
					? "The pressure is rising; seal the spreading cracks!"
					: "Cracks spread across the barrier; seal them quickly!";
			const paint = () => {
				pressureMeter.value = Math.max(0, pressure);
				pressureMeter.setAttribute("aria-valuetext", pressure >= 80 ? "Dangerously high" : pressure >= 55 ? "Rising" : "Holding steady");
				root.dataset.pressure = pressure >= 80 ? "danger" : pressure >= 55 ? "high" : "low";
				cells.forEach((cell, i) => {
					const crack = cracks[i];
					if (crack) {
						cell.className =
							"sr-stone-tile sr-fractured sr-fracture-" +
							crack.type +
							(crack.age >= 2 ? " sr-widening" : "") +
							(crack.type === 2 && crack.hp === 1 ? " sr-closing" : "");
						cell.innerHTML =
							'<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path' +
							(crack.vertical ? ' transform="rotate(90 50 50)"' : "") +
							' d="' +
							paths[crack.type] +
							'"/></svg>';
					} else if (!cell.classList.contains("sr-sealed")) {
						cell.className = "sr-stone-tile";
						cell.replaceChildren();
					}
					const description = crack
						? [
								"Narrow crack, press once",
								"Branching crack, seal before it spreads",
								crack.hp === 2 ? "Wide crack, press twice" : "Wide crack closing, press once more",
						  ][crack.type]
						: "Unbroken stone";
					cell.setAttribute("aria-label", description + ", " + positions[i]);
					cell.disabled = !running || transitioning;
				});
				supports.forEach((mark, i) => {
					mark.classList.toggle("sr-secured", i < quest().stone);
					mark.textContent = i < quest().stone ? "✓" : "";
				});
				brace.disabled = !running || transitioning || braces === 0;
				brace.textContent = braces === 0 ? "Brace locked" : "Brace the barrier";
			};
			const spawn = () => {
				const empty = cells.map((cell, i) => (!cracks[i] && !cell.classList.contains("sr-sealed") ? i : -1)).filter(i => i >= 0);
				if (!empty.length) return;
				const type = (spawned++ + quest().stone) % 3;
				cracks[empty[Math.floor(Math.random() * empty.length)]] = { type, hp: type === 2 ? 2 : 1, age: 0 };
			};
			const tick = () => {
				if (!running || transitioning || document.hidden || !setup.seaRemembers.exclusive()) return;
				pressure += (3 + quest().stone * 2) * (1 - strength * 0.3);
				const spread = [];
				cracks.forEach((crack, i) => {
					if (!crack) return;
					crack.age++;
					if (crack.age >= 3) {
						pressure += crack.type === 2 ? 9 : 5;
						if (crack.type === 1) {
							const neighbours = [i - 3, i + 3, i % 3 ? i - 1 : -1, i % 3 < 2 ? i + 1 : -1].filter(
								n => n >= 0 && n < 9 && !cracks[n] && !cells[n].classList.contains("sr-sealed")
							);
							if (neighbours.length) spread.push({ index: neighbours[0], vertical: Math.abs(neighbours[0] - i) === 3 });
						}
						crack.age = 2;
					}
				});
				spread.forEach(({ index, vertical }) => {
					if (!cracks[index]) cracks[index] = { type: 0, hp: 1, age: 0, vertical };
				});
				if (cracks.filter(Boolean).length < 2 + quest().stone) spawn();
				paint();
				status.textContent = warning();
				if (pressure >= 100) finish(false);
				else later(tick, 2000 - quest().stone * 250 + strength * 200);
			};
			const round = () => {
				if (!setup.seaRemembers.exclusive()) return;
				clear();
				transitioning = false;
				pressure = 0;
				repairs = 0;
				braces = 2;
				count = 5 + quest().stone * 2;
				spawned = 0;
				cracks = Array(9).fill(null);
				cells.forEach(cell => cell.classList.remove("sr-sealed"));
				spawn();
				spawn();
				paint();
				status.textContent = "Cracks spread across the barrier; seal them quickly!";
				cells.forEach(cell => {
					cell.tabIndex = -1;
				});
				const first = cells.find((_, i) => cracks[i]);
				first.tabIndex = 0;
				first.focus();
				if (!document.hidden) later(tick, 2200);
			};
			const strike = i => {
				if (!running || transitioning) return;
				const crack = cracks[i];
				if (!crack) {
					if (cells[i].classList.contains("sr-sealed")) return;
					pressure += 10;
					status.textContent = "That stone is sound; find a crack!";
				} else {
					crack.hp--;
					pressure = Math.max(0, pressure - 4 - strength * 2);
					status.textContent = crack.hp ? "The wide crack narrows; press it again!" : "The crack seals beneath your hand.";
					if (!crack.hp) {
						cracks[i] = null;
						repairs++;
						cells[i].classList.add("sr-sealed");
						later(() => {
							cells[i].classList.remove("sr-sealed");
							if (running && !transitioning && !document.hidden) {
								spawn();
								paint();
							}
						}, 850);
					}
				}
				paint();
				if (pressure >= 100) {
					finish(false);
					return;
				}
				if (repairs >= count) {
					quest().stone++;
					cost(15, 10);
					clear();
					if (quest().stone === 3) {
						cracks.fill(null);
						cells.forEach(cell => cell.classList.add("sr-sealed"));
						pressure = 0;
						paint();
						quest().chapter = 5;
						finish(true);
					} else {
						transitioning = true;
						paint();
						status.textContent = "This support holds; the next is straining.";
						if (!document.hidden) later(round, 1400);
					}
				}
			};
			const brace = button("Brace the barrier", () => {
				if (!running || transitioning || !braces) return;
				braces--;
				pressure = Math.max(0, pressure - 25);
				paint();
				status.textContent = braces ? "You brace the barrier against the surge." : "The brace locks; keep sealing the cracks.";
			});
			brace.className = "sr-stone-brace";
			const start = button("Begin", () => {
				begin();
				running = true;
				round();
			});
			start.className = "sr-begin";
			const visibility = () => {
				clear();
				cells.forEach(cell => cell.classList.remove("sr-sealed"));
				if (!running) return;
				if (document.hidden) status.textContent = "The trial is paused while you are away.";
				else if (transitioning) later(round, 1400);
				else {
					paint();
					status.textContent = warning();
					later(tick, 2200);
				}
			};
			document.addEventListener("visibilitychange", visibility);
			stopInput = () => document.removeEventListener("visibilitychange", visibility);
			paint();
			return;
		}
		if (game === "echo") {
			status.textContent = "Remember the order in which the carvings glow.";
			el("p", "Three mistakes end the attempt.", root, "sr-intro");
			const board = el("div", "", root, "sr-echo-symbols");
			board.setAttribute("role", "group");
			board.setAttribute("aria-label", "Memory carvings");
			const cells = symbols.map((name, i) => {
				const cell = button(name, () => input(i), board);
				cell.setAttribute("aria-label", name);
				cell.insertAdjacentHTML("afterbegin", icon(i));
				cell.disabled = true;
				return cell;
			});
			const progress = el("div", "", root, "sr-echo-progress");
			progress.setAttribute("aria-label", "Remembered symbols");
			const spoken = el("span", "", root, "sr-spoken");
			spoken.setAttribute("aria-live", "assertive");
			let pattern = [];
			let index = 0;
			let concentration = 3;
			let phase = "intro";
			let revealIndex = 0;
			let pending = null;
			let remaining = 0;
			let due = 0;
			const schedule = (fn, delay) => {
				pending = fn;
				remaining = delay;
				due = performance.now() + delay;
				later(() => {
					pending = null;
					fn();
				}, delay);
			};
			const resetCells = () =>
				cells.forEach(cell => {
					cell.classList.remove("sr-lit", "sr-accepted", "sr-rejected");
					cell.setAttribute("aria-pressed", "false");
				});
			const paintProgress = () => {
				progress.replaceChildren();
				pattern.forEach((_, n) => {
					const mark = el("span", n < index ? "✓" : "", progress);
					mark.classList.toggle("sr-remembered", n < index);
					mark.setAttribute("aria-hidden", "true");
				});
			};
			const reveal = () => {
				if (!running || !setup.seaRemembers.exclusive()) return;
				if (revealIndex === pattern.length) {
					phase = "answering";
					spoken.textContent = "";
					status.textContent = "Now repeat the pattern.";
					cells.forEach(cell => {
						cell.disabled = false;
					});
					cells[0].focus();
					return;
				}
				const symbol = pattern[revealIndex];
				resetCells();
				cells[symbol].classList.add("sr-lit");
				cells[symbol].setAttribute("aria-pressed", "true");
				spoken.textContent = symbols[symbol];
				schedule(() => {
					resetCells();
					spoken.textContent = "";
					revealIndex++;
					schedule(reveal, 350);
				}, 700);
			};
			const present = fresh => {
				if (!running || !setup.seaRemembers.exclusive()) return;
				clear();
				if (fresh) {
					pattern = Array.from({ length: 2 + quest().echo }, () => Math.floor(Math.random() * 3));
					concentration = 3;
				}
				index = 0;
				revealIndex = 0;
				phase = "watching";
				resetCells();
				paintProgress();
				cells.forEach(cell => {
					cell.disabled = true;
				});
				status.textContent = "Watch the symbols carefully.";
				schedule(reveal, 500);
			};
			const input = i => {
				if (!running || phase !== "answering") return;
				resetCells();
				if (pattern[index] === i) {
					cells[i].classList.add("sr-accepted");
					index++;
					paintProgress();
					status.textContent = "Keep the order in mind.";
					if (index === pattern.length) {
						quest().echo++;
						cost(15, 5);
						cells.forEach(cell => {
							cell.disabled = true;
						});
						if (quest().echo === 3) {
							cells.forEach(cell => cell.classList.add("sr-lit"));
							quest().chapter = 6;
							finish(true);
						} else {
							phase = "transition";
							status.textContent = quest().echo === 1 ? "A guardian waits beside the lower handholds." : "A guardian braces the frame before opening the gate.";
							schedule(() => present(true), 1800);
						}
					}
				} else {
					cells[i].classList.add("sr-rejected");
					concentration--;
					index = 0;
					paintProgress();
					if (!concentration) {
						finish(false);
						return;
					}
					phase = "retry";
					cells.forEach(cell => {
						cell.disabled = true;
					});
					status.textContent = concentration === 1 ? "The memory is almost gone; watch closely." : "The memory slips from your grasp.";
					schedule(() => present(false), 1200);
				}
			};
			const start = button("Begin", () => {
				begin();
				running = true;
				present(true);
			});
			start.className = "sr-begin";
			let pausedMessage = "";
			const visibility = () => {
				if (!running) return;
				if (document.hidden) {
					remaining = Math.max(0, due - performance.now());
					clear();
					pausedMessage = status.textContent;
					status.textContent = "The trial is paused while you are away.";
				} else {
					status.textContent = pausedMessage;
					if (pending) schedule(pending, remaining);
				}
			};
			document.addEventListener("visibilitychange", visibility);
			stopInput = () => document.removeEventListener("visibilitychange", visibility);
		}
	};
	$(document).on(":passageinit.seaRemembers", () => {
		dispose();
		dispose = () => {};
	});
	$(document).on(":passagedisplay.seaRemembers", () => {
		if (!["Island Current", "Island Stone", "Island Echo"].includes(State.passage)) return;
		const root = document.querySelector(".passage:not(.passage-out) .sr-game");
		if (root) mount(root);
	});
})();
