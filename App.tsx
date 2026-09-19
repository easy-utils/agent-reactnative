// Easy Agent — React Native (Expo) client for the standalone agent.
//
// Same easy-rpc (Connect) wire + generated agent-sdk-typescript client as every
// other Easy Agent client. Three screens: connect, session list, chat.
import React from 'react'
import { StatusBar } from 'expo-status-bar'

import { ConnectScreen } from './src/screens/ConnectScreen'
import { SessionsScreen } from './src/screens/SessionsScreen'
import { ChatScreen } from './src/screens/ChatScreen'
import { AgentApi } from './src/lib/api'

type Route =
  | { name: 'connect' }
  | { name: 'sessions' }
  | { name: 'chat'; sessionId: string }

export default function App() {
  const [api, setApi] = React.useState<AgentApi | null>(null)
  const [route, setRoute] = React.useState<Route>({ name: 'connect' })

  return (
    <>
      <StatusBar style="light" />
      {route.name === 'connect' && (
        <ConnectScreen
          onConnected={(a) => {
            setApi(a)
            setRoute({ name: 'sessions' })
          }}
        />
      )}
      {route.name === 'sessions' && api && (
        <SessionsScreen
          api={api}
          onOpen={(sessionId) => setRoute({ name: 'chat', sessionId })}
          onDisconnect={() => {
            setApi(null)
            setRoute({ name: 'connect' })
          }}
        />
      )}
      {route.name === 'chat' && api && (
        <ChatScreen
          api={api}
          sessionId={route.sessionId}
          onBack={() => setRoute({ name: 'sessions' })}
        />
      )}
    </>
  )
}
