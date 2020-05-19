/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable class-methods-use-this */

const ava = require('ava')
const CardVisitor = require('../../../../../apps/server/graphql/card-visitor')
const BaseHandler = require('../../../../../apps/server/graphql/card-handlers/base-handler')
const sinon = require('sinon')

class HandlerA extends BaseHandler {
	canHandle () {
		return (this.context.useHandlerA === true) && (this.depth === 0)
	}

	children () {
		return [ {} ]
	}
}

class HandlerB extends BaseHandler {
	canHandle () {
		return (this.context.useHandlerB === true) || (this.depth > 0)
	}
}

const handlers = [ HandlerA, HandlerB ]

ava('`visit` finds the appropriate handler for a card', (test) => {
	const handlerASpy = sinon.spy(HandlerA.prototype, 'process')
	const handlerBSpy = sinon.spy(HandlerB.prototype, 'process')

	const cardVisitor = new CardVisitor({}, handlers, {
		useHandlerB: true
	})

	cardVisitor.visit()

	test.truthy(handlerASpy.neverCalledWith())
	test.truthy(handlerBSpy.calledOnceWith())

	handlerASpy.restore()
	handlerBSpy.restore()
})

ava('`visit` descends into a handler\'s children', (test) => {
	const handlerASpy = sinon.spy(HandlerA.prototype, 'process')
	const handlerBSpy = sinon.spy(HandlerB.prototype, 'process')

	const cardVisitor = new CardVisitor({}, handlers, {
		useHandlerA: true
	})

	cardVisitor.visit()

	test.truthy(handlerASpy.calledOnceWith())
	test.truthy(handlerBSpy.calledBefore(handlerASpy))

	handlerASpy.restore()
	handlerBSpy.restore()
})

ava('`visit` passes a child handler\'s result into it\'s parent for processing', (test) => {
	const handlerASpy = sinon.spy(HandlerA.prototype, 'process')
	const handlerBSpy = sinon.stub(HandlerB.prototype, 'process').returns('handlerB')

	const cardVisitor = new CardVisitor({}, handlers, {
		useHandlerA: true
	})

	cardVisitor.visit()

	test.truthy(handlerASpy.calledOnceWithExactly([ 'handlerB' ]))
	test.truthy(handlerBSpy.calledOnceWith())

	handlerASpy.restore()
	handlerBSpy.restore()
})
