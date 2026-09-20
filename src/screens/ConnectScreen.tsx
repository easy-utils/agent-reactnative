import React from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { AgentApi } from '../lib/api'
import { colors } from '../theme'

const DEFAULT_BASE = 'https://agent.agent.10.199.64.20.nip.io'

export function ConnectScreen({
  onConnected,
}: {
  onConnected: (api: AgentApi) => void
}) {
  const [base, setBase] = React.useState(DEFAULT_BASE)
  const [token, setToken] = React.useState('')
  const [status, setStatus] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  const submit = React.useCallback(async () => {
    if (!base.trim() || !token.trim()) {
      setStatus('Enter both a gateway URL and a token.')
      return
    }
    setBusy(true)
    setStatus('Connecting…')
    try {
      const api = new AgentApi(base.trim(), token.trim())
      await api.health()
      setStatus('')
      onConnected(api)
    } catch (e) {
      setStatus(`Connect failed: ${String(e)}`)
    } finally {
      setBusy(false)
    }
  }, [base, token, onConnected])

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Easy Agent</Text>
      <Text style={styles.label}>Gateway URL</Text>
      <TextInput
        style={styles.input}
        value={base}
        onChangeText={setBase}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={colors.dim}
      />
      <Text style={styles.label}>Token</Text>
      <TextInput
        style={styles.input}
        value={token}
        onChangeText={setToken}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        placeholderTextColor={colors.dim}
      />
      <Pressable
        style={[styles.button, busy && styles.buttonDisabled]}
        onPress={submit}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color={colors.fg} />
        ) : (
          <Text style={styles.buttonText}>Connect</Text>
        )}
      </Pressable>
      {status !== '' && <Text style={styles.status}>{status}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: 'center' },
  title: {
    color: colors.fg,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  label: { color: colors.dim, marginBottom: 6 },
  input: {
    backgroundColor: colors.panel,
    color: colors.fg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600' },
  status: { color: colors.warn, marginTop: 16, textAlign: 'center' },
})
