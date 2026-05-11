#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(ContactSaver, NSObject)

RCT_EXTERN_METHOD(saveContact:(NSDictionary *)payload
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
