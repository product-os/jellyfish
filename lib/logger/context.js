const randomstring = require('randomstring')
const _ = require('lodash')

module.exports.systemContext = {
	id: 'SYSTEM'
}

module.exports.testContext = {
	id: 'TEST'
}

module.exports.newPrefixContext = (name) => {
	const id = `${name}-${randomstring.generate(20)}`
	return {
		id
	}
}

module.exports.mergeContext = (...ctxs) => {
	return _.merge({}, ...ctxs)
}

module.exports.newWorkerContext = () => {
	const workerid = `WORKER-${randomstring.generate(20)}`
	return module.exports.mergeContext({
		workerid
	}, module.exports.systemContext)
}
