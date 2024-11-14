declare const _default: Tempus;
export default _default;
declare class Tempus {
    /**
     * @private
     */
    private framerates;
    /**
     * @private
     */
    private time;
    /**
     * @param {Function} callback
     * @param {{ priority?: number, fps?: number }} [options]
     * @returns {Function}
     */
    add(callback: Function, { priority, fps }?: {
        priority?: number;
        fps?: number;
    }): Function;
    /**
     * @private
     */
    private raf;
    patch(): void;
}
