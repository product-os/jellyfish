/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

declare module 'color-hash' {
	interface Hasher {
		hex(text: string): string;
	}

	class ColorHash {
		hex(text: string): string;
		rgb(text: string): [number, number, number];
	}

	export = ColorHash;
}
