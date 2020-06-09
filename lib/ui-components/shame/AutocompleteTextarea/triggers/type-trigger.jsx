/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import React from 'react'

const typeTrigger = (allTypes) => {
	return {
		dataProvider: (token) => {
			const types = allTypes
				.map(({
					slug
				}) => { return `?${slug}` })
			if (!token) {
				return types
			}
			const matcher = `?${token.toLowerCase()}`
			return types.filter((slug) => {
				return _.startsWith(slug, matcher)
			})
		},
		component: ({
			entity
		}) => {
			return <div>{entity}</div>
		},
		output: (item) => {
			return item
		}
	}
}

export default typeTrigger
