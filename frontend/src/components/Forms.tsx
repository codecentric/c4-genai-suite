/* eslint-disable react-refresh/only-export-components */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ActionIcon,
  Autocomplete,
  MultiSelect as MantineMultiSelect,
  Select as MantineSingleSelect,
  TagsInput,
} from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { HTMLProps, PropsWithChildren, ReactNode, useEffect, useState } from 'react';
import { Controller, ControllerFieldState, FormState, useController, useFieldArray, useFormContext } from 'react-hook-form';
import { cn, isString } from 'src/lib';
import { texts } from 'src/texts';
import { FormControlError } from './FormControlError';
import { Icon } from './Icon';
import { Markdown } from './Markdown';

type FormEditorOption<T> = {
  // The value to select.
  value?: T;

  // The label to render.
  label: string;
};

interface FormEditorProps<TDefault> {
  // The label.
  label?: string;

  // The optional class name.
  className?: string;

  // The optional placeholder.
  placeholder?: string;

  // The hints.
  hints?: ReactNode;

  // The form name.
  name: string;

  // True to hide the error.
  hideError?: boolean;

  // Indicator if the field is required.
  required?: boolean;

  // The layout.
  vertical?: boolean;

  refreshable?: boolean;

  // True if disabled.
  disabled?: boolean;

  // True, if multi selection is allowed
  multiple?: boolean;

  defaultValue?: TDefault;
}

interface RangeFormEditorProps extends FormEditorProps<number> {
  min?: number;
  max?: number;
  step?: number;
}

interface NumberFormEditorProps extends FormEditorProps<number> {
  min?: number;
  max?: number;
  step?: number;
}

interface OptionsFormEditorProps<T = any> extends FormEditorProps<string | string[] | number> {
  // The allowed selected values.
  options: FormEditorOption<T>[];
}

interface MultiSelectionFormEditorProps<T> extends FormEditorProps<string[]> {
  options: FormEditorOption<string>[];
  serialize: (value?: T) => string[];
  deserialize: (value: string[]) => T;
}

interface DynamicFormEditorProps<TDefault = any> extends FormEditorProps<TDefault> {
  suffix: string;
}

