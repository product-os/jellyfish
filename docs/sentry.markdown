Using Sentry
============

We use [Sentry](https://sentry.io/) to track *unexpected* errors throughout the
Jellyfish infrastructure.

> Contact the ops team if you don't have access to Sentry

We have two Sentry projects for Jellyfish:

- **server**: Backend errors
- **UI**: Frontend errors

You can switch between Sentry projects using a dropdown in the top bar. Here is
how the `server` project dashboard look like:

![Sentry Server Overview](./assets/sentry-server-overview.png)

You can apply various filters on this view, but the list of issues is usually
small, so the default filters tend to be more than enough.

We strive to get this list of issues to inbox zero, which involves the following tasks:

- Solving the problem through a PR
- Sending a PR to catch that error and report it as an "expected" exception
	(for example, a client requesting a card with an invalid UUID is an expected
	exception that we don't have to deal with)
- Grouping difference instances of the same errors (make that is indeed the
	case first!)
- Hidding the error through the "Ignore" button, if its a one-time issue that
	doesn't warrant much attention (i.e. you manually triggered a problematic
	query for testing purposes, and you knew it was going to throw an error)

Here is how an issue report looks like:

![Sentry Issue](./assets/sentry-issue.png)

You can switch between different occurences of the same error through the
"Older" and "Newer" button group.

One of the most important things to look for is the request ID that you can
find at the bottom of the screen, as you can easily track the problematic
request down in the production logs:

![Sentry Request ID](./assets/sentry-request-id.png)

The "Tags" section shows you a handy breakdown of all the instances of the
issue:

![Sentry Tags](./assets/sentry-tags.png)

I tend to find the version breakdown incredibly useful. We increment the
product's version on every PR, so finding the oldest occurence of the problem
usually points you directly at the commit tha introduced it.

Once an issue is fixed **and deployed**, remove it from the list by clicking
"Resolve".

You can conveniently ignore a issue until it happens again in the future
through the UI, which is helpful in case you each to a dead end and can't
continue without more occurences to inspect:

![Sentry Ignore](./assets/sentry-ignore.png)
