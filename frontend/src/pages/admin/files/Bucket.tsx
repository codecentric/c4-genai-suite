import { ActionIcon, Menu } from '@mantine/core';
import { IconDots, IconEdit, IconTrash } from '@tabler/icons-react';
import { memo } from 'react';
import { BucketDto, BucketDtoTypeEnum } from 'src/api';
import { ConfirmDialog, TransientNavLink } from 'src/components';
import { texts } from 'src/texts';

interface BucketProps {
  bucket: BucketDto;
  onDelete: (bucket: BucketDto) => void;
  onUpdate: (bucket: BucketDto) => void;
}

export const Bucket = memo(({ bucket, onDelete, onUpdate }: BucketProps) => {
  return (
    <li className="group flex items-center rounded-lg px-2 py-1 hover:bg-gray-100 focus:font-semibold">
      <TransientNavLink to={`/admin/files/${bucket.id}`} className="text-normal block min-w-0 grow truncate text-ellipsis">
        {/*{bucket.isDefault && <div className="badge badge-primary mr-2 truncate font-normal">{texts.common.userBucketBadge}</div>}*/}

        {bucket.type === BucketDtoTypeEnum.User && (
          <div className="badge badge-primary mr-2 truncate font-normal">{texts.common.userBucketBadge}</div>
        )}
        {bucket.type === BucketDtoTypeEnum.Conversation && (
          <div className="badge badge-primary mr-2 truncate font-normal">Chat</div>
        )}
        {bucket.name}
      </TransientNavLink>

      <Menu>
        <Menu.Target>
          <ActionIcon className="opacity-0 group-hover:opacity-100" variant="subtle" data-testid={'more-actions'}>
            <IconDots size={16} />
          </ActionIcon>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => onUpdate(bucket)}>
            {texts.common.edit}
          </Menu.Item>
          <ConfirmDialog
            title={texts.files.removeBucketConfirmTitle}
            text={texts.files.removeBucketConfirmText}
            onPerform={() => onDelete(bucket)}
          >
            {({ onClick }) => (
              <Menu.Item onClick={onClick} color="red" leftSection={<IconTrash size={14} />}>
                {texts.common.remove}
              </Menu.Item>
            )}
          </ConfirmDialog>
        </Menu.Dropdown>
      </Menu>
    </li>
  );
});
