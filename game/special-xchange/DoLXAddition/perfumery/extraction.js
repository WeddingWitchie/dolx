/* Stylized aroma facets, not chemical substances or preparation instructions. */
(() => {
	"use strict";
	const facets = {
		petal: ["floral", 1.1, 0.65, 0.5, 0.4, 0.55, 0.1],
		leaf: ["green", 0.8, 0.85, 0.25, 0.1, 0.9, 0.35],
		pollen: ["floral", 1, 0.3, 0.7, 0.65, 0.2, 0.3],
		peel: ["citrus", 1.2, 0.95, 0.2, 0.2, 1, 0.05],
		juice: ["fruit", 1, 0.75, 0.35, 0.8, 0.6, 0.05],
		jam: ["fruit", 1.15, 0.35, 0.7, 0.9, 0.15, 0.15],
		butter: ["bakery", 1, 0.5, 0.55, 0.35, 0.05, 0.2],
		crumb: ["bakery", 0.85, 0.6, 0.45, 0.35, 0.1, 0.35],
		caramel: ["sweet", 1.2, 0.3, 0.8, 1, 0, 0.2],
		cocoa: ["roasted", 1.4, 0.2, 0.9, 0.3, 0, 0.65],
		spice: ["herbal", 1.3, 0.65, 0.6, 0.1, 0.45, 0.55],
		root: ["earthy", 1, 0.25, 0.8, 0.1, 0.2, 0.9],
		umami: ["savoury", 1.3, 0.35, 0.85, 0.05, 0, 0.7],
		sharp: ["sulphurous", 1.7, 0.85, 0.6, 0, 0.1, 0.6],
		ferment: ["fermented", 1.5, 0.55, 0.8, 0.2, 0, 0.65],
		toast: ["roasted", 1.1, 0.45, 0.75, 0.2, 0, 0.6],
	};
	const defaults = {
		flower: ["petal", "leaf", "pollen", "root", "juice", "spice"],
		fruit: ["juice", "peel", "leaf", "jam", "petal", "root"],
		vegetable: ["leaf", "root", "juice", "spice", "umami", "sharp"],
		mushroom: ["root", "umami", "leaf", "spice", "ferment", "toast"],
		meat: ["umami", "toast", "root", "sharp", "ferment", "spice"],
		seafood: ["umami", "sharp", "leaf", "root", "ferment", "spice"],
	};
	const baked = ["crumb", "toast", "butter", "leaf", "ferment", "caramel"];
	const overrides = {
		bread: baked,
		naan_bread: baked,
		yorkshire_pudding: baked,
		chips: ["toast", "root", "umami", "butter", "leaf", "ferment"],
		choc_chip_cookie: ["butter", "crumb", "caramel", "cocoa", "toast", "ferment"],
		chocolate: ["cocoa", "caramel", "butter", "toast", "petal", "ferment"],
		cocoa_powder: ["cocoa", "toast", "root", "petal", "spice", "ferment"],
		butter: ["butter", "crumb", "caramel", "leaf", "ferment", "sharp"],
		cheese: ["butter", "umami", "ferment", "sharp", "root", "toast"],
		honey: ["caramel", "petal", "pollen", "jam", "leaf", "ferment"],
		wild_honeycomb: ["caramel", "petal", "pollen", "jam", "leaf", "ferment"],
		jam: ["jam", "juice", "caramel", "peel", "petal", "ferment"],
		oats: ["crumb", "toast", "butter", "leaf", "root", "ferment"],
		pastry: ["butter", "crumb", "toast", "caramel", "leaf", "ferment"],
		red_wine: ["jam", "ferment", "petal", "root", "peel", "spice"],
		white_wine: ["juice", "ferment", "peel", "petal", "leaf", "spice"],
		cream: ["butter", "caramel", "leaf", "crumb", "ferment", "sharp"],
		scottish_bog_myrtle: ["spice", "leaf", "petal", "root", "peel", "pollen"],
	};
	// Weak, scentless, bodily, bait, toxic, and story-sensitive stock is never inferred into an accord.
	const excluded = new Set([
		"salt",
		"sugar",
		"flour",
		"vegetable_oil",
		"rice",
		"wheat",
		"potato",
		"green_manure",
		"oyster_pearl",
		"chicken_egg",
		"bird_egg",
		"water_dragon_egg",
		"water_dragon_egg_pastel",
		"bottle_of_milk",
		"bottle_of_breast_milk",
		"baby_bottle_of_breast_milk",
		"bottle_of_semen",
		"baitfish",
		"bait_worm",
		"poppy",
		"strange_flower",
		"ghost_orchid",
		"ghostshroom",
		"wolfshroom",
		"fly_agaric",
		"ghostbrew",
		"wolfbrew",
	]);
	const methods = {
		capture: { name: "Gentle scent capture", minutes: 8, yield: 3 },
		balanced: { name: "Balanced separation", minutes: 12, yield: 4 },
		deep: { name: "Deep aromatic study", minutes: 16, yield: 4 },
	};
	let catalogue;
	function registry() {
		if (catalogue) return catalogue;
		if (!setup.foodstuff) throw new Error("Food catalogue is not ready.");
		catalogue = {};
		const build = (id, path = []) => {
			if (Object.hasOwn(catalogue, id)) return catalogue[id];
			const item = setup.foodstuff[id];
			if (!item || excluded.has(id) || path.includes(id)) return null;
			let seeds = overrides[id] || defaults[item.category];
			const prepared = !!item.recipe || ["meat", "seafood"].includes(item.category);
			if (!seeds && item.recipe) {
				const aromas = item.recipe.ingredients.flatMap(source => build(source, [...path, id])?.seeds.slice(0, 2) || []);
				if (!aromas.length) return null;
				seeds = [...new Set([...aromas, "toast", "crumb", "ferment", "caramel", "root", "leaf", "spice"])].slice(0, 6);
			}
			if (!seeds) return null;
			catalogue[id] = {
				seeds,
				prepared,
				methods: prepared ? ["capture", "balanced"] : ["capture", "balanced", "deep"],
				kind: prepared
					? "reconstructed accord"
					: ["meat", "seafood"].includes(item.category) || seeds.includes("umami")
					? "strong aromatic"
					: "natural aromatic",
			};
			return catalogue[id];
		};
		for (const id of Object.keys(setup.foodstuff)) build(id);
		return catalogue;
	}
	function puzzle(id) {
		const entry = registry()[id];
		if (!entry) throw new Error("This item has no supported aromatic profile.");
		return entry.seeds.map((name, i) => {
			const d = facets[name];
			return {
				name,
				family: d[0],
				intensity: d[1],
				volatility: d[2],
				persistence: d[3],
				sweet: d[4],
				fresh: d[5],
				earth: d[6],
				unpleasant: ["sharp", "ferment"].includes(name),
				neighbours: [(i + 1) % 6, (i + 5) % 6],
			};
		});
	}
	function calculate(id, method, mask, finish) {
		const entry = registry()[id];
		const m = setup.perfumeryModel;
		if (!entry || !entry.methods.includes(method) || !Number.isInteger(mask) || mask < 1 || mask > 63 || !["purity", "yield", "stability"].includes(finish))
			throw new Error("Choose a supported approach, fragments, and finish.");
		const fragments = puzzle(id);
		const selected = fragments.filter((_, i) => mask & (1 << i));
		if (selected.length < 2) throw new Error("Keep at least two connected ideas in the scent.");
		const totals = { volatility: 0, persistence: 0, sweet: 0, fresh: 0, earth: 0 };
		const families = {};
		let weight = 0;
		let tension = 0;
		let links = 0;
		for (let i = 0; i < fragments.length; i++) {
			if (!(mask & (1 << i))) continue;
			const f = fragments[i];
			let support = 1;
			for (const j of f.neighbours) {
				const compatibility = m.compatibility(f.family, fragments[j].family);
				if (mask & (1 << j)) {
					support += (compatibility - 0.5) * 0.25;
					tension += 1 - compatibility;
					links++;
				} else support -= compatibility * 0.13;
			}
			const response = method === "capture" ? 0.5 + f.volatility : method === "deep" ? 0.5 + f.persistence : 1;
			const w = f.intensity * support * response * (finish === "purity" && f.unpleasant ? 0.55 : 1);
			weight += w;
			families[f.family] = (families[f.family] || 0) + w;
			for (const key of Object.keys(totals)) totals[key] += w * f[key];
		}
		for (const key of Object.keys(totals)) totals[key] /= weight;
		for (const family of Object.keys(families)) families[family] /= weight;
		const family = Object.keys(families).sort((a, b) => families[b] - families[a])[0];
		const purity = m.clamp(0.63 + (finish === "purity" ? 0.22 : 0) - (links ? tension / links : 0.3) * 0.2, 0.3, 0.98);
		const stability = m.clamp(0.4 + totals.persistence * 0.3 + (finish === "stability" ? 0.25 : 0) - totals.volatility * 0.12, 0.25, 0.95);
		const yieldUnits = Math.max(1, Math.floor((methods[method].yield * selected.length) / 6 + (finish === "yield" ? 2 : 0) - (finish === "purity" ? 1 : 0)));
		const strength = m.clamp((weight / selected.length) * (finish === "yield" ? 0.72 : 1) * (0.7 + purity * 0.3), 0.35, 1.9);
		totals.persistence *= 0.7 + stability * 0.3;
		const key =
			method === "balanced" && mask === 63 && finish === "stability" && Object.hasOwn(m.ingredients, id) ? id : `aroma~${id}~${method}~${mask}~${finish}`;
		const affinity = totals.volatility > 0.65 ? "top" : totals.persistence > 0.65 ? "base" : "heart";
		const properties = {
			...totals,
			family,
			families,
			intensity: strength,
			affinity,
			human: m.clamp(0.7 - (families.sulphurous || 0) - (families.fermented || 0) * 0.6, -0.5, 0.9),
			animal: m.clamp(totals.sweet * 0.6 + totals.earth * 0.3, -0.4, 1),
			purity,
			stability,
		};
		// The standard reference extract preserves released formula-v1 properties exactly.
		if (key === id) Object.assign(properties, m.ingredients[id], { families: { [m.ingredients[id].family]: 1 } });
		return {
			version: 1,
			key,
			source: id,
			method,
			mask,
			finish,
			selected: fragments.filter((_, i) => mask & (1 << i)).map(f => f.name),
			families: properties.families,
			volatility: properties.volatility,
			affinity: properties.affinity,
			purity,
			yield: yieldUnits,
			stability,
			strength: properties.intensity,
			properties,
			minutes: methods[method].minutes,
		};
	}
	function resolve(key) {
		const parts = key.split("~");
		if (parts.length !== 5 || parts[0] !== "aroma") return null;
		const result = calculate(parts[1], parts[2], Number(parts[3]), parts[4]);
		return result.key === key ? result : null;
	}
	function profile(key) {
		return Object.hasOwn(setup.perfumeryModel.ingredients, key) ? calculate(key, "balanced", 63, "stability") : resolve(key);
	}
	setup.perfumeryExtraction = { registry, puzzle, calculate, resolve, profile, methods, defaults, overrides, excluded };
})();

