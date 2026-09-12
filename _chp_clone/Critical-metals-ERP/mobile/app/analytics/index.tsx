import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { analytics } from '../../services/analytics';

export default function Analytics() {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [kpis, setKpis] = useState({
    oee: 0,
    throughput: 0,
    yieldRate: 0,
    onTimeDelivery: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    setLoading(true);
    const data = await analytics.getKPIs();
    setKpis(data);
    setLoading(false);
  };

  const periods = [
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' },
  ];

  const kpiCards = [
    {
      title: 'OEE',
      value: `${kpis.oee}%`,
      icon: 'analytics',
      color: '#4CAF50',
      description: 'Overall Equipment Effectiveness',
    },
    {
      title: 'Throughput',
      value: `${kpis.throughput} kg/h`,
      icon: 'speedometer',
      color: '#2196F3',
      description: 'Production rate',
    },
    {
      title: 'Yield Rate',
      value: `${kpis.yieldRate}%`,
      icon: 'trending-up',
      color: '#FF9800',
      description: 'Material recovery efficiency',
    },
    {
      title: 'On-Time Delivery',
      value: `${kpis.onTimeDelivery}%`,
      icon: 'time',
      color: '#9C27B0',
      description: 'Schedule adherence',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {periods.map((period) => (
          <TouchableOpacity
            key={period.id}
            style={[
              styles.periodButton,
              selectedPeriod === period.id && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod(period.id as any)}
          >
            <Text
              style={[
                styles.periodText,
                selectedPeriod === period.id && styles.periodTextActive,
              ]}
            >
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiContainer}>
        {kpiCards.map((kpi, index) => (
          <View key={index} style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: kpi.color }]}>
              <Ionicons name={kpi.icon as any} size={24} color="#fff" />
            </View>
            <Text style={styles.kpiTitle}>{kpi.title}</Text>
            <Text style={styles.kpiValue}>{kpi.value}</Text>
            <Text style={styles.kpiDescription}>{kpi.description}</Text>
          </View>
        ))}
      </View>

      {/* Charts Placeholder */}
      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Production Trend</Text>
        <View style={styles.chartPlaceholder}>
          <Ionicons name="bar-chart" size={48} color="#ccc" />
          <Text style={styles.chartPlaceholderText}>
            Chart: Daily production output
          </Text>
        </View>
      </View>

      <View style={styles.chartSection}>
        <Text style={styles.sectionTitle}>Recovery Rates by Material</Text>
        <View style={styles.chartPlaceholder}>
          <Ionicons name="pie-chart" size={48} color="#ccc" />
          <Text style={styles.chartPlaceholderText}>
            Pie chart: Co, Ni, Li, Mn recovery
          </Text>
        </View>
      </View>

      {/* Export Button */}
      <TouchableOpacity style={styles.exportButton}>
        <Ionicons name="download" size={20} color="#fff" />
        <Text style={styles.exportButtonText}>Export Report</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  periodButtonActive: {
    backgroundColor: '#4CAF50',
  },
  periodText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  periodTextActive: {
    color: '#fff',
  },
  kpiContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
  },
  kpiCard: {
    width: '50%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: '2%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  kpiIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  kpiDescription: {
    fontSize: 11,
    color: '#999',
  },
  chartSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e0e0e0',
  },
  chartPlaceholderText: {
    marginTop: 12,
    color: '#999',
    fontSize: 14,
  },
  exportButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
