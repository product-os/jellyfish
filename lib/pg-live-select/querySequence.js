// Pg-live-select, MIT License

// Perform a series of queries on a Postgres server
module.exports = async function (client, queries, context) {
	for (const value of queries) {
		const args = Array.isArray(value) ? value : [ value ]
		const [ query, params ] = args

		await client.query(query, params)
	}
}
