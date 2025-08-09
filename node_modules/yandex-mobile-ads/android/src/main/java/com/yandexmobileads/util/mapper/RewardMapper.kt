package com.yandexmobileads.util.mapper

import com.yandex.mobile.ads.rewarded.Reward

class RewardMapper {
    fun map(reward: Reward): Map<String, Any> = mapOf(
        KEY_TYPE to reward.type,
        KEY_AMOUNT to reward.amount
    )

    companion object {
        private const val KEY_TYPE = "type"
        private const val KEY_AMOUNT = "amount"
    }
}
