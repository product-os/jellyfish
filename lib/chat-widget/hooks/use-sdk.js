/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	useSetup
} from '../../../lib/ui-components/SetupProvider'

export const useSdk = () => {
	return useSetup().sdk
}
