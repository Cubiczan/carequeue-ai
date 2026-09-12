import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Dashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    activeWorkOrders: 0,
    pendingQuality: 0,
    batchesInProcess: 0,
    lowStockItems: 0,
  });

  const loadStats = async () => {
    // In production, fetch from API
    // For now, use mock data
    setStats({
      activeWorkOrders: 5,
      pendingQuality: 3,
      batchesInProcess: 8,
      lowStockItems: 2,
    });
  };

  useEffect(() => {
    loadStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const menuItems = [
    {
      title: 'Work Orders',
      icon: 'clipboard',
      color: '#4CAF50',
      link: '/work-orders',
      count: stats.activeWorkOrders,
    },
    {
      title: 'Inventory',
      icon: 'cube',
      color: '#2196F3',
      link: '/inventory',
      count: stats.lowStockItems,
    },
    {
      title: 'Scan Barcode',
      icon: 'scan',
      color: '#FF9800',
      link: '/scan',
      count: null,
    },
    {
      title: 'Quality Checks',
      icon: 'flask',
      color: '#9C27B0',
      link: '/quality',
      count: stats.pendingQuality,
    },
    {
      title: 'Batches',
      icon: 'layers',
      color: '#00BCD4',
      link: '/batches',
      count: stats.batchesInProcess,
    },
    {
      title: 'HazMat',
      icon: 'warning',
      color: '#F44336',
      link: '/hazmat',
      count: null,
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Battery ERP</Text>
        <Text style={styles.headerSubtitle}>Shop Floor Management</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="clipboard" size={24} color="#4CAF50" />
          <Text style={styles.statValue}>{stats.activeWorkOrders}</Text>
          <Text style={styles.statLabel}>Active WO</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="flask" size={24} color="#9C27B0" />
          <Text style={styles.statValue}>{stats.pendingQuality}</Text>
          <Text style={styles.statLabel}>Quality</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="layers" size={24} color="#00BCD4" />
          <Text style={styles.statValue}>{stats.batchesInProcess}</Text>
          <Text style={styles.statLabel}>Batches</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="warning" size={24} color="#F44336" />
          <Text style={styles.statValue}>{stats.lowStockItems}</Text>
          <Text style={styles.statLabel}>Low Stock</Text>
        </View>
      </View>

      {/* Menu Grid */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <Link href={item.link} key={index} asChild>
            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon as any} size={24} color="#fff" />
              </View>
              <Text style={styles.menuTitle}>{item.title}</Text>
              {item.count !== null && item.count! > 0 && (
                <View style={styles.menuBadge}>
                  <Text style={styles.menuBadgeText}>{item.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          </Link>
        ))}
      </View>

      {/* Offline Status */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          📱 Mobile App v1.0.0 | Pull to refresh
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#fff',
    marginVertical: 8,
  },
  statCard: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  menuContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  menuItem: {
    width: '33.33%',
    padding: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  menuIcon: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuTitle: {
    fontSize: 12,
    textAlign: 'center',
    color: '#333',
  },
  menuBadge: {
    position: 'absolute',
    top: 4,
    right: 12,
    backgroundColor: '#F44336',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  menuBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#999',
    fontSize: 12,
  },
});
