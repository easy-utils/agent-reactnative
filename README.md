# agent-reactnative

**Easy Agent** — mobile client in TypeScript using [React Native](https://reactnative.dev)
via [Expo](https://expo.dev), over the same easy-rpc (Connect) wire as every
other Easy Agent client.

It consumes the generated
[`agent-sdk-typescript`](https://github.com/easy-utils/agent-sdk-typescript)
client and the [`easy-rpc-ts`](https://github.com/easy-utils/easy-rpc-ts) fetch
transport.

```bash
npm install
npm run android      # expo run:android (prebuild + native build)
npm start            # Metro dev server (Expo Go / dev client)
npm run check        # tsc --noEmit
```

Connect with the standalone agent's base URL + a tenant token, list sessions,
open a chat, and stream a prompt turn (`text-delta`, `reasoning-delta`,
`tool-call`).

## Metro notes

The easy-utils SDKs ship TypeScript source (`main: src/index.ts`) with ESM
`.js` import specifiers; `metro.config.js` maps those to the sibling `.ts`
files and stubs the Node built-ins that the easy-rpc main entry re-exports but
this client never uses.
