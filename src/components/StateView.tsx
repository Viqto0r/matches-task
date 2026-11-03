import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

type Props =
  | { kind: 'loading' }
  | { kind: 'error'; message: string; onRetry: () => void }
  | { kind: 'empty'; message: string };

// Полноэкранные состояния: загрузка, ошибка с «Повторить», пустой список.
export function StateView(props: Props) {
  return (
    <View style={styles.container}>
      {props.kind === 'loading' && <ActivityIndicator size="large" accessibilityLabel="Загрузка" />}
      {props.kind !== 'loading' && <Text style={styles.message}>{props.message}</Text>}
      {props.kind === 'error' && (
        <Pressable accessibilityRole="button" onPress={props.onRetry} style={styles.button}>
          <Text style={styles.buttonText}>Повторить</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  message: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#ef3124',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
