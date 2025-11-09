'use client'

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { z, type ZodIssue } from 'zod';
import { UpdateCardClaimStatusPayloadSchema } from '~/lib/validations';
import { useToastError, type ApiError } from '~/lib/error-utils';

const CLAIM_STATUS_MUTATION_KEY = ['card', 'claim-status'] as const;

const ClaimStatusResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      tokenId: z.number(),
      claimed: z.boolean(),
      claimHash: z.string(),
      claimedAt: z.string(),
    })
    .optional(),
  error: z.string().optional(),
  field: z.string().optional(),
});

type ClaimStatusResponse = z.infer<typeof ClaimStatusResponseSchema>;

export type UpdateCardClaimStatusPayload = z.infer<typeof UpdateCardClaimStatusPayloadSchema>;

export interface UpdateCardClaimStatusResult {
  tokenId: number;
  claimed: boolean;
  claimHash: string;
  claimedAt: string;
}

export class ClaimStatusMutationError extends Error {
  readonly field?: string;
  readonly status?: number;

  constructor(message: string, details?: { field?: string; status?: number }) {
    super(message);
    this.name = 'ClaimStatusMutationError';
    this.field = details?.field;
    this.status = details?.status;
  }
}

const RESPONSE_PARSE_ERROR_MESSAGE = 'Failed to parse claim status response';
const NETWORK_ERROR_MESSAGE = 'Network error while updating claim status';
const VALIDATION_ERROR_FALLBACK = 'Invalid claim status payload';

function resolveValidationIssue(issue: ZodIssue | undefined) {
  const fieldCandidate = issue?.path?.[0];
  const field = typeof fieldCandidate === 'string' ? fieldCandidate : 'payload';
  const message = issue?.message ?? VALIDATION_ERROR_FALLBACK;

  return { field, message };
}

function createClaimStatusEndpoint(tokenId: number): string {
  return `/api/cards/${tokenId}/claim`;
}

async function parseClaimStatusResponse(response: Response): Promise<ClaimStatusResponse> {
  let parsedBody: unknown;

  try {
    parsedBody = await response.json();
  } catch (error) {
    console.error('Failed to parse claim status response body', error);
    throw new ClaimStatusMutationError(RESPONSE_PARSE_ERROR_MESSAGE, {
      status: response.status,
    });
  }

  const result = ClaimStatusResponseSchema.safeParse(parsedBody);

  if (!result.success) {
    const issue = result.error.issues[0];
    const { message } = resolveValidationIssue(issue);

    throw new ClaimStatusMutationError(message, { status: response.status });
  }

  return result.data;
}

async function performClaimStatusUpdate(
  payload: UpdateCardClaimStatusPayload
): Promise<UpdateCardClaimStatusResult> {
  const validationResult = UpdateCardClaimStatusPayloadSchema.safeParse(payload);

  if (!validationResult.success) {
    const issue = validationResult.error.issues[0];
    const { field, message } = resolveValidationIssue(issue);

    throw new ClaimStatusMutationError(message, { field });
  }

  const { tokenId, claimed, claimHash, claimedBy } = validationResult.data;

  let response: Response;

  try {
    response = await fetch(createClaimStatusEndpoint(tokenId), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ claimed, claimHash, claimedBy }),
    });
  } catch (error) {
    console.error('Network error while updating claim status', error);
    throw new ClaimStatusMutationError(NETWORK_ERROR_MESSAGE, { field: 'network' });
  }

  const parsedResponse = await parseClaimStatusResponse(response);

  if (!response.ok || !parsedResponse.success || !parsedResponse.data) {
    const errorMessage = parsedResponse.error ?? 'Failed to update card claim status';

    throw new ClaimStatusMutationError(errorMessage, {
      field: parsedResponse.field,
      status: response.status,
    });
  }

  return parsedResponse.data;
}

async function invalidateClaimQueries(queryClient: ReturnType<typeof useQueryClient>, tokenId: number) {
  const invalidate = queryClient.invalidateQueries.bind(queryClient);

  await Promise.all([
    invalidate({ queryKey: ['card', tokenId] }),
    invalidate({ queryKey: ['cards'] }),
    invalidate({ queryKey: ['recentActivity'] }),
  ]);
}

function createOnSuccessHandler(queryClient: ReturnType<typeof useQueryClient>) {
  return async (data: UpdateCardClaimStatusResult) => {
    await invalidateClaimQueries(queryClient, data.tokenId);
  };
}

function createOnErrorHandler(showError: (error: ApiError | string) => void) {
  return (error: unknown) => {
    if (error instanceof ClaimStatusMutationError) {
      showError(error.message);
      return;
    }

    showError('Failed to update card claim status');
  };
}

export function useUpdateCardClaimStatus(): UseMutationResult<
  UpdateCardClaimStatusResult,
  ClaimStatusMutationError,
  UpdateCardClaimStatusPayload
> {
  const queryClient = useQueryClient();
  const { showError } = useToastError();

  return useMutation<
    UpdateCardClaimStatusResult,
    ClaimStatusMutationError,
    UpdateCardClaimStatusPayload
  >({
    mutationKey: CLAIM_STATUS_MUTATION_KEY,
    mutationFn: performClaimStatusUpdate,
    onSuccess: createOnSuccessHandler(queryClient),
    onError: createOnErrorHandler(showError),
  });
}
