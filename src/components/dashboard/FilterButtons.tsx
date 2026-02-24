import { Button } from "@/components/ui/button";

interface FilterButtonsProps {
  active: string;
  onChange: (filter: string) => void;
}

const filters = [
  { label: "Alle", value: "ALL" },
  { label: "LONG", value: "LONG" },
  { label: "SHORT", value: "SHORT" },
  { label: "CASH", value: "CASH" },
];

export default function FilterButtons({ active, onChange }: FilterButtonsProps) {
  return (
    <div className="flex gap-2 mb-4">
      {filters.map((f) => (
        <Button
          key={f.value}
          variant={active === f.value ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(f.value)}
          className="text-xs"
        >
          {f.label}
        </Button>
      ))}
    </div>
  );
}
