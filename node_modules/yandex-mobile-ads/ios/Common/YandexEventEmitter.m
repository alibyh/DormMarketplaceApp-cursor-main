#if !TARGET_OS_MACCATALYST

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_REMAP_MODULE(YandexEventEmitter, EventEmitter, NSObject)

@end

#endif
