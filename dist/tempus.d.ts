type TempusCallback = (time: number, deltaTime: number) => void;
type TempusOptions = {
    priority?: number;
    fps?: number;
};
type UID = number;

declare class Tempus {
    private framerates;
    time: number;
    constructor();
    add(callback: TempusCallback, { priority, fps }?: TempusOptions): (() => void) | undefined;
    private raf;
    patch(): void;
    unpatch(): void;
}
declare const _default: Tempus;

export { Tempus, type TempusCallback, type TempusOptions, type UID, _default as default };
