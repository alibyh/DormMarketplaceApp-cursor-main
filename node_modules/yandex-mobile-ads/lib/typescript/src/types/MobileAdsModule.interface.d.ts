export interface MobileAdsModuleInterface {
    readonly pluginVersion: string;
    /**
     * Retrieves the SDK version in the X.Y.Z format.
     *
     * @returns {Promise<string>} A promise that resolves to a version of the SDK.
     */
    getLibraryVersion(): Promise<String>;
    /**
     * Initializes the Yandex Mobile Ads SDK internal state.
     */
    initialize(): Promise<void>;
    /**
     * Launches SDK debug panel.
     */
    showDebugPanel(): Promise<void>;
    /**
     * Enables logging. By default, logging is disabled.
     *
     * @param {Boolean} enableLogging If set to true, logs will be enabled, otherwise disabled.
     */
    enableLogging(enableLogging: any): void;
    /**
     * Enable or disable visibility error indicator in Debug Mode. Indicator is enabled by default.
     *
     * @param {Boolean} enableIndicator If set to true, visibility error indicator will be displayed, otherwise not.
     */
    enableDebugErrorIndicator(enableIndicator: any): void;
    /**
     * Enables location usage for ad loading. Disabled by default Location permission is still required to be granted additionally to the consent.
     *
     * @param {Boolean} locationConsent true if user provide consent to use location for ads loading, otherwise false.
     */
    setLocationConsent(locationConsent: any): void;
    /**
     * Set a value indicating whether user is a child or undefined age. If the value is set to true personal data will not be collected.
     *
     * @param {Boolean} ageRestrictedUser true if user falls under COPPA restrictions, otherwise false.
     */
    setAgeRestrictedUser(ageRestrictedUser: any): void;
    /**
     * Set a value indicating whether user from GDPR region allowed to collect personal data which is used for analytics and ad targeting. If the value is set to false personal data will not be collected.
     *
     * @param {Boolean} userConsent true if user provided consent to collect personal data, otherwise false.
     */
    setUserConsent(userConsent: any): void;
}
//# sourceMappingURL=MobileAdsModule.interface.d.ts.map