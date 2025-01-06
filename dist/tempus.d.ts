type TempusCallback = (time: number, deltaTime: number) => void;
type TempusOptions = {
    priority?: number;
    fps?: number;
};
type UID = number;

declare class TempusImpl {
    private framerates;
    time: number;
    constructor();
    add(callback: TempusCallback, { priority, fps }?: TempusOptions): (() => void) | undefined;
    private raf;
    patch(): void;
    unpatch(): void;
}
declare const Tempus: TempusImpl;

export { type TempusCallback, type TempusOptions, type UID, Tempus as default };
