// Empty shim for Node built-ins that the easy-rpc TS package imports on its
// main entry (bridge_node.ts). React Native's fetch transport is the only path
// we actually use, so the Node adapter never runs — it just has to resolve.
module.exports = {}
