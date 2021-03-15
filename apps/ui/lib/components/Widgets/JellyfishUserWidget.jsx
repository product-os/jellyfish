/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import {
	UiOption
} from 'rendition/dist/components/Renderer/widgets/ui-options'
import {
	JsonTypes
} from 'rendition/dist/components/Renderer/types'
import {
	CardLoader,
	helpers,
	Link
} from '@balena/jellyfish-ui-components'

// This widget fetches the user corresponding to the id or slug specified in the value
// and renders a link to the user, displaying the username.
//
export const JellyfishUserWidget = ({
	value,
	schema,
	uiSchema,
	extraContext,
	extraFormats,
	suffix,
	...props
}) => {
	return (
		<CardLoader id={value} type="user">
			{(user) => {
				const tooltipOptions = _.defaults(
					_.pick(props, 'hideUsername', 'hideName', 'hideEmail'), {
						hideUsername: true
					})
				return (
					<Link {...props} append={user.slug} tooltip={helpers.getUserTooltipText(user, tooltipOptions)}>
						{helpers.username(user.slug)}{suffix}
					</Link>
				)
			}}
		</CardLoader>
	)
}

JellyfishUserWidget.displayName = 'JellyfishUser'

JellyfishUserWidget.uiOptions = {
	hideUsername: UiOption.string,
	hideName: UiOption.string,
	hideEmail: UiOption.string,
	suffix: UiOption.string
}

JellyfishUserWidget.supportedTypes = [ JsonTypes.string ]
