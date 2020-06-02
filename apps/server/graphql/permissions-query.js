const SqlQueryBuilder = require('./sql-query-builder')

const getMarkersForSession = (sessionId) => {
	const builder = new SqlQueryBuilder()

	builder.constant(sessionId)
	builder.cast('uuid')
	builder.fieldFrom('SC', 'id')
	builder.eq()

	builder.constant('session@1.0.0')
	builder.fieldFrom('SC', 'type')
	builder.eq()

	builder.and()

	builder.fieldFrom('UC', 'id')
	builder.fieldFrom('SC', 'data')
	builder.cast('json')
	builder.jsonPath('actor')
	builder.cast('uuid')
	builder.eq()

	builder.and()

	builder.where()

	builder.table('cards')
	builder.as('UC')
	builder.table('cards')
	builder.as('SC')
	builder.from(2)

	builder.fieldFrom('UC', 'markers')

	builder.select(3)

	return builder
}

const addSessionFilter = (sessionId, builder, cardTableAlias = null) => {
	const subSelect = getMarkersForSession(sessionId)

	builder.fieldFrom(cardTableAlias, 'markers')
	builder.constant(1)
	builder.function('ARRAY_LENGTH', 2)
	builder.constant(0)
	builder.infix('==')

	builder.fieldFrom(cardTableAlias, 'markers')
	builder.append(subSelect)
	builder.infix('&&')

	builder.or()

	builder.where()

	return builder
}

module.exports = {
	addSessionFilter,
	getMarkersForSession
}

/*
TEST

const { getMarkersForSession, addSessionFilter } = require('./apps/server/graphql/permissions-query')
const SqlQueryBuilder = require('./apps/server/graphql/sql-query-builder')
builder = new SqlQueryBuilder()
addSessionFilter('MYSESSIONID', builder, 'C0')
builder.fieldFrom('C0', 'id')
builder.table('cards')
builder.as('C0')
builder.from()
builder.select()
builder.formatAsSql()

`SELECT "C0".id FROM cards AS "C0" WHERE (ARRAY_LENGTH("C0".markers, '1') == '0') OR ("C0".markers && (SELECT "UC".markers FROM cards AS "UC", cards AS "SC" WHERE (('MYSESSIONID'::uuid = "SC".id) AND ('session@1.0.0' = "SC".type)) AND ("UC".id = ("SC".data::json->>'actor')::uuid)))`
*/
