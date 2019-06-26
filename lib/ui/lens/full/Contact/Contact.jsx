/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as _ from 'lodash'
import React from 'react'
import {
	Box,
	Button,
	Divider,
	Tabs,
	Txt
} from 'rendition'
import CardFields from '../../../components/CardFields'
import Link from '../../../components/Link'
import LinkModal from '../../../components/LinkModal'
import CardLayout from '../../../layouts/CardLayout'
import * as helpers from '../../../services/helpers'
import Icon from '../../../shame/Icon'

export default class Contact extends React.Component {
	constructor (props) {
		super(props)

		this.state = {
			account: null,
			showAccountModal: false
		}

		this.openAccountModal = this.openAccountModal.bind(this)
		this.hideAccountModal = this.hideAccountModal.bind(this)
		this.getLinkTargets = this.getLinkTargets.bind(this)
	}

	componentDidMount () {
		this.bootstrap()
	}

	async getLinkTargets (value) {
		try {
			const {
				selectedTypeTarget
			} = this.state
			if (!selectedTypeTarget || !value) {
				return []
			}
			const filter = helpers.createFullTextSearchFilter(selectedTypeTarget.data.schema, value)
			_.set(filter, [ 'properties', 'type' ], {
				type: 'string',
				const: selectedTypeTarget.slug
			})
			const results = await this.props.actions.queryAPI(filter)
			this.setState({
				results
			})
			return results.map((card) => {
				return {
					label: card.name || card.slug || card.id,
					value: card.id
				}
			})
		} catch (error) {
			this.props.actions.addNotification('danger', error.message || error)
		}

		return null
	}

	openAccountModal () {
		this.setState({
			showAccountModal: true
		})
	}

	hideAccountModal () {
		this.setState({
			showAccountModal: false
		})
	}

	async bootstrap () {
		const results = await this.props.actions.getLinks(this.props.card, 'is member of account')
		this.setState({
			account: results
		})
	}

	render () {
		const {
			card,
			channel,
			fieldOrder,
			types
		} = this.props
		const {
			account,
			showAccountModal
		} = this.state

		const typeCard = _.find(types, {
			slug: card.type
		})

		const accountTypeCard = _.find(types, {
			slug: 'account'
		})

		return (
			<CardLayout
				card={card}
				channel={channel}
			>
				<Divider width="100%" color="#eee" />

				<Tabs
					tabs={[ 'Overview', 'Profile', 'Account' ]}
					style={{
						flex: 1
					}}
				>
					<Box p={3}>
						...
					</Box>

					<Box p={3}>
						<CardFields
							card={card}
							fieldOrder={fieldOrder}
							type={typeCard}
						/>
					</Box>

					<Box p={3}>
						{Boolean(account) && !account.length && (
							<Box>
								<Txt pb={3}>This Contact is not a member of an Account</Txt>

								<Button
									icon={<Icon name="link" />}
									onClick={this.openAccountModal}
								>
									Attach to Account
								</Button>
							</Box>
						)}

						{Boolean(account) && account.length && (
							<Link append={account[0].slug || account[0].id}>
								{account[0].name || account[0].slug}
							</Link>
						)}
					</Box>
				</Tabs>

				<LinkModal
					card={card}
					types={[ accountTypeCard ]}
					show={showAccountModal}
					onHide={this.hideAccountModal}
				/>
			</CardLayout>
		)
	}
}
