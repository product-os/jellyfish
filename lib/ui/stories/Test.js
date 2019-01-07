import * as React from 'react'
import {
	storiesOf
} from '@storybook/react'
import Icon from '../components/Icon'

storiesOf('Core/Icon', module)
	.add('Standard', () => {
		return (
			<Icon name="cog" />
		)
	})
