import { BaseEndpoint } from '../../../shared/infrastructure/services/base-endpoint';

/**
 * Servicio de infraestructura para gestionar el estado de los viajes.
 */
export class TripApi extends BaseEndpoint {
  constructor() {
    super('/trips');
  }

  /**
   * Iniciar un nuevo viaje.
   */
  async startTrip(tripData) {
    return await this.create(tripData);
  }
}
