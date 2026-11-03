import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { FilterTabs } from '../components/FilterTabs';
import { MatchCard } from '../components/MatchCard';
import { StateView } from '../components/StateView';
import { UpdatedAgo } from '../components/UpdatedAgo';
import { useFavorites } from '../hooks/useFavorites';
import { useMatches } from '../hooks/useMatches';
import { filterMatches, sortMatches, type MatchFilter } from '../lib/matches';

// Экран «Матчи тура».
export function MatchesScreen() {
  const { status, matches, error, isRefreshing, lastUpdated, reload } = useMatches();
  const { isFavorite, toggle } = useFavorites();
  const [filter, setFilter] = useState<MatchFilter>('all');

  const visible = useMemo(() => sortMatches(filterMatches(matches, filter)), [matches, filter]);

  const renderBody = () => {
    if (status === 'loading') return <StateView kind="loading" />;
    if (status === 'error') return <StateView kind="error" message={error ?? ''} onRetry={reload} />;
    if (matches.length === 0) return <StateView kind="empty" message="Матчей пока нет" />;
    return (
      <FlatList
        data={visible}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <MatchCard match={item} favorite={isFavorite(item.id)} onToggleFavorite={toggle} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<StateView kind="empty" message="Нет матчей в этой категории" />}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={reload} />}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Матчи тура
        </Text>
        {status === 'ready' && (
          <View style={styles.toolbar}>
            {lastUpdated && <UpdatedAgo since={lastUpdated} />}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Обновить"
              aria-disabled={isRefreshing}
              aria-busy={isRefreshing}
              disabled={isRefreshing}
              onPress={reload}
              style={styles.refresh}
            >
              {isRefreshing ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text style={styles.refreshText}>Обновить</Text>
              )}
            </Pressable>
          </View>
        )}
        {status === 'ready' && error && (
          <Text style={styles.banner}>Не удалось обновить данные — показаны последние загруженные</Text>
        )}
        {status === 'ready' && matches.length > 0 && <FilterTabs value={filter} onChange={setFilter} />}
      </View>
      {renderBody()}
    </View>
  );
}

const styles = StyleSheet.create({
  // На широком экране (веб/планшет) не растягиваем карточки на всю ширину.
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refresh: {
    minWidth: 88,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  refreshText: {
    fontSize: 14,
    color: '#111827',
  },
  banner: {
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    fontSize: 13,
    padding: 8,
    borderRadius: 8,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
});
