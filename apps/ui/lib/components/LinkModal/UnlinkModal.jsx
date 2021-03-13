/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import {
	Flex,
	Modal,
	Txt
} from 'rendition'
import pluralize from 'pluralize'
import {
	constraints,
	getReverseConstraint
} from '@balena/jellyfish-client-sdk/lib/link-constraints'
import {
	addNotification,
	Icon,
	helpers
} from '@balena/jellyfish-ui-components'
import AutoCompleteCardSelect from '../AutoCompleteCardSelect'
import {
	getCommonTypeBase
} from './util'

export const UnlinkModal = ({
	actions,
	cards,
	target,
	types,
	onHide
}) => {
	const [ submitting, setSubmitting ] = React.useState(false)
	const [ selectedTarget, setSelectedTarget ] = React.useState(target || null)

	const cardsTypeBase = getCommonTypeBase(cards)
	const typeCard = helpers.getType(cardsTypeBase, types)
	const typeName = typeCard ? typeCard.name : cardsTypeBase

	const allLinkTypeTargets = React.useMemo(() => {
		return constraints.reduce((acc, constraint) => {
			if (constraint.data.from === cardsTypeBase) {
				// Move the data.title property to the root of the object, as the rendition Select
				// component can't use a non-root field for the `labelKey` prop
				acc.push(Object.assign({}, constraint, {
					title: constraint.data.title
				}))
			}
			return acc
		}, [])
	}, [ cardsTypeBase ])

	const linkTypeSlugs = React.useMemo(() => {
		return _.map(allLinkTypeTargets, 'data.to')
	}, [ allLinkTypeTargets ])

	const targetTypeList = React.useMemo(() => {
		return _.uniq(_.map(allLinkTypeTargets, 'title')).join(', ')
	}, [ allLinkTypeTargets ])

	const unlinkCards = React.useCallback(async () => {
		setSubmitting(true)

		const unlinkCard = async (card) => {
			const constraint = _.find(constraints, {
				data: {
					from: helpers.getTypeBase(card.type),
					to: helpers.getTypeBase(selectedTarget.type)
				}
			})
			await actions.removeLink(card, selectedTarget, constraint.name, {
				skipSuccessMessage: true
			})
		}

		const unlinkTasks = cards.map(unlinkCard)
		await Promise.all(unlinkTasks)
		addNotification('success', `Removed ${pluralize('link', cards.length)}`)
		setSubmitting(false)
		onHide()
	}, [ cards, selectedTarget ])

	// Adapt the selectedTarget state variable into an object
	// structured in a way that the AutoCompleteCardSelect component
	// knows how to render.
	const selectedTargetValue = React.useMemo(() => {
		if (!selectedTarget) {
			return null
		}
		const selectedTargetCardTypeIndex = _.findIndex(types, {
			slug: helpers.getTypeBase(selectedTarget.type)
		})

		return {
			value: selectedTarget.id,
			label: selectedTarget.name || selectedTarget.slug,
			type: types[selectedTargetCardTypeIndex].name,
			shade: selectedTargetCardTypeIndex
		}
	}, [ selectedTarget, types ])

	// We use a custom query callback for the AutoCompleteCardSelect
	// as we need to filter on cards that are linked to all of the specified
	// cards.
	const getLinkedCardsQuery = React.useCallback((value) => {
		return {
			type: 'object',
			anyOf: allLinkTypeTargets.map((constraint) => {
				const revConstraint = getReverseConstraint(constraint.data.from, constraint.data.to, constraint.name)
				const toType = helpers.getType(constraint.data.to, types)
				const query = {
					type: 'object',
					required: [ 'type' ],
					$$links: {
						[revConstraint.name]: {
							allOf: cards.map((card) => {
								return {
									type: 'object',
									required: [ 'id' ],
									properties: {
										id: {
											const: card.id
										}
									}
								}
							})
						}
					},
					properties: {
						type: {
							const: `${toType.slug}@${toType.version}`
						}
					}
				}

				// Add full-text-search for the typed text (if set)
				if (value) {
					const filter = helpers.createFullTextSearchFilter(toType.data.schema, value, {
						fullTextSearchFieldsOnly: true
					})
					if (filter) {
						_.merge(query, filter)
					}
				}
				return query
			})
		}
	}, [ cards ])

	const titleSource = `${pluralize('this', cards.length)} ${pluralize(typeName, cards.length, cards.length > 1)}`

	return (
		<Modal
			title={`Unlink ${titleSource} from another element`}
			cancel={onHide}
			primaryButtonProps={{
				disabled: !selectedTarget || submitting,
				'data-test': 'card-unlinker__submit'
			}}
			action={submitting ? <Icon spin name="cog"/> : 'OK'}
			done={unlinkCards}
		>
			<Flex flexDirection="column">
				<Txt>
					Look for the card types: {targetTypeList}
				</Txt>
				<AutoCompleteCardSelect
					autoFocus
					getQueryFilter={getLinkedCardsQuery}
					value={selectedTargetValue}
					cardType={linkTypeSlugs}
					isDisabled={Boolean(target)}
					onChange={setSelectedTarget}
				/>
			</Flex>
		</Modal>
	)
}
