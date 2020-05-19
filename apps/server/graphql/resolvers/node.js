/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = function (_source, args, {
	jellyfish, request
}, _info) {
	return jellyfish.getCardById(request.context, request.sessionToken, args.id)
}
