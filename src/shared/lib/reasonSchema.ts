import { z } from "zod"

export const reasonSchema = z.object({
  reason: z
    .string()
    .transform((val) => val.trim())
    .pipe(
      z
        .string()
        .min(5, "El motivo debe tener al menos 5 caracteres")
        .max(255, "El motivo no puede exceder los 255 caracteres"),
    ),
})

export type ReasonFormValues = z.infer<typeof reasonSchema>