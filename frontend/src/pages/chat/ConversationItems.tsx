import { addDays, addMonths, format, isSameDay, startOfDay, startOfMonth } from 'date-fns';
import { ConversationDto } from 'src/api';
import { texts } from 'src/texts';
import { ConversationItem } from './ConversationItem';
import { useStateOfChats } from './state/listOfChats';

type ConversationGroup = { date: string; entries: ConversationDto[] };

function groupConversations(chats: ConversationDto[]): ConversationGroup[] {
  if (chats.length === 0) {
    return [];
  }

  chats = [...chats].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  const now = new Date();
  const withinWeek = startOfDay(addDays(now, -7));
  const withinMonth = startOfDay(addDays(now, -30));
  const withinMonths = startOfMonth(addMonths(now, -3));

  const conversationGroups = Array.from(
    chats
      .reduce((prev, curr) => {
        const date = curr.updatedAt;

        let group: { label: string; date: Date };
        if (isSameDay(now, date)) {
          group = { label: texts.chat.today, date: now };
        } else if (date >= withinWeek) {
          group = { label: texts.chat.thisWeek, date: withinWeek };
        } else if (date >= withinMonth) {
          group = { label: texts.chat.thisMonth, date: withinMonth };
        } else if (date >= withinMonths) {
          group = { label: format(date, 'LLLL'), date: withinMonths };
        } else {
          group = { label: format(date, 'yyyy'), date: date };
        }

        const entry = prev.get(group.label) ?? { label: group.label, time: group.date.getTime(), entries: [] };
        entry.entries.push(curr);
        prev.set(group.label, entry);
        return prev;
      }, new Map<string, { label: string; time: number; entries: ConversationDto[] }>())
      .values(),
  );

  conversationGroups.sort((a, b) => b.time - a.time);
  return conversationGroups.map(({ label: date, entries }) => ({ date, entries }));
}

export function ConversationItems() {
  const chats = useStateOfChats();
  const grouped = groupConversations(chats);

  return (
    <div className="flex flex-col gap-4">
      {grouped.map((group) => (
        <div key={group.date} className="grid">
          <h4 className="pb-1 pl-2 text-xs font-light">{group.date}</h4>
          <div className="grid" role="navigation">
            {group.entries.map((chat) => (
              <ConversationItem key={chat.id} chat={chat} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
