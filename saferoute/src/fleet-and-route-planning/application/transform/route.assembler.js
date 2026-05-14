import { BaseAssembler } from '../../../shared/application/transform/base.assembler';
import { Route } from '../../domain/model/route.entity';

/**
 * Ensamblador para convertir entre DTOs y la entidad Route.
 */
export class RouteAssembler extends BaseAssembler {
  toEntity(dto) {
    return new Route(dto.id, dto.name, dto.origin, dto.destination);
  }

  toDto(entity) {
    return {
      id: entity.id,
      name: entity.name,
      origin: entity.origin,
      destination: entity.destination
    };
  }
}
