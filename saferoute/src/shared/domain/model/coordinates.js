/**
 * Shared domain model class representing geographic coordinates.
 * @class Coordinates
 */
export class Coordinates {
    /**
     * @param {number} latitude - Latitude value.
     * @param {number} longitude - Longitude value.
     */
    constructor(latitude = 0, longitude = 0) {
        this.latitude = latitude;
        this.longitude = longitude;
    }

    /**
     * Validates that the coordinates are within valid geographic ranges.
     * @returns {boolean}
     */
    isValid() {
        return (
            typeof this.latitude === 'number' &&
            typeof this.longitude === 'number' &&
            this.latitude >= -90 && this.latitude <= 90 &&
            this.longitude >= -180 && this.longitude <= 180
        );
    }
}
