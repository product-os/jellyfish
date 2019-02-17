/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const LOCK_TABLE = 'locks'

exports.setup = async (connection) => {
	await connection.any(`
		CREATE TABLE IF NOT EXISTS ${LOCK_TABLE} (
			slug VARCHAR (255) PRIMARY KEY NOT NULL,
			owner TEXT NOT NULL,
			timestamp TEXT NOT NULL)`)
}

exports.lock = async (connection, errors, owner, slug) => {
	try {
		// Insert is guaranteed to be atomic. If two nodes
		// try to insert the same lock, then only one can succeed.
		const result = await connection.one(`
			INSERT INTO ${LOCK_TABLE} VALUES ($1, $2, $3)
			ON CONFLICT (slug)
			DO UPDATE
				SET slug = EXCLUDED.slug
			RETURNING *
		`, [
			slug,
			owner,
			(new Date()).toISOString()
		])

		if (owner === result.owner) {
			return slug
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
