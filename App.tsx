// Easy Agent — React Native (Expo) client for the standalone agent.
//
// Same easy-rpc (Connect) wire + generated agent-sdk-typescript client as every
// other Easy Agent client. Navigation mirrors the Flutter/Compose/webui model
// (tools/pages.py guards the shared contract): two tabs, each a page stack.
import React from 'react'
import { StatusBar } from 'expo-status-bar'

import { ConnectScreen } from './src/screens/ConnectScreen'
import { SessionsScreen } from './src/screens/SessionsScreen'
import { ChatScreen } from './src/screens/ChatScreen'
import {
  ConfigScreen,
  MailboxScreen,
  PresetFormScreen,
  ProviderFormScreen,
  ProviderModelsScreen,
  ProvidersListScreen,
  TabBar,
} from './src/screens/ConfigScreen'
import { AgentApi } from './src/lib/api'
import { AppPage, NavStore, SIDER_TABS } from './src/navigation'

export default function App() {
  const [api, setApi] = React.useState<AgentApi | null>(null)
  const [username, setUsername] = React.useState('')
  const nav = React.useMemo(() => new NavStore(), [])
  const [, force] = React.useReducer((n) => n + 1, 0)

  React.useEffect(() => nav.subscribe(force), [nav])

  if (!api) {
    return (
      <>
        <StatusBar style="light" />
        <ConnectScreen
          onConnected={(a) => {
            setApi(a)
            void a.resolveUsername().then(setUsername)
          }}
        />
      </>
    )
  }

  const page = nav.top
  return (
    <>
      <StatusBar style="light" />
      <Page
        page={page}
        api={api}
        nav={nav}
        username={username}
        onDisconnect={() => setApi(null)}
      />
      <TabBar nav={nav} />
    </>
  )
}

function Page({
  page,
  api,
  nav,
  username,
  onDisconnect,
}: {
  page: AppPage
  api: AgentApi
  nav: NavStore
  username: string
  onDisconnect: () => void
}) {
  switch (page.kind) {
    case 'chat_list':
      return (
        <SessionsScreen
          api={api}
          onOpen={(sessionId) => {
            nav.activeSessionId = sessionId
            nav.push({ kind: 'chat_session', key: 'chat_session' })
          }}
          onDisconnect={onDisconnect}
        />
      )
    case 'chat_session':
      return <ChatScreen api={api} sessionId={nav.activeSessionId} onBack={() => nav.pop()} />
    case 'chat_overlay':
      return <MailboxScreen api={api} sessionId={nav.activeSessionId} />
    case 'config_root':
      return <ConfigScreen api={api} nav={nav} username={username} />
    case 'config_sub':
      return <ConfigScreen api={api} nav={nav} username={username} subId={page.id} />
    case 'providers_list':
      return <ProvidersListScreen api={api} nav={nav} />
    case 'preset_form':
      return <PresetFormScreen api={api} nav={nav} />
    case 'provider_form':
      return <ProviderFormScreen api={api} nav={nav} />
    case 'provider_models':
      return <ProviderModelsScreen api={api} modelId={page.modelId} />
  }
}
