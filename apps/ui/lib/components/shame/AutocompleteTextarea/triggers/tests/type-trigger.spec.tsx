import typeTrigger from '../type-trigger';

const ALL_TYPES: any[] = [
	{
		slug: 'user',
	},
	{
		slug: 'org',
	},
];

test('The typeTrigger matches the search term to the correct card type', async () => {
	const { dataProvider } = typeTrigger(ALL_TYPES);

	const types = dataProvider('u') as string[];
	expect(types.includes('?user')).toBe(true);
});

test('The typeTrigger outputs the matched card type correctly', async () => {
	const { dataProvider, output }: any = typeTrigger(ALL_TYPES);

	const [type] = dataProvider('u') as string[];
	const result = output(type);
	expect(result).toBe('?user');
});
