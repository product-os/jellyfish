/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

// CardVisitor coordinates a depth-first traversal of a card's properties based
// on the card handlers (subclasses of `BaseHandler`) that is is passed.

const handlerForChunk = function (chunk, depth) {
	const viableHandlers = this
		.schemaHandlers
		.map((Handler) => {
			return new Handler(chunk, depth, this.context)
		})
		.filter((handler) => { return handler.canHandle() })
		.sort((lhs, rhs) => { return rhs.weight() - lhs.weight() })

	if (viableHandlers.length === 0) {
		this.logger.warn(`Dropping chunk at depth ${depth} because it cannot be handled:`, chunk)
		return null
	}

	return viableHandlers.shift()
}

module.exports = class CardVisitor {
	constructor (card, schemaHandlers, context) {
		this.card = card
		this.schemaHandlers = schemaHandlers
		this.context = context
		this.logger = context.logger
	}

	visit (currentChunk = this.card, depth = 0) {
		const handler = Reflect.apply(handlerForChunk, this, [ currentChunk, depth ])
		if (!handler) {
			return null
		}

		let rootName = null
		if (depth === 0) {
			rootName = handler.generateTypeName()
		}

		if (rootName) {
			this.context.pushName(rootName)
		}

		const children = handler.children()

		// Iterate through all the handler's defined children.  Push the child's
		// name value onto the stack if it has one, then visit the child.
		const childResults = []
		for (let childIndex = 0; childIndex < children.length; childIndex++) {
			const childName = handler.nameForChild(childIndex)
			const child = children[childIndex]
			if (childName) {
				this.context.pushName(childName)
				childResults.push(this.visit(child, depth + 1))
				this.context.popName()
			} else {
				childResults.push(this.visit(child, depth + 1))
			}
		}

		const result = handler.process(childResults)

		if (rootName) {
			this.context.popName()
		}

		return result
	}
}
