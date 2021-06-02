/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import {
	Select
} from 'rendition'

const allLoops = {
	name: 'All loops',
	slug: null
}

export const LoopSelector = ({
	actions, loops, user, history, location, match, ...rest
}) => {
	const [ activeLoop, setActiveLoop ] = React.useState(_.find(loops, {
		slug: _.get(user, [ 'data', 'profile', 'activeLoop' ])
	}, allLoops))

	const loopOptions = React.useMemo(() => {
		return _.concat(allLoops, loops)
	}, [ loops ])

	const onChange = ({
		value
	}) => {
		setActiveLoop(value || null)
		actions.setActiveLoop(_.get(value, [ 'slug' ], null))
	}
	return (
		<Select
			{...rest}
			placeholder="Select loop..."
			options={loopOptions}
			value={activeLoop}
			labelKey='name'
			valueKey='slug'
			onChange={onChange}
		/>
	)
}
