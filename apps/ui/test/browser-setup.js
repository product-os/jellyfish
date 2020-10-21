/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const browserEnv = require('browser-env')
browserEnv([ 'window', 'document', 'navigator', 'XMLHttpRequest', 'HTMLAnchorElement', 'NodeFilter', 'NodeList', 'File', 'Blob' ])
