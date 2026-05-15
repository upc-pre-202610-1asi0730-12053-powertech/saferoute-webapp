/**
 * Incident class within the Trip bounded context.
 *
 * Defined in trip.domain.model (vue-saferoute-trip.puml).
 *
 * @class Incident
 */
export class Incident {
    /**
     * @param {Object} params
     * @param {?string} [params.id=null]
     * @param {?string} [params.tripId=null]
     * @param {string} [params.description='']
     * @param {string} [params.reportedAt='']
     *
     * Backward-compat fields from db.json:
     * @param {?string} [params.routeId=null]
     * @param {string} [params.routeName='']
     * @param {string} [params.type='']
     * @param {string} [params.severity='']
     * @param {string} [params.reportedBy='']
     * @param {string} [params.timestamp='']
     * @param {string} [params.status='']
     * @param {?string} [params.organizationId=null]
     */
    constructor({
        id = null, tripId = null, description = '', reportedAt = '',
        routeId = null, routeName = '', type = '', severity = '',
        reportedBy = '', timestamp = '', status = '', organizationId = null,
    }) {
        this.id = id;
        this.tripId = tripId;
        this.description = description;
        this.reportedAt = reportedAt || timestamp;
        this.routeId = routeId;
        this.routeName = routeName;
        this.type = type;
        this.severity = severity;
        this.reportedBy = reportedBy;
        this.timestamp = timestamp || reportedAt;
        this.status = status;
        this.organizationId = organizationId;
    }
}
