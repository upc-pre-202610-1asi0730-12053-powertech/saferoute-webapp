import { BaseAssembler } from '../../../shared/application/transform/base.assembler';
import { Message } from '../../domain/model/message.entity';

/**
 * Ensamblador para convertir entre DTOs y la entidad Message.
 */
export class MessageAssembler extends BaseAssembler {
  toEntity(dto) {
    return new Message(dto.id, dto.title, dto.content, dto.timestamp);
  }

  toDto(entity) {
    return {
      id: entity.id,
      title: entity.title,
      content: entity.content,
      timestamp: entity.timestamp
    };
  }
}
