/* globals ArcologySfx */
/* Journal map island marker and its encrypted city map (markup from <<arcologyMapOrb>>).
   Listeners are added once at load, so re-rendering the journal never stacks handlers.
   The decode effect runs only while the panel is open and stops by itself. */
(function () {
	const GLYPHS = "0123456789ABCDEF#%&?/<>[]{}=+*";
	let timer = null;
	let soundTimer = null;

	function noise(length) {
		let out = "";
		for (let i = 0; i < length; i++) out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
		return out;
	}

	function stop() {
		if (timer) clearInterval(timer);
		timer = null;
		clearTimeout(soundTimer);
		soundTimer = null;
	}

	function open(orb) {
		const panel = document.getElementById("arcologyHolo");
		if (!panel) return;
		panel.hidden = false;
		panel.classList.remove("decoded");
		const lines = panel.querySelectorAll(".arcology-holo-noise");
		const progress = panel.querySelector(".arcology-holo-progress");
		let step = 0;
		stop();
		/* The interface starts up, then the guest key is refused at 37%. */
		ArcologySfx.play("holo");
		soundTimer = setTimeout(() => panel.isConnected && !panel.hidden && ArcologySfx.play("deny"), setup.arcology.animated() ? 1300 : 300);
		if (!setup.arcology.animated()) {
			panel.classList.add("decoded");
			if (progress) progress.textContent = "37% (HALTED)";
			panel.querySelector(".arcology-holo-close")?.focus();
			orb.setAttribute("aria-expanded", "true");
			return;
		}
		timer = setInterval(() => {
			step++;
			lines.forEach(line => (line.textContent = "LAT " + noise(6) + "  LON " + noise(7) + "  " + noise(10)));
			if (progress) progress.textContent = Math.min(step * 4, 37) + "%";
			// Decryption stalls at 37%: the guest key can't read further.
			if (step >= 14 || !panel.isConnected || !setup.arcology.animated()) {
				clearInterval(timer);
				timer = null;
				panel.classList.add("decoded");
				if (progress) progress.textContent = "37% (HALTED)";
			}
		}, 90);
		const close = panel.querySelector(".arcology-holo-close");
		if (close) close.focus();
		orb.setAttribute("aria-expanded", "true");
	}

	function close() {
		const panel = document.getElementById("arcologyHolo");
		stop();
		if (!panel || panel.hidden) return;
		panel.hidden = true;
		const orb = document.querySelector(".arcology-orb");
		if (orb) {
			orb.setAttribute("aria-expanded", "false");
			orb.focus();
		}
	}

	// Both listeners use the capture phase. Clicks inside the overlay never bubble back to the document,
	// and the game's hotkeys (Mousetrap) cancel Enter, Space and Escape further down.
	document.addEventListener(
		"click",
		ev => {
			const target = ev.target instanceof Element ? ev.target : null;
			if (!target) return;
			const orb = target.closest(".arcology-orb");
			if (orb) open(orb);
			else if (target.closest(".arcology-holo-close")) close();
		},
		true
	);
	document.addEventListener(
		"keydown",
		ev => {
			const target = ev.target instanceof Element ? ev.target : null;
			if (!target) return;
			let handled = false;
			if (target.matches(".arcology-orb") && (ev.key === "Enter" || ev.key === " ")) {
				open(target);
				handled = true;
			} else if (target.matches(".arcology-holo-close") && (ev.key === "Enter" || ev.key === " ")) {
				close();
				handled = true;
			} else if (ev.key === "Escape" && target.closest(".arcology-holo")) {
				// Close the map only, not the journal overlay behind it.
				close();
				handled = true;
			}
			if (handled) {
				ev.preventDefault();
				ev.stopPropagation();
			}
		},
		true
	);
})();

/* Holo status lines (<<holoLine>>) in the passage decode once per render. Bound once at load. */
$(document).on(":passagedisplay.arcologyHolo", () => setup.arcology.composePassage());

/* What a guest can learn about a district from its own street passage: the opening description and the places listed
   under "Places of interest". Read from the passage text, so it never disagrees with what the street says. */
