import { parseMessage } from '../Body';

test('parseMessage() should prefix Front image embedded in img tags', () => {
	const url =
		'/api/1/companies/resin_io/attachments/8381633c052e15b96c3a25581f7869b5332c032b?resource_link_id=14267942787';
	expect(parseMessage(`<img src="${url}">`)).toBe(
		`<img src="https://app.frontapp.com${url}">`,
	);
});

test('parseMessage() should prefix multitple Front images embedded in img tags', () => {
	const url =
		'/api/1/companies/resin_io/attachments/8381633c052e15b96c3a25581f7869b5332c032b?resource_link_id=14267942787';
	expect(
		parseMessage(
			`<img src="${url}"><img src="${url}"><img src="${url}"><img src="${url}">`,
		),
	).toBe(
		`<img src="https://app.frontapp.com${url}"><img src="https://app.frontapp.com${url}"><img src="https://app.frontapp.com${url}"><img src="https://app.frontapp.com${url}">`,
	);
});

test('parseMessage() should prefix Front image embedded in square brackets', () => {
	const url =
		'/api/1/companies/resin_io/attachments/8381633c052e15b96c3a25581f7869b5332c032b?resource_link_id=14267942787';
	expect(parseMessage(`[${url}]`)).toBe(
		`![Attached image](https://app.frontapp.com${url})`,
	);
});

test('parseMessage() should prefix multiple Front images embedded in square brackets', () => {
	const url =
		'/api/1/companies/resin_io/attachments/8381633c052e15b96c3a25581f7869b5332c032b?resource_link_id=14267942787';
	expect(parseMessage(`[${url}] [${url}] [${url}]`)).toBe(
		`![Attached image](https://app.frontapp.com${url}) ![Attached image](https://app.frontapp.com${url}) ![Attached image](https://app.frontapp.com${url})`,
	);
});

test('parseMessage() should hide "#jellyfish-hidden" messages', () => {
	expect(parseMessage('#jellyfish-hidden')).toBe('');
});

test('parseMessage() detects a message that only contains an image url and wraps it', () => {
	const jpgURL = 'http://test.com/image.jpg?some-data=2';
	const pngURL = 'http://test.co.uk/image%20again.png?some-data=+2';
	const gifURL = 'https://wwww.test.com/image.gif';
	const imageMessage = (url: any) => {
		return `![image](${url})`;
	};
	expect(parseMessage(jpgURL)).toBe(imageMessage(jpgURL));
	expect(parseMessage(pngURL)).toBe(imageMessage(pngURL));
	expect(parseMessage(gifURL)).toBe(imageMessage(gifURL));
	expect(parseMessage(` ${jpgURL}`)).toBe(imageMessage(jpgURL));
	expect(parseMessage(`${jpgURL} `)).toBe(imageMessage(jpgURL));
	expect(parseMessage(`>${jpgURL}`)).not.toBe(imageMessage(jpgURL));
	expect(parseMessage(`${jpgURL}!`)).not.toBe(imageMessage(jpgURL));
});

test('parseMessage() replaces inline Discourse attachment links with correct markdown links', () => {
	const msg = parseMessage(
		'This is a link: [file1.log|attachment](upload://2NTd93eaDOQohgCHeMpUr5cynbL.log) (149.6 KB) ' +
			'This is another link: [file2.log|attachment](upload://4EDd93eaDOQohgCHeMpUr5cynbL.log) (149.6 KB)',
	);
	expect(msg).toBe(
		'This is a link: [file1.log](https://forums.balena.io/uploads/short-url/2NTd93eaDOQohgCHeMpUr5cynbL.log) (149.6 KB) ' +
			'This is another link: [file2.log](https://forums.balena.io/uploads/short-url/4EDd93eaDOQohgCHeMpUr5cynbL.log) (149.6 KB)',
	);
});

test('parseMessage() replaces inline Discourse images with correct markdown images', () => {
	const msg = parseMessage(
		'This is an inline image: ![file1.log|600x400](upload://2NTd93eaDOQohgCHeMpUr5cynbL.log) (149.6 KB) ' +
			'This is another inline image: ![file2.log|64x48](upload://4EDd93eaDOQohgCHeMpUr5cynbL.log) (149.6 KB)',
	);
	expect(msg).toBe(
		'This is an inline image: ![file1.log](https://forums.balena.io/uploads/short-url/2NTd93eaDOQohgCHeMpUr5cynbL.log) (149.6 KB) ' +
			'This is another inline image: ![file2.log](https://forums.balena.io/uploads/short-url/4EDd93eaDOQohgCHeMpUr5cynbL.log) (149.6 KB)',
	);
});
