import { BaseEndpoint } from '../../../shared/infrastructure/services/base-endpoint';

/**
 * Servicio de infraestructura para gestionar notificaciones y alertas.
 */
export class NotificationApi extends BaseEndpoint {
  constructor() {
    super('/notifications');
  }

  /**
   * Enviar una nueva alerta.
   */
  async sendAlert(alertData) {
    return await this.create(alertData);
  }
}
