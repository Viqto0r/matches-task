import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatScore, formatStartsAt, statusLabel } from '../lib/matches';
import type { Match, Team } from '../types';
import { FavoriteButton } from './FavoriteButton';

type Props = {
  match: Match;
  favorite: boolean;
  onToggleFavorite: (id: string) => void;
};

function TeamName({ team, align }: { team: Team; align: 'left' | 'right' }) {
  return (
    <View style={[styles.team, align === 'right' && styles.teamRight]}>
      <Text style={[styles.teamName, align === 'right' && styles.textRight]} numberOfLines={2}>
        {team.name}
      </Text>
      <Text style={[styles.city, align === 'right' && styles.textRight]} numberOfLines={1}>
        {team.city}
      </Text>
    </View>
  );
}

export const MatchCard = memo(function MatchCard({ match, favorite, onToggleFavorite }: Props) {
  const score = formatScore(match.score);
  const isLive = match.status === 'live';

  return (
    <View testID={`match-${match.id}`} style={[styles.card, isLive && styles.cardLive]}>
      <View style={styles.header}>
        <Text style={styles.date}>{formatStartsAt(match.startsAt)}</Text>
        <View style={styles.headerRight}>
          <Text style={[styles.status, isLive && styles.statusLive]}>{statusLabel(match)}</Text>
          <FavoriteButton active={favorite} onPress={() => onToggleFavorite(match.id)} />
        </View>
      </View>
      <View style={styles.teams}>
        <TeamName team={match.home} align="left" />
        <Text style={[styles.score, !score && styles.scoreEmpty]}>{score ?? '—'}</Text>
        <TeamName team={match.away} align="right" />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    gap: 10,
  },
  cardLive: {
    borderColor: '#ef3124',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  date: {
    flexShrink: 1,
    fontSize: 13,
    color: '#6b7280',
  },
  status: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  statusLive: {
    color: '#ef3124',
  },
  teams: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  team: {
    flex: 1,
  },
  teamRight: {
    alignItems: 'flex-end',
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  city: {
    fontSize: 12,
    color: '#9ca3af',
  },
  textRight: {
    textAlign: 'right',
  },
  score: {
    minWidth: 64,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  scoreEmpty: {
    color: '#d1d5db',
  },
});
