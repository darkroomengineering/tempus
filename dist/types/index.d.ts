declare const _default: Tempus;
export default _default;
declare class Tempus {
    callbacks: any[];
    now: number;
    add(callback: any, priority?: number): () => void;
    remove(callback: any): void;
    raf: (now: any) => void;
}
