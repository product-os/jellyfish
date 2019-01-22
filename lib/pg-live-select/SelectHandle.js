// Pg-live-select, MIT License
const EventEmitter = require('events').EventEmitter

const _ = require('lodash')

class SelectHandle extends EventEmitter {
	constructor (parent, queryHash) {
		super()

		this.parent = parent
		this.queryHash = queryHash
	}

	stop () {
		const queryBuffer = this.parent.selectBuffer[this.queryHash]

		if (queryBuffer) {
			_.pull(queryBuffer.handlers, this)

			if (queryBuffer.handlers.length === 0) {
				// No more query/params like this, remove from buffers
				Reflect.deleteProperty(this.parent.selectBuffer, this.queryHash)
				_.pull(this.parent.waitingToUpdate, this.queryHash)

				Object.keys(this.parent.allTablesUsed).forEach((table) => {
					_.pull(this.parent.allTablesUsed[table], this.queryHash)
				})
			}
		}
	}
}

module.exports = SelectHandle
