/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const logger = require('../../../logger').getLogger(__filename)
const uuid = require('../../../uuid')
const LOCK_TABLE = 'locks'
const HOUR_IN_MILLISECONDS = 1000 * 60 * 60

exports.setup = async (context, connection, database) => {
	logger.debug(context, 'Creating lock table', {
		database
	})

	await connection.any(`
		CREATE TABLE IF NOT EXISTS ${LOCK_TABLE} (
			slug VARCHAR (255) PRIMARY KEY NOT NULL,
			owner TEXT NOT NULL,
			timestamp TEXT NOT NULL,
			key UUID NOT NULL
		);

		ALTER TABLE ${LOCK_TABLE} ADD COLUMN IF NOT EXISTS key UUID;`)
}

exports.lock = async (connection, errors, owner, slug, date) => {
	/*
	 * We will use this key as a token to check whether
	 * the operation ended up being an insert or an upsert.
	 */
	const key = await uuid.random()

	try {
		// Insert is guaranteed to be atomic. If two nodes
		// try to insert the same lock, then only one can succeed.
		const result = await connection.one(`
			INSERT INTO ${LOCK_TABLE} VALUES ($1, $2, $3, $4)
			ON CONFLICT (slug)
			DO UPDATE
				SET slug = EXCLUDED.slug
			RETURNING *
		`, [
			slug,
			owner,
			date.toISOString(),
			key
		])

		const lockDate = new Date(result.timestamp)
		if (owner === result.owner && (!result.key || key === result.key)) {
			return slug
		}

		// This lock has expired, so we can just take it
		if (date.getTime() - lockDate.getTime() >= HOUR_IN_MILLISECONDS) {
			await exports.unlock(connection, errors, result.owner, slug)
			return exports.lock(connection, errors, owner, slug, date)
		}
	} catch (error) {
		throw new errors.JellyfishDatabaseError(error)
	}

	// Lock failed
	return null
}

exports.unlock = async (connection, errors, owner, slug) => {
	try {
		const result = await connection.result(`
			DELETE FROM ${LOCK_TABLE}
			WHERE slug = '${slug}'
			AND owner = '${owner}'`)
		if (result.rowCount === 0) {
			return null
		}
	} catch (error) {
		throw new errors.JellyfishDatabaseError(error)
	}

	return slug
}
