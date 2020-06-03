const getSelections = (ast) => {
	if (ast && ast.selectionSet && ast.selectionSet.selections && ast.selectionSet.selections.length) {
		return ast.selectionSet.selections
	}
	return []
}

const isFragment = (ast) => {
	return ast.kind === 'InlineFragment' || ast.kind === 'FragmentSpread'
}

module.exports = class GraphQLAstVisitor {
	constructor (astRoot, queryBuilder) {
		this.astRoot = astRoot
		this.queryBuilder = queryBuilder
	}

	visitRoot () {
		const fields = this.astRoot.fieldNodes || this.astRoot.fieldASTs
		fields.forEach((field) => {
			return this.visitAST(field)
		})
	}

	visitAST (ast) {
		for (const node of getSelections(ast)) {
			if (isFragment(node)) {
				this.visitAST(this.getFragmentAst(node))
			} else {
				this.queryBuilder.buildForNode(node)
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
