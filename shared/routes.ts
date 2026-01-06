import { z } from 'zod';
import { insertQuizSchema, insertUserSchema, quizzes, users, responses, appState } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/login',
      input: insertUserSchema,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    me: { // Session check
      method: 'GET' as const,
      path: '/api/me',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.notFound,
      },
    },
    logout: {
        method: 'POST' as const,
        path: '/api/logout',
        responses: {
            200: z.object({ success: z.boolean() }),
        }
    }
  },
  quizzes: {
    list: {
      method: 'GET' as const,
      path: '/api/quizzes',
      responses: {
        200: z.array(z.custom<typeof quizzes.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/quizzes',
      input: insertQuizSchema,
      responses: {
        201: z.custom<typeof quizzes.$inferSelect>(),
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/quizzes/:id',
      input: insertQuizSchema.partial(),
      responses: {
        200: z.custom<typeof quizzes.$inferSelect>(),
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/quizzes/:id',
      responses: {
        204: z.void(),
      },
    },
  },
  state: {
    get: {
      method: 'GET' as const,
      path: '/api/state',
      responses: {
        200: z.custom<typeof appState.$inferSelect>(),
      },
    },
    update: {
      method: 'POST' as const,
      path: '/api/state',
      input: z.object({
        currentQuizId: z.number().nullable(),
        isResultRevealed: z.boolean(),
      }),
      responses: {
        200: z.custom<typeof appState.$inferSelect>(),
      },
    },
  },
  responses: {
    list: {
      method: 'GET' as const,
      path: '/api/responses', // Get all responses (for projector/admin)
      responses: {
        200: z.array(z.custom<typeof responses.$inferSelect & { userName: string }>()),
      },
    },
    submit: {
      method: 'POST' as const,
      path: '/api/responses',
      input: z.object({
        quizId: z.number(),
        selection: z.string(),
      }),
      responses: {
        200: z.custom<typeof responses.$inferSelect>(),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
