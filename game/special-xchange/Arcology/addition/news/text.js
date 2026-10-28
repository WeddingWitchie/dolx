/* Dome Broadcast's wording. Turns a saved article record into a headline, body, byline and comments.
   Only reads the record and static island data; it never decides what happened. */
setup.arcologyNewsText = {
	cap: s => s.charAt(0).toUpperCase() + s.slice(1),

	/* A fixed choice for this article and purpose. */
	pick(rec, key, list) {
		return list[Math.floor(setup.arcologyNews.seed(rec.id + "|" + key + "|" + (rec.n ?? 0)) * list.length)];
	},

	district(id) {
		return setup.arcology.districts[id]?.name ?? "the island";
	},

	reporters: ["Ines Corva", "Tomas Reyl", "Hana Moreau", "Dex Okafor", "Lio Brandt", "Mara Kade", "Sun-Yi Park", "Ade Varga"],
	/* The reporter's note under each article, written in their own voice. */
	reporterBios: {
		"Ines Corva": "I watch Cipher prices on the Unit Exchange and talk to traders on Market Street. When a price changes, I want to know what caused it.",
		"Tomas Reyl":
			"I cover Enforcement, the courts, and the Registry. Every morning I read reports about arrests and complaints, including the cases nobody in authority seems willing to explain.",
		"Hana Moreau":
			"I spend most days in the Flats and the Stack, where many island residents live. People here often tell me what happened before officials make an announcement.",
		"Dex Okafor": "I worked at the Ironworks for six years before becoming a reporter. I still visit the factories and read the work schedules myself.",
		"Lio Brandt": "When a shuttle stop closes, I walk to the next open one myself. Readers deserve to know how much extra time the journey takes.",
		"Mara Kade": "I visit clinics and talk to the people making implants. I ask about the risks, costs, and restrictions their advertisements leave out.",
		"Sun-Yi Park": "I spend my evenings reporting on bars and clubs. Some places open and close before the Registry even updates its list.",
		"Ade Varga":
			"I investigate leaked documents and company accounts, especially the ones someone tried to hide. You can send me tips through the Dome Broadcast desk.",
	},

	/* Everything a writer needs, from the record alone. */
	context(rec) {
		const N = setup.arcologyNews;
		const c = {
			D: this.district(rec.d),
			O: N.orgName(rec.o),
			O2: N.orgName(rec.o2),
			O3: N.orgName(rec.o3),
			P: N.places[rec.p]?.name ?? "",
		};
		c.Oc = this.cap(c.O);
		c.O2c = this.cap(c.O2);
		c.O3c = this.cap(c.O3);
		c.Pc = this.cap(c.P);
		return c;
	},

	/* "the second ... in five weeks" lines when the same thing happened here before. */
	again(rec, noun) {
		if (!rec.prev) return "";
		const [ago, out] = rec.prev;
		const span = ago < 14 ? `${ago} days` : `${Math.round(ago / 7)} weeks`;
		const how =
			{
				reopened: "it reopened after repairs",
				fined: "the operators were fined",
				takeover: "another crew took control of the street corner",
				truce: "the crews agreed to stay apart",
				"broken up": "Enforcement broke it up",
				recovered: "the goods were recovered",
				unresolved: "nobody was held responsible",
				exposed: "the first account turned out to be wrong",
				overstated: "the official account was later contradicted",
				faded: "no further reports were published",
			}[out] ?? "few people reported what happened afterwards";
		return `It is the second ${noun} here in ${span}. Last time, ${how}.`;
	},

	write(rec, discussion = true) {
		const out = { story: this.story, notice: this.notice, reminder: this.reminder, weekly: this.weekly, break: this.breaking }[rec.k].call(this, rec);
		// Each desk has its own reporter, so the byline and the bio under the article agree with the story.
		out.byline ??=
			out.tone === "investigation"
				? "Ade Varga"
				: ["nightlife", "glasshouse"].includes(rec.f)
				? "Sun-Yi Park"
				: {
						MARKETS: "Ines Corva",
						BUSINESS: "Ines Corva",
						SECURITY: "Tomas Reyl",
						CRIME: "Tomas Reyl",
						SOCIETY: "Hana Moreau",
						PEOPLE: "Hana Moreau",
						INDUSTRY: "Dex Okafor",
						TRANSIT: "Lio Brandt",
						CYBERNETICS: "Mara Kade",
				  }[out.cat] ?? this.pick(rec, "by", this.reporters);
		const publicDistrict = setup.arcologyNews.publicSubject(rec).d;
		out.place ??= publicDistrict ? this.district(publicDistrict) : "";
		out.heat ??= 0.4 + 0.2 * (rec.sev ?? 1);
		if (discussion) out.residents = rec.rc ?? out.residents ?? this.residents(rec, out);
		out.options ??= this.options(rec, out);
		return out;
	},

	story(rec) {
		const fam = this.families[rec.f];
		const c = this.context(rec);
		const w = fam[rec.ph].call(this, rec, c);
		const body = w.body.filter(Boolean);
		if (rec.f === "business") {
			const context = {
				expansion:
					rec.ph === "withdrawn"
						? "The company has cancelled plans to open the new floor. Its existing location remains open, with the same prices and opening hours."
						: "The company has not announced new prices or opening hours. People applying for jobs have not been told how many positions are available.",
				contract: "The two companies are arguing over their contract. The disagreement has not changed what customers pay or the services offered to them.",
				wages: "The argument concerns money being taken out of workers' pay. Customer prices and opening hours have not changed.",
				leak: ["outcome", "unresolved"].includes(rec.ph)
					? "The Registry checked the documents involved in this dispute. It did not examine all of the company's purchases. No refunds or price changes have been announced."
					: "The invoices show different amounts, but this does not prove anyone acted dishonestly. Investigators still need to check the deliveries and confirm that the documents are genuine.",
				recall:
					"The recall applies only to the group of parts named in the notice. Customers should check whether their part is included before paying for a replacement.",
				stake: "One company now owns a share of the other. Prices, opening hours, and services have not changed as a result of the purchase.",
				irregular:
					"The disputed transfers involve customers' money. The company is checking its own accounts, and no independent reviewer has published any findings.",
			}[rec.s];
			if (context) body.push(context);
		} else if (rec.f === "implant") {
			body.push(
				{
					trial:
						rec.ph === "fixed"
							? "The clinic is no longer accepting volunteers for this round of testing. Anyone responding to an old advertisement will have to wait for another announcement. Guests are still not allowed to receive new body implants."
							: "The clinic has not said whether guests can apply. It also has not explained exactly what the implant does, the risks involved, or what happens if a volunteer decides to leave the trial.",
					malfunction: "Patients should check the clinic's notice to find out whether the problem affects the implant they have.",
					backup:
						"Guests can check their records at the Registry, but they cannot make a backup copy there. The new rules for staff do not change this restriction.",
					unlicensed:
						"Clinics can examine implants that were installed without permission. That does not give guests permission to have new implants installed.",
					xchange:
						"Guests are waiting outside the X-Change Station on Relay Street. The guest counter still sells only the products listed for guests, with the usual daily limit. Staff check each visitor's permission before offering restricted services.",
				}[rec.s]
			);
		} else if (rec.f === "industry" && rec.ph === "reopen") {
			body.push(
				setup.arcologyNews.places[rec.p]?.closable
					? `${c.Pc} in ${c.D} is taking bookings for work again. Other workplaces are unaffected.`
					: `The update applies to ${c.P} in ${c.D} only. No change to pay has been announced beyond what is described above.`
			);
		} else if (rec.f === "transit" && rec.ph !== "reopen") {
			body.push(
				"Passengers should check the shuttle screen before leaving home. Closed stops cannot be chosen as destinations. No alternative walking route has been marked. Passengers should check that their accounts allow them to enter any districts they plan to walk through."
			);
		} else if (rec.f === "sweep" && rec.ph === "announce") {
			body.push(
				"Enforcement has not announced an end date. Officers are checking implants even when people are travelling through districts their accounts allow them to enter."
			);
		} else if (rec.f === "idcheck" && ["found", "tighten"].includes(rec.ph)) {
			body.push(
				"Officers are carrying out extra checks on everyone passing through the district. The Registry has not found the source of the copied records, and there is no evidence that every guest being checked is involved."
			);
		} else if (rec.f === "feud" && ["clash", "retaliation"].includes(rec.ph)) {
			body.push(
				`The fighting is taking place on streets where people live, shop, and work. Anyone passing through ${c.D} could be hurt, even without any connection to either crew.`
			);
		} else if (rec.f === "smuggle" && rec.ph === "missing") {
			body.push("The missing goods have not been found. Investigators have not identified who took them or where they went.");
		} else if (rec.f === "nightlife" && rec.ph === "notice") {
			body.push(
				rec.s === "raid"
					? "The checks apply to this venue only. There is no city-wide closure and no change to guest clearance."
					: "The event affects this venue, not the district's opening hours. Check the shuttle board before planning the journey home."
			);
		} else if (rec.f === "glasshouse") {
			body.push(
				"Only invited guests can enter the Glasshouse. A scanner beside the private lift checks each visitor's account. Seeing somebody arrive does not give anyone else permission to enter."
			);
		}
		const history = this.chronology(rec);
		if (history.length) body.splice(w.body.filter(Boolean).length, 0, ...history);
		body.push(...this.explanation(rec, c));
		// A follow-up keeps the new account and chronology, rather than printing the same explainer again.
		const explained = new Set();
		for (const [ph, at, n, sp, id, q] of rec.h ?? []) {
			const earlier = this.story(Object.assign({}, rec, { ph, at, n, sp, id, q, h: [] }));
			for (const p of earlier.body) explained.add(setup.arcologyNews.normalize(p));
		}
		const tone = w.tone ?? (rec.sp === 2 ? "investigation" : "routine");
		return {
			cat: setup.arcologyNews.families[rec.f].cat,
			title: w.title,
			dek: w.dek ?? "",
			body: body.filter((p, i) => p && (i < w.body.filter(Boolean).length || !explained.has(setup.arcologyNews.normalize(p)))),
			tone,
			lean: fam.lean,
			byline: w.byline,
		};
	},

	/* Writers for each family and stage. Each returns { title, dek, body[] } and may set tone or byline. */
	chronology(rec) {
		const history = rec.h ?? [];
		// One newsroom-style line naming the earlier reports by date and headline; the full text stays under "More on this story".
		const told = history
			.filter((x, i) => i === 0 || i >= history.length - 2)
			.map(([ph, at, n, sp, id, q]) => {
				const earlier = Object.assign({}, rec, { ph, at, n, sp, id, q, h: [] });
				const d = new DateTime(at);
				const month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][d.month - 1];
				return `${d.day} ${month}, “${this.families[rec.f][ph].call(this, earlier, this.context(earlier)).title}”`;
			});
		if (!told.length) return [];
		const later = told.slice(1);
		return [`This follows our report of ${told[0]}${later.length ? `, and our ${later.length > 1 ? "updates" : "update"} of ${later.join(" and ")}` : ""}.`];
	},

	/* The numbered summary above a longer report: the opening sentence of each longer paragraph, so a point never just
	   repeats a one-line paragraph. Short reports and the line about earlier reports are left out. */
	keyPoints(art) {
		if (art.k !== "story" || art.list) return [];
		const points = art.body
			.filter(p => !p.startsWith("This follows our report"))
			.map(p => p.split(/(?<=[.!?])\s+(?=[A-Z])/))
			.filter(parts => parts.length > 1)
			.map(parts => parts[0])
			.slice(0, 3);
		return points.length > 1 ? points : [];
	},

	/* Links only point to retained, already published reporting inside the reader. */
	linkedText(text, id) {
		const N = setup.arcologyNews;
		const current = N.state().arts.find(a => a.id === id);
		if (!current) return [{ text }];
		const candidates = N.state()
			.arts.filter(a => a.id !== id && a.k === "story" && a.at <= Math.min(current.at, N.now()))
			.sort((a, b) => b.at - a.at);
		const names = [];
		for (const o of [N.publicSubject(current).o, current.o2, current.o3].filter(Boolean)) {
			const target = candidates.find(a => [a.o, a.o2, a.o3].includes(o));
			if (target) names.push({ name: N.orgName(o), id: target.id });
		}
		const publicDistrict = N.publicSubject(current).d;
		const district = candidates.find(a => N.publicSubject(a).d === publicDistrict);
		if (district && publicDistrict) names.push({ name: this.district(publicDistrict), id: district.id });
		const parts = [];
		let remaining = text;
		while (remaining) {
			const matches = names
				.map(x => ({ ...x, pos: remaining.toLowerCase().indexOf(x.name.toLowerCase()) }))
				.filter(x => x.pos >= 0)
				.sort((a, b) => a.pos - b.pos || b.name.length - a.name.length);
			const next = matches[0];
			if (!next) {
				parts.push({ text: remaining });
				break;
			}
			if (next.pos) parts.push({ text: remaining.slice(0, next.pos) });
			parts.push({ text: remaining.slice(next.pos, next.pos + next.name.length), id: next.id });
			remaining = remaining.slice(next.pos + next.name.length);
			names.splice(
				names.findIndex(x => x.id === next.id && x.name === next.name),
				1
			);
		}
		return parts;
	},

	explanation(rec, c) {
		const finished = Boolean(setup.arcologyNews.families[rec.f]?.stages[rec.ph]?.out);
		if (rec.f === "business" && rec.s === "expansion" && rec.ph === "withdrawn")
			return [
				`The company has cancelled plans to open the new floor and hire more workers. People who applied for those jobs will not receive a start date. The company says the project became too expensive, but has not explained which costs increased. Its existing location remains open.`,
			];
		if (rec.f === "business" && rec.s === "expansion" && rec.ph === "outcome")
			return [
				`The company has opened the new floor described in earlier reports. It has not said how many people will work there or whether customers will have to wait less time. Prices have not changed.`,
			];
		if (rec.f === "business")
			return [
				{
					expansion: `The extra floor gives the company more room in ${c.D}, but the company will need more staff to use it. It has not confirmed any new employees or opening hours. Customers therefore do not know whether the extra space will reduce waiting times.`,
					contract: `${c.O} says ${c.O2} failed to complete the work it was paid to do. The supplier disagrees, and the payment remains disputed. The companies could agree to settle privately without announcing who was responsible. Neither has said how much money is involved, and public services have not changed.`,
					wages: `Staff are still working, but equipment charges are being taken out of their wages. Workers are questioning the deductions and want to know whether the charges were allowed. Pay statements showing each deduction, together with signed contracts, could help answer that question.`,
					leak: `Investigators need to find out whether the different invoices refer to the same goods. Delivery charges, separate deliveries, or an accounting mistake could explain the different amounts. Comparing each invoice with a delivery record would show whether the company paid twice. The Civic Registry has not confirmed the claim made by the person who provided the documents.`,
					irregular: `Customers want to know which accounts were affected and whether their money has been returned. Even if the company corrects its records, that does not tell customers whether they have received a refund. Dome Broadcast is comparing the company's statements with the documents it has seen.`,
					recall: `Customers can ask the company to check whether a replacement part belongs to the group affected by the recall. Parts sold cheaply on Market Street may have no reliable record of where they came from. The known fault has not been reported in every part the company sells.`,
					stake: `${c.O} has bought part of ${c.O2}, but the size of the purchase may not give it control over the company. Neither side has announced the amount paid or any change for customers. The next developments will be whether employees are informed, the ownership is officially recorded and ${c.O} buys a larger share.`,
				}[rec.s],
			].filter(Boolean);
		if (rec.f === "industry") {
			if (rec.sp === 1)
				return [
					`${c.Oc} says the incident is over and shifts are running as normal. It has not said what checks it made, and no independent inspector has reported. Anyone thinking of taking a shift at ${c.P} has only the company's word for now.`,
				];
			return [
				{
					press: `The press that split during the shift is out of use. Repairing it will get production moving again; finding out why it failed means examining its condition and the warnings workers say they gave. ${
						rec.ph === "incident"
							? "Two workers were treated for burns."
							: (rec.h ?? []).some(([ph, , , sp]) => ph === "incident" && !sp)
							? "Our first report said two workers were treated for burns; there has been no update on them since."
							: "There has been no confirmed account of any injuries."
					}`,
					power: `The factory needs a reliable electricity supply to run a full shift. Engineers can repair the damaged connection, but investigators still need to find out why it failed. Workers and managers disagree about whether the equipment was overloaded or poorly maintained. No inspector has published a finding.`,
					shortage: `Production is waiting on materials that have not arrived yet, so work has slowed down. No other workplace in ${c.D} has reported the same problem.`,
					walkout: `Workers stopped working because they say they have not been paid for overtime already completed. The company could bring them back by agreeing to pay, but the workers would still need to receive that money. Neither side has published the amount owed, and no worker has agreed to be named in a report.`,
				}[rec.s],
				finished
					? ""
					: `Workers planning to travel to ${c.P} need to know whether their shift is running today. ${
							rec.shut ? "Shifts are suspended, and the company has not said when they will start again." : "The disruption has not closed every shift."
					  } Nobody has said how much pay has been lost.`,
			].filter(Boolean);
		}
		if (rec.f === "transit")
			return [
				rec.sp === 1
					? `City Transit says the service is running normally, but has not published a revised timetable or explained the freight movements on the route. Passengers are advised to check the boarding screen rather than rely on the statement.`
					: `${
							rec.ph === "reopen"
								? "Passengers can book the stop again."
								: "Passengers cannot board at the stop or book it until shuttles start stopping there again."
					  } Passengers who decide to walk will have to travel through the district themselves.`,
				rec.ph === "exposed"
					? "City Transit has admitted that freight vehicles used the route when passengers were being told the stop was open. It has not said whether the freight company paid for that access, and passengers have not been offered compensation. Passengers still need to check whether the shuttles have started stopping there again."
					: "The problem is confined to this stop; the rest of the shuttle network is running. Fares are unchanged and no compensation has been announced.",
			];
		if (rec.f === "implant")
			return [
				{
					malfunction: `Patients say their implant interfaces have been restarting since the update. The interfaces begin working again each time, but the interruptions can happen without warning. The clinic has not said whether staff have reproduced the problem during testing or found a way to fix it.`,
					backup: `The complaint concerns people opening patients' stored backup records without permission. The clinic says it checked the list of people who accessed the records, but has not released what the check found. No patients have been identified publicly, and there is no evidence that every backup was accessed.`,
					unlicensed: `An implant installed without a Registry record cannot be compared with an officially approved installation. A clinic can examine the part and look for problems, but the inspection does not prove the implant is safe or that the person who installed it had permission. No information about the patients' conditions has been published.`,
					trial: `The clinic is paying volunteers to test a new implant part, but has not published evidence that it works. Volunteers sign a form agreeing to take part. The clinic has not published the known risks or results from earlier tests, so potential volunteers cannot review that information before deciding.`,
					xchange: `The station has hired more people to serve customers. It has not said how much this will reduce waiting times.`,
				}[rec.s],
			].filter(Boolean);
		if (rec.f === "sweep")
			return [
				finished
					? `During the operation in ${c.D}, officers stopped everyone passing through, including people who had done nothing suspicious. Enforcement has now described how the operation ended.`
					: `During the operation in ${c.D}, officers are stopping everyone passing through, including people who have done nothing suspicious. Until the operation ends, anyone crossing the district has to pass those checks.`,
				`Enforcement has explained why it began the operation, but residents are also asking how officers treated people during the checks. Nobody arrested has been found guilty by a court yet. People who complained about the checks are still waiting for a response.`,
			];
		if (rec.f === "idcheck")
			return [
				finished && rec.ph !== "traced"
					? `The extra checks in ${c.D} have wound down without the Registry saying where the copied records came from. People travelling through the district were still delayed by the extra checks.`
					: finished
					? `The Registry has found where the copied identity records in ${c.D} came from. Anyone could have used a copy, so it did not always identify the real account holder. Officers also stopped people who were travelling legally.`
					: `Investigators are trying to find out how many identity records in ${c.D} have been copied, and by whom. Someone using a copied record may not be the real account holder. Officers are also stopping people travelling legally.`,
				`The Registry has not named anyone whose record was copied, and Dome Broadcast will not either. If the Registry reduces the checks, that will not prove every copied record has been found.`,
			];
		if (rec.f === "feud")
			return [
				`${c.Oc} and ${c.O2} are fighting over streets in ${c.D} where people live, trade, and pass through every day. Neither crew represents the people living there. Even if one crew claims control of a street corner, fighting may still make the area dangerous.`,
				finished
					? "The fighting has ended, whether the crews agreed to stop, another crew took over, or Enforcement intervened. None of them means either crew has given up on the district."
					: "There is no sign yet of the fighting ending. The crews could start again at any time, and neither one's claim to control the street has been confirmed.",
			];
		if (rec.f === "smuggle")
			return [
				`${c.Oc} has lost a shipment, but that alone does not say which crew took it. Investigators will need evidence from the missing shipment before deciding whether an accusation is correct.`,
				"If the goods are found, traders will know the missing shipment has been recovered. There is no sign of a wider shortage, and no other business has been linked to the case.",
			];
		if (rec.f === "nightlife")
			return [
				rec.s === "raid"
					? "Checks at the door decide who gets in and what happens to the people already inside; island clearance is unchanged. No guest has been accused of anything, and nobody has been named."
					: `The event affects ${c.O} and the streets nearby. Other venues in ${c.D} have not announced changes to their opening hours. Getting in does not guarantee entry anywhere else, and nobody has promised extra shuttles for the journey home.`,
			];
		if (rec.f === "glasshouse")
			return [
				`The Glasshouse does not publish its guest list. People outside can sometimes see visitors arriving, but that does not reveal what happens inside, whether guests use their real names or why someone might be absent.`,
				"Dome Broadcast can report which visitors were seen arriving from the street. Nobody has confirmed what was discussed inside the Glasshouse.",
			];
		if (rec.f === "market" || rec.f === "crash") {
			const kind =
				rec.ph === "first" && ["accumulate", "selloff", "pump"].includes(rec.s)
					? "rumour"
					: ["announce", "denied", "deny", "cancelled", "statement"].includes(rec.ph)
					? "statement"
					: ["result", "report", "aftermath", "depressed"].includes(rec.ph)
					? "analysis"
					: "confirmed";
			return [
				{
					rumour: "So far it is only a rumour. Anyone trading on it is betting both that it is true and that the price has not already moved.",
					statement:
						"A company statement tells you what the company wants you to know, and plans can change. The Exchange's trade records show what was actually bought and sold.",
					confirmed:
						"The Exchange has confirmed that these trades took place. Their effect on the price also depends on how much Cipher other traders are buying or selling, and whether traders expected the news.",
					analysis: "A past rise does not guarantee another rise. Prices can keep increasing, fall suddenly, or stop falling without warning.",
				}[kind],
				"The prices in this report were correct when it was published. Cipher prices can change at any time. You pay more to buy Cipher than you receive when selling it, so check both current prices on the terminal before trading.",
			];
		}
		return [];
	},

	families: {
		sweep: {
			lean: { agree: 1.4, worried: 1.2 },
			why: {
				robberies: "a run of street robberies",
				crews: "repeated fights between local crews",
				complaints: "complaints from shop owners",
				missing: "two residents who stopped answering their implants last week",
			},
			how: {
				patrol: ["foot patrols", "officers on every corner"],
				checkpoint: ["implant checkpoints", "scanners at both ends of the street"],
				drones: ["drone patrols", "camera drones over the rooftops"],
			},
			announce(rec, c) {
				const why = this.families.sweep.why[rec.c];
				const how = this.families.sweep.how[rec.s];
				return {
					title: this.pick(rec, "t", [
						`Enforcement plans ${how[0]} in ${c.D}`,
						`${c.D} to get ${how[0]} from tomorrow`,
						`Enforcement responds to ${why} in ${c.D}`,
					]),
					dek: `The operation follows ${why}.`,
					body: [
						this.pick(rec, "a", [
							`Island Enforcement will start ${how[0]} in ${c.D} tomorrow morning, citing ${why}.`,
							`From tomorrow, residents of ${c.D} should expect ${how[1]}. Island Enforcement says the operation is a response to ${why}.`,
						]),
						rec.s === "checkpoint"
							? "Anyone passing through will be asked to present their implant. Guests should keep their registration current."
							: this.pick(rec, "b", ["No end date has been given.", "A spokesperson would not say how many officers are involved."]),
						this.again(rec, "operation"),
					],
				};
			},
			active(rec, c) {
				const how = this.families.sweep.how[rec.s];
				const first = {
					patrol: "Patrols are moving through side streets as well as the main road.",
					checkpoint: "Every pedestrian is being scanned at the checkpoints.",
					drones: "Camera drones were over the rooftops before dawn.",
				}[rec.s];
				return {
					title: this.pick(rec, "t", [`${this.cap(how[0])} begin in ${c.D}`, `${c.D} wakes up to ${how[1]}`, `Operation under way in ${c.D}`]),
					dek: this.pick(rec, "d", ["Street reports from the district fell sharply on the first day.", "Residents describe a quieter, slower street."]),
					body: [
						`Officers arrived in ${c.D} shortly after dawn. ${first}`,
						this.pick(rec, "b", [
							"Shopkeepers said the usual groups outside their doors had gone by mid-morning.",
							"Several residents said it took them twice as long as usual to get to work.",
							"Enforcement did not say how long the operation would last.",
						]),
					],
				};
			},
			arrests(rec, c) {
				const n = 3 + (rec.n % 9);
				return {
					title: this.pick(rec, "t", [`${n} detained in ${c.D} operation`, `Enforcement reports ${n} arrests in ${c.D}`]),
					body: [
						`Island Enforcement says ${n} people have been detained since the operation in ${c.D} began. It has not said what they are accused of.`,
						this.pick(rec, "b", [
							"Relatives of two of the detained gathered outside the Enforcement office on Civic Boulevard.",
							"Officers will stay in the district for at least another day.",
						]),
					],
				};
			},
			complaint(rec, c) {
				return {
					tone: "investigation",
					title: this.pick(rec, "t", [`${c.D} residents question how the operation is run`, `Complaints mount over stops in ${c.D}`]),
					body: [
						`Residents of ${c.D} say they are being stopped repeatedly on their own street. One worker told Dome Broadcast about being scanned four times on the way to a single shift.`,
						"Island Enforcement says the checks are routine and that anyone with a current registration has nothing to worry about.",
					],
				};
			},
			review(rec, c) {
				return {
					tone: "investigation",
					title: `Civic office to review the ${c.D} operation`,
					body: [
						`The Civic Registry has asked for a review of the stops made in ${c.D}. Officers have left the district.`,
						"Island Enforcement says it will cooperate fully.",
					],
				};
			},
			ends(rec, c) {
				if (rec.sp)
					return {
						title: this.pick(rec, "t", [`${c.D} cleared, Enforcement says`, `Operation ends with ${c.D} "back under control"`]),
						dek: "Island Enforcement says the district no longer needs extra officers.",
						body: [
							`Island Enforcement has ended its operation in ${c.D}, saying the groups responsible for the trouble have left the district for good.`,
							"A spokesperson described the operation as a complete success and thanked residents for their patience.",
						],
						byline: "Island Enforcement statement",
					};
				return {
					title: this.pick(rec, "t", [`Operation in ${c.D} winds down`, `Officers leave ${c.D}`]),
					body: [
						`Island Enforcement has ended its operation in ${c.D}. Patrols return to their normal schedule from today.`,
						this.pick(rec, "b", [
							"Shop owners said it was quieter while it lasted, but doubted it would stay that way.",
							"No figures for the operation have been published.",
						]),
					],
				};
			},
			exposed(rec, c) {
				return {
					title: `Crews back in ${c.D} days after "success"`,
					dek: "Footage shared by residents contradicts the official account.",
					body: [
						`Days after Island Enforcement said ${c.D} had been cleared, residents shared footage of the same groups back on the main street.`,
						"Asked about the footage, Island Enforcement said it would not comment on material it had not verified.",
					],
				};
			},
		},

		idcheck: {
			lean: { worried: 1.6, angry: 1.1 },
			what: { copies: "copied identity chips", cloned: "cloned guest IDs", backups: "stolen copies of registry backups" },
			found(rec, c) {
				const what = this.families.idcheck.what[rec.s];
				return {
					title: this.pick(rec, "t", [`Registry finds ${what} in use`, `${this.cap(what)} turn up at ${c.D}`, `Identity checks tightened after ${what} found`]),
					body: [
						`The Civic Registry says ${what} were used to pass a door scanner in ${c.D} this week.`,
						rec.s === "copies"
							? "A copied chip carries the same permissions as the original. It keeps working even if the owner's chip is destroyed."
							: "Registry staff say the copies are good enough to fool a standard scanner.",
						`Extra implant checks are in place in ${c.D} from today.`,
					],
				};
			},
			tighten(rec, c) {
				return {
					title: this.pick(rec, "t", [
						`Longer queues as ${c.D} checks continue`,
						`Registry adds second scan in ${c.D}`,
						`Second day of ID checks in ${c.D}`,
						`${c.D} checks extended`,
					]),
					body: [
						`Visitors to ${c.D} are being scanned twice while the Civic Registry looks into the ${this.families.idcheck.what[rec.s]}.`,
						"Guests are advised to carry nothing that copies or shields their implant signal.",
					],
				};
			},
			traced(rec, c) {
				const src = { market: "a stall behind Market Street", insider: "an employee with registry access", unknown: "a seller nobody has named" }[rec.c];
				return {
					title: this.pick(rec, "t", [`Registry traces fake IDs to ${src}`, `Source of ${c.D} fake IDs found`, `${c.D} ID checks end after source found`]),
					body: [`The Civic Registry says the ${this.families.idcheck.what[rec.s]} found in ${c.D} came from ${src}.`, "The extra checks have ended."],
				};
			},
			quiet(rec, c) {
				return {
					title: this.pick(rec, "t", [
						`${c.D} checks end with no answers`,
						`Registry gives up search for ${c.D} copies`,
						`No source found for fake IDs in ${c.D}`,
					]),
					body: [`The extra implant checks in ${c.D} have ended. The Civic Registry has not said where the ${this.families.idcheck.what[rec.s]} came from.`],
				};
			},
		},

		feud: {
			lean: { worried: 1.5, angry: 1.2, funny: 0.6 },
			over: { corner: "a street corner", debt: "an unpaid debt", route: "a delivery route" },
			clash(rec, c) {
				const over = this.families.feud.over[rec.s];
				const holds = rec.hold ? ` ${c.Oc} has run that part of ${c.D} for some time.` : "";
				return {
					tone: rec.sev === 3 ? "alert" : "routine",
					title: this.pick(rec, "t", [
						`Fight in ${c.D} as crews fall out over ${over}`,
						`${c.Oc} and ${c.O2} clash in ${c.D}`,
						`Crew dispute interrupts ${c.D} streets`,
					]),
					dek: `Witnesses say it started over ${over}.`,
					body: [
						`Members of ${c.O} and ${c.O2} fought in ${c.D} late last night. Witnesses say the argument was about ${over}.${holds}`,
						this.pick(rec, "b", ["Three people were treated for injuries.", "Nobody has been arrested.", "A shop window on the corner was broken."]),
						this.again(rec, "fight between crews"),
					],
				};
			},
			retaliation(rec, c) {
				return {
					tone: "alert",
					title: this.pick(rec, "t", [
						`Second night of trouble in ${c.D}`,
						`${c.D} feud spreads to side streets`,
						`${c.Oc} hits back in ${c.D}`,
						`Stall burned as ${c.D} dispute goes on`,
					]),
					body: [
						`The dispute between ${c.O} and ${c.O2} continued in ${c.D} last night. Someone set fire to a stall owned by a person connected to ${c.O}.`,
						"Residents say they are staying in after dark.",
					],
				};
			},
			enforcement(rec, c) {
				return {
					title: this.pick(rec, "t", [
						`Enforcement moves into ${c.D} to end crew fighting`,
						`Officers sent to separate ${c.O} and ${c.O2}`,
						`Patrols arrive as ${c.D} feud drags on`,
					]),
					body: [
						`Island Enforcement sent officers into ${c.D} after two nights of fighting between ${c.O} and ${c.O2}.`,
						"Patrols will stay for several days.",
					],
				};
			},
			truce(rec, c) {
				return {
					title: this.pick(rec, "t", [`Quiet returns to ${c.D}`, `${c.D} crews call off their dispute`]),
					body: [
						`The fighting in ${c.D} has stopped. People who know both crews say ${c.O} and ${c.O2} have agreed to keep to their own streets.`,
						"Nobody from either group would talk to Dome Broadcast.",
					],
				};
			},
			takeover(rec, c) {
				return {
					tone: "alert",
					title: `${c.O2c} takes over in ${c.D}`,
					body: [
						`${c.O2c} now controls the part of ${c.D} that ${c.O} used to run, according to stallholders who pay one or the other.`,
						"Expect more trouble for a few days while the new arrangement settles.",
					],
				};
			},
		},

		smuggle: {
			lean: { worried: 1.1, funny: 1.2 },
			goods: { crates: "freight crates", parts: "implant parts", medical: "clinic supplies" },
			missing(rec, c) {
				const g = this.families.smuggle.goods[rec.s];
				return {
					title: this.pick(rec, "t", [
						`${this.cap(g)} go missing at ${c.D}`,
						`${c.Oc} reports missing ${g}`,
						`${c.Oc} delivery vanishes in ${c.D}`,
						`Goods disappear between ship and store in ${c.D}`,
					]),
					body: [
						`${c.Oc} says ${g} disappeared between unloading and collection in ${c.D}.`,
						this.pick(rec, "b", ["The company has not said what was inside.", "Enforcement has been told."]),
						"Residents report unfamiliar couriers moving through the district at night.",
					],
				};
			},
			statement(rec, c) {
				if (rec.sp)
					return {
						title: `${c.Oc} blames ${c.O2} for missing goods`,
						body: [
							`${c.Oc} says ${c.O2} took the missing ${this.families.smuggle.goods[rec.s]} from ${c.D}, and has asked Enforcement to act.`,
							"The company did not say what evidence it has.",
						],
						byline: `Statement from ${c.Oc}`,
					};
				return {
					title: this.pick(rec, "t", [
						`${c.Oc} offers reward for missing goods`,
						`Search continues for missing ${this.families.smuggle.goods[rec.s]}`,
						`Couriers questioned over ${c.D} shipment`,
						`${c.Oc} asks ${c.D} for help finding its goods`,
					]),
					body: [
						`${c.Oc} is offering a reward for information about the goods missing from ${c.D}.`,
						"Couriers in the district say they have been asked about it several times.",
					],
				};
			},
			found(rec, c) {
				return {
					title: this.pick(rec, "t", [
						`Missing ${this.families.smuggle.goods[rec.s]} found`,
						`${c.Oc} gets most of its goods back`,
						`Storage unit search turns up ${c.O}'s shipment`,
					]),
					body: [`The goods ${c.O} reported missing were found in a storage unit near ${c.D}. Some of the contents are still unaccounted for.`],
				};
			},
			unresolved(rec, c) {
				return {
					title: this.pick(rec, "t", [`${c.Oc} writes off missing goods`, `${c.D} shipment never found`, `${c.Oc} stops searching`]),
					body: [`${c.Oc} has stopped looking for the ${this.families.smuggle.goods[rec.s]} that disappeared in ${c.D}.`],
				};
			},
			exposed(rec, c) {
				return {
					title: `Missing goods linked to ${c.O3}, not ${c.O2}`,
					dek: `${c.Oc}'s earlier claim does not hold up.`,
					body: [
						`Couriers in ${c.D} say the ${this.families.smuggle.goods[rec.s]} were moved by people working for ${c.O3}. ${c.Oc} had blamed ${c.O2}.`,
						`${c.Oc} has withdrawn its statement.`,
					],
				};
			},
		},

		industry: {
			lean: { worried: 1.2, angry: 1.2 },
			noun: { press: "a press failure", power: "a power fault", shortage: "a supply shortage", walkout: "a walkout" },
			incident(rec, c) {
				if (rec.sp)
					return {
						title: rec.s === "walkout" ? `Short meeting at ${c.P}, work continues` : `Minor fault at ${c.P}, work continues`,
						body: [
							rec.s === "walkout"
								? `${c.Oc} says staff at ${c.P} held a short meeting this morning and that every shift is running as normal.`
								: `${c.Oc} says a small fault at ${c.P} was fixed within the hour and that shifts are running as normal.`,
						],
						byline: `Statement from ${c.Oc}`,
					};
				const noun = this.families.industry.noun[rec.s];
				const what = {
					press: `A press at ${c.P} in ${c.D} split during the morning shift. Two workers were treated for burns.`,
					power: `${c.Pc} in ${c.D} lost power for most of the morning shift.`,
					shortage: `${c.Pc} in ${c.D} is running short of materials.`,
					walkout: `Workers at ${c.P} in ${c.D} walked out at the start of the shift.`,
				}[rec.s];
				const why = {
					wear: "Workers say the problem had been reported before.",
					overload: "The operators say the equipment was running above its rating.",
					supplier: "A delayed delivery is being blamed.",
					pay: "They say they have not been paid for overtime since last month.",
				}[rec.c];
				const shut = rec.shut ? `${c.Pc} has stopped all shifts until further notice.` : `Work at ${c.P} continues at a slower pace.`;
				return {
					title: this.pick(rec, "t", [
						`${c.Pc} hit by ${noun}`,
						`${this.cap(noun)} at ${c.P}`,
						rec.s === "walkout" ? `Work stops at ${c.P}` : `${c.D}: trouble at ${c.P}`,
					]),
					dek: shut,
					body: [`${what} ${why}`, shut, this.again(rec, "stoppage")],
				};
			},
			exposed(rec, c) {
				return {
					title: `${c.Pc} shut, despite company statement`,
					body: [
						`Workers turned away from ${c.P} say every shift has been cancelled since ${this.families.industry.noun[rec.s]}. ${
							c.Oc
						} had said work was continuing as normal.`,
						"The notice at the entrance gives no date for reopening.",
					],
				};
			},
			dispute(rec, c) {
				if (rec.s === "shortage")
					return {
						tone: "investigation",
						title: `${c.Pc} workers question supply arrangements`,
						body: [
							`Workers from ${c.P} say the shortage was reported weeks earlier and the ticket closed without action.`,
							`${c.Oc} says every machine passed its last check. That statement addresses equipment checks, rather than the complaint about supplies.`,
						],
					};
				if (rec.s === "walkout")
					return {
						tone: "investigation",
						title: this.pick(rec, "t", [`${c.Pc} pay talks stall`, `No deal yet at ${c.P}`]),
						body: [`Workers from ${c.P} say ${c.O} has refused to discuss the missing overtime.`, `${c.Oc} says pay was calculated correctly.`],
					};
				return {
					tone: "investigation",
					title: this.pick(rec, "t", [`${c.Pc} workers question safety record`, `Workers say ${c.P} problem was reported weeks ago`]),
					body: [
						`Workers gathered outside ${c.P} this morning. Several told Dome Broadcast the problem had been reported weeks earlier and the ticket closed without action.`,
						`${c.Oc} says every machine passed its last check.`,
					],
				};
			},
			inspection(rec, c) {
				return {
					title: this.pick(rec, "t", [`Inspectors sent to ${c.P}`, `Civic inspection at ${c.P}`]),
					body: [
						`Civic inspectors arrived at ${c.P} with an Enforcement escort. Officers are checking passes along ${c.D}.`,
						"Street incidents in the district dropped after they arrived.",
					],
				};
			},
			repair(rec, c) {
				const t = {
					press: [`Repairs under way at ${c.P}`, `New press ordered for ${c.P}`],
					power: [`Engineers called in at ${c.P}`, `Power being restored at ${c.P}`],
					shortage: [`${c.Pc}: deliveries on the way`, `${c.Pc} waits for supplies`],
					walkout: [`Talks begin at ${c.P}`, `${c.Oc} meets workers`],
				}[rec.s];
				const b = {
					press: "Engineers are fitting a replacement press.",
					power: "Engineers are replacing the damaged supply line.",
					shortage: "A delivery is expected within days.",
					walkout: `${c.Oc} and the workers' representatives met this morning.`,
				}[rec.s];
				return {
					title: this.pick(rec, "t", t),
					body: [
						`${b} ${
							rec.shut ? (rec.s === "walkout" ? "Shifts stay cancelled until there is a deal." : "Shifts stay cancelled until then.") : "Some work has resumed."
						}`,
					],
				};
			},
			reopen(rec, c) {
				return {
					title: this.pick(rec, "t", [`${c.Pc} back to normal`, `${c.Pc} reopens`, `Work resumes at ${c.P}`, `${c.D} workers back at ${c.P}`]),
					body: [
						rec.s === "walkout" ? `Workers have returned to ${c.P} after ${c.O} agreed to pay the overtime.` : `${c.Pc} is running normally again.`,
						rec.shut ? "Work can be booked again from today." : "",
					],
				};
			},
			report(rec, c) {
				return {
					tone: "investigation",
					title:
						rec.s === "shortage"
							? `Inspectors find ignored supply warnings at ${c.P}`
							: rec.s === "walkout"
							? `Inspectors find unpaid overtime at ${c.P}`
							: `Inspection report blames ${rec.c === "wear" ? "worn parts" : "poor maintenance"} at ${c.P}`,
					body: [`The civic report into ${c.P} found that the operators ignored earlier warnings. ${c.Oc} has been fined.`],
				};
			},
		},

		transit: {
			lean: { angry: 1.3, funny: 1.1 },
			out(rec, c) {
				if (rec.sp)
					return {
						title: this.pick(rec, "t", [`Brief signal fault on the ${c.D} route, now fixed`, `${c.D} shuttles running normally after short delay`]),
						body: [`City Transit says a short signal fault delayed shuttles near ${c.D} this morning. The stop is back in service.`],
						byline: "City Transit notice",
					};
				const why = { maintenance: "for maintenance", inspection: "while inspectors check the platform", interference: "after shuttles failed to stop there" }[
					rec.s
				];
				return {
					tone: "notice",
					title: this.pick(rec, "t", [`${c.D} shuttle stop closed`, `Shuttles skip ${c.D}`]),
					body: [
						`The shuttle stop at ${c.D} is closed ${why}. Shuttles will not stop there until further notice.`,
						"Passengers can walk from the nearest open stop. Travel times may be longer.",
						this.again(rec, "closure"),
					],
					byline: "City Transit notice",
				};
			},
			statement(rec, c) {
				if (rec.sp)
					return {
						title: this.pick(rec, "t", [
							"City Transit: all public stops in service",
							`City Transit says ${c.D} route is running`,
							`No disruption on the ${c.D} route, operator says`,
						]),
						body: [`City Transit says every public stop, including ${c.D}, is running to timetable.`],
						byline: "City Transit notice",
					};
				return {
					title: rec.s === "interference" ? `City Transit cannot explain ${c.D} closures` : `${c.D} stop to reopen soon`,
					body: [
						rec.s === "interference"
							? `City Transit says shuttles are skipping ${c.D} on their own. Engineers have not found a fault.`
							: `City Transit expects to reopen the ${c.D} stop shortly.`,
					],
				};
			},
			conflicting(rec, c) {
				return {
					tone: "investigation",
					title: this.pick(rec, "t", [`Residents report the ${c.D} stop is dark`, `Mixed messages on the ${c.D} route`]),
					body: [
						`${rec.sp ? "City Transit says the stop is open" : "City Transit says engineers are on site"}, but passengers in ${
							c.D
						} say no shuttle has stopped there for days and the stop screen is dark.`,
						rec.sp
							? "Several said they had seen freight carts parked in the shuttle bay at night."
							: "Engineers have been seen on the platform, but nobody has said what they found.",
					],
				};
			},
			suspect(rec, c) {
				return {
					tone: "investigation",
					title: `Freight carts seen in the ${c.D} shuttle bay`,
					body: [`Residents have shared footage of freight carts using the closed ${c.D} stop at night.`, "City Transit says it is looking into the reports."],
				};
			},
			exposed(rec, c) {
				return {
					title: `Tidewater Freight used the ${c.D} route, Transit admits`,
					dek: "Earlier notices said the stop was running.",
					body: [
						`City Transit has confirmed that Tidewater Freight convoys were given the ${c.D} route at night, and that public shuttles were held back to make room.`,
						"Earlier notices said the stop was in service. City Transit says those notices were based on information from the freight company.",
					],
				};
			},
			reopen(rec, c) {
				return {
					tone: "notice",
					title: `${c.D} shuttle stop back in service`,
					body: [`Shuttles are stopping at ${c.D} again.`],
					byline: "City Transit notice",
				};
			},
		},

		business: {
			lean: { agree: 0.8, disagree: 1.2, funny: 1.1 },
			mediation(rec, c) {
				return {
					title: `Registry holds talks about ${c.O} dispute`,
					body: [
						rec.s === "wages"
							? `Staff representatives and ${c.O} have brought payroll records to the Civic Registry. Both sides have agreed to talks; no payment has been confirmed.`
							: `${c.Oc} and ${c.O2} have agreed to mediation. The disputed invoices remain unpaid while the Registry reviews the work records.`,
					],
				};
			},
			withdrawn(rec, c) {
				return {
					title: `${c.Oc} withdraws ${rec.s === "stake" ? "investment offer" : "expansion plan"}`,
					body: [
						rec.s === "stake"
							? `${c.Oc} has abandoned plans to increase its holding in ${c.O2}. The share already registered remains unchanged.`
							: `${c.Oc} has cancelled the planned opening after reviewing its costs. The extra space will remain unused; applicants have been told hiring is suspended.`,
					],
				};
			},
			audit(rec, c) {
				return {
					tone: "investigation",
					title: `Registry requests ${c.O} procurement records`,
					body: [
						`The Civic Registry is comparing the leaked purchasing documents with invoices from ${c.O}. It has not determined whether any rules were broken.`,
					],
				};
			},
			unresolved(rec, c) {
				return {
					title: `${c.Oc} review ends without agreement`,
					body: [
						rec.s === "leak"
							? `The Registry could not authenticate all the leaked documents. It has closed this review without a finding; the disputed purchases remain unexplained.`
							: `Talks involving ${c.O} have ended without a settlement. The disputed payments remain outstanding. No further meeting has been announced.`,
					],
				};
			},
			news(rec, c) {
				const t = {
					expansion: [`${c.Oc} expands on ${c.D}`, `${c.Oc} opens a second floor in ${c.D}`],
					contract: [`${c.Oc} and ${c.O2} in contract dispute`, `${c.Oc} stops paying ${c.O2}`],
					irregular: [`Questions over ${c.O}'s accounts`, `Missing cipher at ${c.O}?`],
					recall: [`${c.Oc} recalls a batch of parts`, `${c.Oc} asks customers to return faulty parts`],
					stake: [`${c.Oc} buys into ${c.O2}`, `${c.Oc} takes a stake in ${c.O2}`],
					wages: [`Staff challenge ${c.O} payroll deductions`, `Payroll dispute at ${c.O}`],
					leak: [`Purchasing records leaked from ${c.O}`, `${c.Oc} faces questions over supplier invoices`],
				}[rec.s];
				const b = {
					expansion: `${c.Oc} has taken on more space in ${c.D} and says it will hire. It has not said how many people.`,
					contract: `${c.Oc} has stopped paying ${c.O2} under a service contract, saying the work was not done. ${c.O2c} disagrees.`,
					irregular: `Former staff say transfers through ${c.O} were logged under the wrong accounts for several months.`,
					recall: `${c.Oc} has asked customers to return a batch of parts with a known fault. Sellers on Market Street are already offering cheap copies of the replacements.`,
					stake: `${c.Oc} has bought a share of ${c.O2}. Neither side has said how much was paid.`,
					wages: `Staff at ${c.O} say deductions for equipment have appeared on their pay statements without explanation. They are seeking repayment, while work continues.`,
					leak: `Documents sent to Dome Broadcast appear to show repeated purchases from one supplier at different prices. The source says they came from ${c.O}; the full set has not been authenticated.`,
				}[rec.s];
				return { title: this.pick(rec, "t", t), body: [b], tone: ["leak", "irregular"].includes(rec.s) ? "investigation" : "routine" };
			},
			response(rec, c) {
				if (rec.sp)
					return {
						title: `${c.Oc}: internal review finds no wrongdoing`,
						body: [`${c.Oc} says its own review found every transfer correctly recorded. It will not publish the review.`],
						byline: `Statement from ${c.Oc}`,
					};
				const b = {
					contract: `${c.O2c} says it will take the dispute to the Civic Registry if it is not paid this week.`,
					wages: `${c.Oc} says the deductions follow its employment terms. Staff representatives have asked for the signed agreements and an itemised calculation.`,
					leak: `${c.Oc} says the leaked invoices omit delivery costs and has offered records to the Registry. It has not released those records publicly.`,
					irregular: `${c.Oc} says the transfers were a system error and have been corrected.`,
					recall: "Returned parts are being replaced at the counter. Customers should not buy replacements from street sellers.",
					stake: `Staff at ${c.O2} say they were told about the deal after it was signed.`,
					expansion: `${c.Oc} says the first new staff start next week.`,
				}[rec.s];
				const t = {
					contract: [`${c.O2c} threatens to take ${c.O} to the Registry`, `${c.Oc} contract row deepens`],
					wages: [`${c.Oc} defends equipment deductions`, `Staff ask ${c.O} for signed pay terms`],
					leak: [`${c.Oc} disputes leaked invoice comparison`, `${c.Oc} offers purchasing records to Registry`],
					irregular: [`${c.Oc} blames a system error`, `${c.Oc} says the accounts are corrected`],
					recall: [`Recall: return parts to the counter, not the street`, `${c.Oc} replaces recalled parts`],
					stake: [`${c.O2c} staff learned of the deal late`, `Questions inside ${c.O2} over new owner`],
					expansion: [`${c.Oc} hiring starts next week`, `${c.Oc} names a start date`],
				}[rec.s];
				return { title: this.pick(rec, "t", t), body: [b] };
			},
			exposed(rec, c) {
				return {
					tone: "investigation",
					title: `Records contradict ${c.O}'s review`,
					body: [`Records seen by Dome Broadcast show transfers through ${c.O} still logged under the wrong accounts after its review said otherwise.`],
				};
			},
			outcome(rec, c) {
				const b = {
					contract: `${c.Oc} and ${c.O2} have settled their dispute. The terms are private.`,
					wages: `${c.Oc} has agreed to refund the disputed equipment deductions. Staff representatives say the next pay statements will be checked against the agreement.`,
					leak: `The Registry has matched the invoices to delivery records. The price differences included freight charges; it found no evidence of duplicate payment in the documents reviewed.`,
					irregular: `${c.Oc} has repaid the customers affected by the wrong transfers.`,
					recall: `${c.Oc} says the recall is complete.`,
					stake: `${c.Oc}'s stake in ${c.O2} has been registered.`,
					expansion: `${c.Oc}'s new floor is open.`,
				}[rec.s];
				const t = {
					contract: [`${c.Oc} and ${c.O2} settle`, `${c.Oc} and ${c.O2} end their contract row`],
					wages: [`${c.Oc} agrees to refund pay deductions`, `Payroll settlement reached at ${c.O}`],
					leak: [`Registry reconciles ${c.O} invoices`, `Delivery records explain ${c.O} price differences`],
					irregular: [`${c.Oc} repays affected customers`, `${c.Oc} account errors repaid`],
					recall: [`${c.Oc} recall complete`, `Last recalled parts returned`],
					stake: [`${c.Oc} stake in ${c.O2} registered`, `${c.Oc} deal is done`],
					expansion: [`${c.Oc} opens its new floor`, `${c.Oc} expansion finished`],
				}[rec.s];
				return { title: this.pick(rec, "t", t), body: [b] };
			},
		},

		implant: {
			lean: { worried: 1.6 },
			report(rec, c) {
				const w = {
					malfunction: [`Patients report faults in ${c.O} implants`, "Several patients say their implants restart without warning since a recent update."],
					backup: ["Who can read your implant backup?", "Former registry staff say backup copies were viewed by people with no reason to see them."],
					unlicensed: [
						"Unlicensed implant work spreads in the Underpass",
						"People in the Underpass are installing implants without registering them with the Civic Registry.",
					],
					trial: [`${c.Oc} recruits for paid trials`, `${c.Oc} is paying volunteers to test a new implant part.`],
					xchange: ["Queues at the X-Change Station", "Visitors are queueing outside the X-Change Station on Relay Street."],
				}[rec.s];
				return { title: w[0], body: [w[1], rec.s === "trial" ? "Clinic staff are approaching people in the street." : ""] };
			},
			response(rec, c) {
				if (rec.sp)
					return {
						title: `${c.Oc}: no fault found in implants`,
						body: [`${c.Oc} says its tests found nothing wrong and the restarts were caused by patients' own settings.`],
						byline: `Statement from ${c.Oc}`,
					};
				const b = {
					malfunction: `${c.Oc} has offered free checks to anyone with the affected part.`,
					backup: "The Civic Registry says access to backups is logged and has been reviewed.",
					unlicensed: "Clinics on Medtech Street are offering to check parts fitted elsewhere.",
					trial: `${c.Oc} says every volunteer signs a consent form.`,
					xchange: "The X-Change Station says it has added staff at the counter.",
				}[rec.s];
				const t = {
					malfunction: [`${c.Oc} offers free checks`, `${c.Oc} answers patients`],
					backup: ["Registry defends backup access", "Registry: every viewing is logged"],
					unlicensed: ["Clinics offer checks on street implants", "Medtech Street responds to chip cutters"],
					trial: [`${c.Oc} defends its trials`, `${c.Oc} answers questions about trials`],
					xchange: ["X-Change Station adds staff", "Shorter queues promised on Relay Street"],
				}[rec.s];
				return { title: this.pick(rec, "t", t), body: [b] };
			},
			exposed(rec, c) {
				return {
					tone: "investigation",
					title: `${c.Oc} patients still reporting restarts`,
					body: [`More patients have come forward since ${c.O} said its implants had no fault. Two say the restarts started after their check-up.`],
				};
			},
			fixed(rec, c) {
				return {
					title: this.pick(
						rec,
						"t",
						{
							malfunction: [`${c.Oc} update ends restarts`, "Implant restarts fixed, patients say"],
							backup: ["Registry changes who can open backups", "Backup access tightened"],
							unlicensed: ["Underpass chip cutters move on", "Fewer street implants reported"],
							trial: [`${c.Oc} ends its trial`, `${c.Oc} trial closes to volunteers`],
							xchange: ["X-Change Station queues ease", "Queues on Relay Street shorter"],
						}[rec.s]
					),
					body: [
						{
							malfunction: `${c.Oc} says a new update has stopped the restarts.`,
							backup: "The Civic Registry has cut the number of staff who can open a backup.",
							unlicensed: "Clinics report fewer patients with unregistered parts this week.",
							trial: `${c.Oc} has stopped taking volunteers.`,
							xchange: "Queues outside the X-Change Station are back to normal.",
						}[rec.s],
					],
				};
			},
			ongoing(rec, c) {
				return {
					title: this.pick(rec, "t", [
						"Implant complaints continue",
						"No answer for implant patients",
						"Patients still waiting for answers",
						"Implant problem drags on",
					]),
					body: ["The complaints have not stopped, and nobody has taken responsibility."],
				};
			},
		},

		nightlife: {
			lean: { funny: 1.4, agree: 1.1 },
			notice(rec, c) {
				const t = {
					opening: [`${c.Oc} plans a big night`, `${c.Oc} promises its loudest night of the season`],
					noise: [`${c.Oc} extends its hours`, `${c.Oc} to stay open until dawn`],
					betting: ["Big fight night at the Static Room", "The Static Room's biggest bout of the month"],
					raid: [`Enforcement warns ${c.O}`, `${c.Oc} told to check guests' implants`],
				}[rec.s];
				const b = {
					opening: `${c.Oc} in ${c.D} says tomorrow night will be its busiest of the season.`,
					noise: `${c.Oc} in ${c.D} will stay open until morning tomorrow. Neighbours have already complained.`,
					betting: "The Static Room has announced its biggest bout of the month for tomorrow night. Bets are already open.",
					raid: `Island Enforcement has told ${c.O} in ${c.D} to scan every guest's implant at the door.`,
				}[rec.s];
				return { title: this.pick(rec, "t", t), body: [b] };
			},
			night(rec, c) {
				const b = {
					opening: `Queues outside ${c.O} reached the end of ${c.D}. Pickpockets worked the line.`,
					noise: `${c.Oc} stayed open until morning. Neighbours complained about the noise and the crowd outside.`,
					betting:
						"After the main fight at the Static Room, several people who had placed bets began fighting each other. The argument continued outside in the street.",
					raid: `Officers checked every guest leaving ${c.O}. Several left by the back door.`,
				}[rec.s];
				const t = {
					opening: [`Queues around the block at ${c.O}`, `${c.Oc} packed until dawn`],
					noise: [`Neighbours complain after ${c.O}'s late night`, `${c.Oc} keeps ${c.D} awake`],
					betting: ["Static Room bout ends in a brawl", "Fight breaks out between people who placed bets at the Static Room"],
					raid: [`Officers check every guest at ${c.O}`, `${c.Oc} raided, guests scanned`],
				}[rec.s];
				return { title: this.pick(rec, "t", t), body: [b] };
			},
			after(rec, c) {
				return {
					title: this.pick(rec, "t", [`${c.D} cleans up after a long night`, `Morning after on ${c.D}`, `${c.Oc} stays quiet after busy night`]),
					body: [`Street cleaners worked through the morning in ${c.D}. ${c.Oc} has not commented.`],
				};
			},
		},

		/* Cipher market stories. rec.q holds the real figures at publication: [price in pence, % since the first report, % over the last day]. */
		market: {
			lean: { worried: 1.3, disagree: 1.1 },
			price(rec) {
				return rec.q ? setup.arcologyFx.gbp(rec.q[0]) : "";
			},
			move(v) {
				if (v === null || v === undefined) return "";
				if (v <= -99.9) return "down more than 99.9%";
				return Math.abs(v) < 0.5 ? "little changed" : `${v > 0 ? "up" : "down"} ${Math.abs(v).toFixed(1)}%`;
			},
			/* The price sentence every market report carries, from the publication snapshot. */
			quote(rec, since) {
				const M = setup.arcologyNewsText.families.market;
				if (!rec.q) return "";
				const [, s, day] = rec.q;
				if (since && s !== null && Math.abs(s) >= 0.5)
					return `At publication, 1 Cipher traded at ${M.price(rec)} on the Unit Exchange, ${M.move(s)} since our first report.`;
				if (since) return `At publication, 1 Cipher traded at ${M.price(rec)} on the Unit Exchange, little changed since our first report.`;
				return day === null
					? `At publication, 1 Cipher traded at ${M.price(rec)} on the Unit Exchange.`
					: `At publication, 1 Cipher traded at ${M.price(rec)} on the Unit Exchange, ${M.move(day)} over the previous day.`;
			},
			first(rec, c) {
				const M = this.families.market;
				if (rec.s === "accumulate")
					return {
						title: this.pick(rec, "t", [`Traders report talk of ${c.O} buying Cipher`, `${c.Oc} said to be preparing a Cipher purchase`]),
						dek: "Unconfirmed. No order has been seen.",
						body: [
							`Several traders at the Unit Exchange say ${c.O} has been asking about buying a large amount of Cipher. The company has not confirmed a purchase, and Dome Broadcast has not seen an order.`,
							rec.sp
								? `People close to ${c.O} have described the plan to traders as one of the largest this year. They gave no amount and no date.`
								: this.pick(rec, "b", ["Nobody would say how much Cipher was involved.", "The traders did not say where the information came from."]),
							M.quote(rec),
						],
					};
				if (rec.s === "selloff")
					return {
						title: this.pick(rec, "t", [`Large Cipher sales traced to ${c.O}, traders say`, `Traders link heavy Cipher selling to ${c.O}`]),
						dek: "Unconfirmed. The company has not commented.",
						body: [
							`Traders at the Unit Exchange say a run of large sell orders over the past day came from accounts connected to ${c.O}. The company has not commented, and the orders have not been matched to it in any public record.`,
							M.quote(rec),
						],
					};
				if (rec.s === "withdraw")
					return {
						title: this.pick(rec, "t", [`${c.Oc} cuts back its Cipher trading desk`, `${c.Oc} withdraws reserves from the Cipher market`]),
						dek: "Confirmed by the company.",
						body: [
							`${c.Oc} has confirmed it is reducing the reserves it uses to buy and sell Cipher at the Unit Exchange. It says the move concerns its own ${
								{ reserves: "reserve rules", contracts: "contract payments", confidence: "risk limits" }[rec.c]
							}.`,
							"Fewer buyers are offering to purchase Cipher at the Exchange. This has increased the difference between the buying and selling prices, so even small trades can cause larger changes.",
							M.quote(rec),
						],
					};
				if (rec.s === "scandal")
					return {
						title: this.pick(rec, "t", [`Questions over missing Cipher at ${c.O}`, `${c.Oc} reserves smaller than reported, documents suggest`]),
						dek: "Allegation. No finding has been made.",
						body: [
							`Documents seen by Dome Broadcast suggest ${c.O} holds less Cipher in reserve than it tells its customers. The company says the documents are incomplete.`,
							"No regulator has made a finding. A gap on paper can come from timing or accounting rather than missing funds; the records needed to tell the difference have not been published.",
							M.quote(rec),
						],
					};
				return {
					title: this.pick(rec, "t", [`Posts claim ${c.O2} is about to buy Cipher`, `Channel posts predict a ${c.O2} Cipher purchase`]),
					dek: "Unconfirmed claims from anonymous accounts.",
					body: [
						`Posts on public channels claim ${c.O2} is about to buy Cipher in bulk. The accounts posting them are anonymous. ${c.O2c} has not commented, and no order has been seen.`,
						M.quote(rec),
					],
				};
			},
			announce(rec, c) {
				const M = this.families.market;
				return {
					title: this.pick(
						rec,
						"t",
						rec.sp
							? [`${c.Oc} promises a major Cipher purchase`, `${c.Oc} talks up plan to buy Cipher`]
							: [`${c.Oc} confirms plan to buy Cipher`, `${c.Oc} to add Cipher to its reserves`]
					),
					dek: "Company announcement. Purchases have not been confirmed.",
					body: [
						rec.sp
							? `${c.Oc} says it will make "one of the largest Cipher purchases the island has seen". The statement gives no amount and no timetable.`
							: `${c.Oc} has confirmed it intends to buy Cipher for its reserves over the coming days. It did not give an amount.`,
						"An announcement is a statement of intent. Some traders buy Cipher as soon as the company announces its plan, hoping the price will rise. Those traders may then sell their Cipher to the company after it begins buying.",
						M.quote(rec, true),
					],
				};
			},
			buying(rec, c) {
				const M = this.families.market;
				const s = rec.q?.[1] ?? 0;
				return {
					title:
						s >= 2 ? `Institutional buying pushes Cipher higher` : s <= -2 ? `Cipher slips despite ${c.O} purchases` : `Cipher holds steady as ${c.O} buys`,
					dek: "Confirmed transactions.",
					body: [
						`Unit Exchange records show large buy orders settled to ${c.O}'s account over the past day. The company confirmed the purchases but not their total.`,
						M.quote(rec, true),
						"The company's purchases increase demand for Cipher while the buying continues. When the company stops buying, that extra demand disappears. The records do not show how much more Cipher the company plans to buy.",
					],
				};
			},
			scaled(rec, c) {
				const M = this.families.market;
				return {
					title: this.pick(rec, "t", [`${c.Oc} buys less Cipher than it announced`, `${c.Oc} Cipher purchase smaller than promised`]),
					dek: "Exchange records compared with the company's statement.",
					body: [
						`Exchange records show ${c.O} has bought far less Cipher than its announcement suggested. The company now calls the purchases "complete for this period".`,
						rec.sp
							? "The original statement used language that implied an unusually large order. It never gave a figure, so the records cannot show it was false; they show it was much smaller than many traders assumed."
							: "",
						M.quote(rec, true),
					],
				};
			},
			cancelled(rec, c) {
				const M = this.families.market;
				return {
					title: this.pick(rec, "t", [`${c.Oc} drops Cipher purchase plan`, `${c.Oc} cancels planned Cipher buying`]),
					dek: "Company announcement.",
					body: [
						`${c.Oc} says it will no longer buy Cipher as planned, citing ${
							{ reserves: "a review of its reserves", contracts: "a contract delay", confidence: "market conditions" }[rec.c]
						}.`,
						M.quote(rec, true),
					],
				};
			},
			denied(rec, c) {
				const M = this.families.market;
				const who = rec.s === "pump" ? c.O2 : c.O;
				return {
					title: this.pick(rec, "t", [`${this.cap(who)} denies plan to buy Cipher`, `${this.cap(who)}: "No Cipher purchase planned"`]),
					dek: "Company statement.",
					body: [
						`${this.cap(who)} says it has no plan to buy Cipher and has placed no such order.`,
						rec.s === "pump"
							? "The accounts that made the original claims are still anonymous. Nobody has said who they belong to."
							: "The traders who described the plan have not said where their information came from.",
						M.quote(rec, true),
					],
				};
			},
			deny(rec, c) {
				const M = this.families.market;
				return {
					title: this.pick(rec, "t", [`${c.Oc} says it is not selling Cipher`, `${c.Oc} rejects reports of reserve sales`]),
					dek: "Company statement.",
					body: [
						`${c.Oc} says its Cipher reserves are unchanged and calls the reports of selling "speculation".`,
						"It has not published its account balances.",
						M.quote(rec, true),
					],
				};
			},
			exposed(rec, c) {
				const M = this.families.market;
				if (rec.s === "pump")
					return {
						title: this.pick(rec, "t", [`Cipher purchase claims traced to ${c.O}`, `Registry links Cipher posts to ${c.O}`]),
						dek: "Civic Registry finding.",
						tone: "investigation",
						body: [
							`The Civic Registry has linked the anonymous posts about a ${c.O2} purchase to accounts associated with ${c.O}. Those accounts bought Cipher before the posts appeared and sold after the price rose.`,
							`${c.O2c} was not involved. It never planned the purchase the posts described.`,
							M.quote(rec, true),
						],
					};
				return {
					title: this.pick(rec, "t", [`${c.Oc} sold Cipher while denying it, records show`, `Records contradict ${c.O}'s statement on Cipher sales`]),
					dek: "Exchange records compared with the company's statement.",
					tone: "investigation",
					body: [
						`Exchange records reviewed by Dome Broadcast show ${c.O} kept selling Cipher after it said its reserves were unchanged.`,
						`${c.Oc} now says the sales were "routine adjustments". It has not explained the earlier statement.`,
						M.quote(rec, true),
					],
				};
			},
			selling(rec, c) {
				const M = this.families.market;
				const s = rec.q?.[1] ?? 0;
				return {
					title: s <= -3 ? `Cipher falls as ${c.O} sells reserves` : `${c.Oc} confirms Cipher reserve sales`,
					dek: "Confirmed transactions.",
					body: [
						`${c.Oc} has confirmed it is selling part of its Cipher reserves. It says the sales cover ${
							{ reserves: "a change in its reserve rules", contracts: "contract payments due in pounds", confidence: "a cut in its exposure to Cipher" }[rec.c]
						}.`,
						M.quote(rec, true),
						"The company has not said how much it still intends to sell.",
					],
				};
			},
			rout(rec, c) {
				const M = this.families.market;
				return {
					title: this.pick(rec, "t", ["Selling spreads across the Cipher market", "More traders rush to sell Cipher"]),
					dek: "Market report.",
					tone: "alert",
					body: [
						`Other holders joined the selling after ${c.O}'s sale was confirmed. Exchange staff describe queues of sell orders and few buyers.`,
						M.quote(rec, true),
					],
				};
			},
			absorbed(rec, c) {
				const M = this.families.market;
				return {
					title: this.pick(rec, "t", [`Cipher steadies after ${c.O} sale`, `Buyers return after ${c.O} sale`]),
					dek: "Market report.",
					body: [`Buyers have taken up the Cipher ${c.O} sold, and trading has calmed.`, M.quote(rec, true)],
				};
			},
			intervene(rec, c) {
				const M = this.families.market;
				return {
					title: this.pick(rec, "t", [`${c.O2c} steps in to buy Cipher`, `${c.O2c} buys Cipher to calm the market`]),
					dek: "Confirmed transactions.",
					body: [
						`${c.O2c} says it has bought Cipher on the Unit Exchange to steady prices after ${
							rec.s === "withdraw" ? `${c.O} pulled back from the market` : `the sales by ${c.O}`
						}.`,
						"It has not said how long it will keep buying.",
						M.quote(rec, true),
					],
				};
			},
			audit(rec, c) {
				const M = this.families.market;
				return {
					title: `Registry reviews ${c.O}'s Cipher reserves`,
					dek: "Review under way.",
					body: [`The Civic Registry has started a review of the Cipher reserves ${c.O} reports. ${c.Oc} says it will cooperate.`, M.quote(rec, true)],
				};
			},
			cleared(rec, c) {
				const M = this.families.market;
				return {
					title: `Review finds ${c.O}'s Cipher reserves complete`,
					dek: "Civic Registry finding.",
					body: [
						`The Civic Registry found that ${c.O}'s reserves match its records. It said the documents first reported were out of date.`,
						M.quote(rec, true),
					],
				};
			},
			confirmed(rec, c) {
				const M = this.families.market;
				return {
					title: `Review confirms a gap in ${c.O}'s Cipher reserves`,
					dek: "Civic Registry finding.",
					tone: "investigation",
					body: [
						`The Civic Registry found that ${c.O} holds less Cipher than it reported to customers. It has not yet said how the gap arose or who is responsible.`,
						M.quote(rec, true),
					],
				};
			},
			dump(rec, c) {
				const M = this.families.market;
				return {
					title: this.pick(rec, "t", ["Cipher drops as heavy selling follows purchase claims", "Large sales hit Cipher after rumoured purchase"]),
					dek: "Market report.",
					body: [`A run of large sell orders hit the Unit Exchange today. No purchase by ${c.O2} has been confirmed.`, M.quote(rec, true)],
				};
			},
			result(rec, c) {
				const M = this.families.market;
				const s = rec.q?.[1];
				const subject = {
					accumulate: `${c.O}'s purchase`,
					selloff: `${c.O}'s reserve sales`,
					withdraw: `${c.O}'s withdrawal`,
					scandal: `the review of ${c.O}`,
					pump: "the false purchase claims",
				}[rec.s];
				return {
					title: `How Cipher moved during ${subject}`,
					dek: "Analysis.",
					body: [
						s === null || s === undefined
							? M.quote(rec)
							: `Across the reports on ${subject}, Cipher went from ${setup.arcologyFx.gbp(rec.q[0] / (1 + s / 100))} to ${M.price(rec)}, ${M.move(s)}.`,
						"The figures show the change in price during this period. Other trades were happening at the same time, so this report cannot explain every reason for the change.",
					],
				};
			},
			report(rec) {
				const M = this.families.market;
				const day = rec.q?.[2] ?? 0;
				return {
					title: this.pick(rec, "t", [
						`Cipher ${M.move(day)} in a day`,
						day > 0 ? "Exchange reports unusual buying in Cipher" : "Exchange reports unusual selling in Cipher",
					]),
					dek: "Unit Exchange figures.",
					body: [
						`Cipher is ${M.move(day)} over the past day. At publication, 1 Cipher traded at ${M.price(rec)} on the Unit Exchange.`,
						"No company or authority has announced anything that explains the move. Exchange staff describe ordinary buying and selling, heavier than usual.",
					],
				};
			},
		},
		/* The collapse. rec.s is the cause, rec.q the real price at publication, rec.cz how far the crisis had reached
		   into the city then (setup.arcologyFx.crisis), so consequences are only reported once they exist. */
		crash: {
			lean: { worried: 1.8, angry: 1.4 },
			cause(rec, c) {
				return {
					liquidity: `${c.Oc} and ${c.O2} withdrew the standing orders that normally buy Cipher from sellers`,
					reserve: `${c.O} was found to hold far less Cipher in reserve than its customers' balances require`,
					counterfeit: `Cipher created outside the Civic Registry was sold on the exchange in large amounts`,
				}[rec.s];
			},
			signs(rec, c) {
				const M = this.families.market;
				return {
					title: this.pick(rec, "t", ["Unusual surge in institutional Cipher selling", "Exchange records heavy selling from institutional accounts"]),
					dek: "Market report. No cause has been confirmed.",
					body: [
						`Several institutional accounts placed unusually large sell orders on the Unit Exchange overnight. ${
							rec.s === "counterfeit"
								? "Some of the selling accounts were opened only days ago."
								: `Traders link part of the selling to accounts that deal with ${c.O}.`
						}`,
						M.quote(rec),
						"No organisation has explained the selling, and the exchange has not published who placed the orders.",
					],
				};
			},
			liquidity(rec, c) {
				const M = this.families.market;
				/* The Unit Exchange and the Halden Trust run the standing orders; whoever is at fault speaks for the market. */
				const speaker = rec.s === "reserve" ? c.Oc : "The Unit Exchange";
				return {
					title: "Unit Exchange cuts trading support as buyers vanish",
					dek: "Confirmed by the exchange.",
					tone: "alert",
					body: [
						"The Unit Exchange has stopped placing its own standing orders to buy Cipher, saying its reserves are under pressure. The Halden Trust has done the same.",
						rec.sp
							? `${speaker} says the move is "a routine precaution" and that customer balances are fully backed.`
							: "With the largest buyers absent, the gap between buying and selling prices has widened sharply.",
						M.quote(rec),
					],
				};
			},
			collapse(rec, c) {
				const M = this.families.market;
				const below = rec.q && rec.q[0] < 100;
				return {
					title: below ? `Cipher collapses below £1` : this.pick(rec, "t", ["Cipher collapses in panic selling", "Cipher loses most of its value"]),
					dek: "Breaking. Trading suspended during the fall.",
					tone: "breaking",
					body: [
						`Cipher's value collapsed after it emerged that ${this.families.crash.cause(
							rec,
							c
						)}. The Unit Exchange suspended trading for fifteen minutes as the price fell.`,
						M.quote(rec, true),
						below || (rec.q && rec.q[0] < 300000)
							? "The Civic Registry has issued an emergency order: guest accounts may sell Cipher but not buy it until the market stabilises. Order sizes are limited and the gap between buying and selling prices is very wide."
							: "Order sizes are limited and the gap between buying and selling prices has widened sharply.",
						"Island services still charge in Cipher. Wallet balances keep their quantity, but each Cipher now buys far less in pounds, and people paid in Cipher receive much less when they exchange their wages for pounds.",
					],
				};
			},
			statement(rec, c) {
				const M = this.families.market;
				return {
					title:
						rec.s === "reserve"
							? `${c.Oc} denies reserve shortfall`
							: rec.s === "counterfeit"
							? "Unit Exchange denies its systems were breached"
							: `${c.Oc} defends withdrawal from the market`,
					dek: "Company statement.",
					body: [
						rec.s === "reserve"
							? `${c.Oc} says its reserves "remain sound" and blames "speculative selling by third parties" for the fall. It has not published its account balances.`
							: rec.s === "counterfeit"
							? `The Unit Exchange says "no system under its control" created the Cipher that was sold, and that the problem lies with "external accounts". It has not explained how those accounts were able to sell the amounts recorded.`
							: `${c.Oc} says it withdrew to protect its own reserves and will return "when conditions allow". It gives no date.`,
						M.quote(rec, true),
					],
				};
			},
			runs(rec, c) {
				const M = this.families.market;
				return {
					title: this.pick(rec, "t", ["Residents queue at the Halden Trust", "Crowds gather outside the Halden Trust"]),
					dek: "Street report.",
					body: [
						"Hundreds of residents gathered outside the Halden Trust in Exchange Square, many trying to withdraw or exchange their savings. Enforcement officers kept the queue to one side of the square.",
						rec.cz >= 2
							? "The Trust has limited withdrawals to a small amount per account each day. Several shops and bars have stopped accepting Cipher."
							: "The Trust has not limited withdrawals so far, but staff told customers that could change.",
						M.quote(rec, true),
					],
				};
			},
			probe(rec, c) {
				const M = this.families.market;
				return {
					title:
						rec.s === "counterfeit"
							? `Investigators trace counterfeit Cipher to ${c.O}`
							: rec.s === "reserve"
							? `Registry finds missing reserves at ${c.O}`
							: "Registry reviews the exchange's withdrawal",
					dek: "Civic Registry investigation.",
					tone: "investigation",
					body: [
						{
							counterfeit: `The Civic Registry says the Cipher that started the collapse was created through a fault in the exchange's issuance system and sold through accounts linked to ${c.O}. The Unit Exchange's earlier statement that its systems were not involved is contradicted by the Registry's findings.`,
							reserve: `The Civic Registry has confirmed that ${c.O} held far less Cipher than its customers' balances, despite its statement that reserves were sound. The Registry has not said where the missing Cipher went.`,
							liquidity: `The Civic Registry is examining why ${c.O} and ${c.O2} withdrew from the market at the same time. It has made no finding of wrongdoing.`,
						}[rec.s],
						"What is confirmed: the sequence of trades and the size of the fall. What is disputed: who knew first, and whether anyone sold before the public was told.",
						M.quote(rec, true),
					],
				};
			},
			scams(rec) {
				const M = this.families.market;
				return {
					title: this.pick(rec, "t", ["Enforcement warns of Cipher scams", "Fake exchange offers spread as Cipher falls"]),
					dek: "Public warning.",
					tone: "alert",
					body: [
						"Enforcement says reports of fraud have risen since the collapse. The most common are temporary exchange terminals offering old rates, people selling places in a recovery fund, and collectors claiming to work for the Halden Trust.",
						"The Trust says it does not send staff into the street and never charges a fee to protect an account. The Unit Exchange is the only place to convert Cipher.",
						M.quote(rec, true),
					],
				};
			},
			raids(rec) {
				const M = this.families.market;
				return {
					title: this.pick(rec, "t", ["Shops raided as the currency crisis deepens", "Raids and street robberies rise in poorer districts"]),
					dek: "City report.",
					tone: "alert",
					body: [
						"Shop owners in the Flats, the Underpass and along Market Street report groups breaking in and taking stock. Several residents were robbed at payment terminals, and crews have fought over supply deliveries.",
						"Enforcement has moved patrols to Exchange Square and the Civic Boulevard. Outside the policed districts, residents say calls for help are going unanswered. Private security is holding back crowds outside closed financial offices.",
						M.quote(rec, true),
					],
				};
			},
			strain(rec) {
				const M = this.families.market;
				return {
					title: this.pick(rec, "t", ["Businesses refuse Cipher as the crisis drags on", "Unpaid wages and closed tills as Cipher stays down"]),
					dek: "City report.",
					body: [
						"Bars, cafes and several shops have stopped accepting Cipher. The health shop on Commerce Walk takes pounds only, and Lumen Clinic has added a crisis charge to its treatments. The Halden Trust is limiting withdrawals, and seawall contractors say each day's pay has been cut in half.",
						"Enforcement reports more scams and street thefts, many involving people offering to exchange Cipher at false rates.",
						M.quote(rec, true),
					],
				};
			},
			services(rec) {
				const M = this.families.market;
				return {
					title: this.pick(rec, "t", ["Work and shuttles cut as the currency crisis deepens", "Compute Floor and foundry stop paid work"]),
					dek: "City report.",
					tone: "alert",
					body: [
						"The Compute Floor and the foundry have suspended paid shifts, saying they cannot meet payroll. City Transit has closed its stops at Breakwater Road, the Flats, and Signal Row to cut costs.",
						rec.cz >= 4
							? "Crews have moved into streets that patrols no longer cover, and fights over cash and goods have been reported in several districts."
							: "Enforcement has increased patrols around Exchange Square.",
						M.quote(rec, true),
					],
				};
			},
			backstop(rec, c) {
				const M = this.families.market;
				return {
					title: "Emergency buying helps Cipher recover",
					dek: "Confirmed transactions.",
					body: [
						`The Civic Registry and ${
							rec.s === "reserve" ? "the Unit Exchange" : "the Halden Trust"
						} have started buying Cipher with emergency funds and say they will keep doing so.`,
						M.quote(rec, true),
						"The emergency purchases have helped the price, but Cipher is still worth much less than before. Shops and workplaces are beginning to operate normally again, though some payment and work restrictions remain.",
					],
				};
			},
			depressed(rec) {
				const M = this.families.market;
				return {
					title: this.pick(rec, "t", ["No emergency support announced for Cipher", "Cipher stays near its lowest price without emergency support"]),
					dek: "Market report.",
					tone: "alert",
					body: [
						"No organisation has announced plans to buy Cipher to help its price recover. Traders expect Cipher to remain worth much less than before for some time.",
						M.quote(rec, true),
						"Businesses that stopped accepting Cipher say they will not resume until the price has been stable for several days.",
					],
				};
			},
			restored(rec) {
				const M = this.families.market;
				return {
					title: "Trading support returns as Cipher recovers",
					dek: "Confirmed by the exchange.",
					body: [
						"The Unit Exchange and the Halden Trust have resumed their standing orders after an independent review of reserves. Cipher has begun rising towards its earlier price.",
						M.quote(rec, true),
						"Shops and employers are reopening gradually. The investigation into the collapse continues.",
					],
				};
			},
			aftermath(rec, c) {
				const M = this.families.market;
				return {
					title: this.pick(rec, "t", ["After the Cipher collapse: what is still disrupted", "The city counts the cost of the Cipher crisis"]),
					dek: "Analysis.",
					body: [
						M.quote(rec, true),
						rec.cz > 0
							? "Some effects are still visible: limits at the Halden Trust, businesses that have not resumed Cipher payments, and more scams on the streets. They are expected to ease over the coming days."
							: "Most visible effects have eased. Shops are accepting Cipher again and paid work has resumed.",
						rec.s === "liquidity" ? `The Registry's review of ${c.O}'s withdrawal has not been published.` : `The investigation into ${c.O} is continuing.`,
					],
				};
			},
		},
		glasshouse: {
			lean: { funny: 1.2, agree: 0.9 },
			announce(rec, c) {
				return {
					title: this.pick(
						rec,
						"t",
						rec.s === "absence"
							? ["Glasshouse gathering, host not expected", "Glasshouse to open without its host", "Empty seat at the Glasshouse?"]
							: ["Glasshouse prepares for a gathering", "Lights on at the Glasshouse", "Invitations out for a Glasshouse evening"]
					),
					body: [
						`Staff were seen preparing the Glasshouse on Relay Street for an invitation-only evening. Guest lists are never published.`,
						rec.s === "absence" ? `People who know the Glasshouse say ${c.O} may not attend.` : "",
					],
				};
			},
			held(rec, c) {
				return {
					title: this.pick(rec, "t", [
						"Private launches arrive at the Glasshouse",
						"Relay Street busy as Glasshouse guests arrive",
						"Glasshouse evening runs late",
					]),
					body: [
						"Guests arrived at the Glasshouse by private launch last night. Relay Street was busy until the early hours.",
						rec.s === "absence" ? `Guests said ${c.O} did not appear.` : `${c.Oc} was seen briefly on the terrace.`,
					],
				};
			},
			gossip(rec, c) {
				return {
					title: this.pick(rec, "t", ["Who was at the Glasshouse?", "Glasshouse guest list stays secret", "Residents guess at Glasshouse guests"]),
					tone: "gossip",
					body: ["Residents spent the morning guessing who had been on the guest list. Dome Broadcast was not able to confirm any names."],
				};
			},
		},
	},

	/* Written at publication, not when opened. Only implemented public services belong in these editions. */
	reminderEdition(topic, st) {
		const a = setup.arcology;
		const closed = Object.keys(a.districts)
			.filter(id => a.districts[id].bus && setup.arcologyNews.stopClosed(id, st))
			.map(id => this.district(id));
		const fx = setup.arcologyFx.sync();
		const rate = setup.arcologyFx.gbp(setup.arcologyFx.mid(fx));
		const editions = {
			identity: {
				title: "Your Island Handle and Digital Identity",
				body: [
					"Your island handle is the name used by Arcology's digital services and public accounts. The implant fitted behind your ear connects you to Holo and carries your island identity record. Using a different name does not delete your records from the city's system.",
					"Open Journal → Holo to check your handle, clearance, accommodation, and wallet. On the island, the interface connects to the city network. Away from the island, Holo shows the information it saved the last time you connected. You must be connected to the city network to post a news comment.",
					"The Civic Registry on Civic Boulevard lets guests check their public record once each day. If other people scan your identity or see you involved in a public incident, your account may become easier to recognise. Guest record backup is unavailable; checking your own record does not create a backup.",
				],
				question: "Does using a handle hide my original identity?",
				answer:
					"Your handle is the username you use on the island. Other people may still recognise your account from identity checks or incidents reported in public.",
				where: "Check your digital identity in Journal → Holo, or visit the Civic Registry on Civic Boulevard to check your public record.",
				comments: [
					"A handle is useful, but I wouldn't treat it as a fresh identity record.",
					"The difference between a cached screen and a live connection is easy to miss.",
				],
			},
			dome: {
				title: "What the Dome Keeps Outside",
				body: [
					"Arcology's streets sit beneath a large transparent dome. The dome keeps rain and seawater outside the streets and buildings beneath it. You can watch rain run down the glass from the dome edge while remaining dry inside.",
					"The glass also blocks much of the sound coming from the sea outside. At the dome edge, waves can be visible against the glass without being audible inside. You can see the waves hitting the glass from inside, even when you cannot hear the water.",
					"Workers inspect and repair panels along Breakwater Road. The public dome-edge viewpoint is reached from that road. The dome protects the streets from rain and seawater. Some districts can still be dangerous to travel through.",
				],
				question: "Why can I see waves without hearing them?",
				answer:
					"The glass enclosure separates the street from the sea. At the dome edge, the waves can be visible outside without their sound reaching you inside.",
				where: "Visit the public dome-edge viewpoint from Breakwater Road. Street conditions and district safety still need to be checked separately.",
				comments: [
					"Seeing rain on the other side of the glass still takes some getting used to.",
					"Dry streets don't mean the crossing outside the dome will be quiet.",
				],
			},
			xchange: {
				title: "What Guests Can Buy at the X-Change Station",
				body: [
					"The X-Change Station is on Relay Street. Its guest counter sells Pink and Blue Basic packs of three for about 6 Cipher, and single Pink or Blue NOW pills for about 2.5 Cipher. Guests can buy one listed product per day.",
					"Changing your body may make it harder for someone who knew your original appearance to recognise you. It does not replace your implant account or remove attention created by public incidents. Travelling in your original body can make some forms of identification easier.",
					"Advanced formulas, body customisation, and pill modification have separate authorization requirements. The advanced desk is not accepting appointments. Seeing a procedure listed on a screen does not mean the guest counter will let you book it.",
				],
				question: "Can I buy several products at the guest counter today?",
				answer: "The guest limit is one listed product each day. A Basic pack contains three pills, but buying that pack still uses today's purchase.",
				where: "Check the guest counter on Relay Street for the current product list and your daily purchase status. Advanced appointments are not available.",
				comments: [
					"The pack size and the daily purchase limit are different things. That needed explaining.",
					"A different face won't make a public fight disappear from the record.",
				],
			},
			cipher: {
				title: "How Cipher Payments and the Guest Vault Work",
				body: [
					"Cipher pays for island services, including guest accommodation, shuttle fares, and guest-counter products. Mainland cash is exchanged at the Unit Exchange in Exchange Square rather than paid directly to those services.",
					`The exchange quotes a live price that moves through the day. At publication, 1 Cipher = ${rate}. Buying costs slightly more than that quoted price and selling returns slightly less, so check both on the terminal before confirming a transaction.`,
					"Halden Trust, also in Exchange Square, keeps a guest vault separate from your spendable wallet. At the booths, you can move all your wallet money into the vault or take all the money out of the vault. Withdraw funds before trying to pay a wallet charge; stored funds are not spent automatically.",
				],
				question: "Will a shuttle fare come out of my vault automatically?",
				answer: "No. Island charges use your Cipher wallet. Withdraw the vault balance at Halden Trust before paying if the wallet does not hold enough.",
				where: "Check prices at the Unit Exchange and wallet/vault balances at Halden Trust in Exchange Square. Journal → Holo also shows your wallet.",
				comments: [
					"Keeping money in the vault is different from having it ready to spend.",
					"The selling price is lower than the buying price. I'd check both before exchanging twice.",
				],
			},
			forex: {
				title: "Understanding Cipher Exchange Rates",
				body: [
					`The Unit Exchange in Exchange Square shows the price of Cipher as "1 Cipher = £X". Amounts can be bought and sold to a thousandth of a Cipher. This is the reference price. You pay a little more when buying and receive a little less when selling. The difference is the Exchange's charge for the trade. At publication, 1 Cipher = ${rate}.`,
					"The price can change while you are using the terminal because people and companies are constantly buying and selling Cipher. Large orders move the price further than small ones, and news about a company's plans can move it before anything has been bought.",
					"If you buy Cipher with pounds and immediately sell it, you will get fewer pounds back because the buying and selling prices are different. A trade only returns more than it cost if the price moves far enough in your favour first, and prices can fall as well as rise. This edition does not suggest that any trade will be profitable.",
					"Cipher held in your wallet or a Halden Trust vault never changes in quantity when the market moves. Only its value in pounds changes.",
				],
				question: "Why did the price change while I was reading the terminal?",
				answer:
					"The exchange updates its price every few seconds from the trades taking place. If the price moves against you before your order goes through, the terminal shows the new total and asks you to confirm again.",
				where: "Use the live terminal at the Unit Exchange in Exchange Square. Market stories appear in Dome Broadcast's Markets section.",
				comments: [
					"Knowing the spread exists would have saved me a bad afternoon.",
					"The number of Cipher in my vault stays the same. It's the pound value that moves.",
				],
			},
			transit: {
				title: "Check Shuttle Service Before Travelling",
				body: [
					"Autonomous shuttles serve the public stops shown on the city route boards. The door scanner checks your implant before boarding. The normal fare is 1 Cipher; an eligible active sponsorship can waive it. The boarding screen shows whether the fare is payable.",
					"A stop can close temporarily during a city incident. You cannot select a closed stop as your destination on the boarding screen. Restricted districts are not served by public shuttle routes. You can still walk to another district if your account allows you to enter it. The City Map, when available to your account, can show you which way to go, but you still have to walk there.",
					closed.length
						? `Route-board snapshot at publication: ${closed.join(", ")} ${closed.length === 1 ? "is" : "are"} out of service.`
						: "Route-board snapshot at publication: no public stop is marked out of service.",
					"This edition keeps its publication-time snapshot. Check the current stop board before boarding, especially after reading an older article. An operator's earlier announcement may not describe what is happening at the stop now.",
				],
				question: "Does this article guarantee my stop is open now?",
				answer: "No. Its route-board snapshot is dated at publication. Check the current stop board; a closure can change after an edition is published.",
				where: "Use the screen at a public shuttle stop. It lists current boarding destinations and any stops out of service, as well as the fare or waiver.",
				comments: ["I check the stop board before planning the trip home from a shift.", "A waived fare doesn't mean a closed stop will be served."],
			},
			safety: {
				title: "Read District Safety Ratings Before Taking a New Route",
				body: [
					"Arcology uses five district classifications: policed, monitored, contested, hostile, and lawless. They describe differences in patrol coverage and street risk, not a promise that every trip will be safe. Conditions can worsen during a crew dispute or change when patrols arrive.",
					"Check the district description, current street notices, and recent reports before taking an unfamiliar route. Quiet side streets and hostile districts carry risks that a busy public avenue may not. Guests should not assume Enforcement will provide the same protection offered to residents.",
					"Dome Broadcast reports statements as well as independent accounts. An organization may understate a problem. If a service board or the street itself conflicts with an earlier report, do not treat that report as a guarantee of safety.",
				],
				question: "Does a policed rating mean nothing can happen there?",
				answer:
					"No classification guarantees safety. It describes the district's general conditions; incidents, your public profile, and the route you take still matter.",
				where:
					"Read the current street description and recent district reports. Authorized map users can also inspect recorded district information, which may be older than present conditions.",
				comments: [
					"A safety label helps, but I'd still look at what is happening on the street.",
					"An official statement and a resident's account aren't always the same story.",
				],
			},
			assessment: {
				title: "Recognition Is Not the Same as a Threat Assessment",
				body: [
					"Recognition concerns how readily your appearance or account can be identified. Arcology's threat assessment concerns how dangerous you are considered. Record reads, public trouble and recent fighting can affect the attention directed at you, but they do not all mean the same thing.",
					"A higher public threat profile can make civilians wary, change how criminals approach you, and bring a more prepared security response. Being considered dangerous does not grant clearance or guarantee that people will leave you alone.",
					"Review Island Threat Assessment in Social → Holo when your public situation changes. Changing your appearance is not a substitute for checking your account status and current authorization.",
				],
				question: "Does a dangerous reputation give me higher clearance?",
				answer:
					"No. Threat assessment and access authorization are separate. A dangerous public profile can bring stronger resistance; it does not unlock guest-restricted services.",
				where: "Check Island Threat Assessment in Social → Holo and read your clearance separately in Journal → Holo's digital identity panel.",
				comments: [
					"I'd rather know when security is paying more attention than mistake it for respect.",
					"People recognizing you and people being afraid of you are different problems.",
				],
			},
			cybernetics: {
				title: "Your Implant Is an Account, Not Full Service Authorization",
				body: [
					"Implants and cybernetic equipment are common in Arcology. Staff use scanners to read account information, and some residents use enhanced eyes, limbs, or other equipment in their work. Similar-looking people may have very different capabilities.",
					"Your basic civilian implant provides island identity and Holo access. Guest registration does not authorize every procedure advertised by clinics or the Registry. The public record check on Civic Boulevard is available to guests, but record backup is explicitly unavailable to guest accounts.",
					"A news report about a clinic trial describes that organization's activity. It is not confirmation that your account can book an augmentation or backup. Read the actual service desk's authorization notice before making plans.",
				],
				question: "Can a guest make a Registry backup?",
				answer: "Guest record backup is unavailable. Guests can check their public record at the Civic Registry; that check does not create a backup.",
				where:
					"The Civic Registry on Civic Boulevard displays your record and its guest restrictions. Clinic and Station desks state their own authorization limits.",
				comments: [
					"The basic implant gets you online. It doesn't make every service available.",
					"I'd read the authorization notice before treating an advert as an appointment.",
				],
			},
			hotel: {
				title: "Check Your Hotel Authorization Before Sponsorship Ends",
				body: [
					"Hotel Meridian provides guest accommodation on Relay Street. A sponsored or paid room remains authorized only until the expiry shown in Holo. Sponsorship is time-limited; its presence in an older article does not extend your stay.",
					`At publication, a standard paid night cost ${a.cx(
						setup.arcologyPrice.peek("night").q
					)} and provides 24 hours of room authorization. Payment comes from the wallet. If sponsorship has ended, check the reception desk for the options your account is offered rather than assuming the room remains covered.`,
					"Guest accommodation does not grant resident clearance, access to restricted services, or permanent permission to enter restricted districts. Separate sponsorship and checkpoint conditions may apply. A revoked guest account should not assume it can renew access simply by holding enough Cipher.",
				],
				question: "Does having a room make me a resident?",
				answer: "No. A paid or sponsored guest room is accommodation, not resident clearance. Its authorization also expires at the time shown in Holo.",
				where: "Check accommodation status and expiry in Journal → Holo, then speak to the Hotel Meridian reception desk about any payment or access issue.",
				comments: [
					"I check the expiry before deciding whether I can afford another night.",
					"Paying for a room and getting resident access are different transactions.",
				],
			},
			shocks: {
				title: "When Cipher Moves, the City Moves With It",
				body: [
					"Every price on the island is set in Cipher, so a large move on the Unit Exchange reaches the streets within hours. A strong rally makes posted prices look cheap; a fall makes the same goods cost more Cipher than they did that morning.",
					"Shops do not all react the same way. Some reprice at the counter every time. Others keep a printed list for days, and a seller who notices that list has fallen behind may honour it, change it before you pay, or refuse the sale outright. In a deep fall, some counters stop accepting Cipher and ask for pounds.",
					"The bigger the move, the wider the damage. A sharp collapse has in the past brought crowds to financial offices, raids on shops holding pounds, scams offering emergency conversions, shuttle stops closing, and wages held back. None of that starts with a small dip, and none of it ends the moment the price recovers.",
				],
				question: "Will prices go back to normal as soon as Cipher recovers?",
				answer:
					"Not straight away. Printed price lists, held wages and closed services catch up over days, and the city stays tense for a while after a large fall.",
				where:
					"Watch the live terminal at the Unit Exchange and the Markets and City sections of Dome Broadcast. Shop counters show whether their price has been corrected.",
				comments: [
					"Last time it crashed, my corner shop wanted pounds by the afternoon.",
					"If a price looks cheap during a crash, the seller has probably noticed too.",
				],
			},
			streets: {
				title: "Read the Street Before You Walk It",
				body: [
					"Residents learn to notice when a district changes. A policed avenue is busy: shoppers, traffic, advert screens playing and a patrol passing every few minutes. In contested and lawless blocks there are fewer screens and fewer open shops, and more people stand in doorways watching who walks past.",
					"If a street you know suddenly empties, with stallholders packing up early and shops pulling their shutters down, leave. Residents who stay safe here take those signs as a warning even when nothing has happened yet.",
					"Turning back costs you a few minutes, while getting cornered in a block that Enforcement does not patrol can cost you far more.",
				],
				question: "How do I tell a dangerous street from a quiet one?",
				answer:
					"A quiet street still has people going about their business. On a dangerous one, people leave, shutters come down, and nobody stops to talk. If you are unsure, go back to a busy, well-lit avenue.",
				where: "Check the district's safety rating on your City Map if you have one, read recent district reports, and pay attention to the street itself.",
				comments: ["When the Flats go quiet at night, everyone on my floor stays in.", "If the stalls are packing up early, so am I."],
			},
			prices: {
				title: "Why Everything on the Island Costs So Much",
				body: [
					"Arcology is priced for the people who can afford to live here. Even a coffee or a drink at a bar costs a full Cipher, and a night at Hotel Meridian costs more than a month's rent on many mainland flats.",
					"Posted prices follow the exchange rate. When a price looks unusually high or low, ask the seller why: the answer is usually today's rate, a list that has not been updated, a shortage, or a counter that only takes pounds during a crisis.",
					"Guests who arrive with only a little Cipher run out quickly. Exchange pounds at the Unit Exchange before you need to pay, and keep enough in your wallet for the room and the shuttle.",
				],
				question: "Is anything on the island cheap?",
				answer:
					"Very little. The cheapest counter items start at about 1 Cipher. Anything priced lower is usually an old list during a market fall, and sellers notice.",
				where: "Every priced counter shows its current price; use the question link beside an unusual price to ask the seller about it.",
				comments: ["I paid a Cipher for a coffee and still had to drink it standing up.", "Nobody comes here to save money."],
			},
			enforcement: {
				title: "What Enforcement Will and Will Not Do for Guests",
				body: [
					"A guest can call Enforcement through the implant during an emergency. Dispatch accepts two calls a day from each account; after that, it stops taking them until the next day.",
					"Help is not guaranteed. Patrols reach policed and monitored districts quickly, contested ones slowly, and lawless blocks rarely. During a crisis every patrol is stretched. A call from an account the city has flagged may bring an identity check, suspicion, or a patrol sent for the caller rather than for the trouble.",
					"Enforcement exists to protect residents. Guests with a sponsor are expected to rely on that sponsor first. A guest without one should keep to lit avenues and avoid giving strangers a reason to look closely.",
				],
				question: "Will a patrol always come if I call?",
				answer:
					"No. Arrival depends on the district, the state of the city, and how your account is flagged. Two calls a day is the limit, and a refused or late call still counts.",
				where: "Check your threat assessment in Social → Holo before relying on a call, and the district rating on your City Map.",
				comments: [
					"They came for my neighbour in four minutes. In the Underpass they didn't come at all.",
					"Two calls a day sounds like plenty until you need a third.",
				],
			},
			work: {
				title: "Earning Cipher Without Exchanging Pounds",
				body: [
					"Guests are allowed some paid work. The compute floor on Commerce Walk pays for an hour solving puzzles, the seawall crews on Breakwater Road take day labour, and the Ironworks foundry pays the most for the heaviest shifts. Each pays once per day.",
					"These wages are modest by island standards: a shift covers a few drinks rather than a hotel night. During a currency crisis some employers hold back part of the pay until the city's accounts settle, and some close their doors entirely.",
					"Work is logged against your record. It is honest income and does not raise your threat profile, but it does not replace exchanging pounds if you plan to stay long.",
				],
				question: "Can a guest live on island wages?",
				answer: "Not comfortably. A day's shift pays for small things; rooms and larger purchases still need Cipher bought at the Unit Exchange.",
				where: "The compute floor is on Commerce Walk, the seawall hatch on Breakwater Road, and the foundry gate in the Ironworks.",
				comments: [
					"Seawall pays better than you'd think, but your hands will hurt for days.",
					"When the foundry closed last crisis, half my street lost its only shift.",
				],
			},
		};
		return Object.assign(editions[topic], {
			dek: {
				identity: "Know what your handle, implant, and public record can tell other people.",
				dome: "The glass enclosure shelters the streets from exterior weather and sound.",
				xchange: "Guest products, the daily purchase limit, and the services that remain restricted.",
				cipher: "Where to exchange mainland cash, and why stored Cipher is separate from your wallet.",
				forex: "What the quoted price means, why buying and selling prices differ, and why the rate keeps moving.",
				transit: "Fares, sponsorship waivers, and a dated snapshot of stop availability.",
				safety: "Understand district classifications without mistaking a rating for a guarantee.",
				assessment: "Public recognition, threat assessment, and access clearance have different effects.",
				cybernetics: "Basic Holo access does not authorize every advertised clinic or Registry service.",
				hotel: "Room payment, sponsorship expiry, and the limits of guest accommodation.",
				shocks: "Large moves on the exchange reach shop counters, wages, transport, and the streets.",
				streets: "A district that suddenly feels different is telling you something.",
				prices: "An expensive city for wealthy visitors, and how to read a price that looks wrong.",
				enforcement: "Two calls a day, uneven patrol coverage, and why a flagged account changes the answer.",
				work: "Daily paid shifts for guests, what they pay, and what happens to them in a crisis.",
			}[topic],
		});
	},

	reminder(rec) {
		const edition = rec.x;
		const voices = this.people.filter(p => ["worker", "loyal"].includes(p[1]));
		return {
			cat: "CITIZEN REMINDER",
			tone: "reminder",
			byline: "Dome Broadcast · Public information",
			heat: 0.25,
			title: edition.title,
			dek: edition.dek || edition.body[0],
			body: edition.body,
			note: "Recurring Citizen Reminder. Rules and service snapshots describe this edition's publication date; check the current service desk for changes.",
			options: [
				[edition.question, "", "question"],
				["Where should I check if this changes?", "", "question"],
			],
			residents: edition.comments.map((line, i) => [voices[(Math.floor(setup.arcologyNews.seed(rec.id) * voices.length) + i) % voices.length][0], line]),
		};
	},

	/* Daily notices. */
	notice(rec) {
		const a = setup.arcology;
		const out = { cat: "NOTICE", tone: "notice", byline: "Dome Broadcast desk", heat: 0.3 };
		if (rec.f === "safety") {
			const d = a.districts[rec.d];
			const tier = a.tierNames[d.tier].toLowerCase();
			const extra = (rec.x ?? []).includes("patrol")
				? " Extra officers are in the district this week."
				: (rec.x ?? []).includes("rough")
				? " Reports of trouble between crews are up this week."
				: "";
			out.title = this.pick(rec, "t", [`${d.name}: ${tier}`, `Safety rating for ${d.name}`]);
			out.body = [
				`Island Enforcement rates ${d.name} as ${tier}.${extra}`,
				[
					"Patrols are frequent and response is quick.",
					"Patrols are regular.",
					"Patrols are limited. Avoid quiet routes after dark.",
					"Patrols are rare. Travel in company.",
					"Enforcement does not patrol here.",
				][d.tier],
			];
			out.place = d.name;
		} else if (rec.f === "transit") {
			const shut = (rec.x ?? []).map(d => this.district(d));
			const stops = Object.values(a.districts).filter(d => d.bus).length;
			out.title = shut.length ? `Shuttle network: ${shut.join(", ")} closed` : `All ${stops} public shuttle stops in service`;
			out.body = [
				shut.length
					? `${stops - shut.length} of ${stops} public stops are in service. ${shut.join(" and ")} ${shut.length > 1 ? "are" : "is"} closed.`
					: "Every public stop is in service.",
				"Restricted districts are not served on public routes.",
			];
			out.byline = "City Transit notice";
		} else if (rec.f === "drift") {
			const [km, dir] = rec.x;
			const way = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"][dir];
			out.title = `Island drifts ${km} km ${way} overnight`;
			out.body = [
				this.pick(rec, "b", [`The island moved ${km} kilometres ${way} overnight.`, `Overnight drift: ${km} kilometres, heading ${way}.`]),
				"Crossings from the mainland may take longer for a few days.",
			];
		} else if (rec.f === "registry") {
			out.title = "Registry: guest record checks and backup restrictions";
			out.body = [
				"Guests can check their public record at the Civic Registry on Civic Boulevard once each day. The guest record screen states that record backup is unavailable; a record check does not make a backup.",
			];
			out.byline = "Civic Registry notice";
		} else if (rec.f === "exchange") {
			out.title = "Unit Exchange: check both prices before trading";
			out.body = [
				"The Unit Exchange in Exchange Square quotes a live price for Cipher in pounds. Buying costs slightly more than the quoted price and selling returns slightly less. The price moves while you watch, so check the terminal before confirming.",
			];
			out.cat = "BUSINESS";
		} else {
			const [t, b] = this.pick(rec, "dome", [
				[
					"Exterior rain stays outside the dome",
					"Rain can be seen running down the exterior glass from the dome-edge viewpoint. The enclosed streets remain sheltered from it.",
				],
				[
					"Dome inspections along Breakwater Road",
					"Workers inspect and repair exterior glass panels along Breakwater Road. The public dome-edge viewpoint is reached from the road.",
				],
				[
					"Civic Boulevard scanners check passing implants",
					"Security drones on Civic Boulevard scan people passing along the avenue. Guest accounts can check their public record at the Civic Registry.",
				],
			]);
			out.title = t;
			out.body = [b];
		}
		out.residents = [];
		return out;
	},

	weekly(rec) {
		const reports = (rec.x ?? []).map(x => Object.assign({}, x, { id: x.id ?? rec.id + x.ph + x.d }));
		const sections = reports.map(x => {
			const c = this.context(x);
			const w = this.families[x.f][x.ph].call(this, x, c);
			const previous = x.h?.at(-1);
			const history = previous
				? (() => {
						const [ph, at, n, sp, id, q] = previous;
						const earlier = Object.assign({}, x, { ph, at, n, sp, id, q, h: [] });
						const d = new DateTime(at);
						const month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][
							d.month - 1
						];
						return [`Last reported ${d.day} ${month}: “${this.families[x.f][ph].call(this, earlier, this.context(earlier)).title}”.`];
				  })()
				: [];
			const explanation = this.explanation(x, c);
			const sentence = p => p.match(/^.*?[.!?](?:\s|$)/)?.[0].trim() ?? p;
			return { title: w.title, id: x.id, paragraphs: [...history, ...w.body.filter(Boolean).slice(0, 1), ...explanation.slice(0, 1).map(sentence)] };
		});
		const places = [...new Set(reports.map(x => this.district(x.d)))];
		const where = places.length > 1 ? `${places.slice(0, -1).join(", ")}${places.length > 2 ? ", and " : " and "}${places.at(-1)}` : places[0];
		const intro = reports.length
			? `The week's main stories came from ${where}. Each story below includes what has happened since our previous report.`
			: "No continuing story stood out this week. Routine notices and Citizen Reminders are in the archive.";
		const connections = [];
		for (let i = 0; i < reports.length; i++)
			for (let j = i + 1; j < reports.length; j++) {
				const a = reports[i];
				const b = reports[j];
				const shared = [a.o, a.o2].filter(Boolean).find(o => [b.o, b.o2].includes(o));
				if (a.d === b.d)
					connections.push(
						`Two of this week's stories, on ${this.context(a).O || "one story"} and ${this.context(b).O || "another"}, both happened in ${this.district(
							a.d
						)}. Anyone heading there should bear both in mind, though nothing so far links one to the other.`
					);
				else if (shared)
					connections.push(
						`${setup.arcologyNews.orgName(
							shared
						)} turns up in two of this week's stories. That is worth noticing, but nothing published so far shows the two are connected.`
					);
			}
		if (connections.length) sections.push({ title: "Worth noticing", paragraphs: connections.slice(0, 2) });
		return {
			cat: "WEEKLY",
			tone: "digest",
			byline: "Dome Broadcast desk",
			title: this.pick(rec, "t", ["The week on the island", "Seven days in review", "This week in the dome"]),
			dek: sections.length ? "What changed this week, what it means for residents, and what is still unknown." : "The week's publication record.",
			body: [intro, ...sections.flatMap(s => s.paragraphs)],
			sections,
			note: rec.i ? `Dome Broadcast also reported ${rec.i} public incident${rec.i > 1 ? "s" : ""} involving visitors.` : "",
			heat: 0.5,
		};
	},

	breakingTypes: {
		assault: [
			"Hotel guest fights Meridian security",
			"A guest of Hotel Meridian fought two hotel security officers in the lobby. Enforcement has opened an inquiry.",
		],
		leak: [
			"Visitor's identity record sold on open channels",
			"A mainland identity record linked to an island username was sent to several buyers today. The Registry reminds guests to report blackmail.",
		],
		raid: [
			"Shop raided as the Cipher crisis drags on",
			"A group forced its way into a small business and took stock and cash in front of witnesses. The owner said Cipher takings had been worth almost nothing for days. A witness reported the raid.",
		],
		fraud: [
			"Enforcement warns of crisis scams",
			"A resident reported a fraud attempt involving fake exchange services. Enforcement says the Halden Trust and the Unit Exchange never send staff into the street and never charge to protect savings.",
		],
		brawl: [
			"Lone visitor beats trained fighters",
			"Enforcement drones recorded a fight in which a single visitor beat armed professionals. Footage was shared widely before it was taken down.",
		],
	},

	breaking(rec) {
		const [title, body] = this.breakingTypes[rec.f] ?? ["Incident reported", "Enforcement is looking into an incident."];
		return {
			cat: "BREAKING",
			tone: "breaking",
			title,
			body: [body, rec.d ? `It happened in ${this.district(rec.d)}.` : ""].filter(Boolean),
			heat: 1,
			lean: { worried: 1.3, funny: 1.2 },
			byline: "Dome Broadcast newsroom",
		};
	},

	/* Resident handles. home: district where the resident lives, so they can describe what they saw there. */
	people: [
		["kettle_9", "worker", "ironworks"],
		["rivet.and.rust", "worker", "ironworks"],
		["dock.saint", "local", "pier"],
		["tidecaller", "local", "breakwater"],
		["saltglass", "local", "flats"],
		["mothlight", "night", "neon"],
		["nullpoint", "skeptic", "underpass"],
		["drip-feed", "local", "market"],
		["grey.wire", "worker", "forge"],
		["sable.r", "worried", "medtech"],
		["ana.plume", "loyal", "exchange"],
		["lux.ember", "loyal", "skyline"],
		["calla.bright", "loyal", "commerce"],
		["hollis.grade", "loyal", "civic"],
		["vanta.mode", "skeptic", "signal"],
		["bitrot", "joker", ""],
		["mira.west", "worried", "relay"],
		["sato.k", "skeptic", ""],
		["quiet.harbour", "worried", "pier"],
		["fennel", "joker", "neon"],
		["ozone.kid", "rumour", "underpass"],
		["paper.moth", "rumour", ""],
		["juniper.n", "loyal", ""],
		["lowlight", "night", "neon"],
		["copperhead", "worker", "forge"],
		["mx.tallow", "joker", ""],
		["static.wren", "rumour", "neon"],
		["harrow.v", "skeptic", "flats"],
		["oriel", "worried", "commerce"],
		["bluegill", "local", "breakwater"],
		["shard77", "rumour", "market"],
		["noor.k", "worker", "commerce"],
	],

	/* What each kind of resident says: [text, categories it fits, or none for any]. {D} district, {O} organisation.
	   Workers only talk about work and night regulars about nights out, so nobody comments off topic. */
	voices: {
		loyal: [
			["Good to see someone dealing with it.", "SECURITY CRIME INDUSTRY CYBERNETICS"],
			["Let them do their jobs.", "SECURITY CRIME"],
			["Thanks for the update."],
			["This is why I pay for a registered address.", "SECURITY CRIME CYBERNETICS"],
			["Some of us just want a quiet street.", "SECURITY CRIME SOCIETY"],
			["Sensible move.", "BUSINESS TRANSIT"],
			["I'm waiting to see whether the price stops changing so much.", "MARKETS"],
			["Nice to read something that isn't a disaster.", "BUSINESS SOCIETY PEOPLE"],
		],
		skeptic: [
			["Whose statement is this, exactly?"],
			["I'll believe it when I see it."],
			["Notice how nobody is named.", "SECURITY CRIME BUSINESS CYBERNETICS MARKETS"],
			["I want to see the actual trade records, not another company statement.", "MARKETS"],
			["Whoever posted it first has already sold.", "MARKETS"],
			["Funny how these always come out on a quiet news day."],
			["Ask who benefits.", "BUSINESS SECURITY CRIME TRANSIT"],
			["Which department wrote this?", "SECURITY TRANSIT"],
			["Their own review cleared them. Of course it did.", "BUSINESS CYBERNETICS INDUSTRY"],
		],
		worried: [
			["Is anyone checking on the people who live there?", "SECURITY CRIME"],
			["I have to go through {D} tomorrow.", "SECURITY CRIME TRANSIT"],
			["This keeps happening."],
			["Stay safe, everyone.", "SECURITY CRIME SOCIETY"],
			["Should I be worried about mine?", "CYBERNETICS"],
			["Half my savings are in Cipher.", "MARKETS"],
			["My wages are paid in Cipher. What are they worth today?", "MARKETS"],
			["My cousin works there. No answer yet.", "INDUSTRY CRIME"],
		],
		joker: [
			["Another day in paradise."],
			["At this point I'd watch it as a series."],
			["Somebody give the drones a raise.", "SECURITY"],
			["My landlord will still find a way to raise the rent.", "BUSINESS INDUSTRY"],
			["Walking is good for you, apparently.", "TRANSIT"],
			["Have they tried turning it off and on again?", "CYBERNETICS INDUSTRY TRANSIT"],
			["Was I invited? No. Am I bitter? Also no.", "PEOPLE SOCIETY"],
			["Bought high, sold low. Living the dream.", "MARKETS"],
		],
		rumour: [
			["A friend says there's more to this."],
			["Heard {O} knew about it a week ago.", "BUSINESS INDUSTRY CRIME CYBERNETICS"],
			["People in {D} have been saying this for days.", "SECURITY CRIME TRANSIT INDUSTRY"],
			["Wait for the second story. There's always a second story."],
			["Someone at the dock says it's about a shipment.", "CRIME TRANSIT"],
			["A friend at the exchange says there's a bigger order coming.", "MARKETS"],
		],
		worker: [
			["Somebody always has to clean up after these things.", "INDUSTRY"],
			["Will we get paid for the lost days?", "INDUSTRY"],
			["Same story every season.", "INDUSTRY BUSINESS"],
			["Half my shift gets here by shuttle.", "TRANSIT"],
			["Contracts like this always end with fewer jobs.", "BUSINESS"],
			["We get paid in Cipher. Nobody asked us about any of this.", "MARKETS"],
		],
		night: [
			["The strip was packed anyway.", "SOCIETY"],
			["Never seen {D} that busy.", "SOCIETY PEOPLE"],
			["Bouncers were on edge all night.", "SOCIETY CRIME"],
			["Best night out this month.", "SOCIETY"],
		],
		local: [["I live on {D}. It's been strange all week."], ["Walked past this morning."], ["Nobody on my street was surprised.", "SECURITY CRIME"]],
	},

	/* What a resident of the district can actually see during each stage. Spun stages put the true picture here. */
	seen: {
		sweep: {
			active: e => (e.s === "drones" ? "Drones over my building since five this morning." : "Officers at both ends of the street this morning."),
			ends: e => (e.sp ? "They're back on the corner already. Took about an hour." : "Patrols gone. Quiet so far."),
			exposed: "Told you.",
		},
		feud: {
			clash: "Heard the fight from my window.",
			retaliation: "Smoke from the corner all night.",
			takeover: "Different people are collecting money from the stalls today.",
		},
		transit: {
			out: e => (e.sp ? "Stop screen's dark. Nothing has stopped here today." : "Walked to the next stop. Twenty minutes."),
			statement: e => (e.sp ? "Still dark. Waited forty minutes for nothing." : "Still closed."),
			conflicting: e => (e.sp ? "Carts in the bay again last night." : "Still nothing stopping here."),
		},
		industry: {
			incident: e => (e.sp && e.shut ? "Notice on the door says all work cancelled." : e.shut ? "We were sent home." : ""),
			dispute: e => (e.s === "walkout" ? "Still no overtime. Still outside." : "Ticket was closed with no comment."),
		},
		smuggle: {
			missing: "Saw couriers moving crates at two in the morning.",
			statement: e => (e.sp ? "The carts I saw had nothing to do with that crew." : ""),
		},
		implant: { response: e => (e.sp ? "Mine restarted twice today." : "") },
		nightlife: { night: "Queue went right past my door." },
		crash: {
			runs: "Queue outside the Trust since six this morning.",
			strain: "My usual bar has a sign up: no Cipher.",
			services: "No shift today, and no notice saying when.",
			scams: "Some guy at the stop was selling a recovery fund. Walked off when I asked who runs it.",
			raids: "The grocer at the end of my block got cleaned out last night.",
			depressed: "Nobody on my street takes Cipher any more.",
		},
	},

	commentIntent(rec, line) {
		if (rec.f === "business" && rec.s === "wages" && rec.ph === "outcome" && /agreement/i.test(line) && /statement/i.test(line) && /check/i.test(line))
			return "business|wages|result|settlement-check";
		const topic = /guest list|invit|attend|host/.test(line.toLowerCase())
			? "attendance"
			: /record|evidence|invoice|proof|finding|verif|review/i.test(line)
			? "evidence"
			: /pay|wage|deduction|refund/i.test(line)
			? "pay"
			: /guest|eligib|authoriz|permission|consent|trial/i.test(line)
			? "eligibility"
			: /queue|counter|opening|reopen|closed|stop|shuttle|boarding|service/i.test(line)
			? "availability"
			: /shift|work|hours/i.test(line)
			? "work"
			: "opinion";
		const end = setup.arcologyNews.families[rec.f]?.stages[rec.ph]?.out ? "result" : "developing";
		return [rec.f, rec.s, end, topic, line.includes("?") ? "ask" : "say"].join("|");
	},

	discussion(rec, candidates, st) {
		const N = setup.arcologyNews;
		const recent = st.arts.filter(a => a.id !== rec.id && a.at >= rec.at - N.KEEP * N.DAY).flatMap(a => a.rc ?? []);
		const out = this.write(rec, false);
		const range =
			rec.k === "notice"
				? [1, 4]
				: rec.k === "reminder"
				? [2, 5]
				: rec.k === "weekly"
				? [3, 8]
				: rec.k === "break" || out.tone === "investigation"
				? [6, 12]
				: rec.sev === 3
				? [5, 10]
				: [3, 7];
		const target = range[0] + Math.floor(N.seed(rec.id + "discussion") * (range[1] - range[0] + 1));
		const chosen = (rec.rc ?? []).filter(c => c[3] === undefined);
		// Every candidate is checked against weeks of earlier comments, so each text is split once and kept across articles.
		if ((this.wordCache?.size ?? 0) > 8192) this.wordCache = this.wordSets = null;
		const split = (this.wordCache ??= new Map());
		const words = text => {
			if (!split.has(text))
				split.set(
					text,
					text
						.toLowerCase()
						.replace(/don't/g, "do not")
						.replace(/[^a-z\s]/g, " ")
						.trim()
						.split(/\s+/)
				);
			return split.get(text);
		};
		const sets = (this.wordSets ??= new Map());
		const setOf = text => sets.get(text) ?? sets.set(text, new Set(words(text))).get(text);
		const redundant = (a, b) => {
			const left = words(a);
			const right = words(b);
			// The same statement explicitly negated is disagreement, not a redundant contribution.
			if (
				left.includes("not") !== right.includes("not") &&
				left.filter(w => !["not", "do"].includes(w)).join(" ") === right.filter(w => !["not", "do"].includes(w)).join(" ")
			)
				return false;
			if (N.similar(a, b)) return true;
			const x = setOf(a);
			const y = setOf(b);
			const common = [...x].filter(w => y.has(w)).length;
			return Math.min(x.size, y.size) >= 5 && common / (x.size + y.size - common) >= 0.78;
		};
		const stats = (this.discussionStats ??= { generated: 0, examined: 0, archive: 0, thread: 0, handle: 0, published: 0 });
		stats.generated += candidates.length;
		for (const candidate of candidates) {
			if (chosen.length >= target) break;
			/* Subjects such as "the opening night" land in templates that already say "the". */
			candidate[1] = candidate[1].replace(/\b(the) the\b/gi, "$1");
			stats.examined++;
			const intent = this.commentIntent(rec, candidate[1]);
			if (intent === "business|wages|result|settlement-check" && chosen.some(c => c[2] === intent)) {
				stats.thread++;
				continue;
			}
			if (chosen.some(c => c[0] === candidate[0])) {
				stats.handle++;
				continue;
			}
			if (chosen.some(c => redundant(c[1], candidate[1]))) {
				stats.thread++;
				continue;
			}
			if (recent.some(c => redundant(c[1], candidate[1]))) {
				stats.archive++;
				continue;
			}
			chosen.push([candidate[0], candidate[1], intent]);
			stats.published++;
		}
		return chosen;
	},

	/* Replies between residents: [line, categories or none for any]. Answers only use what the article or the
	   replier's own home district can show; without that, the replier says nobody knows. */
	threadLines: {
		unknown: [
			["Nobody's said. I'd check again tomorrow."],
			["Report doesn't say. I asked the same thing."],
			["No idea. Nothing's been posted."],
			["Haven't heard anything either."],
		],
		evidence: [
			["Nothing published yet. Just the statement.", "SECURITY CRIME BUSINESS CYBERNETICS INDUSTRY TRANSIT MARKETS"],
			["They haven't released anything. I looked."],
		],
		thanks: [["Thanks."], ["Cheers, that helps."], ["Good to know."], ["Right. Thanks."]],
		shrug: [["Great. So nobody knows."], ["Figures."], ["Brilliant. Thanks anyway."]],
		/* Pushback, keyed by the kind of comment it answers. A third entry is a pattern the parent must match. */
		against: {
			loyal: [
				["They said that last time too.", "", /statement|announce|promis|explain|report|dealing/i],
				["Doing their job would make a nice change.", "SECURITY CRIME TRANSIT", /job|dealing|patrol|enforcement|arrest/i],
				["Wait for the second report before you thank anyone.", "", /thank|good to|glad|sensible|nice/i],
				["Easy to say when it's not your savings.", "MARKETS"],
				["Try saying that on a double shift.", "INDUSTRY BUSINESS", /let them|calm|steady|quiet/i],
				["You've more faith in them than I do."],
				["That's what they want you to think."],
			],
			skeptic: [
				["Or they're just doing their job.", "SECURITY CRIME TRANSIT"],
				["Not everything's a cover-up.", "", /statement|record|review|operation|official|registry|enforcement|evidence|check|explain/i],
				["You'd complain whatever they did.", "", /statement|record|review|operation|official|registry|enforcement|evidence|check|explain/i],
				["Prices go up and down. Calm down.", "MARKETS"],
				["Bit early to call it a scandal."],
				["Give it a day before you decide."],
			],
			joker: [
				["Not funny when it's your street.", "SECURITY CRIME", /\bha\b|joke|laugh|at least|bet |guess I'll|my list|after rent|souvenir|free /i],
				[
					"People could get hurt. Bit early for jokes.",
					"SECURITY CRIME INDUSTRY TRANSIT BREAKING",
					/\bha\b|joke|laugh|at least|bet |guess I'll|my list|after rent|souvenir|free /i,
				],
				["Funny until it's you.", "", /\bha\b|joke|laugh|at least|bet |guess I'll|my list|after rent|souvenir|free /i],
			],
			worker: [
				["At least you've got shifts to complain about.", "INDUSTRY BUSINESS", /shift|wage|pay|work|hours/i],
				["Everyone's got it hard. Not just you.", "", /\b(I|my|we|our)\b.*(hard|tired|again|cut|late)/i],
			],
			worried: [
				["You worry too much.", "", /worr|scared|afraid|hope|careful/i],
				["It's one report. Breathe.", "", /worr|scared|afraid|panic/i],
			],
			local: [["Living there doesn't make you right.", "", /\b(my|our) (street|block|floor|building)\b/i]],
		},
		back: {
			loyal: [["Fine. Let's see what the review says.", "SECURITY CRIME BUSINESS INDUSTRY CYBERNETICS TRANSIT MARKETS"], ["We'll see."]],
			skeptic: [["Name one time they told us everything."], ["Sure. And the next statement will be true as well."]],
			worker: [["Easy for you to say."], ["Come work a shift and say that."]],
			worried: [["I'll stop worrying when it stops happening."]],
			joker: [["Somebody has to laugh."], ["Lighten up."]],
			rumour: [["Believe what you want."], ["You'll see."]],
			local: [["I live here. You don't."]],
			night: [["Whatever you say."]],
		},
		help: [
			["Take the long way round for a few days. That's what I'm doing.", "SECURITY CRIME", /route|go(?:ing)? through|walk|home|street/i],
			["Keep to the main walkways after dark and you'll be fine.", "SECURITY CRIME", /route|go(?:ing)? through|walk|home|street|after dark|night/i],
			["Don't sell in a panic. That's exactly when it costs you most.", "MARKETS", /savings|wages|sell|worth/i],
			["Shuttles were running on the other line this morning.", "TRANSIT", /shuttle|stop|trip|route|travel/i],
		],
		source: [["Source?"], ["Which friend?"], ["Your friend says a lot of things."]],
		same: [
			["Same at ours.", "INDUSTRY BUSINESS MARKETS"],
			["We were told nothing either.", "INDUSTRY BUSINESS", /nothing|no notice|haven't|not told|no answer/i],
		],
		agree: [["Ha. Accurate."], ["Honestly."], ["This."], ["Not wrong."], ["Said it better than I would have."], ["Ha. Fair."]],
		nod: [
			["Fair point."],
			["Agreed."],
			["That's what I'm doing too.", "", /\bI'(ll|m)\b/],
			["Sensible. Half this thread hasn't read past the headline.", "", /check|wait|read|compare/i],
			["Wish more people thought like that."],
			["Exactly what I was going to say."],
			["Glad someone said it."],
			["Same thought here."],
			["Agree with every word of that."],
		],
		close: [["Agree to disagree."], ["Whatever you say."], ["Not worth arguing about."]],
		/* How an argument winds down after the first poster answers back: [replier's line, then optionally the first
		   poster's last word]. Each pair reads as one person answering the other. */
		windDown: [
			["Fine. We'll see by tomorrow.", "We will."],
			["Suit yourself.", ""],
			["I'll leave it there.", "Probably for the best."],
			["We just see it differently, then.", "Seems that way."],
			["Not going to change your mind, am I?", "No."],
		],
		/* A third resident ending a long exchange, and the first poster conceding to that. */
		referee: [
			["You two have this argument under every report.", "Fair. I'm done."],
			["Can we keep the thread to what's actually happened?", "Fair enough."],
			["Both of you, wait for the next report before deciding.", "Fine."],
		],
		welcome: [["No problem."], ["Any time."], ["Stay safe out there."], ["Glad it helped."]],
		/* Following up on a question nobody could answer yet. */
		follow: [["I'll post here if I hear anything."], ["Someone on my floor might know. I'll ask."], ["Watching this too."], ["Same question. Following."]],
	},

	/* Replies under the residents' comments, chosen once when the article is written: [handle, text, intent,
	   parent index, days after publication]. Most comments stand alone; one or two start a short conversation. */
	thread(rec, rc, st) {
		const N = setup.arcologyNews;
		if (rec.k === "weekly" || rc.length < 2) return [];
		const cat = this.write(rec, false).cat;
		const roll = N.seed(rec.id + "thread");
		/* Nearly every story gets talked about: two or three conversations, a notice at least one when it can. */
		const count = rec.k === "notice" ? (roll < 0.85 ? 1 : 0) : rc.length < 4 ? 2 : roll < 0.5 ? 2 : 3;
		if (!count) return [];
		const kindOf = h => this.people.find(p => p[0] === h)?.[1] ?? "";
		const fits = line => !line[1] || line[1].split(" ").includes(cat);
		let parentText = "";
		const recent = new Set(
			st.arts.filter(a => a.id !== rec.id && a.at >= rec.at - N.DAY).flatMap(a => (a.rc ?? []).filter(c => c[3] !== undefined).map(c => c[1]))
		);
		const used = new Set(rc.map(c => c[1]));
		const take = (key, list) => {
			const ok = list.filter(l => fits(l) && (!l[2] || l[2].test(parentText)) && !used.has(l[0]) && !recent.has(l[0]));
			if (!ok.length) return null;
			const line = ok[Math.floor(N.seed(rec.id + key) * ok.length)][0];
			used.add(line);
			return line;
		};
		const seenFn = this.seen[rec.f]?.[rec.ph];
		const seen = typeof seenFn === "function" ? seenFn(rec) : seenFn;
		const outcome = N.families[rec.f]?.stages[rec.ph]?.out;
		/* A reply to `parent` from someone with a reason to answer it, or null when nobody plausibly would. */
		const answer = (parent, n) => {
			const text = parent[1];
			parentText = text;
			const pk = kindOf(parent[0]);
			const others = this.people
				.filter(p => p[0] !== parent[0] && (p[1] !== "night" || ["SOCIETY", "PEOPLE"].includes(cat)))
				.sort((a, b) => N.seed(rec.id + n + a[0]) - N.seed(rec.id + n + b[0]));
			const pickBy = test => others.find(test);
			if (text.includes("?")) {
				if (rec.q && /how much|what (is|was|was it)|worth now|price now|current (price|rate)|price (at|when)/i.test(text)) {
					const who = pickBy(p => ["worker", "local", "skeptic"].includes(p[1]));
					return who && [who[0], `It was ${setup.arcologyFx.gbp(rec.q[0])} when this went up.`, "fact"];
				}
				if (/when did|when was|since when|how long has|what time did|started/i.test(text)) {
					const who = pickBy(p => p[2] && p[2] === rec.d) ?? pickBy(p => p[1] === "local");
					const t = new DateTime(rec.at);
					const clock = String(t.hour).padStart(2, "0") + ":" + String(t.minute).padStart(2, "0");
					return who && [who[0], `First report I saw went up at ${clock}. Nothing earlier than that.`, "fact"];
				}
				/* Someone who lives there answers with what they saw. */
				const local = seen && rec.d && /\b(still|happening|going on|safe|open|closed|busy|running)\b/i.test(text) ? pickBy(p => p[2] === rec.d) : null;
				if (local && !used.has(seen)) {
					used.add(seen);
					return [local[0], seen, "fact"];
				}
				if (/record|evidence|proof|review|finding|statement|check/i.test(text) && !outcome) {
					const who = pickBy(p => p[1] === "skeptic");
					const line = who && take(n + "ev", this.threadLines.evidence);
					return line && [who[0], line, "unknown"];
				}
				const who = pickBy(p => ["local", "worried", "worker"].includes(p[1]));
				const line = who && take(n + "un", this.threadLines.unknown);
				return line && [who[0], line, "unknown"];
			}
			/* Hearsay gets asked for its source; "which friend" only when there is a friend to ask about. */
			if (pk === "rumour" && /a friend|heard|someone at|says there|saying this/i.test(text) && !/wait for|checked|source/i.test(text)) {
				const who = pickBy(p => p[1] === "skeptic");
				const line =
					who &&
					take(
						n + "src",
						this.threadLines.source.filter(l => l[0] === "Source?" || /a friend/i.test(text))
					);
				return line && [who[0], line, "against"];
			}
			/* Notice comments are handed out in rotation, not by personality, so only their questions get answers. */
			if (rec.k === "notice") return null;
			if (pk === "worried") {
				const who = pickBy(p => ["local", "loyal", "worker"].includes(p[1]));
				const line = who && take(n + "help", this.threadLines.help);
				return line && [who[0], line, "help"];
			}
			/* "Same at ours" only answers someone describing their own work or pay. */
			if (pk === "worker" && ["INDUSTRY", "BUSINESS", "MARKETS"].includes(cat) && /\b(we|our|my|us)\b/i.test(text)) {
				const who = pickBy(p => p[1] === "worker");
				const line = who && take(n + "same", this.threadLines.same);
				return line && [who[0], line, "agree"];
			}
			/* A long, careful comment gets a nod from someone who sees it the same way; a short opinion draws the opposite camp. */
			if (text.length > 70) {
				const who = pickBy(p => p[1] === pk || (p[1] === "loyal" && pk === "worried") || (p[1] === "local" && pk === "worker"));
				const line = who && take(n + "nod", this.threadLines.nod);
				return line && [who[0], line, "agree"];
			}
			const rival = /glad|good to|useful|helps|thanks/i.test(text)
				? null
				: { loyal: ["skeptic", "worker"], skeptic: ["loyal"], joker: ["worried"], worker: ["loyal"] }[pk];
			if (rival) {
				const who = pickBy(p => rival.includes(p[1]));
				const line = who && take(n + "vs", this.threadLines.against[pk]);
				if (line) return [who[0], line, "against"];
			}
			/* Only a joke or a jab gets a one-word agreement. */
			if (["joker", "skeptic"].includes(pk)) {
				const who = pickBy(p => p[1] === "joker");
				const line = who && take(n + "ag", this.threadLines.agree);
				if (line) return [who[0], line, "agree"];
			}
			/* Otherwise someone weighs in anyway: a nod from a like mind, or pushback from the opposite camp. */
			const camp = {
				loyal: ["skeptic", "worker"],
				skeptic: ["loyal", "worried"],
				worried: ["local", "loyal"],
				worker: ["loyal", "local"],
				local: ["worker", "skeptic"],
			}[pk];
			const vs = camp && this.threadLines.against[pk] && pickBy(p => camp.includes(p[1]));
			const push = vs && take(n + "fb", this.threadLines.against[pk]);
			if (push) return [vs[0], push, "against"];
			const ally = pickBy(p => p[1] !== "night");
			const nod = ally && take(n + "fn", this.threadLines.nod);
			return nod && [ally[0], nod, "agree"];
		};
		/* Questions first, then the rest, in a stable order. */
		const order = rc
			.map((c, i) => i)
			.sort((a, b) => (rc[b][1].includes("?") ? 1 : 0) - (rc[a][1].includes("?") ? 1 : 0) || N.seed(rec.id + "p" + a) - N.seed(rec.id + "p" + b));
		const out = [];
		let started = 0;
		for (const i of order) {
			if (started >= count) break;
			const r = answer(rc[i], "a" + i);
			if (!r) continue;
			started++;
			const late = N.seed(rec.id + "late" + i) < 0.35 ? 1 : 0;
			out.push([r[0], r[1], "reply|" + r[2], i, late]);
			const at = rc.length + out.length - 1;
			/* The first poster sometimes answers back: thanks for an answer, a reply in kind to an argument. */
			const turn = N.seed(rec.id + "turn" + i);
			let back = null;
			if (["fact", "help"].includes(r[2]) && turn < 0.5) back = take("t" + i, this.threadLines.thanks);
			else if (r[2] === "unknown" && turn < 0.4) back = take("s" + i, this.threadLines.shrug);
			else if (r[2] === "against" && turn < 0.6) back = take("b" + i, this.threadLines.back[kindOf(rc[i][0])] ?? this.threadLines.close);
			if (!back) continue;
			out.push([rc[i][0], back, "reply|back", at, late]);
			/* Longer chains: each post answers the one above it, up to six deep. A third resident may step in, and an
			   argument always ends on a closing line rather than in the middle. */
			const chain = [];
			const z = k => N.seed(rec.id + "ch" + i + k);
			const pickPair = (list, k) => {
				const ok = list.filter(l => !used.has(l[0]));
				const pair = ok.length ? ok[Math.floor(z(k) * ok.length)] : null;
				if (pair) used.add(pair[0]);
				return pair;
			};
			if (r[2] === "against") {
				/* Either a third resident steps in and the first poster concedes, or the two wind it down themselves. */
				const by = this.people.find(p => ![r[0], rc[i][0]].includes(p[0]) && p[1] !== "night" && N.seed(rec.id + "by" + i + p[0]) < 0.3);
				const pair = by && z(3) < 0.4 ? pickPair(this.threadLines.referee, 8) : pickPair(this.threadLines.windDown, 9);
				if (pair) {
					const third = by && this.threadLines.referee.some(l => l[0] === pair[0]);
					chain.push([third ? by[0] : r[0], pair[0], third ? "referee" : "wind"]);
					if (pair[1]) chain.push([rc[i][0], pair[1], "concede"]);
				}
			} else if (["fact", "help"].includes(r[2])) {
				if (z(5) < 0.7) chain.push([r[0], take("w" + i, this.threadLines.welcome), "welcome"]);
			} else if (r[2] === "unknown") {
				const other = this.people.find(p => ![r[0], rc[i][0]].includes(p[0]) && N.seed(rec.id + "fo" + i + p[0]) < 0.3);
				if (other && z(6) < 0.75) chain.push([other[0], take("fo" + i, this.threadLines.follow), "follow"]);
				if (other && z(7) < 0.5) chain.push([r[0], take("f2" + i, this.threadLines.follow), "follow"]);
			}
			let parent = at + 1;
			for (const [h, text, kind] of chain) {
				if (!text || h === out[parent - rc.length]?.[0]) continue;
				out.push([h, text, "reply|" + kind, parent, Math.max(late, N.seed(rec.id + "cl8" + parent) < 0.3 ? 1 : 0)]);
				parent = rc.length + out.length - 1;
			}
		}
		return out;
	},

	residents(rec, out) {
		const N = setup.arcologyNews;
		if (rec.k === "reminder") return [];
		if (rec.k === "weekly") {
			return (out.sections ?? []).flatMap((section, i) => {
				const fact = section.paragraphs.find(p => !p.startsWith("Last reported"));
				return fact
					? [
							[this.people[(i * 3) % this.people.length][0], `The update on “${section.title}” is the one I'm following. ${fact}`],
							[
								this.people[(i * 3 + 1) % this.people.length][0],
								`I'd keep the original report on “${section.title}” beside this review. The dates matter when sharing it.`,
							],
					  ]
					: [];
			});
		}
		if (rec.k === "notice") {
			const lines = {
				safety: [
					`I'll check the ${out.place} rating before choosing a route after dark.`,
					`A rating for ${out.place} is useful, but I wouldn't treat it as a guarantee about every street.`,
					`Does Enforcement update the ${out.place} notice when conditions change?`,
					`I'd send this ${out.place} notice to someone visiting, along with the date it was published.`,
				],
				transit: [
					`“${out.body[0]}” That's the information I needed before planning tomorrow's journey.`,
					"Public routes don't serve the restricted districts. I'd rather know that before getting on.",
					"I'll check the departure display again when I travel. An archived network notice can be out of date.",
					"Could Transit put these notices beside the boarding display too? That is where I look first.",
				],
				drift: [
					`“${out.body[0]}” I'll leave more time for the crossing.`,
					"Good to distinguish the crossing from travel inside the city. Moving the island doesn't close a shuttle stop.",
					"Does the launch desk have a revised journey time? The drift figure alone doesn't tell me when to arrive.",
				],
				registry: [
					"A record check isn't a backup. I'm glad the notice says that plainly.",
					"Once a day is enough for checking my public record. I wouldn't post it in this thread.",
					"Does the guest screen explain why backup access is restricted?",
				],
				exchange: [
					"Buying and selling Cipher cost different amounts. I'd check both before exchanging twice.",
					"Stored mainland money isn't Cipher in my wallet. I still have to use the counter.",
					"The rate moved twice while I was standing at the terminal. I'll budget for that.",
				],
			}[rec.f] ?? [
				`“${out.body[0]}” Useful to have the actual public notice here rather than a forwarded headline.`,
				`Where can residents ask questions about “${out.title}”?`,
			];
			return lines.map((line, i) => [this.people[(Math.floor(N.seed(rec.id) * this.people.length) + i) % this.people.length][0], line]);
		}
		/* Without a named organisation, lines that need one are dropped below rather than printed as "they". */
		const publicSubject = N.publicSubject(rec);
		const vals = { D: this.district(publicSubject.d), O: N.orgName(publicSubject.o) || "\u0000" };
		const subject = {
			sweep: { patrol: "foot patrols", checkpoint: "implant checks", drones: "camera drones" },
			idcheck: { copies: "copied identities", cloned: "cloned chips", backups: "backup records" },
			feud: { corner: "street corners", debt: "crew debts", route: "collection routes" },
			industry: { press: "press maintenance", power: "power supplies", shortage: "late supplies", walkout: "unpaid overtime" },
			business: {
				wages: "pay deductions",
				leak: "supplier invoices",
				contract: "unpaid contracts",
				expansion: "new hiring",
				irregular: "account records",
				recall: "returned parts",
				stake: "company ownership",
			},
			transit: { maintenance: "platform maintenance", inspection: "stop inspections", interference: "shuttles skipping stops" },
			implant: { malfunction: "implant restarts", backup: "backup access", unlicensed: "unregistered parts", trial: "paid trials", xchange: "station queues" },
			nightlife: { opening: "the opening night", noise: "venue noise", betting: "betting nights", raid: "venue inspections" },
			glasshouse: { gathering: "private invitations", absence: "the host's absence" },
			market: {
				accumulate: "the Cipher purchase",
				selloff: "the reserve sales",
				withdraw: "exchange spreads",
				scandal: "the missing reserves",
				pump: "the purchase claims",
				move: "the Cipher price",
			},
			crash: { liquidity: "the Cipher collapse", reserve: "the missing reserves", counterfeit: "the counterfeit Cipher" },
			smuggle: { crates: "missing crates", parts: "missing parts", medical: "medical shipments" },
		}[rec.f]?.[rec.s];
		const fill = s => s.replace(/\{(\w)\}/g, (m, k) => vals[k] ?? m);
		const fits = line => !line[1] || line[1].split(" ").includes(out.cat);
		const usedPeople = new Set();
		const recentByHandle = new Map();
		for (const earlier of N.state().arts.filter(x => x.at < rec.at && x.at > rec.at - 28 * N.DAY)) {
			for (const [handle, line] of earlier.rc ?? []) {
				if (!recentByHandle.has(handle)) recentByHandle.set(handle, new Set());
				recentByHandle.get(handle).add(line);
			}
		}
		/* Lines already used earlier in the same story are off limits, so follow-ups don't echo the first article. */
		const usedLines = new Set(
			rec.e
				? N.state()
						.arts.filter(x => x.e === rec.e && x.at < rec.at)
						.flatMap(x => (x.rc ?? []).map(c => c[1]))
				: []
		);
		const list = [];
		const seenFn = this.seen[rec.f]?.[rec.ph];
		const seen = typeof seenFn === "function" ? seenFn(rec) : seenFn;
		const local = this.people.filter(p => p[2] === publicSubject.d);
		if (seen && local.length) {
			const p = this.pick(rec, "local", local);
			usedPeople.add(p[0]);
			list.push([p[0], seen]);
		}
		const people = this.people.slice().sort((a, b) => N.seed(rec.id + a[0]) - N.seed(rec.id + b[0]));
		for (let i = 0; i < people.length; i++) {
			const p = people[i];
			if (usedPeople.has(p[0])) continue;
			const kind = p[1] === "local" && p[2] !== publicSubject.d ? "skeptic" : p[1];
			if (kind === "night" && !["nightlife", "glasshouse", "transit"].includes(rec.f)) continue;
			const contextual =
				{
					loyal: [
						[`I'd rather ${vals.O} explain the arrangements on ${vals.D} before people start guessing.`],
						[`Keeping the notices for ${vals.D} current would help the people following them.`],
					],
					skeptic: [
						[`Has anyone outside ${vals.O} checked the account of what happened on ${vals.D}?`],
						[`I want to see the records behind this report about ${vals.D}, not another statement.`],
					],
					worried: [
						[`My route home goes through ${vals.D}. I need to know what this changes for people passing through.`],
						[`Does the public desk on ${vals.D} have any advice for residents yet?`],
					],
					worker: [
						[`I work shifts near ${vals.D}. We need notices before we leave home, not after we arrive.`],
						[`I'd like ${vals.O} to explain what this means for the next shift.`],
					],
					night: [
						[`People leaving the venues on ${vals.D} will want to know about this before closing time.`],
						[`I usually meet friends on ${vals.D}. We're checking the notices before going tonight.`],
					],
					local: [
						[`I live near ${vals.D}. The report doesn't say what residents should do next.`],
						[`I'd check the street notices on ${vals.D} before making the trip.`],
					],
					joker: [[`I'll put "check ${vals.D} notices" on tomorrow's list. Again.`], [`Somewhere on ${vals.D}, someone is already printing the next notice.`]],
					rumour: [
						[`People keep passing around different versions of the ${vals.D} story. Which ones have actually been checked?`],
						[`I'd wait for a named source before sharing more about ${vals.O}.`],
					],
				}[kind] ?? [];
			let topic = subject
				? {
						loyal: [
							`I'd like ${vals.O} to explain the arrangements for ${subject} before people start guessing.`,
							`I'll check the posted instructions about ${subject} before making the trip.`,
						],
						skeptic: [`Who checked the records on ${subject} before this went up?`, `I want to see the records about ${subject}, not just a statement.`],
						worried: [
							`Is there a public desk on ${vals.D} taking questions about ${subject}?`,
							`I'm checking how this report about ${subject} affects tomorrow's trip.`,
						],
						worker: [
							`Will ${vals.O} give shift workers a written notice about ${subject}?`,
							`People working near ${vals.D} need an answer about ${subject} before their next shift.`,
						],
						night: [
							`I'll check the latest on ${subject} before meeting anyone on ${vals.D}.`,
							`People coming out of the venues need to hear about ${subject} too.`,
						],
						local: [
							`The notice near my building on ${vals.D} doesn't answer my questions about ${subject}.`,
							`I live near ${vals.D}. Where should residents ask about ${subject}?`,
						],
						joker: [
							`Another conversation about ${subject} for the shuttle queue on ${vals.D}.`,
							`I'll add ${subject} to my list of things to worry about after rent.`,
						],
						rumour: [
							`I've heard three versions of the ${subject} story. I'd rather wait for something checked.`,
							`Is there a named source for the claims about ${subject}?`,
						],
				  }[kind]
				: null;
			if (rec.f === "glasshouse")
				topic = {
					loyal: ["Private party. They can invite whoever they want.", "I don't expect the host to publish a guest list for strangers."],
					skeptic: ["The article says nobody confirmed the names. Why is everyone passing lists around?", "A launch arriving doesn't tell you who was on it."],
					worried: [
						"I hope people leave the staff alone instead of asking them for names.",
						"I wouldn't want my name guessed at in a public thread like this.",
					],
					worker: [
						"Someone has to clear the tables after everyone leaves. That's the shift I'd ask about.",
						"The guests get a report. The people cleaning up get an early start.",
					],
					night: [
						"I'd like to know what they played inside. Nobody ever reports the music.",
						"I can enjoy a night out without knowing who got invited up there.",
					],
					local: ["I live on Relay Street. I see the arrivals, not the guest list.", "From street level you can't tell who is inside the Glasshouse."],
					joker: ["My invitation must still be in the post.", "I'm available if they need someone to finish the food."],
					rumour: [
						"Every version of the guest list I've seen has different names. None has a source.",
						"Someone always claims their friend was invited. I'm still waiting for that friend to turn up.",
					],
				}[kind];
			if (rec.f === "business" && rec.s === "expansion")
				topic = {
					loyal: [
						"The opening hours haven't been announced. I'll check again before going after work.",
						"I'd like the extra space to include a customer desk, but the announcement doesn't promise one.",
					],
					skeptic: [
						"How many jobs, and what hours? A bigger floor doesn't answer either question.",
						"I'd like to see the vacancies before calling this a hiring boom.",
					],
					worried: [
						"Will the new posts offer regular hours? I can't afford another week of cancelled shifts.",
						"I hope existing staff aren't losing hours to pay for this.",
					],
					worker: [
						"They haven't given a number of posts. I'll wait for the actual vacancies.",
						"The announcement mentions hiring, but I'd need the pay and shifts before applying.",
					],
					night: ["If they open late, I might finally get there after work.", "A later closing time would do more for me than another floor."],
					local: [`Will the entrance on ${vals.D} stay in the same place?`, "I hope they leave room for the queue instead of taking more pavement."],
					joker: ["More floor space. Same queue, now with room to stretch.", "Please put a chair in the waiting area. That's my expansion proposal."],
					rumour: [
						"Is there a hiring notice somewhere, or are people just forwarding this article?",
						"I'd check the actual job advert before sending anyone my details.",
					],
				}[kind];
			if (rec.f === "business" && rec.s === "expansion" && rec.ph === "withdrawn")
				topic =
					kind === "worker"
						? [
								"I hope they tell everyone who applied that hiring has been suspended.",
								"I'd want written confirmation before giving up another shift for an interview.",
						  ]
						: [
								"The plan has been cancelled. I'll keep using the existing counter until there is a new announcement.",
								"At least this update says the opening isn't happening. An old hiring notice would be misleading now.",
						  ];
			if (rec.f === "implant" && rec.s === "trial")
				topic = {
					loyal: [
						"I'd check the clinic's terms before treating a recruitment notice as an appointment.",
						"Good to be clear that a guest account doesn't authorize every procedure.",
					],
					skeptic: [
						"They haven't named the part. I'd want that information before signing anything.",
						"A consent form matters, but I still want an explanation of what will be tested.",
					],
					worried: [
						"The report doesn't confirm who is eligible. I wouldn't turn up assuming they can take me.",
						"I'd need to know the possible effects before deciding whether the payment is worth it.",
					],
					worker: [
						"I couldn't agree to testing without knowing whether it could affect my next shift.",
						"I'd ask for the terms in writing before taking time off work for this.",
					],
					night: ["I can read about a trial without volunteering for it.", "I'd rather wait for the clinic's full explanation than decide from an advert."],
					local: [
						"A recruitment advert doesn't tell you whether your own account can book anything.",
						"I live near the clinics. I'd still read the actual service notice before making a trip.",
					],
					joker: [
						"I'd like to understand the part before agreeing to become its test report.",
						"The payment is the easy part to understand. The terms need just as much space.",
					],
					rumour: [
						"A forwarded advert isn't confirmation of guest eligibility.",
						"I'll wait for the published terms rather than pass on guesses about the trial.",
					],
				}[kind];
			if (rec.f === "implant" && rec.s === "trial" && rec.ph === "fixed")
				topic =
					kind === "worker"
						? [
								"I'd check the recruitment date before taking time off work. This round has closed.",
								"I'd want the results of this round before considering time off for another.",
						  ]
						: [
								"The clinic has stopped taking volunteers. People sharing the old advert should include this update.",
								"I'd like to read the results before considering any future recruitment notice.",
						  ];
			if (rec.f === "business" && rec.s === "leak" && ["audit", "outcome", "unresolved"].includes(rec.ph))
				topic =
					rec.ph === "outcome"
						? [
								"The delivery records explain the price differences in these invoices. That is more useful than the first statement.",
								"The finding covers the documents reviewed. I'd read it that way rather than as a claim about every purchase.",
						  ]
						: rec.ph === "audit"
						? [
								"The Registry is checking the invoices against deliveries. I'd wait for that result before claiming to know who is right.",
								"Authenticating the documents matters. A leaked total on its own doesn't explain a purchase.",
						  ]
						: [
								"The review did not settle the dispute. We still don't know whose explanation is correct.",
								"I hope they explain which documents couldn't be authenticated rather than just dropping the story.",
						  ];
			if (rec.f === "transit" && rec.ph === "exposed")
				topic =
					kind === "loyal"
						? ["At least Transit has now explained why the freight carts were there. I still need to know when the shuttles return."]
						: kind === "worker"
						? ["The explanation matters, but I can't get to a shift on an admission. I'll check the boarding screen."]
						: [
								"The earlier notice said the stop was open. The freight admission explains why people were seeing something different.",
								"Giving freight the space is a decision. I'd like to know who authorized it.",
						  ];
			if (rec.f === "business" && rec.s === "wages")
				topic =
					rec.ph === "outcome"
						? [
								"An agreement to refund the deductions is useful. I'd check the next statement before calling the money repaid.",
								"Glad the staff have an agreement. I hope the itemised statements make it easy to check.",
						  ]
						: [
								"The deductions affect money already earned. I'd want the itemised calculation as well as the employment terms.",
								"Work is continuing while they argue over the deductions. That doesn't mean the staff have accepted them.",
						  ];
			if (rec.f === "industry" && rec.ph === "report")
				topic =
					kind === "loyal"
						? ["The inspectors have published what went wrong. I hope the company deals with the warnings this time."]
						: [
								"The company was fined, but I still need to know whether my next shift is going ahead.",
								"The workers say their warnings were ignored. The company says the machines passed inspection. I want to know why the stories don't match.",
						  ];
			const practical = {
				industry: {
					press: "I want the press checks explained before anyone assumes a replacement alone settles the safety question.",
					power: "Restoring the supply and finding why it failed are separate jobs. I'd like the fault investigation followed up.",
					shortage: "The materials haven't arrived yet. I'll check again before travelling to work.",
					walkout: "The dispute is about overtime already worked. I'd want the payment agreement checked against the next pay statement.",
				},
				implant: {
					malfunction: "I'd ask which part the notice covers before assuming every implant has the same restart problem.",
					backup: "I'd like the access review explained without publishing the private records it is supposed to protect.",
					unlicensed: "An offer to inspect a street-fitted part doesn't tell me whether that part is safe. That's what I'd ask the clinic.",
					xchange: "Extra counter staff may help the queue. I wouldn't read that as a change to the one-product limit.",
				},
				business: {
					contract: "Before choosing a side I'd want to know what work the contract required and what was delivered.",
					irregular: "I want to know whether the company fixed its records and whether customers actually got their money back.",
					recall: "I'd check the batch at the counter before paying a street seller for a replacement.",
					stake: "A registered holding tells us about ownership. I'm waiting for an actual service announcement before assuming customers' terms changed.",
				},
				transit: {
					maintenance: "I'll use the current boarding display rather than treat a maintenance forecast as a confirmed arrival.",
					inspection: "A platform inspection needs an outcome. I'd like the reopening notice to explain what was checked.",
					interference: "City Transit says one thing, but passengers are seeing something different at the stop. I want to know why.",
				},
				sweep: {
					patrol: "I want the patrol review to cover residents' complaints as well as the arrests announced by Enforcement.",
					checkpoint: "The checks affect everyone passing through. I want Enforcement to explain why some people are stopped again.",
					drones: "Drone coverage is visible. Whether it prevents the incidents reported here is the part I'd want followed up.",
				},
				idcheck: {
					copies: "Finding copied records doesn't identify everyone who used them. I'd wait for evidence about the source.",
					cloned: "I'd like the scanner checks explained without circulating anyone's identity record in the comments.",
					backups: "The access issue matters, but reposting the exposed records would make it worse. Report the breach without naming the account holders.",
				},
				feud: {
					corner: "People using the stalls still have to pass that corner. I care whether the fighting stops, whichever crew claims it.",
					debt: "A debt between crews shouldn't become a risk for everyone walking past. I'd like the next report to check conditions on the street.",
					route: "Control of the collection route matters to traders. A claim of control isn't enough to tell me whether it is safe to pass.",
				},
				smuggle: {
					crates: "Blaming someone won't bring the crates back. I want to know what has actually been recovered.",
					parts: "Even if investigators find the missing parts, they still need to find out who took them.",
					medical: "The missing clinic supplies are the practical concern. I wouldn't infer a general shortage from one shipment.",
				},
				nightlife: {
					opening: "I'd check the actual door arrangements before treating an opening announcement as a guarantee of entry.",
					noise: "People living beside a venue need a way to raise noise complaints without the discussion turning into guesses about the guests.",
					betting: "I want to know who won the fight and why the people betting on it started fighting afterwards.",
					raid: "Checking everyone's implant at the door doesn't mean every guest has broken a rule.",
				},
			}[rec.f]?.[rec.s];
			if (practical && !(rec.f === "transit" && rec.ph === "exposed") && !(rec.f === "industry" && rec.ph === "report")) {
				topic = [...(topic ?? []), ...(kind === "skeptic" || kind === "local" ? [practical] : [])];
			}
			const lines = (topic ? topic.map(t => [t]) : [...this.voices[kind].filter(l => l[1]), ...contextual]).filter(
				l => fits(l) && !usedLines.has(fill(l[0])) && !recentByHandle.get(p[0])?.has(fill(l[0]))
			);
			if (!lines.length) continue;
			usedPeople.add(p[0]);
			const offset = (Math.floor(rec.at / N.DAY) + Math.floor(N.seed(p[0]) * 1000) + i) % lines.length;
			for (let j = 0; j < lines.length; j++) list.push([p[0], fill(lines[(offset + j) % lines.length][0])]);
		}
		/* Match follow-up perspectives to what changed, rather than recycling the opening incident's questions. */
		const development =
			{
				business: {
					mediation: [
						["worker", `I'd want the people affected by ${subject} represented in the talks, not just informed afterward.`],
						["skeptic", `Mediation over ${subject} is a process, not an agreed outcome. I'd wait for the terms.`],
						["worried", `Does anyone know when the next public update on the ${subject} talks is due?`],
						["loyal", `Getting the parties discussing ${subject} is better than another exchange of statements.`],
					],
					audit: [
						["skeptic", "An audit needs to compare the documents with what was delivered. A total copied into a thread isn't enough."],
						["worker", "I hope the people who kept the delivery records get time to explain them to the reviewers."],
						["worried", "If someone's name appears on a leaked invoice, that alone shouldn't make them a target here."],
						["loyal", "I'd let the reviewers authenticate the records before treating a leak as a complete account."],
					],
					outcome: [
						["worker", `I'd read the ${subject} outcome against the original complaint before deciding what is still owed.`],
						["skeptic", `The outcome on ${subject} only covers the issue examined. It isn't a finding about every transaction.`],
						["worried", `I hope people directly affected by ${subject} get the terms in writing, rather than a forwarded headline.`],
						["loyal", `It's useful to have an outcome on ${subject}. The earlier coverage should link to it.`],
					],
					unresolved: [
						["worker", `Without an agreement on ${subject}, the people doing the work still have to make plans.`],
						["skeptic", `An unresolved ${subject} case doesn't establish that either side's whole account was correct.`],
						["worried", `I hope the people affected by ${subject} have a contact for further questions.`],
						["loyal", `I'd keep the ${subject} documents available in case the parties return to the discussion.`],
					],
					withdrawn: [
						["worker", `Anyone planning around the ${subject} announcement needs this withdrawal sent directly to them.`],
						["skeptic", `The ${subject} plan being withdrawn doesn't explain every decision that led to it.`],
						["worried", `I hope no one gives up an existing arrangement on the strength of the old ${subject} notice.`],
						["loyal", `At least people can stop relying on the ${subject} proposal now it has been withdrawn.`],
					],
					exposed: [
						["skeptic", `The corrected account of ${subject} needs the same prominence as the original statement.`],
						["worker", `People who acted on the first ${subject} notice deserve a direct explanation of the change.`],
						["worried", `I'd keep both dates when discussing ${subject}. Old screenshots will still be circulating.`],
						["loyal", `Acknowledging the inaccurate ${subject} account is necessary before asking people to trust the next one.`],
					],
				},
				sweep: {
					announce: [
						["loyal", `I hope the ${subject} operation addresses the problem described in the report.`],
						["worker", `I'd like the ${subject} instructions available before shop staff arrive for their opening shift.`],
						["worried", `Will residents know when the extra ${subject} activity is expected to finish?`],
						["skeptic", `I'd judge the ${subject} operation by what changes for residents, not the size of the announcement.`],
					],
					active: [
						["loyal", `Having ${subject} underway is a start. People still need a way to report trouble.`],
						["worker", `The ${subject} operation needs to leave room for ordinary deliveries and people going to work.`],
						["worried", `I'd check the current instructions before passing through the ${subject} area.`],
						["skeptic", `Visible ${subject} activity isn't a result by itself. I'd like the later review to say what it achieved.`],
					],
					arrests: [
						["loyal", "I hope the arrests help stop the incidents residents reported."],
						["skeptic", "An arrest isn't a conviction. I'd wait for evidence about what each person is accused of."],
						["worried", "Please don't start guessing the names of people detained in this thread."],
						["worker", "Shop staff still need to know whether the extra checks will continue after these arrests."],
					],
					complaint: [
						["skeptic", "Residents' complaints belong in the review alongside the official results."],
						["worker", "People who have to cross the operation to get to work should be able to report how it affects them."],
						["worried", "Can people submit a complaint without publishing their identity to everyone here?"],
						["loyal", "A complaint should be checked. Defending enforcement shouldn't mean refusing to hear it."],
					],
					review: [
						["skeptic", "I'd keep the review beside the residents' original complaints so people can compare them."],
						["loyal", "Reviewing the operation matters. I'd like the findings used in planning the next one."],
						["worried", "I hope the people who raised concerns get an answer directly."],
						["worker", "The practical question for workers is whether the instructions will change after this review."],
					],
					ends: [
						["loyal", `I'm glad the extra ${subject} operation has an end notice. People need clear instructions when it changes.`],
						["skeptic", `I'd like the results of the ${subject} operation checked again later, not treated as permanent.`],
						["worker", `Staff using the affected streets need the end notice as well as the original ${subject} warning.`],
						["worried", `I'll still check conditions rather than treat the end of ${subject} as a promise of safety.`],
					],
					exposed: [
						["skeptic", "The new observations don't support the earlier assurance. The correction should say that plainly."],
						["worried", "People who relied on the district being declared clear need to see this update."],
						["loyal", "I support enforcement, but that doesn't mean defending a result the later reporting contradicts."],
						["worker", "Traders need an accurate account of current conditions, even if it is less flattering than the first announcement."],
					],
				},
				industry: {
					exposed: [
						["worker", "Cancelled shifts aren't normal operations. Anyone using the first company notice needs this correction."],
						["skeptic", "Who approved the statement that work was continuing? Workers shouldn't have to correct their own employer in public."],
						["worried", "I hope people who travelled for those cancelled shifts get an answer about their lost time."],
						["loyal", "The operator can still put this right, but it needs to acknowledge the closure plainly."],
					],
					dispute: [
						["worker", `The workers' account of ${subject} should be kept with the original notice. It changes how I'd read the operator's explanation.`],
						["skeptic", `I'd compare the dated complaints about ${subject} with the action taken, rather than judge this by who sounds more confident.`],
						["worried", `People raising concerns about ${subject} need to be able to do it without risking their shifts.`],
						["loyal", `An answer from management about ${subject} would help. Silence leaves the staff to explain everything themselves.`],
					],
					inspection: [
						["worker", `I hope the inspectors ask the people dealing with ${subject} on every shift, not just whoever happens to be there when they arrive.`],
						["skeptic", `An inspection into ${subject} needs a published finding. An escort arriving isn't the finding.`],
						["worried", "Will workers be told how to submit information without putting their names in a public thread?"],
						["loyal", `Having inspectors check ${subject} is a useful step. I'd give them time to examine the records.`],
					],
					repair: [
						["worker", `I need the next work notice to distinguish action on ${subject} from permission to return to a shift.`],
						["skeptic", `Work on ${subject} is progress. I'd still want the cause addressed so we aren't back here next week.`],
						["worried", `Does the operator have an estimate for completing the work on ${subject}? I wouldn't treat a start as a finish.`],
						["loyal", `I'd rather see a careful response to ${subject} than pressure to announce normal operations too soon.`],
					],
					reopen: [
						["worker", `I'll check my own shift notice now ${vals.O} says operations have resumed. Reopening doesn't settle everyone's roster.`],
						["skeptic", `Normal production at ${vals.O} doesn't answer every question about the earlier ${subject} problem.`],
						["worried", `I hope the staff affected by ${subject} get an explanation as well as a return-to-work notice.`],
						["loyal", `Good to have ${vals.O} operating again. People forwarding the disruption notice should include this update.`],
						["rumour", `I'm checking dates on messages about ${subject}. Some are still sharing the first report as though nothing changed.`],
					],
				},
				transit: {
					out: [
						["worker", "A closure notice needs to reach people before their commute. Being late for a shift still costs us."],
						["worried", "Walking to another stop may be possible, but I need to allow time for the streets between them."],
						["loyal", "I'd rather a stop be taken out of service for a proper check than kept open to avoid complaints."],
						["skeptic", "I'd like the reason for the stop closure kept beside the eventual reopening notice."],
					],
					statement: [
						["worker", "Expected to reopen isn't a boarding time. I'll arrange my next shift around the current display."],
						["worried", "Could Transit put a time on the next update, even if it cannot give a reopening time?"],
						["loyal", "A forecast helps, provided people can tell it apart from confirmation that shuttles are stopping."],
						["skeptic", "I'll wait for an actual arrival before telling someone to use that stop."],
					],
					conflicting: [
						["skeptic", "The notices and the observations need to be checked against the same times. Otherwise everyone talks past each other."],
						["worker", "Passengers missing work need Transit to answer the discrepancy, not repeat the notice."],
						["worried", "I'm not sending anyone to wait there until the conflicting accounts are explained."],
						["loyal", "Transit should show what its service claim was based on. That would be more useful than another assurance."],
					],
					suspect: [
						["skeptic", "A suspected diversion needs evidence about who authorized it. I wouldn't accuse a driver from a headline."],
						["worker", "If space is going to freight, passengers need to be told where that leaves their commute."],
						["worried", "I'd keep checking the boarding options while the investigation continues."],
						["loyal", "I want the operator to cooperate with the review and put out one clear service notice."],
					],
					reopen: [
						["worker", "Having this stop back means I can plan the shorter commute again. I'll still check the display before leaving."],
						["loyal", "Good to have boarding restored. Please replace the closure notices too."],
						["skeptic", "Service returning answers today's travel question. It doesn't erase the questions raised during the closure."],
						["worried", "I'll tell the people who were walking to another stop that there is a reopening notice now."],
						["night", "A stop being open matters for getting home too. I'll check the route when the venue closes."],
					],
				},
				smuggle: {
					missing: [
						["worker", `I'd check the delivery record for the ${subject} before blaming the people unloading it.`],
						["skeptic", `The report about ${subject} needs an inventory. A missing shipment doesn't establish who took it.`],
						["worried", `I hope the owner explains whether customers waiting on the ${subject} are affected.`],
						["loyal", `Reporting the ${subject} missing gives people something specific to look for. Accusing strangers in the thread won't recover it.`],
					],
					statement: [
						["skeptic", `I'd compare this statement about ${subject} with the original delivery documents.`],
						["worker", `Couriers handling the ${subject} need a way to give information without being treated as suspects by everyone here.`],
						["worried", `I wouldn't pass on names connected to the ${subject} without evidence.`],
						["loyal", `I hope the next update on ${subject} tells us what has actually been located.`],
					],
					found: [
						["worker", `Finding the ${subject} is progress. The receiving crew still needs to check what is in the shipment.`],
						["skeptic", "Some contents remain unaccounted for. Recovery shouldn't become a headline saying nothing was lost."],
						["worried", "I hope anyone still waiting for goods gets a direct update rather than having to infer it from this report."],
						["loyal", "Glad the search recovered something. I'd like the remaining inventory checked before the case is closed."],
					],
					unresolved: [
						["skeptic", `No resolution on the ${subject} isn't proof that the first accusation was right.`],
						["worker", `The people waiting for the ${subject} still need an answer about their delivery.`],
						["worried", "I wouldn't want an unresolved allegation to follow a courier around forever."],
						["loyal", "I'd keep the missing-goods report available in case someone can still identify the shipment."],
					],
					exposed: [
						["skeptic", `The correction about ${subject} needs to reach everyone who shared the first accusation.`],
						["worker", "People handling cargo shouldn't have their reputation decided by an owner's first statement."],
						["worried", "I hope the people blamed in the earlier account are told about this correction."],
						["loyal", "Correcting the account is necessary. The owner still owes people a clear explanation of the goods' whereabouts."],
					],
				},
				implant: {
					response: [
						["worried", `I'd take questions about ${subject} to the clinic. A public response can't tell me what is right for my own implant.`],
						["worker", `Before taking time off over ${subject}, I'd ask what the offered appointment actually includes.`],
						["skeptic", `The response on ${subject} should be judged by what it promises, not by what people hope it means.`],
						["loyal", `It's useful to have a response on ${subject}. I'd keep the clinic's actual terms with any recommendation.`],
					],
					fixed: [
						["worried", `Does the update about ${subject} include advice for someone still having trouble? I'd ask before assuming it covers my case.`],
						["worker", `I'd keep the dates of the ${subject} notices when speaking to the clinic, especially if an old advert is still circulating.`],
						["skeptic", `This is a development on ${subject}, not confirmation that every patient's situation is settled.`],
						["loyal", `I'm glad there is an outcome on ${subject}. The earlier notice should point readers here.`],
					],
					ongoing: [
						["worried", `People waiting for an answer about ${subject} shouldn't have to rely on this comment section for medical advice.`],
						["skeptic", `No resolution on ${subject} means the questions remain open. It doesn't confirm the most alarming version.`],
						["worker", `I'd ask for written advice on ${subject} before changing work plans around a rumour.`],
						["loyal", `I'd like the clinic to keep a contact point for the unresolved ${subject} questions.`],
					],
					exposed: [
						["skeptic", `The earlier account of ${subject} needs correcting wherever the original notice was posted.`],
						["worried", `Someone affected by ${subject} needs direct advice, not just a correction to a public statement.`],
						["worker", `If anyone took time off because of the first ${subject} notice, I hope the clinic explains the change to them.`],
						["loyal", `Acknowledging the problem with the ${subject} statement is a start. I'd want the next instructions clearly dated.`],
					],
				},
				feud: {
					clash: [
						["worried", `People passing through ${vals.D} don't get to choose whether to be near this fight.`],
						["worker", "Traders need customers to be able to reach their stalls without walking into a crew argument."],
						["skeptic", "A crew saying it controls a street doesn't tell us whether residents can use it safely."],
						["loyal", "I want the fighting stopped. Giving either crew a larger audience doesn't help the people living there."],
					],
					retaliation: [
						["worried", "Retaliation means the people who stayed out of the first fight are still at risk."],
						["worker", "How are traders supposed to plan a workday while the crews take turns attacking each other?"],
						["skeptic", "I'd read this as another attack, not evidence that either crew has settled control."],
						["loyal", "The people caught between the crews deserve protection, whichever side started it."],
					],
					truce: [
						["worried", "I'm relieved they agreed to stop. I'll wait to see how the street is before changing my route back."],
						["worker", "A truce is good for trade if it holds. Shop staff still have to open tomorrow."],
						["skeptic", "I'd like a later report on whether the agreement holds, rather than assuming the dispute is over for good."],
						["loyal", "An agreement to stop fighting is better for residents than another round of retaliation."],
					],
					takeover: [
						["worker", "A different crew claiming the street doesn't tell a trader what tomorrow will cost."],
						["worried", "I care more about people being able to pass than which name gets painted over the corner."],
						["skeptic", "A claim of control is worth reporting, but I'd wait for evidence before calling the situation stable."],
						["loyal", "Residents shouldn't have to take a side just to get home."],
					],
					enforcement: [
						["loyal", "Breaking up the fight matters. I hope residents can get back to ordinary business."],
						["worried", "I'll still check the local notices before assuming the crews have left the area."],
						["worker", "Shop workers need to know whether they can open safely after the intervention."],
						["skeptic", "Officers breaking up one clash doesn't settle the dispute between those crews."],
					],
				},
				idcheck: {
					found: [
						["worried", `I'd check my own record privately rather than post identity details under a report about ${subject}.`],
						["skeptic", `Finding ${subject} in use doesn't establish that every account passing the scanner is suspicious.`],
						["loyal", `I hope the Registry explains what legitimate account holders should do about ${subject}.`],
						["worker", `Extra checks over ${subject} need clear instructions for people travelling to work.`],
					],
					tighten: [
						["worker", `Two scans over ${subject} may mean allowing more time before a shift. Employers need the notice too.`],
						["worried", "If the scanner questions someone's record, where can they ask for a correction without posting it here?"],
						["skeptic", `I'd like the Registry to explain what the second scan adds to the investigation into ${subject}.`],
						["loyal", "I'd cooperate with a check, but the instructions should be the same for everyone passing through."],
					],
					traced: [
						["skeptic", `Tracing the source of ${subject} doesn't tell us every account that was affected.`],
						["worried", "I hope affected account holders get private notification instead of finding out through rumours."],
						["loyal", "Identifying a source is useful. The Registry should explain what it has done to prevent another breach."],
						["worker", "I'd like to know when the extra screening can end now the source has been traced."],
					],
					quiet: [
						["skeptic", "An investigation going quiet doesn't establish that the identity problem was fixed."],
						["worried", "People worried about their record still need somewhere to ask questions."],
						["loyal", "I hope the Registry keeps the case open to new evidence even if there is no announcement today."],
					],
				},
			}[rec.f]?.[rec.ph] ?? [];
		const extra = development.flatMap(([kind, line]) => people.filter(p => p[1] === kind).map(p => [p[0], line]));
		return [...extra, ...list.sort((x, y) => N.seed(rec.id + x[0]) - N.seed(rec.id + y[0]))].filter(x => !x[1].includes("\u0000"));
	},

	/* The player's three replies. Some are risky: threats or claims of involvement draw attention to the commenter. */
	replies: {
		SECURITY: [
			["How long will this last?", "Good. The street needed it.", "The enforcers should mind their own business.|watched"],
			["Who decides who gets stopped?|critical", "Glad someone is doing something.", "Let them try stopping me.|watched"],
		],
		CRIME: [
			["Hope nobody else gets hurt.", "Enforcement should step in.", "Sounds like fun. Where exactly?|watched"],
			["Stay away from there for a few days.", "Both crews deserve each other.", "Whoever wins, I'll be paying them.|watched"],
		],
		INDUSTRY: [
			["Are the workers all right?", "Pay the crews for the lost days.", "Maybe someone should break the rest of the machines too.|watched"],
			["How long until it reopens?", "Listen to the workers next time.|critical", "Accidents happen."],
		],
		TRANSIT: [
			["Which stop is closest instead?", "The notices don't match what people see.|critical", "Just walk."],
			["Is the stop open or not?", "City Transit should explain this.|critical", "Shuttles are still better than walking."],
		],
		BUSINESS: [
			["What does this mean for customers?", "Sounds like business as usual.", "I don't trust their numbers.|critical"],
			["Who checks their accounts?|critical", "Good for them.", "Nobody will go to jail for it."],
		],
		CYBERNETICS: [
			["Should I get my implant checked?", "Clinics need stricter rules.", "I'd let them test anything for the right price."],
			["Where can I get a check?", "This is why I stay registered.", "Who can see my backup?|critical"],
		],
		SOCIETY: [
			["Was anyone hurt?", "Sounds like a good night.", "Next time I'm going."],
			["The neighbours have a point.", "Leave the clubs alone.", "Wish I'd been there."],
		],
		PEOPLE: [
			["Who was invited?", "Let people have their privacy.", "Must be nice."],
			["Does anyone know who the host is?", "Leave them alone.", "I'd like an invitation."],
		],
		BREAKING: [
			["Hope nobody was badly hurt.", "Enforcement should look into it.", "That was me.|watched"],
			["Who was it?", "Sounds dangerous. Stay away.", "That was me.|watched"],
		],
		MARKETS: [
			["Should I buy now?", "Is the announcement real?|critical", "I'm holding what I have."],
			["How far can it fall?", "Who checks the exchange records?|critical", "Easy money for whoever knew first."],
		],
		WEEKLY: [["Busy week.", "Nothing ever really changes.", "Thanks for the summary."]],
		NOTICE: [
			["Thanks for the notice.", "Is this up to date?|critical", "Who decides these things?"],
			["Good to know.", "Nobody reads these.", "Is this accurate?|critical"],
		],
	},

	options(rec, out) {
		if (rec.f === "implant" && rec.s === "trial")
			return [
				["Can guests join this trial?", "", "question"],
				["What are volunteers being asked to test?", "", "question"],
				["I would read the consent terms first.", "", "concern"],
			];
		if (rec.f === "implant" && rec.s === "backup")
			return [
				["Can a guest make a Registry backup?", "", "question"],
				["Who is allowed to read existing backups?", "critical", "question"],
				["A record check is not a backup.", "", "opinion"],
			];
		if (rec.f === "implant" && ["xchange", "unlicensed"].includes(rec.s))
			return [
				["Does my guest implant authorize new body parts?", "", "question"],
				["I would check the service desk's restrictions first.", "", "opinion"],
			];
		if (rec.f === "nightlife" && rec.s === "raid")
			return [
				["Why are guests being scanned?", "", "question"],
				["I want the door policy explained.", "", "concern"],
			];
		const sets = this.replies[out.cat];
		if (!sets) return [];
		return this.pick(rec, "opt", sets).map(s => {
			const option = s.split("|");
			if (rec.f === "industry" && rec.s === "walkout" && option[0] === "Accidents happen.") option[0] = "Will the pay dispute be settled?";
			if (rec.f === "industry" && !rec.shut && option[0] === "How long until it reopens?") option[0] = "What does this mean for the next shift?";
			option[2] = option[0].endsWith("?") ? "question" : option[1] === "watched" ? "provocation" : option[1] === "critical" ? "evidence" : "opinion";
			return option;
		});
	},

	/* Official accounts that answer when a comment concerns them. */
	accounts: {
		enforcement: "island.enforcement",
		registry: "civic.registry",
		transit: "city.transit",
		halden: "halden.trust",
		unitx: "unit.exchange",
		kessler: "kessler.arms",
		printworks: "printworks.forge",
		foundry: "arcology.foundry",
		compute: "computefloor.mgmt",
		lumen: "lumen.clinic",
		meridian: "hotel.meridian",
		tidewater: "tidewater.freight",
	},

	/* Reply lines by category and mood. {D} district, {O} organisation, {N} nearest open shuttle stop.
	   A thread never uses one mood twice, so two replies can't say the same thing in different words. */
	talk: {
		TRANSIT: {
			ask: [
				"{N} is the closest working stop. About ten minutes on foot.",
				"Walk to {N}. It's quicker than waiting for a notice.",
				"Try {N}. The screens there were right this morning.",
			],
			agree: [
				"Same here. Waited twenty minutes at {D} for nothing.",
				"The fare went up twice since the maintenance contract changed. Nobody announced that either.",
				"My whole shift is late when that stop goes down.",
				"They always post the delay after you've already missed the shuttle.",
			],
			differ: [
				"Shuttles are still the best thing about this island. One bad week doesn't change that.",
				"Honestly it's been fine for me. Maybe it's just {D}.",
				"They run on time more often than not. People only post when they don't.",
			],
			joke: [
				"My legs have never been in better shape, thanks City Transit.",
				"I've started timing the shuttles against my neighbour's dog. The dog wins.",
				"Free walking tour of {D}, courtesy of the timetable.",
			],
			critical: ["The board at {D} said one thing and the screen above the door said another.", "Ask them who else uses those routes at night."],
		},
		SECURITY: {
			ask: [
				"Last time it lasted four days. They never announce the end.",
				"Ask at the Enforcement office on Civic Boulevard. They log it, even if they don't answer.",
				"Usually until the cameras show the street quiet for a full day.",
			],
			agree: [
				"Glad someone said it. {D} needed this.",
				"My shop's been quieter since they turned up. I'll take it.",
				"Patrols at night make a difference, whatever people say.",
			],
			differ: [
				"Quieter for who? They only move the trouble two streets over.",
				"I got scanned three times walking to work. It's not making anyone safer.",
				"They'll leave in a week and it'll be the same again.",
			],
			joke: [
				"Somebody give the drones a raise.",
				"My implant has been scanned so often it's started waving at them.",
				"At this point the checkpoint officer knows my lunch order.",
			],
			critical: ["Nobody ever sees the numbers behind these operations.", "They only publish the good days."],
		},
		CRIME: {
			ask: [
				"Give it a few days. These things burn out or someone steps in.",
				"Stay on the main road and you'll be fine. The trouble is in the side streets.",
				"Ask a stallholder. They always know who's collecting this week.",
			],
			agree: ["They've been circling each other all month.", "Everyone on {D} saw it coming.", "Keep your head down and your wallet in your boot."],
			differ: ["It's not as bad as the article makes it sound.", "Half of that was people filming, not fighting.", "{D} has seen worse. It'll settle."],
			joke: [
				"I'd buy tickets if it weren't on my way home.",
				"At least the stalls are getting new windows.",
				"Someone tell them the Static Room charges for this.",
			],
			critical: ["The crew names in these articles are always a guess."],
		},
		INDUSTRY: {
			ask: [
				"Nobody's said. The notice on the door hasn't changed since yesterday.",
				"From what I heard everyone got out. The rest is rumour.",
				"Shift board says nothing until the inspectors sign off.",
			],
			agree: [
				"Lost two days of pay already. Same as you, I expect.",
				"Exactly. The machines were old when I started.",
				"The crews have been saying this for months.",
			],
			differ: [
				"The operators fixed it fast this time, give them that.",
				"Accidents happen in heavy work. Nobody's to blame for every one.",
				"Most of us were back the next day.",
			],
			joke: [
				"Have they tried turning it off and on again?",
				"The safety screen counts days without accidents. Mine counts days without coffee.",
				"New press, same old gloves.",
			],
			critical: ["The ticket was closed with no comment. Mine was too.", "Ask who signed off the last inspection."],
		},
		BUSINESS: {
			ask: [
				"Customers rarely notice. Prices move a week later, if at all.",
				"Depends who you ask. The staff found out last.",
				"Read the Registry filings. They're public, just badly hidden.",
			],
			agree: [
				"Their numbers never add up when you look closely.",
				"Agreed. Contracts like that always end with fewer jobs.",
				"I closed my account there last year for the same reason.",
			],
			differ: [
				"They're one of the few companies here that pays on time.",
				"Every big firm has a dispute running. It's not news.",
				"The deal makes sense if you look at who they compete with.",
			],
			joke: [
				"My landlord will still find a way to raise the rent.",
				"Settled, private terms, everybody smiling. Classic.",
				"I'd read the full report if it weren't four hundred pages.",
			],
			critical: ["Their own review cleared them. Of course it did.", "The filings tell a different story from the statement."],
		},
		CYBERNETICS: {
			ask: [
				"Medtech Street does checks. Lumen charges for it, the smaller places don't.",
				"Registry desk on Civic Boulevard. Bring your guest ID.",
				"Any clinic with a public licence on the door can read the fault log.",
			],
			agree: ["Mine restarted twice last week. You're not imagining it.", "Exactly why I keep my backup current.", "Cheap parts, expensive lessons."],
			differ: [
				"Mine's been fine since the update.",
				"Most of the complaints are people who skipped their check-up.",
				"The clinics on Medtech Street are better than people say.",
			],
			joke: [
				"My implant restarts whenever my boss calls. Not complaining.",
				"Turned myself off and on again. Still tired.",
				"If it beeps, it's working. That's my policy.",
			],
			critical: ["Who can see your backup is the real question.", "Clinics marking their own homework again."],
		},
		SOCIETY: {
			ask: ["Nothing serious, from what I saw.", "Ask the door staff. They see everything and say nothing.", "It ended before sunrise. Most nights do."],
			agree: ["Best night on the strip this month.", "The queue alone was worth seeing.", "Exactly. {D} is the only place on the island that feels alive."],
			differ: ["Some of us live above those clubs.", "Fun for an evening, a pain for a week.", "The street was a mess the morning after."],
			joke: [
				"My ears are still ringing and I wasn't even inside.",
				"Next time I'm bringing a chair.",
				"The pickpockets had a better night than the bar staff.",
			],
			critical: ["Ask who pays for the cleanup."],
		},
		PEOPLE: {
			ask: [
				"Nobody outside the list knows. That's rather the point.",
				"They never publish the names. Guessing is half the fun.",
				"Watch the launches at the pier. That's the only guest list you'll get.",
			],
			agree: [
				"I'd give a week's pay for an invitation.",
				"Relay Street was blocked half the night. Again.",
				"Every time the Glasshouse lights up, the hotel fills.",
			],
			differ: [
				"It was a private event. Leave them alone.",
				"Half the rumours about that place are made up by people who've never been near it.",
				"Not everything up there is a mystery. Sometimes it's just dinner.",
			],
			joke: [
				"My invitation must have been lost in the post. Every time.",
				"I saw a launch. I saw a coat. That's my whole report.",
				"Guest list: rich, richer, and someone's very nervous assistant.",
			],
			critical: ["Leave the host out of it. Nobody here knows anything.", "If you go poking at the Glasshouse, don't expect anyone to help you."],
		},
		NOTICE: {
			ask: [
				"The Registry desk on Civic Boulevard can tell you more.",
				"It's on the public board by the lifts as well.",
				"Ask at your hotel desk. They get these first.",
			],
			agree: ["Useful to know.", "Good to have it written down somewhere.", "Thanks. Missed the last one."],
			differ: ["Nobody reads these.", "They post these after it's already happened.", "Half the notices are out of date by noon."],
			joke: ["Another notice about notices.", "Pinning this next to the other forty.", "Riveting stuff."],
			critical: ["These are only as accurate as whoever typed them."],
		},
		BREAKING: {
			ask: ["Nobody badly hurt, as far as I know.", "No names yet. There won't be, if Enforcement has its way.", "The footage came down within the hour."],
			agree: ["Saw it from across the street. Wild.", "People are still talking about it.", "That was not a normal night."],
			differ: ["The footage doesn't show how it started.", "Wait for the full story before picking sides.", "Every fight looks worse on camera."],
			joke: ["Somebody hire that person. Or hide.", "I'll be crossing the street a little faster now.", "New rule: don't annoy strangers at the Meridian."],
			critical: ["Enforcement only posts the footage that suits them."],
		},
		MARKETS: {
			ask: [
				"The terminal in Exchange Square shows the live price. Anything in a thread is already old.",
				"Nobody knows. Anyone who says they do is selling something.",
				"Watch the settled trades, not the statements.",
			],
			agree: ["Same. I sold half and kept half.", "I watched it move from the exchange floor. Wild hour.", "Exactly why I keep my rent money in the vault."],
			differ: [
				"Every rally here ends the same way. Eventually.",
				"It's moved this much before and come back.",
				"Most of that move happened before the article went up.",
			],
			joke: [
				"My portfolio is three Cipher and a coffee stamp card.",
				"Day trading is just gambling with better lighting.",
				"The exchange screen should come with a stress warning.",
			],
			critical: ["Whoever wrote that statement bought first.", "The exchange knows who placed those orders. It just won't say."],
		},
		WEEKLY: {
			ask: ["Same as every week, mostly."],
			agree: ["Busy one.", "Good summary."],
			differ: ["Missed half of what actually happened."],
			joke: ["Seven days, seven reasons to stay indoors."],
			critical: ["Funny what never makes the weekly."],
		},
	},

	/* Lines any thread can fall back on, so a reply never goes missing. */
	fallback: {
		agree: ["Said the same thing to my neighbour this morning.", "You've put it better than the article did."],
		differ: ["Fair, but there's another side to it.", "Not how I saw it, but I get why you'd say that."],
		joke: ["Put it on the wall at Dome Broadcast. They need new material."],
		ask: ["Nobody official has said yet."],
		critical: ["A few of us have been asking the same thing."],
	},

	/* Direct answers to each comment the player can post, so the first reply responds to what was actually said. */
	responses: {
		"Accidents happen.": ["Not this many at one site, they don't.", "Tell that to the two who got burned.", "True, but some happen because nobody listened."],
		"Are the workers all right?": [
			"Two were treated and sent home, from what I heard.",
			"They're fine. Angry, but fine.",
			"My cousin was on that shift. Shaken, not hurt.",
		],
		"Both crews deserve each other.": [
			"Until a stall owner gets caught between them.",
			"Harsh, but nobody on {D} is crying for either of them.",
			"The people paying both of them might disagree.",
		],
		"Busy week.": ["And next week looks worse.", "Busy for Dome Broadcast. Quiet for everyone else, mostly."],
		"City Transit should explain this.": [
			"They won't. They never do.",
			"They'll blame a signal fault. They always blame a signal fault.",
			"Try asking at the Civic Boulevard office. Bring patience.",
		],
		"Clinics need stricter rules.": [
			"The rules exist. Nobody checks them.",
			"Stricter rules just push people to the Underpass cutters.",
			"The good clinics already follow them. The cheap ones never will.",
		],
		"Does anyone know who the host is?": [
			"Everyone thinks they do. Nobody actually does.",
			"Some say they own half of Crown Avenue. Some say they're just a name on a lease.",
			"If you have to ask, you won't be invited.",
		],
		"Enforcement should look into it.": [
			"They're looking. Whether they say anything is another matter.",
			"They already have the footage. That's the problem.",
			"They will, for whoever pays them to.",
		],
		"Enforcement should step in.": [
			"And then leave in a week, like last time.",
			"They'd only move it to the next street.",
			"In {D}? They barely patrol the main road.",
		],
		"Glad someone is doing something.": [
			"Doing something isn't the same as fixing it.",
			"Same. It's been a long month.",
			"Give it a week before you thank them.",
		],
		"Good for them.": ["Good for their shareholders, anyway.", "Wait until you see what it costs the rest of us.", "Fair. They've earned a good week."],
		"Good to know.": ["Pass it on. Most people never see these.", "Saved me a trip, honestly."],
		"Good. The street needed it.": ["Easy to say if you don't get stopped on it.", "Agreed. My shop has been quieter.", "Needed it a month ago."],
		"Hope nobody else gets hurt.": [
			"Same. It's always someone walking home.",
			"Stay off the side streets for a few nights and you'll be fine.",
			"The clinic on Medtech Street had a long night.",
		],
		"Hope nobody was badly hurt.": ["Bruises, mostly. And pride.", "Nobody went to the clinic, as far as I heard."],
		"How long until it reopens?": [
			"The notice says nothing. My guess is three days.",
			"When the inspectors leave. Nobody knows when that is.",
			"Last time it took four.",
		],
		"How long will this last?": [
			"Usually until the cameras show a quiet day.",
			"They never announce the end. They just stop showing up.",
			"A week, if past sweeps are anything to go by.",
		],
		"I don't trust their numbers.": [
			"Nobody who's read the filings does.",
			"They're not lying. They're just not telling you everything.",
			"Their own review cleared them. Of course it did.",
		],
		"I'd let them test anything for the right price.": [
			"Read the consent form first. All of it.",
			"Two volunteers from the last trial never came back. Just saying.",
			"The pay is good. The side effects aren't in the advert.",
		],
		"I'd like an invitation.": [
			"Join the queue. It's longer than the island.",
			"Invitations aren't bought. That's the whole point.",
			"Be careful what you wish for up there.",
		],
		"Is the stop open or not?": [
			"The screen at the stop says no. The notice says yes. Believe the screen.",
			"Not when I went past this morning.",
			"Depends which of them you believe.",
		],
		"Is this accurate?": ["Mostly. These go up before anyone checks them.", "Accurate when it was posted. Things change by noon."],
		"Is this up to date?": ["It was this morning.", "Probably not. They post these and forget them."],
		"Just walk.": [
			"Easy if you don't live at the far end of {D}.",
			"Walking through some of those streets at night isn't great advice.",
			"Fair. It's quicker some days.",
		],
		"Leave the clubs alone.": [
			"Happily, if they'd keep the noise down after four.",
			"The clubs are the only thing keeping {D} going.",
			"Nobody's touching the clubs. It's the street outside that's the problem.",
		],
		"Leave them alone.": [
			"Agreed. Whatever happens up there is their business.",
			"Nobody's bothering them. Everyone's just curious.",
			"Easier said than done when Relay Street gets shut for a night.",
		],
		"Let people have their privacy.": [
			"The Glasshouse has more privacy than the rest of the island combined.",
			"Hard to keep private with launches lining up at the pier.",
			"Fair. Most of the rumours are nonsense anyway.",
		],
		"Listen to the workers next time.": [
			"They never do. They listen to the fines.",
			"The workers wrote it down twice. Nobody read it.",
			"This time, maybe. The fine was bigger.",
		],
		"Must be nice.": ["Must be very nice.", "They seemed to be having a good time, from the street.", "Someone has to pay for all those launches."],
		"Next time I'm going.": ["You and the rest of {D}.", "Get there before the queue reaches the corner.", "Bring earplugs."],
		"Nobody reads these.": ["I just did. Under protest.", "The people who should read them don't, at least."],
		"Nobody will go to jail for it.": [
			"A fine and a statement. Same as always.",
			"Not anyone important, anyway.",
			"Someone junior will lose their job. That's the usual.",
		],
		"Nothing ever really changes.": ["The names change. The stories don't.", "Some weeks are quieter. That's something."],
		"Pay the crews for the lost days.": [
			"Agreed. It wasn't their fault.",
			"They will, if the inspectors make them.",
			"Lost days are never paid here. Ask anyone.",
		],
		"Should I get my implant checked?": [
			"If it's restarted more than once, yes.",
			"Can't hurt. The smaller clinics are cheaper.",
			"Only if you've had the recent update.",
		],
		"Shuttles are still better than walking.": [
			"When they stop, yes.",
			"Agreed. Even a late shuttle beats the Underpass on foot.",
			"Until you're the one standing at a dark stop.",
		],
		"Sounds dangerous. Stay away.": [
			"Good advice. I'm taking the long way round.",
			"Dangerous for the people involved. Everyone else just watches.",
			"It's over now. Probably.",
		],
		"Sounds like a good night.": ["It was, until the street cleaners arrived.", "Best one this month.", "For the people inside, anyway."],
		"Sounds like business as usual.": ["That's what worries me.", "Business as usual is the problem.", "Pretty much. Nothing to see."],
		"Stay away from there for a few days.": ["Sensible. It usually calms down by the weekend.", "Easier said than done if you live there.", "Already am."],
		"Thanks for the notice.": ["Same. I'd have missed it otherwise."],
		"Thanks for the summary.": ["Saves reading the whole week, honestly."],
		"The neighbours have a point.": ["Thank you. Some of us have to sleep.", "They chose to live above a club.", "They do. The noise is getting worse."],
		"The notices don't match what people see.": [
			"They never do. Trust the stop screen.",
			"Noticed that too. The board said one thing, the street another.",
			"Someone's writing those notices from very far away.",
		],
		"This is why I stay registered.": ["Registered people get scanned more, though.", "Smart. Backups saved my job once."],
		"Was anyone hurt?": ["Not badly, from what I heard.", "One person, minor. Nothing on the news about it."],
		"What does this mean for customers?": [
			"Higher prices, eventually.",
			"Nothing, for a few weeks. Then you'll notice.",
			"Read the small print on your next bill.",
		],
		"Where can I get a check?": ["Any clinic on Medtech Street.", "The small clinics are cheaper and quicker than Lumen."],
		"Which stop is closest instead?": ["{N}. About ten minutes on foot.", "Try {N}. The screens there were right this morning."],
		"Who can see my backup?": ["The Registry says only staff. The Registry says a lot of things.", "Nobody will give you a straight answer on that."],
		"Who checks their accounts?": ["The Registry, in theory.", "Their own auditors. Draw your own conclusions."],
		"Who decides these things?": ["Someone in an office on Civic Boulevard.", "Nobody you'll ever meet."],
		"Who decides who gets stopped?": [
			"The cameras pick, the officers follow.",
			"Ask anyone with a guest chip. It's not random.",
			"Officially, nobody. Unofficially, you can guess.",
		],
		"Who was invited?": [
			"Nobody below the forty-third floor, that's for sure.",
			"The names never leave the building.",
			"Watch who leaves the pier by launch. That's your list.",
		],
		"Who was it?": ["No names yet. Probably never.", "Someone new to the island, apparently."],
		"Wish I'd been there.": ["You'd have hated the queue.", "Next time. There's always a next time on {D}."],
	},

	/* Boilerplate from official accounts, in a few wordings so one account doesn't post the same sentence twice in a month. */
	official: {
		refer: [
			"We have sent information about this account to the Civic Registry so staff can confirm who owns it.",
			"This post has been logged. The account holder may be asked to confirm their identity.",
			"Public threats are recorded and passed to the Civic Registry.",
			"Please visit the Enforcement office on Civic Boulevard regarding this post.",
		],
		threat: [
			"Threats against our staff or sites are passed to Island Enforcement.",
			"This comment has been reported to Island Enforcement.",
			"We take threats to our sites seriously. This post has been reported.",
		],
		stand: [
			"Our statement stands. Service information comes from our own records.",
			"We stand by the information we published.",
			"Our published notice is accurate. Further questions can go to our public office.",
		],
		query: [
			"Questions about this matter can be sent to our public office.",
			"We are aware of the discussion and will publish an update if anything changes.",
			"Our public office can answer questions about this.",
		],
	},

	/* The player's comment, answered the next in-game day. Returns [{ h: handle, t: text, at, o: official, n: network notice }].
	   Rules: the first reply answers what the player said; no line repeats inside a thread; no handle repeats a line within
	   28 days; one thread never uses the same mood twice, so two replies can't say the same thing in different words. */
	reply(rec, cm, day) {
		const N = setup.arcologyNews;
		const st = N.state();
		const view = this.write(rec);
		const [selected = "", flag] = view.options[cm.i] ?? [];
		const said = cm.t || selected;
		const intent = flag || (said.endsWith("?") ? "ask" : "say");
		const r = k => N.seed(`${rec.id}|reply|${k}`);
		const pick = (k, list) => list[Math.floor(r(k) * list.length)];
		const at = day * N.DAY + Math.floor(8 + r("h") * 12) * 3600 + Math.floor(r("m") * 6) * 600;
		if (rec.k === "reminder") {
			const answer = cm.i === 0 ? rec.x.answer : rec.x.where;
			const signature = Math.floor(N.seed(N.normalize(answer)) * 1e5);
			const used =
				(st.said ?? []).some(x => x[0] >= day - N.KEEP && x[3] === signature) ||
				Object.entries(st.comments)
					.filter(([id]) => id !== rec.id)
					.map(([, c]) => c)
					.flatMap(c => c.r ?? [])
					.some(x => x.at >= (day - N.KEEP) * N.DAY && N.similar(x.t, answer));
			return [{ h: "dome.broadcast", t: used ? `${rec.x.title}: ${answer} ${rec.x.body[0]}` : answer, at, o: 1 }];
		}
		const me = V.xchange.arcology.handle || "Guest";
		const thread = view.residents.map(x => x[0]);
		const publicSubject = N.publicSubject(rec);
		const locals = this.people.filter(p => p[2] === publicSubject.d).map(p => p[0]);
		const stops = (setup.arcology.neighbours(publicSubject.d ?? "relay") ?? []).filter(
			id => setup.arcology.districts[id]?.bus && !setup.arcology.districts[id].hidden
		);
		const vals = {
			D: this.district(publicSubject.d),
			O: N.orgName(publicSubject.o) || "they",
			N: stops.length ? this.district(pick("stop", stops)) : "Relay Street",
		};
		const fill = s => s.replace(/\{(\w)\}/g, (m, k) => vals[k] ?? m);
		const hash = t => Math.floor(N.seed(t) * 1e5);
		const recent = {};
		for (const [d, h, x] of st.said ?? []) if (d >= day - N.KEEP) (recent[h] ??= new Set()).add(x);
		const recentText = new Set(
			(st.said ?? [])
				.filter(x => x[0] >= day - N.KEEP)
				.map(x => x[3])
				.filter(x => x !== undefined)
		);
		const recentReplies = Object.values(st.comments)
			.flatMap(c => c.r ?? [])
			.filter(x => x.at >= (day - N.KEEP) * N.DAY)
			.map(x => x.t);
		const usedText = new Set(view.residents.map(x => x[1]));
		const usedHandle = new Set([me]);
		const usedMood = new Set();
		const out = [];
		const add = (h, t, extra) => {
			usedHandle.add(h);
			usedText.add(t);
			/* About half the resident replies address the player by handle, so they read as answers. */
			const shown = !extra?.o && r(`${h}|at`) < 0.5 ? `@${me} ${t}` : t;
			out.push(Object.assign({ h, t: shown, at: at + out.length * 1800 }, extra));
		};
		/* The first line in a seeded order that this thread and this handle haven't used. */
		const fresh = (k, list, h) =>
			list
				.map(fill)
				.map((t, i) => [t, N.seed(`${rec.id}|${k}|${i}`)])
				.sort((x, y) => x[1] - y[1])
				.map(x => x[0])
				.find(
					t =>
						!usedText.has(t) &&
						!recent[h]?.has(hash(t)) &&
						!recentText.has(hash(N.normalize(t))) &&
						![...recentReplies, ...usedText].some(old => N.similar(old, t))
				);
		const someone = (k, mood) => {
			const mix = list => [...list].sort((x, y) => N.seed(rec.id + k + x) - N.seed(rec.id + k + y));
			const profiles = {
				agree: ["loyal", "local"],
				critical: ["skeptic"],
				joke: ["joker"],
				differ: ["skeptic", "worried"],
				ask: ["worker", "local", "worried"],
			};
			const people = mix(this.people.filter(p => !mood || profiles[mood]?.includes(p[1])).map(p => p[0]));
			const order = r(k + "t") < 0.6 ? [...mix(thread.filter(h => people.includes(h))), ...people] : people;
			return order.find(h => !usedHandle.has(h)) ?? "paper.moth";
		};
		/* A resident line in a mood: this category's lines first, the shared fallback only when they're used up. */
		const resident = (k, mood) => {
			if (usedMood.has(mood)) return false;
			const h = someone(k, mood);
			const t = fresh(k, this.talk[view.cat]?.[mood] ?? [], h) ?? fresh(k + "f", this.fallback[mood] ?? [], h);
			if (!t) return false;
			usedMood.add(mood);
			add(h, t);
			return true;
		};
		const answer = k => {
			let h = someone(k);
			const facts = {
				"Can guests join this trial?": [
					rec.ph === "fixed"
						? "The clinic has stopped taking volunteers for this round. An older recruitment advert is not a current invitation to join."
						: "The report does not confirm guest eligibility. Check the clinic's actual service notice before treating the announcement as an offer to your account.",
				],
				"What are volunteers being asked to test?": [
					"The report describes a new implant part. It does not name the exact component or give enough detail to assess its effects.",
				],
				"I would read the consent terms first.": ["So would I. The clinic's statement about a consent form is not a full explanation of the terms."],
				"Can a guest make a Registry backup?": [
					"Guest record backup is unavailable. The Civic Registry offers guests a public record check, which does not create a backup.",
				],
				"Who is allowed to read existing backups?": [
					rec.ph === "fixed"
						? "The update says the Registry reduced the number of staff who can open backups. It doesn't publish a complete access list."
						: "This report raises questions about access to existing records. It doesn't establish a complete list of authorized readers.",
				],
				"A record check is not a backup.": ["Correct. The guest record screen explicitly says backup is unavailable."],
				"Does my guest implant authorize new body parts?": [
					"No. A basic guest implant provides identity and Holo access. It does not grant resident purchasing rights or an advanced procedure appointment.",
				],
				"I would check the service desk's restrictions first.": [
					"That is the useful check. A news report or advertisement doesn't change the authorization on your account.",
				],
				"Why are guests being scanned?": [
					"The report says Enforcement required implant checks at this venue. It doesn't announce a general change to guest clearance.",
				],
				"I want the door policy explained.": [
					"The reported requirement is an implant check. The article gives no further door-policy terms, so I'd check with the venue before going.",
				],
				"Will the pay dispute be settled?": [
					rec.ph === "reopen"
						? "This update says the workers returned after payment of the overtime was agreed."
						: "A settlement hasn't been confirmed in this update. The dispute is over overtime pay, so I'd look for a payment agreement in the follow-up.",
				],
				"Accidents happen.": [
					rec.s === "shortage"
						? "This report concerns a delayed delivery. Whether it was avoidable depends on the supply arrangements; the update doesn't establish that."
						: "Some faults can be prevented. I'd want the equipment checks explained before assuming there was nothing anyone could do.",
				],
				"Pay the crews for the lost days.": [
					"The report gives no confirmed compensation arrangement for lost shifts. A return to work doesn't settle that question.",
				],
				"What does this mean for customers?": [
					rec.s === "expansion" && rec.ph === "withdrawn"
						? "The planned opening has been cancelled. The report announces no change to the existing customer service or prices."
						: rec.s === "expansion"
						? "They've announced extra space, but the report doesn't say whether prices or service hours will change."
						: rec.s === "wages"
						? "This dispute is about staff pay deductions. The report doesn't announce changes for customers."
						: rec.s === "leak"
						? "The report concerns purchasing records. It doesn't establish an effect on customer bills."
						: rec.s === "recall"
						? "It concerns a batch of faulty parts. Check with the seller whether your part is affected before buying a replacement."
						: "The report doesn't give a confirmed change to customer terms. I'd check the next service notice rather than assume a price rise.",
				],
				"Who was invited?": [
					"I haven't seen a public guest list. The article doesn't name the guests.",
					"Private invitations, from what the report says. I don't know whose names were on them.",
					"The report describes the gathering, but it doesn't tell us who received invitations.",
				],
				"Let people have their privacy.": ["I agree about privacy. Seeing people arrive doesn't tell us what they discussed inside."],
				"Leave them alone.": ["Private attendance isn't a reason to publish someone's identity. I'd keep the discussion to what the report actually confirms."],
				"Just walk.": [
					rec.ph === "reopen"
						? "This update says the shuttles are stopping there again. Whether walking suits you still depends on the streets you would cross."
						: "Walking is an option, but it still means crossing the streets on the way. The report gives no verified safe diversion.",
				],
				"Sounds like a good night.": [
					rec.s === "noise"
						? "The report includes complaints about noise and the crowd outside. I'd take those into account as well as the event itself."
						: "I'd check the venue's door arrangements before making plans. The event report doesn't guarantee admission.",
				],
				"The neighbours have a point.": [
					"An event can affect the people living beside the venue even when they aren't attending. Their concerns deserve a hearing too.",
				],
				"Next time I'm going.": [
					"I'd check the current door policy before setting out, especially any implant checks. A report about one night doesn't guarantee entry next time.",
				],
				"Nobody will go to jail for it.": [
					"This update covers the published commercial dispute. It announces no criminal charges or court finding, so I'd keep those questions separate.",
				],
				"Does anyone know who the host is?": ["The report only uses the host's public name. I don't know anything beyond that."],
				"Should I buy now?": [
					"Nobody in a thread can tell you that. The report gives the price at publication; the terminal shows where it is now, and buying and selling back costs you the spread.",
				],
				"Is the announcement real?": [
					["announce", "deny", "denied"].includes(rec.ph)
						? "It's a real statement from the company. Whether the trades happen is a separate question, and the exchange records will show that."
						: rec.ph === "first"
						? "There isn't an announcement yet. This report is about claims nobody has confirmed."
						: "This update is based on exchange records or an official finding, not only a statement.",
				],
				"I'm holding what I have.": ["Fair. Holding keeps your Cipher; only its value in pounds moves with the price."],
				"How far can it fall?": ["Nobody knows. The report says what has happened so far, not where the price stops."],
				"Who checks the exchange records?": [
					"The Civic Registry reviews disputed records. The Unit Exchange publishes settled trades, but not who placed every order.",
				],
				"Easy money for whoever knew first.": [
					"Only if what they knew was true and they sold before everyone else. Plenty of people buy on a rumour and lose.",
				],
				"Are the workers all right?": [
					rec.s === "press" && view.body.some(p => /two workers.*treated.*burns/i.test(p))
						? "Two workers were reported treated for burns. There isn't a further medical update here, so I don't know how they are recovering."
						: "I don't have a confirmed account of anyone's condition. I'd wait for an update rather than guess.",
				],
				"Was anyone hurt?": ["I haven't seen any injuries confirmed in this report. I don't know more than that."],
				"What does this mean for the next shift?": [
					"Work hasn't been reported closed here. I'd ask the shift supervisor about the arrangements before setting out.",
				],
				"Who decides who gets stopped?": ["The report doesn't explain how people are selected. That's what I'd like Enforcement to answer too."],
				"How long will this last?": ["I don't see a firm end date in this update. I'd check for a follow-up before making plans around it."],
				"Hope nobody was badly hurt.": ["Same. I haven't seen a confirmed injury report."],
				"Should I get my implant checked?": [
					"Ask the clinic whether your part is affected. Nobody reading this comment knows whether your implant has that problem.",
				],
				"I'd let them test anything for the right price.": ["I'd read the consent terms before deciding. The advert won't answer every question."],
				"How long until it reopens?": [
					rec.ph === "reopen"
						? "This report says work has resumed. Check the entrance notice for today's booking arrangements."
						: "I don't see a confirmed reopening time in this report. I'd check the entrance notice before travelling.",
				],
				"Is the stop open or not?": [
					rec.ph === "reopen"
						? "This update says shuttles are stopping there again."
						: rec.sp === 1
						? "The operator says it's open. That's their account; I can't independently confirm the stop is running."
						: "This report describes a closure. I'd check the current stop display before setting out.",
				],
				"Which stop is closest instead?": [
					"The article doesn't give a verified walking diversion. Check the route map and current stop notices before choosing one.",
				],
				"Who was it?": ["The report doesn't identify the person involved. I don't know who it was, and I'd rather not guess."],
				"Listen to the workers next time.": ["Agreed that workers should be heard. I want to see their concerns answered in the follow-up."],
				"I don't trust their numbers.": ["I'd like the underlying records too. We need the actual records to check which figures are wrong."],
				"Who checks their accounts?": [
					rec.ph === "audit" || (rec.s === "leak" && ["outcome", "unresolved"].includes(rec.ph))
						? "The Civic Registry is the reviewer named in this report. Its examination concerns the purchasing documents, not every account held by the company."
						: "I'd look for a named reviewer and published findings. A company checking its own accounts cannot replace a review by someone outside the company.",
				],
			};
			const current = rec.k === "story" ? this.families[rec.f][rec.ph].call(this, rec, this.context(rec)).body.filter(Boolean)[0] : view.body[0];
			const first = rec.h?.[0];
			let background = "";
			if (first) {
				const [ph, timestamp, n, sp, id, q] = first;
				const earlier = Object.assign({}, rec, { ph, at: timestamp, n, sp, id, q, h: [] });
				background = this.families[rec.f][ph].call(this, earlier, this.context(earlier)).body.filter(Boolean)[0];
			}
			const lines = facts[said] ?? [`Regarding “${said}”: ${current} The published account gives no further confirmation of that point.`];
			let t = fresh(k, lines, h);
			/* Exhausting one account's wording must never turn a direct question into an unrelated category reply. */
			if (!t) {
				for (const person of this.people) {
					if (usedHandle.has(person[0])) continue;
					const candidate = fresh(k, lines, person[0]);
					if (candidate) {
						h = person[0];
						t = candidate;
						break;
					}
				}
			}
			if (!t)
				t = facts[said]
					? `${fill(pick(k, lines))} ${current}${background ? ` Earlier coverage reported: ${background}` : ""}`
					: `About “${said}”: ${current}${background ? ` The initial account was: ${background}` : ""}`;
			usedMood.add(intent === "ask" ? "ask" : "agree");
			add(h, t);
			return true;
		};
		const officialSays = (h, kind, extra) => {
			const t = fresh("off" + kind, this.official[kind], h) ?? `Regarding “${said}” under “${view.title}”: ${this.official[kind][0]}`;
			add(h, t, Object.assign({ o: 1 }, extra));
		};
		const official =
			this.accounts[publicSubject.o] ?? this.accounts[{ SECURITY: "enforcement", CRIME: "enforcement", TRANSIT: "transit", BREAKING: "enforcement" }[view.cat]];

		if (intent === "watched") {
			if (["SECURITY", "BREAKING"].includes(view.cat) || !official) officialSays("island.enforcement", "refer", { n: 1 });
			else if (view.cat === "CRIME") {
				const h = pick("crime", ["static.wren", "ozone.kid", "shard77"]);
				const t = fresh(
					"crime",
					[
						"If you meant that, the Static Room has a back door. Come after midnight.",
						"Bold talk for a guest chip. Someone will want to meet you.",
						"Talk like that gets noticed. Some of us like being noticed.",
					],
					h
				);
				if (t) add(h, t);
			} else officialSays(official, "threat", { n: 1 });
			if (r("second") < 0.6) {
				const h = someone("w2");
				const t = fresh(
					"w2",
					[
						"Brave thing to post on a public channel.",
						"You know they read these, right?",
						"Deleting that would be smart.",
						"Hope that handle isn't tied to anything you care about.",
					],
					h
				);
				if (t) add(h, t);
			}
		} else if (intent === "critical") {
			answer("direct");
			const seenFn = this.seen[rec.f]?.[rec.ph];
			const seen = typeof seenFn === "function" ? seenFn(rec) : seenFn;
			const local = locals.find(h => !usedHandle.has(h));
			const opener = ["I live near there.", "I'm on that street every day.", "Walked past it this morning."];
			const closer = ["You're not the only one who noticed.", "Don't trust the notice.", "Go and look for yourself."];
			const lines = seen ? opener.flatMap(o => closer.map(c => `${o} ${seen} ${c}`)) : [];
			const t = rec.sp === 1 && local && fresh("loc", lines, local);
			if (t) {
				usedMood.add("critical");
				add(local, t);
			} else if (!out.length && !answer("c0")) resident("c1", "critical");
			if (official && r("off") < (rec.sp === 1 ? 0.7 : 0.35)) officialSays(official, rec.sp === 1 ? "stand" : "query");
			else if (r("susp") < 0.25) {
				const h = someone("c3");
				const s = fresh(
					"c3",
					["Funny how everyone asking questions ends up being asked for their registry details.", "Careful. Questions like that get noticed."],
					h
				);
				if (s) add(h, s);
			}
		} else {
			if (!answer("a0")) resident("a1", intent === "ask" ? "ask" : pick("mood", ["agree", "differ", "joke"]));
		}
		/* Every comment gets at least one reply. */
		if (!out.length) answer("guaranteed");
		return out;
	},

	/* What a visitor sees of a Cipher crisis (level from setup.arcologyFx.crisis), where no story has its own street line. */
	crisisStreet(district, level) {
		if (!level) return "";
		if (district === "exchange")
			return level >= 2
				? "People are waiting in a long line outside the Halden Trust, all the way across Exchange Square. Officers direct people towards the entrance while customers near the doors argue about getting inside."
				: "A crowd has gathered outside the Halden Trust. People keep checking their wallets on their implants.";
		if (level >= 3 && ["ironworks", "commerce"].includes(district))
			return "Workers have gathered outside their workplaces. Notices on the doors say paid shifts are suspended, so the workers have no paid work to do there today.";
		if (level >= 2 && ["market", "commerce", "neon", "relay", "flats"].includes(district))
			return "Screens in the shop windows read CIPHER PAYMENTS SUSPENDED. A few traders are offering to swap Cipher for goods at terrible rates.";
		if (level >= 4) return "Several groups walk along the street, stopping to look at shops that have closed. You see fewer Enforcement officers than usual.";
		return "";
	},

	/* What a visitor sees in a district while a story is running there. Always the truth. */
	street(e, fx) {
		const D = this.district(e.d);
		if (fx.stop) {
			const base = "The shuttle stop's screen reads NOT IN SERVICE.";
			return fx.smuggle ? `${base} Freight carts with Tidewater Freight markings are parked in the shuttle bay.` : base;
		}
		if (fx.closed) return `A notice at the entrance to ${setup.arcologyNews.places[fx.closed].name} says all work is cancelled for now.`;
		if (fx.patrol) return `Enforcers are checking implants along ${D}. The groups usually gathered on the street corners are no longer there.`;
		if (fx.checkpoint) return "Registry staff with handheld scanners are checking implants at the end of the street.";
		if (fx.rough)
			return e.f === "sweep"
				? "The same groups that left during the Enforcement operation have returned to the street corners."
				: "Members of rival crews have gathered on street corners. The groups watch one another as people walk past.";
		if (fx.smuggle) return "Couriers push covered carts along the street, keeping away from the security cameras.";
		if (fx.scams) return "Sellers are offering cheap replacement parts from crates at the side of the road.";
		if (fx.trials) return "Clinic staff with clipboards stop visitors along the street, offering paid trials.";
		if (fx.crowd) return "The street is packed tonight. People bump into you as you pass.";
		return "";
	},
};
