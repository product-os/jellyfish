/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import React from 'react'

export default function withLinks (linkName) {
	return (BaseComponent) => {
		return ({
			card, actions, ...props
		}) => {
			const [ links, setLinks ] = React.useState(null)
			const [ error, setError ] = React.useState(null)

			const getData = () => {
				actions.getLinks(card, linkName).then(setLinks).catch(setError)
			}

			React.useEffect(() => {
				getData(false)
			}, [ linkName, card.id ])

			return (
				<BaseComponent
					{...props}
					card={card}
					linkNotSupported={Boolean(error)}
					actions={actions}
					linkName={linkName}
					links={links}
					onRefresh={getData}
				/>
			)
		}
	}
}
