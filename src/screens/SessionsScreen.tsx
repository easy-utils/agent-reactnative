import React from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'

import { AgentApi, SessionRef } from '../lib/api'
import { colors } from '../theme'

export function SessionsScreen({
  api,
  onOpen,
  onDisconnect,
}: {
  api: AgentApi
  onOpen: (sessionId: string) => void
  onDisconnect: () => void
}) {
  const [sessions, setSessions] = React.useState<SessionRef[]>([])
  const [status, setStatus] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  const refresh = React.useCallback(async () => {
    try {
      const list = await api.listSessions()
      setSessions(list)
      setStatus('')
    } catch (e) {
      setStatus(`Refresh failed: ${String(e)}`)
    }
  }, [api])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const create = React.useCallback(async () => {
    setBusy(true)
    try {
      const name = `easy-${Date.now()}`
      await api.createSession(name)
      await refresh()
    } catch (e) {
      setStatus(`Create failed: ${String(e)}`)
    } finally {
      setBusy(false)
    }
  }, [api, refresh])

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Sessions ({sessions.length})</Text>
        <Pressable style={styles.action} onPress={create} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={colors.fg} />
          ) : (
            <Text style={styles.actionText}>New</Text>
          )}
        </Pressable>
        <Pressable style={styles.action} onPress={refresh}>
          <Text style={styles.actionText}>Refresh</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={onDisconnect}>
          <Text style={styles.actionText}>Sign out</Text>
        </Pressable>
      </View>
      <FlatList
        data={sessions}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => onOpen(item.id)}>
            <Text style={styles.rowText}>{item.id}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.dim}>No sessions yet.</Text>}
      />
      {status !== '' && <Text style={styles.status}>{status}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.panel,
  },
  title: { color: colors.fg, fontWeight: '700', flex: 1 },
  action: {
    backgroundColor: colors.panelAlt,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 6,
  },
  actionText: { color: colors.fg, fontSize: 13 },
  list: { padding: 8 },
  row: {
    backgroundColor: colors.panel,
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
  },
  rowText: { color: colors.fg },
  dim: { color: colors.dim, textAlign: 'center', marginTop: 24 },
  status: { color: colors.warn, padding: 8 },
})
