module.exports = {
	slug: 'action-increment-tag',
	type: 'action',
	version: '1.0.0',
	name: 'Increment a the count value on a tag, or create one if it doesn\'t exist',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		arguments: {
			reason: {
				type: [ 'null', 'string' ]
			},
			name: {
				type: 'string'
			}
		}
	},
	requires: [],
	capabilities: []
}
