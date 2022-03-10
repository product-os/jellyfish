import type { Emoji } from 'node-emoji';
import emojiTrigger from '../emoji-trigger';

test('The emojiTrigger matches the search term to the correct emoji', async () => {
	const { dataProvider } = emojiTrigger();

	const [emoji] = dataProvider('pear') as Emoji[];
	expect(emoji).toEqual({
		key: 'pear',
		emoji: '🍐',
	});
});

test('The emojiTrigger outputs the emoji correctly', async () => {
	const { dataProvider, output }: any = emojiTrigger();

	const [emoji] = dataProvider('pear') as Emoji[];
	const result = output(emoji);

	expect(result).toBe('🍐');
});
