/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const defaultCards = require('../../../apps/server/default-cards')
const skhema = require('skhema')

const BATCH_SIZE = 1000

const relationshipCards = Object
	.values(defaultCards)
	.filter((card) => { return card.data.is_link === true })

const SELECT_NEXT_BATCH_QUERY = `
	SELECT
		*
	FROM
		cards
	WHERE
		type = 'link@1.0.0'
	ORDER BY
		created_at ASC
	LIMIT ${BATCH_SIZE}`

// Generate an update query given a card ID and a new relationship type.
const updateQuery = (relationshipType, cardId) => {
	return `
		UPDATE
			cards
		SET
			type='${relationshipType}',
			data=jsonb_set(data, '{is_link}', 'true')
		WHERE
			id = '${cardId}'`
}

// Loop through the relationship cards and find a schema which matches the
// provided card and return the subtype.
const findMatchingRelationship = (card) => {
	const match = relationshipCards.find((relationship) => {
		return skhema.isValid(relationship.data.schema, card)
	})
	if (match) {
		return `${match.slug}@${match.version}`
	}
	return null
}

// Stream the list of failing IDs out one at a time rather than joining the
// collection because there could potentially be a *lot* of them.
const printFailures = (failures) => {
	if (failures.length > 0) {
		process.stdout.write('\nCouldn\'t find matching relationships for the following link cards: ')
		for (let failureId = 0; failureId < failures.length; failureId++) {
			process.stdout.write(failures[failureId])
			if (failureId === failures.length - 1) {
				process.stdout.write('.\n')
			} else {
				process.stdout.write(', ')
			}
		}
	}
}

module.exports = async (transaction) => {
	const results = await transaction.one('SELECT COUNT(id) FROM cards WHERE type = \'link@1.0.0\'')

	const toBeMigrated = results.count

	if (toBeMigrated > 0) {
		process.stdout.write(`Migrating link ${toBeMigrated} link cards in batches of ${BATCH_SIZE}\n\n`)

		const numberOfBatches = Math.ceil(toBeMigrated / BATCH_SIZE)

		// Loop through our batches selecting 1000 cards at a time and generating
		// update statements for them.
		for (let batchId = 0; batchId < numberOfBatches; batchId++) {
			process.stdout.write(`Batch ${batchId + 1}: `)
			const batchFailures = []
			await transaction.each(SELECT_NEXT_BATCH_QUERY, [], async (card) => {
				const relationshipType = findMatchingRelationship(card)
				if (!relationshipType) {
					batchFailures.push(card.id)
					process.stdout.write('!')
					return
				}

				await transaction.none(updateQuery(relationshipType, card.id))
				process.stdout.write('.')
			})

			printFailures(batchFailures)
			process.stdout.write('\n\n')
		}
	}
}
