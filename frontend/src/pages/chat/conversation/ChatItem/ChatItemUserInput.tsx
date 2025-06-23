import { memo, useRef } from 'react';
import { StreamUIRequestDto } from 'src/api';
import { Markdown } from 'src/components';
import { texts } from 'src/texts';
import { useConfirmAiAction } from '../../state';

export const ChatItemUserInput = memo(({ request }: { request: StreamUIRequestDto }) => {
  const textInputRef = useRef<HTMLInputElement>(null);
  const updateConfirm = useConfirmAiAction(request.id);

  if (updateConfirm.isSuccess) {
    return null;
  }

  return (
    <div className="my-1 flex flex-col gap-2 rounded border-[1px] border-gray-200 p-3">
      <div>
        <Markdown>{request.text}</Markdown>
      </div>

      {request.type === 'boolean' ? (
        <div className="flex gap-2">
          <button className="btn-secndary btn btn-sm" onClick={() => updateConfirm.mutate(true)}>
            {texts.common.yes}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => updateConfirm.mutate(false)}>
            {texts.common.no}
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input type="text" className="input input-sm input-bordered" ref={textInputRef} />
          <button className="btn-secndary btn btn-sm" onClick={() => updateConfirm.mutate(textInputRef.current?.value)}>
            {texts.common.confirm}
          </button>
        </div>
      )}
    </div>
  );
});
