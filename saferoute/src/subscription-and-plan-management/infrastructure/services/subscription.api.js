import { BaseEndpoint } from '../../../shared/infrastructure/services/base-endpoint';

/**
 * Servicio de infraestructura para gestionar las suscripciones y planes.
 */
export class SubscriptionApi extends BaseEndpoint {
  constructor() {
    super('/subscriptions');
  }
}
