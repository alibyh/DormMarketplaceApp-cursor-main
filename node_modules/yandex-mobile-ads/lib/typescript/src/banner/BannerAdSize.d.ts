/**
 * This class is responsible for the banner size.
 */
declare class BannerAdSize {
    /**
     * @readonly Initial width of the banner.
     */
    readonly initialWidth: number;
    /**
     * @readonly Initial height of the banner.
     */
    readonly initialHeight: number;
    /**
     * @readonly Calculated banner width in density independent pixels.
     */
    readonly width: number;
    /**
     * @readonly Calculated banner height in density independent pixels.
     */
    readonly height: number;
    /**
     * @readonly Calculated banner width in pixels.
     */
    readonly widthInPixels: number;
    /**
     * @readonly Calculated banner height in pixels.
     */
    readonly heightInPixels: number;
    /**
     * @readonly Banner type (inline, sticky).
     */
    readonly type: string;
    private constructor();
    /**
     * Creates an object of the BannerAdSize class with the specified maximum width of a sticky banner.
     *
     * @param {number} width Maximum width available for a banner.
     *
     * @returns {Promise<BannerAdSize>} A promise that either resolves to BannerAdSize or rejects with an error.
     */
    static stickySize(width: number): Promise<BannerAdSize>;
    /**
     * Creates an object of the BannerAdSize class with the specified maximum height and width of the banner.
     *
     * @param {number} width Width of the banner.
     * @param {number} maxHeight Maximum height available for an adaptive banner.
     *
     * @returns {Promise<BannerAdSize>} A promise that either resolves to BannerAdSize or rejects with an error.
     */
    static inlineSize(width: number, maxHeight: number): Promise<BannerAdSize>;
}
export default BannerAdSize;
//# sourceMappingURL=BannerAdSize.d.ts.map