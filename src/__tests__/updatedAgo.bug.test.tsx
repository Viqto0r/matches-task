// Жалоба №2: «„Обновлено N сек назад“ застывает на одном числе и не сбрасывается после обновления».
import { act, render, screen, userEvent } from '@testing-library/react-native';
import { UpdatedAgo } from '../components/UpdatedAgo';
import { UpdatedAgoHarness } from '../test-utils/harness';

const NOW = new Date('2026-10-15T12:00:00Z');
const label = () => screen.getByText(/^Обновлено/).props.children.join('');
const wait = (ms: number) => act(async () => { jest.advanceTimersByTime(ms); });

describe('Жалоба №2: «Обновлено N сек назад»', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: NOW });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('счётчик растёт со временем', async () => {
    await render(<UpdatedAgoHarness initialSince={new Date()} />);
    expect(label()).toBe('Обновлено 0 сек назад');
    await wait(5000);
    expect(label()).toBe('Обновлено 5 сек назад');
  });

  it('сбрасывается после обновления и снова растёт', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await render(<UpdatedAgoHarness initialSince={new Date()} />);
    await wait(7000);
    await user.press(screen.getByText('Обновить'));
    expect(label()).toBe('Обновлено 0 сек назад');
    await wait(2000);
    expect(label()).toBe('Обновлено 2 сек назад');
  });

  it('показывает реальный возраст данных, а не время с момента появления на экране', async () => {
    await render(<UpdatedAgo since={new Date(NOW.getTime() - 30_000)} />);
    expect(label()).toBe('Обновлено 30 сек назад');
  });

  it('после закрытия не оставляет работающих таймеров', async () => {
    const { unmount } = await render(<UpdatedAgo since={new Date()} />);
    await unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
