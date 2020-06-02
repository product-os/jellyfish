const CardQueryResolver = require('../card-query-resolver')

module.exports = async (source, _args, context, astRoot) => {
	const {
		jellyfish
	} = context

	try {
		const resolver = new CardQueryResolver(source, context, astRoot)
		const query = resolver.resolve()
		const sql = query.formatAsSql()

		console.dir([ 'generated query', query, sql ], {
			depth: null
		})

		const result = await jellyfish.backend.connection.query(sql)
		console.dir([ 'query result', result ])

		return result
	} catch (error) {
		console.dir([ 'the error was', error ])
		return []
	}
}
