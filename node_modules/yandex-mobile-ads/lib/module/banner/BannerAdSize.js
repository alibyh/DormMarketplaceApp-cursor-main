import { isSupportedPlatform } from '../util';
import YandexMobileAdsModule from '../YandexMobileAdsModule';

/**
 * This class is responsible for the banner size.
 */
class BannerAdSize {
  /**
   * @readonly Initial width of the banner.
   */

  /**
   * @readonly Initial height of the banner.
   */

  /**
   * @readonly Calculated banner width in density independent pixels.
   */

  /**
   * @readonly Calculated banner height in density independent pixels.
   */

  /**
   * @readonly Calculated banner width in pixels.
   */

  /**
   * @readonly Calculated banner height in pixels.
   */

  /**
   * @readonly Banner type (inline, sticky).
   */

  constructor(initialWidth, initialHeight, width, height, widthInPixels, heightInPixels, type) {
    this.initialWidth = initialWidth;
    this.initialHeight = initialHeight;
    this.width = width;
    this.height = height;
    this.widthInPixels = widthInPixels;
    this.heightInPixels = heightInPixels;
    this.type = type;
  }

  /**
   * Creates an object of the BannerAdSize class with the specified maximum width of a sticky banner.
   *
   * @param {number} width Maximum width available for a banner.
   *
   * @returns {Promise<BannerAdSize>} A promise that either resolves to BannerAdSize or rejects with an error.
   */
  static async stickySize(width) {
    try {
      isSupportedPlatform();
      let nativeAdSize = await YandexMobileAdsModule.YandexBannerAdSizeModule.createStickyBannerSize(width);
      return Promise.resolve(new BannerAdSize(nativeAdSize.initialWidth, nativeAdSize.initialHeight, nativeAdSize.width, nativeAdSize.height, nativeAdSize.widthInPixels, nativeAdSize.heightInPixels, nativeAdSize.type));
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Creates an object of the BannerAdSize class with the specified maximum height and width of the banner.
   *
   * @param {number} width Width of the banner.
   * @param {number} maxHeight Maximum height available for an adaptive banner.
   *
   * @returns {Promise<BannerAdSize>} A promise that either resolves to BannerAdSize or rejects with an error.
   */
  static async inlineSize(width, maxHeight) {
    try {
      isSupportedPlatform();
      let nativeAdSize = await YandexMobileAdsModule.YandexBannerAdSizeModule.createInlineBannerSize(width, maxHeight);
      return Promise.resolve(new BannerAdSize(nativeAdSize.initialWidth, nativeAdSize.initialHeight, nativeAdSize.width, nativeAdSize.height, nativeAdSize.widthInPixels, nativeAdSize.heightInPixels, nativeAdSize.type));
    } catch (error) {
      return Promise.reject(error);
    }
  }
}
export default BannerAdSize;
//# sourceMappingURL=BannerAdSize.js.map