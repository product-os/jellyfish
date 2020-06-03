const BaseCardQueryGenerator = require('./base-card-query-generator')

module.exports = class NestedCardQueryGenerator extends BaseCardQueryGenerator {
	constructor (depth) {
		super(depth)
		this.selectedFields = new Set()
	}

	prepare () {
		this.selectField('type')
	}

	selectField (name) {
		this.builder.constant(name)
		super.selectField(name)
		this.selectedFields.add(name)
	}

	finalise () {
		this.builder.function('JSON_BUILD_OBJECT', this.selectedFields.size * 2)
	}
}
