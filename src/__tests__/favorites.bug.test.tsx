// Жалоба №1: «Звёздочки горят у всех матчей сразу, хотя я ничего не добавлял. Нажатие
// срабатывает непредсказуемо: то ничего не меняется, то звезда гаснет вместо того, чтобы загореться».
import { render, screen, userEvent, within } from '@testing-library/react-native';
import { FavoritesHarness } from '../test-utils/harness';

const ON = 'Убрать из избранного';
const OFF = 'Добавить в избранное';

const star = (id: string) => within(screen.getByTestId(`card-${id}`)).getByRole('button');
const activeStars = () => screen.queryAllByLabelText(ON).length;
const isActive = (id: string) => star(id).props.accessibilityLabel === ON;

describe('Жалоба №1: звёздочки избранного', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(async () => {
    user = userEvent.setup();
    await render(<FavoritesHarness />);
  });

  it('при старте не горит ни одна звезда', () => {
    expect(activeStars()).toBe(0);
    expect(screen.getAllByLabelText(OFF)).toHaveLength(3);
  });

  it('нажатие зажигает именно эту звезду', async () => {
    await user.press(star('m2'));
    expect(isActive('m2')).toBe(true);
    expect(isActive('m1')).toBe(false);
    expect(isActive('m3')).toBe(false);
  });

  it('добавленная звезда не гаснет, когда экран перерисовывается', async () => {
    await user.press(star('m1'));
    await user.press(screen.getByText('Перерисовать'));
    expect(isActive('m1')).toBe(true);
  });

  it('повторное нажатие гасит звезду', async () => {
    await user.press(star('m1'));
    await user.press(star('m1'));
    expect(isActive('m1')).toBe(false);
  });

  it('можно добавить несколько матчей в избранное', async () => {
    await user.press(star('m1'));
    await user.press(star('m3'));
    expect(isActive('m1')).toBe(true);
    expect(isActive('m2')).toBe(false);
    expect(isActive('m3')).toBe(true);
  });

  it('каждое нажатие сразу видно на экране', async () => {
    const seen: number[] = [];
    for (const id of ['m1', 'm2', 'm1', 'm2']) {
      await user.press(star(id));
      seen.push(activeStars());
    }
    expect(seen).toEqual([1, 2, 1, 0]);
  });
});
