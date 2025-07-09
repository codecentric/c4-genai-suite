import { Button } from '@mantine/core';
import { IconEdit, IconPlus, IconTrash } from '@tabler/icons-react';
import { Page } from 'src/components';
import { texts } from 'src/texts';

export function TaskCategoriesPage() {
  return (
    <Page>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-3xl">{texts.admin.taskCategories.title}</h2>
        <Button leftSection={<IconPlus />}>{texts.admin.taskCategories.newCategory}</Button>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <table className="table table-fixed text-base">
            <thead>
              <tr>
                <th>Name</th>
                <th>Beschreibung</th>
                <th>Farbe</th>
                <th className="w-24">Reihenfolge</th>
                <th className="w-24">Tasks</th>
                <th className="w-32">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="font-semibold">Entwicklung</td>
                <td className="truncate">Software-Entwicklungsaufgaben</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded border" style={{ backgroundColor: '#3b82f6' }} />
                    <span className="text-xs">#3b82f6</span>
                  </div>
                </td>
                <td>1</td>
                <td>5</td>
                <td>
                  <div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm">
                      <IconEdit size={16} />
                    </button>
                    <button className="btn btn-ghost btn-sm text-error">
                      <IconTrash size={16} />
                    </button>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="font-semibold">Design</td>
                <td className="truncate">UI/UX Design Aufgaben</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded border" style={{ backgroundColor: '#10b981' }} />
                    <span className="text-xs">#10b981</span>
                  </div>
                </td>
                <td>2</td>
                <td>3</td>
                <td>
                  <div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm">
                      <IconEdit size={16} />
                    </button>
                    <button className="btn btn-ghost btn-sm text-error">
                      <IconTrash size={16} />
                    </button>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="font-semibold">Testing</td>
                <td className="truncate">{texts.admin.taskCategories.sampleData}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded border" style={{ backgroundColor: '#f59e0b' }} />
                    <span className="text-xs">#f59e0b</span>
                  </div>
                </td>
                <td>3</td>
                <td>2</td>
                <td>
                  <div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm">
                      <IconEdit size={16} />
                    </button>
                    <button className="btn btn-ghost btn-sm text-error">
                      <IconTrash size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Page>
  );
}
