/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'
import _ from 'lodash'
import {
	Flex,
	RadioButton,
	Txt
} from 'rendition'
import styled from 'styled-components'
import * as helpers from '../../../services/helpers'
import AutoCompleteCardSelect from '../../../AutoCompleteCardSelect'

const UserSelect = styled(AutoCompleteCardSelect) `
	min-width: 180px;
`

// In this step you select either another team member to assign
// the card to or you select to unassign it.
export default function NewOwnerStep ({
	currentOwner,
	user,
	types,
	flowState: {
		card,
		newOwner,
		userError,
		unassigned
	},
	setFlow
}) {
	const newOwnerValue = newOwner ? {
		value: newOwner.id,
		label: newOwner.name || newOwner.slug
	} : null

	const setNewOwnerTeamMember = (event) => {
		if (event.target.checked) {
			setFlow({
				unassigned: false
			})
		}
	}

	const setNewOwnerUnassigned = (event) => {
		if (event.target.checked) {
			setFlow({
				newOwner: null,
				userError: null,
				unassigned: true
			})
		}
	}

	const setNewOwner = (owner) => {
		const cardTypeName = helpers.getType(card.type, types).name
		setFlow({
			newOwner: owner,
			userError: currentOwner && _.get(owner, [ 'id' ]) === _.get(currentOwner, [ 'id' ])
				? `${currentOwner.slug} already owns this ${cardTypeName}` : null
		})
	}

	const authenticatedUsersOrgFilter = {
		$$links: {
			'is member of': {
				type: 'object',
				properties: {
					slug: {
						type: 'string',
						const: _.get(user, [ 'links', 'is member of', 0, 'slug' ], 'org-balena')
					}
				}
			}
		}
	}

	return (
		<React.Fragment>
			<Flex flexDirection="row" alignItems="center">
				<RadioButton
					id="rb-ghf-team"
					data-test="ghf__rb-team"
					mr={3}
					label="Another team member"
					onChange={setNewOwnerTeamMember}
					checked={!unassigned}
				/>
				<UserSelect
					data-test="ghf__sel-new-owner"
					classNamePrefix="ghf-async-select"
					cardType="user"
					types={types}
					value={newOwnerValue}
					isDisabled={unassigned}
					onChange={setNewOwner}
					menuPlacement="top"
					cardFilter={authenticatedUsersOrgFilter}
				/>
				{ userError && (
					<Txt data-test="ghf__user-error" ml={2} color='red'>{userError}</Txt>
				)}
			</Flex>
			<RadioButton
				id="rb-ghf-unassign"
				data-test="ghf__rb-unassign"
				label="Unassign"
				onChange={setNewOwnerUnassigned}
				checked={unassigned}
			/>
		</React.Fragment>
	)
}
