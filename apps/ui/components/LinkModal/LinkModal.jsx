/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import memoize from 'memoize-one'
import React from 'react'
import {
	Box,
	Modal,
	Flex,
	Select,
	Txt
} from 'rendition'
import {
	constraints as LINKS
} from '@balena/jellyfish-client-sdk/lib/link-constraints'
import AutoCompleteCardSelect from '../AutoCompleteCardSelect'
import Icon from '@balena/jellyfish-ui-components/lib/shame/Icon'
import {
	addNotification
} from '@balena/jellyfish-ui-components/lib/services/notifications'

const getTypes = memoize((inputCards) => {
	return _.uniq(_.map(inputCards, 'type'))
})

export default class LinkModal extends React.Component {
	constructor (props) {
		super(props)

		this.getFromType = memoize((cards) => {
			const cardTypes = getTypes(cards)
			if (cardTypes.length > 1) {
				throw new Error('All cards must be of the same type')
			}
			let fromType = cards[0].type.split('@')[0]
			if (fromType === 'type') {
				fromType = cards[0].slug.split('@')[0]
			}
			return fromType
		})

		this.getAvailableTypeSlugs = memoize((types) => {
			return _.reduce(types || [], (acc, type) => {
				acc[type.slug] = true
				return acc
			}, {})
		})

		this.filterLinks = (linkVerb, availableTypeSlugs, target, fromType) => {
			return _.filter(LINKS, (link) => {
				// Filter by the link verb
				if (linkVerb && linkVerb !== link.name) {
					return false
				}

				// Filter by the 'from' card
				if (fromType !== link.data.from) {
					return false
				}

				// Filter by the 'types' prop
				if (!availableTypeSlugs[link.data.to]) {
					return false
				}

				// If the target is specified, the link 'to' property must match it
				if (target && target.type.split('@')[0] !== link.data.to) {
					return false
				}

				return true
			}).map((link) => {
				// Move the data.title property to the root of the object, as the rendition Select
				// component can't use a non-root field for the `labelKey` prop
				return Object.assign({}, link, {
					title: link.data.title
				})
			})
		}

		const {
			target
		} = props

		this.state = {
			submitting: false,
			selectedTarget: target || null,
			linkType: this.getLinkType(target)
		}

		this.handleTargetSelect = this.handleTargetSelect.bind(this)
		this.linkToExisting = this.linkToExisting.bind(this)
	}

	getLinkTypeTargets (target) {
		const {
			cards,
			linkVerb,
			types
		} = this.props

		const fromType = this.getFromType(cards)
		const availableTypeSlugs = this.getAvailableTypeSlugs(types)
		return this.filterLinks(linkVerb, availableTypeSlugs, target, fromType)
	}

	getLinkType (target) {
		const linkTypeTargets = this.getLinkTypeTargets(target)
		return linkTypeTargets.length === 1 ? linkTypeTargets[0] : null
	}

	handleTargetSelect (target) {
		this.setState({
			selectedTarget: target,
			linkType: this.getLinkType(target)
		})
	}

	async linkToExisting () {
		const {
			actions,
			cards,
			onHide,
			onSave,
			onSaved
		} = this.props

		const {
			linkType,
			selectedTarget
		} = this.state

		if (!linkType || !selectedTarget) {
			return
		}

		const linkCard = async (card) => {
			if (onSave) {
				onSave(card, selectedTarget, linkType.name)
			} else {
				await actions.createLink(card, selectedTarget, linkType.name, {
					skipSuccessMessage: true
				})
				if (onSaved) {
					onSaved(selectedTarget, linkType.name)
				}
			}
		}

		this.setState({
			submitting: true
		}, async () => {
			const linkTasks = cards.map(linkCard)
			await Promise.all(linkTasks)
			addNotification('success', `Created new link${cards.length > 1 ? 's' : ''}`)
			this.setState({
				submitting: false,
				selectedTarget: null
			}, () => {
				// Trigger the onHide callback to close the modal
				onHide()
			})
		})
	}

	render () {
		const {
			cards,
			linkVerb,
			types,
			target
		} = this.props
		const {
			linkType,
			selectedTarget,
			submitting
		} = this.state

		const fromType = this.getFromType(cards)
		const availableTypeSlugs = this.getAvailableTypeSlugs(types)
		const linkTypeTargets = this.filterLinks(linkVerb, availableTypeSlugs, selectedTarget, fromType)

		if (!linkTypeTargets.length) {
			console.error(`No matching link types for ${fromType}`)
			addNotification('danger', `No matching link types for ${fromType}`)
			return null
		}

		const typeCard = _.find(types, [ 'slug', fromType ])
		const typeName = typeCard ? typeCard.name : fromType

		const title = `Link this ${typeName} to ${linkTypeTargets.length === 1
			? linkTypeTargets[0].title : 'another element'}`

		// Selected target display
		let selectedTargetValue = null

		if (selectedTarget) {
			const selectedTargetCardTypeIndex = _.findIndex(types, {
				slug: selectedTarget.type.split('@')[0]
			})

			selectedTargetValue = {
				value: selectedTarget.id,
				label: selectedTarget.name || selectedTarget.slug,
				type: types[selectedTargetCardTypeIndex].name,
				shade: selectedTargetCardTypeIndex
			}
		}

		const allLinkTypeTargets = this.filterLinks(linkVerb, availableTypeSlugs, null, fromType)

		return (
			<Modal
				title={title}
				cancel={this.props.onHide}
				primaryButtonProps={{
					disabled: !linkType || !selectedTargetValue || submitting,
					'data-test': 'card-linker--existing__submit'
				}}
				action={submitting ? <Icon spin name="cog"/> : 'OK'}
				done={this.linkToExisting}
			>
				<Flex flexDirection="column">
					<Txt>
						Look for the card types: {allLinkTypeTargets.map((linkTypeTarget) => {
							return linkTypeTarget.title
						}).join(', ')}
					</Txt>
					<Box
						my={2}
						alignSelf={[ 'stretch', 'stretch', 'auto' ]}
						data-test="card-linker--existing__input"
					>
						<AutoCompleteCardSelect
							value={selectedTargetValue}
							cardType={_.map(allLinkTypeTargets, (linkTypeTarget) => {
								return _.get(linkTypeTarget, [ 'data', 'to' ])
							})}
							types={types}
							isDisabled={Boolean(target)}
							onChange={this.handleTargetSelect}
						/>
					</Box>
					{selectedTarget && linkTypeTargets.length > 1 && (
						<React.Fragment>
							<Txt>
								Select link type
							</Txt>
							<Box
								my={2}
							>
								<Select
									id="card-linker--type-select"
									value={linkType || ''}
									onChange={this.handleLinkTypeSelect}
									labelKey="title"
									valueKey="slug"
									options={linkTypeTargets}
									data-test="card-linker--type__input"
								/>
							</Box>
						</React.Fragment>
					)}
				</Flex>
			</Modal>
		)
	}
}
