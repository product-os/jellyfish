/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React, {
	useState
} from 'react'
import {
	Button
} from 'rendition'
import withCardUpdater from '@balena/jellyfish-ui-components/lib/HOC/with-card-updater'
import LinkModal from '../../../components/LinkModal'
import * as _ from 'lodash'
import {
	formatAsConjunction
} from './helpers'

const InlineLinkButton = (props) => {
	const {
		card, types, actions, ...rest
	} = props

	const [ isLinkModalVisible, setIsLinkModalVisible ] = useState(false)

	const typeNames = _.compact(_.map(types, 'name'))

	return (
		<React.Fragment>
			<Button
				{...rest}
				success
				onClick={() => setIsLinkModalVisible(true)}
			>Link to {formatAsConjunction(typeNames)}</Button>

			{isLinkModalVisible && (
				<LinkModal
					actions={actions}
					cards={[ card ]}
					types={types}
					onHide={() => setIsLinkModalVisible(false)}
				/>
			)}
		</React.Fragment>
	)
}

export default withCardUpdater()(InlineLinkButton)
