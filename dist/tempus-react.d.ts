import { TempusCallback, TempusOptions } from 'tempus';

declare function useTempus(callback: TempusCallback, options?: TempusOptions): void;

declare function ReactTempus({ patch }: {
    patch?: boolean;
}): void;

export { ReactTempus, useTempus };
