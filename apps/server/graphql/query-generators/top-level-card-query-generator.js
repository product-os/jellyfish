const BaseCardQueryGenerator = require('./base-card-query-generator')
const SqlQueryBuilder = require('../sql-query-builder')

module.exports = class TopLevelCardQueryGenerator extends BaseCardQueryGenerator {
	constructor () {
		super(0)
		this.selectedFields = new Set()
		this.builder = new SqlQueryBuilder()
	}

	prepare () {
		this.selectField('type')
	}

	selectField (name) {
		if (this.selectedFields.has(name)) {
			return
		}
		super.selectField(name)
		this.builder.as(name)
		this.selectedFields.add(name)
	}

	finalise () {
		this.builder.table('cards')
		this.builder.as(this.alias)
		this.builder.from()
	}
}
