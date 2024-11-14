declare const _default: Tempus;
export default _default;
declare class Tempus {
    framerates: {};
    now: number;
    add(callback: any, { priority, fps }?: {
        priority?: number;
        fps?: number;
    }): any;
    remove(uid: any, { fps }?: {
        fps?: number;
    }): void;
    raf: (now: any) => void;
    patch(): void;
}
