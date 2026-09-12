import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General</Text>
        <SettingsRow label="Push Notifications" toggle />
        <SettingsRow label="Auto-sync Data" toggle defaultValue />
        <SettingsRow label="Dark Mode" toggle />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Server</Text>
        <SettingsRow label="ERPNext URL" value="http://localhost:8080" />
        <SettingsRow label="API Version" value="v1" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <SettingsRow label="Version" value="1.0.0" />
        <SettingsRow label="Build" value="2024.01" />
      </View>

      <TouchableOpacity style={styles.logoutButton}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function SettingsRow({ label, value, toggle, defaultValue = false }: { label: string; value?: string; toggle?: boolean; defaultValue?: boolean }) {
  const [enabled, setEnabled] = React.useState(defaultValue);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {toggle ? (
        <Switch value={enabled} onValueChange={setEnabled} trackColor={{ false: '#ccc', true: '#4CAF50' }} />
      ) : (
        <Text style={styles.rowValue}>{value}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  section: { backgroundColor: '#fff', borderRadius: 8, marginBottom: 16, overflow: 'hidden' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#666', padding: 12, backgroundColor: '#f9f9f9' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rowLabel: { fontSize: 16 },
  rowValue: { fontSize: 16, color: '#888' },
  logoutButton: { backgroundColor: '#ff4444', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 16 },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
