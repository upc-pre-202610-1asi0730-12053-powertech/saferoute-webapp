import { BaseAssembler } from '../../../shared/application/transform/base.assembler';
import { Profile } from '../../domain/model/profile.entity';

/**
 * Ensamblador para convertir entre DTOs y la entidad Profile.
 */
export class ProfileAssembler extends BaseAssembler {
  toEntity(dto) {
    return new Profile(dto.id, dto.firstName, dto.lastName, dto.phone);
  }

  toDto(entity) {
    return {
      id: entity.id,
      firstName: entity.firstName,
      lastName: entity.lastName,
      phone: entity.phone
    };
  }
}
