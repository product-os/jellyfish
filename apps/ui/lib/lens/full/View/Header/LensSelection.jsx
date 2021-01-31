/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import {
	Box,
	Button,
	ButtonGroup
} from 'rendition'
import {
	Icon
} from '@balena/jellyfish-ui-components'

// HACK: set min height to the height of a button group
// this prevents the component collapsing vertically if
// there are no lenses provided.
const MIN_HEIGHT = '38px'

export const LensSelection = ({
	lenses,
	lens,
	setLens,
	...rest
}) => {
	return (
		<Box {...rest} minHeight={MIN_HEIGHT}>
			{ lenses.length > 1 && (
				<ButtonGroup>
					{_.map(lenses, (item) => {
						return (
							<Button
								key={item.slug}
								active={lens && lens.slug === item.slug}
								data-test={`lens-selector--${item.slug}`}
								data-slug={item.slug}
								onClick={setLens}
								pt={11}
								tooltip={{
									text: item.name,
									placement: 'bottom'
								}}
								icon={<Icon name={item.data.icon}/>}
							/>
						)
					})}
				</ButtonGroup>
			)}
		</Box>
	)
}
