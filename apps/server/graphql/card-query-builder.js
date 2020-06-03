const LinkQueryBuilder = require('./link-query-builder')
const SqlQueryBuilder = require('./sql-query-builder')
const GraphQLAstVisitor = require('./graphql-ast-visitor')
const {
	snakeCase
} = require('change-case')

module.exports = class CardQueryBuilder {
	constructor (depth, astRoot) {
		this.depth = depth
		this.astRoot = astRoot
		this.alias = `C${depth}`
		this.builder = new SqlQueryBuilder()
		this.builder.table('cards')
		this.builder.as(this.alias)
		this.builder.from()
		this.fieldCount = 0
		this.buildTypeFieldSelect()
		this.fieldCount++
	}

	buildForNode (node) {
		const name = node.name.value

		switch (name) {
			case 'type':
				// Skip, because we already forced it to be included.
				break

			case 'version':
				this.buildVersionFieldSelect()
				this.builder.as(name)
				this.fieldCount++
				break

			case 'genericData':
				this.builder.fieldFrom(this.alias, 'data')
				this.builder.as(name)
				this.fieldCount++
				break

			case 'links':
				this.buildLinkFieldSelect(node)
				this.builder.as(name)
				this.fieldCount++
				break

			default:
				this.builder.fieldFrom(this.alias, snakeCase(name))
				this.builder.as(name)
				this.fieldCount++
		}

		return this
	}

	getQuery () {
		this.builder.function('ROW_TO_JSON', this.fieldCount)
		this.builder.as('card')
		return this.builder.select()
	}

	buildLinkFieldSelect (node) {
		console.dir([ 'linksNode', node ])
		const linkQueryBuilder = new LinkQueryBuilder(this.depth, this.astRoot)
		const visitor = new GraphQLAstVisitor(this.astRoot, linkQueryBuilder)
		visitor.visitAST(node)
		const linkQuery = linkQueryBuilder.getQuery(this.alias)
		this.builder.append(linkQuery)
	}

	buildTypeFieldSelect () {
		this.builder.fieldFrom(this.alias, 'type')
		this.builder.as('type')
	}

	buildVersionFieldSelect () {
		this.builder.constant('.')
		this.builder.fieldFrom(this.alias, 'version_major')
		this.builder.constant('1')
		this.builder.function('COALESCE', 2)
		this.builder.cast('text')
		this.builder.fieldFrom(this.alias, 'version_minor')
		this.builder.constant('0')
		this.builder.function('COALESCE', 2)
		this.builder.cast('text')
		this.builder.fieldFrom(this.alias, 'version_patch')
		this.builder.constant('0')
		this.builder.function('COALESCE', 2)
		this.builder.cast('text')
		this.builder.function('CONCAT_WS', 4)
	}
}
