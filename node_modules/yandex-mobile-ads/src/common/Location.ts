/**
 * This class represents a geographical location defined by latitude and longitude.
 */
class Location {
    readonly _latitude: number;
    readonly _longitude: number;

    /**
     * Constructs an instance of the user's location with the provided latitude and longitude.
     *
     * @param latitude The latitude of the location.
     * @param longitude The longitude of the location.
     */
    constructor(latitude: number, longitude: number) {
        this._latitude = latitude;
        this._longitude = longitude;
    }
}

export default Location;
