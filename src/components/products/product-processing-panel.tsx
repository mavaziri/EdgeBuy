'use client';

import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  iterateProductBatchInsights,
  type ProductBatchInsight,
} from '@/services/product-processing.service';

type ProcessingStatus =
  | 'idle'
  | 'processing'
  | 'complete'
  | 'cancelled'
  | 'error';

function waitForPaint(signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted || document.visibilityState === 'hidden') {
      resolve();
      return;
    }

    // Two frames allow the committed result to paint before the next request.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(finish);
    });

    function finish() {
      cancelAnimationFrame(frame);
      signal.removeEventListener('abort', finish);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      resolve();
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        finish();
      }
    }

    signal.addEventListener('abort', finish, { once: true });
    document.addEventListener('visibilitychange', onVisibilityChange);
  });
}

export function ProductProcessingPanel() {
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [insights, setInsights] = useState<ProductBatchInsight[]>([]);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);

  useEffect(() => {
    return () => {
      runIdRef.current += 1;
      controllerRef.current?.abort();
    };
  }, []);

  const startProcessing = async (): Promise<void> => {
    if (controllerRef.current) {
      return;
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    const runId = ++runIdRef.current;

    flushSync(() => {
      setStatus('processing');
      setInsights([]);
      setProcessedCount(0);
      setTotalCount(null);
      setErrorMessage(null);
    });

    try {
      for await (const insight of iterateProductBatchInsights(
        25,
        controller.signal,
      )) {
        if (runId !== runIdRef.current || controller.signal.aborted) {
          return;
        }
        flushSync(() => {
          setInsights((current) => [...current, insight]);
          setProcessedCount((current) => current + insight.processedCount);
          setTotalCount(insight.total);
        });

        if (insight.skip + insight.processedCount < insight.total) {
          await waitForPaint(controller.signal);
          if (runId !== runIdRef.current || controller.signal.aborted) {
            return;
          }
        }
      }

      if (runId === runIdRef.current && !controller.signal.aborted) {
        setTotalCount((current) => current ?? 0);
        setStatus('complete');
      }
    } catch (error) {
      if (runId === runIdRef.current && !controller.signal.aborted) {
        setErrorMessage(
          error instanceof Error ? error.message : 'Product processing failed.',
        );
        setStatus('error');
      }
    } finally {
      if (runId === runIdRef.current) {
        controllerRef.current = null;
      }
    }
  };

  const cancelProcessing = (): void => {
    runIdRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    setStatus('cancelled');
  };

  const resetProcessing = (): void => {
    runIdRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    setInsights([]);
    setProcessedCount(0);
    setTotalCount(null);
    setErrorMessage(null);
    setStatus('idle');
  };

  const progress =
    totalCount && totalCount > 0
      ? Math.round((processedCount / totalCount) * 100)
      : status === 'complete' ? 100 : 0;

  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle>Catalog batch analysis</CardTitle>
        <CardDescription>
          Summarize prices and ratings as each API batch arrives.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => void startProcessing()}
            disabled={status === 'processing'}
          >
            {status === 'processing' ? 'Analyzing...' : 'Analyze catalog'}
          </Button>
          <Button variant="outline" onClick={resetProcessing}>
            Reset
          </Button>
          {status === 'processing' && (
            <Button variant="outline" onClick={cancelProcessing}>
              Cancel
            </Button>
          )}
        </div>

        {status === 'idle' && (
          <p className="text-sm text-muted-foreground" role="status">
            Ready to analyze the catalog. Processed 0 of ... products (0%).
          </p>
        )}
        {status === 'processing' && (
          <p
            className="text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            Processed {processedCount} of {totalCount ?? '...'} products (
            {progress}%). Fetching and analyzing batch {insights.length + 1}...
          </p>
        )}
        {status === 'complete' && (
          <p className="text-sm text-muted-foreground" role="status">
            Analysis complete: {processedCount} of {totalCount ?? 0} products
            processed.
          </p>
        )}
        {status === 'cancelled' && (
          <p className="text-sm text-muted-foreground" role="status">
            Analysis cancelled after {processedCount} products. Completed
            results are retained.
          </p>
        )}
        {status === 'error' && (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage} Completed batch results are retained.
          </p>
        )}
        {status !== 'processing' && status !== 'idle' && (
          <p className="text-sm text-muted-foreground">
            Processed {processedCount} of {totalCount ?? '...'} products (
            {progress}%).
          </p>
        )}

        {insights.length > 0 && (
          <ol
            className="max-h-[20vh] overflow-y-auto divide-y rounded-md border"
            aria-label="Completed product batches"
          >
            {insights.map((insight) => (
              <li
                key={insight.skip}
                className="grid gap-1 px-3 py-2 text-sm sm:grid-cols-2"
              >
                <span>
                  Batch {Math.floor(insight.skip / 25) + 1}:{' '}
                  {insight.processedCount} products
                </span>
                <span className="text-muted-foreground">
                  Avg. ${insight.averagePrice.toFixed(2)} ·{' '}
                  {insight.underFiftyCount} under $50 ·{' '}
                  {insight.highlyRatedCount} rated 4.5+
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
