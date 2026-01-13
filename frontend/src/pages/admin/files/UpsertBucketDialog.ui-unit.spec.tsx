import { useForm } from '@mantine/form';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UpsertBucketDto } from 'src/api';
import { render } from 'src/pages/admin/test-utils';
import { FileSizeDynamicFields } from './UpsertBucketDialog';

describe('FileSizeDynamicFields component', () => {
  it('should add a new field when clicking the add button', () => {
    const { result } = renderHook(() =>
      useForm<UpsertBucketDto>({
        initialValues: {
          name: '',
          endpoint: '',
          indexName: '',
          headers: '',
          isDefault: false,
          perUserQuota: 20,
          allowedFileNameExtensions: [],
          fileSizeLimits: { general: 1, pdf: 10, pptx: 10 },
        },
      }),
    );

    const form = result.current;
    render(<FileSizeDynamicFields form={form} name="fileSizeLimits" label="File Size Limit" suffix="MB" />);

    const addButton = screen.getByTestId('fileSizeLimitsDynamic.add');
    fireEvent.click(addButton);

    // Find the newly added key input field (it's the last one)
    const keyInputs = screen.getAllByPlaceholderText('pdf');
    const newKeyInput = keyInputs[keyInputs.length - 1];
    fireEvent.change(newKeyInput, { target: { value: 'xlsx' } });

    // Find the newly added value input field (it's the last one)
    const valueInputs = screen.getAllByPlaceholderText('10');
    const newValueInput = valueInputs[valueInputs.length - 1];
    fireEvent.change(newValueInput, { target: { value: '13' } });

    const formValues = form.getValues();
    expect(formValues.fileSizeLimits).toBeDefined();
    expect(formValues.fileSizeLimits.xlsx).toBe(13);
  });

  it('should remove a field when clicking the remove button', () => {
    const { result } = renderHook(() =>
      useForm<UpsertBucketDto>({
        initialValues: {
          name: '',
          endpoint: '',
          indexName: '',
          headers: '',
          isDefault: false,
          perUserQuota: 20,
          allowedFileNameExtensions: [],
          fileSizeLimits: { general: 1, pdf: 10, pptx: 10 },
        },
      }),
    );

    const form = result.current;
    render(<FileSizeDynamicFields form={form} name="fileSizeLimits" label="File Size Limit" suffix="MB" />);

    const rows = screen.getAllByTestId(/fileSizeLimitsDynamic\.\d+\.row/);
    const rowToRemove = rows.find((row) => {
      const keyInput = within(row).getByTestId(/fileSizeLimitsDynamic\.\d+\.key/);
      return (keyInput as HTMLInputElement).value === 'pptx';
    });

    const removeButton = within(rowToRemove!).getByTestId(/fileSizeLimitsDynamic\.\d+\.remove/);
    fireEvent.click(removeButton);

    const formValues = form.getValues();
    expect(formValues.fileSizeLimits.pptx).toBeUndefined();
  });
});
