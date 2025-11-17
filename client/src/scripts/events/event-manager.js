const EventBus = new EventTarget()

export const Events = {
	on(eventName, callback) {
		EventBus.addEventListener(eventName, callback)
	},

	off(eventName, callback) {
		EventBus.removeEventListener(eventName, callback)
	},

	emit(eventName, data) {
		EventBus.dispatchEvent(new CustomEvent(eventName, { detail: data }))
	},
}
