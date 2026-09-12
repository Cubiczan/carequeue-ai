import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface InventoryItem {
  id: string;
  item_code: string;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  warehouse: string;
}

const mockInventory: InventoryItem[] = [
  { id: '1', item_code: 'COB-SULF-001', item_name: 'Cobalt Sulfate', category: 'Recovered Materials', quantity: 500, unit: 'kg', warehouse: 'WH-001' },
  { id: '2', item_code: 'NIC-SULF-001', item_name: 'Nickel Sulfate', category: 'Recovered Materials', quantity: 800, unit: 'kg', warehouse: 'WH-001' },
  { id: '3', item_code: 'LIT-CARB-001', item_name: 'Lithium Carbonate', category: 'Recovered Materials', quantity: 50, unit: 'kg', warehouse: 'WH-001' },
];

export default function InventoryScreen() {
  const [search, setSearch] = useState('');
  const [inventory] = useState<InventoryItem[]>(mockInventory);

  const filtered = inventory.filter(
    (item) =>
      item.item_name.toLowerCase().includes(search.toLowerCase()) ||
      item.item_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Inventory</Text>
      <TextInput
        style={styles.search}
        placeholder="Search items..."
        value={search}
        onChangeText={setSearch}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <Text style={styles.itemCode}>{item.item_code}</Text>
            <Text style={styles.itemName}>{item.item_name}</Text>
            <View style={styles.details}>
              <Text style={styles.detailText}>{item.quantity} {item.unit}</Text>
              <Text style={styles.detailText}>📍 {item.warehouse}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  search: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#ddd' },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 16, marginBottom: 8 },
  itemCode: { fontSize: 12, color: '#666', marginBottom: 4 },
  itemName: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  details: { flexDirection: 'row', justifyContent: 'space-between' },
  detailText: { fontSize: 14, color: '#888' },
});
