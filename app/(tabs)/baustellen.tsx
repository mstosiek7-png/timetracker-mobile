// =====================================================
// Baustellen — Lista budów
// =====================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { theme } from '../../constants/theme';
import { supabase } from '../../services/supabase';
import { ConstructionSite, ActiveSiteSummary } from '../../types/models';

// Komponenty UI
import PageHeader from '../../components/ui/PageHeader';
import StatBox from '../../components/ui/StatBox';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import FAB from '../../components/ui/FAB';
import EmptyState from '../../components/ui/EmptyState';

// Modal do dodawania nowej budowy
import NewConstructionModal from './components/NewConstructionModal';

export default function BaustellenScreen() {
  const[refreshing, setRefreshing] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const queryClient = useQueryClient();

  // Pobieranie listy budów
  const { data: sites, isLoading, error } = useQuery({
    queryKey: ['construction-sites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('construction_sites')
        .select(`
          *,
          asphalt_types(count),
          deliveries(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ConstructionSite[];
    },
  });

  // Pobieranie statystyk
  const { data: statistics } = useQuery({
    queryKey: ['site-statistics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_site_statistics');

      if (error) throw error;
      return data || { active_count: 0, total_tons: 0, total_deliveries: 0 };
    },
  });

  // Pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['construction-sites'] });
    await queryClient.invalidateQueries({ queryKey: ['site-statistics'] });
    setRefreshing(false);
  };

  // Obsługa kliknięcia karty budowy
  const handleSitePress = (siteId: string) => {
    router.push(`/site/${siteId}`);
  };

  // Formatowanie liczby ton
  const formatTons = (tons: number) => {
    return `${tons.toFixed(1)}t`;
  };

  // Obliczanie statystyk
  const activeCount = statistics?.active_count || 0;
  const totalTons = statistics?.total_tons || 0;
  const totalDeliveries = statistics?.total_deliveries || 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.accent]}
          />
        }
      >
        {/* Nagłówek */}
        <PageHeader
          subtitle="asphaltbau"
          title="Baustellen"
          rightAction={
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowNewModal(true)}
            >
              <Ionicons name="add" size={24} color={theme.colors.card} />
            </TouchableOpacity>
          }
        />

        {/* Statystyki */}
        <View style={styles.statsContainer}>
          <Card style={styles.statsCard}>
            <View style={styles.statsRow}>
              <StatBox
                value={activeCount.toString()}
                label="Aktywne budowy"
                color={theme.colors.accent}
              />
              <StatBox
                value={formatTons(totalTons)}
                label="Łącznie ton"
                color={theme.colors.accent}
              />
              <StatBox
                value={totalDeliveries.toString()}
                label="Łącznie dostaw"
                color={theme.colors.accent}
              />
            </View>
          </Card>
        </View>

        {/* Lista budów */}
        <View style={styles.listContainer}>
          {isLoading ? (
            <EmptyState
              icon="⏳"
              title="Ładowanie..."
              subtitle="Pobieranie listy budów"
            />
          ) : error ? (
            <EmptyState
              icon="⚠️"
              title="Błąd"
              subtitle="Nie udało się załadować budów"
            />
          ) : sites && sites.length > 0 ? (
            sites.map((site) => (
              <TouchableOpacity
                key={site.id}
                onPress={() => handleSitePress(site.id)}
                activeOpacity={0.7}
              >
                <Card
                  leftBorderColor={
                    site.status === 'active'
                      ? theme.colors.accent
                      : theme.colors.muted
                  }
                  style={styles.siteCard}
                >
                  <View style={styles.siteCardHeader}>
                    <View style={styles.siteInfo}>
                      <View style={styles.statusRow}>
                        <StatusBadge
                          status="fza"
                          label={site.status === 'active' ? 'Aktywna' : 'Zakończona'}
                          size="sm"
                        />
                      </View>
                      <Text style={styles.siteName}>{site.name}</Text>
                      {site.address && (
                        <View style={styles.addressRow}>
                          <Ionicons
                            name="location-outline"
                            size={12}
                            color={theme.colors.muted}
                          />
                          <Text style={styles.siteAddress}>{site.address}</Text>
                        </View>
                      )}
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={theme.colors.muted}
                    />
                  </View>

                  <View style={styles.siteMetrics}>
                    <View style={styles.metricTag}>
                      <Text style={styles.metricValue}>
                        {/* TODO: Pobierz rzeczywiste dane z widoku ActiveSiteSummary */}
                        0.0t
                      </Text>
                      <Text style={styles.metricLabel}>ton</Text>
                    </View>
                    <View style={styles.metricTag}>
                      <Text style={styles.metricValue}>
                        {/* TODO: Pobierz rzeczywiste dane z widoku ActiveSiteSummary */}
                        0
                      </Text>
                      <Text style={styles.metricLabel}>dostaw</Text>
                    </View>
                    {/* TODO: Wyświetl tagi klas asfaltu */}
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          ) : (
            <EmptyState
              icon="🏗️"
              title="Brak budów"
              subtitle="Dodaj pierwszą budowę, aby rozpocząć"
            />
          )}
        </View>
      </ScrollView>

      {/* FAB do dodawania nowej budowy */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowNewModal(true)}
        activeOpacity={0.8}
      >
        <View style={styles.fabButton}>
          <Ionicons name="add" size={24} color={theme.colors.card} />
        </View>
      </TouchableOpacity>

      {/* Modal dodawania nowej budowy */}
      <NewConstructionModal
        visible={showNewModal}
        onClose={() => setShowNewModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  statsCard: {
    padding: theme.spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listContainer: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  siteCard: {
    marginBottom: theme.spacing.md,
  },
  siteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  siteInfo: {
    flex: 1,
  },
  statusRow: {
    marginBottom: theme.spacing.xs,
  },
  siteName: {
    fontSize: theme.fontSize.lg,
    fontWeight: '900',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  siteAddress: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.muted,
  },
  siteMetrics: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  metricTag: {
    backgroundColor: theme.colors.accentLight,
    borderRadius: theme.radius.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  metricValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700',
    color: theme.colors.accent,
  },
  metricLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.accent,
  },
  fab: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    right: theme.spacing.xl,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});