interface FormRowProps extends FormEditorProps<any>, PropsWithChildren {
  forceRefresh?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Forms {
  export const Error = ({ name }: { name: string }) => {
    const { fieldState, formState } = useController({ name });

    return (
      <FormControlError error={fieldState.error?.message} submitCount={formState.submitCount} touched={fieldState.isTouched} />
    );
  };

  export const Hints = ({ className, hints }: { className?: string; hints?: string }) => {
    return <FormDescription className={className} hints={hints} />;
  };

  export const Refreshable = ({ name, children, defaultValue, forceRefresh }: FormRowProps) => {
    const { field } = useController({ name, defaultValue });

    const [showRefresh, setShowRefresh] = useState(forceRefresh);

    useEffect(() => {
      if (forceRefresh || defaultValue == null) {
        return;
      }

      setShowRefresh(field.value !== defaultValue);
    }, [forceRefresh, field.value, defaultValue]);

    return (
      <>
        {showRefresh && (
          <div className={`flex items-center justify-between gap-2`}>
            {children}
            <ActionIcon size="lg" onClick={() => field.onChange(defaultValue ?? '')}>
              <IconRefresh size={20} />
            </ActionIcon>
          </div>
        )}
        {!showRefresh && children}
      </>
    );
  };

  export const Row = ({
    refreshable,
    defaultValue,
    children,
    className,
    hideError,
    hints,
    name,
    label,
    required,
    vertical,
  }: FormRowProps) => {
    return vertical ? (
      <div className={cn('form-row flex flex-col', className)}>
        {label && (
          <label className="mb-1 text-sm font-semibold" htmlFor={name}>
            {label}

            {label && required && (
              <span
                className="text-error px-1 font-bold"
                data-tooltip-id="default"
                data-tooltip-content={texts.common.required}
                data-tooltip-delay-show={1000}
              >
                *
              </span>
            )}
          </label>
        )}

        {!hideError && <Forms.Error name={name} />}

        <Refreshable name={name} defaultValue={defaultValue} forceRefresh={refreshable}>
          {children}
        </Refreshable>

        <FormDescription hints={hints} />
      </div>
    ) : (
      <div className={cn('form-row flex flex-row', className)}>
        <label className="mt-3 w-48 shrink-0 text-sm font-semibold" htmlFor={name}>
          {label}

          {label && required && (
            <span
              className="text-error px-1 font-bold"
              data-tooltip-id="default"
              data-tooltip-content={texts.common.required}
              data-tooltip-delay-show={1000}
            >
              *
            </span>
          )}
        </label>

        <div className="min-w-0 grow">
          {!hideError && <Forms.Error name={name} />}

          <Refreshable name={name} defaultValue={defaultValue} forceRefresh={refreshable}>
            {children}
          </Refreshable>

          <FormDescription hints={hints} />
        </div>
      </div>
    );
  };

  export const Text = ({ className, placeholder, vertical, ...other }: FormEditorProps<string> & HTMLProps<HTMLInputElement>) => {
    return (
      <Forms.Row className={className} vertical {...other}>
        <InputText type="text" placeholder={placeholder} {...other} />
      </Forms.Row>
    );
  };

  export const Url = ({ className, placeholder, ...other }: FormEditorProps<string> & HTMLProps<HTMLInputElement>) => {
    return (
      <Forms.Row className={className} {...other}>
        <InputText type="url" placeholder={placeholder} {...other} />
      </Forms.Row>
    );
  };

  export const Color = ({ className, ...other }: FormEditorProps<string>) => {
    return (
      <Forms.Row className={className} {...other}>
        <InputText type="color" {...other} className="!w-[4rem] px-1" />
      </Forms.Row>
    );
  };

  export const Textarea = ({
    className,
    placeholder,
    vertical,
    ...other
  }: FormEditorProps<string> & HTMLProps<HTMLInputElement>) => {
    return (
      <Forms.Row className={className} vertical {...other}>
        <InputTextarea placeholder={placeholder} {...other} />
      </Forms.Row>
    );
  };

  export const Number = ({ className, max, min, placeholder, defaultValue, ...other }: NumberFormEditorProps) => {
    return (
      <Forms.Row className={className} {...other}>
        <InputText
          type="number"
          placeholder={placeholder}
          max={max}
          min={min}
          defaultValue={defaultValue != null ? String(defaultValue) : undefined}
          {...other}
        />
      </Forms.Row>
    );
  };

  export const Range = ({ className, max, min, ...other }: RangeFormEditorProps) => {
    return (
      <Forms.Row className={className} {...other}>
        <InputRange max={max} min={min} {...other} />
      </Forms.Row>
    );
  };

  export const Date = ({ className, ...other }: FormEditorProps<string>) => {
    return (
      <Forms.Row className={className} {...other}>
        <InputText type="date" {...other} />
      </Forms.Row>
    );
  };

  export const Password = ({ className, placeholder, vertical, ...other }: FormEditorProps<string>) => {
    return (
      <Forms.Row className={className} vertical {...other}>
        <InputText type="password" placeholder={placeholder} {...other} />
      </Forms.Row>
    );
  };

  export const Boolean = ({ className, label, vertical, ...other }: FormEditorProps<boolean>) => {
    return (
      <Forms.Row className={className} label={!vertical ? label : undefined} vertical={vertical} {...other}>
        <InputToggle label={label} vertical={vertical} {...other} />
      </Forms.Row>
    );
  };

  export const MultiSelect = <T,>({
    className,
    options,
    multiple,
    serialize,
    deserialize,
    ...other
  }: MultiSelectionFormEditorProps<T>) => {
    const { control } = useFormContext();
    const data = options.map((x) => ({ label: x.label, value: x.value! }));
    return (
      <Forms.Row className={className} {...other}>
        <Controller
          name={other.name}
          control={control}
          render={({ field }) => (
            <MantineMultiSelect
              {...field}
              id={other.name}
              className="grow"
              data={data}
              defaultValue={other.defaultValue}
              value={serialize(field.value as T)}
              onChange={(value) => field.onChange(deserialize(value))}
              placeholder={texts.common.selectOptions}
            />
          )}
        />
      </Forms.Row>
    );
  };

  export const Tags = ({ className, placeholder, ...other }: FormEditorProps<string> & HTMLProps<HTMLInputElement>) => {
    const { control } = useFormContext();

    return (
      <Forms.Row className={className} {...other}>
        <Controller
          name={other.name}
          control={control}
          render={({ field }) => <TagsInput {...field} id={other.name} placeholder={texts.common.addItem} />}
        />
      </Forms.Row>
    );
  };

  export const Select = ({
    className,
    options,
    multiple,
    autocomplete,
    ...other
  }: OptionsFormEditorProps & { autocomplete?: boolean }) => {
    const data = options.map((x) => ({ label: x.label, value: String(x.value) }));
    const numberOrNumberArray = options.some((x) => typeof x.value === 'number');
    const { control } = useFormContext();

    return (
      <Forms.Row className={className} {...other}>
        <Controller
          name={other.name}
          control={control}
          render={({ field }) =>
            multiple ? (
              <MantineMultiSelect
                {...field}
                id={other.name}
                className="grow"
                data={data}
                defaultValue={other.defaultValue as string[]}
                value={field.value || []}
                onChange={(value) => field.onChange(value.map((v) => (numberOrNumberArray ? +v : v)))}
                placeholder={texts.common.selectOptions}
              />
            ) : autocomplete ? (
              <Autocomplete
                {...field}
                id={other.name}
                className="grow"
                data={data}
                defaultValue={other.defaultValue != null ? String(other.defaultValue) : undefined}
                value={field.value != null ? String(field.value) : undefined}
                onChange={(value) => field.onChange(value != null && numberOrNumberArray ? +value : value)}
                placeholder={texts.common.selectOption}
              />
            ) : (
              <MantineSingleSelect
                {...field}
                id={other.name}
                className="grow"
                data={data}
                defaultValue={other.defaultValue != null ? String(other.defaultValue) : undefined}
                value={field.value != null ? String(field.value) : undefined}
                onChange={(value) => field.onChange(value != null && numberOrNumberArray ? +value : value)}
                placeholder={texts.common.selectOption}
              />
            )
          }
        />
      </Forms.Row>
    );
  };

  export const FileSizeDynamicFields = ({ className, suffix, name, ...other }: DynamicFormEditorProps) => {
    type DynamicFieldValue = { key: string; value: number }[];
    type FileSizeLimitsValue = { [key: string]: number };
    const form = useFormContext();

    // these are names of transient auxillary forms, which are needed to display and edit the values
    const generalName = 'fileSizeLimitsGeneral';
    const dyName = 'fileSizeLimitsDynamic';
    const { fields, append, remove, replace } = useFieldArray({
      control: form.control,
      name: dyName,
    });

    const transformToDynamicField = (fileSizeLimits: FileSizeLimitsValue): DynamicFieldValue => {
      const dynamicFields: DynamicFieldValue = Object.entries(fileSizeLimits)
        // `general` is a special value that we handle separately
        .filter(([key]) => key !== 'general')
        .map(([key, value]) => ({
          key,
          value,
        }));

      if (fileSizeLimits.general) {
        form.setValue(generalName, fileSizeLimits.general);
      }

      return dynamicFields;
    };

    const transformToFileSizeLimits = (dynamicField: DynamicFieldValue): FileSizeLimitsValue => {
      const fileSizeLimits = dynamicField.reduce((acc, field) => {
        if (field.key) {
          acc[field.key.toLowerCase()] = field.value;
        }
        return acc;
      }, {} as FileSizeLimitsValue);

      fileSizeLimits.general = form.getValues(generalName);

      return fileSizeLimits;
    };

    // popuplate the dynamic fields with the prefilled values
    useEffect(() => {
      const entries: FileSizeLimitsValue | undefined = form.getValues(name) ?? other.defaultValue;
      if (entries === undefined) {
        return;
      }
      const initialFields = transformToDynamicField(entries);
      replace(initialFields);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [replace]);

    const handleFieldChange = () => {
      const dynamicFieldValues: DynamicFieldValue = form.getValues(dyName);
      const fileSizeLimits = transformToFileSizeLimits(dynamicFieldValues);
      form.setValue(name, fileSizeLimits);
    };

    return (
      <>
        <Forms.Row className={className} name={dyName} vertical {...other} refreshable={false}>
          <div className={cn('form-row flex flex-row items-center space-x-2', className)}>
            <button
              type="button"
              data-testid={`${dyName}.add`}
              onClick={() => {
                append({ key: '', value: 10 });
                handleFieldChange();
              }}
            >
              <Icon icon="plus" />
            </button>
            <input placeholder="general" disabled className={cn('input input-bordered w-full', className)} />
            <input
              placeholder="10"
              step="0.1"
              className={cn('input input-bordered w-full', className)}
              data-testid={`${generalName}.value`}
              {...form.register(generalName, {
                required: true,
                onChange: handleFieldChange,
              })}
            />
            {suffix && <span>{suffix}</span>}
          </div>
          {fields.map((field, index) => (
            <div
              key={field.id}
              className={cn('form-row flex flex-row items-center space-x-2', className)}
              data-testid={`${dyName}.${index}.row`}
            >
              <button
                type="button"
                data-testid={`${dyName}.${index}.remove`}
                onClick={() => {
                  remove(index);
                  handleFieldChange();
                }}
              >
                <Icon icon="trash" />
              </button>
              <input
                placeholder="pdf"
                className={cn('input input-bordered w-full', className)}
                data-testid={`${dyName}.${index}.key`}
                {...form.register(`${dyName}.${index}.key`, {
                  required: true,
                  onChange: handleFieldChange,
                })}
              />
              <input
                type="number"
                placeholder="10"
                step="0.1"
                required
                className={cn('input input-bordered w-full', className)}
                data-testid={`${dyName}.${index}.value`}
                {...form.register(`${dyName}.${index}.value`, {
                  valueAsNumber: true,
                  onChange: handleFieldChange,
                })}
              />
              {suffix && <span>{suffix}</span>}
            </div>
          ))}
        </Forms.Row>
      </>
    );
  };
}

const FormDescription = ({ className, hints }: { className?: string; hints?: ReactNode }) => {
  if (!hints) {
    return null;
  }

  return (
    <div className={cn(className, 'text-sm leading-6 text-slate-500')}>
      {isString(hints) ? <Markdown>{hints}</Markdown> : hints}
    </div>
  );
};

const InputText = ({ className, name, ...other }: FormEditorProps<string> & HTMLProps<HTMLInputElement>) => {
  const { field, fieldState, formState } = useController({ name });

  return (
    <input
      id={name}
      {...field}
      {...other}
      className={cn('input input-bordered w-full', className, { 'input-error': isInvalid(fieldState, formState) })}
    />
  );
};

const InputTextarea = ({ className, name, ...other }: FormEditorProps<string>) => {
  const { field, fieldState, formState } = useController({ name });

  return (
    <textarea
      id={name}
      {...field}
      {...other}
      className={cn('textarea textarea-bordered w-full', className, {
        'textarea-error': isInvalid(fieldState, formState),
      })}
    />
  );
};

const InputRange = ({ className, name, vertical, ...other }: FormEditorProps<number> & HTMLProps<HTMLInputElement>) => {
  const { field, fieldState, formState } = useController({ name });

  return (
    <div className="flex grow">
      <div className="grow">
        <input
          type="range"
          id={name}
          {...other}
          {...field}
          className={cn('h-2 w-full appearance-none rounded bg-gray-200', className, {
            'range-error': isInvalid(fieldState, formState),
          })}
        />
      </div>
      <div className="w-12 text-right">{field.value ?? other.defaultValue}</div>
    </div>
  );
};

const InputToggle = ({ className, label, name, vertical, ...other }: FormEditorProps<boolean>) => {
  const { field } = useController({ name });

  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        {...other}
        defaultValue={Number(other.defaultValue)}
        checked={field.value}
        onChange={field.onChange}
        className={cn('toggle toggle-primary', className, { 'mt-3': !vertical })}
      />

      {vertical && <label htmlFor={name}>{label}</label>}
    </div>
  );
};

function isInvalid(fieldState: ControllerFieldState, formState: FormState<any>) {
  return !!fieldState.error && (fieldState.isTouched || formState.submitCount > 0);
}
