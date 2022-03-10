import _ from 'lodash';
import debounce from 'debounce-promise';
import userTrigger from './user-trigger';
import groupTrigger from './group-trigger';
import typeTrigger from './type-trigger';
import emojiTrigger from './emoji-trigger';
import tagTrigger from './tag-trigger';
import type {
	SettingType,
	TriggerType,
} from '@webscopeio/react-textarea-autocomplete';
import type { JellyfishSDK } from '@balena/jellyfish-client-sdk';
import type {
	TypeContract,
	UserContract,
} from '@balena/jellyfish-types/build/core';

const AUTOCOMPLETE_DEBOUNCE = 250;

// Debounce wrapper for the dataProvider so that queries occur when the user stops typing
const debounceTrigger = <TItem extends {}>(trigger: SettingType<TItem>) => {
	return {
		...trigger,
		dataProvider: debounce(trigger.dataProvider, AUTOCOMPLETE_DEBOUNCE),
	};
};

// `getTrigger` defines triggers and their corresponding behaviour.
// Each trigger type (e.g `emojiTrigger`) has been moved into their own file for simpler testing and readability
// Triggers are higher-order functions that return a dataProvider, component, and output function.
// Each of these is used by the ReactTextareaAutocomplete component as so:
// 1 - dataProvider: takes the term typed by the user and queries the backend to return entities that match the term
// 2 - component: takes the returned entities and determines how they are rendered as autocomplete options to the user
// 3 - output: takes the user's selected entity and determines how it is outputted to the text area
export const getTrigger = _.memoize(
	(
		allTypes: TypeContract[],
		sdk: JellyfishSDK,
		user: UserContract,
	): TriggerType<any> => {
		return {
			':': emojiTrigger(),
			// @ts-ignore
			'@': debounceTrigger(userTrigger(user, sdk, '@')),
			// @ts-ignore
			'!': debounceTrigger(userTrigger(user, sdk, '!')),
			// @ts-ignore
			'@@': debounceTrigger(groupTrigger(sdk, '@@')),
			// @ts-ignore
			'!!': debounceTrigger(groupTrigger(sdk, '!!')),
			'?': typeTrigger(allTypes),
			// @ts-ignore
			'#': debounceTrigger(tagTrigger(sdk)),
		};
	},
);
