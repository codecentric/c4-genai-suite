import { create } from 'zustand';
import { UserDto } from 'src/api';

type UsersState = {
  // The users.
  users: UserDto[];
};

type UsersActions = {
  // Adds or sets an user.
  setUser: (user: UserDto) => void;

  // Remove an user.
  removeUser: (id: string) => void;

  // Sets all users.
  setUsers: (users: UserDto[]) => void;
};

const useUsersStore_ = create<UsersState & UsersActions>()((set) => ({
  users: [],
  setUser: (user: UserDto) => {
    return set((state) => {
      const users = [...state.users];

      const indexOfExisting = users.findIndex((x) => x.id === user.id);

      if (indexOfExisting >= 0) {
        users[indexOfExisting] = user;
      } else {
        users.push(user);
      }

      return { users };
    });
  },
  setUsers: (users: UserDto[]) => {
    return set({ users });
  },
  removeUser: (id: string) => {
    return set((state) => ({ users: state.users.filter((x) => x.id !== id) }));
  },
}));

/**
 * @deprecated Using Zustand hooks directly in ui-components is deprecated. Use
 * other hooks to wrap the Zustand hook instead. We want hooks to have
 * interfaces that fit our domains terminology. E.g. useAIConversation exports
 * a function called sendMessage, which will talk to the LLM and update the
 * messages internally. No separate call to a Zustand hook has to be made in
 * order to update messages after using sendMessage. An ideal version of the
 * useAIConversation hook exports only actions like sendMessage and states like
 * messages, but no setters.
 **/
export const useUsersStore = useUsersStore_;
