import _ from 'lodash'
import React from 'react'
import {
	sdk
} from '../../ui/core/sdk'

// eslint-disable-next-line no-process-env
const token = process.env.CHAT_WIDGET_JELLYFISH_TOKEN

// This is because of tree shaking problem
// ui-components use `import { sdk } from ui/core` instead of `import { sdk } from 'ui/core/sdk'`
// which initiates state of ui which is loaded with localForage and assigns null to sdk.authToken
Reflect.defineProperty(sdk, 'authToken', {
	get () {
		return token
	},
	set: _.noop
})

export const useSdk = () => {
	return React.useMemo(() => {
		return sdk
	}, [])
}
