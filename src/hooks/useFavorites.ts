import { useCallback, useState } from 'react';

// Избранные матчи (по id). Хранятся только в памяти, пока открыто приложение.
export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  // indexOf возвращает -1 для отсутствующего элемента, а Boolean(-1) === true; includes — то, что нужно.
  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  // Новый массив вместо мутации старого: React сравнивает состояние по ссылке и иначе не перерисует.
  // Функциональная форма берёт актуальное состояние, даже если нажатия идут быстрее перерисовок.
  const toggle = useCallback((id: string) => {
    setFavorites((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  }, []);

  return { favorites, isFavorite, toggle };
}
