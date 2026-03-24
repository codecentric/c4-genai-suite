import { BucketDto, ExtensionDto, ExtensionSpecDto } from 'src/api';
import { texts } from 'src/texts';
import { useListValues } from './hooks';

interface ExtensionCardProps {
  // The buckets.
  buckets: BucketDto[];

  // The spec.
  spec: ExtensionSpecDto;

  // The configured extension. Can be optional for available extensions.
  extension?: ExtensionDto;

  // Invoked when clicked.
  onClick?: (spec: ExtensionSpecDto, extension: ExtensionDto) => void;

  // Invoked when deleted.
  onDelete?: (extension: ExtensionDto) => void;
}

export function ExtensionCard(props: ExtensionCardProps) {
  const { buckets, extension, onClick, spec } = props;

  const listValues = useListValues(spec, buckets, extension);

  return (
    <li
      className="card bg-base-100 cursor-pointer border shadow-sm transition-all hover:shadow-md"
      onClick={() => onClick && onClick(spec, extension!)}
    >
      <div className="group card-body relative flex flex-row items-start gap-4 p-6">
        {spec.logo && (
          <img
            className="mt-2 w-16"
            src={`data:image/svg+xml;utf8,${encodeURIComponent(spec.logo)}`}
            alt={`${spec.title} logo`}
          />
        )}

        <div className="flex min-w-0 flex-col gap-2">
          <div>
            <h3 className="text-lg font-semibold">{spec.title}</h3>

            <div className="text-sm leading-6 text-gray-600">{spec.description}</div>
          </div>

          <div className="flex flex-wrap gap-1">
            {extension?.enabled === false && <div className="badge badge-error">{texts.common.disabled}</div>}

            {spec.type !== 'other' && (
              <div className="badge truncate bg-gray-200">
                <div className="truncate text-ellipsis">{spec.type}</div>
              </div>
            )}

            {listValues.map((value) => (
              <ul key={value} data-testid={'modelValues'} className="badge truncate bg-gray-200">
                <li className="truncate text-ellipsis">{value}</li>
              </ul>
            ))}
          </div>
        </div>
      </div>
    </li>
  );
}
