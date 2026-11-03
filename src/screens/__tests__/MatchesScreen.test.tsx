import { render, screen, userEvent, waitFor, within } from '@testing-library/react-native';
import fixture from '../../../data/matches.json';
import { MatchesScreen } from '../MatchesScreen';

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const fail = (status = 500) => ({ ok: false, status, json: async () => ({}) });

const originalFetch = globalThis.fetch;
let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn().mockResolvedValue(ok(fixture));
  globalThis.fetch = fetchMock;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

const cards = () => screen.queryAllByTestId(/^match-/);
const card = (id: string) => within(screen.getByTestId(`match-${id}`));
const loaded = () => screen.findByText('Зенит');

describe('MatchesScreen', () => {
  it('показывает загрузку, затем карточки с командами, счётом, статусом и датой', async () => {
    let respond!: (value: unknown) => void;
    fetchMock.mockReturnValueOnce(new Promise((resolve) => (respond = resolve)));
    await render(<MatchesScreen />);
    expect(screen.getByLabelText('Загрузка')).toBeOnTheScreen();
    respond(ok(fixture));
    await loaded();

    expect(cards()).toHaveLength(8);
    expect(card('m1').getByText('Зенит')).toBeOnTheScreen();
    expect(card('m1').getByText('Спартак')).toBeOnTheScreen();
    expect(card('m1').getByText('2 : 1')).toBeOnTheScreen();
    expect(card('m1').getByText('Завершён')).toBeOnTheScreen();
    expect(card('m4').getByText("Идёт · 67'")).toBeOnTheScreen();
    expect(card('m4').getByText('1 : 1')).toBeOnTheScreen();
    expect(card('m7').getByText('Дата уточняется')).toBeOnTheScreen();
    expect(card('m7').getByText('Перенесён')).toBeOnTheScreen();
    expect(card('m5').queryByText(/\d+ : \d+/)).toBeNull();
    expect(screen.queryByText(/Invalid Date|undefined|NaN/)).toBeNull();
  });

  it('фильтр «Завершённые» и «Предстоящие»', async () => {
    const user = userEvent.setup();
    await render(<MatchesScreen />);
    await loaded();

    await user.press(screen.getByRole('tab', { name: 'Завершённые' }));
    expect(cards()).toHaveLength(3);
    expect(screen.queryByText('Динамо Махачкала')).toBeNull();
    expect(screen.getByRole('tab', { name: 'Завершённые' })).toBeSelected();

    await user.press(screen.getByRole('tab', { name: 'Предстоящие' }));
    expect(cards()).toHaveLength(5);
    expect(screen.getByText('Балтика')).toBeOnTheScreen();
    expect(screen.getByText('Рубин')).toBeOnTheScreen();
    expect(screen.queryByText('Зенит')).toBeNull();

    await user.press(screen.getByRole('tab', { name: 'Все' }));
    expect(cards()).toHaveLength(8);
  });

  it('ошибка загрузки → сообщение и «Повторить», после повтора — список', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(fail(500));
    await render(<MatchesScreen />);
    expect(await screen.findByText('Не удалось загрузить матчи')).toBeOnTheScreen();

    await user.press(screen.getByRole('button', { name: 'Повторить' }));
    await loaded();
    expect(cards()).toHaveLength(8);
  });

  it('нет матчей → понятный пустой экран', async () => {
    fetchMock.mockResolvedValue(ok({ round: 12, matches: [] }));
    await render(<MatchesScreen />);
    expect(await screen.findByText('Матчей пока нет')).toBeOnTheScreen();
  });

  it('пустая категория фильтра → своё сообщение', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(ok({ matches: fixture.matches.filter((m) => m.status !== 'finished') }));
    await render(<MatchesScreen />);
    await screen.findByText('Динамо');
    await user.press(screen.getByRole('tab', { name: 'Завершённые' }));
    expect(screen.getByText('Нет матчей в этой категории')).toBeOnTheScreen();
  });

  it('«Обновить» перезагружает данные; ошибка обновления не стирает список', async () => {
    const user = userEvent.setup();
    await render(<MatchesScreen />);
    await loaded();
    expect(screen.getByText(/^Обновлено/)).toBeOnTheScreen();

    fetchMock.mockResolvedValueOnce(fail(503));
    await user.press(screen.getByRole('button', { name: 'Обновить' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/Не удалось обновить/)).toBeOnTheScreen();
    expect(cards()).toHaveLength(8);
  });

  it('звёздочки: изначально не горят, нажатие зажигает одну, состояние переживает смену фильтра', async () => {
    const user = userEvent.setup();
    await render(<MatchesScreen />);
    await loaded();

    expect(screen.queryAllByLabelText('Убрать из избранного')).toHaveLength(0);
    expect(screen.getAllByLabelText('Добавить в избранное')).toHaveLength(8);

    await user.press(card('m1').getByLabelText('Добавить в избранное'));
    expect(screen.getAllByLabelText('Убрать из избранного')).toHaveLength(1);
    expect(card('m1').getByLabelText('Убрать из избранного')).toBeOnTheScreen();

    await user.press(screen.getByRole('tab', { name: 'Предстоящие' }));
    await user.press(screen.getByRole('tab', { name: 'Все' }));
    expect(card('m1').getByLabelText('Убрать из избранного')).toBeOnTheScreen();
    expect(screen.getAllByLabelText('Убрать из избранного')).toHaveLength(1);
  });
});
