/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { withRouter } from 'react-router-dom';
import { compose } from 'redux';
import { withLink } from '@balena/jellyfish-ui-components';
import CardOwner from './CardOwner';

export default compose(
	withRouter,
	withLink('is owned by', 'cardOwner'),
)(CardOwner) as any;
