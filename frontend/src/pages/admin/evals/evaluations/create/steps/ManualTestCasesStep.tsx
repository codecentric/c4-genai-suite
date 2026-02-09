import { ActionIcon, Alert, Badge, Button, Card, Group, Stack, Text, Textarea } from '@mantine/core';
import { IconAlertCircle, IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import type { RunEvaluationByTestCasesTestCase } from 'src/api/generated-eval';
import { useWizardStore } from '../../state/zustand/wizardState';

export function ManualTestCasesStep() {
  const { testCases, addTestCase, removeTestCase, updateTestCase: _updateTestCase } = useWizardStore();
  const [currentInput, setCurrentInput] = useState('');
  const [currentExpectedOutput, setCurrentExpectedOutput] = useState('');
  const [currentContext, setCurrentContext] = useState('');

  const handleAddTestCase = () => {
    if (!currentInput.trim() || !currentExpectedOutput.trim()) return;

    const newTestCase: RunEvaluationByTestCasesTestCase = {
      input: currentInput.trim(),
      actualOutput: '', // Will be filled during evaluation
      expectedOutput: currentExpectedOutput.trim(),
      context: currentContext.trim() ? currentContext.trim().split('\n') : undefined,
    };

    addTestCase(newTestCase);
    setCurrentInput('');
    setCurrentExpectedOutput('');
    setCurrentContext('');
  };

  const canAddTestCase = currentInput.trim().length > 0 && currentExpectedOutput.trim().length > 0;

  return (
    <Stack gap="lg">
      <Text size="lg" fw={500}>
        Add Test Cases
      </Text>
      <Text size="sm" c="dimmed">
        Define test cases manually by providing input questions and expected outputs
      </Text>

      {testCases.length === 0 && (
        <Alert icon={<IconAlertCircle size={16} />} color="blue">
          Add at least one test case to proceed. You can add more test cases later.
        </Alert>
      )}

      {/* Add New Test Case Form */}
      <Card padding="md" withBorder>
        <Stack gap="md">
          <Text fw={600}>New Test Case</Text>

          <Textarea
            label="Question / Input"
            placeholder="Enter the question or input for the LLM"
            required
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            minRows={3}
          />

          <Textarea
            label="Expected Output"
            placeholder="Enter the expected answer or output"
            required
            value={currentExpectedOutput}
            onChange={(e) => setCurrentExpectedOutput(e.target.value)}
            minRows={3}
          />

          <Textarea
            label="Context (Optional)"
            description="Additional context or background information (one per line)"
            placeholder="Enter context lines..."
            value={currentContext}
            onChange={(e) => setCurrentContext(e.target.value)}
            minRows={2}
          />

          <Group justify="flex-end">
            <Button leftSection={<IconPlus size={16} />} onClick={handleAddTestCase} disabled={!canAddTestCase}>
              Add Test Case
            </Button>
          </Group>
        </Stack>
      </Card>

      {/* Existing Test Cases */}
      {testCases.length > 0 && (
        <Stack gap="sm">
          <Group justify="space-between">
            <Text fw={600}>Test Cases ({testCases.length})</Text>
            <Badge variant="light" color="blue">
              {testCases.length} test case{testCases.length !== 1 ? 's' : ''}
            </Badge>
          </Group>

          {testCases.map((testCase, index) => (
            <Card key={index} padding="md" withBorder>
              <Group justify="space-between" align="flex-start">
                <Stack gap="xs" className="flex-1">
                  <Group gap="xs">
                    <Badge size="sm" variant="outline">
                      #{index + 1}
                    </Badge>
                    <Text fw={600} size="sm">
                      Question:
                    </Text>
                  </Group>
                  <Text size="sm" className="whitespace-pre-wrap">
                    {testCase.input}
                  </Text>

                  <Text fw={600} size="sm" mt="xs">
                    Expected Output:
                  </Text>
                  <Text size="sm" className="whitespace-pre-wrap">
                    {testCase.expectedOutput}
                  </Text>

                  {testCase.context && testCase.context.length > 0 && (
                    <>
                      <Text fw={600} size="sm" mt="xs">
                        Context:
                      </Text>
                      <Stack gap="xs">
                        {testCase.context.map((ctx, ctxIndex) => (
                          <Text key={ctxIndex} size="sm" c="dimmed">
                            • {ctx}
                          </Text>
                        ))}
                      </Stack>
                    </>
                  )}
                </Stack>

                <ActionIcon color="red" variant="subtle" onClick={() => removeTestCase(index)} title="Remove test case">
                  <IconTrash size={18} />
                </ActionIcon>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
