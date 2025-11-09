'use client'

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { z, type ZodIssue } from 'zod';
import { UpdateCardScratchStatusPayloadSchema } from '~/lib/validations';
import { useToastError, type ApiError } from '~/lib/error-utils';

const SCRATCH_STATUS_MUTATION_KEY = ['card', 'scratch-status'] as const;

const ScratchStatusResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      tokenId: z.number(),
      scratched: z.boolean(),
      scratchedAt: z.string().datetime().nullable(),
      scratchedBy: z.string().nullable(),
      prizeWon: z.boolean(),
    })
    .optional(),
  error: z.string().optional(),
  field: z.string().optional(),
});

type ScratchStatusResponse = z.infer<typeof ScratchStatusResponseSchema>;

export type UpdateCardScratchStatusPayload = z.infer<typeof UpdateCardScratchStatusPayloadSchema>;

export interface UpdateCardScratchStatusResult {
  tokenId: number;
  scratched: boolean;
  scratchedAt: string | null;
  scratchedBy: string | null;
  prizeWon: boolean;
}

export class ScratchStatusMutationError extends Error {
  readonly field?: string;
  readonly status?: number;

  constructor(message: string, details?: { field?: string; status?: number }) {
    super(message);
    this.name = 'ScratchStatusMutationError';
    this.field = details?.field;
    this.status = details?.status;
  }
}

const RESPONSE_PARSE_ERROR_MESSAGE = 'Failed to parse scratch status response';
const NETWORK_ERROR_MESSAGE = 'Network error while updating scratch status';
const VALIDATION_ERROR_FALLBACK = 'Invalid scratch status payload';

function resolveValidationIssue(issue: ZodIssue | undefined) {
  const fieldCandidate = issue?.path?.[0];
  const field = typeof fieldCandidate === 'string' ? fieldCandidate : 'payload';
  const message = issue?.message ?? VALIDATION_ERROR_FALLBACK;

  return { field, message };
}

function createScratchStatusEndpoint(tokenId: number): string {
  return `/api/cards/${tokenId}/track-scratch`;
}

async function parseScratchStatusResponse(response: Response): Promise<ScratchStatusResponse> {
  let parsedBody: unknown;

  try {
    parsedBody = await response.json();
  } catch (error) {
    console.error('Failed to parse scratch status response body', error);
    throw new ScratchStatusMutationError(RESPONSE_PARSE_ERROR_MESSAGE, {
      status: response.status,
    });
  }

  const result = ScratchStatusResponseSchema.safeParse(parsedBody);

  if (!result.success) {
    const issue = result.error.issues[0];
    const { message } = resolveValidationIssue(issue);

    throw new ScratchStatusMutationError(message, { status: response.status });
  }

  return result.data;
}

async function performScratchStatusUpdate(
  payload: UpdateCardScratchStatusPayload
): Promise<UpdateCardScratchStatusResult> {
  const validationResult = UpdateCardScratchStatusPayloadSchema.safeParse(payload);

  if (!validationResult.success) {
    const issue = validationResult.error.issues[0];
    const { field, message } = resolveValidationIssue(issue);

    throw new ScratchStatusMutationError(message, { field });
  }

  const { tokenId, scratched, scratchedBy, prizeWon } = validationResult.data;

  let response: Response;

  try {
    response = await fetch(createScratchStatusEndpoint(tokenId), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ scratched, scratchedBy, prizeWon }),
    });
  } catch (error) {
    console.error('Network error while updating scratch status', error);
    throw new ScratchStatusMutationError(NETWORK_ERROR_MESSAGE, { field: 'network' });
  }

  const parsedResponse = await parseScratchStatusResponse(response);

  if (!response.ok || !parsedResponse.success || !parsedResponse.data) {
    const errorMessage = parsedResponse.error ?? 'Failed to update card scratch status';

    throw new ScratchStatusMutationError(errorMessage, {
      field: parsedResponse.field,
      status: response.status,
    });
  }

  return parsedResponse.data;
}

async function invalidateScratchQueries(queryClient: ReturnType<typeof useQueryClient>, tokenId: number) {
  const invalidate = queryClient.invalidateQueries.bind(queryClient);

  await Promise.all([
    invalidate({ queryKey: ['card', tokenId] }),
    invalidate({ queryKey: ['cards'] }),
    invalidate({ queryKey: ['recentActivity'] }),
  ]);
}

function createOnSuccessHandler(queryClient: ReturnType<typeof useQueryClient>) {
  return async (data: UpdateCardScratchStatusResult) => {
    await invalidateScratchQueries(queryClient, data.tokenId);
  };
}

function createOnErrorHandler(showError: (error: ApiError | string) => void) {
  return (error: unknown) => {
    if (error instanceof ScratchStatusMutationError) {
      showError(error.message);
      return;
    }

    showError('Failed to update card scratch status');
  };
}

export function useTrackScratch(): UseMutationResult<
  UpdateCardScratchStatusResult,
  ScratchStatusMutationError,
  UpdateCardScratchStatusPayload
> {
  const queryClient = useQueryClient();
  const { showError } = useToastError();

  return useMutation<
    UpdateCardScratchStatusResult,
    ScratchStatusMutationError,
    UpdateCardScratchStatusPayload
  >({
    mutationKey: SCRATCH_STATUS_MUTATION_KEY,
    mutationFn: performScratchStatusUpdate,
    onSuccess: createOnSuccessHandler(queryClient),
    onError: createOnErrorHandler(showError),
  });
}