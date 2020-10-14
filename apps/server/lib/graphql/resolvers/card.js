/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = function (_source, args, {
	jellyfish, request
}, _info) {
	if (args.id) {
		return jellyfish.getCardById(request.context, request.sessionToken, args.id)
	}
	if (args.slug) {
		return jellyfish.getCardBySlug(request.context, request.sessionToken, `${args.slug}@latest`)
	}
	return null
}
