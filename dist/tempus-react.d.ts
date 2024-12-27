import { TempusCallback, TempusOptions } from 'tempus';

declare function useTempus(callback: TempusCallback, options?: TempusOptions): void;
declare namespace useTempus {
    var patch: () => void;
}

export { useTempus };
