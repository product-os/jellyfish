/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import {
	Button,
	ButtonGroup
} from 'rendition'
import Icon from '@balena/jellyfish-ui-components/lib/shame/Icon'

const LensSelection = ({
	lenses,
	lens,
	setLens
}) => {
	if (!lenses.length > 1 && !lens) {
		return null
	}
	return (
		<ButtonGroup ml={3}>
			{_.map(lenses, (item) => {
				return (
					<Button
						key={item.slug}
						active={lens && lens.slug === item.slug}
						data-test={`lens-selector--${item.slug}`}
						data-slug={item.slug}
						onClick={setLens}
						pt={11}
						icon={<Icon name={item.data.icon}/>}
					/>
				)
			})}
		</ButtonGroup>
	)
}

export default LensSelection
