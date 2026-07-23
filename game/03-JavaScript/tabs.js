const Tab = class {
	constructor(element, selectedClass) {
		this.element = element;
		this.selectedClass = selectedClass;
		this.activeTab = -1;
	}

	/* queried live instead of cached */
	get tabs() {
		return $("#" + this.element).find("button");
	}

	setActive(index = 0) {
		/* jQuery's ready callback always resolves as a microtask (even when the document is already ready),
		which reliably runs after that attachment, so this must stay wrapped rather than made synchronous. */
		$(() => {
			if (index === -1) return;
			this.activeTab = index;
			this.toggle(this.tabs.eq(index));
		});
	}

	toggle(target = $(window.event ? window.event.currentTarget : null)) {
		this.reset();
		const tabs = this.tabs;
		this.activeTab = tabs.index(target);
		target.addClass(this.selectedClass);
	}

	reset() {
		this.activeTab = -1;
		this.tabs.removeClass(this.selectedClass);
	}
};
window.Tab = Tab;