window.arcologyDistrictFacts = function (id) {
	const d = setup.arcology.districts[id];
	const text = Story.has(d.passage) ? Story.get(d.passage).text : "";
	const lines = text.split("\n").map(l => l.trim());
	const desc = lines.find(l => /^You (are|arrive|walk|reach|step|enter)\b/.test(l) && !l.includes("<<")) ?? "";
	const from = text.indexOf("Places of interest");
	const to = text.indexOf("<<arcologyStreets", from);
	const block = from < 0 ? "" : text.slice(from, to < 0 ? undefined : to);
	const places = [...block.matchAll(/\[\[([^|\]]+?)(?: \(\d+:\d+\))?\||<<link\s+"([^"]+?)(?: \(\d+:\d+\))?"/g)].map(m => m[1] || m[2]);
	const clean = places.map(p => p.replace(/^Go to (the )?/i, "")).map(p => p.charAt(0).toUpperCase() + p.slice(1));
	return { desc: desc.replace(/<[^>]+>/g, ""), places: [...new Set(clean)] };
};

/* Fixed positions for the City Map, laid out as the planned route hierarchy from Arcology Pier downwards. [x, y] in map units.
   Hotel Meridian and the Glasshouse are landmarks on Relay Street, drawn as small boxes that can't be selected. */
window.arcologyMapLayout = {
	nodes: {
		pier: [520, 48],
		relay: [520, 144],
		breakwater: [110, 288],
		hotel: [300, 240],
		exchange: [520, 288],
		glasshouse: [1140, 288],
		flats: [110, 432],
		commerce: [740, 432],
		civic: [940, 432],
		market: [300, 528],
		medtech: [740, 552],
		signal: [940, 552],
		skyline: [1140, 552],
		neon: [110, 648],
		underpass: [300, 648],
		forge: [520, 600],
		crown: [1140, 696],
		ironworks: [520, 720],
		stillwater: [1140, 816],
		stronghold: [520, 840],
	},
	landmarks: { hotel: ["Hotel Meridian", "relay"], glasshouse: ["The Glasshouse", "relay"] },
	/* Parent first, so each route is drawn top-down. The private route only shows once Crown Avenue is recorded. */
	routes: [
		["pier", "relay"],
		["relay", "breakwater"],
		["relay", "hotel"],
		["relay", "exchange"],
		["relay", "glasshouse"],
		["breakwater", "flats"],
		["exchange", "market"],
		["exchange", "forge"],
		["exchange", "commerce"],
		["exchange", "civic"],
		["flats", "market"],
		["civic", "medtech"],
		["civic", "signal"],
		["civic", "skyline"],
		["market", "neon"],
		["market", "underpass"],
		["underpass", "ironworks"],
		["forge", "ironworks"],
		["skyline", "crown"],
		["crown", "stillwater"],
		["ironworks", "stronghold"],
		["glasshouse", "crown", "private"],
	],
	/* Explicit ports and corridors keep unrelated edges separate, including the private building connection. */
	edges: {
		"relay-breakwater": "M430 144H110V264",
		"relay-hotel": "M490 168V200H300V229",
		"relay-glasshouse": "M610 144H1140V277",
		"exchange-market": "M430 288H300V504",
		"exchange-commerce": "M550 312V360H740V408",
		"exchange-civic": "M610 288H940V408",
		"flats-market": "M110 456V480H270V504",
		"civic-medtech": "M910 456V492H740V528",
		"civic-skyline": "M970 456V492H1140V528",
		"market-neon": "M270 552V588H110V624",
		"underpass-ironworks": "M300 672V720H430",
		"glasshouse-crown": "M1218 288H1260V696H1230",
	},
	W: 1280,
	H: 888,
	BOX: [180, 48],
};

/* City Map navigation: one saved destination ($xchange.arcology.navTo) and the street exits that lead towards it.
   Routes only pass through districts the player could walk into, so they never reveal restricted streets. */
window.arcologyNav = {
	/* Public districts, and restricted ones the player has visited and is currently allowed into. */
	open(id) {
		const a = setup.arcology;
		const d = a.districts[id];
		if (!d) return false;
		return !d.hidden || ((V.xchange.arcology.found || []).includes(id) && a.eliteAccess());
	},

	/* The destination, or null when there is none or the map can't be used. */
	target() {
		const id = V.xchange.arcology?.navTo;
		return id && setup.arcology.mapAccess() && this.open(id) ? id : null;
	},

	/* Steps from every reachable district to the destination. */
	distances(to) {
		const dist = { [to]: 0 };
		const queue = [to];
		while (queue.length) {
			const id = queue.shift();
			for (const n of setup.arcology.neighbours(id)) {
				if (dist[n] === undefined && this.open(n)) {
					dist[n] = dist[id] + 1;
					queue.push(n);
				}
			}
		}
		return dist;
	},

	/* Neighbouring districts one step closer to the destination. Several when routes tie. */
	next(here) {
		const to = this.target();
		if (!to || here === to) return [];
		const dist = this.distances(to);
		if (dist[here] === undefined) return [];
		return setup.arcology.neighbours(here).filter(n => dist[n] === dist[here] - 1);
	},

	/* One shortest route as a list of districts, starting at "from". */
	route(from) {
		const out = [from];
		let at = from;
		for (let i = 0; i < 30; i++) {
			const step = this.next(at)[0];
			if (!step) break;
			out.push(step);
			at = step;
		}
		return out;
	},

	set(id) {
		if (!setup.arcology.mapAccess() || !this.open(id) || !(V.xchange.arcology.found || []).includes(id)) return;
		V.xchange.arcology.navTo = id;
		window.updateMoment?.();
	},

	clear() {
		delete V.xchange.arcology.navTo;
		window.updateMoment?.();
	},
};

/* The City Map, drawn on the fixed layout above. Visited districts show by name; public districts not yet visited show as
   small unrecorded markers; restricted districts stay off the map until visited. Listeners live on the map element, so they go with it. */
window.arcologyRenderMap = function (host, focus) {
	const a = setup.arcology;
	if (!a.mapAccess()) {
		host.textContent = "ACCESS RESTRICTED. INSUFFICIENT AUTHORIZATION.";
		return;
	}
	const L = window.arcologyMapLayout;
	const nav = window.arcologyNav;
	const st = V.xchange.arcology;
	const found = st.found || [];
	const here = a.online() ? st.district : null;
	const known = id => found.includes(id);
	const shown = Object.keys(a.districts).filter(id => L.nodes[id] && (known(id) || !a.districts[id].hidden));
	const visible = id => (L.landmarks[id] ? known(L.landmarks[id][1]) : shown.includes(id));
	const target = nav.target();
	const path = target && here ? nav.route(here) : [];
	const onPath = (p, q) => path.some((id, i) => (id === p && path[i + 1] === q) || (id === q && path[i + 1] === p));
	const [bw, bh] = L.BOX;
	const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

	let svg = `<svg class="acm-svg" viewBox="-24 0 ${L.W + 48} ${L.H + 10}" role="group" aria-label="City map">`;
	let lines = "";
	for (const [p, q, kind] of L.routes) {
		if (!visible(p) || !visible(q)) continue;
		if (kind === "private" && !known(q)) continue;
		const [x1, y1] = L.nodes[p];
		const [, y2] = L.nodes[q];
		const top = y1 + bh / 2;
		const bottom = y2 - bh / 2;
		const d = L.edges[`${p}-${q}`] ?? `M${x1} ${top}V${bottom}`;
		const faint = !(L.landmarks[p] || known(p)) || !(L.landmarks[q] || known(q));
		const cls = ["acm-link", onPath(p, q) ? "acm-on" : faint ? "acm-faint" : "", kind === "private" ? "acm-private" : ""].join(" ").trim();
		lines += `<path class="${cls}" data-edge="${p}-${q}" d="${d}"/>`;
	}
	svg += lines;
	for (const [id, [name, parent]] of Object.entries(L.landmarks)) {
		if (!known(parent)) continue;
		const [x, y] = L.nodes[id];
		svg += `<g class="acm-place"><rect x="${x - bw / 2 + 12}" y="${y - bh / 2 + 7}" width="${bw - 24}" height="${bh - 14}" rx="4"/><text x="${x}" y="${
			y + 3.5
		}">${esc(name.toUpperCase())}</text></g>`;
	}
	for (const id of shown) {
		const d = a.districts[id];
		const [x, y] = L.nodes[id];
		if (!known(id)) {
			svg += `<g class="acm-node acm-unknown" data-id="${id}"><rect class="acm-ring" x="${x - 44}" y="${
				y - 12
			}" width="88" height="24" rx="12"/><text x="${x}" y="${y + 3.5}">UNRECORDED</text></g>`;
			continue;
		}
		const cls = [
			"acm-node",
			"acm-known",
			d.hidden ? "acm-restricted" : "",
			id === here ? "acm-here" : "",
			id === target ? "acm-dest" : "",
			path.includes(id) && id !== here && id !== target ? "acm-path" : "",
		].join(" ");
		svg += `<g class="${cls.replace(/\s+/g, " ").trim()}" data-id="${id}" data-tier="${d.tier}" tabindex="0" role="button" aria-pressed="${
			id === target
		}" aria-label="${esc(d.name)}${id === here ? ", current position" : ""}${id === target ? ", destination" : ""}${d.hidden ? ", restricted district" : ""}">`;
		svg += `<rect class="acm-ring" x="${x - bw / 2}" y="${y - bh / 2}" width="${bw}" height="${bh}" rx="6"/><rect class="acm-tier" x="${x - bw / 2}" y="${
			y + bh / 2 - 3
		}" width="${bw}" height="3" rx="1.5"/>`;
		svg += `<image href="img/misc/icon/arcology/${d.icon}.png" x="${x - bw / 2 + 7}" y="${y - 8}" width="16" height="16"/>`;
		svg += `<text x="${x - bw / 2 + 29}" y="${y + 3.5}">${esc(d.name.toUpperCase())}</text>`;
		if (id === here) svg += `<circle class="acm-you-dot" cx="${x + bw / 2 - 9}" cy="${y - bh / 2 + 8}" r="3.5"/>`;
		if (id === target)
			svg += `<path class="acm-flag" d="M${x + bw / 2 - 12} ${y - bh / 2 - 12}v14M${x + bw / 2 - 12} ${y - bh / 2 - 12}h10l-3 3.5 3 3.5h-10"/>`;
		svg += "</g>";
	}
	svg += "</svg>";
	const oldViewport = host.querySelector(".acm");
	const scroll = oldViewport ? [oldViewport.scrollLeft, oldViewport.scrollTop] : null;
	const scale = host.dataset.scale || "1";
	host.innerHTML = `<div class="acm-tools" role="group" aria-label="Map controls"><label>Destination <select class="acm-dest-select"><option value="">Select a district</option>${shown
		.filter(known)
		.map(id => `<option value="${id}"${id === target ? " selected" : ""}>${esc(a.districts[id].name)}</option>`)
		.join(
			""
		)}</select></label><div class="acm-view-tools"><button type="button" data-map="out" aria-label="Zoom out">−</button><button type="button" data-map="in" aria-label="Zoom in">+</button><button type="button" data-map="fit">Fit</button><button type="button" data-map="here">My position</button><button type="button" data-map="target"${
		target ? "" : " disabled"
	}>Destination</button></div></div><p class="acm-hint">Drag or scroll to explore. Select a recorded district to plan your walk.</p><div class="acm" tabindex="0" role="region" aria-label="Scrollable city map">${svg}</div><div class="acm-info" aria-live="polite"></div>`;
	const viewport = host.querySelector(".acm");
	const diagram = host.querySelector(".acm-svg");
	const resize = value => {
		host.dataset.scale = String(value);
		diagram.style.width = `${L.W * value}px`;
	};
	const center = id => {
		if (!id || !visible(id)) return;
		const z = Number(host.dataset.scale);
		viewport.scrollLeft = L.nodes[id][0] * z - viewport.clientWidth / 2;
		viewport.scrollTop = L.nodes[id][1] * z - viewport.clientHeight / 2;
	};
	resize(Number(scale));
	if (scroll) [viewport.scrollLeft, viewport.scrollTop] = scroll;
	else center(here);
	host.mapResize?.disconnect();
	host.mapResize = new ResizeObserver(() => {
		if (!host.isConnected) return host.mapResize.disconnect();
		center(focus || here || target);
	});
	host.mapResize.observe(viewport);
	host.querySelector(".acm-dest-select").addEventListener("change", ev => {
		if (ev.target.value) nav.set(ev.target.value);
		else nav.clear();
		window.arcologyRenderMap(host, ev.target.value);
	});
	host.querySelectorAll("[data-map]").forEach(button =>
		button.addEventListener("click", () => {
			const action = button.dataset.map;
			if (action === "here" || action === "target") {
				center(action === "here" ? here : target);
				viewport.scrollIntoView({ block: "nearest" });
				return;
			}
			const z = Number(host.dataset.scale);
			const cx = (viewport.scrollLeft + viewport.clientWidth / 2) / z;
			const cy = (viewport.scrollTop + viewport.clientHeight / 2) / z;
			const next = action === "fit" ? viewport.clientWidth / (L.W + 48) : Math.max(0.6, Math.min(1.8, z + (action === "in" ? 0.2 : -0.2)));
			resize(next);
			viewport.scrollLeft = cx * next - viewport.clientWidth / 2;
			viewport.scrollTop = cy * next - viewport.clientHeight / 2;
		})
	);
	let drag;
	/* Keep map swipes inside the viewport rather than opening the game's sidebar. Native touch scrolling still applies. */
	for (const event of ["touchstart", "touchmove"]) viewport.addEventListener(event, ev => ev.stopPropagation(), { passive: true });
	viewport.addEventListener("pointerdown", ev => {
		if (ev.pointerType !== "mouse" || ev.target.closest(".acm-node")) return;
		drag = [ev.clientX, ev.clientY, viewport.scrollLeft, viewport.scrollTop];
		viewport.setPointerCapture(ev.pointerId);
	});
	viewport.addEventListener("pointermove", ev => {
		if (!drag) return;
		viewport.scrollLeft = drag[2] + drag[0] - ev.clientX;
		viewport.scrollTop = drag[3] + drag[1] - ev.clientY;
	});
	viewport.addEventListener("pointerup", () => {
		drag = null;
	});
	viewport.addEventListener("pointercancel", () => {
		drag = null;
	});
	const info = host.querySelector(".acm-info");

	/* The header readout: position, destination and how far it is. */
	const readout = document.getElementById("acmReadout");
	if (readout) {
		const cell = (k, v, cls = "") => `<div class="acm-read ${cls}"><span>${k}</span><b>${esc(v)}</b></div>`;
		const stops = path.length > 1 ? `${path.length - 1} STREET${path.length > 2 ? "S" : ""}` : target && target === here ? "ARRIVED" : "—";
		readout.innerHTML =
			cell("POSITION", here ? a.districts[here].name.toUpperCase() : "UNKNOWN") +
			cell("DESTINATION", target ? a.districts[target].name.toUpperCase() : "NONE SET", target ? "set" : "") +
			cell("ROUTE", target && !path.length ? "NO ROUTE" : stops);
	}

	const describe = id => {
		host.querySelectorAll(".acm-selected").forEach(n => n.classList.remove("acm-selected"));
		host.querySelector(`.acm-node[data-id="${id}"]`)?.classList.add("acm-selected");
		const d = a.districts[id];
		const next = a
			.neighbours(id)
			.filter(n => shown.includes(n))
			.map(n => (known(n) ? a.districts[n].name : "unrecorded"));
		const access = d.hidden ? (a.eliteAccess() ? "SPONSORED ACCESS" : "RESTRICTED") : "PUBLIC";
		const facts = window.arcologyDistrictFacts(id);
		/* The advisory repeats what Dome Broadcast published, not what is really happening there. */
		const news = setup.arcologyNews.feed().find(x => x.d === id && x.k !== "weekly" && x.at > setup.arcologyNews.now() - 3 * 86400);
		const row = (k, v) => `<div class="acm-row"><span>${k}</span><span>${v}</span></div>`;
		const routeLine =
			id === target
				? '<div class="acm-nav">DESTINATION SET. EXITS ON YOUR ROUTE ARE MARKED <span class="arc-gps" aria-hidden="true"></span> <button type="button" class="acm-clear">Clear route</button></div>'
				: id === here
				? '<div class="acm-nav dim">YOU ARE HERE</div>'
				: nav.open(id)
				? '<div class="acm-nav dim">SELECT TO SET AS DESTINATION</div>'
				: '<div class="acm-nav dim">NO ROUTE AVAILABLE</div>';
		info.innerHTML =
			`<div class="acm-name">${esc(d.name.toUpperCase())}</div>` +
			routeLine +
			(facts.desc ? `<p class="acm-desc">${esc(facts.desc)}</p>` : "") +
			row("THREAT", `${a.tierNames[d.tier]}${id === here ? "" : " (LAST RECORDED)"}`) +
			row("ACCESS", access) +
			row("SHUTTLE STOP", d.bus ? "YES" : "NONE") +
			(facts.places.length ? row("PLACES", esc(facts.places.join(", "))) : "") +
			row("ROUTES", esc(next.join(", ") || "none")) +
			(news ? `<div class="acm-advisory">DOME BROADCAST: ${esc(news.title)}</div>` : "");
		info.querySelector(".acm-clear")?.addEventListener("click", () => {
			nav.clear();
			window.arcologyRenderMap(host, id);
		});
	};

	/* Clicking a recorded district makes it the destination; clicking the destination again clears it. */
	const choose = node => {
		const id = node.dataset.id;
		if (!known(id)) return;
		if (id === target) nav.clear();
		else if (id !== here) nav.set(id);
		window.arcologyRenderMap(host, id);
	};
	const svgEl = host.querySelector(".acm-svg");
	svgEl.addEventListener("click", ev => {
		const node = ev.target instanceof Element && ev.target.closest(".acm-node");
		if (node) choose(node);
	});
	svgEl.addEventListener("keydown", ev => {
		const node = ev.target instanceof Element && ev.target.closest(".acm-node");
		if (node && (ev.key === "Enter" || ev.key === " ")) {
			choose(node);
			ev.preventDefault();
			ev.stopPropagation();
		}
	});
	const start = focus && known(focus) ? focus : target || (here && known(here) ? here : found.find(id => shown.includes(id)));
	if (start) describe(start);
};
