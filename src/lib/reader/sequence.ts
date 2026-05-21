/**
 * Контроллер последовательностей (Sequence Controller) - Ядро читалки.
 * Помогает избежать состояния гонки (race conditions) при быстрых действиях пользователя,
 * например, быстром перелистывании страниц.
 */

export enum ReaderAction {
  RENDER_START = 'RENDER_START',
  CLEAR = 'CLEAR',
  LOAD_FILE = 'LOAD_FILE',
  RENDER_PAGE = 'RENDER_PAGE',
  RENDER_END = 'RENDER_END',
  UPDATE_PROGRESS = 'UPDATE_PROGRESS',
}

export interface Sequence {
  before: ReaderAction[];
  actions: ReaderAction[];
  finally: ReaderAction[];
}

export const SEQUENCES = {
  HORIZONTAL_PAGINATION: {
    before: [ReaderAction.RENDER_START],
    actions: [
      ReaderAction.CLEAR,
      ReaderAction.LOAD_FILE,
      ReaderAction.RENDER_PAGE,
      ReaderAction.UPDATE_PROGRESS,
    ],
    finally: [ReaderAction.RENDER_END],
  } as Sequence,
};

export class SequenceController {
  private queue: Promise<void> = Promise.resolve();

  /**
   * Выполняет определенную последовательность действий.
   * Если предыдущая последовательность еще выполняется, новая ждет своей очереди.
   */
  public enqueue(sequence: Sequence, actionHandlers: Record<ReaderAction, () => Promise<void> | void>) {
    this.queue = this.queue.then(async () => {
      try {
        // Фаза Before
        for (const action of sequence.before) {
          if (actionHandlers[action]) await actionHandlers[action]();
        }
        // Фаза Actions
        for (const action of sequence.actions) {
          if (actionHandlers[action]) await actionHandlers[action]();
        }
      } catch (error) {
        console.error('Ошибка выполнения последовательности читалки:', error);
      } finally {
        // Фаза Finally
        for (const action of sequence.finally) {
          if (actionHandlers[action]) await actionHandlers[action]();
        }
      }
    });

    return this.queue;
  }
}
