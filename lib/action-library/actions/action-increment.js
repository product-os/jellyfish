module.exports = {
	slug: 'action-increment',
	type: 'action',
	version: '1.0.0',
	name: 'Increment a field on a card',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		arguments: {
			reason: {
				type: [ 'null', 'string' ]
			},
			path: {
				type: 'array',
				items: {
					type: 'string'
				}
			}
		}
	},
	requires: [],
	capabilities: []
}
