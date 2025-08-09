/**
 * Interface representing an error occurring during an ad request.
 */
export interface AdError {
    /**
     * A detailed description of the error.
     */
    description: string;
    /**
     * A code associated with the error.
     */
    code?: string;
    /**
     * An adUnitId sent in the request when the error occurred.
     */
    adUnitId?: string;
}

/**
 * Interface representing impression data of the ad.
 */
export interface ImpressionData {
    /**
     * Raw data of the impression.
     */
    rawData: string;
}

/**
 * Interface representing a reward given to the user.
 */
export interface Reward {
    /**
     * Type of the reward.
     */
    type: string;

    /**
     * Amount rewarded to the user.
     */
    amount: Number;
}

export interface AdEvent {
    adId: string;
    loaderId: string;
    impressionData?: ImpressionData;
    reward?: Reward;
    error?: AdError;
}
