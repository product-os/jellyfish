/* eslint-disable no-shadow */
const CardQueryBuilder = require('./card-query-builder')

const getSelections = (ast) => {
	if (ast && ast.selectionSet && ast.selectionSet.selections && ast.selectionSet.selections.length) {
		return ast.selectionSet.selections
	}
	return []
}

const isFragment = (ast) => {
	return ast.kind === 'InlineFragment' || ast.kind === 'FragmentSpread'
}

// Walks an incoming GraphQL request's AST and translates it into a SQL query.
//
// Returns an instance of `SqlQueryBuilder` containing a SQL `SELECT` query.
module.exports = class CardQueryResolver {
	constructor (source, context, astRoot, builder = new CardQueryBuilder()) {
		this.source = source
		this.context = context
		this.astRoot = astRoot
		this.builder = builder
	}

	resolve () {
		// We must always select the type field, else runtime type resolution
		// doesn't work.
		this.builder.dsl().type()

		const fields = this.astRoot.fieldNodes || this.astRoot.fieldASTs
		for (const node of fields) {
			this.visitAST(node)
		}

		return this.builder.getSelectQuery()
	}

	handleArgs (args) {
		if (args.id) {
			this.builder.filterFieldByConstantValue('id', args.id)
		} else if (args.slug) {
			this.builder.filterFieldByConstantValue('slug', args.slug)
		}
	}

	visitAST (ast) {
		const dsl = this.builder.dsl()

		for (const node of getSelections(ast)) {
			if (isFragment(node)) {
				this.visitAST(this.getFragmentAst(node))
			} else {
				const name = node.name.value
				if (typeof (dsl[name]) === 'function') {
					dsl[name]()
				}
			}
		}
	}

	getFragmentAst (node) {
		if (node.kind === 'FragmentSpread') {
			const fragmentName = node.name.value
			return this.astRoot.fragments[fragmentName]
		}
		return node
	}
}
