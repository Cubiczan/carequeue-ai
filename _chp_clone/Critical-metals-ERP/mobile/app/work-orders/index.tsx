import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function WorkOrders() {
  const [refreshing, setRefreshing] = useState(false);
  const [workOrders, setWorkOrders] = useState([
    { id: 'WO-001', item: 'Battery Pack A', qty: 50, status: 'in_progress', dueDate: '2024-05-15' },
    { id: 'WO-002', item: 'Battery Pack B', qty: 30, status: 'pending', dueDate: '2024-05-16' },
    { id: 'WO-003', item: 'Module Assembly', qty: 100, status: 'completed', dueDate: '2024-05-14' },
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return '#FF9800';
      case 'completed': return '#4CAF50';
      case 'pending': return '#2196F3';
      default: return '#9E9E9E';
    }
  };

  const renderOrder = ({ item }: any) => (
    <TouchableOpacity style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>{item.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.replace('_', ' ')}</Text>
        </View>
      </View>
      <Text style={styles.orderItem}>{item.item}</Text>
      <View style={styles.orderFooter}>
        <Text style={styles.orderQty}>Qty: {item.qty}</Text>
        <Text style={styles.orderDate}>Due: {item.dueDate}</Text>
      </View>
      {item.status === 'in_progress' && (
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>View Details</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Work Orders</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={workOrders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(false)} />
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: { fontSize: 24, fontWeight: 'bold' },
  addButton: {
    backgroundColor: '#4CAF50',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: { padding: 16 },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderId: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  orderItem: { fontSize: 14, color: '#666', marginBottom: 8 },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  orderQty: { fontSize: 13, color: '#999' },
  orderDate: { fontSize: 13, color: '#999' },
  actionButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  actionButtonText: { color: '#fff', fontWeight: '600' },
});
