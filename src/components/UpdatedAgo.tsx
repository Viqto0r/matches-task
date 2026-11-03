import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

type Props = {
  // Момент последней успешной загрузки данных.
  since: Date;
};

// Подпись «Обновлено N сек назад».
// Секунды вычисляются от since, а не накапливаются счётчиком: так подпись сама сбрасывается,
// когда приходит новый since, и показывает реальный возраст данных.
export function UpdatedAgo({ since }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now()); // новый since — сразу пересчитать, не дожидаясь тика
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id); // без очистки интервал жил бы после размонтирования
  }, [since]);

  const seconds = Math.max(0, Math.floor((now - since.getTime()) / 1000));

  return <Text style={styles.text}>Обновлено {seconds} сек назад</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontSize: 13,
    color: '#6b7280',
  },
});
