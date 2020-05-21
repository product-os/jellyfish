/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const CardVisitor = require('./card-visitor')
const graphql = require('graphql')
const handlers = require('./card-handlers')
const HardCodedTypes = require('./types')
const Resolvers = require('./resolvers')
const GeneratorContext = require('./generator-context')
const {
	camelCase
} = require('change-case')

// Use the type generator to generate all the data types in the model and then
// attach it to a GraphQL schema.

module.exports = async (context, {
	jellyfish, logger, baseCards
}) => {
	// This is the `context` object that is passed through the generation process.
	const schemaGenerationContext = new GeneratorContext(HardCodedTypes, baseCards, logger, context)

	new CardVisitor(baseCards.card, handlers, schemaGenerationContext).visit()

	const typeCardQuery = {
		type: 'object',
		properties: {
			type: {
				type: 'string',
				pattern: '^type@'
			},
			slug: {
				not: {
					const: 'card'
				}
			}
		}
	}

	let allTypeCards = []

	try {
		allTypeCards = await jellyfish.query(context, jellyfish.sessions.admin, typeCardQuery)
	} catch (error) {
		logger.error(context, 'Unable to retrieve type cards. GraphQL API will be incomplete.', error)
	}

	allTypeCards
		.forEach((card) => {
			const cardVisitor = new CardVisitor(card, handlers, schemaGenerationContext)
			return cardVisitor.visit()
		})

	// *** HORRIBLE HACK ***
	//
	// Unless the type is concretely reachable in the graph then it never actually
	// gets reified, so we force all card types to be reachable here.  We will
	// definitely need to find a solution to this!
	const reachabilityHack = new graphql.GraphQLObjectType({
		name: 'ReachabilityHack',
		description: 'Only here to ensure that every card type is reachable in the schema for debugging purposes',
		fields: () => {
			const fields = {
				card: {
					type: schemaGenerationContext.getType('Card')
				}
			}

			for (const cardType of schemaGenerationContext.getCardTypes()) {
				fields[camelCase(cardType.name)] = {
					type: cardType
				}
			}

			return fields
		}
	})

	// *** END HORRIBLE HACK ***

	const queryType = new graphql.GraphQLObjectType({
		name: 'Query',
		fields: {
			node: {
				type: schemaGenerationContext.getType('Node'),
				args: {
					id: {
						type: graphql.GraphQLNonNull(graphql.GraphQLID)
					}
				},
				resolve: Resolvers.Node
			},
			card: {
				type: schemaGenerationContext.getType('Card'),
				args: {
					id: {
						type: graphql.GraphQLID
					},
					slug: {
						type: schemaGenerationContext.getType('Slug')
					}
				},
				resolve: Resolvers.Card
			},
			cards: {
				type: new graphql.GraphQLList(graphql.GraphQLNonNull(schemaGenerationContext.getType('Card'))),
				args: {
					filter: {
						type: graphql.GraphQLString
					}
				},
				resolve: Resolvers.Cards
			},
			reachabilityHack: {
				type: reachabilityHack
			}
		}
	})

	return new graphql.GraphQLSchema({
		query: queryType
	})
}
