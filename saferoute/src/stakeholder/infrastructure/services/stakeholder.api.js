import { BaseEndpoint } from '../../../shared/infrastructure/services/base-endpoint';

/**
 * Servicio de infraestructura para gestionar perfiles de actores (padres, conductores).
 */
export class StakeholderApi extends BaseEndpoint {
  constructor() {
    super('/profiles');
  }
}
