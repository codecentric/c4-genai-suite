import { Select } from '@mantine/core';
import { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Page } from 'src/components';
import { texts } from 'src/texts';
import { FilterInterval, useMessagesCount, useRatings, useUsage, useUsersCount } from './hooks';

export function DashboardPage() {
  const { t } = useTranslation();
  const [filterInterval, setFilterInterval] = useState(FilterInterval.Day);
  const statsUsage = useUsage(filterInterval);
  const statsRatings = useRatings(filterInterval);
  const messagesCount = useMessagesCount(filterInterval);
  const usersCount = useUsersCount(filterInterval);
  const version = (import.meta.env.VITE_VERSION as string) || 'No hash available';

  return (
    <Page>
      <div className="sticky top-0 z-[10] -mx-4 flex justify-between bg-gray-50 p-4">
        <h2 className="text-3xl">{texts.common.dashboard}</h2>
        <Select
          id="filter-interval"
          data={Object.values(FilterInterval).map((value) => ({ label: t(`dashboard.filterInterval.${value}`), value }))}
          value={filterInterval}
          onChange={(_, { value }) => setFilterInterval(value as FilterInterval)}
        />
      </div>
      <ChartContainer title={texts.dashboard.tokensTotalChat} data={statsUsage.items}>
        <Bar dataKey="total" fill="#003f5c" />
      </ChartContainer>

      <ChartContainer title={texts.dashboard.tokensPerModelChart} data={statsUsage.items}>
        {statsUsage.byModel.map((b) => (
          <Bar key={b.key} dataKey={b.dataKey} name={b.key} fill={b.color} />
        ))}
        <Legend />
      </ChartContainer>

      <ChartContainer title={texts.dashboard.ratings} data={statsRatings.items}>
        {statsRatings.byCategory.map((b) => (
          <Bar key={b.key} dataKey={b.dataKey} name={b.key} fill={b.color} />
        ))}

        <Legend />
      </ChartContainer>

      <ChartContainer title={texts.dashboard.requests} data={messagesCount}>
        <Bar dataKey="total" fill="#003f5c" />
      </ChartContainer>

      <ChartContainer title={texts.dashboard.users} data={usersCount}>
        <Bar dataKey="total" fill="#003f5c" />
      </ChartContainer>

      <div className="pt-6 text-gray-400 italic" data-testid={'version'}>
        Version: {version}
      </div>
    </Page>
  );
}

/* data is actually of type any in the library */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
function ChartContainer({ title, children, data }: { title: string; children: ReactNode; data: any }) {
  return (
    <div className="card bg-base-100 mb-4 shadow">
      <div className="card-body">
        <h3 className="mb-2 text-lg">{title}</h3>
        <ResponsiveContainer height={300}>
          {/*data is actually of type any in the library*/}
          {/* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */}
          <BarChart width={800} height={5400} data={data} {...{ overflow: 'visible' }}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />

            {children}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
