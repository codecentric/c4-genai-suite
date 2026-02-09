import { Button, TextInput } from '@mantine/core';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GetAllEvaluationResult } from 'src/api/generated-eval';
import { Page } from 'src/components';
import { useDebounce } from 'src/hooks/utils';
import { texts } from 'src/texts';
import { EvaluationsTable } from './components/EvaluationsTable';
import { useEvaluations } from './hooks/useEvaluationQueries';

export function EvaluationsPage() {
  const navigate = useNavigate();
  const [page, _setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: evaluations = [], isFetching, isFetched } = useEvaluations(page, 20, debouncedSearch || undefined);

  const handleRowClick = (evaluation: GetAllEvaluationResult) => {
    void navigate(`/admin/evals/evaluations/${evaluation.id}`);
  };

  const handleCreateClick = () => {
    void navigate('/admin/evals/evaluations/new');
  };

  return (
    <Page>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-3xl">{texts.evals.evaluations.title}</h2>

        <div className="flex gap-4">
          <Button leftSection={<IconPlus />} onClick={handleCreateClick}>
            {texts.evals.evaluations.create}
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <TextInput
          placeholder={texts.evals.evaluations.searchPlaceholder}
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <EvaluationsTable evaluations={evaluations} isFetching={isFetching} isFetched={isFetched} onRowClick={handleRowClick} />
        </div>
      </div>
    </Page>
  );
}
