OpenAI-authored synthetic tests from sign-in-with-chatgpt-devkit commit
0a36fefeb913055c8c7a1a29b63d82b96b2e841a, packages/local/test.
They retain the Noncommercial License v1.0 provided at
../../src/infrastructure/chatgpt/devkit/LICENSE.
Modifications: imports point to TypeScript source; the isolated Node worker
uses the tsx loader. These modifications retain the same license.
No test calls live authentication, launches a real browser or uses real tokens.
`lifecycle.check.mjs` is independently authored for this project; it is not
copied from the DevKit.
