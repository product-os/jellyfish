const GraphQLAstVisitor = require('../graphql-ast-visitor')
const CardQueryBuilder = require('../card-query-builder')

module.exports = async (source, _args, context, astRoot) => {
	const {
		jellyfish
	} = context

	const queryBuilder = new CardQueryBuilder(0, astRoot)
	const visitor = new GraphQLAstVisitor(astRoot, queryBuilder)
	visitor.visitRoot()

	const query = queryBuilder.getQuery()
	const sql = query.formatAsSql()
	console.dir([ 'generated query', query, sql ])

	const result = await jellyfish
		.backend
		.connection
		.query(sql)

	const cardResult = result.map((row) => { return row.card })

	console.dir([ 'query result', cardResult ], {
		depth: null
	})

	return cardResult

	// Try {
	// 	const resolver = new CardQueryResolver(source, context, astRoot)
	// 	const query = resolver.resolve()
	// 	const sql = query.formatAsSql()

	// 	console.dir([ 'generated query', query, sql ], {
	// 		depth: null
	// 	})

	// 	const result = await jellyfish.backend.connection.query(sql)
	// 	console.dir([ 'query result', result ])

	// 	return result
	// } catch (error) {
	// 	console.dir([ 'the error was', error ])
	// 	return []
	// }
}
