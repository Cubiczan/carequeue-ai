import { Card, CardContent } from "@/components/ui/card";

export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="text-sm text-slate-500 mt-1">{description}</p>
      <Card className="mt-6">
        <CardContent className="p-12 text-center">
          <div className="text-sm font-medium text-slate-700">
            Coming in the next build phase
          </div>
          <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
            The Pulse Agent + Finance Approval Queue vertical slice proves the
            Realtime and Presence patterns. Remaining views will be built on that
            foundation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
