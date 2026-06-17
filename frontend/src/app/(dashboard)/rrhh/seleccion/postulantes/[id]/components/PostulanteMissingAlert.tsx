'use client';

interface PostulanteMissingAlertProps {
  missingRequirements: string[];
}

export function PostulanteMissingAlert({ missingRequirements }: PostulanteMissingAlertProps) {
  if (missingRequirements.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3">
      <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">Para aprobar, falta:</p>
      <ul className="list-disc list-inside text-sm text-amber-800 dark:text-amber-200 space-y-0.5">
        {missingRequirements.map((req, idx) => (
          <li key={idx}>{req}</li>
        ))}
      </ul>
    </div>
  );
}
