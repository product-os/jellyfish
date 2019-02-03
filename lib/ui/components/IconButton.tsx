/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { Button, Theme } from 'rendition';
import styled from 'styled-components';

export const IconButton = styled(Button)`
	background: transparent;
	color: ${Theme.colors.text.light};

	&:hover,
	&:focus,
	&:active {
		color: ${Theme.colors.text.main};
	}
`;
