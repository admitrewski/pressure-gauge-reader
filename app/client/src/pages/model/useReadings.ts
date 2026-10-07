import { useEffect, useState } from 'react';
import { normaliseReading, type Reading, type ReadingsResponse } from '../review/types';

/** Readings for the quality view (same API as the review queue). */
export function useReadings() {
  const [data, setData] = useState<{ readings: Reading[]; threshold: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch('/api/readings')
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load readings (${r.status})`);
        return r.json() as Promise<ReadingsResponse>;
      })
      .then((b) => setData({ readings: b.readings.map(normaliseReading), threshold: b.reviewConfidenceThreshold }))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load readings'));
  }, []);
  return { data, error };
}
