// Run element cleanup when jQuery removes its event data, including through .empty() and .html().
$.event.special.remove = {
	remove(handleObj) {
		handleObj.handler.call(this);
	},
};
