/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { withLink } from '@balena/jellyfish-ui-components';
import HandoverFlowPanel from './HandoverFlowPanel';

export default withLink('is owned by', 'cardOwner')(HandoverFlowPanel);
