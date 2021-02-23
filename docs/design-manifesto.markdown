# Jellyfish design manifesto

In developing the Jellyfish platform, we have made some explicit decisions about
how the system should be designed. We use the decisions to help guide us when
solving problems and developing new features.

- Prefer write time complexity over read time complexity
- Use idempotency and eventual consistency instead of transactions
- When modeling an external entity, it should be represented 1:1 with a contract
	in Jellyfish
- Any contract can be freely extended with additional information, provided it is
	contained in the contract's `data` field
- All operations should create a paper trail
- The user interface should automatically reflect the actor's permissable operations
- Prefer a good generic solution over a perfect custom solution
- Non-core functionality should be encapsulated in a plugin
- Aim to use a small, standardised set of functionality to build complex
	features
- Never make a change that degrades the development experience
