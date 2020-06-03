// Const CardQueryResolver = require('../card-query-resolver')

module.exports = async (source, args, context, astRoot) => {
	const {
		jellyfish
	} = context

	// Try {
	// 	const resolver = new CardQueryResolver(source, context, astRoot)
	// 	resolver.handleArgs(args)
	// 	const query = resolver.resolve()
	// 	const sql = query.formatAsSql()

	// 	console.dir([ 'generated query', query, sql ], {
	// 		depth: null
	// 	})

	// 	const result = await jellyfish.backend.connection.query(sql)
	// 	console.dir([ 'query result', result ])

	// 	return result[0] || null
	// } catch (error) {
	// 	console.dir([ 'the error was', error ])
	// 	return null
	// }

	return null
}
