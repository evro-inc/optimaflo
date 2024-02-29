import { z } from 'zod';

const empty = z.object({}); // Define an empty Zod schema

type Forms = z.infer<typeof empty>; // Define Forms as an inference of the empty schema

// Later in the code, you can populate the Forms type based on the actual schema
export const placeholderSchema = z.object({
  forms: z.array(z.object({})),
});

export type ActualForms = z.infer<typeof placeholderSchema>;
