/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import path from 'path'
import {
	withDefaultProps
} from './with-default-props'

const getActorHref = (actor) => {
	return path.join(location.pathname, actor.card.slug)
}

export const withDefaultGetActorHref = () => {
	return withDefaultProps({
		getActorHref
	})
}
