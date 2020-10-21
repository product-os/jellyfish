/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import HandoverFlowPanel from './HandoverFlowPanel'
import {
	withLink
} from '@balena/jellyfish-ui-components/lib/LinksProvider'

export default withLink('is owned by', 'cardOwner')(HandoverFlowPanel)
