/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	helpers,
	withCardUpdater
} from '@balena/jellyfish-ui-components'
import _ from 'lodash'
import React from 'react'
import {
	Badge, Select
} from 'rendition'
import {
	SingleLineSpan
} from './helpers'

const SelectWrapper = ({
	card, statusTypes, onUpdateCard
}) => {
	const setValue = ({
		option
	}) => {
		const patch = helpers.patchPath(card, [ 'data', 'status' ], option)
		onUpdateCard(card, patch)
	}

	const label = _.get(card, [ 'data', 'status' ])
	return (
		<Select
			options={statusTypes}
			onChange={setValue}
			value={
				<SingleLineSpan>
					<Badge shade={statusTypes.indexOf(label)} xsmall m={1}>{label}</Badge>
				</SingleLineSpan>
			}
		>
			{(option, index) => <Badge shade={index} xsmall m={1}>{option}</Badge>}
		</Select>
	)
}

export default withCardUpdater()(SelectWrapper)
