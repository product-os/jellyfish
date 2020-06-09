/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import _ from 'lodash'
import debounce from 'debounce-promise'
import userTrigger from './user-trigger'
import groupTrigger from './group-trigger'
import typeTrigger from './type-trigger'
import emojiTrigger from './emoji-trigger'
import tagTrigger from './tag-trigger'

const AUTOCOMPLETE_DEBOUNCE = 250

// Debounce wrapper for the dataProvider so that queries occur when the user stops typing
const debounceTrigger = (trigger) => {
	return {
		...trigger,
		dataProvider: debounce(trigger.dataProvider, AUTOCOMPLETE_DEBOUNCE)
	}
}

// `getTrigger` defines triggers and their corresponding behaviour.
// Each trigger type (e.g `emojiTrigger`) has been moved into their own file for simpler testing and readability
// Triggers are higher-order functions that return a dataProvider, component, and output function.
// Each of these is used by the ReactTextareaAutocomplete component as so:
// 1 - dataProvider: takes the term typed by the user and queries the backend to return entities that match the term
// 2 - component: takes the returned entities and determines how they are rendered as autocomplete options to the user
// 3 - output: takes the user's selected entity and determines how it is outputted to the text area
export const getTrigger = _.memoize((allTypes, sdk, user) => {
	return {
		':': emojiTrigger(),
		'@': debounceTrigger(userTrigger(user, sdk, '@')),
		'!': debounceTrigger(userTrigger(user, sdk, '!')),
		'@@': debounceTrigger(groupTrigger(sdk, '@@')),
		'!!': debounceTrigger(groupTrigger(sdk, '!!')),
		'?': typeTrigger(allTypes),
		'#': debounceTrigger(tagTrigger(sdk))
	}
})
