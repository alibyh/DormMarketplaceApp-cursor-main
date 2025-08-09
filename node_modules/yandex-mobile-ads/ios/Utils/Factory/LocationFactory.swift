import Foundation
import CoreLocation
import React

class LocationFactory {
    func createFromDictionary(_ dict: [String: Any]?) -> CLLocation? {
        guard let dict,
              let latitude = dict[Constants.Key.latitude],
              let longitude = dict[Constants.Key.longitude]
        else {
            return nil
        }
        let latitudeDegrees = RCTConvert.clLocationDegrees(latitude)
        let longitudeDegrees = RCTConvert.clLocationDegrees(longitude)
        return CLLocation(
            coordinate: CLLocationCoordinate2D(
                latitude: latitudeDegrees,
                longitude: longitudeDegrees
            ),
            altitude: 0,
            horizontalAccuracy: 0.1,
            verticalAccuracy: 0.1,
            timestamp: .now
        )
    }
}
