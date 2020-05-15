/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import '../../test/ui-setup'
import React from 'react'
import ava from 'ava'
import {
	shallow
} from 'enzyme'
import {
	ThreadMirrorIcon,
	MirrorIcon
} from './MirrorIcon'

const mirrorTests = [
	{
		name: 'Front',
		mirrors: [ 'https://api2.frontapp.com/conversations/cnv_5fux3ur' ],
		iconSelector: 'img'
	},
	{
		name: 'Discourse',
		mirrors: [ 'https://forums.balena.io/t/80953' ],
		iconSelector: 'i'
	},
	{
		name: 'GitHub',
		mirrors: [ 'https://github.com/balena-io/etcher/issues/2020' ],
		iconSelector: 'i'
	}
]

ava('MirrorIcon identifies mirror source in tooltip', (test) => {
	for (const {
		name, mirrors
	} of mirrorTests) {
		const mirrorIcon = shallow(<MirrorIcon threadIsMirrored mirrors={mirrors} />)
		const wrapper = mirrorIcon.find('[data-test="mirror-icon"]')

		test.is(wrapper.props().className, 'synced')
		test.is(wrapper.props().tooltip, `Synced with ${name}`)
	}
})

ava('ThreadMirrorIcon identifies mirror source in tooltip and displays mirror icon', (test) => {
	for (const {
		name, mirrors, iconSelector
	} of mirrorTests) {
		const mirrorIcon = shallow(<ThreadMirrorIcon mirrors={mirrors} />)
		const wrapper = mirrorIcon.find('[data-test="thread-mirror-icon"]')
		const icon = wrapper.find(iconSelector)
		test.is(wrapper.props().tooltip, `Synced with ${name}`)
		test.truthy(icon)
	}
})

ava('MirrorIcon indicates if the mirror is not synced', (test) => {
	const mirrorIcon = shallow(<MirrorIcon threadIsMirrored mirrors={[]} />)
	const wrapper = mirrorIcon.find('[data-test="mirror-icon"]')
	test.is(wrapper.props().className, 'unsynced')
	test.is(wrapper.props().tooltip, 'Not yet synced')
})

ava('MirrorIcon is hidden if thread is not mirrored', (test) => {
	const mirrorIcon = shallow(
		<MirrorIcon
			threadIsMirrored={false}
			mirrors={[ 'https://github.com/balena-io/etcher/issues/2020' ]}
		/>
	)
	test.falsy(mirrorIcon.get(0))
})
