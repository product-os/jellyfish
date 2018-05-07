declare module 'ajv-keywords' {
	import ajv = require('ajv');
	function decorate(ajv: ajv.Ajv, keywords?: string | string[]): void;

	export = decorate;
}
