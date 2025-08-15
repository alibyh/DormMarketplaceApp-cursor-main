// ios/YandexAdsModuleProvider.swift
import ExpoModulesCore

public class YandexAdsModuleProvider: ModuleProvider {
  public func createModules() -> [Module] {
    return [YandexAdsModule()]
  }
}
