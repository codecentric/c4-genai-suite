import { NotFoundException } from '@nestjs/common';
import { AuditLogService } from 'src/domain/audit-log';
import { AuditLogEntity } from 'src/domain/database';
import { Extension, ExtensionStringArgument } from 'src/domain/extensions';
import { ConfigurationRepository, ExtensionEntity, ExtensionRepository } from '../../database';
import { ExplorerService } from '../services';
import { DeleteExtension, DeleteExtensionHandler } from './delete-extension';

const mockPerformedBy = { id: 'test-user', name: 'Test User' };

/** An extension spec that has one plain string and one password field. */
function makeExtensionWithPassword(): Extension {
  return {
    spec: {
      name: 'test-ext',
      title: 'Test Extension',
      description: '',
      type: 'llm',
      arguments: {
        apiKey: {
          type: 'string',
          format: 'password',
          required: true,
        } as ExtensionStringArgument,
        model: {
          type: 'string',
          required: true,
        } as ExtensionStringArgument,
      },
    },
    getMiddlewares: () => Promise.resolve([]),
  } as unknown as Extension;
}

function makeExtensionEntity(overrides: Partial<ExtensionEntity> = {}): ExtensionEntity {
  return {
    id: 7,
    externalId: '7',
    name: 'test-ext',
    enabled: true,
    configurationId: 1,
    values: { apiKey: 'super-secret', model: 'gpt-4' },
    configurableArguments: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ExtensionEntity;
}

describe(DeleteExtension.name, () => {
  let handler: DeleteExtensionHandler;
  let extensionRepository: ExtensionRepository;
  let configurationRepository: ConfigurationRepository;
  let explorer: ExplorerService;
  let auditLogService: AuditLogService;

  beforeEach(() => {
    explorer = { getExtension: jest.fn() } as unknown as ExplorerService;
    extensionRepository = {
      findOneBy: jest.fn(),
      delete: jest.fn(),
    } as unknown as ExtensionRepository;
    configurationRepository = {
      findOneBy: jest.fn().mockResolvedValue({ id: 1, name: 'My Config' }),
    } as unknown as ConfigurationRepository;
    auditLogService = {
      createAuditLog: jest.fn().mockResolvedValue({} as AuditLogEntity),
    } as unknown as AuditLogService;

    handler = new DeleteExtensionHandler(extensionRepository, configurationRepository, explorer, auditLogService);
  });

  it('should throw NotFoundException when extension does not exist', async () => {
    jest.spyOn(extensionRepository, 'findOneBy').mockResolvedValue(null);
    jest.spyOn(extensionRepository, 'delete').mockResolvedValue({ affected: 0, raw: [] });

    await expect(handler.execute(new DeleteExtension(99, mockPerformedBy))).rejects.toThrow(NotFoundException);
  });

  describe('audit log snapshot masking', () => {
    it('masks password-type argument values in the delete snapshot', async () => {
      jest.spyOn(extensionRepository, 'findOneBy').mockResolvedValue(makeExtensionEntity());
      jest.spyOn(extensionRepository, 'delete').mockResolvedValue({ affected: 1, raw: [] });
      jest.spyOn(explorer, 'getExtension').mockReturnValue(makeExtensionWithPassword());

      await handler.execute(new DeleteExtension(7, mockPerformedBy));

      // Access the captured call argument via the typed mock to inspect snapshot values.
      // snapshot is Record<string, any> per CreateAuditLogParams — cast to known shape.
      const params = jest.mocked(auditLogService.createAuditLog).mock.calls[0][0];
      const values = params.snapshot['values'] as Record<string, string>;

      // Password field must be masked; non-password field must remain unchanged.
      expect(values['apiKey']).toBe('********************');
      expect(values['model']).toBe('gpt-4');
    });

    it('does not persist the raw credential in the audit log snapshot on delete', async () => {
      jest.spyOn(extensionRepository, 'findOneBy').mockResolvedValue(makeExtensionEntity());
      jest.spyOn(extensionRepository, 'delete').mockResolvedValue({ affected: 1, raw: [] });
      jest.spyOn(explorer, 'getExtension').mockReturnValue(makeExtensionWithPassword());

      await handler.execute(new DeleteExtension(7, mockPerformedBy));

      // Raw secret must never appear under the stored values — confirmed by
      // checking that the masked value is stored instead (see sibling test).
      const params = jest.mocked(auditLogService.createAuditLog).mock.calls[0][0];
      const values = params.snapshot['values'] as Record<string, string>;

      expect(values['apiKey']).not.toBe('super-secret');
    });

    it('records the correct action and entityId in the audit log', async () => {
      jest.spyOn(extensionRepository, 'findOneBy').mockResolvedValue(makeExtensionEntity());
      jest.spyOn(extensionRepository, 'delete').mockResolvedValue({ affected: 1, raw: [] });
      jest.spyOn(explorer, 'getExtension').mockReturnValue(makeExtensionWithPassword());

      await handler.execute(new DeleteExtension(7, mockPerformedBy));

      expect(auditLogService.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'extension',
          entityId: '7',
          action: 'delete',
          userId: mockPerformedBy.id,
          userName: mockPerformedBy.name,
        }),
      );
    });
  });
});
