import { BaseEndpoint } from '../../../shared/infrastructure/services/base-endpoint';

/**
 * Servicio de infraestructura para gestionar rutas escolares.
 */
export class RouteApi extends BaseEndpoint {
  constructor() {
    super('/routes');
  }
}
