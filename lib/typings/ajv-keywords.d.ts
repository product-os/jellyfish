/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

declare module 'ajv-keywords' {
	import ajv = require('ajv');
	function decorate(ajv: ajv.Ajv, keywords?: string | string[]): void;

	export = decorate;
}
