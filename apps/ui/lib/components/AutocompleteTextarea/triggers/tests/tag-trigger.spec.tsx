import sinon from 'sinon';
import tagTrigger from '../tag-trigger';

const TAGS = [
	{
		name: 'tag-rare',
		data: {
			count: 1,
		},
	},
	{
		name: 'tag-common',
		data: {
			count: '100',
		},
	},
];

const sandbox = sinon.createSandbox();

let context: any = {};

beforeEach(() => {
	context = {
		sdk: {
			query: sandbox.stub(),
		},
	};
});

test('The tagTrigger returns matches sorted by count', async () => {
	const { sdk } = context;

	sdk.query.resolves(TAGS);

	const { dataProvider } = await tagTrigger(sdk);

	const [first, second] = await dataProvider('tag');
	expect(first.name).toBe('tag-common');
	expect(second.name).toBe('tag-rare');
});

test('The tagTrigger renders the name and count of a matched tag', async () => {
	const { sdk } = context;

	sdk.query.resolves(TAGS);

	const { dataProvider, component } = await tagTrigger(sdk);

	const [tag] = await dataProvider('tag-common');
	// @ts-ignore
	const flex = component({
		entity: tag,
	});

	const tagNameTxt = flex.props.children[0];
	expect(tagNameTxt.props.children).toEqual(['#', 'tag-common']);

	const tagCountTxt = flex.props.children[1];
	expect(tagCountTxt.props.children).toEqual(['x ', '100']);
});

test('The tagTrigger outputs a tag correctly', async () => {
	const { sdk } = context;

	sdk.query.resolves(TAGS);

	const { dataProvider, output }: any = await tagTrigger(sdk);

	const [tag] = await dataProvider('tag-common');
	const result = output(tag);
	expect(result).toBe('#tag-common');
});
