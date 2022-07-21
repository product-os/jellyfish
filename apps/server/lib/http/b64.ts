export const b64decode = (str: string): string => {
	return Buffer.from(str, 'base64').toString().trim();
};
