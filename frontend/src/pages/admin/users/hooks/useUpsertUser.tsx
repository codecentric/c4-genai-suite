import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AppClient, UpsertUserDto, UserDto } from 'src/api';

export function useUpsertUser(api: AppClient, target: UserDto | null, onUpsert: (user: UserDto) => void, onClose: () => void) {
  const queryClient = useQueryClient();
  const { mutate, error, isPending } = useMutation({
    mutationFn: (request: UpsertUserDto) => {
      if (target) {
        return api.users.putUser(target.id, request);
      } else {
        return api.users.postUser(request);
      }
    },
    onSuccess: (response) => {
      void queryClient.invalidateQueries({
        queryKey: ['profile'],
      });

      onUpsert(response);
      onClose();
    },
  });
  return { mutate, error, isPending };
}
