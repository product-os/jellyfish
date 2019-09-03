import React from 'react'
import {
	Flex
} from 'rendition'
import Icon from '../../../lib/ui/shame/Icon'

export const Loader = (props) => {
	return (
		<Flex justifyContent="center" alignItems="center" {...props}>
			<Icon spin name="cog" />
		</Flex>
	)
}
