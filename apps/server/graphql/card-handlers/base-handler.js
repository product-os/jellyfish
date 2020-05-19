/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable class-methods-use-this */
/* eslint-disable lodash/prefer-constant */

// An abstract base class for all card handlers
//
// Each subclass should implement at least one of `canHandle`, `process` and
// `children`.
//
// The constructor stores the `cardChunk` (ie the fragment of the `Card` object
// which is currently being operated upon) and the current depth of processing.
// Between these two properties (`this.chunk` and `this.depth`) each card
// handler is able to make decisions about whether is should handle this chunk,
// and how to process it.
//
// `canHandle` - this function indicates to `CardVisitor` that this object is
// capable of processing this chunk and/or dividing it up into children to be
// processed at a lower depth.
//
// `children` - this function is called by the `CardVisitor` when it wants us to
// generate some child objects for it to descend into.  Returning an empty list
// is fine.
//
// `process` - this function is called by the `CardVisitor` when our children
// have finished being processed and we need to synthesise them into a single
// result object.  Returning `null` indicates that there is no result and the
// `CardVisitor` should ignore our processing.  This of course means that any
// child results are discarded.
module.exports = class BaseHandler {
	constructor (cardChunk, depth, context) {
		this.chunk = cardChunk
		this.depth = depth
		this.context = context
		this.logger = context.logger
	}

	canHandle () {
		return false
	}

	weight () {
		return 100
	}

	children () {
		return []
	}

	process (_childResults) {
		return null
	}

	nameForChild (_childIndex) {
		return null
	}

	generateTypeName () {
		return null
	}
}
