export type InfoByteProps = {
  title: string;
  value: string | number;
};

export function InfoByte(props: InfoByteProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="font-semibold">{props.title}</div>
      <div className="font-normal">{props.value}</div>
    </div>
  );
}
