package com.yourcompany.dormmarketplace

import android.view.View
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.ModuleRegistryDelegate
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class YandexAdsPackage : expo.modules.kotlin.modules.ModulePackage() {
  override fun createModules(context: AppContext): List<Module> {
    return listOf(YandexAdsModule())
  }
}
