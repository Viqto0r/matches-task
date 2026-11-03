import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FILTERS, FILTER_LABELS, type MatchFilter } from '../lib/matches';

type Props = {
  value: MatchFilter;
  onChange: (filter: MatchFilter) => void;
};

export function FilterTabs({ value, onChange }: Props) {
  return (
    <View style={styles.container} accessibilityRole="tablist">
      {FILTERS.map((filter) => {
        const selected = filter === value;
        return (
          <Pressable
            key={filter}
            accessibilityRole="tab"
            // aria-*, а не accessibilityState: react-native-web 0.21 игнорирует accessibilityState
            aria-selected={selected}
            onPress={() => onChange(filter)}
            style={[styles.tab, selected && styles.tabSelected]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{FILTER_LABELS[filter]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabSelected: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
  },
  labelSelected: {
    color: '#111827',
    fontWeight: '600',
  },
});