/* globals V */
(() => {
	"use strict";
	// Translate facet names into smells for the extraction controls.
	const facetWords = {
		petal: "soft flower petals",
		leaf: "fresh green leaves",
		pollen: "dry, honeyed pollen",
		peel: "bright citrus peel",
		juice: "juicy fruit",
		jam: "cooked, jammy fruit",
		butter: "rich dairy notes",
		crumb: "baked crumbs",
		caramel: "caramel sweetness",
		cocoa: "dark cocoa",
		spice: "warm spice",
		root: "damp earth",
		umami: "savoury depth",
		sharp: "a sharp, pungent edge",
		ferment: "a sour, fermented edge",
		toast: "toasted grain",
	};
	const sourceDescriptions = {
		apple: "Fresh apple has a light, juicy scent with a little sweetness.",
		butter: "Butter has a rich, fatty scent that can make a blend smell heavy.",
		oats: "Oats have a dry, grainy smell with a faint toasted warmth.",
		cream: "Cream has a soft, rich dairy smell, with sour traces you can remove.",
		apple_crumble: "Apple crumble smells of baked apple and buttery crumbs, warm and sweet.",
		pastry: "Pastry smells of butter, baked dough, and lightly toasted crumbs.",
		honey: "Honey has a thick sweetness, with soft traces of flowers and pollen.",
		apple_strudel: "Apple strudel smells of juicy fruit and buttery baked pastry.",
		onion: "Onion has green, earthy, and pungent parts that can make a perfume smell more savoury.",
		garlic_bulb: "Garlic has a sharp, pungent smell, with green and earthy parts.",
		white_wine: "White wine smells of juicy fruit and citrus, with a fermented edge.",
		cheese: "Cheese has a rich dairy scent, with savoury, fermented, and pungent parts.",
		lemon: "Lemon has a bright citrus scent that suits the perfume's opening note.",
		truffle: "Truffle has a deep, damp, earthy smell that lasts well in a base note.",
		arancini: "Arancini smell of buttery crumbs, green traces, and earth.",
		bacon: "Bacon has a strong savoury smell, with toasted and earthy parts.",
		shortbread: "Shortbread has a buttery biscuit scent, like warm baked crumbs.",
		cherry: "Cherry smells of juicy fruit, sweet cooked fruit, and a little green sharpness.",
		bakewell_tart: "Bakewell tart smells of buttery pastry and sweet fruit.",
		banana: "Banana has a soft, sweet fruit smell, with green and earthy parts.",
		banana_bread: "Banana bread smells of sweet fruit and buttery, toasted crumbs.",
		sausage: "Sausage has a savoury smell, with earthy, toasted, and pungent parts.",
		bangers_and_mash: "Bangers and mash smell of savoury meat and buttery, sweet cooked potato.",
		bass: "Bass has a savoury fish scent, with sharp and green parts you can remove.",
		beef: "Beef has a full savoury smell, with toasted and earthy parts.",
		mushroom: "Mushroom smells of damp earth, with a savoury depth and a faint fermented edge.",
		beef_wellington: "Beef Wellington smells of savoury meat, earth, and buttery pastry.",
		belgian_bun: "Belgian bun smells of juicy fruit and warm baked dough.",
		blackberry: "Blackberry smells of juicy fruit and jam-like sweetness, with a green edge.",
		blood_lemon: "Blood lemon smells of bright citrus peel, juicy fruit, and green traces.",
		bog_orchid: "Bog orchid smells of flower petals and pollen, with green and earthy parts.",
		bread: "Bread has a warm, crumbly scent, with toasted edges and a little butter.",
		broccoli: "Broccoli has a green vegetable scent, with earthy and pungent parts.",
		chocolate: "Chocolate smells of dark cocoa, caramel, and rich butter.",
		brownie: "Brownie smells of cocoa, caramel, and buttery, toasted crumbs.",
		cabbage: "Cabbage has a leafy green smell, with earthy and pungent traces.",
		pork: "Pork has a savoury scent, with toasted and earthy parts.",
		carbonara: "Carbonara smells of dairy, savoury food, and cooked sweetness.",
		carnation: "Carnation smells of petals and dry pollen, with green and spicy traces.",
		wild_carrot: "Wild carrot smells of green leaves, damp earth, and a little warm spice.",
		carrot_cake: "Carrot cake smells of earthy vegetables, juicy fruit, butter, and caramel.",
		cauliflower: "Cauliflower has a green, earthy scent, with savoury and pungent parts.",
		cauliflower_cheese: "Cauliflower cheese smells of leafy vegetables, rich dairy, and toasted crumbs.",
		cheese_and_crackers: "Cheese and crackers smell of savoury dairy and dry, toasted crumbs.",
		trout: "Trout smells of savoury fish, with a pungent edge and light green traces.",
		cheese_topped_trout: "Cheese-topped trout smells of savoury fish and rich dairy.",
		tomato: "Tomato smells of green leaves and juicy flesh, with earthy and savoury parts.",
		cheeseburger: "Cheeseburger smells of savoury cooked meat, dairy, and toasted bread.",
		chelsea_bun: "Chelsea bun smells of buttery dough and caramel, with a toasted edge.",
		chicken: "Chicken has a savoury smell, with toasted, earthy, and sharp parts.",
		naan_bread: "Naan bread has a soft baked-dough scent, with buttery and toasted traces.",
		chicken_tikka_masala: "Chicken tikka masala smells of savoury food, green traces, and toasted warmth.",
		chilli_pepper: "Chilli pepper smells of green leaves, warm spice, and earth.",
		chicken_vindaloo: "Chicken vindaloo smells savoury and toasted, with green and earthy parts.",
		chilli_con_carne: "Chilli con carne has a savoury cooked-food scent, with green and earthy traces.",
		chips: "Chips smell of toasted edges, rich savoury warmth, and earth.",
		choc_chip_cookie: "Chocolate-chip cookie smells of buttery crumbs, caramel, and dark cocoa.",
		chub: "Chub has a savoury fish scent, with sharp and green parts.",
		clam: "Clam has a savoury seafood smell with a pungent edge.",
		clam_chowder: "Clam chowder smells of savoury seafood and rich cooked ingredients.",
		cloudberry: "Cloudberry smells of juicy fruit and jam-like sweetness, with light traces of peel and leaves.",
		clover: "Clover smells of soft petals, pollen, and green leaves.",
		cocoa_powder: "Cocoa powder smells of dark cocoa and toasted warmth, with a dry, earthy edge.",
		cod: "Cod has a savoury fish smell, with sharp and green parts you can remove.",
		creme_brulee: "Crème brûlée smells of rich dairy, caramel, and warm cooked sweetness.",
		crumpet: "Crumpet smells of buttery baked dough, toasted crumbs, and a faint fermented edge.",
		daffodil: "Daffodil smells of petals, dry pollen, and green leaves, with earthy traces.",
		daisy: "Daisy has a light, fresh, leafy smell that suits an opening note.",
		date: "Date smells of sweet, jam-like fruit, with a little green and earthy depth.",
		eel: "Eel smells of savoury seafood, with pungent traces and light green parts.",
		fish_and_chips: "Fish and chips smell of savoury fish, toasted crumbs, and earth.",
		flapjack: "Flapjack smells of buttery grain and cooked sweetness, with toasted edges.",
		flounder: "Flounder has a savoury fish smell, with sharp and green parts.",
		four_leaf_clover: "Four-leaf clover smells of petals, pollen, and fresh green leaves.",
		full_english_breakfast: "Full English breakfast has a strong smell of savoury food and toasted ingredients.",
		grayling: "Grayling has a savoury fish smell, with pungent and green traces.",
		haddock: "Haddock has a savoury seafood scent, with sharp parts you can keep or remove.",
		hamburger: "Hamburger smells of savoury cooked food, with toasted and earthy parts.",
		hen_of_the_woods: "Hen of the woods has a damp, earthy scent with a savoury depth.",
		herring: "Herring smells of savoury fish, with a pungent edge and light green traces.",
		hibiscus: "Hibiscus smells of flower petals and dry pollen, with green and earthy parts.",
		honeyed_pork: "Honeyed pork smells of savoury cooked meat and honey.",
		hot_cocoa: "Hot cocoa smells of cocoa, rich sweetness, and warm cooked ingredients.",
		jam: "Jam smells of cooked fruit and caramel, with traces of peel and flowers.",
		jammie_dodger: "Jammie dodger smells of buttery biscuit crumbs and sweet, jammy fruit.",
		kedgeree: "Kedgeree smells of savoury cooked food and buttery crumbs, with bright fruit traces.",
		lady_orchid: "Lady orchid smells of flower petals, pollen, green leaves, and damp earth.",
		lasagne: "Lasagne has a rich cooked-food scent, with savoury, dairy, and toasted parts.",
		lemon_meringue_pie: "Lemon meringue pie smells of bright fruit, citrus peel, and buttery cooked sweetness.",
		lemonade: "Lemonade smells of juicy citrus and peel, with cooked-sweet and fermented traces you can remove.",
		lily: "Lily has a strong floral scent that works well as the heart note.",
		lime: "Lime smells of juicy fruit, bright peel, and fresh green leaves.",
		linguine: "Linguine smells of warm cooked ingredients, with grainy and toasted parts.",
		lotus: "Lotus has a gentle, fresh floral scent that suits the heart note.",
		macaroni_cheese: "Macaroni cheese has a rich dairy scent, with savoury and toasted parts.",
		mackerel: "Mackerel has a savoury fish smell, with pungent and fermented traces.",
		marsh_saxifrage: "Marsh saxifrage smells of petals and pollen, with green and earthy parts.",
		melting_moment: "Melting moment smells of buttery biscuit crumbs and warm cooked sweetness.",
		mince_pie: "Mince pie smells of sweet fruit and buttery pastry, with a toasted edge.",
		omelette: "Omelette has a rich cooked-food smell, with buttery and toasted parts.",
		onion_bhaji: "Onion bhaji smells green and earthy, like warm cooked vegetables.",
		orange: "Orange has a sweet citrus scent that is bright at first and fades quickly.",
		orange_juice: "Orange juice smells of juicy fruit, citrus peel, and cooked sweetness.",
		orchid: "Orchid has a rich floral and earthy scent that lasts well in a base note.",
		pansy: "Pansy smells of petals, dry pollen, and green leaves.",
		peach: "Peach has a soft, sweet fruit scent that suits the heart of a perfume.",
		peach_panzanella: "Peach panzanella smells of juicy fruit and warm, grainy cooked food.",
		pear: "Pear smells of juicy fruit and soft sweetness, with a little green depth.",
		pepper: "Pepper has green and spicy parts, with an earthy, savoury smell.",
		perch: "Perch smells of savoury fish, with sharp and green parts you can remove.",
		pike: "Pike has a savoury seafood smell, with pungent and earthy traces.",
		pink_rose: "Pink rose smells of flower petals, pollen, green leaves, and earth.",
		pizza: "Pizza has a rich cooked-food scent, with savoury ingredients and toasted dough.",
		plum: "Plum smells of juicy fruit and jam-like sweetness, with a little earthy depth.",
		plum_pudding: "Plum pudding smells of sweet fruit and warm cooked ingredients.",
		plumeria: "Plumeria smells of sweet, rich flowers that last well in the base of a perfume.",
		red_wine: "Red wine smells of jammy fruit and flowers, with a fermented edge.",
		poached_pear: "Poached pear smells of juicy fruit and warm cooked sweetness.",
		porridge: "Porridge has a soft grain scent, with lightly toasted and earthy parts.",
		potato_pancake: "Potato pancake smells of earthy vegetables and warm toasted crumbs.",
		prawn: "Prawn has a savoury seafood scent, with sharp and green traces.",
		prawn_bisque: "Prawn bisque smells of savoury seafood and rich, warm cooked food.",
		primrose: "Primrose smells of flower petals, dry pollen, and green leaves.",
		pumpkin: "Pumpkin smells green and earthy, with a little warm spice.",
		pumpkin_drink: "Pumpkin drink has green, earthy, and cooked-sweet parts you can keep.",
		pumpkin_pie: "Pumpkin pie smells of earthy vegetables, buttery pastry, and cooked sweetness.",
		quiche: "Quiche smells of rich cooked ingredients and buttery, toasted pastry.",
		red_helleborine: "Red helleborine smells of flower petals and pollen, with green and earthy traces.",
		red_rose: "Red rose has a soft, sweet floral smell that suits the heart of a blend.",
		rich_biscuit: "Rich biscuit smells of toasted crumbs and cooked sweetness, with fruity traces.",
		roach: "Roach has a savoury fish scent, with pungent and green parts.",
		yorkshire_pudding: "Yorkshire pudding has a buttery baked-dough smell with toasted edges.",
		stuffing: "Stuffing smells grainy, toasted, and earthy, like its cooked ingredients.",
		turnip: "Turnip has a green vegetable scent, with earthy, savoury, and sharp parts.",
		roast_dinner: "Roast dinner smells of savoury food, toasted grain, and rich cooked ingredients.",
		spinach: "Spinach has a leafy green smell, with damp earth and savoury traces.",
		salad: "Salad smells of fresh green leaves and juicy fruit, with earthy parts.",
		salmon: "Salmon has a savoury fish scent, with sharp and fermented parts you can remove.",
		salmon_wellington: "Salmon Wellington smells of savoury fish, buttery pastry, and earth.",
		samosa: "Samosa smells of buttery cooked ingredients, with green, earthy, and juicy parts.",
		sausage_roll: "Sausage roll smells of savoury meat, toasted pastry, and butter.",
		scone: "Scone has a buttery baked-crumb scent, with toasted and faintly fermented traces.",
		scottish_bog_myrtle: "Scottish bog myrtle smells of warm spice, green leaves, and soft flowers.",
		small_bass: "Small bass smells of savoury seafood, with sharp and green parts you can remove.",
		small_carp: "Small carp has a savoury fish scent, with pungent and earthy traces.",
		small_herring: "Small herring smells of savoury seafood, with a sharp edge and green parts.",
		small_trout: "Small trout has a savoury fish smell, with sharp and green parts.",
		souffle: "Soufflé has a rich dairy scent, with cooked sweetness and buttery crumbs.",
		spaghetti_bolognese: "Spaghetti bolognese smells of savoury food, earthy vegetables, and toasted warmth.",
		spiked_rampion: "Spiked rampion smells of flower petals, dry pollen, leaves, and earth.",
		sponge_cake: "Sponge cake smells of buttery crumbs, cooked sweetness, and fruit.",
		steak: "Steak has a strong savoury scent, with toasted and earthy parts.",
		sticky_toffee_pudding: "Sticky toffee pudding smells of sweet fruit, butter, caramel, and toasted crumbs.",
		strawberry: "Strawberry smells of juicy fruit and jam-like sweetness, with a fresh green edge.",
		stuffed_pumpkin: "Stuffed pumpkin smells of earthy vegetables, savoury food, and rich cooked sweetness.",
		sunflower: "Sunflower smells of petals, dry pollen, green leaves, and earth.",
		sweet_and_sour_chicken: "Sweet and sour chicken smells of savoury cooked food, with green and earthy parts.",
		swiss_roll: "Swiss roll smells of buttery cake crumbs and sweet, jammy fruit.",
		tart: "Tart smells of buttery crumbs, cocoa, and cooked sweetness, with toasted edges.",
		tulip: "Tulip has a fresh, leafy scent and soft flowers that suit the heart note.",
		turnip_soup: "Turnip soup smells green and earthy, with a toasted, grainy warmth.",
		valentines_chocolate: "Valentines chocolate smells of cocoa, buttery crumbs, and toasted sweetness.",
		white_rose: "White rose has a light, fresh floral scent that suits the heart note.",
		whiting: "Whiting has a savoury fish smell, with sharp and green traces.",
		wild_honeycomb: "Wild honeycomb has a deep, long-lasting sweetness with earthy traces.",
	};
	function description(key, profile = key.startsWith("aroma~") ? setup.perfumeryExtraction.resolve(key) : null) {
		if (profile && key.startsWith("aroma~")) {
			const parts = profile.selected.map(part => facetWords[part]);
			const scents = `${parts.slice(0, -1).join(", ")}${parts.length > 2 ? ", and " : " and "}${parts.at(-1)}`;
			return `This ${setup.foodstuff[profile.source]?.name || profile.source} extract keeps ${scents}.`;
		}
		return sourceDescriptions[key] || `You can separate the ${setup.foodstuff[key]?.name || key} scent into its individual parts.`;
	}
	const kindWords = {
		"natural aromatic": "Natural scent",
		"strong aromatic": "Strong scent",
		"reconstructed accord": "Cooked food, rebuilt from its ingredients",
	};
	const methodHelp = {
		capture: "Collect the lighter parts of the scent, which escape from the ingredient quickly. This method usually collects fewer measures.",
		balanced: "Give the lighter and heavier parts equal attention while separating the scent.",
		deep: "Collect more of the heavier parts, which last longer on your skin. This method is available only for uncooked ingredients.",
	};
	const finishHelp = [
		["stability", "Help the scent last", "Help the scent keep its balance and make its heavier parts last longer."],
		["purity", "Soften harsh parts", "Collect a clearer scent with less pungency, usually at the cost of one measure."],
		["yield", "Collect more aroma", "Collect two extra measures, with a softer scent in each one."],
	];
	const word = (n, steps) => steps.find(([limit]) => n < limit)?.[1] ?? steps[steps.length - 1][1];
	const cap = s => s[0].toUpperCase() + s.slice(1);
	function mount(parent, signal, changed, options = {}) {
		const api = setup.perfumery;
		const engine = setup.perfumeryExtraction;
		const m = setup.perfumeryModel;
		const e = api.state().extraction;
		const catalogue = engine.registry();
		const host = document.createElement("div");
		host.className = "perf-extraction";
		parent.append(host);
		const el = (tag, text, into = host, cls) => {
			const n = document.createElement(tag);
			if (text !== undefined) n.textContent = text;
			if (cls) n.className = cls;
			into.append(n);
			return n;
		};
		const button = (label, action, into, key, cls) => {
			const n = el("button", label, into, cls);
			n.type = "button";
			n.dataset.exAction = action;
			if (key !== undefined) n.dataset.exKey = key;
			return n;
		};
		const have = id => V.foodstuff[id]?.amount || 0;
		const name = id => setup.foodstuff[id]?.name || id;
		const owned = () =>
			Object.keys(catalogue)
				.filter(id => have(id) > 0)
				.sort((a, b) => have(b) - have(a) || name(a).localeCompare(name(b)));
		let source = owned()[0] || null;
		let method = "balanced";
		let finish = "stability";
		let mask = 63;
		let serial = e.serial;
		let result = null;
		let page = 0;
		let feedback = "";

		const pick = el("section", undefined, host, "perf-ex-step");
		const facets = el("section", undefined, host, "perf-ex-step");
		const finishBox = el("section", undefined, host, "perf-ex-step perf-ex-finish");
		const book = el("details", undefined, host, "perf-extraction-book");
		el("summary", "Saved recipes and stored aromas", book);
		const entries = el("div", undefined, book);

		function renderPick() {
			pick.replaceChildren();
			el("h4", "1. Choose an ingredient", pick);
			const list = owned();
			if (!list.length) {
				el(
					"p",
					"You have nothing that can be turned into an aroma. Flowers from a garden and most foods work. Come back once you have some.",
					pick,
					"perf-empty"
				);
				return;
			}
			const ul = el("ul", undefined, pick, "perf-tiles");
			const pages = Math.ceil(list.length / 9);
			page = Math.min(page, pages - 1);
			for (const id of list.slice(page * 9, page * 9 + 9)) {
				const li = el("li", undefined, ul);
				const b = button("", "source", li, id, "perf-tile");
				b.setAttribute("aria-pressed", String(id === source));
				b.disabled = !!result;
				b.title = kindWords[catalogue[id].kind] || catalogue[id].kind;
				const item = setup.foodstuff[id];
				if (V.options.images && item) {
					const icon = el("img", undefined, b, "icon");
					icon.src = `img/misc/icon/${item.icon_path || "tending/" + item.icon}`;
					icon.alt = "";
				}
				el("strong", cap(name(id)), b);
				el("small", `${have(id)} in stock`, b);
			}
			if (pages > 1) {
				const nav = el("div", undefined, pick, "perf-pager");
				button("Previous", "page", nav, "-1").disabled = page === 0;
				el("span", `${page + 1} of ${pages}`, nav);
				button("Next", "page", nav, "1").disabled = page >= pages - 1;
			}
		}

		function profileBars(into, now, before) {
			const rows = el("ul", undefined, into, "perf-profile");
			const families = [...new Set([...Object.keys(before), ...Object.keys(now)])].sort((a, b) => (before[b] || 0) - (before[a] || 0));
			for (const f of families) {
				const n = Math.round((now[f] || 0) * 100);
				const was = Math.round((before[f] || 0) * 100);
				const li = el("li", undefined, rows);
				el("span", cap(f), li);
				const bar = el("span", undefined, li, "perf-bar");
				bar.setAttribute("aria-hidden", "true");
				el("i", undefined, bar).style.width = `${n}%`;
				el("b", undefined, bar).style.left = `${was}%`;
				el("small", n === was ? `${n}%` : `${n}% (was ${was}%)`, li);
			}
		}

		function renderFacets() {
			facets.replaceChildren();
			if (!source) return;
			el("h4", `2. Keep or remove parts of the ${name(source)} scent`, facets);
			el("p", description(source), facets, "perf-source-description");
			el(
				"p",
				"Select a scent part to leave it out, or select it again to keep it. Keep at least two. Neighbouring parts can support or clash with one another.",
				facets,
				"perf-hint"
			);
			const parts = engine.puzzle(source);
			const grid = el("div", undefined, facets, "perf-facets");
			parts.forEach((f, i) => {
				const kept = !!(mask & (1 << i));
				const b = button("", "fragment", grid, String(i), "perf-facet");
				b.setAttribute("aria-pressed", String(kept));
				b.disabled = !!result;
				el("strong", cap(f.name), b);
				el("span", facetWords[f.name] || f.family, b);
				el("b", kept ? "Keeping" : "Removed", b, "perf-facet-state");
				el("small", `${f.unpleasant ? "Harsh · " : ""}Next to ${f.neighbours.map(j => parts[j].name).join(" and ")}`, b);
			});
			const live = el("p", feedback, facets, "perf-facet-detail");
			live.setAttribute("aria-live", "polite");
		}

		function renderFinish() {
			finishBox.replaceChildren();
			if (!source) return;
			if (result) {
				const done = el("div", undefined, finishBox, "perf-ex-done");
				const vial = el("div", undefined, done, "perf-extract-vessel perf-condensed");
				vial.setAttribute("aria-hidden", "true");
				vial.style.setProperty("--extract-fill", `${Math.min(100, result.yield * 14)}%`);
				const text = el("div", undefined, done);
				el("h4", `Collected ${result.yield} ${result.yield === 1 ? "measure" : "measures"} of ${name(result.source)} aroma`, text);
				el("p", description(result.key, result), text);
				el(
					"p",
					`This aroma suits the ${result.affinity === "top" ? "opening" : result.affinity} note. Collecting it used one ingredient from your stock.`,
					text
				);
				if (V.perfumeryVenue === "poppy" && api.availableTeacher())
					el(
						"p",
						result.properties.family === "roasted"
							? 'Poppy smells it twice. "You kept the dark part. I was expecting the sugar."'
							: result.properties.families.sulphurous > 0.15
							? 'Poppy draws back, then tries the strip at arm’s length. "That needs room. Don’t call it a failure until you know what you wanted it to do."'
							: result.properties.sweet > 0.6
							? '"That’s the part I would have kept," Poppy says. "Now try it beside a flower before you decide it needs more."'
							: 'Poppy moves the strip beside the notes. "You’ve left something out on purpose. Show me what it made room for."',
						text,
						"perf-poppy"
					);
				const row = el("div", undefined, finishBox, "perf-steps");
				button("Use it in your perfume", "done", row, undefined, "perf-primary");
				button("Prepare another", "next", row);
				if (!e.profiles.some(p => p.key === result.key)) button("Save this recipe", "save", row);
				return;
			}
			el("h4", "3. Collect the aroma", finishBox);
			let p;
			try {
				p = engine.calculate(source, method, mask, finish);
			} catch (error) {
				el("p", error.message, finishBox, "perf-missing");
				return;
			}
			const full = engine.calculate(source, method, 63, finish);
			el("p", "The filled bars show the scent you are keeping; the thin marks show the whole ingredient before you removed any parts.", finishBox, "perf-hint");
			profileBars(finishBox, p.families, full.families);
			const facts = el("dl", undefined, finishBox, "perf-facts");
			const fact = (k, v) => {
				el("dt", k, facts);
				el("dd", v, facts);
			};
			fact(
				"Amount collected",
				`${p.yield} ${p.yield === 1 ? "measure" : "measures"} of aroma. A measure is one crafting unit; each selection in Compose adds one.`
			);
			fact("Best-suited note", `This aroma suits the ${p.affinity === "top" ? "opening" : p.affinity} note, but you can place it in any note.`);
			fact(
				"Clarity",
				word(p.purity, [
					[0.55, "Muddled: the parts are hard to tell apart."],
					[0.75, "Fairly clear: you can pick out the main parts."],
					[Infinity, "Very clear: each part comes through cleanly."],
				])
			);
			fact(
				"Stability",
				word(p.stability, [
					[0.5, "Long maturing is more likely to make this aroma smell unpleasant."],
					[0.7, "This aroma changes moderately while the perfume matures."],
					[Infinity, "This aroma changes less while the perfume matures."],
				])
			);
			fact("Costs", `1 ${name(source)} (you have ${have(source)}) and ${p.minutes} minutes.`);
			const go = button(`Collect aroma (${p.minutes} min)`, "collect", finishBox, undefined, "perf-primary perf-big");
			go.disabled = have(source) < 1;
			const adv = el("details", undefined, finishBox, "perf-advanced");
			adv.open = options.advanced || method !== "balanced" || finish !== "stability";
			el("summary", "Method and finish (optional)", adv);
			const fs1 = el("fieldset", undefined, adv, "perf-options");
			el("legend", "Method", fs1);
			for (const id of catalogue[source].methods) {
				const lab = el("label", undefined, fs1, "perf-option");
				const r = el("input", undefined, lab);
				Object.assign(r, { type: "radio", name: "perf-ex-method", value: id, checked: method === id });
				r.dataset.exField = "method";
				const body = el("span", undefined, lab);
				el("strong", `${engine.methods[id].name} (${engine.methods[id].minutes} min)`, body);
				el("small", methodHelp[id], body);
			}
			const fs2 = el("fieldset", undefined, adv, "perf-options");
			el("legend", "Finish", fs2);
			for (const [id, label, help] of finishHelp) {
				const lab = el("label", undefined, fs2, "perf-option");
				const r = el("input", undefined, lab);
				Object.assign(r, { type: "radio", name: "perf-ex-finish", value: id, checked: finish === id });
				r.dataset.exField = "finish";
				const body = el("span", undefined, lab);
				el("strong", label, body);
				el("small", help, body);
			}
			if (options.advanced)
				el("small", `Purity ${Math.round(p.purity * 100)}%, stability ${Math.round(p.stability * 100)}%, strength ${p.strength.toFixed(2)}.`, adv, "perf-hint");
		}

		function renderBook() {
			entries.replaceChildren();
			if (!book.open) return;
			el("p", `Practice ${e.practice}/100. Make a saved recipe twice to unlock Quick extraction.`, entries);
			if (!e.profiles.length && !Object.keys(e.stock).length) el("p", "Nothing saved yet.", entries);
			for (const profile of e.profiles) {
				const p = engine.profile(profile.key);
				const row = el("div", undefined, entries, "perf-book-row");
				el("p", `${profile.name}: ${p.selected.join(", ")}. Made ${profile.runs} ${profile.runs === 1 ? "time" : "times"}.`, row);
				const actions = el("div", undefined, row, "perf-steps");
				button("Set it up again", "repeat", actions, profile.key);
				if (profile.runs >= 2) button("Quick extraction", "quick", actions, profile.key).disabled = !!result;
				button("Forget", "forget", actions, profile.key);
			}
			for (const [key, amount] of Object.entries(e.stock)) {
				const row = el("div", undefined, entries, "perf-book-row");
				el("span", `${m.name(key)}: ${amount} ${amount === 1 ? "measure" : "measures"}. `, row);
				button("Pour away", "discard", row, key);
			}
		}
		book.ontoggle = renderBook;

		function render() {
			renderPick();
			renderFacets();
			renderFinish();
			renderBook();
		}
		function choose(id) {
			source = id;
			method = catalogue[id].methods.includes(method) ? method : "balanced";
			mask = 63;
			feedback = "";
		}
		function toggled(i) {
			const parts = engine.puzzle(source);
			const f = parts[i];
			const kept = !!(mask & (1 << i));
			const near = f.neighbours.filter(j => mask & (1 << j)).map(j => parts[j]);
			const clash = near.filter(n => m.compatibility(f.family, n.family) < 0.5).map(n => n.name);
			const support = near.filter(n => m.compatibility(f.family, n.family) >= 0.5).map(n => n.name);
			feedback = kept
				? `Kept ${f.name}.${support.length ? ` It supports ${support.join(" and ")}.` : ""}${
						clash.length ? ` It clashes with ${clash.join(" and ")}, which makes the result less clear.` : ""
				  }`
				: `Removed ${f.name}.${support.length ? ` ${cap(support.join(" and "))} ${support.length > 1 ? "lose" : "loses"} a little support.` : ""}${
						clash.length ? ` ${cap(clash.join(" and "))} no longer ${clash.length > 1 ? "clash" : "clashes"} with it, so the rest is clearer.` : ""
				  }`;
		}
		function collected(p) {
			result = p;
			render();
			changed();
			host.querySelector(".perf-ex-done h4")?.setAttribute("tabindex", "-1");
			host.querySelector(".perf-ex-done h4")?.focus({ preventScroll: false });
		}
		host.addEventListener(
			"click",
			event => {
				const b = event.target.closest("button[data-ex-action]");
				if (!b || !host.contains(b) || b.disabled) return;
				const action = b.dataset.exAction;
				const key = b.dataset.exKey;
				let focus = null;
				try {
					if (action === "source" && !result) {
						choose(key);
						focus = `[data-ex-action="source"][data-ex-key="${CSS.escape(key)}"]`;
					}
					if (action === "page") page += Number(key);
					if (action === "fragment" && !result) {
						const next = mask ^ (1 << Number(key));
						const left = [0, 1, 2, 3, 4, 5].filter(i => next & (1 << i)).length;
						if (left < 2) feedback = "Keep at least two parts. An aroma needs something to hold it together.";
						else {
							mask = next;
							toggled(Number(key));
						}
						focus = `[data-ex-action="fragment"][data-ex-key="${key}"]`;
					}
					if (action === "collect" && !result) {
						b.disabled = true;
						return collected(api.extract(source, method, mask, finish, serial));
					}
					if (action === "next") {
						serial = e.serial;
						result = null;
						if (have(source) < 1) source = owned()[0] || null;
						feedback = "";
					}
					if (action === "done") return changed("notes");
					if (action === "save" && result) api.saveExtraction(result.key);
					if (action === "repeat" || action === "quick") {
						const p = engine.profile(key);
						serial = e.serial;
						result = null;
						choose(p.source);
						method = p.method;
						mask = p.mask;
						finish = p.finish;
						if (action === "quick") return collected(api.extract(p.source, p.method, p.mask, p.finish, serial, true));
						focus = '[data-ex-action="collect"]';
					}
					if (action === "forget") e.profiles = e.profiles.filter(p => p.key !== key);
					if (action === "discard") {
						delete e.stock[key];
						changed();
					}
					render();
					if (focus) host.querySelector(focus)?.focus({ preventScroll: true });
				} catch (error) {
					feedback = error.message;
					render();
				}
			},
			{ signal }
		);
		host.addEventListener(
			"change",
			event => {
				const field = event.target.dataset.exField;
				if (!field) return;
				if (field === "method") method = event.target.value;
				if (field === "finish") finish = event.target.value;
				render();
				host.querySelector(`[name="${event.target.name}"][value="${event.target.value}"]`)?.focus({ preventScroll: true });
			},
			{ signal }
		);
		render();
		return {
			choose(id) {
				if (!catalogue[id] || result) return;
				choose(id);
				render();
				host.querySelector(`[data-ex-action="source"][data-ex-key="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
			},
		};
	}
	setup.perfumeryExtractionUI = { mount, description };
})();
