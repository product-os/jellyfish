/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import * as React from 'react';

export default ({ name, ...props }: any) => <i {...props} className={`fas fa-${name}`} />;
