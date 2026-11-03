// Тестовые обёртки (не продакшн-код): воспроизводят то, что видит тестировщик на экране.
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { FavoriteButton } from '../components/FavoriteButton';
import { UpdatedAgo } from '../components/UpdatedAgo';
import { useFavorites } from '../hooks/useFavorites';

export const HARNESS_IDS = ['m1', 'm2', 'm3'];

// Три «карточки» матчей со звёздочкой, как в списке. Кнопка «Перерисовать» имитирует
// перерисовку экрана по постороннему поводу (смена фильтра, обновление данных).
export function FavoritesHarness() {
  const { isFavorite, toggle } = useFavorites();
  const [, setRenderCount] = useState(0);
  return (
    <View>
      <Pressable onPress={() => setRenderCount((n) => n + 1)}>
        <Text>Перерисовать</Text>
      </Pressable>
      {HARNESS_IDS.map((id) => (
        <View key={id} testID={`card-${id}`}>
          <Text>{id}</Text>
          <FavoriteButton active={isFavorite(id)} onPress={() => toggle(id)} />
        </View>
      ))}
    </View>
  );
}

// Подпись «Обновлено N сек назад» и кнопка «Обновить», которая обновляет момент загрузки.
export function UpdatedAgoHarness({ initialSince }: { initialSince: Date }) {
  const [since, setSince] = useState(initialSince);
  return (
    <View>
      <UpdatedAgo since={since} />
      <Pressable accessibilityRole="button" onPress={() => setSince(new Date())}>
        <Text>Обновить</Text>
      </Pressable>
    </View>
  );
}
