/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

// CardVisitor coordinates a depth-first traversal of a card's properties based
// on the card handlers (subclasses of `BaseHandler`) that is is passed.

// Find the appropriate handler for a given chunk of card. Private.
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

// Here's the real work of the type generator:
//
// `CardVisitor` manages the process of traversing a card and converting it into
// a collection of types.
//
// The `CardVisitor` is initialised with:
//   1. a card - the data we're acting on.
//   2. a collection of handler classes (see `BaseHandler` for more
//      information).
//   3. a `GeneratorContext`, which contains the type registry, and manages
//      side-effects of the process.
//
// The `visit` method actually performs the traversal of the card, starting from
// the root of the card object and working down.  The tricky thing is that the
// traversal has to be depth-first (ie you can't generate a type until you know
// the types of all it's properties).
//
// The algorithm goes something like this:
//   1. For a given "chunk" of card (starting with the root of the card itself),
//      ask all the handlers which of them know how to handle the chunk (the
//      `canHandle` method).
//   2. Order the possible handlers by the results of their `weight` method.
//      This is essentially the handler's confidence that it is the correct
//      handler for the job.  For example; `DateScalarHandler` can handle
//      schemas that look like `{type: 'string', format: 'date-time'}` and
//      `StringScalarHandler` handles schemas like `{type: 'string'}`, meaning
//      that either of these handlers can be used to generate a type but
//      `DateScalarHandler` is more confident than `StringScalarHandler` that it
//      is the correct one.
//   3. Ask the selected handler to generate a list of "children". Children are
//      subtrees of the chunk for which type generation must take place in order
//      for the handler to effectively generate a type.
//   4. Recurse into the `visit` method again for each child, capturing the
//      results.
//   5. Call `process` on the handler, passing the results of processing it's
//      children as an argument.
//   6. Return the result of `process`. Finished.
//
// In addition to those core algorithm, we also maintain a stack of names as we
// recurse which aid in naming of types.  This is optional, however, because
// some handlers are able to give a name to a child (ie a property name on an
// object) and some are not (ie the branches in an `anyOf` schema).
//
// The result of `process` and thus `visit` is arbitrary, depending on the
// semantics of the individual handlers, however it is generally expected to be
// a GraphQL type.
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
