import React from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { AgentApi, Identity, PresetRef, ProviderRef, ToolRef } from '../lib/api'
import { AppPage, CONFIG_SUB_IDS, NavStore, SIDER_TABS, SiderTab } from '../navigation'
import { colors } from '../theme'

// ConfigScreen — the config tab root and its drill-in sub-pages. Mirrors the
// Flutter/Compose/webui config surface (same sub-ids: appearance/backends/
// presets/tools, plus the providers list).
export function ConfigScreen({
  api,
  nav,
  username,
  subId,
}: {
  api: AgentApi
  nav: NavStore
  username: string
  subId?: string
}) {
  if (subId === 'appearance') return <AppearanceScreen />
  if (subId === 'backends') return <BackendsScreen username={username} />
  if (subId === 'presets') return <PresetsScreen api={api} nav={nav} />
  if (subId === 'tools') return <ToolsScreen api={api} />
  return <ConfigRoot nav={nav} />
}

function ConfigRoot({ nav }: { nav: NavStore }) {
  const rows: [string, string][] = [
    ['appearance', 'Appearance'],
    ['backends', 'Users / backends'],
    ['presets', 'Presets'],
    ['tools', 'Tools'],
  ]
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.pad}>
      {rows.map(([id, label]) => (
        <Pressable
          key={id}
          style={styles.tile}
          onPress={() => nav.push({ kind: 'config_sub', key: `config_sub_${id}`, id })}
        >
          <Text style={styles.tileText}>{label}</Text>
        </Pressable>
      ))}
      <Pressable
        style={styles.tile}
        onPress={() => nav.push({ kind: 'providers_list', key: 'providers_list' })}
      >
        <Text style={styles.tileText}>Providers</Text>
      </Pressable>
    </ScrollView>
  )
}

function AppearanceScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.note}>Theme follows the system by default.</Text>
    </View>
  )
}

function BackendsScreen({ username }: { username: string }) {
  return (
    <View style={styles.root}>
      <Text style={styles.tileText}>{username || 'Current user'}</Text>
    </View>
  )
}

function PresetsScreen({ api, nav }: { api: AgentApi; nav: NavStore }) {
  const [presets, setPresets] = React.useState<PresetRef[]>([])
  React.useEffect(() => {
    void api.listPresets().then(setPresets).catch(() => {})
  }, [api])
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.pad}>
      <Pressable
        style={styles.action}
        onPress={() => nav.push({ kind: 'preset_form', key: 'preset_form_new' })}
      >
        <Text style={styles.actionText}>New preset</Text>
      </Pressable>
      {presets.map((p) => (
        <View key={p.id} style={styles.tile}>
          <Text style={styles.tileText}>{p.id}</Text>
        </View>
      ))}
    </ScrollView>
  )
}

function ToolsScreen({ api }: { api: AgentApi }) {
  const [tools, setTools] = React.useState<ToolRef[]>([])
  React.useEffect(() => {
    void api.listTools().then(setTools).catch(() => {})
  }, [api])
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.pad}>
      {tools.map((t) => (
        <View key={t.name} style={styles.tile}>
          <Text style={styles.tileText}>{t.name}</Text>
          <Text style={styles.dim}>{t.description}</Text>
        </View>
      ))}
    </ScrollView>
  )
}

export function MailboxScreen({ api, sessionId }: { api: AgentApi; sessionId: string }) {
  const [rows, setRows] = React.useState<{ id: string; msgType: string; status: string }[]>([])
  React.useEffect(() => {
    void api.mailbox(sessionId).then(setRows).catch(() => {})
  }, [api, sessionId])
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.pad}>
      {rows.map((m) => (
        <View key={m.id} style={styles.tile}>
          <Text style={styles.tileText}>{m.msgType}</Text>
          <Text style={styles.dim}>{m.status}</Text>
        </View>
      ))}
      {rows.length === 0 && <Text style={styles.dim}>No mailbox entries.</Text>}
    </ScrollView>
  )
}

export function ProvidersListScreen({ api, nav }: { api: AgentApi; nav: NavStore }) {
  const [providers, setProviders] = React.useState<ProviderRef[]>([])
  React.useEffect(() => {
    void api.listProviders().then(setProviders).catch(() => {})
  }, [api])
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.pad}>
      <Pressable
        style={styles.action}
        onPress={() => nav.push({ kind: 'provider_form', key: 'provider_form' })}
      >
        <Text style={styles.actionText}>Add provider</Text>
      </Pressable>
      {providers.map((p) => (
        <Pressable
          key={p.providerId}
          style={styles.tile}
          onPress={() =>
            nav.push({ kind: 'provider_models', key: 'provider_model_new', modelId: null })
          }
        >
          <Text style={styles.tileText}>{p.providerId}</Text>
          <Text style={styles.dim}>{p.capability}</Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}

export function ProviderFormScreen({ api, nav }: { api: AgentApi; nav: NavStore }) {
  return (
    <View style={styles.root}>
      <Text style={styles.note}>Register a provider (id, api type, base URL, key).</Text>
      <Pressable style={styles.action} onPress={() => nav.pop()}>
        <Text style={styles.actionText}>Back</Text>
      </Pressable>
    </View>
  )
}

export function ProviderModelsScreen({ api }: { api: AgentApi; modelId: string | null }) {
  return (
    <View style={styles.root}>
      <Text style={styles.note}>Provider models.</Text>
    </View>
  )
}

export function PresetFormScreen({ api, nav }: { api: AgentApi; nav: NavStore }) {
  return (
    <View style={styles.root}>
      <Text style={styles.note}>Create / edit a preset.</Text>
      <Pressable style={styles.action} onPress={() => nav.pop()}>
        <Text style={styles.actionText}>Back</Text>
      </Pressable>
    </View>
  )
}

export function TabBar({ nav }: { nav: NavStore }) {
  return (
    <View style={styles.tabBar}>
      {SIDER_TABS.map((t: SiderTab) => (
        <Pressable key={t} style={styles.tab} onPress={() => nav.switchTab(t)}>
          <Text style={[styles.tabText, nav.tab === t && styles.tabActive]}>
            {t === 'chat' ? 'Chat' : 'Settings'}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 12 },
  tile: { backgroundColor: colors.panel, borderRadius: 8, padding: 14, marginBottom: 8 },
  tileText: { color: colors.fg, fontWeight: '600' },
  dim: { color: colors.dim, fontSize: 12 },
  note: { color: colors.dim, padding: 16 },
  action: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: { color: '#fff', fontWeight: '600' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.panel,
    borderTopWidth: 1,
    borderTopColor: colors.panelAlt,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText: { color: colors.dim },
  tabActive: { color: colors.fg, fontWeight: '700' },
})
